import { ui } from "noname";
const e = dialog => ({
	_dialog: dialog,
	_list: [],
	add(element, event, handler, useCapture) {
		if (!(element instanceof HTMLElement && event && "function" == typeof handler)) return console.error("Invalid arguments for listener");
		(this._list.push([element, event, handler]), element.addEventListener(event, handler, useCapture));
	},
	remove(element, event, handler) {
		for (let s = this._list.length - 1; s >= 0; s--) {
			const [i, n, r] = this._list[s];
			!((element && i !== element) || (event && n !== event) || (handler && r !== handler)) && (i.removeEventListener(n, r), this._list.splice(s, 1));
		}
	},
	clear() {
		(this._list.forEach(([el, evt, fn]) => el.removeEventListener(evt, fn)), (this._list.length = 0));
	},
});
const t = () => ({
	create(className, parentNode, tagName = "div") {
		const element = document.createElement(tagName);
		return (
			Object.keys(decadeUI.dialog).forEach(key => {
				decadeUI.dialog[key] && "listens" !== key && (element[key] = decadeUI.dialog[key]);
			}),
			(element.listens = e(element)),
			className && (element.className = className),
			parentNode && parentNode.appendChild(element),
			element
		);
	},
	show() {
		this !== decadeUI.dialog && this.classList.remove("hidden");
	},
	hide() {
		this !== decadeUI.dialog && this.classList.add("hidden");
	},
	animate(property, duration, toValues, fromValues) {
		if (this === decadeUI.dialog || !property || !duration || !toValues) return;
		const props = property.replace(/\s/g, "").split(","),
			ms = (function (duration) {
				return "number" == typeof duration ? duration : duration.includes("ms") ? parseInt(duration) : duration.includes("s") ? 1e3 * parseFloat(duration) : parseInt(duration);
			})(duration);
		if (isNaN(ms)) return console.error("Invalid duration");
		fromValues && props.forEach((prop, i) => this.style.setProperty(prop, fromValues[i]));
		const { transitionDuration: transitionDuration, transitionProperty: transitionProperty } = this.style;
		((this.style.transitionDuration = `${ms}ms`),
			(this.style.transitionProperty = property),
			ui.refresh(this),
			props.forEach((prop, i) => this.style.setProperty(prop, toValues[i])),
			setTimeout(() => {
				((this.style.transitionDuration = transitionDuration), (this.style.transitionProperty = transitionProperty));
			}, ms));
	},
	close(delay, fadeOut) {
		if (this !== decadeUI.dialog && this.parentNode)
			if ((this.listens.clear(), fadeOut && delay && this.addTempClass("opacity", delay, [0]), delay)) {
				const t = "number" == typeof delay ? delay : parseInt(delay);
				setTimeout(() => this.parentNode?.removeChild(this), t);
			} else this.parentNode.removeChild(this);
	},
	listens: e(null),
});
export { t as createDecadeUIDialogModule };
