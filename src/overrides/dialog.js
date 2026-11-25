import { lib, ui, game, _status } from "noname";
import { wrapAround as wrapAround, wrapAfter as wrapAfter } from "../utils/safeOverride.js";
import { addOptimizedPrompt, addOptimizedPromptText, prepareOptimizedPrompt, closeOptimizedPrompt, refreshOptimizedPrompt, clearOptimizedPrompts } from "../ui/optimizedPrompt.js";
import { prepareDialogOlOpen as prepareDialogOlOpen, syncDialogOlLayoutMarker } from "../ui/dialog-ol-layout.js";
import { syncDialogOlControls } from "../ui/dialog-ol-controls.js";
import { skillNameForPrompt } from "../ui/officialPrompt.js";
import { xinshaDialogCardAnimations } from "../ui/dialog-card-animations-xinsha.js";

function getDialogSkillTitle(event) {
	const seen = new Set();
	for (let depth = 0; event && depth < 32 && !seen.has(event); depth++) {
		seen.add(event);
		// 只追溯当前技能的子事件，不能借用阶段外或普通卡牌结算外层的技能。
		if (/^chooseCharacter/.test(event.name) || event.name === "game" || event.name === "phase" ||
			/^phase(?:Zhunbei|Judge|Draw|Use|Discard|Jieshu)(?:Before|Begin|End|After)?$/.test(event.name) ||
			event.name === "useCard" || event.name === "respond" || event.type === "card") break;
		const name = typeof event.name === "string" ? event.name.replace(/_(?:cost|backup)$/, "") : "";
		for (const value of [event.sourceSkill, event.skill, event.hsskill, event.hiddenSkill, event.logSkill, name]) {
			const skill = Array.isArray(value) ? value[0] : value;
			if (typeof skill !== "string" || !(lib.skill?.[skill] || lib.skill?.[skill.replace(/_(?:cost|backup)$/, "")])) continue;
			const title = skillNameForPrompt(skill, event.player);
			if (title) return title;
		}
		try {
			event = event.getParent?.() || event.parent;
		} catch {
			event = event.parent;
		}
	}
	return "";
}
function t() {
	const restoreFns = [];
	return (
		lib.element?.dialog &&
			restoreFns.push(
				wrapAround(lib.element.dialog, "add", addOptimizedPrompt),
				wrapAround(lib.element.dialog, "addText", addOptimizedPromptText),
				...["show", "hide"].map(method => wrapAfter(lib.element.dialog, method, refreshOptimizedPrompt)),
				wrapAfter(lib.element.dialog, "setCaption", function () {
					syncDialogOlLayoutMarker(this, ui.arena);
					if (ui.dialog === this) ui.update();
					refreshOptimizedPrompt();
				}),
				wrapAround(lib.element.dialog, "close", function (original, ...args) {
					this.intersection && (this.intersection.disconnect(), (this.intersection = void 0));
					const result = original.apply(this, args);
					closeOptimizedPrompt(this);
					return result;
				})
			),
		restoreFns.push(wrapAfter(game, "over", clearOptimizedPrompts), wrapAfter(game, "over", xinshaDialogCardAnimations.clear)),
		restoreFns
	);
}
function s() {
	if (!this.noopen) {
		xinshaDialogCardAnimations.attach(this, { event: _status.event });
		// 调用方声明内容类型，外框、确认栏和提示的几何统一由通用 OL dialog 管理。
		this.classList.toggle("dialog-ol-card-move", this.dataset.olLayout === "card-move");
		const dialogOl = prepareDialogOlOpen(this, ui.arena, getDialogSkillTitle, _status.event);
		prepareOptimizedPrompt(this);
		for (let i = 0; i < ui.dialogs.length; i++) {
			if (ui.dialogs[i] === this) {
				if (dialogOl) ui.dialog = this;
				return (this.show(), this.refocus(), ui.dialogs.remove(this), ui.dialogs.unshift(this), ui.update(), refreshOptimizedPrompt(), syncDialogOlControls(this, ui.arena, ui.window, ui.update), this);
			}
			this.peaceDialog || (ui.dialogs[i].static ? ui.dialogs[i].unfocus() : ui.dialogs[i].hide());
		}
		return ((ui.dialog = this), ui.arena.appendChild(this), ui.dialogs.unshift(this), ui.update(), refreshOptimizedPrompt(), this.classList.contains("prompt") || (this.style.animation = lib.config.extension_十周年UI_newDecadeStyle === "othersOff" ? "open-dialog-xinsha 0.2s linear" : "open-dialog 0.5s"), syncDialogOlControls(this, ui.arena, ui.window, ui.update), this);
	}
}
export { t as applyDialogOverrides, s as dialogOpen };
