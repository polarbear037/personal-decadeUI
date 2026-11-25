import { game, lib, ui, _status } from "noname";

// 在已暂停的 Electron 对局中运行；仅播放临时牌面，不推进规则事件。
export async function verifyDiscardMotionRepeat({ fresh = false, baseline = false } = {}) {
	if (!_status.paused) throw new Error("Pause the game before the visual probe");
	const motionURL = new URL("../src/ui/discard-motion-xinsha.js", import.meta.url);
	if (fresh) motionURL.searchParams.set("repeat-probe", Date.now());
	const motion = await import(motionURL.href);
	const layoutURL = new URL("../src/core/layout.js", import.meta.url);
	const source = await (await fetch(layoutURL, { cache: "no-store" })).text();
	const rewritten = source.replace(/from\s*(["'])([^"']+)\1/g, (match, quote, specifier) => {
		if (specifier.endsWith("/discard-motion-xinsha.js")) return `from ${JSON.stringify(motionURL.href)}`;
		if (!specifier.startsWith(".")) return match;
		return `from ${JSON.stringify(new URL(specifier, layoutURL).href)}`;
	});
	const blob = URL.createObjectURL(new Blob([rewritten], { type: "text/javascript" }));
	let layout;
	try { layout = (await import(blob)).createLayoutModule(); }
	finally { URL.revokeObjectURL(blob); }
	const before = { event: _status.event, paused: _status.paused, thrown: ui.thrown,
		style: lib.config.extension_十周年UI_newDecadeStyle,
		cards: game.players.map(player => player.getCards("hej").map(card => card.cardid).join(",")).join(";") };
	const nodes = [];
	const create = name => {
		const card = game.createCard(name, "spade", 11);
		card.classList.add("thrown");
		card.style.transform = "translate(100px,500px) scale(.9)";
		ui.arena.appendChild(card);
		nodes.push(card);
		return card;
	};
	const read = card => { const m = new DOMMatrix(getComputedStyle(card).transform); return { x: m.e, y: m.f }; };
	const check = (condition, message) => { if (!condition) throw new Error(message); };
	try {
		lib.config.extension_十周年UI_newDecadeStyle = "othersOff";
		const card = create("wuxie"), animations = [];
		let completions = 0;
		card.addEventListener("webkitTransitionEnd", () => completions++);
		const animate = card.animate;
		card.animate = function (...args) { const animation = animate.apply(this, args); animations.push(animation); return animation; };
		ui.thrown = [card];
		layout.updateDiscard();
		const target = card.style.transform, initial = animations[0];
		const samples = [], start = performance.now();
		while (performance.now() - start < 650) {
			await new Promise(requestAnimationFrame);
			layout.updateDiscard();
			samples.push({ elapsed: performance.now() - start, ...read(card), time: initial.currentTime });
		}
		const repeated = animations.length;
		const stillFlying = card.getAnimations().some(animation => animation.id === "xinsha-discard-motion");
		const stableCompletions = completions;
		if (baseline) check(repeated > 2 && stillFlying, "Baseline did not reproduce repeated flight restarts");
		else {
			check(repeated === 1, "Unchanged layout restarted the card flight");
			check(!stillFlying && stableCompletions === 1, "The original flight did not finish once");
			layout.updateDiscard();
			check(animations.length === 1, "Completed flight restarted on an unchanged layout");
		}
		// 真正改变处理区排布仍须衔接当前位置，不能将所有后续动画一起屏蔽。
		const next = create("shan"), current = read(card);
		ui.thrown.unshift(next);
		layout.updateDiscard();
		const retarget = read(card), retargeted = animations.length === repeated + 1;
		check(retargeted && Math.hypot(current.x - retarget.x, current.y - retarget.y) < .01, "Retarget jumped or failed to animate");
		motion.finishXinshaDiscardMotion(card);
		motion.finishXinshaDiscardMotion(next);
		// 同一节点被外部移回来源时，缓存不能阻止新的有效飞行。
		const count = animations.length;
		card.style.transform = "translate(200px,500px) scale(.9)";
		layout.updateDiscard();
		const externalReset = animations.length === count + 1;
		check(externalReset, "External position reset was ignored");
		motion.finishXinshaDiscardMotion(card);
		motion.finishXinshaDiscardMotion(next);
		const isolation = {};
		for (const style of ["onlineUI", "on"]) {
			lib.config.extension_十周年UI_newDecadeStyle = style;
			card.style.transform = "translate(250px,500px) scale(.9)";
			const count = animations.length;
			layout.updateDiscard();
			isolation[style] = animations.length === count;
			check(isolation[style], "Other style entered Xinsha flight animation");
		}
		return { baseline, repeated, stillFlying, stableCompletions, target, retargeted, externalReset, isolation, samples };
	} finally {
		for (const card of nodes) { motion.finishXinshaDiscardMotion(card); card.remove(); }
		ui.thrown = before.thrown;
		lib.config.extension_十周年UI_newDecadeStyle = before.style;
		check(_status.event === before.event && _status.paused === before.paused, "Visual probe changed the event state");
		check(game.players.map(player => player.getCards("hej").map(card => card.cardid).join(",")).join(";") === before.cards, "Visual probe changed real cards");
	}
}
