import { releaseDialogOlLayout as releaseDialogOlLayout, syncDialogOlLayoutMarker as syncDialogOlLayoutMarker } from "./dialog-ol-layout.js";

const RESTORE_CLASS = "dialog-ol-restore";
const CAPTION_CLASS = "dialog-ol-caption";
const COLLAPSE_CLASS = "dialog-ol-collapse";
const NO_CAPTION_CLASS = "dialog-ol-controls-no-caption";
let restoreButton;
let restoreOwner;
let activeDialog;

function usesXinshaControls(arena) {
	return arena?.getAttribute("data-loading-style") === "dialog_xinsha" || document.body?.dataset.style === "othersOff";
}

function positionXinshaControl(button, parent) {
	// WindowManager.setHideBtn：LEFT_BOTTOM，x=可用画面左缘+39，y=258；设计高度750。
	const unit = parseFloat(getComputedStyle(parent).getPropertyValue("--yjcm-unit")) || Math.min(parent.clientWidth / 1334, parent.clientHeight / 750);
	const sceneX = parseFloat(getComputedStyle(parent).getPropertyValue("--yjcm-scene-x"));
	// 优先复用一将场景已经计算的安全区；旧实现漏掉了两侧60设计单位。
	const usableWidth = Math.max(1334, Math.min(1750, parent.clientWidth / unit - 120)) * unit;
	button.style.left = `${(Number.isFinite(sceneX) ? sceneX : (parent.clientWidth - usableWidth) / 2) + 39 * unit}px`;
	button.style.bottom = `${258 * unit}px`;
	button.style.top = "auto";
	button.style.width = `${86 * unit}px`;
	button.style.height = `${86 * unit}px`;
}

function clearXinshaPromptLayout(state) {
	const layout = state?.promptLayout;
	if (!layout) return;
	layout.mutations.disconnect();
	layout.resize.disconnect();
	cancelAnimationFrame(layout.frame);
	for (const copy of layout.copies.values()) copy.remove();
	for (const [node, properties] of layout.nodes) {
		for (const [key, [value, priority]] of properties) {
			if (value) node.style.setProperty(key, value, priority);
			else node.style.removeProperty(key);
		}
	}
	state.dialog.classList.remove("dialog-xinsha-prompt-layout");
	state.promptLayout = null;
}

