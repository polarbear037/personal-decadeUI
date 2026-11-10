import { get, lib, ui, _status } from "noname";

const ACTIVE_CLASS = "faction-dialog-active";
const STYLE_ID = "decadeui-faction-dialog-interaction-style";
const HANDLER_KEY = "_decadeUIFactionDialogHandler";
const STATE_KEY = "_decadeUIFactionDialogState";
const activeStates = new WeakMap();
const buttonStates = new WeakMap();

function ensureStyle() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = `#arena.${ACTIVE_CLASS}>#dui-controls{display:none!important;}`;
	document.head.appendChild(style);
}

function getFaction(button) {
	const link = button?.link;
	return Array.isArray(link) && typeof link[2] === "string" && link[2].startsWith("group_") ? link[2] : null;
}

function getFactionButtons(dialog) {
	const buttons = Array.from(dialog?.buttons || []);
	return buttons.length > 0 && buttons.every(button => getFaction(button)) ? buttons : null;
}

function isLocalFactionSelection(dialog) {
	const event = get.event?.();
	if (!event || event.name !== "chooseButton" || event.dialog !== dialog || typeof event.isMine !== "function" || !event.isMine()) return false;
	const range = get.select?.(event.selectButton);
	if (!Array.isArray(range) || range[0] !== 1 || range[1] !== 1) return false;
	return dialog.parentNode === ui?.arena;
}

function removeFromSelection(button) {
	const selectedButtons = ui.selected?.buttons;
	if (!selectedButtons) return;
	if (typeof selectedButtons.remove === "function") selectedButtons.remove(button);
	else {
		const index = selectedButtons.indexOf(button);
		if (index !== -1) selectedButtons.splice(index, 1);
	}
}

function addToSelection(button) {
	const selectedButtons = ui.selected?.buttons;
	if (!selectedButtons) return false;
	if (typeof selectedButtons.add === "function") selectedButtons.add(button);
	else if (!selectedButtons.includes(button)) selectedButtons.push(button);
	return true;
}

function setControlsHidden(state, hidden) {
	const arena = hidden ? ui?.arena : state.arena;
	if (!arena) return;
	if (hidden) {
		if (state.arena && state.arena !== arena) setControlsHidden(state, false);
		state.arena = arena;
		let states = activeStates.get(arena);
		if (!states) activeStates.set(arena, (states = new Set()));
		states.add(state);
		arena.classList.add(ACTIVE_CLASS);
	} else {
		const states = activeStates.get(arena);
		states?.delete(state);
		if (!states?.size) {
			activeStates.delete(arena);
			arena.classList.remove(ACTIVE_CLASS);
		}
		state.arena = null;
	}
}

function isSelectable(button, event) {
	if (!button.classList.contains("selectable") || button.classList.contains("unselectable") || button.classList.contains("noclick")) return false;
	if (typeof lib.filter?.buttonIncluded === "function" && !lib.filter.buttonIncluded(button)) return false;
	return typeof event.filterButton === "function" && event.filterButton(button, event.player);
}

function isNativeClickBlocked(button) {
	return _status?.dragged || _status?.clicked || _status?.tempNoButton || _status?.draggingtouchdialog || _status?.justdragged || button.classList.contains("noclick");
}

function selectAndConfirm(dialog, button, state, event, domEvent) {
	if (state.confirmedEvent === event || state.closed || dialog.parentNode !== ui?.arena) {
		domEvent?.preventDefault?.();
		domEvent?.stopImmediatePropagation?.();
		return true;
	}
	const previousSelection = Array.from(dialog.buttons || []).map(factionButton => ({ button: factionButton, selected: factionButton.classList.contains("selected"), chosen: ui.selected?.buttons?.includes?.(factionButton) }));
	for (const item of previousSelection) {
		removeFromSelection(item.button);
		item.button.classList.remove("selected");
	}
	if (!addToSelection(button)) return false;
	button.classList.remove("selected");
	if (typeof event.filterOk === "function" && !event.filterOk()) {
		removeFromSelection(button);
		for (const item of previousSelection) {
			if (item.chosen) addToSelection(item.button);
			if (item.selected) item.button.classList.add("selected");
		}
		return false;
	}
	const confirmNode = ui.confirm?.firstChild;
	try {
		ui.click.ok(confirmNode);
	} catch {
		removeFromSelection(button);
		for (const item of previousSelection) {
			if (item.chosen) addToSelection(item.button);
			if (item.selected) item.button.classList.add("selected");
		}
		setControlsHidden(state, false);
		return false;
	}
	state.confirmedEvent = event;
	domEvent?.preventDefault?.();
	domEvent?.stopImmediatePropagation?.();
	return true;
}

