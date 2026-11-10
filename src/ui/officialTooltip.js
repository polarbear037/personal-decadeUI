import { lib, ui } from "noname";

// 山河图 card-ui.css / hero.css：保留原始设计坐标和 0.8 展示比例。
const SCALE = 0.8;

export function isOnlineTooltip() {
	return (document.body.dataset.style || lib.config.extension_十周年UI_newDecadeStyle) === "onlineUI";
}

function loadStyle() {
	if (document.getElementById("decade-official-tooltip-style")) return;
	const link = document.createElement("link");
	link.id = "decade-official-tooltip-style";
	link.rel = "stylesheet";
	link.href = new URL("../styles/online-tooltip.css", import.meta.url).href;
	link.onload = () => {
		const update = () => document.querySelectorAll(".decade-official-tooltip-host").forEach(host => {
			if (host._decadeTooltipPoint) positionOfficialTooltip(host, host._decadeTooltipPoint);
			else layoutOfficialTooltip(host);
		});
		update();
		document.fonts?.ready.then(update);
	};
	document.head.append(link);
}

function node(className, parent, text) {
	const element = document.createElement("div");
	element.className = className;
	if (text != null) element.textContent = text;
	parent.append(element);
	return element;
}

export function createOfficialTooltip(kind, name, description = "", suit = "", number = "") {
	loadStyle();
	const panel = document.createElement("div");
	panel.className = `decade-official-tooltip decade-official-${kind}-tooltip`;
	panel.setAttribute("role", "tooltip");
	let body;
	if (kind === "card") {
		const title = node("decade-tooltip-title", panel);
		node("decade-tooltip-name", title, name);
		const flower = node("decade-tooltip-flower", title);
		const symbols = { heart: "♥", diamond: "♦", spade: "♠", club: "♣" };
		if (symbols[suit] && number) {
			flower.textContent = `${symbols[suit]} ${number}`;
			flower.style.color = ["heart", "diamond"].includes(suit) ? "#912001" : "#8e7d6a";
		}
		body = node("decade-tooltip-description", panel);
	} else {
		const scroll = node("decade-tooltip-scroll", panel);
		node("decade-tooltip-name", scroll, name);
		body = node("decade-tooltip-description", scroll);
		for (const direction of ["up", "dn"]) {
			const arrow = document.createElement("img");
			arrow.className = `decade-tooltip-arrow decade-tooltip-arrow-${direction}`;
			arrow.src = new URL(`../../image/ui/tooltip/scroll_tips_${direction}.png`, import.meta.url).href;
			arrow.alt = "";
			arrow.draggable = false;
			arrow.hidden = true;
			panel.append(arrow);
		}
		const arrows = [...panel.querySelectorAll(".decade-tooltip-arrow")];
		let frame = 0;
		const animate = now => {
			frame = 0;
			if (!panel.isConnected) return;
			// 山河图 JLt/Ext：2秒周期，abs(sin) 向外浮动8px。
			const distance = Math.abs(Math.sin(now / 2000 * Math.PI * 2)) * 8;
			arrows[0].style.transform = `translateY(${-distance}px)`;
			arrows[1].style.transform = `translateY(${distance}px)`;
			if (arrows.some(arrow => !arrow.hidden) && hostVisible()) frame = requestAnimationFrame(animate);
		};
		const hostVisible = () => panel.closest(".decade-official-tooltip-host")?.style.display !== "none";
		const update = () => {
			const overflow = scroll.scrollHeight > scroll.clientHeight + 1;
			arrows[0].hidden = !overflow || scroll.scrollTop <= 1;
			arrows[1].hidden = !overflow || scroll.scrollTop >= scroll.scrollHeight - scroll.clientHeight - 1;
			if (!frame && arrows.some(arrow => !arrow.hidden)) frame = requestAnimationFrame(animate);
		};
		scroll.addEventListener("scroll", update, { passive: true });
		panel.updateArrows = update;
	}
	// 沿用山河图：文字、换行和颜色，不将描述当作可执行 HTML。
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
		for (const child of source.childNodes) append(child, target);
	};
	for (const child of parsed.body.childNodes) append(child, body);
	return panel;
}

