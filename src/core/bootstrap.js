import { get, game, lib, _status } from "noname";
import { INCOMPATIBLE_MODES as INCOMPATIBLE_MODES, RECOMMENDED_LAYOUT as RECOMMENDED_LAYOUT } from "./constants.js";
const e = () => {
	const mode = "function" == typeof get.mode ? get.mode() : get.mode;
	if (INCOMPATIBLE_MODES.has(mode)) return !1;
	game.hasExtension?.("皮肤切换") && (game.menuZoom = 1);
	const aloneEquip = lib.config.extension_十周年UI_aloneEquip;
	return ((_status.nopopequip = void 0 === aloneEquip || aloneEquip), lib.config.layout !== RECOMMENDED_LAYOUT && confirm("十周年UI提醒您，请使用<新版>布局以获得良好体验。\n点击确定自动切换，点击取消保持当前布局。") && (game.saveConfig("layout", RECOMMENDED_LAYOUT), (lib.config.layout = RECOMMENDED_LAYOUT), lib.arenaReady?.push(() => lib.init.layout(RECOMMENDED_LAYOUT, !0))), console.time(decadeUIName), !0);
};
export { e as bootstrapExtension };
