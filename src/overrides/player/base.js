import { lib, ui } from "noname";

const SHOW_CARD_AUDIO_PATH = "extension/十周年UI/audio/GameShowCard.mp3";
const SHOW_CARD_AUDIO_THROTTLE = 80;

let basePlayerMethods = null;
let dui = null;
let lastShowCardAudioAt = 0;
let showCardAudioAvailable = true;

function setBasePlayerMethods(methods) {
	basePlayerMethods = methods;
}

function getBasePlayerMethods() {
	return basePlayerMethods;
}

function playShowCardAudio() {
	if (!lib.config["extension_十周年UI_bettersound"] || !showCardAudioAvailable) return;

	const now = Date.now();
	if (now - lastShowCardAudioAt < SHOW_CARD_AUDIO_THROTTLE) return;
	lastShowCardAudioAt = now;

	const audio = document.createElement("audio");
	audio.volume = (lib.config.volumn_audio || 8) / 8;
	audio.preload = "auto";
	audio.src = `${typeof lib.assetURL === "string" ? lib.assetURL : ""}${SHOW_CARD_AUDIO_PATH}`;
	audio.onended = () => audio.remove();
	audio.onerror = () => {
		showCardAudioAvailable = false;
		audio.remove();
	};

	(ui.window || document.body).appendChild(audio);
	const played = audio.play();
	if (played?.catch) {
		played.catch(error => {
			if (/supported sources?/i.test(error?.message || "")) showCardAudioAvailable = false;
			audio.remove();
		});
	}
}

function getDui() {
	return dui || (dui = window.decadeUI), dui;
}

export { getBasePlayerMethods, getDui, playShowCardAudio, setBasePlayerMethods };