export function layoutOfficialTooltip(host) {
	const panel = host.querySelector(".decade-official-tooltip");
	if (!panel) return;
	const card = panel.classList.contains("decade-official-card-tooltip");
	let height;
	if (card) {
		const description = panel.querySelector(".decade-tooltip-description");
		const top = 11 + panel.querySelector(".decade-tooltip-title").offsetHeight + 10;
		description.style.top = `${top}px`;
		height = Math.max(82, top + description.offsetHeight + 11);
	} else {
		const scroll = panel.querySelector(".decade-tooltip-scroll");
		scroll.style.height = "auto";
		height = Math.min(520, Math.max(38, scroll.scrollHeight + 38));
		scroll.style.height = `${height - 38}px`;
		panel.updateArrows();
	}
	panel.style.height = `${height}px`;
	host.style.width = `${(card ? 416 : 491) * SCALE}px`;
	host.style.height = `${height * SCALE}px`;
}

export function positionOfficialTooltip(host, event) {
	if (!host.dataset.decadeTooltip) return false;
	host._decadeTooltipPoint = event;
	layoutOfficialTooltip(host);
	const parent = host.offsetParent || ui.window;
	const rect = parent.getBoundingClientRect();
	const scaleX = rect.width / parent.offsetWidth || 1;
	const scaleY = rect.height / parent.offsetHeight || 1;
	const point = event?.touches?.[0] || event || {};
	const x = ((point.clientX ?? rect.left) - rect.left) / scaleX;
	const y = ((point.clientY ?? rect.top) - rect.top) / scaleY;
	const width = host.offsetWidth, height = host.offsetHeight;
	let left = x < parent.offsetWidth / 2 ? x + 10 : x - width - 10;
	left = Math.max(5, Math.min(left, parent.offsetWidth - width - 5));
	host.style.left = `${left}px`;
	host.style.top = `${Math.max(5, Math.min(y - height / 2, parent.offsetHeight - height - 10))}px`;
	return true;
}

export function applyOfficialNodeIntro(dialog, source) {
	if (!isOnlineTooltip() || !dialog?.content || !source || dialog.dataset.decadeTooltip || dialog.classList.contains("online-mark-card-dialog")) return;
	// 本体技能标记同时带有 .card，优先按 skill 判断。
	const kind = source.skill ? "skill" : source.classList.contains("card") ? "card" : null;
	if (!kind || source._banning || source.classList.contains("infohidden")) return;
	const caption = dialog.content.querySelector(":scope > .caption");
	if (!caption) return;
	const title = caption.textContent.trim();
	const cardTitle = kind === "card" && title.match(/^([\s\S]*?)【([♥♦♠♣])[\uFE0E\uFE0F]?\s*(\d+|[AJQK])】$/);
	const suit = cardTitle && ({ "♥": "heart", "♦": "diamond", "♠": "spade", "♣": "club" })[cardTitle[2]];
	const panel = createOfficialTooltip(kind, cardTitle ? cardTitle[1] : title, "", suit, cardTitle?.[3]);
	const body = panel.querySelector(".decade-tooltip-description");
	// 移动原节点，保留 cardPrompt、应变、标签、虚拟牌及技能标记的交互和状态。
	caption.remove();
	for (const child of [...dialog.content.childNodes]) {
		if (child.nodeType === 1 && child.classList.contains("placeholder")) child.remove();
		else body.append(child);
	}
	if (kind === "card" && !cardTitle) {
		// 原标题包含视为牌名/花色/点数，保留它以免泄漏暗牌或丢失转化信息。
		panel.querySelector(".decade-tooltip-name").replaceChildren(...caption.childNodes);
	}
	dialog.content.append(panel);
	dialog.dataset.decadeTooltip = kind;
	dialog.classList.add("decade-official-tooltip-host");
	delete dialog._place_text;
	layoutOfficialTooltip(dialog);
	// nodeintro 可能尚未插入文档，插入后及字体加载后重新测量。
	requestAnimationFrame(() => { if (dialog.isConnected) layoutOfficialTooltip(dialog); });
	document.fonts?.ready.then(() => { if (dialog.isConnected) layoutOfficialTooltip(dialog); });
}
