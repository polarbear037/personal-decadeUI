import { lib, game } from "noname";
const e = ["on", "off", "othersOff", "onlineUI", "babysha", "codename"];
function n(event) {
	if (!event.altKey) return;
	const keyNum = parseInt(event.key);
	if (isNaN(keyNum) || keyNum < 1 || keyNum > 6) return;
	event.preventDefault();
	const newStyle = e[keyNum - 1];
	lib.config.extension_十周年UI_newDecadeStyle !== newStyle && (game.saveConfig("extension_十周年UI_newDecadeStyle", newStyle), setTimeout(() => game.reload(), 100));
}
function t() {
	document.addEventListener("keydown", n);
}
export { t as setupStyleHotkeys };
