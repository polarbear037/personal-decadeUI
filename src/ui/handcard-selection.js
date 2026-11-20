import { lib, get, ui } from "noname";

// 可用条件与本体 Check.card 相同；选牌数量上限由本体单独管理。
function isHandCardAvailable(card, event) {
	const player = event?.player;
	if (!event?.isMine() || !event.filterCard || !player?.getCards("h").includes(card) || !player.getCards(event.position).includes(card)) return false;
	if (card.classList.contains("uncheck") || player.isOut() || !lib.filter.cardAiIncluded(card)) return false;
	const canReplace = ui.selected.cards.length === 1 && get.select(event.selectCard)[1] === 1 && !card.classList.contains("selected");
	const selected = canReplace ? ui.selected.cards.splice(0) : [];
	const targets = canReplace ? ui.selected.targets.splice(0) : [];
	try {
		// 单选换牌与点击共用取消旧牌后的条件，避免选中牌和旧目标影响判断。
		return !!(lib.filter.cardRespondable(card, player) && event.filterCard(card, player));
	} finally {
		if (canReplace) {
			ui.selected.cards.push(...selected);
			ui.selected.targets.push(...targets);
		}
	}
}

export { isHandCardAvailable };
