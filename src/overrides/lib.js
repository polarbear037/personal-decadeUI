import { lib, ui, game, _status } from "noname";
import { wrapAround as wrapAround } from "../utils/safeOverride.js";
import { applyFactionCharacterInit as applyFactionCharacterInit, applyFactionControlChoice as applyFactionControlChoice } from "./faction-character-init.js";
import { positionOfficialTooltip } from "../ui/officialTooltip.js";
import { positionXinshaTooltip } from "../ui/xinsha-tooltip.js";
function t() {
	const restoreFns = [];
	restoreFns.push(wrapAround(lib.filter, "wuxieSwap", function (original, event) {
		const ignore = ui.tempnowuxie;
		if (event.type === "wuxie" && event.state > 0 && ignore?.classList.contains("glow") && !ui.wuxie?.classList.contains("glow")) {
			const trigger = event.getTrigger();
			const map = event.info_map?._source || event.info_map;
			const target = map?.target || trigger?.target;
			const targets = map?.targets || trigger?.targets;
			const origin = trigger ? trigger.parent?.id : _status.event.id2;
			// “本次不无懈”只跳过其他目标；群体锦囊轮到本人时仍询问。
			if (ignore._origin === origin && target === game.me && targets?.length > 1 && !map?.isJudge && !trigger?.multitarget && !map?.multitargets) return false;
		}
		return original.call(this, event);
	}));
	restoreFns.push(wrapAround(lib, "placePoppedDialog", function (original, dialog, event) {
		if (!positionXinshaTooltip(dialog, event) && !positionOfficialTooltip(dialog, event)) return original.call(this, dialog, event);
	}));
	restoreFns.push(...applyFactionCharacterInit());
	restoreFns.push(...applyFactionControlChoice());
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
