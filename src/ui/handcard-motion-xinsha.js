// SelfCardsArea.reorderAllCards_new：8/30 秒，EaseSineOut。
// 保持起点到首个可绘制帧，避免同步 game.check 耗尽整段动画。
const motions = new WeakMap();

export function updateXinshaHandMotion(card, transform, selected) {
	const previous = motions.get(card);
	if (previous && previous.selected === selected) {
		if (previous.animation && previous.target !== transform) {
			previous.target = transform;
			previous.animation.effect.setKeyframes([{ transform: previous.from }, { transform }]);
		}
		if (card.style.transform !== transform) card.style.transform = transform;
		return;
	}
	if (!previous && !selected) {
		motions.set(card, { selected });
		if (card.style.transform !== transform) card.style.transform = transform;
		return;
	}
	const from = getComputedStyle(card).transform;
	previous?.dispose?.();
	const saved = card.style.getPropertyValue("transition-property"), priority = card.style.getPropertyPriority("transition-property");
	card.style.setProperty("transition-property", "opacity, left, top");
	card.style.transform = transform;
	const animation = card.animate([{ transform: from }, { transform }], {
		duration: 800 / 3, easing: "cubic-bezier(0.39, 0.575, 0.565, 1)", fill: "both",
	});
	animation.pause();
	const state = { selected, animation, target: transform, from, saved, priority };
	motions.set(card, state);
	let frame = requestAnimationFrame(() => {
		frame = 0;
		if (!card.isConnected) return state.dispose();
		animation.play();
		// 同帧早先的长任务会让 rAF 参数仍是旧帧时间，须读取回调当下的时钟。
		animation.startTime = performance.now();
	});
	state.dispose = () => {
		if (frame) cancelAnimationFrame(frame);
		animation.onfinish = animation.oncancel = null;
		animation.cancel();
		if (card.style.getPropertyValue("transition-property") === "opacity, left, top") {
			if (saved) card.style.setProperty("transition-property", saved, priority);
			else card.style.removeProperty("transition-property");
		}
		delete state.animation;
		delete state.dispose;
	};
	animation.onfinish = animation.oncancel = state.dispose;
}

export function clearXinshaHandMotion(card) {
	motions.get(card)?.dispose?.();
	motions.delete(card);
}

export function finishXinshaHandMotion(card) {
	const state = motions.get(card);
	state?.animation?.finish();
	state?.dispose?.();
}

export function restoreXinshaHandMotionCopy(source, clone) {
	const state = motions.get(source);
	if (!state?.animation || clone.style.getPropertyValue("transition-property") !== "opacity, left, top") return;
	if (state.saved) clone.style.setProperty("transition-property", state.saved, state.priority);
	else clone.style.removeProperty("transition-property");
}
