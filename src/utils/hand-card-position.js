import { game, ui, _status } from "noname";

const handCardPositions = new WeakMap();
const confirmedHandCards = new WeakMap();

// 确认后 uncheck 仍立即清空逻辑选择，但实体牌须保持原位，直到 lose 接走飞行起点。
export function preserveConfirmedHandCard(card) {
	const current = _status.event;
	if (!game.me || (card.parentNode !== game.me.node.handcards1 && card.parentNode !== game.me.node.handcards2)) {
		confirmedHandCards.delete(card);
		return false;
	}
	if (
		current?.player === game.me && ["chooseToUse", "chooseToRespond"].includes(current.name) &&
		!current.nouse && !current.chooseonly && current.result?.bool && current.result.confirm === "ok" &&
		current.result.card && current.result.cards?.includes(card) && ui.selected.cards.includes(card)
	) {
		confirmedHandCards.set(card, { event: current, result: current.result });
	}
	const confirmed = confirmedHandCards.get(card);
	if (!confirmed) return false;
	if (confirmed.event.result === confirmed.result && confirmed.result.bool && !confirmed.result.cancel) {
		const seen = new Set();
		for (let event = current; event && !seen.has(event); event = event.parent) {
			if (event === confirmed.event) return true;
			seen.add(event);
		}
	}
	confirmedHandCards.delete(card);
	return false;
}

function readHandCardPosition(card, player) {
	if (player !== game.me || !ui.arena || !card?.isConnected) return null;
	if (card.parentNode !== player.node.handcards1 && card.parentNode !== player.node.handcards2) return null;
	const rect = card.getBoundingClientRect(), arena = ui.arena.getBoundingClientRect();
	if (!rect.width || !rect.height || !arena.width || !arena.height) return null;
	const zoomX = arena.width / ui.arena.offsetWidth, zoomY = arena.height / ui.arena.offsetHeight;
	return {
		x: (rect.left + rect.width / 2 - arena.left) / zoomX - ui.arena.clientLeft,
		y: (rect.top + rect.height / 2 - arena.top) / zoomY - ui.arena.clientTop,
		width: rect.width / zoomX,
		height: rect.height / zoomY,
	};
}

// lose 会先缩小并移走实体牌，必须在这之前读取选牌抬起、滚动和过渡中的实际位置。
export function captureHandCardPosition(card, player) {
	confirmedHandCards.delete(card);
	handCardPositions.delete(card);
	const position = readHandCardPosition(card, player);
	if (position) handCardPositions.set(card, position);
}

export function applyHandCardPosition(card, clone, player, bounds) {
	const position = readHandCardPosition(card, player) || handCardPositions.get(card);
	handCardPositions.delete(card);
	if (player !== game.me || !position) return false;
	bounds.check();
	clone.tx = position.x - bounds.cardWidth / 2;
	clone.ty = position.y - bounds.cardHeight / 2;
	clone.scaled = true;
	clone.throwordered = true;
	clone.style.transform = `translate(${clone.tx}px,${clone.ty}px) scale(${position.width / bounds.cardWidth},${position.height / bounds.cardHeight})`;
	return true;
}
