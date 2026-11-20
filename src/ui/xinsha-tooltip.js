import { lib, ui } from "noname";

export function isXinshaTooltip() {
	return (document.body.dataset.style || lib.config.extension_十周年UI_newDecadeStyle) === "othersOff";
}

let styleReady;
function loadStyle() {
	if (styleReady) return styleReady;
	const link = document.createElement("link");
	link.id = "decade-xinsha-tooltip-style";
	link.rel = "stylesheet";
	link.href = new URL("../styles/xinsha-tooltip.css", import.meta.url).href;
	styleReady = new Promise(resolve => {
		link.onload = resolve;
		link.onerror = resolve;
	});
	document.head.append(link);
	return styleReady;
}

export async function prepareXinshaTooltip(host) {
	await loadStyle();
	if (!host.isConnected || !isXinshaTooltip()) return;
	layoutXinshaTooltip(host);
	await document.fonts?.ready;
}

function node(className, parent, text) {
	const element = document.createElement("div");
	element.className = className;
	if (text != null) element.textContent = text;
	parent.append(element);
	return element;
}

export function createXinshaTooltip(kind, name, description = "", skillName) {
	loadStyle();
	const panel = document.createElement("div");
	panel.className = `xinsha-tooltip xinsha-${kind}-tooltip`;
	panel.setAttribute("role", "tooltip");
	const scroll = node("xinsha-tooltip-scroll", panel);
	const title = node("xinsha-tooltip-title", scroll);
	node("xinsha-tooltip-name", title, name);
	if (kind === "skill") {
		const active = !!lib.skill[skillName]?.enable;
		const badge = node("xinsha-tooltip-badge", title, active ? "主" : "被");
		badge.dataset.active = String(active);
	}
	const body = node("xinsha-tooltip-description", scroll);
	// 只保留说明文字及简单富文本；动态技能翻译仍由现有入口取得。
	const parsed = new DOMParser().parseFromString(String(description), "text/html");
	const append = (source, parent) => {
		if (source.nodeType === 3) return parent.append(document.createTextNode(source.textContent));
		if (source.nodeName === "BR") return parent.append(document.createElement("br"));
		let target = parent;
		if (["FONT", "SPAN", "B", "I", "U"].includes(source.nodeName)) {
			target = document.createElement(source.nodeName === "FONT" ? "span" : source.nodeName.toLowerCase());
			const color = source.getAttribute("color") || source.style?.color;
			if (color) target.style.color = color;
			parent.append(target);
		}
		if (["SCRIPT", "STYLE"].includes(source.nodeName)) return;
		for (const child of source.childNodes) append(child, target);
	};
	for (const child of parsed.body.childNodes) append(child, body);
	return panel;
}

export function layoutXinshaTooltip(host) {
	const panel = host.querySelector(".xinsha-tooltip");
	if (!panel) return;
	if (host.isConnected && host._xinshaObservedPanel !== panel) {
		host._xinshaTooltipObserver?.disconnect();
		host._xinshaObservedPanel = panel;
		const observer = new ResizeObserver(() => {
			if (!host.isConnected) {
				observer.disconnect();
				delete host._xinshaObservedPanel;
			} else if (host.offsetParent) positionXinshaTooltip(host);
		});
		host._xinshaTooltipObserver = observer;
		observer.observe(panel);
	}
	const parent = host.offsetParent || ui.window;
	const unit = parseFloat(getComputedStyle(ui.window).getPropertyValue("--yjcm-unit")) || Math.min(ui.window.clientWidth / 1334, ui.window.clientHeight / 750) || 1;
	const width = panel.classList.contains("xinsha-card-tooltip") ? 518 : 400;
	// 复用局内设计单位；缩放窗口、documentZoom 均只换算一次。
	const scale = Math.min(unit, (parent.clientWidth - 10) / width);
	host.style.setProperty("--xinsha-tooltip-scale", scale);
	const scroll = panel.querySelector(".xinsha-tooltip-scroll");
	scroll.style.maxHeight = `${Math.max(60, (parent.clientHeight - 20) / scale)}px`;
	host.style.width = `${width * scale}px`;
	host.style.height = `${panel.offsetHeight * scale}px`;
	const name = panel.querySelector(".xinsha-tooltip-name");
	if (width === 400) panel.querySelector(".xinsha-tooltip-title").style.width = `${Math.max(87, name.scrollWidth + 19)}px`;
}

