import { game, lib } from "noname";

// MoveCardController.defaultAction：本人移出18/30秒，其他来源13/30秒，均为EaseSineIn。
// 仅承载飞向其他座位的副本；本人入手、处理区和装备仍走各自路径。
export function moveXinshaCardsToSeat(cards, player, decadeUI, fromSelf = false) {
	if (player === game.me || lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") {
		decadeUI.layoutDrawCards(cards, player);
		decadeUI.delayRemoveCards(cards, 460, 220);
		return;
	}
	const duration = fromSelf ? 600 : 1300 / 3;
	const starts = cards.map(card => ({
		card,
		from: new DOMMatrix(getComputedStyle(card).transform),
		transition: card.style.getPropertyValue("transition-property"),
		priority: card.style.getPropertyPriority("transition-property"),
	}));
	for (const { card } of starts) card.style.setProperty("transition-property", "opacity, left, top", "important");
	decadeUI.layoutDrawCards(cards, player);
	if (cards.length) getComputedStyle(cards[0]).transform;
	const animations = starts.map(({ card, from, transition, priority }) => {
		const to = new DOMMatrix(card.style.transform);
		if (transition) card.style.setProperty("transition-property", transition, priority);
		else card.style.removeProperty("transition-property");
		const frames = Array.from({ length: 121 }, (_, index) => {
			const t = index / 120, move = 1 - Math.cos(t * Math.PI / 2);
			return { offset: t, transform: `translate(${from.e + (to.e - from.e) * move}px,${from.f + (to.f - from.f) * move}px) scale(${from.a + (to.a - from.a) * t},${from.d + (to.d - from.d) * t})` };
		});
		const animation = card.animate(frames, { duration, easing: "linear", fill: "both" });
		animation.id = "xinsha-seat-card-motion";
		animation.pause(); animation.currentTime = 0;
		// 由真实动画完成启动淡出；墙钟定时器可能早于WAAPI最后一帧，不能并行倒计时删牌。
		animation.onfinish = () => {
			animation.onfinish = null;
			animation.cancel();
			if (card.isConnected) decadeUI.delayRemoveCards([card], 100, 220);
		};
		return { card, animation };
	});
	// 保留首个可见帧，不让同步结算先消耗飞行时间；一批副本共用一个起播时钟。
	requestAnimationFrame(() => {
		const now = performance.now();
		for (const { card, animation } of animations) {
			if (!card.isConnected || lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") {
				animation.onfinish = null; animation.cancel();
				if (card.isConnected) card.remove();
				continue;
			}
			animation.play(); animation.startTime = now;
		}
	});
}