function syncXinshaPromptLayout(state) {
	const { dialog, arena, windowElement } = state;
	if (document.body.dataset.style !== "othersOff" || state.collapsed || dialog.hidden ||
		dialog.classList.contains("hidden") || dialog.classList.contains("removing") ||
		dialog.classList.contains("lei-yijiang-sc-closing") || arena?.classList.contains("choose-character") && !dialog.classList.contains("xinsha-faction-dialog") ||
		typeof dialog.getCurrentCapt === "function" || !dialog.isConnected) {
		clearXinshaPromptLayout(state);
		return;
	}
	if (state.promptLayout) return state.promptLayout.update();
	const layout = { nodes: new Map(), copies: new Map(), frame: 0 };
	state.promptLayout = layout;
	const set = (node, key, value) => {
		let saved = layout.nodes.get(node);
		if (!saved) layout.nodes.set(node, saved = new Map());
		if (!saved.has(key)) saved.set(key, [node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]);
		if (node.style.getPropertyValue(key) !== value || node.style.getPropertyPriority(key) !== "important") node.style.setProperty(key, value, "important");
	};
	// 固定定位也可能受雷霆画幅、body zoom 或 dialog 的 transform 影响；先量取其实际坐标基准。
	const place = (node, center, bottom, width, height, fontSize) => {
		for (const [key, value] of Object.entries({ position: "fixed", left: "0px", top: "0px", right: "auto", bottom: "auto", width: "100px", height: "100px", margin: "0px", padding: "0px", transform: "none", "transition-property": "opacity", "box-sizing": "border-box", "z-index": "103" })) set(node, key, value);
		const origin = node.getBoundingClientRect();
		const sx = origin.width / 100 || 1;
		// offsetHeight 会将文字高度取整，反推比例会令字号/高度逐帧反馈振荡。
		const sy = origin.height / 100 || sx;
		set(node, "width", `${width / sx}px`);
		set(node, "height", height ? `${height / sy}px` : "auto");
		if (fontSize) {
			set(node, "font-size", `${fontSize / sy}px`);
			set(node, "line-height", "1");
			set(node, "color", "rgb(255, 243, 222)");
			set(node, "text-align", "center");
			for (const span of node.querySelectorAll("span")) {
				set(span, "font-size", "inherit");
				set(span, "line-height", "inherit");
				if (span.dataset.type === "player") set(span, "color", "#ffe100");
			}
		}
		set(node, "left", `${(center - width / 2 - origin.left) / sx}px`);
		set(node, "top", `${(bottom - node.getBoundingClientRect().height - origin.top) / sy}px`);
		return { sx, sy };
	};
	// 保留原提示节点供本体、布局和关闭流程使用；同一 body 浮层绘制无交互副本，
	// 避免 footer 被 dialog(101) 的 stacking context 限制而压在 body 进度条下面。
	const paintTip = (node, center, bottom, width, scale) => {
		place(node, center, bottom, width, 0, 30 * scale);
		if (node.hidden || node.classList.contains("hidden") || !node.textContent.trim() || getComputedStyle(node).display === "none") {
			layout.copies.get(node)?.remove();
			return;
		}
		let copy = layout.copies.get(node);
		if (!copy) {
			copy = document.createElement("div");
			copy.className = "dialog-xinsha-prompt-overlay";
			copy.setAttribute("aria-hidden", "true");
			layout.copies.set(node, copy);
		}
		if (copy.innerHTML !== node.innerHTML) copy.innerHTML = node.innerHTML;
		if (copy.parentNode !== document.body) document.body.appendChild(copy);
		for (const [key, value] of Object.entries({ "z-index": "104", "pointer-events": "none", "font-family": '"dui-yjcm-label", serif', opacity: "1", visibility: "visible", "text-shadow": "none" })) set(copy, key, value);
		place(copy, center, bottom, width, 0, 30 * scale);
		set(copy, "z-index", "104");
		set(node, "opacity", "0");
	};
	layout.update = () => {
		if (state.promptLayout !== layout) return;
		if (!dialog.isConnected || dialog.hidden || dialog.classList.contains("hidden") || dialog.classList.contains("removing") || dialog.classList.contains("lei-yijiang-sc-closing")) return clearXinshaPromptLayout(state);
		const viewport = windowElement || arena.parentElement || arena;
		const box = dialog.getBoundingClientRect(), view = viewport.getBoundingClientRect();
		const snitch = dialog.id === "lei-yijiang-player-card-dialog";
		const faction = dialog.classList.contains("xinsha-faction-dialog");
		const windowButtons = dialog.dataset.xinshaActionButtons === "window";
		const fixedCardLayout = snitch || faction || windowButtons || dialog.dataset.olLayout === "card-move";
		const scale = snitch ? box.width / 1696 : Math.min(view.width / 1334, view.height / 750);
		if (!(scale > 0 && box.height > 0)) return;
		const center = box.left + box.width / 2;
		const controls = arena.querySelector("#dui-controls");
		const style = controls && getComputedStyle(controls);
		const hasButtons = controls?.children.length && !controls.classList.contains("hidden") && style.display !== "none" && style.visibility !== "hidden";
		const barY = faction ? 64 : snitch ? (hasButtons ? 108 : 73) : 113;
		const tipY = faction ? 80 : snitch ? (hasButtons ? 120 : 80) : 120;
		// 自定义顺拆/移牌框保留原坐标；普通框从底部依次安排提示、进度条与内容区。
		const tipBottom = box.bottom - (fixedCardLayout ? tipY : 16) * scale;
		const footer = dialog.querySelector(":scope > .dialog-ol-footer");
		const tipWidth = Math.min(1220 * scale, view.width - 24);
		for (const [node, copy] of layout.copies) {
			if (!node.isConnected) { copy.remove(); layout.copies.delete(node); }
		}
		let promptHeight = 30 * scale;
		for (const tip of arena.querySelectorAll(":scope > .hand-tip")) {
			if (footer) {
				set(tip, "display", "none");
				layout.copies.get(tip)?.remove();
			}
			else paintTip(tip, center, tipBottom, tipWidth, scale);
			if (!footer && !tip.classList.contains("hidden")) promptHeight = Math.max(promptHeight, tip.getBoundingClientRect().height);
		}
		if (footer) {
			paintTip(footer, center, tipBottom, tipWidth, scale);
			promptHeight = footer.getBoundingClientRect().height;
		}
		let promptTop = tipBottom - promptHeight;
		for (const info of arena.querySelectorAll(":scope > .hand-tip-info")) {
			paintTip(info, center, promptTop - 6 * scale, tipWidth, scale);
			if (!fixedCardLayout && layout.copies.get(info)?.isConnected) promptTop -= info.getBoundingClientRect().height + 6 * scale;
		}
		const barBottom = fixedCardLayout ? box.bottom - barY * scale : promptTop - 8 * scale;
		for (const bar of document.querySelectorAll("#jindutiaopl, [data-yjcm-progress]")) {
			if (bar.dataset.yjcmProgress !== "4") continue;
			const fill = bar.firstElementChild;
			const image = fill?.querySelector("img");
			if (!image) continue;
			const { sx } = place(bar, center, barBottom, 560 * scale, 17 * scale);
			for (const [key, value] of Object.entries({ "--yjcm-progress-width": `${560 * scale / sx}px`, "background-color": "transparent", "border-radius": "0px", "box-shadow": "none", "background-image": 'url("' + new URL("xf_newTimeBar_bg_1.png", image.src).href + '")', "background-size": "101.071429% 129.411765%", "background-position": "center", "background-repeat": "no-repeat" })) set(bar, key, value);
			if (fill) { set(fill, "top", "0px"); set(fill, "height", "100%"); }
			set(image, "content", 'url("' + new URL("xf_newTimeBar" + (image.getAttribute("src").includes("_red_") ? "_red_1.png" : "_1.png"), image.src).href + '")');
		}
		if (!snitch) {
			if (!dialog.classList.contains("dialog-xinsha-prompt-layout")) dialog.classList.add("dialog-xinsha-prompt-layout");
			// 留白属于布局尺寸，不能把开窗 1→1.1→1 的绘制缩放算进去，否则框高会反向伸缩。
			const dialogStyle = getComputedStyle(dialog);
			const openingScale = dialogStyle.animationName.split(",").some(name => name.trim() === "open-dialog-xinsha") ? parseFloat(dialogStyle.scale) || 1 : 1;
			// 普通框使用横向比例，避免高度取整与留白形成反馈；自定义框保留原有缩放。
			const dialogScale = (fixedCardLayout ? box.height / dialog.offsetHeight || 1 : box.width / dialog.offsetWidth || 1) / openingScale;
			set(dialog, "--dialog-xinsha-prompt-unit", `${scale / dialogScale}px`);
			set(dialog, "--dialog-xinsha-prompt-space", fixedCardLayout ? `${150 * scale / dialogScale}px` : `max(0px, calc(${(box.bottom - barBottom + (17 + 12) * scale) / dialogScale}px - var(--dialog-ol-frame-padding)))`);
		}
	};
	const schedule = () => {
		if (!layout.frame) layout.frame = requestAnimationFrame(() => { layout.frame = 0; layout.update(); });
	};
	layout.mutations = new MutationObserver(records => {
		if (records.some(record => record.type === "childList" || record.target === dialog || record.target === arena || record.target === windowElement || record.attributeName === "src" || record.attributeName === "class" && record.target.matches(".hand-tip,.hand-tip-info"))) schedule();
	});
	layout.mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "src"] });
	layout.resize = new ResizeObserver(schedule);
	for (const node of [dialog, arena, windowElement].filter(Boolean)) layout.resize.observe(node);
	layout.update();
}

