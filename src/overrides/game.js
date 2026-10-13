import { get, game, lib, ui } from "noname";
import { wrapAfter as wrapAfter } from "../utils/safeOverride.js";
function a() {
	const restoreFns = [];
	return (
		restoreFns.push(
			wrapAfter(game, "swapSeat", function (result, player1, player2) {
				(player1 && ((player1.seat = player1.getSeatNum()), player1.node.seat && (player1.node.seat.innerHTML = get.cnNumber(player1.seat, !0))), player2 && ((player2.seat = player2.getSeatNum()), player2.node.seat && (player2.node.seat.innerHTML = get.cnNumber(player2.seat, !0))));
			})
		),
		restoreFns.push(
			wrapAfter(game, "swapPlayer", function (result, player) {
				const list = [game.me, player].filter(Boolean);
				if (
					(lib.config.extension_十周年UI_aloneEquip && game.me && ui.equipSolts && game.me !== ui.equipSolts.me && (ui.equipSolts.me.appendChild(ui.equipSolts.equips), (ui.equipSolts.me = game.me), (ui.equipSolts.equips = game.me.node.equips), ui.equipSolts.appendChild(game.me.node.equips), "function" == typeof game.me.$syncExpand && game.me.$syncExpand()),
					list.forEach(e => {
						"function" == typeof e.decadeUI_updateShowCards && e.decadeUI_updateShowCards();
					}),
					lib.refreshPlayerSkills && list.forEach(e => lib.refreshPlayerSkills(e)),
					lib.clearAllSkillDisplay && lib.clearAllSkillDisplay(),
					lib.refreshPlayerSkills)
				) {
					game.players.concat(game.dead || []).forEach(e => lib.refreshPlayerSkills(e));
				}
			})
		),
		restoreFns.push(
			wrapAfter(game, "swapControl", function (result, player) {
				if ((lib.config.extension_十周年UI_aloneEquip && game.me && ui.equipSolts && game.me !== ui.equipSolts.me && (ui.equipSolts.me.appendChild(ui.equipSolts.equips), (ui.equipSolts.me = game.me), (ui.equipSolts.equips = game.me.node.equips), ui.equipSolts.appendChild(game.me.node.equips), "function" == typeof game.me.$syncExpand && game.me.$syncExpand()), ui.equipSolts && (game.me && "function" == typeof game.me.$handleEquipChange && game.me.$handleEquipChange(), player && "function" == typeof player.$handleEquipChange && player.$handleEquipChange()), player && "function" == typeof player.decadeUI_updateShowCards && player.decadeUI_updateShowCards(), lib.refreshPlayerSkills && (player && lib.refreshPlayerSkills(player), game.me && lib.refreshPlayerSkills(game.me)), lib.clearAllSkillDisplay && lib.clearAllSkillDisplay(), lib.refreshPlayerSkills)) {
					game.players.concat(game.dead || []).forEach(e => lib.refreshPlayerSkills(e));
				}
			})
		),
		restoreFns.push(
			wrapAfter(game, "addGlobalSkill", function () {
				[...game.players, ...(game.dead || [])].forEach(e => {
					"function" == typeof e.decadeUI_updateShowCards && e.decadeUI_updateShowCards();
				});
			})
		),
		restoreFns.push(
			wrapAfter(game, "removeGlobalSkill", function () {
				[...game.players, ...(game.dead || [])].forEach(e => {
					"function" == typeof e.decadeUI_updateShowCards && e.decadeUI_updateShowCards();
				});
			})
		),
		restoreFns
	);
}
function t(player, card, targets, event, forced, logvid) {
	const { _status: _status, ui: n } = window;
	if (!player && !(player = _status.event.getParent().logvid)) return;
	const node = n.create.div(".hidden");
	if (((node.node = {}), (logvid = logvid || get.id()), game.broadcast((player, card, targets, event, forced, logvid) => game.logv(player, card, targets, event, forced, logvid), player, card, targets, event, forced, logvid), "string" == typeof player)) {
		const e = Array.from(n.historybar.childNodes).find(value => value.logvid == player);
		return void (e && e.added.push(card));
	}
	if ("string" == typeof card) {
		if ("die" != card) {
			if (lib.skill[card] && !1 === lib.skill[card].logv && !forced) return;
			if (!lib.translate[card]) return;
		}
		let t;
		if (player.isUnseen(0)) {
			if (player.isUnseen(1)) return;
			t = player.node.avatar2.cloneNode();
		} else t = player.node.avatar.cloneNode();
		if (((node.node.avatar = t), (t.style.transform = ""), (t.className = "avatar"), "die" == card)) {
			((node.dead = !0), (node.player = player));
			const e = t.cloneNode();
			((e.className = "avatarbg grayscale1"), t.appendChild(e), (t.style.opacity = 0.6));
		} else ((node.node.text = n.create.div("", get.translation(card, "skill"), t)), (node.node.text.dataset.nature = "water"), (node.skill = card));
		if ((node.appendChild(t), "die" == card && targets && targets != player)) {
			if (((node.source = targets), (player = targets).isUnseen(0)))
				if (player.isUnseen(1)) {
					if ("guozhan" != get.mode() || !player.node || !player.node.name_seat) return;
					((t = n.create.div(".avatar.cardbg")), (t.innerHTML = player.node.name_seat.innerHTML[0]));
				} else t = player.node.avatar2.cloneNode();
			else t = player.node.avatar.cloneNode();
			((t.style.transform = ""), (node.node.avatar2 = t), t.classList.add("avatar2"), node.appendChild(t));
		}
	} else if (Array.isArray(card)) {
		node.cards = card[1].slice(0);
		const a = [(card = card[0]).suit || "", card.number || "", card.name || "", card.nature || ""];
		if (((Array.isArray(node.cards) && node.cards.length) || (node.cards = [n.create.card(node, "noclick", !0).init(a)]), "wuxie" == card.name)) {
			if (n.historybar.firstChild && "wuxie" == n.historybar.firstChild.type) return (n.historybar.firstChild.players.push(player), void n.historybar.firstChild.cards.addArray(node.cards));
			((node.type = "wuxie"), (node.players = [player]));
		}
		let t;
		if ((card.copy ? card.copy(node, !1) : (card = n.create.card(node, "noclick", !0)).init(a), player.isUnseen(0)))
			if (player.isUnseen(1)) {
				if ("guozhan" != get.mode() || !player.node || !player.node.name_seat) return;
				((t = n.create.div(".avatar.cardbg")), (t.innerHTML = player.node.name_seat.innerHTML[0]));
			} else t = player.node.avatar2.cloneNode();
		else t = player.node.avatar.cloneNode();
		((node.node.avatar = t),
			(t.style.transform = ""),
			t.classList.add("avatar2"),
			node.appendChild(t),
			targets &&
				1 == targets.length &&
				targets[0] != player &&
				"player" == get.itemtype(targets[0]) &&
				(() => {
					let avatar2;
					const target = targets[0];
					if (target.isUnseen(0))
						if (player.isUnseen(1)) {
							if ("guozhan" != get.mode() || !target.node || !target.node.name_seat) return;
							((avatar2 = n.create.div(".avatar.cardbg")), (avatar2.innerHTML = target.node.name_seat.innerHTML[0]));
						} else avatar2 = target.node.avatar2.cloneNode();
					else avatar2 = target.node.avatar.cloneNode();
					((node.node.avatar2 = avatar2), (avatar2.style.transform = ""), avatar2.classList.add("avatar2"), avatar2.classList.add("avatar3"), node.insertBefore(avatar2, t));
				})());
	}
	targets && targets.length && (1 == targets.length && targets[0] == player ? (node.targets = []) : (node.targets = targets));
	const bounds = window.decadeUI.boundsCaches.window;
	bounds.check();
	const fullheight = bounds.height,
		num = Math.round((fullheight - 8) / 50),
		margin = (fullheight - 42 * num) / (num + 1);
	return (
		(node.style.transform = "scale(0.8)"),
		n.historybar.insertBefore(node, n.historybar.firstChild),
		n.refresh(node),
		node.classList.remove("hidden"),
		Array.from(n.historybar.childNodes).forEach((value, index) => {
			index < num
				? (value.style.transform = `scale(1) translateY(${margin + index * (42 + margin) - 4}px)`)
				: value.removetimeout ||
					((value.style.opacity = 0),
					(value.style.transform = `scale(1) translateY(${fullheight}px)`),
					(value.removetimeout = setTimeout(
						/* @__PURE__ */ (
							current => () =>
								current.remove()
						)(value),
						500
					)));
		}),
		lib.config.touchscreen ? node.addEventListener("touchstart", n.click.intro) : (node.addEventListener(lib.config.pop_logv ? "mousemove" : "click", n.click.logv), node.addEventListener("mouseleave", n.click.logvleave)),
		(node.logvid = logvid),
		(node.added = []),
		game.online || ((event = event || _status.event).logvid = node.logvid),
		node
	);
}
export { a as applyGameOverrides, t as gameLogv };
