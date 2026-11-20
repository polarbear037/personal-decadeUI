import { lib, ui, _status } from "noname";

const cardWindowEvents = new Set(["chooseButton", "choosePlayerCard", "gainPlayerCard", "discardPlayerCard"]);
const markedControls = new Set();
let owner, resize, mutations, frame = 0, installed = false;

function setProperty(node, key, value) {
	if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value);
}

function clear() {
	for (const control of markedControls) {
		delete control.dataset.yjcmAction;
		for (const node of control.children) delete node.dataset.yjcmCancel;
	}
	markedControls.clear();
	if (owner) delete owner.dataset.xinshaActionButtons;
	if (resize?.dialog) { resize.unobserve(resize.dialog); resize.dialog = null; }
	owner = null;
	if (ui.control) {
		delete ui.control.dataset.xinshaAction;
		for (const key of ["--yjcm-action-left", "--yjcm-action-bottom", "--yjcm-action-unit", "--yjcm-action-gap", "--yjcm-action-columns"]) ui.control.style.removeProperty(key);
	}
}

function getCardWindow(event) {
	if (!cardWindowEvents.has(event?.name)) return null;
	const dialog = event.dialog?.nodeType === 1 ? event.dialog : ui.dialog;
	if (!dialog?.isConnected || dialog.classList.contains("removing") || dialog.classList.contains("lei-yijiang-sc-closing") ||
		typeof dialog.getCurrentCapt === "function" || dialog.matches(".xinsha-faction-dialog,.online-faction-dialog,.character,.bosscharacter") ||
		dialog.querySelector(".button.character") || !dialog.querySelector(".button.card,.button.vcard,.buttons>.card,.lei-yijiang-sc-h,.handcards")) return null;
	return dialog;
}

function positionWindow(dialog) {
	// windowSnitch.initUI：按钮组 CENTER_BOTTOM(width/2,40)，间距50；原节点留在本体确认栏。
	if (dialog._dialogOlControls?.collapsed || dialog.hidden || dialog.classList.contains("hidden")) return;
	const box = dialog.getBoundingClientRect(), arena = ui.arena.getBoundingClientRect();
	const viewport = ui.window.getBoundingClientRect();
	const zoom = arena.height / ui.arena.clientHeight || 1;
	const style = getComputedStyle(dialog);
	const opening = style.animationName.split(",").some(name => name.trim() === "open-dialog-xinsha") ? parseFloat(style.scale) || 1 : 1;
	const scale = dialog.id === "lei-yijiang-player-card-dialog" ? box.width / opening / 1696 : Math.min(viewport.width / 1334, viewport.height / 750);
	if (!(scale > 0 && box.height > 0)) return;
	const bottom = box.top + box.height / 2 + box.height / opening / 2;
	// 关闭官方窗口框的配置仍可使用圆角按钮；旧框没有底部留白，按钮放在正文下方。
	const inset = dialog.classList.contains("dialog-ol-layout") || dialog.id === "lei-yijiang-player-card-dialog" || dialog.dataset.olLayout === "card-move" ? 40 : -74;
	setProperty(ui.control, "--yjcm-action-left", `${(box.left + box.width / 2 - arena.left) / zoom}px`);
	setProperty(ui.control, "--yjcm-action-bottom", `${(arena.bottom - bottom + inset * scale) / zoom}px`);
	setProperty(ui.control, "--yjcm-action-unit", `${scale / zoom}px`);
}

export function syncXinshaActionButtons() {
	if (!ui.control || !ui.arena) return;
	const event = _status.event;
	const enabled = lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && !_status.over && !ui.arena.classList.contains("choose-character");
	const dialog = enabled && getCardWindow(event);
	const multi = enabled && event?.name === "chooseControl" && !event.sortcard;
	const controls = Array.from(ui.control.children).filter(control => !control.stayleft && !control.matches(".closing,.removing,.hidden,.yjcm-end-turn") &&
		(multi ? Array.from(control.children).some(node => event.controls?.includes(node.link)) : dialog && (control === ui.confirm || Array.from(control.children).some(node => node.link === "ok" || node.link === "cancel"))));
	if (!controls.length) { clear(); return; }
	const flow = multi ? "multi" : "window";
	for (const control of markedControls) {
		if (controls.includes(control)) continue;
		delete control.dataset.yjcmAction;
		for (const node of control.children) delete node.dataset.yjcmCancel;
		markedControls.delete(control);
	}
	if (owner && owner !== dialog) delete owner.dataset.xinshaActionButtons;
	owner = dialog || null;
	if (owner) owner.dataset.xinshaActionButtons = "window";
	if (ui.control.dataset.xinshaAction !== flow) ui.control.dataset.xinshaAction = flow;
	let count = 0;
	for (const control of controls) {
		markedControls.add(control);
		if (control.dataset.yjcmAction !== flow) control.dataset.yjcmAction = flow;
		for (const node of control.children) {
			// 使用本体语义 link，不按显示文字猜测按钮用途。
			const cancel = node.link === "cancel" || node.link === "cancel2";
			if (node.dataset.yjcmCancel !== String(cancel)) node.dataset.yjcmCancel = String(cancel);
			count++;
		}
	}
	if (multi) {
		// SpellMultiSelectorBtnBar：两项间隔75，其余25，最多六列、行距10。
		setProperty(ui.control, "--yjcm-action-gap", count === 2 ? "75" : "25");
		setProperty(ui.control, "--yjcm-action-columns", String(Math.min(count, 6)));
	} else positionWindow(dialog);
	if (resize && owner !== resize.dialog) {
		if (resize.dialog) resize.unobserve(resize.dialog);
		resize.dialog = owner;
		if (owner) resize.observe(owner);
	}
}

export function initXinshaActionButtons() {
	if (installed) return;
	installed = true;
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(() => { frame = 0; syncXinshaActionButtons(); });
	};
	const update = ui.updatec;
	ui.updatec = function (...args) {
		syncXinshaActionButtons();
		return update.apply(this, args);
	};
	lib.hooks.checkEnd.add(syncXinshaActionButtons);
	lib.announce.subscribe("Noname.Game.Event.Changed", schedule);
	lib.onover.push(() => { cancelAnimationFrame(frame); frame = 0; clear(); });
	lib.arenaReady.push(() => {
		resize = new ResizeObserver(schedule);
		resize.observe(ui.window);
		resize.observe(ui.arena);
		mutations = new MutationObserver(records => {
			if (records.some(record => record.type === "childList" && (record.target === ui.control || ui.control.contains(record.target) || record.target === ui.arena) ||
				record.type === "attributes" && (record.target === owner || record.target === ui.arena || record.target.parentElement === ui.control))) schedule();
		});
		mutations.observe(ui.arena, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
		schedule();
	});
}