function clearXinshaControlPosition(button) {
	for (const name of ["left", "bottom", "top", "width", "height"]) button.style.removeProperty(name);
}

function callOriginal(state, method, owner, args = []) {
	const original = state.original?.[method];
	return typeof original === "function" ? original.apply(owner, args) : undefined;
}

function hideRestoreButton() {
	if (restoreButton) restoreButton.hidden = true;
	restoreOwner = null;
}

function removeRestoreButton(owner) {
	if (restoreOwner && restoreOwner !== owner) return;
	restoreButton?.remove();
	restoreOwner = null;
}

function getRestoreButton(windowElement, arena) {
	if (!restoreButton) {
		restoreButton = document.createElement("button");
		restoreButton.type = "button";
		restoreButton.className = RESTORE_CLASS;
		restoreButton.hidden = true;
		restoreButton.textContent = "显示弹窗";
		restoreButton.setAttribute("aria-label", "显示弹窗");
		restoreButton.addEventListener("click", event => {
			event.preventDefault();
			event.stopPropagation();
			const owner = restoreOwner;
			const state = owner?._dialogOlControls;
			if (!owner || !state || state.dialog !== owner || !state.collapsed) return hideRestoreButton();
			state.collapsed = false;
			hideRestoreButton();
			callOriginal(state, "show", owner);
			if (state.arrow) state.arrow.hidden = false;
			state.update?.();
		});
		for (const eventName of ["mousedown", "mouseup", "touchstart", "touchend", "pointerdown", "pointerup"]) {
			restoreButton.addEventListener(eventName, event => event.stopPropagation());
		}
	}
	const parent = windowElement || arena;
	if (parent && restoreButton.parentNode !== parent) parent.appendChild(restoreButton);
	const xinsha = usesXinshaControls(arena);
	restoreButton.classList.toggle("dialog-xinsha-restore", xinsha);
	if (xinsha && parent) positionXinshaControl(restoreButton, parent);
	else clearXinshaControlPosition(restoreButton);
	return restoreButton;
}

