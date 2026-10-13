import { lib, ui } from "noname";
import { wrapBefore as wrapBefore } from "../utils/safeOverride.js";
function t() {
	const restoreFns = [];
	return (
		lib.element?.dialog &&
			restoreFns.push(
				wrapBefore(lib.element.dialog, "close", function () {
					this.intersection && (this.intersection.disconnect(), (this.intersection = void 0));
				})
			),
		restoreFns
	);
}
function s() {
	if (!this.noopen) {
		for (let i = 0; i < ui.dialogs.length; i++) {
			if (ui.dialogs[i] === this) return (this.show(), this.refocus(), ui.dialogs.remove(this), ui.dialogs.unshift(this), ui.update(), this);
			this.peaceDialog || (ui.dialogs[i].static ? ui.dialogs[i].unfocus() : ui.dialogs[i].hide());
		}
		return ((ui.dialog = this), ui.arena.appendChild(this), ui.dialogs.unshift(this), ui.update(), this.classList.contains("prompt") || (this.style.animation = "open-dialog 0.5s"), this);
	}
}
export { t as applyDialogOverrides, s as dialogOpen };
