import { lib, game, _status } from "noname";
const e = name => {
	game.playAudio("..", "extension", "十周年UI", `audio/${name}`);
};
function t() {
	if (lib.config["extension_十周年UI_bettersound"]) {
		if (((game._decadeUI_blockedEquipAudios = game._decadeUI_blockedEquipAudios || /* @__PURE__ */ new Set(["loseHp"])), !game._decadeUI_playAudioWrapped)) {
			const e = game.playAudio;
			((game.playAudio = function (...args) {
				if ("effect" !== args[0] || !game._decadeUI_blockedEquipAudios?.has(args[1])) return e.apply(this, args);
			}),
				(game._decadeUI_playAudioWrapped = !0));
		}
		if (!game._decadeUI_uiClickAudioHandler) {
			const t = [
					{ test: e => e.closest("#dui-controls") && (e.classList?.contains("control") || e.parentElement?.classList?.contains("control")), sound: "BtnSure" },
					{ test: e => e.closest(".menubutton, .button, .card"), sound: "card_click" },
				],
				o = o => {
					if (0 !== o.button) return;
					const audioToPlay = t.find(r => r.test(o.target))?.sound;
					if (!audioToPlay) return;
					const now = Date.now();
					now - (game._decadeUI_lastUIAudioAt || 0) < 60 || ((game._decadeUI_lastUIAudioAt = now), e(audioToPlay));
				};
			(document.body.addEventListener("pointerdown", o, { capture: !0, passive: !0 }), (game._decadeUI_uiClickAudioHandler = o));
		}
		((lib.skill._preparePhaseAudio = {
			charlotte: !0,
			forced: !0,
			popup: !1,
			trigger: { player: ["phaseZhunbeiBefore"] },
			filter: (_event, player) => player === game.me && _status.currentPhase === player,
			async content() {
				e("seatRoundState_start");
			},
		}),
			(lib.skill._hpLossAudio = {
				charlotte: !0,
				forced: !0,
				popup: !1,
				trigger: { player: "loseHpBefore" },
				filter: event => !!event.num,
				async content() {
					e("hpLossSund.mp3");
				},
			}));
	}
}
export { t as setupEnhancedAudio };
