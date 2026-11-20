import { game, get, lib, ui, _status } from "noname";

// YJCM 6.4.5 MoveCardController.moveCardsFromStackToJudgeArea (0.19)。
// 200ms上抬50设计单位/放大1.1，停200ms，800/3ms线性移入并缩到0.1；无淡出。
const flights = new Set();
const sources = new Set();
let cleanupInstalled = false;
let styleObserver = null;

function enabled() {
	return lib.config.extension_十周年UI_newDecadeStyle === "othersOff";
}

function releaseSource(source) {
	const state = source?._xinshaDelayJudgeSource;
	if (!state) return;
	clearTimeout(state.timer);
	if (state.ownMoveDelete) source.moveDelete = state.moveDelete;
	else delete source.moveDelete;
	delete source._xinshaDelayJudgeSource;
	sources.delete(source);
	if (!sources.size) {
		styleObserver?.disconnect();
		styleObserver = null;
	}
}

function installCleanup() {
	if (cleanupInstalled) return;
	cleanupInstalled = true;
	lib.onover.push(() => {
		for (const flight of flights) finish(flight);
		for (const source of sources) releaseSource(source);
	});
}

export function markXinshaDelayJudgeSource(source, player) {
	if (!enabled() || source.judge || source._xinshaDelayJudgeSource) return;
	let event = _status.event;
	const seen = new Set();
	while (event && !seen.has(event)) {
		seen.add(event);
		const use = [event, event.blameEvent, event.relatedEvent].find(item => item?.name === "useCard");
		if (use) {
			if (use.player !== player || get.type(use.card, null, player) !== "delay") return;
			if (use.cards?.length && !use.cards.some(card => card.clone === source || card.cardid != null && card.cardid === source.cardid)) return;
			const state = { ownMoveDelete: Object.hasOwn(source, "moveDelete"), moveDelete: source.moveDelete };
			source._xinshaDelayJudgeSource = state;
			// 本体addJudge先调用clone.moveDelete，再调用$addVirtualJudge；保留处理区原牌至接管。
			source.moveDelete = function (...args) {
				if (enabled()) return;
				releaseSource(source);
				return state.moveDelete?.apply(this, args);
			};
			state.timer = setTimeout(() => releaseSource(source), 8000);
			sources.add(source);
			if (!styleObserver) {
				styleObserver = new MutationObserver(() => {
					if (!enabled()) {
						for (const flight of flights) finish(flight);
						for (const pending of sources) releaseSource(pending);
					} else {
						for (const pending of sources) if (!pending.isConnected) releaseSource(pending);
					}
				});
				styleObserver.observe(document.body, { attributes: true, attributeFilter: ["data-style"] });
				styleObserver.observe(ui.arena, { childList: true, subtree: true });
			}
			installCleanup();
			return;
		}
		if (event.name === "lose" && event.position && event.position !== ui.ordering) return;
		event = typeof event.getParent === "function" ? event.getParent() : event.parent;
	}
}

function center(node) {
	const arena = ui.arena.getBoundingClientRect(), rect = node.getBoundingClientRect();
	const sx = arena.width / ui.arena.clientWidth || 1, sy = arena.height / ui.arena.clientHeight || 1;
	return { x: (rect.left + rect.width / 2 - arena.left) / sx, y: (rect.top + rect.height / 2 - arena.top) / sy, width: rect.width / sx, height: rect.height / sy };
}

function saveStyle(node, properties) {
	return properties.map(key => [key, node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]);
}

function finish(flight) {
	if (flight.done) return;
	flight.done = true;
	clearTimeout(flight.timeout);
	cancelAnimationFrame(flight.frame);
	flight.observer.disconnect();
	flight.readyObserver?.disconnect();
	flight.resizeObserver?.disconnect();
	flight.animation?.cancel();
	flights.delete(flight);
	releaseSource(flight.source);
	flight.source.remove();
	delete flight.card._xinshaDelayJudgeFlight;
	for (const [key, value, priority] of flight.savedStyle) {
		if (value) flight.card.style.setProperty(key, value, priority);
		else flight.card.style.removeProperty(key);
	}
	flight.card.classList.remove("decade-xinsha-delay-judge-pending");
	window.decadeUI?.layout?.invalidateDiscard?.();
}

