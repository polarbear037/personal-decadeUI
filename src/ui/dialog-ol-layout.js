import { getXinshaPlayerCardPrompt } from "./xinshaPlayerCardPrompt.js";
import { getPrintedSkillDescription, getPrintedSkillPromptHeight } from "./printed-skill-prompt.js";

let activeLayoutObserver;
const DIALOG_OL_LAYOUT_CLASS = "dialog-ol-layout";
const XINSHA_CHARACTER_FRAME_CLASS = "dialog-xinsha-character-frame";
const skillPromptStates = new WeakMap();
const dialogSkillTitles = new WeakMap();
const dialogSourceEvents = new WeakMap();

function usesXinshaDialogLayout(arena) {
	const style = arena?.getAttribute("data-loading-style");
	return style === "dialog_xinsha" || style === "othersOff" && document.body?.dataset.style === "othersOff";
}

function restorePrintedHeight(dialog, state) {
	const saved = state.printedHeight;
	if (saved && dialog.style.getPropertyValue("height") === saved.applied) {
		if (saved.value) dialog.style.setProperty("height", saved.value, saved.priority);
		else dialog.style.removeProperty("height");
	}
	delete state.printedHeight; delete state.printedDescription; delete state.printedCount;
}

function syncPlayerCardFooter(dialog, state) {
	const event = dialogSourceEvents.get(dialog);
	const description = getPrintedSkillDescription(dialog, event);
	let printedMarkup;
	if (description) {
		const holder = document.createElement("div"); holder.textContent = description;
		printedMarkup = holder.innerHTML;
		if (!state.footer) {
			state.footer = document.createElement("div"); state.footer.className = "dialog-ol-footer";
			dialog.appendChild(state.footer); dialog.classList.add("dialog-ol-skill-prompt");
		}
		const count = dialog.buttons?.length || 1;
		if (state.printedDescription !== description || state.printedCount !== count) {
			// 以印牌区的设计宽度测量换行；多出的说明高度在开窗测量前计入，避免遮住牌名。
			const height = getPrintedSkillPromptHeight(dialog, description);
			state.printedHeight ||= { value: dialog.style.getPropertyValue("height"), priority: dialog.style.getPropertyPriority("height") };
			dialog.style.setProperty("height", `${height}px`, "important");
			state.printedHeight.applied = dialog.style.getPropertyValue("height");
			state.printedDescription = description; state.printedCount = count;
		}
	} else restorePrintedHeight(dialog, state);
	if (!state.footer) return;
	const markup = printedMarkup ?? (event?.name === "gainPlayerCard" && getXinshaPlayerCardPrompt(event, state.original) || state.footerOriginal);
	// 定位模块会给子节点补行内样式，不能把这些样式变化误判成文案变化并反复重建。
	if (state.footerMarkup !== markup) {
		state.footer.innerHTML = markup;
		state.footerMarkup = markup;
	}
}

function readCaptionMarkup(caption) {
	const copy = caption.cloneNode(true);
	copy.querySelectorAll(".dialog-ol-collapse").forEach(node => node.remove());
	return copy.innerHTML;
}

function writeCaptionMarkup(caption, html) {
	const arrow = caption.querySelector(".dialog-ol-collapse");
	caption.innerHTML = html;
	if (arrow) caption.appendChild(arrow);
}

