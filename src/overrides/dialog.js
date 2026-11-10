import { lib, ui, game } from "noname";
import { wrapAround as wrapAround, wrapAfter as wrapAfter } from "../utils/safeOverride.js";
import { addOptimizedPrompt, addOptimizedPromptText, prepareOptimizedPrompt, closeOptimizedPrompt, refreshOptimizedPrompt, clearOptimizedPrompts } from "../ui/optimizedPrompt.js";
import { prepareDialogOlOpen as prepareDialogOlOpen, syncDialogOlLayoutMarker } from "../ui/dialog-ol-layout.js";
import { syncDialogOlControls } from "../ui/dialog-ol-controls.js";
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
		restoreFns.push(wrapAfter(game, "over", clearOptimizedPrompts)),
		restoreFns
	);
}
function s() {
	if (!this.noopen) {
		// 调用方声明内容类型，外框、确认栏和提示的几何统一由通用 OL dialog 管理。
		this.classList.toggle("dialog-ol-card-move", this.dataset.olLayout === "card-move");
		const dialogOl = prepareDialogOlOpen(this, ui.arena);
		prepareOptimizedPrompt(this);
		for (let i = 0; i < ui.dialogs.length; i++) {
			if (ui.dialogs[i] === this) {
				if (dialogOl) ui.dialog = this;
				return (this.show(), this.refocus(), ui.dialogs.remove(this), ui.dialogs.unshift(this), ui.update(), refreshOptimizedPrompt(), syncDialogOlControls(this, ui.arena, ui.window, ui.update), this);
			}
			this.peaceDialog || (ui.dialogs[i].static ? ui.dialogs[i].unfocus() : ui.dialogs[i].hide());
		}
		return ((ui.dialog = this), ui.arena.appendChild(this), ui.dialogs.unshift(this), ui.update(), refreshOptimizedPrompt(), this.classList.contains("prompt") || (this.style.animation = "open-dialog 0.5s"), syncDialogOlControls(this, ui.arena, ui.window, ui.update), this);
	}
}
export { t as applyDialogOverrides, s as dialogOpen };
