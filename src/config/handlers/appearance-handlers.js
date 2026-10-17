import { lib, game, ui, _status } from "noname";
import { UI_ANIMATION as UI_ANIMATION } from "../../constants.js";
import { refreshDynamicOutcrop } from "../../ui/dynamicOutcrop.js";
function n() {
	window.decadeUI?.toggleExtensions?.();
}
function o() {
	const key = "extension_十周年UI_closedExtensions",
		closed = Array.isArray(lib.config[key]) ? lib.config[key] : [],
		menu = lib.extensionMenu?.extension_十周年UI?.extensionToggle;
	menu && (menu.name = closed.length > 0 ? `<ins>一键恢复 ${closed.length} 个扩展</ins>` : "<ins>一键关闭其他扩展</ins>");
}
function t(control) {
	const origin = lib.config.extension_十周年UI_newDecadeStyle;
	(game.saveConfig("extension_十周年UI_newDecadeStyle", control), origin !== control && setTimeout(() => game.reload(), UI_ANIMATION.RELOAD_DELAY));
}
function a() {
	if (!window.decadeUI) return;
	const style = lib.config.extension_十周年UI_newDecadeStyle;
	ui.arena.dataset.newDecadeStyle = style;
	ui.arena.dataset.decadeLayout = ["on", "othersOff", "onlineUI", "babysha", "codename"].includes(style) ? "on" : "off";
}
function i(item) {
	((lib.config.extension_十周年UI_rightLayout = item ?? "off"), game.saveConfig("extension_十周年UI_rightLayout", item), game.reload());
}
function s() {
	const layout = lib.config.extension_十周年UI_rightLayout;
	("on" !== layout && "off" !== layout) || (ui.arena.dataset.rightLayout = layout);
}
function c(item) {
	if ((game.saveConfig("extension_十周年UI_outcropSkin", item), window.decadeUI)) {
		((ui.arena.dataset.outcropSkin = item), ui.arena.classList.toggle("outcrop-skin-enabled", !!item && "off" !== item), ui.arena.classList.toggle("outcrop-skin-disabled", !item || "off" === item), decadeUI.clearOutcropCache?.());
		[...(game.players || []), ...(game.dead || [])].forEach(player => {
			if (!player?.node) return;
			const name1 = player.name1 || player.name;
			(player.node.avatar && name1 && player.node.avatar.setBackground(name1, "character"), player.node.avatar2 && player.name2 && player.node.avatar2.setBackground(player.name2, "character"));
		});
		decadeUI.updateAllOutcropAvatars?.(item);
	}
}
function d() {
	if (!window.decadeUI) return;
	const style = lib.config.extension_十周年UI_outcropSkin;
	((ui.arena.dataset.outcropSkin = style), ui.arena.classList.toggle("outcrop-skin-enabled", !!style && "off" !== style), ui.arena.classList.toggle("outcrop-skin-disabled", !style || "off" === style), decadeUI.updateAllOutcropAvatars?.(style));
}
function r() {
	if (!window.decadeUI) return;
	const value = lib.config.extension_十周年UI_borderLevel;
	const style = lib.config.extension_十周年UI_borderStyle || "xinsha";
	if (((ui.arena.dataset.borderLevel = value), (ui.arena.dataset.longLevel = value), (ui.arena.dataset.borderStyle = style), !_status.gameStarted)) return;
	const players = ui.arena?.querySelectorAll?.(".player") || [];
	if ("random" === value) {
		const e = ["one", "two", "three", "four", "five"];
		players.forEach(n => {
			const level = n === game.me ? "five" : e[Math.floor(Math.random() * e.length)];
			((n.dataset.borderLevel = level), (n.dataset.longLevel = level));
		});
	} else
		players.forEach(e => {
			(delete e.dataset.borderLevel, delete e.dataset.longLevel);
		});
}
function u() {
	const config = lib.config.extension_十周年UI_aloneEquip;
	if ((window.decadeUI && (ui.arena.dataset.aloneEquip = config ? "on" : "off"), (_status.nopopequip = config), _status.gameStarted && ui?.equipSolts)) {
		try {
			ui.equipSolts.style.display = config ? "" : "none";
		} catch (n) {}
		(config && game.me !== ui.equipSolts.me && (ui.equipSolts.me?.appendChild(ui.equipSolts.equips), (ui.equipSolts.me = game.me), (ui.equipSolts.equips = game.me.node.equips), ui.equipSolts.appendChild(game.me.node.equips), game.me.$syncExpand()), config || game.me !== ui.equipSolts.me || (ui.equipSolts.me.appendChild(ui.equipSolts.equips), (ui.equipSolts.me = void 0)), game.uncheck(), game.check());
	}
}
function f(bool) {
	(game.saveConfig("extension_十周年UI_meanPrettify", bool), ui.css.decadeMenu?.remove(), delete ui.css.decadeMenu, bool && (ui.css.decadeMenu = lib.init.css(`${window.decadeUIPath}src/styles`, "menu")));
}
function l(value) {
	(game.saveConfig("extension_十周年UI_dynamicSkin", value), (lib.config.dynamicSkin = value), game.saveConfig("dynamicSkin", value));
}
function p() {
	if (!window.decadeUI) return;
	const enable = lib.config.extension_十周年UI_dynamicSkinOutcrop;
	window.decadeUI.config.dynamicSkinOutcrop = !!enable;
	((ui.arena.dataset.dynamicSkinOutcrop = enable ? "on" : "off"),
		[...new Set([...(game.players || []), ...(game.dead || [])])].forEach(player => {
			player.dynamic && ((player.dynamic.outcropMask = enable), player.dynamic.update(), refreshDynamicOutcrop(player));
		}));
}
export { u as onAloneEquipUpdate, r as onBorderLevelUpdate, l as onDynamicSkinClick, p as onDynamicSkinOutcropUpdate, n as onExtensionToggleClick, o as onExtensionToggleUpdate, f as onMeanPrettifyClick, t as onNewDecadeStyleClick, a as onNewDecadeStyleUpdate, c as onOutcropSkinClick, d as onOutcropSkinUpdate, i as onRightLayoutClick, s as onRightLayoutUpdate };
