import { ui, _status, game, get, lib } from "noname";
const e = {
	ghujia: { mark: !1 },
	_hpLossAnimation: {
		trigger: { player: "loseHpBefore" },
		forced: !0,
		popup: !1,
		charlotte: !0,
		filter: event => !!event.num,
		async content(event, trigger, player) {
			window.dcdAnim?.playLoseHp && window.dcdAnim.playLoseHp(player);
		},
	},
	_wjmh_huifushuzi_: {
		priority: 10,
		forced: !0,
		trigger: { player: "recoverBegin" },
		filter: event => event.num > 0 && event.num <= 9 && "off" !== lib.config.extension_十周年UI_newDecadeStyle,
		async content(event, trigger, player) {
			decadeUI.animation?.playRecoverNumber?.(player, trigger.num);
		},
	},
	_wjmh_xunishuzi_: {
		priority: 10,
		forced: !0,
		trigger: { player: "damage" },
		filter: event => event.num >= 0 && event.num <= 9 && event.unreal,
		async content(event, trigger, player) {
			decadeUI.animation?.playVirtualDamageNumber?.(player, trigger.num);
		},
	},
	_wjmh_shanghaishuzi_: {
		priority: 10,
		forced: !0,
		trigger: { player: "damage" },
		filter: event => event.num > 1 && event.num <= 9 && !event.unreal && lib.config.extension_十周年UI_newDecadeStyle,
		async content(event, trigger, player) {
			decadeUI.animation?.playDamageNumber?.(player, trigger.num);
		},
	},
	_usecard: {
		trigger: { global: "useCardAfter" },
		forced: !0,
		popup: !1,
		silent: !0,
		priority: -100,
		filter: event => "usecard" === ui.clear.delay && "wuxie" !== event.card.name,
		async content() {
			((ui.clear.delay = !1), game.broadcastAll(() => ui.clear()));
		},
	},
	_discard: {
		trigger: { global: ["discardAfter", "loseToDiscardpileAfter", "loseAsyncAfter"] },
		filter: event => !!ui.todiscard[event.discardid],
		forced: !0,
		silent: !0,
		popup: !1,
		priority: -100,
		async content(event, trigger) {
			game.broadcastAll(id => {
				if (window.decadeUI) return ((ui.todiscard = []), void ui.clear());
				const todiscard = ui.todiscard[id];
				if ((delete ui.todiscard[id], !todiscard)) return;
				let time = 1e3;
				("number" == typeof todiscard._discardtime && (time += todiscard._discardtime - get.time()), setTimeout(() => todiscard.forEach(card => card.delete()), Math.max(0, time)));
			}, trigger.discardid);
		},
	},
	olddanshou: {
		audio: "danshou",
		trigger: { source: "damageSource" },
		check: (event, player) => get.attitude(player, event.player) <= 0,
		async content(event, trigger, player) {
			for (await player.draw(); ui.ordering.childNodes.length; ) ui.ordering.firstChild.discard();
			const evt = _status.event.getParent("phase", !0);
			evt && (window.decadeUI?.eventDialog && ((decadeUI.eventDialog.finished = !0), (decadeUI.eventDialog.finishing = !1), (decadeUI.eventDialog = void 0)), game.resetSkills(), (_status.event = evt), _status.event.finish(), _status.event.untrigger(!0));
		},
		ai: { jueqing: !0 },
	},
};
export { e as baseSkill };