function removeArrow(state, dialog) {
	state.arrow?.remove();
	state.caption?.classList.remove(CAPTION_CLASS);
	dialog?.classList.remove(NO_CAPTION_CLASS);
	state.caption = null;
}

function cleanupDialog(dialog, state, restoreVisible) {
	if (!state || state.cleaning) return;
	state.cleaning = true;
	clearXinshaPromptLayout(state);
	releaseDialogOlLayout(dialog);
	if (restoreVisible && state.collapsed) callOriginal(state, "show", dialog);
	state.collapsed = false;
	removeArrow(state, dialog);
	state.arrow?.remove();
	state.arrow = null;
	state.arrowBound = false;
	removeRestoreButton(dialog);
	for (const method of ["open", "show", "hide", "close", "delete"]) {
		if (dialog[method] === state.wrapped[method]) dialog[method] = state.original[method];
	}
	if (dialog._dialogOlControls === state) delete dialog._dialogOlControls;
	if (activeDialog === dialog) activeDialog = null;
	state.cleaning = false;
}

function stopButtonEvent(event) {
	event.stopPropagation();
}

function createArrow(state) {
	if (state.arrow) return state.arrow;
	state.arrow = document.createElement("button");
	state.arrow.type = "button";
	state.arrow.className = COLLAPSE_CLASS;
	state.arrow.setAttribute("aria-label", "收起窗口");
	state.arrow.title = "收起窗口";
	state.arrow.hidden = false;
	return state.arrow;
}

function bindArrow(dialog, state) {
	if (!state.arrow || state.arrowBound) return;
	for (const eventName of ["mousedown", "mouseup", "touchstart", "touchend", "pointerdown", "pointerup"]) {
		state.arrow.addEventListener(eventName, stopButtonEvent);
	}
	state.arrow.addEventListener("click", event => {
		event.preventDefault();
		event.stopPropagation();
		if (state.collapsed) return;
		state.collapsed = true;
		state.arrow.hidden = true;
		callOriginal(state, "hide", dialog);
		clearXinshaPromptLayout(state);
		const restore = getRestoreButton(state.windowElement, state.arena);
		restoreOwner = dialog;
		restore.hidden = false;
	});
	state.arrowBound = true;
}

