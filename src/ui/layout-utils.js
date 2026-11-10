import "noname";
function getDrawStackStart(count, bounds) {
	bounds.check();
	const cardCount = Math.max(1, count),
		spacing = cardCount > 1 ? Math.min(22 * bounds.cardScale, (bounds.cardWidth * bounds.cardScale) / (cardCount - 1)) : 0,
		startX = (bounds.width - bounds.cardWidth) / 2 - ((cardCount - 1) * spacing) / 2,
		startY = (bounds.height - bounds.cardHeight) / 2;
	return { spacing, x: startX, y: startY, scale: bounds.cardScale };
}
function t(cards, boundsCaches, options) {
	const bounds = boundsCaches.hand;
	bounds.check();
	const pw = bounds.width,
		cw = bounds.cardWidth,
		ch = bounds.cardHeight,
		cs = bounds.cardScale,
		csw = cw * cs,
		draws = [],
		source = cards.duiMod;
	if (source && source !== window.game?.me) {
		source.checkBoundsCache?.();
		let e = 27,
			n = source.cacheLeft - bounds.x - csw / 2 - (cw - csw) / 2,
			r = e * cards.length + (csw - e);
		const l = source.cacheWidth + csw;
		r > l ? (e = csw - Math.abs(l - csw * cards.length) / (cards.length - 1)) : (n += (l - r) / 2);
		const i = Math.round(source.cacheTop - bounds.y - 30 + (source.cacheHeight - ch) / 2);
		for (let a = 0; a < cards.length; a++) {
			const c = Math.round(n + a * e),
				card = cards[a];
			((card.tx = c), (card.ty = i), (card.fixed = !0), (card.scaled = !0), (card.style.transform = `translate(${c}px, ${i}px) scale(${cs})`));
		}
		return;
	}
	for (let x = 0; x < cards.length; x++) {
		const card = cards[x],
			e = card.clone;
		if (e && !e.fixed && e.parentNode === window.ui?.arena) {
			const t = Math.round(e.tx - bounds.x),
				n = Math.round(e.ty - (bounds.y + 30));
			((card.tx = t), (card.ty = n), (card.scaled = !0), (card.style.transform = `translate(${t}px, ${n}px) scale(${cs})`));
		} else draws.push(card);
	}
	const l = Math.round(-ch * cs * 2),
		xMargin = 0.5 * csw,
		xStart = (pw - xMargin * (draws.length + 1)) / 2 - (cw - csw) / 2;
	if ((options?.fromArenaCenter || cards._duiFromArenaCenter) && draws.length) {
		const start = getDrawStackStart(draws.length, boundsCaches.arena),
			centerX = start.x - bounds.x,
			centerY = start.y - (bounds.y + 30);
		for (let x = 0; x < draws.length; x++) {
			const card = draws[x],
				left = Math.round(centerX + x * start.spacing);
			((card.tx = left), (card.ty = Math.round(centerY)), (card.scaled = !0), (card.style.transition = "transform 400ms ease-out"), (card.style.transform = `translate(${left}px, ${Math.round(centerY)}px) scale(${cs})`));
		}
		return;
	}
	for (let x = 0; x < draws.length; x++) {
		const t = Math.round(xStart + x * xMargin),
			card = draws[x];
		((card.tx = t), (card.ty = l), (card.scaled = !0), (card.style.transition = "transform 400ms ease-out"), (card.style.transform = `translate(${t}px, ${l}px) scale(${cs})`));
	}
}
function e(cards, player, center, boundsCaches, options) {
	const bounds = boundsCaches.arena;
	(bounds.updated || bounds.update(), player.checkBoundsCache?.());
	const playerX = player.cacheLeft,
		playerY = player.cacheTop,
		playerW = player.cacheWidth,
		playerH = player.cacheHeight,
		pw = bounds.width,
		ph = bounds.height,
		cw = bounds.cardWidth,
		ch = bounds.cardHeight,
		cs = bounds.cardScale,
		csw = cw * cs;
	if (options?.compact) {
		if (!cards.length) return;
		const compactScale = playerW > 0 && playerW < csw ? Math.min(cs, playerW / cw) : cs,
			compactCardWidth = cw * compactScale,
			compactCardHeight = ch * compactScale,
			compactOffsetX = (cw - compactCardWidth) / 2,
			compactOffsetY = (ch - compactCardHeight) / 2,
			compactSpacing = cards.length > 1 ? Math.min(27, Math.max(0, (playerW - compactCardWidth - 1) / (cards.length - 1))) : 0,
			compactTotalWidth = compactCardWidth + compactSpacing * (cards.length - 1),
			compactStartX = (center ? (pw - playerW) / 2 : playerX) + (playerW - compactTotalWidth) / 2 - compactOffsetX,
			compactY = (center ? (ph - compactCardHeight) / 2 : playerY + (playerH - compactCardHeight) / 2) - compactOffsetY;
		for (let index = 0; index < cards.length; index++) {
			const card = cards[index],
				x = Math.round(compactStartX + index * compactSpacing),
				y = Math.round(compactY);
			(card.tx = x), (card.ty = y), (card.scaled = !0), (card.style.transform = `translate(${x}px, ${y}px) scale(${compactScale})`);
		}
		return;
	}
	let xMargin = 27,
		xStart = (center ? (pw - playerW) / 2 : playerX) - csw / 2 - (cw - csw) / 2,
		totalW = xMargin * cards.length + (csw - xMargin);
	const limitW = playerW + csw;
	totalW > limitW ? (xMargin = csw - Math.abs(limitW - csw * cards.length) / (cards.length - 1)) : (xStart += (limitW - totalW) / 2);
	const M = center ? Math.round((ph - ch) / 2) : Math.round(playerY + (playerH - ch) / 2);
	for (let $ = 0; $ < cards.length; $++) {
		const e = Math.round(xStart + $ * xMargin),
			card = cards[$];
		((card.tx = e), (card.ty = M), (card.scaled = !0), (card.style.transform = `translate(${e}px, ${M}px) scale(${cs})`));
	}
}
export { e as layoutDrawCards, t as layoutHandDraws, getDrawStackStart };
