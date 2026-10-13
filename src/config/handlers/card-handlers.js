import { game, lib, ui, get } from "noname";
import { refreshCardSkin as n } from "../../overrides/card/skin-applier.js";
import "../utils.js";
import { chupaiAnimations as chupaiAnimations } from "../../animation/configs/skillAnimations.js";
function a(bool) {
	(game.saveConfig("extension_十周年UI_cardGhostEffect", bool), window.decadeUI?.effect?.ghost?.setEnabled?.(bool));
}
function i(bool) {
	(game.saveConfig("extension_十周年UI_autoSelect", bool), game.saveConfig("auto_confirm", !bool), (lib.config.auto_confirm = !bool));
}
function t() {
	!1 !== lib.config.extension_十周年UI_autoSelect && (game.saveConfig("auto_confirm", !1), (lib.config.auto_confirm = !1));
}
function o() {
	const isInput = "INPUT" === this.tagName;
	isInput || (this.innerHTML = this.innerHTML.replace(/<br>/g, ""));
	let value = parseFloat(isInput ? this.value : this.innerHTML);
	(isNaN(value) && (value = 20), (value = Math.max(0, Math.min(100, value))), isInput ? (this.value = String(value)) : (this.innerHTML = String(value)), game.saveConfig("extension_十周年UI_handTipHeight", value), window.decadeUI && document.documentElement.style.setProperty("--hand-tip-bottom", `calc(${value}% + 10px)`));
}
function s() {
	if (window.decadeUI) {
		const height = lib.config.extension_十周年UI_handTipHeight ?? "20";
		document.documentElement.style.setProperty("--hand-tip-bottom", `calc(${height}% + 10px)`);
	}
	const menu = lib.extensionMenu?.extension_十周年UI?.handTipHeight;
	if (menu) {
		"INPUT" === menu.tagName ? (menu.value = String(lib.config.extension_十周年UI_handTipHeight ?? "20")) : (menu.innerHTML = String(lib.config.extension_十周年UI_handTipHeight ?? "20"));
	}
}
function c() {
	const isInput = "INPUT" === this.tagName;
	isInput || (this.innerHTML = this.innerHTML.replace(/<br>/g, ""));
	let value = parseFloat(isInput ? this.value : this.innerHTML);
	(isNaN(value) && (value = 0.18), (value = Math.max(0.1, Math.min(1, value))));
	const formattedValue = value.toFixed(2);
	(isInput ? (this.value = formattedValue) : (this.innerHTML = formattedValue), game.saveConfig("extension_十周年UI_cardScale", value), window.decadeUI && ((decadeUI.zooms.card = decadeUI.getCardBestScale()), decadeUI.layout.resize()));
}
function d() {
	const value = lib.config.extension_十周年UI_cardScale ?? "0.18",
		menu = lib.extensionMenu?.extension_十周年UI?.cardScale;
	if (menu) {
		"INPUT" === menu.tagName ? (menu.value = String(value)) : (menu.innerHTML = String(value));
	}
}
function r() {
	const isInput = "INPUT" === this.tagName;
	isInput || (this.innerHTML = this.innerHTML.replace(/<br>/g, ""));
	let value = parseFloat(isInput ? this.value : this.innerHTML);
	(isNaN(value) && (value = 0.18), (value = Math.max(0.1, Math.min(1, value))));
	const formattedValue = value.toFixed(2);
	(isInput ? (this.value = formattedValue) : (this.innerHTML = formattedValue), game.saveConfig("extension_十周年UI_discardScale", value), window.decadeUI && decadeUI.layout.updateDiscard());
}
function h() {
	const value = lib.config.extension_十周年UI_discardScale ?? "0.14",
		menu = lib.extensionMenu?.extension_十周年UI?.discardScale;
	if (menu) {
		"INPUT" === menu.tagName ? (menu.value = String(value)) : (menu.innerHTML = String(value));
	}
}
function l() {
	const isInput = "INPUT" === this.tagName;
	isInput || (this.innerHTML = this.innerHTML.replace(/<br>/g, ""));
	let value = parseFloat(isInput ? this.value : this.innerHTML);
	(isNaN(value) && (value = 9), (value = Math.max(1, Math.min(999, value))), isInput ? (this.value = String(value)) : (this.innerHTML = String(value)), game.saveConfig("extension_十周年UI_handFoldMin", String(value)), window.decadeUI && decadeUI.layout.updateHand());
}
function f() {
	const value = lib.config.extension_十周年UI_handFoldMin ?? "9",
		menu = lib.extensionMenu?.extension_十周年UI?.handFoldMin;
	if (menu) {
		"INPUT" === menu.tagName ? (menu.value = String(value)) : (menu.innerHTML = String(value));
	}
}
function u(e) {
	(game.saveConfig("extension_十周年UI_cardPrettify", e),
		[ui.cardPile, ui.discardPile].forEach(pile => {
			pile?.childNodes?.forEach(n);
		}),
		game.players?.forEach(e => {
			["handcards1", "handcards2", "equips", "judges"].forEach(key => {
				e.node?.[key]?.childNodes?.forEach(n);
			});
		}),
		(function (n) {
			game.players?.forEach(e => {
				const a = "bozai" === e.name || "bozai" === e.name1,
					i = "bozai" === e.name2;
				if (a || i)
					if ("bingkele" === n) {
						const n = `https://q1.qlogo.cn/g?b=qq&nk=739201322&s=640&t=${Date.now()}`;
						(a && (e.node.avatar.setBackgroundImage(n), e.node.name && (e.node.name.innerHTML = "冰可乐喵")), i && e.node.avatar2 && (e.node.avatar2.setBackgroundImage(n), e.node.name2 && (e.node.name2.innerHTML = "冰可乐喵")));
					} else (a && (e.node.avatar.setBackground(e.name1 || e.name, "character"), e.node.name && (e.node.name.innerHTML = get.slimName(e.name1 || e.name))), i && e.node.avatar2 && (e.node.avatar2.setBackground(e.name2, "character"), e.node.name2 && (e.node.name2.innerHTML = get.slimName(e.name2))));
			});
		})(e));
}
function g(item) {
	game.saveConfig("extension_十周年UI_cardkmh", item);
	(game.saveConfig("extension_十周年UI_cardbj", { kuang1: "kb4", kuang2: "kb3", kuang3: "kb2" }[item] || null), window.decadeUI?.updateCardStyles?.());
}
function m() {
	if (!game?.saveConfig) return;
	const border = lib.config.extension_十周年UI_cardkmh || "off";
	game.saveConfig("extension_十周年UI_cardbj", { kuang1: "kb4", kuang2: "kb3", kuang3: "kb2" }[border] || null);
}
function I() {
	if (!window.decadeUI) return;
	const config = lib.config.extension_十周年UI_chupaizhishi;
	((decadeUI.config.chupaizhishi = "random" === config ? ["shousha", "shoushaX", "jiangjun", "weijiangjun", "cheqijiangjun", "biaoqijiangjun", "dajiangjun", "dasima"].randomGet() : config),
		(ui.arena.dataset.chupaizhishi = config),
		game.players &&
			decadeUI.animation &&
			game.players.forEach(player => {
				if ((player.ChupaizhishiXid && (decadeUI.animation.stopSpine(player.ChupaizhishiXid), delete player.ChupaizhishiXid), player.classList.contains("selectable") && "off" !== config)) {
					const cfg = chupaiAnimations[decadeUI.config.chupaizhishi];
					if (!cfg) return;
					let playData = {
						name: cfg.name,
						loop: true,
					};
					// 读取自定义动画片段
					if (cfg.anim) {
						playData.anim = cfg.anim;
					}
					player.ChupaizhishiXid = decadeUI.animation.playSpine(playData, {
						parent: player,
						scale: cfg.scale,
					});
				}
			}));
}

function U(bool) {
	if ((game.saveConfig("extension_十周年UI_cardAlternateName", bool), window.decadeUI?.cardAlternateName))
		if (bool) window.decadeUI.cardAlternateName.updateVisibility?.();
		else {
			["handcards1", "handcards2"]
				.map(name => game.me?.node?.[name])
				.filter(Boolean)
				.forEach(zone => {
					zone.dataset.cardAlternateNameVisible = "off";
				});
		}
}
export { i as onAutoSelectClick, t as onAutoSelectUpdate, U as onCardAlternateNameClick, a as onCardGhostEffectClick, u as onCardPrettifyClick, c as onCardScaleBlur, d as onCardScaleUpdate, g as onCardkmhClick, m as onCardkmhUpdate, I as onChupaizhishiUpdate, r as onDiscardScaleBlur, h as onDiscardScaleUpdate, l as onHandFoldMinBlur, f as onHandFoldMinUpdate, o as onHandTipHeightBlur, s as onHandTipHeightUpdate };