function simplifySkillTitle(title) {
	const text = title.textContent;
	const match = /^.+?发动(?:了)?\s*(?:【([^【】]+)】|〖([^〖〗]+)〗|\[([^\[\]]+)\])\s*$/.exec(text.trim());
	const skill = match && (match[1] || match[2] || match[3]);
	if (!skill?.trim()) return false;
	const activation = text.indexOf("发动");
	const start = activation + text.slice(activation).search(/[【〖\[]/) + 1;
	const end = start + skill.length;
	const range = document.createRange();
	const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
	let node, offset = 0;
	while ((node = walker.nextNode())) {
		const next = offset + node.length;
		if (offset <= start && start < next) range.setStart(node, start - offset);
		if (offset < end && end <= next) {
			range.setEnd(node, end - offset);
			break;
		}
		offset = next;
	}
	let fragment = range.cloneContents();
	// 选区落在同一行内节点中时，cloneContents 不会保留其共同祖先的颜色等样式。
	for (let ancestor = range.commonAncestorContainer; ancestor !== title; ancestor = ancestor.parentNode) {
		if (ancestor.nodeType !== Node.ELEMENT_NODE) continue;
		const wrapper = ancestor.cloneNode(false);
		wrapper.appendChild(fragment);
		fragment = wrapper;
	}
	title.replaceChildren(fragment);
	return true;
}

function syncXinshaDescriptions(dialog, content, state, arena) {
	if (!usesXinshaDialogLayout(arena) || !state.hasSkillTitle) return;
	const cards = Array.from(content.children).find(node => node.matches(".buttons,.item-container"));
	if (!cards) return;
	// 经造等技能在 open 后往标题与牌区之间插入普通 div；移动原节点以保留后续更新。
	for (const node of Array.from(content.children)) {
		if (node === cards) break;
		if (node === state.caption || !node.matches("div:not([class]),div[class=''],div.text") || !node.textContent.trim() ||
			node.querySelector(".button,.card,.popup,input,button,select,textarea,a,[onclick],[contenteditable]") || node.onclick) continue;
		if (!state.footer) {
			state.footer = document.createElement("div");
			state.footer.className = "dialog-ol-footer";
			dialog.appendChild(state.footer);
		}
		(state.descriptions ||= []).push({ node, parent: content, next: node.nextSibling });
		node.classList.add("dialog-xinsha-description");
		state.footer.appendChild(node);
		state.footerOriginal = state.footerMarkup = state.footer.innerHTML;
		dialog.classList.add("dialog-ol-skill-prompt");
	}
}

function clearSkillPrompt(dialog) {
	const state = skillPromptStates.get(dialog);
	if (state) {
		restorePrintedHeight(dialog, state);
		if (readCaptionMarkup(state.caption) === state.title) writeCaptionMarkup(state.caption, state.original);
		for (const { node, parent, next } of (state.descriptions || []).slice().reverse()) {
			node.classList.remove("dialog-xinsha-description");
			parent.insertBefore(node, next?.parentNode === parent ? next : null);
		}
		state.footer?.remove();
		skillPromptStates.delete(dialog);
	}
	dialog.classList.remove("dialog-ol-skill-prompt");
	dialog.style.removeProperty("--dialog-ol-footer-height");
}

function syncSkillPrompt(dialog, arena, enabled) {
	// 只拆首个标题，选项说明、选将界面和自定义移牌提示保留原结构。
	const content = dialog.content || dialog.querySelector(":scope > .content-container > .content, :scope > .content");
	// 本体 buttonChooseAll 会把辅助控件插到 caption 前；标题顺序不能随多选状态失效。
	// 保留原控件及监听器，只让标题重新位于这些辅助控件之前。
	if (enabled && usesXinshaDialogLayout(arena) && content?.firstElementChild?.classList.contains("select-all")) {
		const title = content.querySelector(":scope > .caption");
		if (title) content.insertBefore(title, content.firstElementChild);
	}
	const caption = content?.firstElementChild;
	if (!enabled || arena.classList.contains("choose-character") || dialog.dataset.olLayout === "card-move" ||
		!caption?.classList.contains("caption") || caption.querySelector(".text,.popup,.button,input,button:not(.dialog-ol-collapse),select,textarea,a,[onclick],[contenteditable]")) {
		clearSkillPrompt(dialog);
		return;
	}
	const original = readCaptionMarkup(caption);
	const state = skillPromptStates.get(dialog);
	if (state?.caption === caption && state.title === original) {
		syncPlayerCardFooter(dialog, state);
		syncXinshaDescriptions(dialog, content, state, arena);
		if (state.footer && state.footer.parentNode !== dialog) dialog.appendChild(state.footer);
		return;
	}
	clearSkillPrompt(dialog);
	const holder = document.createElement("div");
	holder.innerHTML = original;
	const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
	let separator;
	let offset;
	while ((separator = walker.nextNode())) {
		offset = separator.data.search(/[：:]/);
		if (offset !== -1) break;
	}
	let footer;
	const title = document.createElement("div");
	if (separator) {
		// Range 按可见文字拆分，避免误拆 HTML 属性中的 URL，并保留文字颜色等标记。
		const titleRange = document.createRange();
		titleRange.selectNodeContents(holder);
		titleRange.setEnd(separator, offset);
		const tipRange = document.createRange();
		tipRange.selectNodeContents(holder);
		tipRange.setStart(separator, offset + 1);
		title.appendChild(titleRange.cloneContents());
		footer = document.createElement("div");
		footer.className = "dialog-ol-footer";
		footer.appendChild(tipRange.cloneContents());
		if (!title.textContent.trim() || !footer.textContent.trim()) return;
	} else {
		title.innerHTML = original;
	}
	const simplified = simplifySkillTitle(title);
	const skillTitle = dialogSkillTitles.get(dialog);
	if (!simplified && skillTitle && title.textContent.trim() !== skillTitle) {
		// 自动生成的“获得某人一张牌”等标题没有技能名，从打开窗口的事件链取名。
		// 原标题含操作要求时完整保留，避免把冒号前的操作文字丢掉。
		footer ||= document.createElement("div");
		footer.className = "dialog-ol-footer";
		footer.innerHTML = original;
		title.textContent = skillTitle;
	}
	if (!footer && !simplified && !skillTitle) return;
	writeCaptionMarkup(caption, title.innerHTML);
	if (footer) {
		dialog.appendChild(footer);
		dialog.classList.add("dialog-ol-skill-prompt");
	}
	const nextState = { caption, original, title: readCaptionMarkup(caption), footer, footerOriginal: footer?.innerHTML, hasSkillTitle: simplified || !!skillTitle };
	skillPromptStates.set(dialog, nextState);
	syncPlayerCardFooter(dialog, nextState);
	syncXinshaDescriptions(dialog, content, nextState, arena);
}

function disconnectLayoutObserver(dialog) {
	if (!activeLayoutObserver || (dialog && activeLayoutObserver.dialog !== dialog)) return;
	activeLayoutObserver.observer.disconnect();
	if (activeLayoutObserver.frame) cancelAnimationFrame(activeLayoutObserver.frame);
	activeLayoutObserver = undefined;
}

function isDialogOlCandidate(dialog, arena) {
	return !!(
		dialog &&
		arena?.classList.contains("decadeUI") &&
		(arena.getAttribute("data-loading-style") === "dialog_ol" || usesXinshaDialogLayout(arena)) &&
		// 自由选将自带筛选、搜索及列表布局；新杀基板不能接管 noupdate 窗口。
		!(usesXinshaDialogLayout(arena) &&
			(dialog.classList.contains("noupdate") || typeof dialog.getCurrentCapt === "function")) &&
		dialog.classList.contains("dialog") &&
		!dialog.classList.contains("dclieqiong") &&
		!dialog.classList.contains("online-faction-dialog") &&
		!dialog.classList.contains("xinsha-faction-dialog") &&
		!dialog.classList.contains("bosscharacter")
	);
}

function isXinshaCharacterFrame(dialog, arena) {
	return !!(dialog && arena?.classList.contains("decadeUI") &&
		arena.getAttribute("data-loading-style") === "dialog_xinsha" &&
		dialog.classList.contains("dialog") && typeof dialog.getCurrentCapt === "function" &&
		!dialog.classList.contains("dclieqiong") && !dialog.classList.contains("bosscharacter"));
}

function hasDialogOlContent(dialog) {
	return !!(
		dialog &&
		((Array.isArray(dialog.buttons) && dialog.buttons.length > 0) || dialog.forcebutton || dialog._scrollset || dialog.classList.contains("addNewRow"))
	);
}

export function syncDialogOlLayoutMarker(dialog, arena, reevaluate = false) {
	if (!dialog) return false;
	dialog.classList.toggle(XINSHA_CHARACTER_FRAME_CLASS, isXinshaCharacterFrame(dialog, arena));
	if (!isDialogOlCandidate(dialog, arena)) {
		dialog.classList.remove(DIALOG_OL_LAYOUT_CLASS);
		dialog.classList.remove("dialog-xinsha-layout");
		clearSkillPrompt(dialog);
		return false;
	}
	if (reevaluate || !dialog.classList.contains(DIALOG_OL_LAYOUT_CLASS)) {
		if (hasDialogOlContent(dialog)) dialog.classList.add(DIALOG_OL_LAYOUT_CLASS);
		else dialog.classList.remove(DIALOG_OL_LAYOUT_CLASS);
	}
	const enabled = dialog.classList.contains(DIALOG_OL_LAYOUT_CLASS);
	dialog.classList.toggle("dialog-xinsha-layout", enabled && usesXinshaDialogLayout(arena));
	syncSkillPrompt(dialog, arena, enabled);
	return enabled;
}

export function isDialogOlLayout(dialog, arena) {
	return !!(
		dialog &&
		dialog.isConnected &&
		dialog.parentNode === arena &&
		isDialogOlCandidate(dialog, arena) &&
		dialog.classList.contains(DIALOG_OL_LAYOUT_CLASS)
	);
}

export function clearDialogOlLayout(dialog) {
	if (!dialog) return;
	releaseDialogOlLayout(dialog);
	dialog.classList.remove(DIALOG_OL_LAYOUT_CLASS);
	dialog.classList.remove("dialog-xinsha-layout");
	dialog.classList.remove(XINSHA_CHARACTER_FRAME_CLASS);
	clearSkillPrompt(dialog);
	dialog.style.removeProperty("--dialog-ol-content-height");
	dialog.style.removeProperty("--dialog-ol-frame-padding");
	dialog.style.removeProperty("--dialog-ol-top-limit");
	dialog.style.removeProperty("--dialog-ol-width");
	dialog.style.removeProperty("--dialog-ol-center-x");
	dialog.style.removeProperty("--dialog-xinsha-frame-left");
	dialog.style.removeProperty("--dialog-xinsha-frame-width");
	dialog.style.removeProperty("--dialog-xinsha-layout-unit");
}

export function releaseDialogOlLayout(dialog) {
	disconnectLayoutObserver(dialog);
}

function hasDialogOlFramePadding(dialog, content) {
	const frame = getComputedStyle(dialog, "::before");
	if (
		frame.content === "none" ||
		frame.display === "none" ||
		frame.visibility === "hidden" ||
		frame.borderImageSource === "none"
	) {
		return false;
	}
	// chooseControl 的选项正文也由 caption 承载，只有第一个 caption 是标题。
	return content.children.length > 1 || Array.from(content.children).some(child => !child.classList.contains("caption"));
}

function measureDialogOlLayout(dialog, content, arena) {
	// 将游戏窗口边界换算到 arena 的布局坐标。
	const viewport = arena.parentElement;
	const arenaRect = arena.getBoundingClientRect();
	const viewportRect = viewport?.getBoundingClientRect();
	if (isXinshaCharacterFrame(dialog, arena)) {
		// 只把底图铺到游戏窗口边界；自由选将的根节点及内部布局均不改写。
		const dialogRect = dialog.getBoundingClientRect();
		const scale = dialog.offsetWidth ? dialogRect.width / dialog.offsetWidth : 0;
		if (scale > 0 && viewportRect?.width > 0) {
			dialog.style.setProperty("--dialog-xinsha-frame-left", `${(viewportRect.left - dialogRect.left) / scale}px`);
			dialog.style.setProperty("--dialog-xinsha-frame-width", `${viewportRect.width / scale}px`);
		}
		return;
	}
	const scaleX = arena.offsetWidth ? arenaRect.width / arena.offsetWidth : 0;
	if (scaleX > 0 && viewportRect?.width > 0) {
		dialog.style.setProperty("--dialog-ol-width", `${viewportRect.width / scaleX}px`);
		dialog.style.setProperty("--dialog-ol-center-x", `${(viewportRect.left + viewportRect.width / 2 - arenaRect.left) / scaleX}px`);
		if (usesXinshaDialogLayout(arena)) {
			const unit = Math.min(viewportRect.width / 1334, viewportRect.height / 750) / scaleX;
			dialog.style.setProperty("--dialog-xinsha-layout-unit", `${unit}px`);
		}
	}
	const scaleY = arena.offsetHeight ? arenaRect.height / arena.offsetHeight : 0;
	if (scaleY > 0 && viewportRect?.height > 0) {
		dialog.style.setProperty("--dialog-ol-top-limit", `${(viewportRect.top - arenaRect.top) / scaleY}px`);
	}
	const contentHeight = content.scrollHeight || content.offsetHeight;
	if (!contentHeight) return;
	dialog.style.setProperty("--dialog-ol-frame-padding", hasDialogOlFramePadding(dialog, content) ? "var(--dialog-ol-edge-bottom)" : "0px");
	const footer = skillPromptStates.get(dialog)?.footer;
	if (footer) dialog.style.setProperty("--dialog-ol-footer-height", `${footer.offsetHeight}px`);
	dialog.style.setProperty("--dialog-ol-content-height", `${contentHeight}px`);
}

function observeDialogOlContent(dialog, arena, content) {
	const footer = skillPromptStates.get(dialog)?.footer;
	if (activeLayoutObserver?.dialog === dialog && activeLayoutObserver.content === content && activeLayoutObserver.footer === footer && activeLayoutObserver.viewport === arena.parentElement) {
		activeLayoutObserver.arena = arena;
		return;
	}
	disconnectLayoutObserver();
	if (typeof ResizeObserver !== "function") return;
	const state = { dialog, content, footer, arena, viewport: arena.parentElement, frame: 0, observer: null };
	state.observer = new ResizeObserver(() => {
		if (state.frame) return;
		state.frame = requestAnimationFrame(() => {
			state.frame = 0;
			if (activeLayoutObserver !== state) return;
			if ((!isDialogOlLayout(state.dialog, state.arena) && !isXinshaCharacterFrame(state.dialog, state.arena)) || state.dialog.classList.contains("removing")) {
				disconnectLayoutObserver(state.dialog);
				return;
			}
			measureDialogOlLayout(state.dialog, state.content, state.arena);
		});
	});
	activeLayoutObserver = state;
	state.observer.observe(content);
	if (footer) state.observer.observe(footer);
	state.observer.observe(arena);
	if (state.viewport) state.observer.observe(state.viewport);
	if (isXinshaCharacterFrame(dialog, arena)) state.observer.observe(dialog);
}

export function updateDialogOlLayout(dialog, arena) {
	syncDialogOlLayoutMarker(dialog, arena);
	if (isXinshaCharacterFrame(dialog, arena) && dialog.isConnected && dialog.parentNode === arena) {
		if (dialog.classList.contains("removing")) {
			disconnectLayoutObserver(dialog);
			return false;
		}
		const content = dialog.content || dialog.querySelector(":scope > .content-container > .content");
		if (content) {
			observeDialogOlContent(dialog, arena, content);
			measureDialogOlLayout(dialog, content, arena);
		}
		return false;
	}
	if (!isDialogOlLayout(dialog, arena)) {
		disconnectLayoutObserver();
		clearDialogOlLayout(dialog);
		return false;
	}
	if (dialog.classList.contains("removing")) {
		disconnectLayoutObserver(dialog);
		return true;
	}
	const container = dialog.contentContainer || dialog.querySelector(":scope > .content-container");
	const content = dialog.content || container?.querySelector(":scope > .content");
	if (!container || !content) {
		clearDialogOlLayout(dialog);
		return true;
	}
	observeDialogOlContent(dialog, arena, content);
	measureDialogOlLayout(dialog, content, arena);
	return true;
}

export function prepareDialogOlOpen(dialog, arena, skillTitle, sourceEvent) {
	if (typeof skillTitle === "function") {
		// 一将收起恢复不能拿无关的当前事件覆盖来源；新选择事件接手同一窗口时重新绑定。
		if (usesXinshaDialogLayout(arena) && dialog.classList.contains("hidden") && sourceEvent?.dialog !== dialog) {
			sourceEvent = dialogSourceEvents.get(dialog) || sourceEvent;
		}
		skillTitle = skillTitle(sourceEvent);
	}
	if (sourceEvent !== undefined) dialogSourceEvents.set(dialog, sourceEvent);
	// 绑定打开时的来源；后续 ui.update 不跟随其他事件给旧窗口改名。
	if (skillTitle !== undefined && dialogSkillTitles.get(dialog) !== skillTitle) {
		clearSkillPrompt(dialog);
		dialogSkillTitles.set(dialog, skillTitle);
	}
	if (!syncDialogOlLayoutMarker(dialog, arena, true)) return false;
	if (dialog.timeout && (dialog.classList.contains("removing") || dialog._onEndDelete)) {
		clearTimeout(dialog.timeout);
		delete dialog.timeout;
	}
	if (dialog._onEndDelete) delete dialog._onEndDelete;
	dialog.classList.remove("removing");
	dialog.classList.remove("dialog-xinsha-prompt-retiring");
	// 在插入牌桌前确定一将标题的宽度，避免先按100vw绘制再随窗口测量收窄。
	if (usesXinshaDialogLayout(arena)) {
		const content = dialog.content || dialog.querySelector(":scope > .content-container > .content");
		if (content) measureDialogOlLayout(dialog, content, arena);
	}
	return true;
}
