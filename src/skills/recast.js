import { lib, game, ui, _status, get } from "noname";
function e(card, player) {
	if (!card || !player) return !1;
	if (!1 === lib.config.extension_十周年UI_enableRecastInteraction) return !1;
	if (!lib.filter.cardRecastable(card, player, null, !0)) return !1;
	const event = _status.event;
	if (event?._backup) {
		const e = event._backup.skill || event.skill;
		if (e) {
			const n = lib.skill[e];
			if (n?.viewAs || n?.viewAsFilter) return !1;
		}
	}
	return !0;
}
function n(card, player) {
	if (!player) return !1;
	const viewAs = get.autoViewAs?.(card) || card;
	const info = get.info(viewAs);
	if (info?.enable) {
		if (!1 === ("function" == typeof info.enable ? info.enable(viewAs, player) : info.enable)) return !0;
	}
	const ourSkill = lib.skill._decadeUI_recastable_enable,
		originalMod = ourSkill?.mod?.cardEnabled;
	ourSkill?.mod && delete ourSkill.mod.cardEnabled;
	let disabled = !1;
	try {
		if ("card" === get.itemtype(card) && !1 === game.checkMod(card, player, _status.event, "unchanged", "cardEnabled2", player)) {
			disabled = !0;
		}
		if (!disabled && !1 === game.checkMod(viewAs, player, _status.event, "unchanged", "cardEnabled", player)) disabled = !0;
	} finally {
		ourSkill?.mod && originalMod && (ourSkill.mod.cardEnabled = originalMod);
	}
	return disabled;
}
function t(card) {
	const info = get.info(card);
	if (!info) return 1;
	if ("equip" === info.type) return 1;
	const select = info.selectTarget;
	if (-1 === select) return 1;
	if (Array.isArray(select)) return Math.max(select[0], 0);
	if ("number" == typeof select) return Math.max(select, 0);
	if ("function" == typeof select)
		try {
			const result = select(card, _status.event?.player);
			if (-1 === result) return 1;
			if (Array.isArray(result)) return Math.max(result[0], 0);
			if ("number" == typeof result) return Math.max(result, 0);
		} catch (t) {}
	return 1;
}
const r = {
		_decadeUI_recastable_recast: {
			trigger: { player: ["useCardBefore", "respondBefore"] },
			forced: !0,
			popup: !1,
			silent: !0,
			priority: 1 / 0,
			filter(event, player) {
				if ("off" === lib.config.extension_十周年UI_newDecadeStyle) return !1;
				if (!1 === lib.config.extension_十周年UI_enableRecastInteraction) return !1;
				if ("useCard" === event.name && event.targets?.length > 0) return !1;
				if ("respond" === event.name && !event._decadeUI_shouldRecast) return !1;
				if (event.skill) {
					const e = lib.skill[event.skill];
					if (e?.viewAs || e?.viewAsFilter) return !1;
				}
				const cards = event.cards;
				return !!cards?.length && cards.every(card => lib.filter.cardRecastable(card, player, null, !0));
			},
			async content(_event, trigger, player) {
				(trigger.cancel(), trigger.untrigger(), await player.recast(trigger.cards));
			},
		},
	},
	a = {
		_decadeUI_recastable_enable: {
			mod: {
				cardEnabled(card, player) {
					if (player?.isPhaseUsing?.()) {
						if (!e(card, player)) return;
						if (n(card, player)) return !0;
					}
				},
				cardRespondable(card, player) {
					const event = _status.event;
					if ("chooseToRespond" === event?.name && e(card, player)) return !!n(card, player) || void 0;
				},
				selectTarget(_card, player, range) {
					if (!player?.isPhaseUsing?.()) return;
					const selectedCard = ui.selected.cards?.[0];
					if (!selectedCard || !e(selectedCard, player)) return;
					const newRange = [...range];
					return ((newRange[0] = 0), -1 === newRange[1] && (newRange[1] = game.countPlayer()), newRange);
				},
				playerEnabled(_card, player) {
					const selectedCard = ui.selected.cards?.[0];
					if (selectedCard && e(selectedCard, player)) return !n(selectedCard, player) && void 0;
				},
			},
		},
	};
function c() {
	(lib.hooks?.checkEnd &&
		lib.hooks.checkEnd.add("_decadeUI_recastable_check", event => {
			if (!ui.confirm) return;
			const eventName = event?.name;
			if ("chooseToUse" !== eventName && "chooseToRespond" !== eventName) return;
			const okBtn = ui.confirm.firstChild;
			if (!okBtn || "ok" !== okBtn.link) return;
			const selectedCard = ui.selected.cards?.[0],
				player = event?.player;
			if (selectedCard && player && e(selectedCard, player)) {
				if ("chooseToRespond" === eventName) {
					const e = event.filterCard?.(selectedCard, player);
					return void (e ? ((okBtn.innerHTML = "确定"), okBtn.classList.remove("disabled"), delete event._decadeUI_shouldRecast) : ((okBtn.innerHTML = "重铸"), okBtn.classList.remove("disabled"), (event._decadeUI_shouldRecast = !0)));
				}
				if (0 === ui.selected.targets.length) ((okBtn.innerHTML = "重铸"), okBtn.classList.remove("disabled"));
				else {
					const card = get.card(),
						e = card ? t(card) : 1;
					((okBtn.innerHTML = "确定"), ui.selected.targets.length >= e ? okBtn.classList.remove("disabled") : okBtn.classList.add("disabled"));
				}
			}
		}),
		lib.hooks?.uncheckEnd &&
			lib.hooks.uncheckEnd.add("_decadeUI_recastable_confirm_reset", () => {
				if (!ui.confirm) return;
				const okBtn = ui.confirm.firstChild,
					text = okBtn?.innerHTML;
				"重铸" === text && (okBtn.innerHTML = "确定");
				const event = _status.event;
				event?._decadeUI_shouldRecast && delete event._decadeUI_shouldRecast;
			}));
}
function s() {
	!1 !== lib.config.extension_十周年UI_enableRecastInteraction &&
		"off" !== lib.config.extension_十周年UI_newDecadeStyle &&
		(Object.assign(lib.skill, r, a),
		game.addGlobalSkill("_decadeUI_recastable_recast"),
		game.addGlobalSkill("_decadeUI_recastable_enable"),
		lib.skill._recasting && (function () {
			const oldFilter = lib.skill._recasting.filter;
			lib.skill._recasting.filter = (event, player) => player === game.me ? false : oldFilter ? oldFilter(event, player) : true;
		})(),
		c(),
		(function () {
			for (const e in lib.card) {
				const n = lib.card[e];
				if (!n?.changeTarget) continue;
				if (!n.recastable && !n.chongzhu) continue;
				const t = n.changeTarget;
				n.changeTarget = function (player, targets) {
					if (targets?.[0]) return t.call(this, player, targets);
				};
			}
		})());
}
export { e as canRecastCard, t as getCardMinTarget, s as initRecast, n as isCardDisabledByOthers, r as recastAnimateSkill, a as recastBaseSkill, c as setupRecastableCards };
