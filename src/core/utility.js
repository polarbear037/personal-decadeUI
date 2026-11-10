import { game, _status, lib } from "noname";
import { delayRemoveCards as delayRemoveCards, getMapElementPos as getMapElementPos, getRandom as getRandom, isMobile as isMobile } from "../utils/core.js";
import { getPlayerIdentity as getPlayerIdentity } from "../utils/identity.js";
import { BoundsCache as BoundsCache, createBoundsCaches as createBoundsCaches } from "../utils/bounds.js";
import { element as element } from "../utils/element.js";
import { layoutHandDraws as layoutHandDraws, layoutDrawCards as layoutDrawCards } from "../ui/layout-utils.js";
import { cardTempSuitNum as cardTempSuitNum, tryAddPlayerCardUseTag as tryAddPlayerCardUseTag, playTrickJudgeResult as playTrickJudgeResult } from "../ui/card-utils.js";
import { showHandTip as showHandTip } from "../ui/handtip.js";
const h = decadeUI => {
		(Object.assign(decadeUI, { isMobile: isMobile, getRandom: getRandom, getMapElementPos: getMapElementPos, delayRemoveCards: delayRemoveCards, getPlayerIdentity: getPlayerIdentity }),
			(decadeUI.delay = ms => {
				if ("number" != typeof ms) throw new Error("milliseconds must be a number");
				_status.paused || (game.pause(), (_status.timeout = setTimeout(game.resume, ms)));
			}),
			(decadeUI.queueNextTick = (callback, ctx) => {
				((decadeUI._tickEntries ??= []),
					decadeUI._tickEntries.push({ ctx: ctx, callback: callback }),
					decadeUI._queueTick ||
						(decadeUI._queueTick = Promise.resolve().then(() => {
							decadeUI._queueTick = null;
							const entries = decadeUI._tickEntries;
							((decadeUI._tickEntries = []), entries.forEach(e => e.callback.call(e.ctx)));
						})));
			}),
			(decadeUI.queueNextFrameTick = (callback, ctx) => {
				((decadeUI._frameTickEntries ??= []),
					decadeUI._frameTickEntries.push({ ctx: ctx, callback: callback }),
					decadeUI._queueFrameTick ||
						(decadeUI._queueFrameTick = requestAnimationFrame(() => {
							decadeUI._queueFrameTick = null;
							const entries = decadeUI._frameTickEntries;
							((decadeUI._frameTickEntries = []), setTimeout(() => entries.forEach(e => e.callback.call(e.ctx)), 0));
						})));
			}),
			(decadeUI.layoutHand = () => decadeUI.layout.updateHand()),
			(decadeUI.layoutHandDraws = (cards, options) => layoutHandDraws(cards, decadeUI.boundsCaches, options ?? ("onlineUI" === lib.config.extension_十周年UI_newDecadeStyle ? { fromArenaCenter: !0 } : void 0))),
			(decadeUI.layoutDrawCards = (cards, player, center, options) => layoutDrawCards(cards, player, center, decadeUI.boundsCaches, options)),
			(decadeUI.layoutDiscard = () => decadeUI.layout.updateDiscard()),
			(decadeUI.cardTempSuitNum = (card, suit, number) => cardTempSuitNum(card, suit, number, decadeUI.element)),
			(decadeUI.tryAddPlayerCardUseTag = (card, player, event) => tryAddPlayerCardUseTag(card, player, event, decadeUI)),
			(decadeUI.playTrickJudgeResult = (card, success) => playTrickJudgeResult(card, success, decadeUI)));
		((decadeUI.getCardBestScale = (size, ratio = lib.config?.extension_十周年UI_cardScale ?? 0.18) => {
			const cardSize = size?.height ? size : decadeUI.getHandCardSize(!0);
			// 以固定16:9基准保留原设置的大小，只随窗口宽度等比缩放。
			return (decadeUI.get.bodySize().width * (9 / 16) * ratio) / cardSize.height;
		}),
			(decadeUI.getHandCardSize = (e = !1) => {
				const style = decadeUI.sheet.getStyle(".media_defined > .card") || decadeUI.sheet.getStyle(".hand-cards > .handcards > .card");
				return style ? { width: parseFloat(style.width), height: parseFloat(style.height) } : e ? { width: 108, height: 150 } : { width: 0, height: 0 };
			}));
	},
	p = decadeUI => {
		((decadeUI.BoundsCache = BoundsCache),
			(decadeUI.boundsCaches = createBoundsCaches(decadeUI)),
			(decadeUI.element = element),
			(decadeUI.showHandTip = text => showHandTip(text, decadeUI)),
			(decadeUI.game = {
				wait: game.pause,
				resume() {
					if (game.loopLocked) return void (_status.paused = !1);
					const t = decadeUI.eventDialog;
					!1 !== t?.finished || t.finishing ? game.resume() : (t.finish(), (decadeUI.eventDialog = void 0));
				},
			}));
	};
export { p as enhanceDecadeUIRuntime, h as registerDecadeUIUtilityModule };