function hasVisibleDialogBackground(dialog) {
	if (!dialog?.isConnected || dialog.classList.contains("no-background") || dialog.classList.contains("prompt")) return false;
	const rect = dialog.getBoundingClientRect();
	const collapsed = !!dialog._dialogOlControls?.collapsed;
	if ((!rect.width || !rect.height) && !collapsed) return false;
	// 打开动画首帧可能是 opacity:0，但有底图的窗口仍需在首帧安装收起入口。
	const opening = !dialog.classList.contains("hidden") && getComputedStyle(dialog).animationName.split(",").some(name => name.trim().startsWith("open-dialog"));
	const visible = style => style.display !== "none" && style.visibility !== "hidden" && (Number(style.opacity) > 0 || opening);
	const copyPaintStyle = style => ({
		display: style.display,
		visibility: style.visibility,
		opacity: style.opacity,
		content: style.content,
		backgroundImage: style.backgroundImage,
		backgroundColor: style.backgroundColor,
		borderImageSource: style.borderImageSource,
		borderImageSlice: style.borderImageSlice,
		borderStyle: style.borderStyle,
		borderImageWidth: style.borderImageWidth,
	});
	const readPaintStyle = pseudo => {
		if (!collapsed) return copyPaintStyle(pseudo ? getComputedStyle(dialog, pseudo) : getComputedStyle(dialog));
		const previousTransition = dialog.style.getPropertyValue("transition");
		const previousPriority = dialog.style.getPropertyPriority("transition");
		dialog.style.setProperty("transition", "none", "important");
		const style = pseudo ? getComputedStyle(dialog, pseudo) : getComputedStyle(dialog);
		const result = copyPaintStyle(style);
		if (previousTransition) dialog.style.setProperty("transition", previousTransition, previousPriority);
		else dialog.style.removeProperty("transition");
		return result;
	};
	const hasPaintedColor = color => {
		if (!color || color === "transparent") return false;
		const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/i);
		return !rgba || Number(rgba[1]) > 0;
	};
	const elementStyle = readPaintStyle();
	const elementVisible = collapsed ? elementStyle.visibility !== "hidden" : visible(elementStyle);
	if (elementVisible && (elementStyle.backgroundImage !== "none" || hasPaintedColor(elementStyle.backgroundColor))) return true;
	const before = readPaintStyle("::before");
	if (!visible(before) || before.content === "none" || before.content === "normal") return false;
	if (before.backgroundImage !== "none" || hasPaintedColor(before.backgroundColor)) return true;
	if (before.borderImageSource === "none" || before.borderStyle === "none") return false;
	if (before.borderImageSlice.includes("fill")) return true;
	const widths = before.borderImageWidth.split(/\s+/).map(value => parseFloat(value) || 0);
	return Math.max(widths[0] || 0, widths[2] || widths[0] || 0) > 0;
}

function hasDialogOlBackground(dialog, arena) {
	if (arena?.getAttribute("data-loading-style") !== "dialog_ol" && !usesXinshaControls(arena)) return true;
	return hasVisibleDialogBackground(dialog);
}

function installDialogHooks(dialog, state) {
	state.original = Object.fromEntries(["open", "show", "hide", "close", "delete"].map(method => [method, dialog[method]]));
	state.wrapped = {};
	if (typeof state.original.show === "function") state.wrapped.show = function (...args) {
		if (state.collapsed) {
			state.collapsed = false;
			state.arrow.hidden = false;
			hideRestoreButton();
		}
		const result = callOriginal(state, "show", this, args);
		syncXinshaPromptLayout(state);
		return result;
	};
	if (typeof state.original.hide === "function") state.wrapped.hide = function (...args) {
		const result = callOriginal(state, "hide", this, args);
		clearXinshaPromptLayout(state);
		if (!state.collapsed && restoreOwner === this) hideRestoreButton();
		return result;
	};
	if (typeof state.original.open === "function") state.wrapped.open = function (...args) {
		if (state.collapsed) {
			state.collapsed = false;
			state.arrow.hidden = false;
			hideRestoreButton();
		}
		return callOriginal(state, "open", this, args);
	};
	if (typeof state.original.close === "function") state.wrapped.close = function (...args) {
		cleanupDialog(this, state, false);
		return callOriginal(state, "close", this, args);
	};
	if (typeof state.original.delete === "function") state.wrapped.delete = function (...args) {
		cleanupDialog(this, state, false);
		return callOriginal(state, "delete", this, args);
	};
	for (const method of Object.keys(state.wrapped)) dialog[method] = state.wrapped[method];
	bindArrow(dialog, state);
}

