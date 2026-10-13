import { createCollapseEnd as createCollapseEnd, createCollapseTitle as createCollapseTitle } from "../utils.js";
import { onDynamicSkinOutcropUpdate as onDynamicSkinOutcropUpdate, onDynamicSkinClick as onDynamicSkinClick, onMeanPrettifyClick as onMeanPrettifyClick, onAloneEquipUpdate as onAloneEquipUpdate, onBorderLevelUpdate as onBorderLevelUpdate, onOutcropSkinClick as onOutcropSkinClick, onOutcropSkinUpdate as onOutcropSkinUpdate, onNewDecadeStyleUpdate as onNewDecadeStyleUpdate, onNewDecadeStyleClick as onNewDecadeStyleClick, onExtensionToggleUpdate as onExtensionToggleUpdate, onExtensionToggleClick as onExtensionToggleClick } from "../handlers/appearance-handlers.js";
import { game, ui } from "noname";
const w = { clear: !0, onclick: onExtensionToggleClick, update: onExtensionToggleUpdate },
	p = {
		name: "打开新版菜单",
		intro: "在独立窗口中打开现代化的配置界面",
		clear: !0,
		onclick() {
			window.decadeUI?.showConfigWindow && window.decadeUI.showConfigWindow();
		},
	},
	s = { name: "调试助手", init: !1 },
	h = createCollapseTitle("outward_title", "整体外观"),
	k = { name: "切换样式", intro: "切换武将边框样式和界面布局，选择不同设置后游戏会自动重启，电脑端支持alt+123456快捷切换", init: "on", item: { on: "十周年", off: "移动版", othersOff: "一将成名", onlineUI: "online", babysha: "欢乐三国杀", codename: "名将杀" }, onclick: onNewDecadeStyleClick, update: onNewDecadeStyleUpdate },
	g = { name: "露头样式", init: "off", item: { shizhounian: "十周年露头", shousha: "手杀露头", off: "关闭" }, update: onOutcropSkinUpdate, onclick: onOutcropSkinClick },
	B = { name: "边框风格•仅一将", intro: "切换阵营边框的图片风格", init: "xinsha", item: { xinsha: "赤炎", dragon2: "玄墨", dragon3: "耀金", dragon4: "龙旗" }, onclick(item) { game.saveConfig("extension_十周年UI_borderStyle", item); if (window.decadeUI) { ui.arena.dataset.borderStyle = item; onBorderLevelUpdate(); } } },
	y = { name: "等阶边框", init: "five", item: { one: "一阶", two: "二阶", three: "三阶", four: "四阶", five: "五阶", random: "随机" }, update: onBorderLevelUpdate },
	_ = { name: "单独装备栏", intro: "切换玩家装备栏为单独装备栏或非单独装备栏", init: !0, update: onAloneEquipUpdate },
	S = { name: "菜单美化", intro: "开启全屏的菜单样式", init: !1, onclick: onMeanPrettifyClick },
	b = { name: "动态皮肤", intro: "开启后显示动态皮肤，阵亡后也保留", init: !1, onclick: onDynamicSkinClick },
	v = { name: "动皮露头", init: !1, update: onDynamicSkinOutcropUpdate },
	C = { name: "击杀特效", intro: "开启后，击杀敌方角色时会显示击杀特效", init: !0 },
	I = createCollapseEnd("outward_title"),
	U = { extensionToggle: w, newConfigWindow: p, eruda: s, outward_title: h, newDecadeStyle: k, outcropSkin: g, borderStyle: B, borderLevel: y, aloneEquip: _, meanPrettify: S, dynamicSkin: b, dynamicSkinOutcrop: v, killEffect: C, outward_title_end: I };
export { _ as aloneEquip, U as appearanceConfigs, y as borderLevel, B as borderStyle, b as dynamicSkin, v as dynamicSkinOutcrop, s as eruda, w as extensionToggle, C as killEffect, S as meanPrettify, p as newConfigWindow, k as newDecadeStyle, g as outcropSkin, h as outward_title, I as outward_title_end };
