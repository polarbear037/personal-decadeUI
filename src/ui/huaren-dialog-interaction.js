import { get, lib, ui, _status } from "noname";

const STATE_KEY = "_decadeUIHuarenDialogState";
const WRAPPED_CONFIRM_KEY = "_decadeUIHuarenConfirmWrapper";
let checkEndHookInstalled = false;
let waitingForConfirm = false;
const pendingConfirms = new Map();

function getCurrentEvent() {
	return typeof get.event === "function" ? get.event() : _status?.event;
}

function isHuarenEvent(event, dialog) {
	if (!event || dialog?._decadeUIHuarenClosed || event.name !== "chooseButton" || event.dialog !== dialog || typeof event.isMine !== "function" || !event.isMine()) return false;
	let current = event;
	for (let i = 0; i < 5 && current; i++) {
		if (current.skill === "huaren") return true;
		current = typeof current.getParent === "function" ? current.getParent() : null;
	}
	return false;
}

function getButtonNode(confirm, name, fallback) {
	const namedNode = confirm?.node?.[name];
	if (namedNode) return namedNode;
	const fallbackNode = confirm?.[fallback];
	if (fallback === "firstChild" && fallbackNode?.link !== "ok") return null;
	return fallbackNode || null;
}

function restoreConfirm(confirm) {
	const state = confirm?._decadeUIHuarenConfirmState;
	if (!state) return;
	const { ok, hidden, ariaHidden, display, displayPriority } = state;
	if (ok) {
		ok.hidden = hidden;
		if (display) ok.style.setProperty("display", display, displayPriority);
		else ok.style.removeProperty("display");
		if (ariaHidden == null) ok.removeAttribute("aria-hidden");
		else ok.setAttribute("aria-hidden", ariaHidden);
	}
	delete confirm._decadeUIHuarenConfirmState;
}

function hidePendingConfirm(confirm) {
	if (!confirm) return;
	if (!pendingConfirms.has(confirm)) {
		pendingConfirms.set(confirm, {
			display: confirm.style.getPropertyValue("display"),
			priority: confirm.style.getPropertyPriority("display"),
		});
	}
	confirm.style.setProperty("display", "none", "important");
}

function restorePendingConfirms() {
	for (const [confirm, { display, priority }] of pendingConfirms) {
		if (display) confirm.style.setProperty("display", display, priority);
		else confirm.style.removeProperty("display");
		restoreConfirm(confirm);
	}
	pendingConfirms.clear();
	waitingForConfirm = false;
}

function syncConfirm() {
	const confirm = ui.confirm;
	const event = getCurrentEvent();
	if (!confirm) return;
	const dialog = event?.dialog;
	if (!isHuarenEvent(event, dialog)) {
		if (waitingForConfirm) {
			hidePendingConfirm(confirm);
			return;
		}
		restoreConfirm(confirm);
		return;
	}
	// 新一轮化刃可以重新显示取消，不沿用上一轮的关闭状态。
	if (waitingForConfirm) restorePendingConfirms();
	dialog._decadeUIHuarenConfirm = confirm;
	const ok = getButtonNode(confirm, "ok", "firstChild");
	if (!ok) return;
	if (!confirm._decadeUIHuarenConfirmState) {
		confirm._decadeUIHuarenConfirmState = {
			dialog,
			ok,
			hidden: !!ok.hidden,
			ariaHidden: ok.getAttribute("aria-hidden"),
			display: ok.style.getPropertyValue("display"),
			displayPriority: ok.style.getPropertyPriority("display"),
		};
	}
	ok.hidden = true;
	ok.style.setProperty("display", "none", "important");
	ok.setAttribute("aria-hidden", "true");
}

function removeSelected(button) {
	const selected = ui.selected?.buttons;
	if (!selected) return;
	if (typeof selected.remove === "function") selected.remove(button);
	else {
		const index = selected.indexOf(button);
		if (index !== -1) selected.splice(index, 1);
	}
}

function addSelected(button) {
	const selected = ui.selected?.buttons;
	if (!selected) return false;
	if (typeof selected.add === "function") selected.add(button);
	else if (!selected.includes(button)) selected.push(button);
	return true;
}

function canSelect(button, event) {
	if (!button?.classList.contains("selectable") || button.classList.contains("unselectable") || button.classList.contains("noclick")) return false;
	if (typeof lib.filter?.buttonIncluded === "function" && !lib.filter.buttonIncluded(button)) return false;
	return typeof event.filterButton !== "function" || event.filterButton(button, event.player);
}

