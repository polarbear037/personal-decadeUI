import { lib, game, _status } from "noname";
const e = name => {
	// 本体默认禁止一秒内重复语音，按钮和手牌反馈需要允许连续点击。
	if (name === "button4.ogg" || name === "btn_activity_listItem1.ogg") _status.skillaudio?.remove?.(`audio/../extension/十周年UI/audio/${name}`);
	game.playAudio("..", "extension", "十周年UI", `audio/${name}`);
};
function installUIAudio() {
	if (game._decadeUI_uiClickAudioVersion === 3) return;
	const oldHandler = game._decadeUI_uiClickAudioHandler;
	if (oldHandler) {
		for (const eventName of ["pointerdown", "touchend", "click"]) {
			document.body?.removeEventListener(eventName, oldHandler, true);
			document.removeEventListener(eventName, oldHandler, true);
		}
	}
	let pressedTarget = null;
	let pressedAt = 0;
	let pressedByPointer = false;
	const onUIAudio = event => {
		if (typeof event.button === "number" && event.button !== 0) return;
		// 技能代理产生的模拟 click 不重复播放真实按下时已经播放的音效。
		if (event.type === "click" && !event.isTrusted) return;
		const target = event.target?.closest ? event.target : event.target?.parentElement;
		if (!target) return;
		const online = document.body?.dataset.style === "onlineUI" || lib.config.extension_十周年UI_newDecadeStyle === "onlineUI";
		const control = target.closest(online ? ".control" : "#dui-controls .control");
		const card = target.closest(".card");
		const handCard = card?.parentElement?.classList.contains("handcards");
		if (!online && !handCard && event.type !== "pointerdown") return;
		const button = target.closest(online
			? ".menubutton, .button, .skillitem, .xiandingji, .caidanbutton, .controls, .anniubutton, .jiluButton, .jiluanniu, .namebgbg, .typechange, .dazi, .gift, .giftgive, .caidanopen, .settingButton, .tuoguanButton"
			: ".menubutton, .button") || (online && target.matches(".popup-container") ? target : null);
		const audioTarget = control || card || button;
		const onlineButton = online && (control || (button && !card));
		if (!audioTarget || (!lib.config.extension_十周年UI_bettersound && !onlineButton && !handCard)) return;
		const now = Date.now();
		if (event.type !== "pointerdown" && (event.type !== "touchend" || pressedByPointer) && audioTarget === pressedTarget && now - pressedAt < 1500) {
			if (event.type === "click") pressedTarget = null;
			return;
		}
		if (event.type === "pointerdown" || event.type === "touchend") {
			pressedTarget = audioTarget;
			pressedAt = now;
			pressedByPointer = event.type === "pointerdown";
		}
		const audioToPlay = handCard ? "btn_activity_listItem1.ogg" : control ? (online ? "button4.ogg" : "BtnSure") : card ? "card_click" : online ? "button4.ogg" : "card_click";
		if (now - (game._decadeUI_lastUIAudioAt || 0) < 60) return;
		game._decadeUI_lastUIAudioAt = now;
		e(audioToPlay);
	};
	for (const eventName of ["pointerdown", "touchend", "click"]) document.addEventListener(eventName, onUIAudio, { capture: !0, passive: !0 });
	game._decadeUI_uiClickAudioHandler = onUIAudio;
	game._decadeUI_uiClickAudioVersion = 3;
}
function t() {
	installUIAudio();
	// 对局结束音效独立于“更多音效”，重复初始化也只注册一次。
	lib.onover ||= [];
	game._decadeUI_gameOverAudioHook ||= () => e("jieshu.ogg");
	if (!lib.onover.includes(game._decadeUI_gameOverAudioHook)) lib.onover.push(game._decadeUI_gameOverAudioHook);
	if (lib.config["extension_十周年UI_bettersound"]) {
		if (((game._decadeUI_blockedEquipAudios = game._decadeUI_blockedEquipAudios || /* @__PURE__ */ new Set(["loseHp"])), !game._decadeUI_playAudioWrapped)) {
			const e = game.playAudio;
			((game.playAudio = function (...args) {
				if ("effect" !== args[0] || !game._decadeUI_blockedEquipAudios?.has(args[1])) return e.apply(this, args);
			}),
				(game._decadeUI_playAudioWrapped = !0));
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
