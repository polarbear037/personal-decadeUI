import { lib } from "noname";

const motions = new WeakMap();
const targets = new WeakMap();
const pendingLayouts = new WeakSet();
const pendingStarts = new Set();
let startFrame = 0;

// DisCardAreaUi.addToStackArea 当次调用 reorderAllCards，不等绘制后的计时器。
export function queueXinshaDiscardLayout(decadeUI) {
	if (pendingLayouts.has(decadeUI)) return;
	pendingLayouts.add(decadeUI);
	decadeUI.queueNextTick(() => {
		pendingLayouts.delete(decadeUI);
		if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") decadeUI.layoutDiscard();
	});
}

export function finishXinshaDiscardMotion(card, notifyCompletion = true) {
	const state = motions.get(card);
	if (!state) return;
	pendingStarts.delete(state);
	if (!pendingStarts.size && startFrame) { cancelAnimationFrame(startFrame); startFrame = 0; }
	state.animation.onfinish = state.animation.oncancel = null;
	state.animation.cancel();
	motions.delete(card);
	// 本体 listenTransition 只监听此事件；WAAPI 不会自动派发，缺失时会空等1秒兜底。
	// 完成或清理本张牌的飞行时释放原生等待，保留用牌/弃牌的结算节奏。
	if (notifyCompletion) card.dispatchEvent(new Event("webkitTransitionEnd"));
}

export function syncXinshaDiscardAnimationTime(animation, now = performance.now()) {
	// DocumentTimeline/currentTime 在同一长任务中停在上一帧，合成线程却仍在飞。
	// 本模块用 performance.now() 设定起播时间；同步到同一时钟后再读取交接点。
	if (animation?.playState !== "running" || animation.startTime === null) return;
	const elapsed = Math.max(animation.currentTime || 0, (now - animation.startTime) * animation.playbackRate);
	animation.currentTime = Math.min(animation.effect.getTiming().duration, Math.max(0, elapsed));
}

export function updateXinshaDiscardMotion(placements) {
	const now = performance.now();
	// 先读取全部当前绘制位置，连续出牌时从途中位置重排，不跳回旧起点。
	const updates = placements.filter(({ card, transform }) => {
		const target = targets.get(card);
		// CSSOM会给translate补空格、规范化数值；保存实际写入值，不能与原字符串直接比较。
		// 同时核对当前行内值，确保外部移回来源后仍能重新起飞。
		return !target || target.transform !== transform || target.applied !== card.style.transform;
	});
	for (const placement of updates) syncXinshaDiscardAnimationTime(motions.get(placement.card)?.animation, now);
	for (const placement of updates) {
		const animation = motions.get(placement.card)?.animation;
		Object.assign(placement, {
			// 重排延续本次飞行的截止时间，不能每换一个终点就重新计满300ms。
			duration: animation ? Math.max(0, animation.effect.getTiming().duration - Math.max(0, animation.currentTime || 0)) : 300,
			reflow: targets.has(placement.card),
			from: new DOMMatrix(getComputedStyle(placement.card).transform),
			saved: placement.card.style.getPropertyValue("transition-property"),
			priority: placement.card.style.getPropertyPriority("transition-property"),
		});
	}
	// 同批旧牌的重排共用最早截止时间：已到位的牌不能再慢慢走300ms，
	// 途中牌也不能因重排反复延长飞行。新入场的牌仍保留完整300ms。
	const reflowDuration = Math.min(300, ...updates.filter(update => update.reflow).map(update => update.duration));
	for (const { card, transform } of updates) {
		// 重排只是衔接同一次飞行，不能冒充完成事件。
		// 否则原生 lose 会提前继续，moveTo 与仍在播放的新动画同时写位置。
		finishXinshaDiscardMotion(card, false);
		card.style.setProperty("transition-property", "opacity, left, top", "important");
		card.style.transform = transform;
		targets.set(card, { transform, applied: card.style.transform });
	}
	// 一次提交所有底层终点，避免原来的460ms CSS过渡在WAAPI结束后继续移动。
	if (updates.length) getComputedStyle(updates[0].card).transform;
	for (const { card, transform, from, duration, reflow, saved, priority } of updates) {
		if (saved) card.style.setProperty("transition-property", saved, priority);
		else card.style.removeProperty("transition-property");
		const to = new DOMMatrix(transform);
		// 原版 spawn(EaseSineOut(MoveTo(.3)), scaleTo(.3))：位置正弦减速，缩放线性。
		// 5ms采样交给浏览器插值，不逐帧读取布局或写DOM；最大位置误差<0.00009路程。
		const keyframes = Array.from({ length: 61 }, (_, index) => {
			const progress = index / 60, move = Math.sin(progress * Math.PI / 2);
			return { offset: progress, transform: `translate(${from.e + (to.e - from.e) * move}px,${from.f + (to.f - from.f) * move}px) scale(${from.a + (to.a - from.a) * progress},${from.d + (to.d - from.d) * progress})` };
		});
		const animation = card.animate(keyframes, { duration: reflow ? reflowDuration : duration, easing: "linear", fill: "both" });
		animation.id = "xinsha-discard-motion";
		animation.pause();
		animation.currentTime = 0;
		const state = { card, animation };
		motions.set(card, state);
		animation.onfinish = animation.oncancel = () => finishXinshaDiscardMotion(card);
		// 结算长任务不能消耗尚未绘制的动画；首个可绘制帧即起播，不再追加计时器。
		pendingStarts.add(state);
	}
	if (pendingStarts.size && !startFrame) startFrame = requestAnimationFrame(() => {
		startFrame = 0;
		const states = [...pendingStarts];
		pendingStarts.clear();
		const startTime = performance.now();
		for (const { card, animation } of states) {
			if (motions.get(card)?.animation !== animation) continue;
			if (!card.isConnected || lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") { finishXinshaDiscardMotion(card); continue; }
			animation.play();
			animation.startTime = startTime;
		}
	});
}
