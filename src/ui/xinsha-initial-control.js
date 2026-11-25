import { game, get, lib, _status } from "noname";

const previewable = new WeakMap();
let installed = false;

function readOnly(expression) {
	if (/\+\+|--|\b(?:new|delete|throw|yield|await|function)\b|(?<![=!<>])=(?![=>])/.test(expression)) return false;
	for (const [, call] of expression.matchAll(/\b([\w$.]+)\s*\(/g)) {
		if (!/^get\.(?:translation|skillTranslation|type|type2|cnNumber)$/.test(call) &&
			!/^player\.(?:getCards|countCards|hasSkill|isDamaged|isHealthy)$/.test(call) &&
			!/(?:^|\.)(?:map|filter|find|slice|concat|includes|indexOf|unique|join)$/.test(call)) return false;
	}
	return true;
}

function controlArguments(source, open) {
	let depth = 1, quote = "";
	for (let index = open + 1; index < source.length; index++) {
		const char = source[index];
		if (quote) {
			if (char === "\\") index++;
			else if (char === quote) quote = "";
		} else if ('"\'`'.includes(char)) quote = char;
		else if (char === "(") depth++;
		else if (char === ")" && --depth === 0) return source.slice(open + 1, index);
	}
	return null;
}

// 只前移“只读局部声明 -> 首次 await player.chooseControl”。不试运行任意技能副作用。
function canPreview(content) {
	if (typeof content !== "function") return false;
	if (previewable.has(content)) return previewable.get(content);
	const source = Function.prototype.toString.call(content);
	const body = /^async\s+(?:function\s*)?\w*\s*\(\s*event\s*,\s*trigger\s*,\s*player\s*\)\s*\{/.exec(source);
	const start = body && source.slice(body[0].length);
	const firstAwait = start && /\bawait\s+player\.chooseControl\s*\(/.exec(start);
	let prefix = firstAwait && start.slice(0, firstAwait.index);
	const args = firstAwait && controlArguments(start, firstAwait.index + firstAwait[0].length - 1);
	let valid = !!firstAwait && args !== null && readOnly(args) && !/\bawait\b/.test(prefix);
	if (valid) {
		const tail = start.slice(firstAwait.index + firstAwait[0].length + args.length + 1);
		// setter 链还没执行时不能截停；复杂选项/排序保持原生，不丢调用方的配置。
		if (/^\s*\.(?!forResult\s*\()/.test(tail) || /\b(?:choiceList|sortcard|dialogcontrol)\s*:/.test(args)) valid = false;
	}
	if (valid) {
		prefix = prefix.replace(/\b(?:const|let)\s+(?:\{[^{}]*\}|\w+)\s*=\s*$/, "");
		while (prefix.trim()) {
			const declaration = /^\s*(?:const|let)\s+\w+\s*=\s*([^;]+);/.exec(prefix);
			if (!declaration) { valid = false; break; }
			const expression = declaration[1];
			if (/[{}]/.test(expression) || !readOnly(expression)) { valid = false; break; }
			prefix = prefix.slice(declaration[0].length);
		}
	}
	previewable.set(content, valid);
	return valid;
}

function eligible(event, player, info) {
	return lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && !_status.video &&
		!_status.connectMode && !game.online && !_status.auto && player === game.me &&
		event.parent?.name === "chooseToUse" && event.parent.type === "phase" &&
		!event.cards?.length &&
		!info?.prepare && !info?.contentBefore && !info?.precontent && !info?.onuse &&
		canPreview(info?.content);
}

// 仅替换本次同步调用；await 后立即恢复原方法，不把替身 player 带进技能结算。
function withControl(player, chooseControl, run) {
	const own = Object.hasOwn(player, "chooseControl"), original = player.chooseControl;
	player.chooseControl = chooseControl;
	try { return run(original); }
	finally {
		if (own) player.chooseControl = original;
		else delete player.chooseControl;
	}
}

async function preview(event, player, info) {
	const stop = {};
	const chooseControl = player.chooseControl;
	let choice;
	// 保留真实技能参数和闭包。抛出私有标记，在选择创建处停止，不执行后续技能代码。
	const effect = { name: event.skill, parent: event, player, targets: event.targets, target: event.targets?.[0], cards: event.cards, num: 0 };
	try {
		await withControl(player, (...args) => {
			choice = chooseControl.apply(player, args);
			throw stop;
		}, () => info.content(effect, null, player));
	} catch (error) {
		if (error !== stop) throw error;
	}
	if (!choice) return null;
	choice._xinshaInitialControl = true;
	if (!choice.controls.includes("cancel2")) choice.controls = [...choice.controls, "cancel2"];
	await choice.forResult();
	return choice;
}

export function installXinshaInitialControl() {
	if (installed) return;
	const processors = lib.element.content.useSkill;
	if (!Array.isArray(processors)) return;
	installed = true;
	const controls = lib.element.content.chooseControl, choose = controls[0];
	controls[0] = function (event) {
		const parent = event.parent, info = parent?.buttoned && get.info(parent.buttoned);
		if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && !_status.video &&
			["chooseToUse", "chooseToRespond"].includes(parent?.name) && info?.chooseButton?.chooseControl &&
			!event.sortcard && event.controls?.length) {
			event._xinshaInitialControl = true;
			if (!event.controls.includes("cancel2")) event.controls = [...event.controls, "cancel2"];
		}
		return choose.apply(this, arguments);
	};
	const execute = processors[2], useResult = lib.element.Player.prototype.useResult;
	lib.element.Player.prototype.useResult = function (result, event) {
		const parent = event || _status.event, player = this, info = result.skill && get.info(result.skill);
		const plan = { parent, skill: result.skill, targets: result.targets || [], cards: result.cards || [] };
		if (result.card || !eligible(plan, player, info)) return useResult.apply(this, arguments);
		// 先选择，再创建真正的 useSkill；AI记录、Before/Begin、计次和代价都留给原生提交。
		const next = game.createEvent("xinshaInitialControl", false);
		Object.assign(next, { player, skill: plan.skill, targets: plan.targets, cards: plan.cards });
		next.setContent(async function (preflight) {
			const choice = await preview(preflight, player, info);
			if (choice?.result?.control === "cancel2") {
				preflight.result = { bool: false };
				parent.restore?.();
				delete parent.result;
				parent.goto(0);
				return;
			}
			const committed = useResult.call(player, result, parent);
			if (committed) {
				if (choice) committed._xinshaInitialControl = { choice, skill: plan.skill, content: info.content };
				// 与原生提交保持相同父链，不把临时选择层带进技能的 getParent(n)。
				committed.parent.next.remove(committed);
				parent.next.push(committed);
			}
		});
		return next;
	};
	processors[2] = async function (event, trigger, player) {
		const result = await execute.apply(this, arguments);
		const saved = event._xinshaInitialControl, choice = saved?.choice;
		if (choice) {
			delete event._xinshaInitialControl;
			if (saved.skill !== event.skill || saved.content !== get.info(event.skill)?.content) return result;
			const effect = event.next.find(child => child.name === event.skill && child.player === player && child.cards === event.cards);
			if (effect) {
				const content = effect.content;
				effect.content = function (...args) {
					let reused = false;
					const chooseControl = player.chooseControl, then = Object.getOwnPropertyDescriptor(choice, "then");
					// 已结束的选择不能再 await 父 useSkill.waitNext（它正等本内容），否则循环等待。
					Object.defineProperty(choice, "then", { configurable: true, value: (resolve, reject) => Promise.resolve().then(resolve, reject) });
					try {
						return withControl(player, function (...controls) {
							if (!reused) {
								reused = true;
								const offered = controls.length === 1 && get.is.object(controls[0]) ? controls[0].controls : controls.flat().filter(value => typeof value === "string");
								if (offered?.includes(choice.result.control)) return choice;
							}
							return chooseControl.apply(this, controls);
						}, () => content.apply(this, args));
					} finally {
						if (then) Object.defineProperty(choice, "then", then);
						else delete choice.then;
					}
				};
			}
		}
		return result;
	};
}
