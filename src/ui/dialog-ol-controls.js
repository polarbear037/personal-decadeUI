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
	state.promptLayout = null;
	layout.mutations.disconnect();
	layout.resize.disconnect();
	cancelAnimationFrame(layout.frame);
	layout.frame = 0;
	for (const copy of layout.copies.values()) copy.remove();
	for (const [node, properties] of layout.nodes) {
		for (const [key, [value, priority]] of properties) {
			if (value) node.style.setProperty(key, value, priority);
			else node.style.removeProperty(key);
		}
	}
	layout.copies.clear();
	layout.nodes.clear();
	state.dialog.classList.remove("dialog-xinsha-prompt-layout");
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
	// 收起只恢复显示属性；同一窗口恢复时复用坐标基准，关闭后随state释放。
	const placements = state.promptPlacements ||= new WeakMap();
	let placementKey, bodyPlacementKey;
	let promptLayer = "104";
	const px = value => `${Number(value.toPrecision(6))}px`;
	state.promptLayout = layout;
	const set = (node, key, value) => {
		let saved = layout.nodes.get(node);
		if (!saved) layout.nodes.set(node, saved = new Map());
		if (!saved.has(key)) saved.set(key, [node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]);
		const current = node.style.getPropertyValue(key);
		// CSSOM会舍入px；忽略小于千分之一像素的序列化误差，避免相同布局仍持续改写style。
		if (node.style.getPropertyPriority(key) === "important" && (current === value || current.endsWith("px") && value.endsWith("px") && Math.abs(parseFloat(current) - parseFloat(value)) < .001)) return;
		node.style.setProperty(key, value, "important");
	};
	// 只在窗口坐标系变化时用100×100校准；缓存浮点比例和原点，避免排版取整反向反馈到定位。
	const place = (node, center, bottom, width, height, fontSize, zIndex = "103", measureOnly = false) => {
		let origin = placements.get(node);
		// body浮层不受窗口自身的开窗scale影响，不能跟着每一帧重新100×100校准。
		const key = node.parentElement === document.body ? bodyPlacementKey : placementKey;
		// 收起曾还原这些属性；复用坐标时仍须恢复定位，但不再写入100×100临时尺寸。
		for (const [name, value] of Object.entries({ position: "fixed", right: "auto", bottom: "auto", margin: "0px", padding: "0px", transform: "none", "transition-property": "opacity", "box-sizing": "border-box", "z-index": zIndex })) set(node, name, value);
		if (!origin || origin.key !== key || origin.parent !== node.parentElement) {
			for (const [name, value] of Object.entries({ left: "0px", top: "0px", width: "100px", height: "100px" })) set(node, name, value);
			const rect = node.getBoundingClientRect();
			origin = { key, parent: node.parentElement, x: rect.left, y: rect.top, sx: rect.width / 100 || 1, sy: rect.height / 100 || 1 };
			placements.set(node, origin);
		}
		const { sx, sy } = origin;
		set(node, "width", px(width / sx));
		set(node, "height", height ? px(height / sy) : "auto");
		if (fontSize) {
			set(node, "font-size", px(fontSize / sy));
			set(node, "line-height", "1");
			set(node, "color", "rgb(255, 243, 222)");
			set(node, "text-align", "center");
			for (const span of node.querySelectorAll("span")) {
				set(span, "font-size", "inherit");
				set(span, "line-height", "inherit");
				if (span.dataset.type === "player") set(span, "color", "rgb(255, 225, 0)");
			}
		}
		if (!measureOnly) {
			set(node, "left", px((center - width / 2 - origin.x) / sx));
			set(node, "top", px((bottom - node.getBoundingClientRect().height - origin.y) / sy));
		}
		return { sx, sy };
	};
	// 保留原提示节点供本体、布局和关闭流程使用；同一 body 浮层绘制无交互副本，
	// 避免 footer 被 dialog(101) 的 stacking context 限制而压在 body 进度条下面。
	const paintTip = (node, center, bottom, width, scale, measureOnly = false) => {
		place(node, center, bottom, width, 0, 30 * scale, "103", measureOnly);
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
		for (const [key, value] of Object.entries({ "z-index": promptLayer, "pointer-events": "none", "font-family": "dui-yjcm-label, serif", opacity: "1", visibility: "visible", "text-shadow": "none" })) set(copy, key, value);
		place(copy, center, bottom, width, 0, 30 * scale, promptLayer, measureOnly);
		// 原提示仍参与布局和生命周期，但不能沿用 div 的淡出过渡与副本同时绘制。
		set(node, "visibility", "hidden");
		set(node, "opacity", "0");
		return copy;
	};
	layout.update = () => {
		if (state.promptLayout !== layout) return;
		cancelAnimationFrame(layout.frame);
		layout.frame = 0;
		if (document.body.dataset.style !== "othersOff" || !dialog.isConnected || dialog.hidden || dialog.classList.contains("hidden") || dialog.classList.contains("removing") || dialog.classList.contains("lei-yijiang-sc-closing")) return clearXinshaPromptLayout(state);
		// checkEnd 可能刚插入全选控件，须在本次提示测量前同步标题顺序。
		if (dialog.content?.firstElementChild?.classList.contains("select-all")) syncDialogOlLayoutMarker(dialog, arena);
		for (const [node, properties] of layout.nodes) {
			if (node.isConnected) continue;
			for (const [key, [value, priority]] of properties) {
				if (value) node.style.setProperty(key, value, priority);
				else node.style.removeProperty(key);
			}
			layout.nodes.delete(node);
			placements.delete(node);
		}
		const viewport = windowElement || arena.parentElement || arena;
		const paintedBox = dialog.getBoundingClientRect(), view = viewport.getBoundingClientRect();
		const dialogStyle = getComputedStyle(dialog);
		const openingScale = dialog.classList.contains("dialog-xinsha-layout") && dialogStyle.animationName.split(",").some(name => name.trim() === "open-dialog-xinsha") ? parseFloat(dialogStyle.scale) || 1 : 1;
		// 开窗缩放只影响画面，不作为 body 提示层的排版坐标；绕根节点中心还原最终边界。
		const finalBox = rect => {
			const width = rect.width / openingScale, height = rect.height / openingScale;
			const left = rect.left + (rect.width - width) / 2, top = rect.top + (rect.height - height) / 2;
			return { left, top, width, height, bottom: top + height };
		};
		const box = finalBox(paintedBox);
		placementKey = [paintedBox.x, paintedBox.y, paintedBox.width, paintedBox.height, view.x, view.y, view.width, view.height].join(",");
		const body = document.body.getBoundingClientRect();
		bodyPlacementKey = [body.x, body.y, body.width, body.height, document.body.offsetWidth, document.body.offsetHeight, view.x, view.y, view.width, view.height].join(",");
		const snitch = dialog.id === "lei-yijiang-player-card-dialog";
		const fixedScene = snitch || !!dialog._lyjTable;
		const faction = dialog.classList.contains("xinsha-faction-dialog");
		// 确认栏的 window 标记只声明按钮锚点，普通选牌框仍须按实际牌区留出提示空间。
		const fixedCardLayout = fixedScene || faction || dialog.dataset.olLayout === "card-move";
		const scale = fixedScene ? box.width / dialog.offsetWidth : Math.min(view.width / 1334, view.height / 750);
		if (!(scale > 0 && box.height > 0)) { observe(); return; }
		const center = box.left + box.width / 2;
		const progressBars = [...document.querySelectorAll("#jindutiaopl, [data-yjcm-progress]")];
		const bars = progressBars.filter(bar => bar.dataset.yjcmProgress === "4");
		// 提示副本在 body 绘制，层级须高于进度条及其父级层叠上下文。
		const stackingNodes = new Set();
		for (const element of [...progressBars, dialog]) {
			for (let node = element; node && node !== document.body; node = node.parentElement) stackingNodes.add(node);
		}
		// 本体 div 的 transition:all 可能让计算值仍停在旧层级，同时计入行内目标值。
		promptLayer = String(Math.max(103, ...[...stackingNodes].map(node => Math.max(parseInt(node.style.zIndex) || 0, parseInt(getComputedStyle(node).zIndex) || 0))) + 1);
		const progressHeight = bars.some(bar => bar.dataset.yjcmMoonProgress === "true") ? 26 : 17;
		const progressExtent = progressHeight + 7;
		const controls = arena.querySelector("#dui-controls");
		const visibleActionRect = node => {
			if (!node || node.hidden || node.classList.contains("hidden")) return null;
			const style = getComputedStyle(node), rect = node.getBoundingClientRect();
			return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 ? rect : null;
		};
		// 有些分区框隐藏原生栏，使用框内原生 button；以可见操作的几何为准。
		const contentActionRects = [...(dialog.content?.querySelectorAll(":scope > button") || [])].map(visibleActionRect).filter(Boolean);
		const actionRects = [...dialog.querySelectorAll(":scope > :not(.content-container):not(.content) > button, :scope > button")]
			.filter(node => !node.matches(".dialog-ol-collapse,.dialog-xinsha-hide"))
			.map(visibleActionRect).filter(Boolean);
		actionRects.push(...contentActionRects);
		const nativeActions = controls?.children.length && visibleActionRect(controls);
		if (nativeActions) actionRects.push(nativeActions);
		const hasButtons = actionRects.length > 0;
		const actionTop = hasButtons ? Math.min(...actionRects.map(rect => rect.top)) : box.bottom;
		const buttonSpace = !fixedCardLayout && hasButtons ? Math.max(0, box.bottom - actionTop) : 0;
		const tipY = faction ? 80 : snitch ? (hasButtons ? 120 : 80) : 120;
		// 普通框先量取文字，再将提示置于实际牌区底边与框底的中点。
		let tipBottom = box.bottom - (fixedCardLayout ? tipY : 52) * scale;
		if (fixedCardLayout && hasButtons) tipBottom = Math.min(tipBottom, actionTop - (progressExtent + (contentActionRects.length ? 12 : 2)) * scale);
		const nativeFooter = dialog.querySelector(":scope > .dialog-ol-footer");
		const description = dialog.querySelector(".lyj-option-hint, .dialog-xinsha-description");
		// 详细操作说明已在窗口内时，纯发动询问不再占用另一行。
		const redundantActivation = nativeFooter && description?.textContent.trim() && /^是否发动\s*[“"【〖「『].+[”"】〗」』]\s*[？?]?$/.test(nativeFooter.textContent.trim());
		if (redundantActivation) {
			set(nativeFooter, "display", "none");
			layout.copies.get(nativeFooter)?.remove();
		} else if (nativeFooter) {
			const saved = layout.nodes.get(nativeFooter)?.get("display");
			if (saved && nativeFooter.style.getPropertyValue("display") === "none") {
				if (saved[0]) nativeFooter.style.setProperty("display", saved[0], saved[1]);
				else nativeFooter.style.removeProperty("display");
			}
		}
		const footer = redundantActivation ? description : nativeFooter;
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
			else {
				const copy = paintTip(tip, center, tipBottom, tipWidth, scale, !fixedCardLayout);
				if (!tip.classList.contains("hidden")) promptHeight = Math.max(promptHeight, (copy || tip).getBoundingClientRect().height);
			}
		}
		if (footer) {
			const copy = paintTip(footer, center, tipBottom, tipWidth, scale, !fixedCardLayout);
			promptHeight = (copy || footer).getBoundingClientRect().height;
		}
		let promptTop = tipBottom - promptHeight;
		const visibleInfos = [];
		let infoHeight = 0;
		for (const info of arena.querySelectorAll(":scope > .hand-tip-info")) {
			const copy = paintTip(info, center, promptTop - 6 * scale, tipWidth, scale, !fixedCardLayout);
			if (!fixedCardLayout && layout.copies.get(info)?.isConnected) {
				visibleInfos.push(info);
				const height = copy.getBoundingClientRect().height + 6 * scale;
				infoHeight += height;
				promptTop -= height;
			}
		}
		if (!fixedCardLayout) {
			const dialogScale = box.width / dialog.offsetWidth || 1;
			// 固定留白先独立于文字定位求出，避免中点位置与框高相互反馈、逐帧伸缩。
			set(dialog, "--dialog-xinsha-prompt-space", `max(0px, calc(${(((buttonSpace ? 64 : 104) + progressHeight - 17) * scale + promptHeight + 2 * infoHeight + buttonSpace) / dialogScale}px - var(--dialog-ol-frame-padding)))`);
			const paintedFrame = dialog.getBoundingClientRect(), frame = finalBox(paintedFrame);
			const container = dialog.contentContainer || dialog.querySelector(":scope > .content-container");
			const contentBottom = container ? frame.top + (container.getBoundingClientRect().bottom - paintedFrame.top) / openingScale : frame.top;
			const bottoms = [];
			for (const area of dialog.querySelectorAll(".buttons,[data-dialog-card-area]")) {
				if (!area.offsetHeight) continue;
				const rect = area.getBoundingClientRect();
				const cards = [...area.children].filter(card => card.classList.contains("card") && card.offsetParent === area);
				// 使用布局坐标排除卡牌斜向入场/选中动画，提示不能跟着动画移动。
				const bottom = cards.length ? rect.top + Math.max(...cards.map(card => card.offsetTop + card.offsetHeight)) * rect.height / area.offsetHeight : rect.bottom;
				bottoms.push(frame.top + (bottom - paintedFrame.top) / openingScale);
			}
			const cardBottom = Math.min(contentBottom, bottoms.length ? Math.max(...bottoms) : contentBottom);
			const promptEnd = frame.bottom - buttonSpace - (buttonSpace ? 8 * scale : 0);
			// 原版提示/倒计时共用窗口底部锚点，120-113=7设计单位。
			// DOM 普通/技能条17高、月光条26高，按实际高度保留7单位间隙再整体居中。
			tipBottom = (promptEnd + cardBottom + promptHeight - progressExtent * scale) / 2;
			if (footer) paintTip(footer, center, tipBottom, tipWidth, scale);
			else for (const tip of arena.querySelectorAll(":scope > .hand-tip")) paintTip(tip, center, tipBottom, tipWidth, scale);
			promptTop = tipBottom - promptHeight;
			for (const info of visibleInfos) {
				paintTip(info, center, promptTop - 6 * scale, tipWidth, scale);
				promptTop -= layout.copies.get(info).getBoundingClientRect().height + 6 * scale;
			}
		}
		// 原版37顶距有独立技能条件，不能用本体确认栏的存在来推断。
		// 固定场景中的语义选项组在标题与实际提示之间居中，保持两端可见留白相等。
		if (fixedScene) {
			const options = dialog.content?.querySelector(":scope > [role='group']");
			const caption = dialog.content?.querySelector(":scope > .caption");
			if (options && caption) {
				const rect = options.getBoundingClientRect(), style = getComputedStyle(options);
				const paddingTop = (parseFloat(style.paddingTop) || 0) * scale;
				const paddingBottom = (parseFloat(style.paddingBottom) || 0) * scale;
				const optionHeight = rect.height - paddingTop - paddingBottom;
				const labelBottom = caption.getBoundingClientRect().bottom;
				const promptEdge = Math.min(promptTop, ...[...layout.copies.values()].filter(node => node.isConnected).map(node => node.getBoundingClientRect().top));
				const top = (labelBottom + promptEdge - optionHeight) / 2 - paddingTop;
				set(options, "top", px((top - box.top) / scale));
				set(options, "transform", "translateX(-50%)");
			}
		}
		// 只从主提示的同一锚点推导，附加说明和文字换行不再单独挪动进度条。
		for (const bar of bars) {
			const fill = bar.firstElementChild;
			const image = fill?.querySelector("img");
			if (!image) continue;
			const moon = bar.dataset.yjcmMoonProgress === "true";
			const height = moon ? 26 : 17;
			const { sx } = place(bar, center, tipBottom + (height + 7) * scale, 560 * scale, height * scale);
			for (const [key, value] of Object.entries({ "--yjcm-progress-width": `${560 * scale / sx}px`, "background-color": "transparent", "border-radius": "0px", "box-shadow": "none", "background-image": moon ? "none" : 'url("' + new URL("xf_newTimeBar_bg_1.png", image.src).href + '")', "background-size": "101.071% 129.412%", "background-position": "center center", "background-repeat": "no-repeat" })) set(bar, key, value);
			if (fill) { set(fill, "top", "0px"); set(fill, "height", "100%"); }
			const backdrop = bar.querySelector("[data-yjcm-progress-backdrop='normal']");
			if (backdrop) set(backdrop, "display", "none");
			set(image, "content", moon ? "normal" : 'url("' + new URL("xf_newTimeBar" + (image.getAttribute("src").includes("_red_") ? "_red_1.png" : "_1.png"), image.src).href + '")');
		}
		if (!snitch) {
			if (!dialog.classList.contains("dialog-xinsha-prompt-layout")) dialog.classList.add("dialog-xinsha-prompt-layout");
			// 留白属于布局尺寸，不能把开窗 1→1.1→1 的绘制缩放算进去，否则框高会反向伸缩。
			// 所有框均以横向比例换算留白；高度含留白自身，不能用取整后的高度反推比例。
			const dialogScale = box.width / dialog.offsetWidth || 1;
			set(dialog, "--dialog-xinsha-prompt-unit", `${scale / dialogScale}px`);
			if (fixedCardLayout) set(dialog, "--dialog-xinsha-prompt-space", `${150 * scale / dialogScale}px`);
		}
		observe();
	};
	const schedule = () => {
		if (state.promptLayout === layout && !layout.frame) layout.frame = requestAnimationFrame(() => { layout.frame = 0; layout.update(); });
	};
	layout.mutations = new MutationObserver(records => {
		if (!dialog.isConnected || document.body.dataset.style !== "othersOff") return clearXinshaPromptLayout(state);
		if (records.some(record => record.type !== "attributes" || record.target === dialog || record.target === arena || record.target === windowElement || record.target === document.body || record.attributeName === "src" || record.target.closest?.(".hand-tip,.hand-tip-info,.dialog-ol-footer,#dui-controls,#jindutiaopl,[data-yjcm-progress]"))) schedule();
	});
	const observe = () => {
		// 丢弃本次布局自己的变更，并释放已被替换的提示/进度条观察目标；不扫描整页牌面style。
		layout.mutations.disconnect();
		const roots = new Set([document.documentElement, document.body, windowElement, arena]);
		for (let parent = dialog.parentElement; parent; parent = parent.parentElement) roots.add(parent);
		for (const node of roots) if (node) layout.mutations.observe(node, { childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "data-style"] });
		const options = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "hidden", "src"] };
		layout.mutations.observe(dialog, options);
		for (const node of arena.querySelectorAll(":scope > .hand-tip,:scope > .hand-tip-info,#dui-controls")) layout.mutations.observe(node, options);
		for (const bar of document.querySelectorAll("#jindutiaopl,[data-yjcm-progress]")) layout.mutations.observe(bar, options);
	};
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
		// 卡牌选择动画会暂留旧 DOM；恢复原提示样式前先禁止旧窗口再次绘制提示。
		if (state.promptLayout) this.classList.add("dialog-xinsha-prompt-retiring");
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