export function animateXinshaDelayJudge(player, card, cards) {
	if (!enabled() || card._xinshaDelayJudgeFlight) return false;
	const name = card.viewAs || card.name;
	if (lib.card[name]?.type !== "delay" && get.type({ name }, null, player) !== "delay") return false;
	// 只按实体/clone/cardid关联；同名的另一张牌、无来源的直接入判定区都不借牌播放。
	const physical = [card, ...(cards || [])];
	const source = [...sources].find(node => node.parentNode === ui.arena && !node._xinshaDelayJudgeFlight && physical.some(item => item.clone === node || item.cardid != null && item.cardid === node.cardid));
	if (!source) return false;
	const flight = { source, card, player, savedStyle: saveStyle(card, ["visibility", "opacity", "transition-property"]) };
	card._xinshaDelayJudgeFlight = flight;
	source._xinshaDelayJudgeFlight = flight;
	card.classList.add("decade-xinsha-delay-judge-pending");
	card.style.setProperty("transition-property", "none", "important");
	card.style.setProperty("visibility", "hidden", "important");
	card.style.setProperty("opacity", "0", "important");
	source.fixed = true;
	// 全局transition:all会令visibility写回后首个观察器回调仍读到hidden，
	// 随后的可见帧没有DOM变化，冷图就会错过起播；飞牌接管时先停止旧过渡。
	source.style.setProperty("transition", "none", "important");
	source.style.setProperty("animation", "none", "important");
	ui.thrown = (ui.thrown || []).filter(node => node !== source);
	clearTimeout(source._xinshaDelayJudgeSource.timer);
	flights.add(flight);
	flight.observer = new MutationObserver(() => {
		if (!enabled() || !source.isConnected || card.parentNode !== player.node.judges) finish(flight);
	});
	flight.observer.observe(ui.arena, { childList: true, subtree: true });
	flight.observer.observe(document.body, { attributes: true, attributeFilter: ["data-style"] });
	flight.timeout = setTimeout(() => finish(flight), 4000);
	const start = () => {
		if (flight.done || flight.frame || flight.animation) return;
		const style = getComputedStyle(source);
		if (style.visibility === "hidden" || style.display === "none") return;
		flight.frame = requestAnimationFrame(timestamp => {
			flight.frame = null;
			if (flight.done) return;
			flight.readyObserver.disconnect();
			const from = center(source), width = source.offsetWidth, height = source.offsetHeight;
			if (!width || !height || !from.width) return finish(flight);
			const scale = from.width / width;
			const windowNode = ui.window || document.body;
			const unit = parseFloat(getComputedStyle(windowNode).getPropertyValue("--yjcm-unit")) || Math.min(windowNode.clientWidth / 1334, windowNode.clientHeight / 750);
			const arenaZoom = ui.arena.getBoundingClientRect().height / ui.arena.clientHeight || 1;
			const windowZoom = windowNode.getBoundingClientRect().height / windowNode.clientHeight || 1;
			const lifted = { x: from.x, y: from.y - 50 * unit * windowZoom / arenaZoom };
			const transform = (point, size) => `translate(${point.x - width / 2}px,${point.y - height / 2}px) scale(${size})`;
			Object.assign(source.style, { left: "0px", top: "0px", margin: "0", transformOrigin: "center center", transition: "none", animation: "none", transform: transform(from, scale), zIndex: "7" });
			source.classList.remove("removing", "invalided");
			source.querySelector(".used-info")?.remove();
			const frames = () => [
				{ offset: 0, transform: transform(from, scale) },
				{ offset: 0.3, transform: transform(lifted, scale * 1.1) },
				{ offset: 0.6, transform: transform(lifted, scale * 1.1) },
				{ offset: 1, transform: transform(center(card.node?.judgeMark?.node?.judge || card), scale * 0.1) },
			];
			flight.animation = source.animate(frames(), { duration: 2000 / 3, easing: "linear", fill: "both" });
			flight.animation.startTime = timestamp;
			flight.animation.onfinish = () => finish(flight);
			flight.animation.oncancel = () => finish(flight);
			flight.resizeObserver = new ResizeObserver(() => { if (!flight.done) flight.animation.effect.setKeyframes(frames()); });
			for (const node of [ui.arena, player, player.node.judges]) flight.resizeObserver.observe(node);
			clearTimeout(flight.timeout);
			flight.timeout = setTimeout(() => finish(flight), 1200);
		});
	};
	// 冷图期间不消耗动画时间；不逐帧改写style，避免卡面服务反复刷新。
	flight.readyObserver = new MutationObserver(start);
	flight.readyObserver.observe(source, { attributes: true, childList: true, subtree: true });
	start();
	return true;
}

// broadcastAll在联机端重新编译回调，不能捕获ES模块中的局部函数。
game._decadeUIAnimateXinshaDelayJudge = animateXinshaDelayJudge;
