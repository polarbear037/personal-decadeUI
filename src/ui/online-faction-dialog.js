import { game, get, lib, ui } from "noname";

const FACTION_PROMPT = "请决定神武将的所属势力（本局内不可更改）";
const STANDARD_FACTIONS = new Set(["wei", "shu", "wu", "qun", "jin"]);
const PROGRESS_BAR_ID = "online-faction-progress";

function getFaction(button) {
	const link = button?.link;
	return Array.isArray(link) && typeof link[2] === "string" && link[2].startsWith("group_") ? link[2].slice(6) : null;
}

function isFactionDialog(dialog) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI") return false;
	const buttons = Array.isArray(dialog?.buttons) ? dialog.buttons : [];
	return buttons.length > 0 && buttons.every(button => getFaction(button));
}

function hideNativeButtonContent(button) {
	for (const child of Array.from(button.children || [])) {
		child.classList.add("online-faction-native-hidden");
	}
}

function applyFactionButton(button, group) {
	// 势力选择只复用 vcard 的 link 和点击逻辑，不参与卡牌、暗牌的后续刷新。
	button.classList.remove("card", "infohidden", "infoflip", "decade-card");
	button.classList.add("online-faction-button");
	hideNativeButtonContent(button);
	const assetName = STANDARD_FACTIONS.has(group) ? group : "x";
	// CSS 变量中的相对 URL 会按使用它的样式表目录解析，必须先固定为绝对 URL。
	const assetPath = new URL(`${lib.assetURL}extension/十周年UI/ui/assets/lbtn/OL_line/uibutton/select_country_${assetName}.png`, document.baseURI).href;
	button.style.setProperty("--online-faction-image", `url("${assetPath}")`);
	button.style.removeProperty("background-image");
	if (!STANDARD_FACTIONS.has(group)) {
		const label = document.createElement("span");
		label.className = "online-faction-label";
		label.textContent = get.translation(group);
		button.appendChild(label);
	}
}

function showPrompt(state) {
	const decade = window.decadeUI;
	if (typeof decade?.showHandTip !== "function") return;
	closePrompt(state);
	const tip = decade.showHandTip();
	if (!tip) return;
	tip._onlineFactionTip = true;
	tip.classList.add("online-faction-hand-tip");
	tip.appendText?.(FACTION_PROMPT);
	tip.strokeText?.();
	tip.show?.();
	state.tip = tip;
}

function startProgress(state) {
	if (state.progress || lib.config.extension_十周年UI_jindutiaoYangshi === "0" || typeof game.Jindutiaoplayer !== "function") return;
	const progress = game.Jindutiaoplayer({ id: PROGRESS_BAR_ID, parent: ui.arena });
	const bar = progress?.bar;
	if (!bar) return;
	const originalWidth = parseFloat(bar.style.width) || bar.offsetWidth || bar.getBoundingClientRect().width;
	if (originalWidth > 0) bar.style.setProperty("--online-faction-progress-width", `${originalWidth}px`);
	bar.classList.add("online-faction-progress");
	if (originalWidth > 0) {
		const availableWidth = Math.max(0, window.innerWidth - 24);
		let scale = Math.min(1, Math.max(0, availableWidth / originalWidth));
		bar.style.setProperty("--online-faction-progress-scale", String(scale));
		const actualWidth = bar.getBoundingClientRect().width;
		if (actualWidth > availableWidth + 1) {
			scale *= availableWidth / actualWidth;
			bar.style.setProperty("--online-faction-progress-scale", String(scale));
		}
	}
	state.progress = progress;
}

function stopProgress(state) {
	const progress = state.progress;
	if (!progress) return;
	progress.dispose?.();
	state.progress = null;
}

function closePrompt(state) {
	if (state.tip) {
		state.tip.classList.remove("online-faction-hand-tip");
		state.tip.close?.();
	}
	state.tip = null;
}

function showFactionState(dialog, state) {
	if (state.closed || dialog.parentNode !== ui?.arena) return;
	showPrompt(state);
	startProgress(state);
}

function bindLifecycle(dialog) {
	const state = { closed: false, tip: null, progress: null };
	const open = dialog.open;
	const close = dialog.close;
	if (typeof open === "function") {
		dialog.open = function (...args) {
			state.closed = false;
			const result = open.apply(this, args);
			showFactionState(this, state);
			return result;
		};
	}
	if (typeof close === "function") {
		dialog.close = function (...args) {
			state.closed = true;
			closePrompt(state);
			stopProgress(state);
			return close.apply(this, args);
		};
	}
	if (dialog.parentNode === ui?.arena) {
		showFactionState(dialog, state);
	}
}

function applyOnlineFactionDialog(dialog) {
	if (!isFactionDialog(dialog) || dialog.classList.contains("online-faction-dialog")) return dialog;
	dialog.id = "online-faction-dialog";
	dialog.classList.add("online-faction-dialog");
	dialog.style.setProperty("--online-faction-count", String(dialog.buttons.length));
	dialog.style.background = "transparent";
	dialog.style.backgroundImage = "none";
	for (const caption of dialog.querySelectorAll(".caption")) caption.classList.add("online-faction-native-hidden");
	for (const button of dialog.buttons) applyFactionButton(button, getFaction(button));
	bindLifecycle(dialog);
	return dialog;
}

export { applyOnlineFactionDialog };
