import { get, ui, _status, lib } from "noname";
function t(item) {
	const node = document.createElement("div");
	((node.link = item), (node.innerHTML = get.translation(item)), node.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control), this.appendChild(node), this.updateLayout?.());
}
function o() {
	return (ui.control.insertBefore(this, _status.createControl || ui.confirm), ui.controls.unshift(this), this);
}
function s() {
	(this.remove(), ui.controls.remove(this), ui.confirm === this && (ui.confirm = null), ui.skills === this && (ui.skills = null), ui.skills2 === this && (ui.skills2 = null), ui.skills3 === this && (ui.skills3 = null));
}
function n(...args) {
	const items = Array.isArray(args[0]) ? args[0] : args;
	let index = 0;
	const nodes = this.childNodes;
	this.custom = void 0;
	for (let i = 0; i < items.length; i++) "function" == typeof items[i] ? (this.custom = items[i]) : (index < nodes.length ? ((nodes[i].link = items[i]), (nodes[i].innerHTML = get.translation(items[i]))) : this.add(items[i]), index++);
	for (; index < nodes.length; ) nodes[index].remove();
	return (this.updateLayout?.(), ui.updatec?.(), this);
}
function i() {
	const nodes = this.childNodes;
	if (nodes.length >= 2) {
		this.classList.add("combo-control");
		for (const o of nodes) o.classList.add("control");
	} else (this.classList.remove("combo-control"), 1 === nodes.length && nodes[0].classList.remove("control"));
}
export { t as controlAdd, s as controlClose, o as controlOpen, n as controlReplace, i as controlUpdateLayout };
