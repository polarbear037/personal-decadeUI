import { _status, ui, lib, game, get } from "noname";
import { wrapAround as wrapAround } from "../utils/safeOverride.js";
const t = /* @__PURE__ */ new WeakMap(),
	n = () => !1 !== lib.config.extension_十周年UI_autoSelect,
	r = (event, type) => {
		const select = event[`select${type}`];
		if (void 0 === select) return [1, 1];
		if ("number" == typeof select) return [select, select];
		if ("function" == typeof select) {
			const result = select();
			return "number" == typeof result ? [result, result] : Array.isArray(result) ? result : [1, 1];
		}
		return Array.isArray(select) ? select : [1, 1];
	},
	a = event => (t.has(event) || t.set(event, { cardDone: !1, targetState: "", manualCancel: /* @__PURE__ */ new Set() }), t.get(event)),
	c = () => {
		const cards = ui.selected.cards?.map(c => c.cardid || c.name).join(",") || "";
		return `${_status.event?.skill || ""}|${cards}`;
	},
	s = event => {
		if (!n() || !event.filterCard || _status.auto) return !1;
		if (event.noAutoSelect || event.complexSelect || event.complexCard) return !1;
		if (
			!(event => {
				if ("chooseToRespond" === event.name || event.respondTo || "wuxie" === event.type) return !0;
				if (event.forceDirect) return !0;
				const parent = event.getParent?.();
				if ("chooseToRespond" === parent?.name || parent?.respondTo || "dying" === parent?.name || event.dying) return !0;
				if ("phaseDiscard" === event.name || "phaseDiscard" === parent?.name) return !1;
				if ("chooseCard" === event.name && !event.dialog?.querySelector(".buttons")) {
					const [e, t] = r(event, "Card");
					if (1 === e && 1 === t) return !0;
				}
				if ("chooseToDiscard" === event.name) {
					const [e, t] = r(event, "Card");
					if (1 === e && 1 === t) {
						const e = event.position;
						if (!event.ai || ("he" !== e && "hes" !== e)) return !0;
					}
				}
				return !1;
			})(event)
		)
			return !1;
		const e = a(event);
		if (e.manualCancel.has("card") || e.cardDone) return !1;
		const [t, c] = r(event, "Card");
		if (t !== c) return !1;
		if ("chooseToDiscard" === event.name && t > 1 && event.ai) {
			const e = event.position;
			if ("he" === e || "hes" === e) return !1;
		}
		return !0;
	},
	o = () => {
		const event = _status.event;
		if (
			!(event => {
				if (!n() || !event.filterTarget || _status.auto) return !1;
				if (event.noAutoSelect || event.complexSelect || event.complexTarget) return !1;
				const e = a(event);
				if (e.manualCancel.has("target")) return !1;
				const [t, s] = r(event, "Target");
				if (t !== s) return !1;
				if (1 !== t) return !1;
				const o = c();
				return e.targetState !== o;
			})(event)
		)
			return !1;
		const e = game.players.filter(e => e.classList.contains("selectable") && !e.classList.contains("selected")),
			t = ui.selected.targets?.length || 0,
			s = r(event, "Target")[0] - t;
		return (
			s > 0 &&
			e.length === s &&
			(e.forEach(target => {
				(target.classList.add("selected"), ui.selected.targets.add(target));
			}),
			(a(event).targetState = c()),
			!0)
		);
	};

function selectQinglongTarget(event) {
	// 原版追刀的 roleOpt 固定原目标；复杂选牌不应让玩家再次指定这名角色。
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || event.name !== "chooseToUse" || event.logSkill !== "qinglong_skill" || _status.auto || _status.video) return false;
	const target = event.sourcex;
	const card = get.card();
	if (!target || !card || get.name(card) !== "sha") return false;
	if (event.filterCard && ui.selected.cards.length < get.select(event.selectCard)[0]) return false;
	if (ui.selected.targets.includes(target)) {
		// 固定目标不提供取消选择入口；额外目标仍由本体检查和点击流程维护。
		target.classList.remove("selectable");
		return false;
	}
	const max = get.select(event.selectTarget)[1];
	if (max === 0 || max > 0 && ui.selected.targets.length >= max || !target.classList.contains("selectable")) return false;
	target.classList.add("selected");
	ui.selected.targets.add(target);
	return true;
}

function i() {
	(wrapAround(ui.click, "cancel", function (e, ...n) {
		return (t.delete(_status.event), e.apply(this, n));
	}),
		wrapAround(ui.click, "card", function (original, ...args) {
			const event = _status.event;
			if (event) {
				const e = a(event);
				this.classList?.contains("selected") ? ((e.cardDone = !1), (e.targetState = ""), e.manualCancel.add("card"), e.manualCancel.delete("target")) : (e.manualCancel.clear(), (e.cardDone = !0));
			}
			return original.apply(this, args);
		}),
		wrapAround(ui.click, "skill", function (e, ...n) {
			return (t.delete(_status.event), e.apply(this, n));
		}),
		wrapAround(ui.click, "target", function (original, ...args) {
			const event = _status.event;
			if (event && this.classList?.contains("selected")) {
				const e = a(event);
				((e.targetState = ""), e.manualCancel.add("target"));
			}
			return original.apply(this, args);
		}),
		lib.hooks?.checkEnd?.add("_decadeUI_autoSelect", (event, { ok: e }) => {
			if (_status.event !== event || !event.isMine() || (_status.paused && !_status.imchoosing)) return;
			if (selectQinglongTarget(event)) {
				game.check();
				return;
			}
			if (e) return;
			const t =
				(() => {
					const event = _status.event;
					if (!s(event)) return !1;
					const player = event.player;
					if (!player) return !1;
					const e = player.getCards(event.position || "h").filter(card => card.classList.contains("selectable") && !card.classList.contains("selected")),
						selectedCount = ui.selected.cards?.length || 0,
						needed = r(event, "Card")[0] - selectedCount;
					return (
						needed > 0 &&
						e.length >= needed &&
						(e.slice(0, needed).forEach(card => {
							(card.classList.add("selected"), ui.selected.cards.add(card), card.updateTransform?.(!0));
						}),
						(a(event).cardDone = !0),
						!0)
					);
				})() || o();
			t && (game.check(), event.forced || event.fakeforce || "o" !== ui.confirm?.str || ui.create.confirm("oc"));
		}));
}
export { i as setupAutoSelect };
