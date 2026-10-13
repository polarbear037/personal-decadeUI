import { lib, get, _status, game, ui } from "noname";
import { wrapAround as wrapAround } from "../utils/safeOverride.js";
const t = player => (player?.node?.equips ? Array.from(player.node.equips.childNodes) : []),
	i = /* @__PURE__ */ new WeakMap();
function s(cardName) {
	const info = lib.card[cardName];
	return info?.skills ? game.expandSkills(info.skills.slice()) : [];
}
function n(event, player) {
	if (!event._skillChoice) return [];
	const e = (function (player) {
		const skills = /* @__PURE__ */ new Set();
		for (const card of player.getCards("e")) for (const t of s(card.name)) skills.add(t);
		return skills;
	})(player);
	return event._skillChoice.filter(t => {
		return ((i = t), !0 === lib.skill[i]?.equipSkill || e.has(t));
		var i;
	});
}
function o(card, usableSkills) {
	if (card.extraEquip && Array.isArray(card.extraEquip)) {
		const [t, i] = card.extraEquip;
		if (t) {
			const i = usableSkills.filter(skill => {
				const i = ((s = skill), lib.skill[s]?.sourceSkill);
				var s;
				return i && i === t;
			});
			if (i.length) return i;
		}
		return i ? s(i).filter(t => usableSkills.includes(t)) : [];
	}
	return "e" === get.position(card) ? s(card.name).filter(t => usableSkills.includes(t)) : [];
}
function l(skill) {
	(c(), ui.click.skill(skill));
}
function c() {
	if (game.me) for (const e of t(game.me)) (e.classList.contains("selected") || e.classList.remove("selectable"), e.classList.remove("equip-card-selectable"), delete e._equipSkills);
}
function r() {
	(wrapAround(ui.click, "card", function (e, ...t) {
		const card = this,
			s = lib.config["extension_十周年UI_aloneEquip"],
			n = card._equipSkills?.length,
			o = card.classList.contains("selectable"),
			c = "e" === get.position(card) || card.extraEquip;
		return s && n && o && c
			? ((_status.clicked = !0),
				(_status.touchnocheck = !1),
				(_status.mousedown = !1),
				void (1 === card._equipSkills.length
					? l(card._equipSkills[0])
					: (function (skills, player) {
							const existingDialog = i.get(player);
							existingDialog && (existingDialog.close(), i.delete(player));
							const dialog = ui.create.dialog("选择要发动的技能", "hidden");
							i.set(player, dialog);
							const eventType = lib.config.touchscreen ? "touchend" : "click";
							for (const o of skills) {
								const e = dialog.add(`<div class="popup text pointerdiv" style="width:calc(100% - 10px);display:inline-block">${get.skillTranslation(o, player, !0)}</div>`);
								((e.firstChild.link = o),
									e.firstChild.addEventListener(eventType, function (ev) {
										(ev.stopPropagation(), dialog.close(), i.delete(player), l(this.link));
									}));
							}
							((dialog.forcebutton = !0), dialog.classList.add("forcebutton"), dialog.open());
						})(card._equipSkills, game.me)))
			: e.apply(this, t);
	}),
		lib.hooks.checkEnd.add(event => {
			if (!lib.config["extension_十周年UI_aloneEquip"]) return;
			const player = event.player;
			if (player !== game.me || !event.isMine?.() || _status.auto) return;
			(c(),
				(function (event, player) {
					const pos = event?.position;
					if ("string" == typeof pos && pos.includes("e") && !(ui.selected.cards.length >= get.select(event.selectCard)[1])) for (const card of player.getCards("e")) event.filterCard?.(card, player, event) && (card.classList.contains("selected") || card.classList.add("selectable"), card.classList.add("equip-card-selectable"));
				})(event, player));
			const e = n(event, player);
			e.length &&
				(function (player, usableSkills) {
					for (const i of t(player)) {
						const t = o(i, usableSkills);
						t.length && (i.classList.add("selectable"), (i._equipSkills = t));
					}
				})(player, e);
		}),
		lib.hooks.uncheckBegin.add(() => {
			if (lib.config["extension_十周年UI_aloneEquip"]) {
				if (game.me) {
					const e = i.get(game.me);
					e && (e.close(), i.delete(game.me));
				}
				c();
			}
		}));
}
export { c as clearEquipSelectable, r as setupEquipAlone };
