import { ui, lib, get } from "noname";
import { createLinkElement as createLinkElement, createScriptElement as createScriptElement } from "./loader.js";
import { checkVersionCompatibility as e } from "../utils/version.js";
import { prefixMarkModule as prefixMarkModule } from "../ui/prefixMark.js";
const o = ["chess", "tafang", "hs_hearthstone"],
	n = ["on", "off", "othersOff", "onlineUI", "babysha", "codename"],
	i = { on: "shizhounian", off: "shousha", othersOff: "xinsha", onlineUI: "online", babysha: "baby", codename: "codename" };
function a(s, t) {
	const e = `extension_十周年UI_${s}`,
		c = lib.config[e];
	return void 0 !== c ? c : t;
}
function r() {
	if ((e(), !ui.css.layout)) return {};
	ui.css.layout.href?.includes("long2") || (ui.css.layout.href = `${lib.assetURL}layout/long2/layout.css`);
	const module = {
		js: s => s && createScriptElement(s, !1),
		jsAsync: s => s && createScriptElement(s, !0),
		css: path => path && createLinkElement(path),
		modules: [],
		import(mod) {
			"function" == typeof mod && this.modules.push(mod);
		},
		prefixMark: prefixMarkModule,
		init: async function () {
			["src/styles/extension.css", "src/styles/decadeLayout.css", "src/styles/card.css", "src/styles/meihua.css"].forEach(path => this.css(`${decadeUIPath}${path}`));
			const style = a("newDecadeStyle", "on"),
				styleIndex = n.indexOf(style);
			(this.css(`${decadeUIPath}src/styles/player${-1 !== styleIndex ? styleIndex + 1 : 2}.css`), this.css(`${decadeUIPath}src/styles/equip.css`), this.css(`${decadeUIPath}src/styles/layout.css`), document.body.setAttribute("data-style", style), a("meanPrettify", !1) && (ui.css.decadeMenu = this.css(`${decadeUIPath}src/styles/menu.css`)), await this.js(`${decadeUIPath}src/libs/spine.js`));
			const currentMode = get.mode(),
				isPhoneLayout = lib.config.phonelayout;
			if (!o.includes(currentMode)) {
				const t = i[style] || "shizhounian",
					e = `${decadeUIPath}ui/`;
				(this.css(`${e}styles/fonts.css`), this.css(`${e}styles/base.css`), this.css(`${e}styles/character/${t}.css`), this.css(`${e}styles/lbtn/${t}.css`), this.css(`${e}styles/skill/${t}.css`), isPhoneLayout || (this.css(`${e}styles/lbtn/window/${t}.css`), this.css(`${e}styles/skill/window/${t}.css`)));
			}
			return (this.prefixMark.setupShowCharacterHook(), this);
		},
	};
	return module.init();
}
export { o as EXCLUDED_MODES, r as initDecadeModule };