function syncCaption(state, dialog) {
	if (typeof state.original.hide !== "function" || typeof state.original.show !== "function") {
		removeArrow(state, dialog);
		return;
	}
	if (usesXinshaControls(state.arena)) {
		// 原版挂在场景左下方，不能放进 caption；自由选将的筛选栏也不能改成标题。
		state.caption?.classList.remove(CAPTION_CLASS);
		state.caption = null;
		dialog.classList.remove(NO_CAPTION_CLASS);
		const arrow = createArrow(state);
		arrow.classList.add("dialog-xinsha-hide");
		arrow.setAttribute("aria-label", "隐藏弹窗");
		arrow.title = "隐藏弹窗";
		bindArrow(dialog, state);
		arrow.hidden = state.collapsed || dialog.classList.contains("hidden");
		const parent = state.windowElement || state.arena;
		if (parent && arrow.parentNode !== parent) parent.appendChild(arrow);
		if (parent) positionXinshaControl(arrow, parent);
		return;
	}
	const caption = dialog.querySelector(":scope > .content-container > .content > .caption, :scope > .content > .caption, :scope > .caption");
	if (state.caption !== caption) {
		state.caption?.classList.remove(CAPTION_CLASS);
		state.caption = caption;
	}
	if (caption) {
		caption.classList.add(CAPTION_CLASS);
		dialog.classList.remove(NO_CAPTION_CLASS);
	} else {
		dialog.classList.add(NO_CAPTION_CLASS);
	}
	createArrow(state);
	state.arrow.classList.remove("dialog-xinsha-hide");
	state.arrow.setAttribute("aria-label", "收起窗口");
	state.arrow.title = "收起窗口";
	clearXinshaControlPosition(state.arrow);
	bindArrow(dialog, state);
	state.arrow.hidden = state.collapsed;
	const parent = caption || dialog;
	if (state.arrow.parentNode !== parent) parent.appendChild(state.arrow);
}

function keepsDialogControls(dialog) {
	// 常驻展示框在另一个询问框成为 ui.dialog 时仍保留自己的收起入口。
	return !!dialog?._dialogOlKeepControls && dialog.isConnected && !dialog.classList.contains("removing");
}

export function syncDialogOlControls(dialog, arena, windowElement, update) {
	if (!dialog) {
		if (activeDialog?._dialogOlControls && !keepsDialogControls(activeDialog)) cleanupDialog(activeDialog, activeDialog._dialogOlControls, false);
		else if (!keepsDialogControls(restoreOwner)) hideRestoreButton();
		return;
	}
	if (activeDialog && activeDialog !== dialog && !keepsDialogControls(activeDialog)) cleanupDialog(activeDialog, activeDialog._dialogOlControls, false);
	syncDialogOlLayoutMarker(dialog, arena);
	const eligible = !!dialog.classList?.contains("dialog") && !dialog.classList.contains("removing") && hasDialogOlBackground(dialog, arena);
	if (restoreOwner && restoreOwner !== dialog && !keepsDialogControls(restoreOwner)) {
		hideRestoreButton();
	}
	if (restoreOwner === dialog && !eligible) cleanupDialog(dialog, dialog._dialogOlControls, true);
	if (!eligible) {
		if (dialog?._dialogOlControls) cleanupDialog(dialog, dialog._dialogOlControls, true);
		return;
	}
	let state = dialog._dialogOlControls;
	if (!state) {
		state = { dialog, arena, windowElement, update, collapsed: false, arrow: null, caption: null, original: null, wrapped: null, cleaning: false };
		dialog._dialogOlControls = state;
		installDialogHooks(dialog, state);
	}
	activeDialog = dialog;
	state.arena = arena;
	state.windowElement = windowElement;
	state.update = update;
	syncCaption(state, dialog);
	syncXinshaPromptLayout(state);
	if (state.collapsed) {
		const restore = getRestoreButton(windowElement, arena);
		restoreOwner = dialog;
		restore.hidden = false;
	} else if (restoreOwner === dialog) hideRestoreButton();
}
