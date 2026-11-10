import { game, lib, ui } from "noname";
const e = {
	mx_start: {
		trigger: { global: "gameDrawAfter" },
		direct: !0,
		priority: 1 / 0,
		firstDo: !0,
		async content(event, trigger, player) {
			game.removeGlobalSkill("mx_start");
			const e = "off" === lib.config.extension_十周年UI_newDecadeStyle,
				effectName = e ? "effect_youxikaishi_shousha" : "effect_youxikaishi",
				audioSetting = lib.config.extension_十周年UI_gameStartAudio,
				audio = "shousha" === audioSetting ? "audio/game_start_shousha.mp3" : "online" === audioSetting ? "audio/kaizhan.ogg" : "audio/game_start.mp3",
				scaleFactor = e ? 1.5 : 0.76;
			const playGameStartAudio = () => game.playAudio("../extension", decadeUI.extensionName, audio);
			if ("online" !== audioSetting) playGameStartAudio();
			const animation = decadeUI.animation,
				bounds = animation.getSpineBounds(effectName);
			if (!bounds) {
				if ("online" === audioSetting) playGameStartAudio();
				return;
			}
			const { size: size } = bounds,
				scale = Math.min(animation.canvas.width / size.x, animation.canvas.height / size.y) * scaleFactor;
			animation.playSpine({ name: effectName, scale: scale });
			if ("online" === audioSetting) setTimeout(playGameStartAudio, 133.333);
		},
	},
	mx_borderLevel: {
		trigger: { global: "gameStart" },
		silent: !0,
		forced: !0,
		filter: (event, player) => "off" === lib.config.extension_十周年UI_newDecadeStyle && "random" === lib.config.extension_十周年UI_borderLevel,
		async content(event, trigger, player) {
			game.removeGlobalSkill("mx_borderLevel");
			const levels = ["two", "three", "four", "five"];
			game.players.forEach(t => {
				t.dataset.longLevel = t === game.me ? "five" : levels[Math.floor(Math.random() * levels.length)];
			});
		},
	},
	decadeUI_usecardBegin: {
		trigger: { global: "useCardBegin" },
		forced: !0,
		popup: !1,
		priority: -100,
		silent: !0,
		filter: event => !ui.clear.delay && "wuxie" !== event.card.name,
		async content() {
			ui.clear.delay = "usecard";
		},
	},
	decadeUI_dieKillEffect: {
		trigger: { source: ["dieBegin"] },
		forced: !0,
		popup: !1,
		priority: -100,
		lastDo: !0,
		silent: !0,
		filter: () => lib.config.extension_十周年UI_killEffect,
		async content(event, trigger) {
			trigger.source &&
				trigger.player &&
				game.broadcastAll(
					(source, player) => {
						window.decadeUI && decadeUI.effect.kill(source, player);
					},
					trigger.source,
					trigger.player
				);
		},
	},
};
export { e as animateSkill };