export function positionXinshaTooltip(host, event, button) {
	if (!isXinshaTooltip() || !host?.dataset.xinshaTooltip) return false;
	if (button) host._xinshaTooltipSource = button;
	const source = button || host._xinshaTooltipSource;
	// 已移除的按钮仍可被 ResizeObserver 引用，其矩形为零，不能用来定位。
	if (source && (!source.isConnected || !source.getClientRects().length)) {
		host.style.display = "none";
		return true;
	}
	layoutXinshaTooltip(host);
	const parent = host.offsetParent || ui.window;
	const bounds = parent.getBoundingClientRect();
	const scaleX = bounds.width / parent.offsetWidth || 1, scaleY = bounds.height / parent.offsetHeight || 1;
	const point = event?.touches?.[0] || event || {};
	const anchor = source?.getBoundingClientRect();
	const width = host.offsetWidth, height = host.offsetHeight;
	const x = anchor ? (anchor.left + anchor.width / 2 - bounds.left) / scaleX : ((point.clientX ?? bounds.left) - bounds.left) / scaleX;
	const y = anchor ? (anchor.top - bounds.top) / scaleY : ((point.clientY ?? bounds.top) - bounds.top) / scaleY;
	let top = y - height - 10;
	if (top < 5 && anchor) top = (anchor.bottom - bounds.top) / scaleY + 10;
	host.style.left = `${Math.max(5, Math.min(x - width / 2, parent.clientWidth - width - 5))}px`;
	host.style.top = `${Math.max(5, Math.min(top, parent.clientHeight - height - 5))}px`;
	return true;
}

export function applyXinshaNodeIntro(dialog, source) {
	// 仅手牌区卡牌；角色标记、装备、弃牌堆、选牌窗口保持原本内容结构。
	if (!isXinshaTooltip() || !dialog?.content || !source?.matches?.(".card") || source.skill || !source.closest(".handcards, .handcards1, .handcards2") || source._banning || source.matches(".infohidden, .infoflip, .blank") || dialog.dataset.xinshaTooltip) return;
	const caption = dialog.content.querySelector(":scope > .caption");
	if (!caption) return;
	const title = caption.textContent.trim();
	const name = title.replace(/【(?:[♥♦♠♣][\uFE0E\uFE0F]?\s*)?(?:\d+|[AJQK])】$/, "").trim();
	const panel = createXinshaTooltip("card", name);
	const body = panel.querySelector(".xinsha-tooltip-description");
	caption.remove();
	// 保留 cardPrompt、应变、标签和虚拟牌原节点，不重新生成牌规则。
	for (const child of [...dialog.content.childNodes]) {
		if (child.nodeType === 1 && child.classList.contains("placeholder")) child.remove();
		else body.append(child);
	}
	// dialog.add(HTML) 在 .text 外还有包装节点，不能只匹配 content 的直属子节点。
	const type = lib.card[source.name]?.type;
	const typeLabel = type && lib.translate[type] && `${lib.translate[type]}牌`;
	for (const meta of body.querySelectorAll(".text.center")) {
		if (!typeLabel || !meta.textContent.replace(/^特殊/, "").startsWith(typeLabel)) continue;
		meta.classList.add("xinsha-tooltip-card-type");
		if (meta.parentElement !== body && meta.parentElement.childNodes.length === 1) meta.parentElement.classList.add("xinsha-tooltip-card-type");
	}
	dialog.content.append(panel);
	dialog.dataset.xinshaTooltip = "card";
	dialog.classList.add("xinsha-tooltip-host");
	dialog._xinshaTooltipSource = source;
	dialog.style.visibility = "hidden";
	delete dialog._place_text;
	layoutXinshaTooltip(dialog);
	requestAnimationFrame(async () => {
		await prepareXinshaTooltip(dialog);
		if (dialog.isConnected && isXinshaTooltip()) {
			positionXinshaTooltip(dialog);
			dialog.style.visibility = "";
		}
	});
}
