import { ui, game, get, _status, lib } from "noname";
import { throttle as t } from "../../animation/utils.js";
import "../../animation/DynamicPlayer.js";
import { getBaseUiUpdate as getBaseUiUpdate } from "./base.js";
function e() {
	const controls = ui.control.childNodes;
	let stayleft, offsetLeft;
	for (let i = 0; i < controls.length && (!stayleft && controls[i].stayleft ? (stayleft = controls[i]) : offsetLeft || (offsetLeft = controls[i].offsetLeft), !stayleft || !offsetLeft); i++);
	stayleft && (ui.$stayleft != stayleft && ((stayleft._width = stayleft.offsetWidth), (ui.$stayleft = stayleft)), offsetLeft < stayleft._width ? (stayleft.style.position = "static") : (stayleft.style.position = "absolute"));
}
function i() {
	decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
}
function s(player) {
	if (!player) return;
	const judges = player.node.judges.childNodes;
	for (let o = 0; o < judges.length; o++)
		if (!judges[o].classList.contains("removing") && (judges[o].classList.remove("drawinghidden"), _status.connectMode)) {
			const bgMark = lib.translate[judges[o].name + "_bg"] || get.translation(judges[o].name)[0];
			judges[o].node.judgeMark.node.judge.innerHTML = bgMark;
		}
}
function n(player) {}
function d() {
	((window.documentZoom = game.documentZoom), (document.body.style.zoom = game.documentZoom), (document.body.style.width = "100%"), (document.body.style.height = "100%"), (document.body.style.transform = ""));
}
function l() {
	for (const update of ui.updates) update();
	if (void 0 !== ui.dialog && !ui.dialog.classList.contains("noupdate")) {
		if (game.chess) return getBaseUiUpdate()?.();
		if ((ui.dialog.buttons && ui.dialog.buttons.length) || ui.dialog.forcebutton || !1 !== ui.dialog.classList.contains("fullheight") || "stone" === get.mode()) {
			ui.dialog.classList.remove("prompt");
			let t = ui.dialog.content.offsetHeight;
			((t = decadeUI.isMobile() ? 0.75 * decadeUI.get.bodySize().height - 80 : 0.45 * decadeUI.get.bodySize().height), (ui.dialog.style.height = Math.min(t, ui.dialog.content.offsetHeight) + "px"));
		} else ui.dialog.classList.add("prompt");
		ui.dialog.forcebutton || ui.dialog._scrollset ? (ui.dialog.classList.add("scroll1"), ui.dialog.classList.add("scroll2")) : (ui.dialog.classList.remove("scroll1"), ui.dialog.classList.remove("scroll2"));
	}
}
function a(player, nodes, start, inv) {
	"number" != typeof start && (start = 0);
	for (let i = 0; i < nodes.childElementCount; i++) {
		const e = nodes.childNodes[i];
		i < start ? (e.style.transform = "") : e.classList.contains("removing") ? start++ : e.classList.remove("drawinghidden");
	}
}
let c = null;
function r() {
	return (c || (c = t(ui.updatex, 100, ui)), c.apply(this, arguments));
}
export { l as uiUpdate, e as uiUpdatec, i as uiUpdatehl, s as uiUpdatej, a as uiUpdatejm, n as uiUpdatem, r as uiUpdatexr, d as uiUpdatez };
