import { lib, ui, game, _status } from "noname";
import "../utils.js";
function e() {
	(window.timer && (clearInterval(window.timer), delete window.timer), window.timer2 && (clearInterval(window.timer2), delete window.timer2), document.getElementById("jindutiaopl")?.remove(), window.resetProgressBarState?.());
}
function n() {
	const isInput = "INPUT" === this.tagName;
	isInput || (this.innerHTML = this.innerHTML.replace(/<br>/g, ""));
	let value = parseFloat(isInput ? this.value : this.innerHTML);
	(isNaN(value) && (value = 22), (value = Math.max(0, Math.min(100, value))), isInput ? (this.value = String(value)) : (this.innerHTML = String(value)), game.saveConfig("extension_十周年UI_jindutiaoSet", value));
	const progressBar = document.getElementById("jindutiaopl");
	progressBar && (progressBar.style.bottom = `${value}%`);
}
function t() {
	const height = lib.config.extension_十周年UI_jindutiaoSet ?? "22",
		progressBar = document.getElementById("jindutiaopl");
	progressBar && (progressBar.style.bottom = `${height}%`);
	const menu = lib.extensionMenu?.extension_十周年UI?.jindutiaoSet;
	if (menu) {
		"INPUT" === menu.tagName ? (menu.value = String(height)) : (menu.innerHTML = String(height));
	}
}
function i() {
	if (game.updateJDTsStyle) return game.updateJDTsStyle();
	"0" === lib.config.extension_十周年UI_JDTSYangshi && (game.as_removeImage?.(), delete _status.as_showImage_phase);
}
function a(item) {
	(lib.config.extension_十周年UI_GTBBYangshi, game.saveConfig("extension_十周年UI_GTBBYangshi", item), window._gtbbCheckId && (clearInterval(window._gtbbCheckId), delete window._gtbbCheckId), window._gtbbInterval && (clearInterval(window._gtbbInterval), delete window._gtbbInterval), document.getElementById("gtbb-container")?.remove(), "0" !== item && import("../../ui/gtbb.js").then(module => module.initGTBB()));
}
function o() {
	window.decadeUI &&
		((ui.arena.dataset.playerMarkStyle = lib.config.extension_十周年UI_playerMarkStyle),
		window.decadeUI.config && (window.decadeUI.config.playerMarkStyle = lib.config.extension_十周年UI_playerMarkStyle),
		game.players.concat(game.dead).forEach(player => {
			if (!player || !player.marks) return;
			const markData = [];
			for (const [n, t] of Object.entries(player.marks)) t && markData.push({ name: n, skill: t.skill || n, info: t.info, markidentifer: t.markidentifer });
			for (const n in player.marks) player.marks[n] && (player.marks[n].remove(), delete player.marks[n]);
			(markData.forEach(data => {
				const skillInfo = lib.skill[data.name];
				skillInfo?.intro ? player.markSkill(data.name) : player.mark(data.name, data.info, data.skill);
			}),
				player.updateMarks?.(),
				ui.updatem?.(player));
		}));
}
function r() {
	window.decadeUI && (ui.arena.dataset.loadingStyle = lib.config.extension_十周年UI_loadingStyle);
}
function s() {
	window.decadeUI && (ui.arena.dataset.gainSkillsVisible = lib.config.extension_十周年UI_gainSkillsVisible);
}
export { a as onGTBBYangshiClick, s as onGainSkillsVisibleUpdate, i as onJDTSYangshiUpdate, n as onJindutiaoSetBlur, t as onJindutiaoSetUpdate, e as onJindutiaoYangshiUpdate, r as onLoadingStyleUpdate, o as onPlayerMarkStyleUpdate };
