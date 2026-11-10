import { game, get, lib } from "noname";
import { wrapAfter as wrapAfter, wrapAround as wrapAround } from "../utils/safeOverride.js";
import { ensureChixuerenCardDefinition as ensureChixuerenCardDefinition } from "./card/chixueren.js";
import { applyOfficialNodeIntro, isOnlineTooltip } from "../ui/officialTooltip.js";
import { applyOnlineLucunCards } from "../ui/online-mark-vcards.js";
import { getOnlineMarkPresentation } from "./player/marks.js";
function t() {
	const restoreFns = [];
	return (
		ensureChixuerenCardDefinition(),
		restoreFns.push(wrapAround(get, "nodeintro", function (original, node, ...args) {
			// 悬停介绍不经过 ui.click.intro，在公共入口屏蔽空栏，保留技能附加装备。
			if (node && !node.extraEquip && (node.classList?.contains("emptyequip") || node.name?.startsWith("empty_equip") || node.dataset?.name?.startsWith("empty_equip"))) return;
			ensureChixuerenCardDefinition();
			if (node?.classList?.contains("mark") && node.parentElement?.classList.contains("dui-marks")) {
				const player = node.parentElement.parentElement;
				const presentation = getOnlineMarkPresentation(node, player);
				if (presentation === "status" || presentation === "empty") return;
				if (presentation === "dialog") {
					const dialog = original.call(this, node, ...args);
					if (!dialog?.content) return dialog;
					if (node.skill && !node._customintro && typeof node.info?.mark !== "function" && !["expansion", "card", "cards"].includes(node.info?.content)) {
						const cards = player.getExpansions(node.skill);
						if (cards.length) dialog.addAuto(cards);
					}
					const buttons = dialog.content.querySelectorAll(".button.card");
					if (!buttons.length) return dialog;
					dialog.classList.add("online-mark-card-dialog");
					delete dialog._place_text;
					if (node.skill === "olsblucun_used") {
						applyOnlineLucunCards(dialog, buttons);
						return dialog;
					}
					const label = lib.translate[node.skill] || node.text?.textContent;
					for (const button of buttons) {
						if (!label || get.itemtype(button.link) !== "card" || button.matches(".infohidden, .infoflip, .blank")) continue;
						const tag = document.createElement("span");
						tag.className = "online-mark-card-tag";
						tag.textContent = label;
						button.append(tag);
					}
					return dialog;
				}
			}
			return original.call(this, node, ...args);
		})),
		restoreFns.push(wrapAfter(get, "nodeintro", function (dialog, source) {
			if (dialog && isOnlineTooltip() && source?.matches?.(".mark") && source.parentElement?.matches(".dui-marks, .marks")) {
				dialog.classList.add("online-player-mark-intro");
			}
			applyOfficialNodeIntro(dialog, source);
		})),
		restoreFns.push(
			wrapAfter(get, "skillState", function (skills, player) {
				if (game.me !== player && skills?.global) {
					skills.global = skills.global.concat();
					for (let t = skills.global.length - 1; t >= 0; t--) skills.global[t].includes("decadeUI") && skills.global.splice(t, 1);
				}
			})
		),
		restoreFns
	);
}
function l(obj) {
	return { "[object Array]": "array", "[object Object]": "object", "[object HTMLDivElement]": "div", "[object HTMLTableElement]": "table", "[object HTMLTableRowElement]": "tr", "[object HTMLTableCellElement]": "td", "[object HTMLBodyElement]": "td" }[(obj = Object.prototype.toString.call(obj))];
}
export { t as applyGetOverrides, l as getObjtype };
