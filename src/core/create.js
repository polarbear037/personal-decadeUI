import { ui } from "noname";
import { element as element } from "../utils/element.js";
function e() {
	return {
		skillDialog() {
			const e = document.createElement("div");
			e.className = "skill-dialog";
			const i = {
				caption: void 0,
				tip: void 0,
				open(customParent) {
					if (!customParent) {
						const t = decadeUI.get.bodySize();
						((this.style.minHeight = parseInt(0.42 * t.height) + "px"), this.parentNode !== ui.arena && ui.arena.appendChild(this));
					}
					return ((this.style.animation = "open-dialog 0.4s"), this);
				},
				show() {
					this.style.animation = "open-dialog 0.4s";
				},
				hide() {
					this.style.animation = "close-dialog 0.1s forwards";
				},
				close() {
					const func = function (e) {
						"close-dialog" === e.animationName && (this.remove(), this.removeEventListener("animationend", func));
					};
					"close-dialog" === this.style.animationName ? setTimeout(t => t.remove(), 100, this) : ((this.style.animation = "close-dialog 0.1s forwards"), this.addEventListener("animationend", func));
				},
				appendControl(text, clickFunc) {
					const control = document.createElement("div");
					return ((control.className = "control-button"), (control.textContent = text), clickFunc && control.addEventListener("click", clickFunc), this.$controls.appendChild(control));
				},
				$caption: element.create("caption", e),
				$content: element.create("content", e),
				$tip: element.create("tip", e),
				$controls: element.create("controls", e),
			};
			return (
				decadeUI.get.extend(e, i),
				Object.defineProperties(e, {
					caption: {
						configurable: !0,
						get() {
							return this.$caption.innerHTML;
						},
						set(value) {
							this.$caption.innerHTML !== value && (this.$caption.innerHTML = value);
						},
					},
					tip: {
						configurable: !0,
						get() {
							return this.$tip.innerHTML;
						},
						set(value) {
							this.$tip.innerHTML !== value && (this.$tip.innerHTML = value);
						},
					},
				}),
				e
			);
		},
	};
}
export { e as createDecadeUICreateModule };
