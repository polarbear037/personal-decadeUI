import "noname";
function t(cards, boundsCaches) {
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
	for (let x = 0; x < draws.length; x++) {
		const t = Math.round(xStart + x * xMargin),
			card = draws[x];
		((card.tx = t), (card.ty = l), (card.scaled = !0), (card.style.transition = "transform 400ms ease-out"), (card.style.transform = `translate(${t}px, ${l}px) scale(${cs})`));
	}
}
function e(cards, player, center, boundsCaches) {
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
export { e as layoutDrawCards, t as layoutHandDraws };
