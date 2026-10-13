import { get, lib } from "noname";
function e(player, isUnseen = !1) {
	return isUnseen ? player.node.avatar2 : player.node.avatar;
}
function n(className, parent = null, styles = {}) {
	const el = decadeUI.dialog.create(className, parent);
	return (Object.assign(el.style, styles), el);
}
function t(obj) {
	return "player" === get.itemtype(obj);
}
function a(player) {
	const gender = "female" === player.sex ? "female" : "male";
	return `${lib.assetURL}image/character/default_silhouette_${gender}.jpg`;
}
function o(height) {
	const signX = decadeUI.getRandom(0, 1) ? "" : "-",
		signY = decadeUI.getRandom(0, 1) ? "" : "-";
	return { x: `${signX}${decadeUI.getRandom(0, 100)}px`, y: `${signY}${decadeUI.getRandom(0, height / 4)}px`, scale: decadeUI.getRandom(1, 10) / 10 };
}
function r(player, useName2 = !1) {
	const name = useName2 ? player.name2 : player.name;
	return name ? get.slimNameHorizontal(name) : "";
}
function c(str) {
	return str.replace(/[A-Z]/g, e => `-${e.toLowerCase()}`);
}
export { n as create, e as getAvatar, a as getDefaultAvatar, r as getName, t as isPlayer, o as randomPosition, c as toKebab };