function bindButton(dialog, button, state) {
	if (button[HANDLER_KEY]) return;
	const handler = domEvent => {
		if (isNativeClickBlocked(button)) return;
		if (state.closed || dialog.parentNode !== ui?.arena) {
			domEvent.preventDefault?.();
			domEvent.stopImmediatePropagation?.();
			return;
		}
		const event = get.event?.();
		if (!event || event.name !== "chooseButton" || event.dialog !== dialog || typeof event.isMine !== "function" || !event.isMine()) return;
		const range = get.select?.(event.selectButton);
		if (!Array.isArray(range) || range[0] !== 1 || range[1] !== 1 || !isSelectable(button, event) || typeof event.filterOk === "function" && !event.filterOk() || typeof ui.click?.ok !== "function") return;
		selectAndConfirm(dialog, button, state, event, domEvent);
	};
	button.addEventListener("click", handler, true);
	button.addEventListener("touchend", handler, true);
	button[HANDLER_KEY] = handler;
	buttonStates.set(button, { dialog, state });
}

function ensureButtonWrapper() {
	if (typeof ui.click?.button !== "function" || typeof ui.click?.ok !== "function") return false;
	if (ui.click.button._decadeUIFactionWrapper) return true;
	const original = ui.click.button;
	const wrapped = function (...args) {
		const binding = buttonStates.get(this);
		if (!binding || isNativeClickBlocked(this)) return original.apply(this, args);
		const { dialog, state } = binding;
		if (state.closed || dialog.parentNode !== ui?.arena) return;
		const event = get.event?.();
		if (!event || event.name !== "chooseButton" || event.dialog !== dialog || typeof event.isMine !== "function" || !event.isMine()) return original.apply(this, args);
		const range = get.select?.(event.selectButton);
		if (!Array.isArray(range) || range[0] !== 1 || range[1] !== 1 || !isSelectable(this, event) || typeof event.filterOk === "function" && !event.filterOk()) return original.apply(this, args);
		if (selectAndConfirm(dialog, this, state, event, null)) return;
		return original.apply(this, args);
	};
	wrapped._decadeUIFactionWrapper = true;
	ui.click.button = wrapped;
	return true;
}

function syncControls(dialog, state) {
	setControlsHidden(state, state.ready && isLocalFactionSelection(dialog));
}

function applyFactionDialogInteraction(dialog) {
	const buttons = getFactionButtons(dialog);
	if (!buttons) return dialog;
	ensureStyle();
	if (dialog[STATE_KEY]) return dialog;
	const state = { arena: null, ready: ensureButtonWrapper(), closed: dialog.parentNode !== ui?.arena, confirmedEvent: null };
	dialog[STATE_KEY] = state;
	for (const button of buttons) bindButton(dialog, button, state);
	const open = dialog.open;
	const close = dialog.close;
	if (typeof open === "function") {
		dialog.open = function (...args) {
			state.closed = false;
			state.ready = ensureButtonWrapper();
			const result = open.apply(this, args);
			syncControls(this, state);
			queueMicrotask(() => syncControls(this, state));
			return result;
		};
	}
	if (typeof close === "function") {
		dialog.close = function (...args) {
			setControlsHidden(state, false);
			state.closed = true;
			return close.apply(this, args);
		};
	}
	syncControls(dialog, state);
	return dialog;
}

export { applyFactionDialogInteraction };
