import { releaseDialogOlLayout as releaseDialogOlLayout, syncDialogOlLayoutMarker as syncDialogOlLayoutMarker } from "./dialog-ol-layout.js";

const RESTORE_CLASS = "dialog-ol-restore";
const CAPTION_CLASS = "dialog-ol-caption";
const COLLAPSE_CLASS = "dialog-ol-collapse";
const NO_CAPTION_CLASS = "dialog-ol-controls-no-caption";
let restoreButton;
let restoreOwner;
let activeDialog;

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
	if (arena?.getAttribute("data-loading-style") !== "dialog_ol") return true;
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
		return callOriginal(state, "show", this, args);
	};
	if (typeof state.original.hide === "function") state.wrapped.hide = function (...args) {
		const result = callOriginal(state, "hide", this, args);
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
	if (state.collapsed) {
		const restore = getRestoreButton(windowElement, arena);
		restoreOwner = dialog;
		restore.hidden = false;
	} else if (restoreOwner === dialog) hideRestoreButton();
}