function selectAndConfirm(dialog, button, event, domEvent) {
	if (!canSelect(button, event) || typeof ui.click?.ok !== "function") return false;
	const previous = Array.from(dialog.buttons || []).map(item => ({
		button: item,
		selected: item.classList.contains("selected"),
		chosen: ui.selected?.buttons?.includes?.(item),
	}));
	for (const item of previous) {
		removeSelected(item.button);
		item.button.classList.remove("selected");
	}
	if (!addSelected(button)) return false;
	button.classList.add("selected");
	if (typeof event.filterOk === "function" && !event.filterOk()) {
		removeSelected(button);
		button.classList.remove("selected");
		for (const item of previous) {
			if (item.chosen) addSelected(item.button);
			if (item.selected) item.button.classList.add("selected");
		}
		return false;
	}
	try {
		ui.click.ok(getButtonNode(ui.confirm, "ok", "firstChild"));
	} catch {
		removeSelected(button);
		button.classList.remove("selected");
		for (const item of previous) {
			if (item.chosen) addSelected(item.button);
			if (item.selected) item.button.classList.add("selected");
		}
		return false;
	}
	domEvent?.preventDefault?.();
	domEvent?.stopImmediatePropagation?.();
	return true;
}

function isBlocked(button) {
	return _status?.dragged || _status?.clicked || _status?.tempNoButton || _status?.draggingtouchdialog || _status?.justdragged || button.classList.contains("noclick");
}

function bindButton(dialog, button) {
	if (button[STATE_KEY]) return;
	const handler = domEvent => {
		if (isBlocked(button)) return;
		const event = getCurrentEvent();
		if (!isHuarenEvent(event, dialog)) return;
		const range = get.select?.(event.selectButton);
		if (!Array.isArray(range) || range[0] !== 1 || range[1] !== 1) return;
		selectAndConfirm(dialog, button, event, domEvent);
	};
	button.addEventListener("click", handler, true);
	button.addEventListener("touchend", handler, true);
	button[STATE_KEY] = handler;
}

function wrapConfirm() {
	if (typeof ui.create?.confirm !== "function" || ui.create.confirm[WRAPPED_CONFIRM_KEY]) return;
	const original = ui.create.confirm;
	const wrapped = function (...args) {
		const result = original.apply(this, args);
		const str = args[0];
		// 引擎在目标已选中时通常只传 "o"；OL 皮肤仍保留确定、取消两个节点。
		// 不能等待 "oc"，否则神御等后续目标选择会一直继承隐藏状态。
		if (waitingForConfirm && typeof str === "string" && str.includes("o") && !isHuarenEvent(getCurrentEvent(), getCurrentEvent()?.dialog)) {
			restorePendingConfirms();
		}
		syncConfirm();
		return result;
	};
	wrapped[WRAPPED_CONFIRM_KEY] = true;
	ui.create.confirm = wrapped;
}

function installCheckEndHook() {
	if (checkEndHookInstalled || !Array.isArray(lib.hooks?.checkEnd)) return;
	lib.hooks.checkEnd.push(() => syncConfirm());
	checkEndHookInstalled = true;
}

function bindCloseLifecycle(dialog) {
	if (!dialog || dialog._decadeUIHuarenCloseBound) return;
	dialog._decadeUIHuarenCloseBound = true;
	for (const method of ["close", "delete"]) {
		const original = dialog[method];
		if (typeof original !== "function") continue;
		dialog[method] = function (...args) {
			const confirm = this._decadeUIHuarenConfirm;
			if (confirm || isHuarenEvent(getCurrentEvent(), this)) {
				this._decadeUIHuarenClosed = true;
				waitingForConfirm = true;
				hidePendingConfirm(confirm || ui.confirm);
				delete this._decadeUIHuarenConfirm;
			}
			return original.apply(this, args);
		};
	}
	const open = dialog.open;
	if (typeof open === "function") dialog.open = function (...args) {
		delete this._decadeUIHuarenClosed;
		return open.apply(this, args);
	};
}

export function applyHuarenDialogInteraction(dialog) {
	wrapConfirm();
	installCheckEndHook();
	bindCloseLifecycle(dialog);
	for (const button of dialog?.buttons || []) bindButton(dialog, button);
	return dialog;
}
