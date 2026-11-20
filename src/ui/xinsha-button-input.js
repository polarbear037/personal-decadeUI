import { lib, _status } from "noname";

let installed = false;

// 按钮内移动不交给本体的10px滚动过滤器；保留原生touchend及确认/取消回调。
export function initXinshaButtonInput() {
	if (installed) return;
	installed = true;
	let press;
	const enabled = () => lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && lib.config.touchscreen;
	const clear = () => { press = null; };
	const usable = node => node.isConnected && !node.closest(".disabled,.hidden,.closing,.removing,[inert]");
	const inside = (point, rect) => point && point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom;

	document.addEventListener("touchstart", event => {
		if (press) { press.cancelled = true; return; }
		if (!enabled() || event.touches.length !== 1 || _status.mousedragging || _status.draggingtouchdialog) return;
		const node = event.target.closest?.("#arena > #dui-controls > .control > div");
		if (!node || !usable(node)) return;
		// touchstart时:active可能已生效，还原该按钮自身缩放前的矩形。
		// 皮肤切换会在HTMLElement上把矩形除以documentZoom；触点仍是视口坐标。
		const box = Element.prototype.getBoundingClientRect.call(node);
		const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
		const width = box.width / Math.hypot(matrix.a, matrix.b), height = box.height / Math.hypot(matrix.c, matrix.d);
		const left = box.x + (box.width - width) / 2, top = box.y + (box.height - height) / 2;
		press = { node, parent: node.parentNode, event: _status.event, id: event.touches[0].identifier,
			rect: { left, top, right: left + width, bottom: top + height }, cancelled: false };
	}, true);

	document.addEventListener("touchmove", event => {
		if (!press) return;
		if (!enabled()) { clear(); return; }
		const point = Array.from(event.touches).find(touch => touch.identifier === press.id);
		if (event.touches.length !== 1 || !inside(point, press.rect)) press.cancelled = true;
		// 此次输入从按钮开始，不让body把它改成滚动/拖牌，也不启动浏览器平移。
		event.preventDefault();
		event.stopPropagation();
	}, { capture: true, passive: false });

	document.addEventListener("touchend", event => {
		if (!press) return;
		const current = press;
		const point = Array.from(event.changedTouches).find(touch => touch.identifier === current.id);
		// 多指取消持续到全部手指抬起，不能让最后一指绕过取消状态再触发一次。
		if (event.touches.length) current.cancelled = true;
		else clear();
		if (!enabled()) { clear(); return; }
		if (current.cancelled || event.touches.length || !inside(point, current.rect) || !usable(current.node) ||
			current.node.parentNode !== current.parent || current.event !== _status.event) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}, { capture: true, passive: false });

	document.addEventListener("touchcancel", clear, true);
	window.addEventListener("blur", clear);
}
