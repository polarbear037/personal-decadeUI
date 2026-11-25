// SelfCardsArea.reorderAllCards_new：8/30 秒，EaseSineOut。
// 保持起点到首个可绘制帧，避免同步 game.check 耗尽整段动画。
const motions = new WeakMap();
let layoutUpdates;
const pendingStarts = new Set();
let startFrame = 0;

// updateTransform 仍合成选中/悬停位置；整手重排收集完后统一读起点、写终点。
export function withXinshaHandLayout(update) {
	const previous = layoutUpdates;
	const updates = layoutUpdates = new Map();
	try { update(); }
	finally {
		layoutUpdates = previous;
		if (previous) for (const [card, placement] of updates) previous.set(card, placement);
		else applyHandMotions([...updates.values()]);
	}
}

export function updateXinshaHandMotion(card, transform, selected) {
	const placement = { card, transform, selected };
	if (layoutUpdates) layoutUpdates.set(card, placement);
	else applyHandMotions([placement]);
}

function applyHandMotions(placements) {
	const now = performance.now();
	const updates = placements.filter(({ card, transform, selected }) => {
		const state = motions.get(card);
		return !state || state.target !== transform || state.applied !== card.style.transform || state.selected !== selected;
	});
	// 先把运行中的动画推进到同一个时刻，再读全部牌；不能在读下一张前先写上一张。
	for (const { card } of updates) {
		const animation = motions.get(card)?.animation;
		if (animation?.playState === "running" && animation.startTime !== null) {
			animation.currentTime = Math.min(800 / 3, Math.max(animation.currentTime || 0, (now - animation.startTime) * animation.playbackRate));
		}
	}
	for (const placement of updates) {
		placement.previous = motions.get(placement.card);
		if (placement.previous || placement.selected) placement.from = getComputedStyle(placement.card).transform;
	}
	for (const { card, transform, selected, previous, from } of updates) {
		// 首次入手保留现有入场流程；从下一次位置/选择变化起才接管重排。
		// 悬停命中区恢复会显式禁用过渡，须同步落位供 elementFromPoint/原生拖选读取。
		if ((!previous && !selected) || card.style.getPropertyValue("transition-property") === "none" || card.classList.contains("transition-none")) {
			previous?.dispose?.();
			card.style.transform = transform;
			motions.set(card, { selected, target: transform, applied: card.style.transform });
			continue;
		}
		previous?.dispose?.();
		const saved = card.style.getPropertyValue("transition-property"), priority = card.style.getPropertyPriority("transition-property");
		card.style.setProperty("transition-property", "opacity, left, top", "important");
		card.style.transform = transform;
		const state = { card, selected, target: transform, applied: card.style.transform, saved, priority };
		motions.set(card, state);
		state.animation = card.animate([{ transform: from }, { transform }], {
			duration: 800 / 3, easing: "cubic-bezier(0.39, 0.575, 0.565, 1)", fill: "both",
		});
		state.animation.id = "xinsha-hand-motion";
		state.animation.pause();
		state.animation.currentTime = 0;
		state.dispose = () => {
			pendingStarts.delete(state);
			if (!pendingStarts.size && startFrame) { cancelAnimationFrame(startFrame); startFrame = 0; }
			state.animation.onfinish = state.animation.oncancel = null;
			state.animation.cancel();
			if (card.style.getPropertyValue("transition-property") === "opacity, left, top") {
				if (saved) card.style.setProperty("transition-property", saved, priority);
				else card.style.removeProperty("transition-property");
			}
			delete state.animation;
			delete state.dispose;
		};
		state.animation.onfinish = state.animation.oncancel = state.dispose;
		pendingStarts.add(state);
	}
	// 提交禁用 transform 过渡后的终点，恢复 CSS 时不会另起一条过渡与 WAAPI 竞争。
	if (pendingStarts.size) getComputedStyle([...pendingStarts][0].card).transform;
	if (pendingStarts.size && !startFrame) startFrame = requestAnimationFrame(() => {
		startFrame = 0;
		const states = [...pendingStarts];
		pendingStarts.clear();
		// 每张牌的回调分别读 performance.now() 仍会错开；整批只取一次新鲜时钟。
		const startTime = performance.now();
		for (const state of states) {
			if (!state.card.isConnected) { state.dispose(); continue; }
			state.animation.play();
			state.animation.startTime = startTime;
		}
	});
}

export function clearXinshaHandMotion(card, preservePosition = false) {
	// 确认可能发生在抬升途中。取消动画前先保留绘制位置，不能跳到行内终点，
	// 也不能让 CSS transition 在 uncheck 后继续移动，直到 lose 读取起飞点。
	const transform = preservePosition ? getComputedStyle(card).transform : null;
	motions.get(card)?.dispose?.();
	motions.delete(card);
	if (transform !== null) {
		const saved = card.style.getPropertyValue("transition-property"), priority = card.style.getPropertyPriority("transition-property");
		card.style.setProperty("transition-property", "none", "important");
		card.style.transform = transform;
		card.getBoundingClientRect();
		if (saved) card.style.setProperty("transition-property", saved, priority);
		else card.style.removeProperty("transition-property");
	}
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
