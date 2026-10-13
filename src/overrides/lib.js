import { lib, ui } from "noname";
import { wrapAround as wrapAround } from "../utils/safeOverride.js";
function t() {
	const restoreFns = [];
	return (
		lib.init &&
			"function" == typeof lib.init.cssstyles &&
			restoreFns.push(
				wrapAround(lib.init, "cssstyles", function (original) {
					const temp = lib.config.glow_phase;
					if (((lib.config.glow_phase = ""), original.call(this), (lib.config.glow_phase = temp), ui.css?.styles?.sheet)) {
						const s = `.avatar-name, .avatar-name-default { font-family: "${lib.config.name_font || "xinkai"}", "xinwei" }`;
						ui.css.styles.sheet.insertRule(s, 0);
					}
				})
			),
		restoreFns
	);
}
export { t as applyLibOverrides };
