import { lib } from "noname";
function n(parent, endId) {
	const items = [];
	let next = parent.nextSibling;
	for (; next; ) {
		const n = next.querySelector?.("[id]");
		if (n?.id === endId) break;
		(items.push(next), (next = next.nextSibling));
	}
	return items;
}
function e(configKey, title, o = "gold") {
	const endId = configKey + "_end";
	!lib.config[configKey] ? ((lib.config[configKey] = n(this, endId)), (this.innerHTML = `<span style='color:${o}'><font size='4'>${title}（点击展开）▷</font></span>`), lib.config[configKey].forEach(el => (el.style.display = "none"))) : ((this.innerHTML = `<span style='color:${o}'><font size='4'>${title}（点击折叠）▽</font></span>`), lib.config[configKey].forEach(el => (el.style.display = "")), delete lib.config[configKey]);
}
function i(key, title, color = "orange") {
	return {
		clear: !0,
		name: `<span style='color:${color}'><font size='4'>${title}（点击折叠）▽</font></span>`,
		onclick() {
			e.call(this, key, title, color);
		},
	};
}
function o(n) {
	return { clear: !0, name: `<span id='${n}_end'></span>` };
}
const t = [
		{ key: "online", dir: "online", label: "OL卡牌", extension: "jpg" },
		{ key: "caise", dir: "caise", label: "彩色卡牌", extension: "webp" },
		{ key: "decade", dir: "decade", label: "原十周年", extension: "png" },
		{ key: "bingkele", dir: "bingkele", label: "哈基米哦", extension: "png" },
		{ key: "gold", dir: "gold", label: "手杀金卡", extension: "webp" },
	],
	l = [],
	s = t.reduce((map, skin) => ((map[skin.key] = skin), map), {});
function c(skin) {
	s[skin.key] || (l.push(skin), (s[skin.key] = skin));
}
function r() {
	return [...t, ...l];
}
export { s as cardSkinMeta, t as cardSkinPresets, e as collapseMenu, o as createCollapseEnd, i as createCollapseTitle, r as getAllCardSkinPresets, n as getMenuItems, c as registerDynamicSkin };
