import { lib, _status, get, game, ui } from "noname";
import { dealInitialCards, finishInitialDeal, broadcastAnimatedDeal, finishAnimatedDeal } from "../overrides/opening-deal.js";
class e {
	static FREE_CHANGES = 3;
	static async playDrawAnimation(player, cards, gaintagList) {
		broadcastAnimatedDeal(player, cards, gaintagList);
		await finishAnimatedDeal(player, cards, gaintagList, 0);
	}
	static clearTimers() {
		["timer", "timer2"].forEach(timerName => {
			window[timerName] && (clearInterval(window[timerName]), delete window[timerName]);
		});
	}
	static removeProgressBar() {
		document.getElementById("jindutiaopl")?.remove();
	}
	static showTimer() {
		(this.clearTimers(), this.removeProgressBar(), "0" !== lib.config.extension_十周年UI_jindutiaoYangshi && game.Jindutiaoplayer?.());
	}
	static hideTimer() {
		(this.clearTimers(), this.removeProgressBar());
	}
	static closeCardDialog() {
		ui.cardDialog && (delete ui.cardDialog._isLuckyCardTip, ui.cardDialog.close(), delete ui.cardDialog);
	}
	static stripTags(text) {
		return "string" == typeof text ? text.replace(/<\/?.+?\/?>/g, "") : "";
	}
	static setupConfirmButton() {
		if (!ui.confirm?.childNodes?.length) return;
		if ("off" === lib.config.extension_十周年UI_newDecadeStyle) return;
		const btn = ui.confirm.childNodes[0];
		"ok" === btn?.link && (btn.innerHTML = "换牌");
	}
	static getPromptText(freeChanges, luckyCards) {
		return freeChanges > 0 ? `本场还可免费更换<span style='color:#00c853'>${freeChanges}次</span>手牌(剩余${luckyCards}张手气卡)` : `每次更换消耗一张手气卡(剩余<span style='color:#00c853'>${luckyCards}</span>张手气卡)`;
	}
	static canChange(freeChanges, luckyCards) {
		return freeChanges > 0 || luckyCards > 0;
	}
	static showDialog(promptText) {
		if ((this.showTimer(), "function" == typeof decadeUI?.showHandTip)) {
			this.closeCardDialog();
			const a = (ui.cardDialog = decadeUI.showHandTip());
			return ((a._isLuckyCardTip = !0), a.appendText(this.stripTags(promptText)), a.strokeText(), a.show(), null);
		}
		return ui.create.dialog(promptText);
	}
	static cleanup(dialog) {
		(this.hideTimer(), this.closeCardDialog(), dialog?.close(), ui.confirm?.close());
	}
}
class a {
	static canShowChangeDialog(context) {
		return context.targets?.includes(game.me) !== !1 && "disabled" !== context.changeCard && !_status.auto && game.me.countCards("h") > 0 && e.canChange(context.freeChanges, context.luckyCards);
	}
	static async performCardChange(context) {
		const player = game.me;
		const hs = player.getCards("h");
		if (!hs.length) return;
		game.changeCoin?.(-3);
		const cards = [],
			otherGetCards = context.otherPile?.[player.playerid]?.getCards,
			otherDiscard = context.otherPile?.[player.playerid]?.discard;
		game.addVideo("lose", player, [get.cardsInfo(hs), [], [], []]);
		for (const card of hs) (card.removeGaintag(!0), otherDiscard ? otherDiscard(card) : card.discard(!1));
		let gaintagList;
		if ((otherGetCards ? cards.addArray(otherGetCards(hs.length)) : cards.addArray(get.cards(hs.length)), context.gaintag?.[player.playerid])) {
			const r = context.gaintag[player.playerid],
				i = "function" == typeof r ? r(hs.length, cards) : [[cards, r]];
			gaintagList = i.slice().reverse();
		}
		broadcastAnimatedDeal(player, cards, gaintagList);
		await finishAnimatedDeal(player, cards, gaintagList);
		((player._start_cards = player.getCards("h")), context.freeChanges > 0 ? context.freeChanges-- : context.luckyCards--);
	}
}
function t() {
	return new Promise(e => {
		_status.imchoosing = !0;
		const a = _status.event;
		((a.switchToAuto = () => {
			((_status.imchoosing = !1), e(!1));
		}),
			(a.custom.replace.confirm = bool => {
				((_status.imchoosing = !1), (_status.event.bool = bool), e(bool), game.resume());
			}),
			game.pause());
	});
}
function r() {
	((lib._luckyCard = e),
		(lib.element.content.gameDraw = async function () {
			if (_status.brawl?.noGameDraw) return;
			const r = { player: this.player, num: this.num, targets: this.targets, otherPile: this.otherPile, gaintag: this.gaintag, changeCard: get.config("change_card"), freeChanges: e.FREE_CHANGES, luckyCards: 1e4 + Math.floor(9e4 * Math.random()), pendingGains: [], doubleDrawPlayers: [], players: [] };
			(dealInitialCards(r.player, r.num, r),
				await finishInitialDeal(r),
				(_status.connectMode || ("single" === lib.config.mode && "wuxianhuoli" !== _status.mode) || ("doudizhu" === lib.config.mode && "online" === _status.mode) || !["identity", "guozhan", "doudizhu", "single", "shanhetu"].includes(lib.config.mode)) && (r.changeCard = "disabled"),
				await (() => {
					const aiChanges = lib.__leiOlAiLuckyCard?.(r, e.playDrawAnimation);
					return (a.canShowChangeDialog(r)
						? (async function (context) {
							for (; a.canShowChangeDialog(context); ) {
								const i = e.getPromptText(context.freeChanges, context.luckyCards),
									n = e.showDialog(i);
								(ui.create.confirm("oc"), e.setupConfirmButton());
								const o = await t();
								if (("once" === context.changeCard ? (context.changeCard = "disabled") : "twice" === context.changeCard && (context.changeCard = "once"), !o)) {
									(e.cleanup(n), (game.me._start_cards = game.me.getCards("h")));
									break;
								}
								e.cleanup(n), await a.performCardChange(context);
								if ("disabled" === context.changeCard || !e.canChange(context.freeChanges, context.luckyCards)) break;
							}
						})(r)
						: Promise.resolve()).then(() => aiChanges).then(() => setTimeout(() => decadeUI.effect?.gameStart?.(), 51));
				})());
		}));
}
export { r as setupLuckyCard };
