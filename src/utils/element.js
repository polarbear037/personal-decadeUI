import "noname";
const e = {
	removeSelf(milliseconds) {
		if (milliseconds) {
			const t = "number" == typeof milliseconds ? milliseconds : parseInt(milliseconds);
			return void setTimeout(() => this.parentNode?.removeChild(this), t);
		}
		this.parentNode?.removeChild(this);
	},
};
function t(className, parentNode, tagName = "div") {
	const element = document.createElement(tagName);
	return ((element.view = {}), Object.assign(element, e), className && (element.className = className), parentNode && parentNode.appendChild(element), element);
}
const n = { base: e, create: t, clone: e => e?.cloneNode?.(!0) };
export { t as createElement, n as element };
