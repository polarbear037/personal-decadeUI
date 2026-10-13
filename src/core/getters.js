import { get, _status } from "noname";
import { lerp as e } from "../animation/utils.js";
import { CubicBezierEase as t } from "../animation/easing.js";
import "../animation/DynamicPlayer.js";
const o = /* @__PURE__ */ new Set(["caomu", "草木皆兵", "fulei", "浮雷", "shandian", "闪电", "bingliang", "兵粮寸断", "lebu", "乐不思蜀"]);
function n() {
	return {
		judgeEffect: (name, value) => (o.has(name) ? value < 0 : value),
		isWebKit: () => void 0 !== document.body.style.WebkitBoxShadow,
		lerp: e,
		ease(fraction) {
			return ((this._bezier3 ??= new t(0.25, 0.1, 0.25, 1)), this._bezier3.ease(fraction));
		},
		extend: (target, source) => (source && "object" == typeof source ? Object.assign(target, source) : target),
		bodySize() {
			const size = decadeUI.dataset.bodySize;
			return (size.updated || ((size.updated = !0), (size.height = document.body.clientHeight), (size.width = document.body.clientWidth)), size);
		},
		bestValueCards(cards, player) {
			player || (player = _status.event.player);
			const matchs = [],
				basics = [],
				equips = [],
				hasEquipSkill = player.hasSkill("xiaoji");
			cards.sort((a, b) => get.value(b, player) - get.value(a, player));
			for (let a = 0; a < cards.length; a++) {
				let s = !1;
				const d = get.type(cards[a]);
				("basic" === d ? ((s = basics.some(t => !cards[a].toself && t.name === cards[a].name)), s || basics.push(cards[a])) : "equip" !== d || hasEquipSkill || ((s = equips.some(t => get.subtype(t) === get.subtype(cards[a]))), s || equips.push(cards[a])), s || (matchs.push(cards[a]), cards.splice(a--, 1)));
			}
			return (cards.sort((a, b) => get.value(b, player) - get.value(a, player)), matchs.concat(cards));
		},
		cheatJudgeCards(cards, judges, friendly) {
			if (!cards || !judges) throw arguments;
			const cheats = [];
			for (const i of judges) {
				const t = get.judge(i);
				cards.sort((e, n) => (friendly ? t(n) - t(e) : t(e) - t(n)));
				const a = t(cards[0]);
				if (!((friendly && a >= 0) || (!friendly && a < 0))) break;
				cheats.push(cards.shift());
			}
			return cheats;
		},
		elementLeftFromWindow: element => element.getBoundingClientRect().left + window.scrollX,
		elementTopFromWindow: element => element.getBoundingClientRect().top + window.scrollY,
		handcardInitPos() {
			const hand = decadeUI.boundsCaches.hand;
			hand.updated || hand.update();
			const { cardWidth: cardW, cardHeight: cardH, cardScale: scale } = hand;
			return { x: -Math.round((cardW - cardW * scale) / 2), y: (cardH * scale - cardH) / 2, scale: scale };
		},
	};
}
export { n as createDecadeUIGetModule };
