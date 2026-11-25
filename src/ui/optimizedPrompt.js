import { lib, game, ui, get, _status } from "noname";
import { plainPrompt, skillNameForPrompt, buildOfficialPrompt, renderOfficialPrompt } from "./officialPrompt.js";
import { syncOfficialPlayerPopups } from "./officialPlayerPopup.js";
import { isSkillPromptSimplified, getSimplifiedSkillPrompt } from "./simplifiedSkillPrompt.js";
import { getOptimizedPromptStyle, optimizePromptKey } from "./promptStyle.js";
import { buildXinshaPrompt, renderXinshaPrompt } from "./xinshaPrompt.js";

const configKey = optimizePromptKey;
const dialogs = new Map();
const combinedDetails = new WeakMap();
let activeState = null;
let handTip = null;
let tipText = "";
let checkedEvent = null;
let hooksInstalled = false;
const choiceEvents = new Set(["chooseBool", "chooseCard", "chooseTarget", "chooseCardTarget", "chooseButton", "chooseControl", "chooseToUse", "chooseToRespond", "chooseToDiscard", "choosePlayerCard", "chooseToCompare", "chooseToCompareMultiple"]);
const interactiveSelector = ".popup,.button,.buttons,input,button,select,textarea,a,[onclick],[contenteditable]";

function getParentEvent(event) {
	try {
		return event?.getParent?.() || event?.parent;
	} catch (error) {
		return event?.parent;
	}
}

function getPromptSkill(event) {
	const seen = new Set();
	for (let depth = 0; event && depth < 32 && !seen.has(event); depth++) {
		seen.add(event);
		// 游戏主流程和阶段不是技能，也不能跨过它们借用更外层的技能名称。
		if (event.name === "game" || event.name === "phase" || /^phase(?:Zhunbei|Judge|Draw|Use|Discard|Jieshu)(?:Before|Begin|End|After)?$/.test(event.name)) break;
		for (const value of [event.skill, event.sourceSkill, event.hsskill, event.hiddenSkill]) {
			const skill = Array.isArray(value) ? value.find(id => typeof id === "string" && id) : value;
			if (typeof skill === "string" && skill) return skill;
		}
		if (!choiceEvents.has(event.name) && typeof lib.skill?.[event.name] === "object" && lib.skill[event.name]) return event.name;
		event = getParentEvent(event);
	}
	return null;
}

function isCharacterChoice(event) {
	if (ui.arena?.classList.contains("choose-character")) return true;
	const seen = new Set();
	for (let depth = 0; event && depth < 32 && !seen.has(event); depth++) {
		seen.add(event);
		if (/^chooseCharacter/.test(event.name)) return true;
		event = getParentEvent(event);
	}
	return false;
}

function getPromptEvent() {
	const event = _status.event;
	const xinshaPlayerCard = event?.name === "gainPlayerCard" && getOptimizedPromptStyle() === "xinsha";
	if (!event || event.finished || _status.auto || _status.video || (!choiceEvents.has(event.name) && !xinshaPlayerCard && event.prompt == null && event.prompt2 == null)) return null;
	// 开局选将、自由选将复用 chooseButton，但保留各自的原生标题和计数。
	if (isCharacterChoice(event)) return null;
	if (typeof event.isMine === "function" ? !event.isMine() : !event.player || event.player !== game.me) return null;
	return choiceEvents.has(event.name) || xinshaPlayerCard || getPromptSkill(event) || event.type === "wuxie" ? event : null;
}

function getState(dialog, event) {
	let state = dialogs.get(dialog);
	if (!state && event && dialog.content) {
		state = { dialog, event, mainNodes: new Set(), detailNodes: new Set(), progressNodes: new Set(), addingDetail: 0, embeddedDetails: [] };
		dialogs.set(dialog, state);
	}
	return state;
}

function markNode(state, node, detail) {
	if (!node || node.parentNode !== state.dialog.content || node.matches?.(interactiveSelector) || node.querySelector(interactiveSelector)) return;
	const progress = detail === "progress";
	if (progress) {
		state.mainNodes.delete(node);
		state.detailNodes.delete(node);
		node.classList.remove("decade-optimized-main", "decade-optimized-detail");
	} else if (state.progressNodes.has(node)) return;
	(progress ? state.progressNodes : detail ? state.detailNodes : state.mainNodes).add(node);
	node.classList.add(progress ? "decade-optimized-progress" : detail ? "decade-optimized-detail" : "decade-optimized-main");
}

function prepareOptimizedPrompt(dialog) {
	// close() 后 DOM 仍会保留到退出动画结束，此时不能重新接管或恢复原文。
	if (dialog.classList.contains("removing")) return;
	dialog.classList.remove("decade-optimized-closing");
	// chooseButton 等流程允许先创建 dialog，再把它交给本地选择事件。
	const event = getPromptEvent();
	const state = getState(dialog, event);
	if (!state) return;
	if (event) state.event = event;
	const first = dialog.content.firstElementChild;
	if (!state.mainNodes.size && state.event.prompt !== false && first?.classList.contains("caption") && !first.querySelector(interactiveSelector)) markNode(state, first, false);
	for (const node of dialog.content.children) {
		if (node === state.event.promptbar || /^(?:\d+|∞)\s*\/\s*(?:\d+|NaN|∞)$/.test(node.textContent.trim())) {
			markNode(state, node, "progress");
		} else if (!state.mainNodes.size && typeof state.event.prompt === "string" && node.textContent.trim() === plainPrompt(state.event.prompt)) {
			markNode(state, node, false);
		}
	}
	// 自定义窗口可能先拆开 ###标题###说明，再分别创建节点，未经过 dialog.add。
	// 从原事件补回同一说明来源，仍只接管内容匹配且不含交互控件的节点。
	const embeddedDetail = typeof state.event.prompt === "string" && /^###.*?###([\s\S]*)$/.exec(state.event.prompt)?.[1];
	for (const text of [...(combinedDetails.get(dialog) || []), embeddedDetail, state.event.prompt2]) {
		if (typeof text !== "string" || !text) continue;
		const holder = document.createElement("div");
		holder.innerHTML = text;
		for (const node of dialog.content.children) {
			if (!state.mainNodes.has(node) && node.textContent === holder.textContent) markNode(state, node, true);
		}
	}
}

function addOptimizedPrompt(original, item, ...args) {
	if (typeof item === "string" && item.startsWith("###")) {
		const details = combinedDetails.get(this) || new Set();
		details.add(item.slice(3).split("###")[1]);
		combinedDetails.set(this, details);
	}
	const state = getState(this, getPromptEvent());
	const firstItem = !this.content?.childNodes.length;
	const embedded = state && typeof item === "string" && item.startsWith("###");
	if (embedded) state.embeddedDetails.push(item.slice(3).split("###")[1]);
	let result;
	try {
		result = original.call(this, item, ...args);
	} finally {
		if (embedded) state.embeddedDetails.pop();
	}
	if (state && typeof item === "string" && !item.startsWith("###")) {
		const detail = state.addingDetail > 0 || item === state.event.prompt2;
		const main = item === state.event.prompt || (firstItem && state.event.prompt !== false && result?.classList?.contains("caption") && !result.querySelector(".text,.popup,.button,input,button"));
		if (detail || main) markNode(state, result, detail);
	}
	refreshOptimizedPrompt();
	return result;
}

function addOptimizedPromptText(original, item, ...args) {
	const state = getState(this, getPromptEvent());
	const detail = state && typeof item === "string" && (item === state.event.prompt2 || state.embeddedDetails.includes(item));
	if (detail) state.addingDetail++;
	try {
		return original.call(this, item, ...args);
	} finally {
		if (detail) state.addingDetail--;
		refreshOptimizedPrompt();
	}
}

function isOpen(dialog) {
	return dialog.parentNode === ui.arena && ui.dialogs?.includes(dialog) && !dialog.classList.contains("hidden") && !dialog.classList.contains("removing") && dialog.style.display !== "none";
}

function getMainText(state) {
	let text = Array.from(state.mainNodes).filter(node => node.parentNode === state.dialog.content && !state.detailNodes.has(node)).map(node => node.textContent).join("").trim();
	if (state.event.prompt === false) return text;
	if (state.event.type === "wuxie") return /是否.*无懈可击/.test(text) ? text : `${text}${text ? " " : ""}是否使用【无懈可击】？`;
	const skill = getPromptSkill(state.event);
	if (skill) {
		const name = skillNameForPrompt(skill, state.event.player);
		if (name && (!text || text === name)) text = `是否发动“${name}”？`;
	}
	return text;
}

function getMainMarkup(state) {
	return Array.from(state.mainNodes).filter(node => node.parentNode === state.dialog.content && !state.detailNodes.has(node)).map(node => node.innerHTML).join("");
}

function getDetailText(state) {
	return Array.from(state.detailNodes).filter(node => node.parentNode === state.dialog.content).map(node => node.textContent).join("\n").trim();
}

function closeHandTip() {
	const tip = handTip;
	handTip = null;
	activeState = null;
	tipText = "";
	if (ui.arena) delete ui.arena.dataset.decadeOptimizedActive;
	if (tip) {
		// 先关闭并清空正文、描边，再撤销美化样式，所有提示风格共用同一退出顺序。
		tip.close?.();
		tip.classList.remove("decade-optimized-hand-tip");
		delete tip.dataset.officialPromptMode;
		delete tip.dataset.officialSkillId;
		delete tip.dataset.officialPromptField;
		delete tip.dataset.optimizedPromptStyle;
	}
}

function restoreNativePrompt(dialog, retiring) {
	// 先锁住退出中的弹窗，再清理接管标记；复用时由 prepareOptimizedPrompt 解除。
	// 常驻展示框由自身生命周期关闭；切入选牌子事件不代表拼点等展示已经退场。
	const persistent = dialog._dialogOlKeepControls && dialog.isConnected && ui.dialogs?.includes(dialog) && !dialog.classList.contains("removing");
	if (persistent) dialog.classList.remove("decade-optimized-closing");
	else if (retiring && dialog.dataset.decadeOptimizedPrompt) dialog.classList.add("decade-optimized-closing");
	delete dialog.dataset.decadeOptimizedPrompt;
	delete dialog.dataset.decadeOptimizedEmpty;
}

function restoreNativePrompts() {
	const event = getPromptEvent();
	for (const { dialog, event: owner } of dialogs.values()) {
		restoreNativePrompt(dialog, dialog.classList.contains("removing") || getOptimizedPromptStyle() !== "off" && owner !== event);
	}
}

function deactivateOptimizedPrompt() {
	closeHandTip();
	restoreNativePrompts();
	return false;
}

function refreshOptimizedPrompt() {
	syncOfficialPlayerPopups();
	const currentEvent = getPromptEvent();
	const style = getOptimizedPromptStyle();
	const enabled = (style !== "off" || isSkillPromptSimplified() && currentEvent && getPromptSkill(currentEvent)) && typeof window.decadeUI?.showHandTip === "function";
	if (currentEvent) {
		// 同时接管本体的普通 dialog、openskilldialog 和后添加的 promptbar。
		const sources = new Set([currentEvent.dialog, currentEvent.skillDialog]);
		const top = ui.dialogs?.find(isOpen);
		if (top?.classList.contains("prompt") && !dialogs.has(top)) sources.add(top);
		for (const state of dialogs.values()) if (state.event === currentEvent) sources.add(state.dialog);
		for (const dialog of sources) if (dialog?.content) prepareOptimizedPrompt(dialog);
	}
	for (const state of dialogs.values()) {
		const { dialog, mainNodes, detailNodes, progressNodes } = state;
		const markedNodes = [...mainNodes, ...detailNodes, ...progressNodes];
		const marked = markedNodes.some(node => node.parentNode === dialog.content);
		// 只有能提供替代文字时才隐藏原提示，避免只剩确认/取消按钮。
		if (enabled && currentEvent && marked && !dialog.classList.contains("dialog-ol-skill-prompt") && (getMainText(state) || state.event === currentEvent && progressNodes.size)) {
			dialog.dataset.decadeOptimizedPrompt = "skill";
			const remaining = Array.from(dialog.content.childNodes).some(node => !markedNodes.includes(node) && (node.nodeType === 1 || node.textContent.trim()));
			if (remaining || dialog.buttons?.length || dialog.forcebutton) delete dialog.dataset.decadeOptimizedEmpty;
			else dialog.dataset.decadeOptimizedEmpty = "true";
		} else {
			restoreNativePrompt(dialog, dialog.classList.contains("removing") || enabled && state.event !== currentEvent);
		}
	}
	const topDialog = ui.dialogs?.find(isOpen);
	const state = enabled && currentEvent && dialogs.get(topDialog);
	// 原生选牌/目标流程经常没有 dialog，只能从本体 check 钩子取得当前操作。
	const event = state?.event || (enabled && currentEvent && (checkedEvent === currentEvent || _status.imchoosing) ? currentEvent : null);
	// 势力专用窗口已提供提示，不能再从原生 caption 生成第二份 hand-tip。
	if (!event || (topDialog && !state && topDialog !== event.dialog) || topDialog?.classList.contains("online-faction-dialog") || topDialog?.classList.contains("xinsha-faction-dialog") || topDialog?.classList.contains("dialog-ol-skill-prompt") || topDialog?.dataset.olLayout === "card-move" || ui.cardDialog?._isLuckyCardTip) {
		return deactivateOptimizedPrompt();
	}
	const rawMain = getSimplifiedSkillPrompt(event) ?? (state ? getMainText(state) : typeof event.prompt === "string" ? event.prompt : "");
	const buildPrompt = style === "xinsha" ? buildXinshaPrompt : buildOfficialPrompt;
	const prompt = event.prompt !== false || rawMain ? buildPrompt(event, rawMain, getPromptSkill(event), state ? getDetailText(state) : event.prompt2) : null;
	// 一将发动确认只绘制一类提示，完整说明仍保留在原事件与窗口节点中。
	if (prompt && lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && /^是否(?:对.*?)?发动[“【].+[”】][？?]?$/.test(prompt.main)) prompt.detail = "";
	if (!prompt) {
		return deactivateOptimizedPrompt();
	}
	const richMain = state ? getMainMarkup(state) : rawMain;
	const text = JSON.stringify([style, prompt, richMain]);
	const owner = state || event;
	if (activeState !== owner || !handTip || handTip.closed) {
		closeHandTip();
		handTip = window.decadeUI.showHandTip();
		activeState = owner;
		handTip?.classList.add("decade-optimized-hand-tip");
	}
	if (handTip && (text !== tipText || handTip.classList.contains("hidden"))) {
		handTip.dataset.optimizedPromptStyle = style === "xinsha" ? "xinsha" : "online";
		if (style === "xinsha") renderXinshaPrompt(handTip, prompt, event, richMain);
		else renderOfficialPrompt(handTip, prompt, event, richMain);
		tipText = text;
	}
	handTip?.strokeText?.();
	handTip?.show?.();
	if (handTip && ui.arena) ui.arena.dataset.decadeOptimizedActive = "true";
	return !!handTip;
}

function closeOptimizedPrompt(dialog) {
	const state = dialogs.get(dialog);
	if (state) {
		restoreNativePrompt(dialog, true);
		for (const node of state.mainNodes) node.classList.remove("decade-optimized-main");
		for (const node of state.detailNodes) node.classList.remove("decade-optimized-detail");
		for (const node of state.progressNodes) node.classList.remove("decade-optimized-progress");
		dialogs.delete(dialog);
	}
	refreshOptimizedPrompt();
}

function clearOptimizedPrompts() {
	closeHandTip();
	checkedEvent = null;
	for (const state of dialogs.values()) {
		restoreNativePrompt(state.dialog, state.dialog.classList.contains("removing") || getOptimizedPromptStyle() !== "off");
		for (const node of state.mainNodes) node.classList.remove("decade-optimized-main");
		for (const node of state.detailNodes) node.classList.remove("decade-optimized-detail");
		for (const node of state.progressNodes) node.classList.remove("decade-optimized-progress");
	}
	dialogs.clear();
}

function initOptimizedPromptHooks() {
	if (hooksInstalled || !lib.hooks?.checkEnd) return;
	hooksInstalled = true;
	// 本体事件栈切换时立即撤下旧提示，不等下一次本地 game.check()。
	lib.announce?.subscribe?.("Noname.Game.Event.Changed", () => {
		checkedEvent = null;
		closeHandTip();
	});
	lib.hooks.checkBegin?.add(event => {
		if (event !== _status.event) return;
		checkedEvent = event;
		if (!getPromptEvent()) closeHandTip();
	});
	lib.hooks.checkEnd.add(event => {
		if (event !== _status.event) return;
		checkedEvent = event;
		if ((getOptimizedPromptStyle() !== "off" || isSkillPromptSimplified() && getPromptSkill(event)) && !ui.cardDialog?._isLuckyCardTip) {
			ui.cardDialog?.close?.();
			delete ui.cardDialog;
		}
		refreshOptimizedPrompt();
	});
	lib.hooks.uncheckEnd?.add((event, types) => {
		if (event !== _status.event || types?.length < 3) return;
		checkedEvent = null;
		closeHandTip();
	});
}

export { configKey, addOptimizedPrompt, addOptimizedPromptText, prepareOptimizedPrompt, refreshOptimizedPrompt, closeOptimizedPrompt, clearOptimizedPrompts, initOptimizedPromptHooks };
