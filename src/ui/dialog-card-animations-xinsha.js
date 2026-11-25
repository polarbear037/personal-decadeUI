import { lib, ui, _status } from "noname";

const states = new WeakMap();
const liveStates = new Set();
const cardSelector = ".button.card,.button.vcard,.buttons>.card";
const entryDuration = 800 / 3;
const selectionDuration = 20000 / 30;
// 500ms仅控制退出画面的保留时间；原生确认与close同步完成，不等待动画。
const selectionCloseDelay = 500;

function enabled(dialog) {
	return lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && dialog &&
		!ui.arena?.classList.contains("choose-character") && typeof dialog.getCurrentCapt !== "function" &&
		!dialog.classList.contains("online-faction-dialog") && dialog.dataset.xinshaCardAnimations !== "off";
}

function saveStyle(state, node, key, value) {
	let styles = state.styles.get(node);
	if (!styles) state.styles.set(node, styles = new Map());
	if (!styles.has(key)) styles.set(key, [node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]);
	node.style.setProperty(key, value, "important");
}

function restoreStyles(state) {
	for (const [node, styles] of state.styles) for (const [key, [value, priority]] of styles) {
		if (value) node.style.setProperty(key, value, priority);
		else node.style.removeProperty(key);
	}
	state.styles.clear();
}

function releaseClipping(state, cards) {
	const parents = new Set();
	for (const card of cards) for (let node = card.parentElement; node && node !== state.dialog.parentElement; node = node.parentElement) {
		if (parents.has(node)) continue;
		parents.add(node);
		let saved = state.clips.get(node);
		if (!saved) {
			saved = { count: 0, styles: ["overflow", "overflow-x", "overflow-y"].map(key => [key, node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]) };
			state.clips.set(node, saved);
			for (const key of ["overflow", "overflow-x", "overflow-y"]) node.style.setProperty(key, "visible", "important");
		}
		saved.count++;
	}
	let released = false;
	return () => {
		if (released) return;
		released = true;
		for (const node of parents) {
			const saved = state.clips.get(node);
			if (!saved || --saved.count > 0) continue;
			for (const [key] of saved.styles) node.style.removeProperty(key);
			for (const [key, value, priority] of saved.styles) if (value) node.style.setProperty(key, value, priority);
			state.clips.delete(node);
		}
	};
}

function cardsIn(dialog) {
	return Array.from(dialog.querySelectorAll(cardSelector)).filter(card => typeof card.animate === "function");
}

function animateEntry(state) {
	if (state.disposed || state.selecting || !enabled(state.dialog) || !state.dialog.isConnected || state.dialog.classList.contains("hidden")) return;
	const all = cardsIn(state.dialog);
	// 自定义分区标记优先；普通新建选牌框直接把其卡牌按钮视为手牌展示区。
	const handAreas = state.options.handAreas || Array.from(state.dialog.querySelectorAll('[data-dialog-card-area="hand"],.lei-yijiang-sc-h,.handcards'));
	// 已声明分区或显式传入空手牌列表时，没有手牌就是不播放，不能退回整框入场。
	const partitioned = state.options.handAreas !== undefined || handAreas.length > 0 || state.dialog.querySelector('[data-dialog-card-area],.lei-yijiang-sc-zone');
	const cards = all.filter(card => !state.entered.has(card) && (!partitioned || handAreas.some(area => area.contains(card))));
	if (!cards.length) return;
	const viewport = ui.window || ui.arena;
	const view = viewport.getBoundingClientRect();
	const release = releaseClipping(state, cards);
	const animations = [];
	const areas = new Map();
	// 先量完所有终点，再统一启动动画；逐张读位置/写动画会反复刷新整组牌的布局。
	const entries = cards.map(card => {
		state.entered.add(card);
		const rect = card.getBoundingClientRect();
		if (!(rect.width && rect.height && card.offsetWidth)) return null;
		const area = handAreas.find(area => area.contains(card)) || card.parentElement;
		if (!areas.has(area)) areas.set(area, area.getBoundingClientRect());
		const areaRect = areas.get(area);
		const source = typeof state.options.entryFrom === "function" ? state.options.entryFrom(card, area, view) : state.options.entryFrom;
		// 原版数字牌从手牌容器的(display.cx,display.height)移向排序落点。
		// DOM 使用向下的Y轴；保留同一右上起点，让整组牌斜向下展开到各自落点。
		const fromX = source?.x ?? areaRect.left + view.width / 2;
		const fromY = source?.y ?? areaRect.bottom - view.height - rect.height;
		const sx = rect.width / card.offsetWidth;
		const sy = rect.height / card.offsetHeight || sx;
		const translate = getComputedStyle(card).translate;
		const [x = "0px", y = "0px"] = translate === "none" ? [] : translate.split(/\s+/);
		return { card, keyframes: [
			{ translate: `calc(${x} + ${(fromX - rect.left) / sx}px) calc(${y} + ${(fromY - rect.top) / sy}px)` },
			{ translate: translate === "none" ? "0px 0px" : translate },
		] };
	}).filter(Boolean);
	for (const { card, keyframes } of entries) {
		const animation = card.animate(keyframes, { duration: entryDuration, easing: "cubic-bezier(.39,.575,.565,1)", fill: "backwards" });
		state.entries.add(animation);
		animations.push(animation.finished.catch(() => {}).finally(() => state.entries.delete(animation)));
	}
	Promise.all(animations).finally(release);
}

function selectedCards(state) {
	const { dialog, event } = state;
	const selected = ui.selected?.buttons || [];
	const result = event?.result;
	return cardsIn(dialog).filter(card => selected.includes(card) || card.classList.contains("selected") ||
		result?.bool && (result.buttons?.includes(card) || result.links?.includes(card.link)));
}

function playSelection(dialog, cards) {
	const state = states.get(dialog);
	if (!state || state.disposed) return Promise.resolve(false);
	if (state.pending) return state.pending;
	cards = (cards || selectedCards(state)).filter(card => dialog.contains(card) && card.matches(cardSelector));
	if (!cards.length) return Promise.resolve(false);
	const starts = new Map(cards.map(card => [card, card.getBoundingClientRect()]));
	for (const animation of state.entries) animation.cancel();
	state.entries.clear();
	const release = releaseClipping(state, cards);
	state.selectionDone = false;
	state.selecting = true;
	dialog.classList.add("dialog-xinsha-card-selecting");
	const animations = cards.map(card => {
		saveStyle(state, card, "transform-origin", "0% 100%");
		saveStyle(state, card, "z-index", "1000");
		// 改锚点不能让已有transform/scale的牌跳位；以点击时的左下角补偿一次平移。
		const before = starts.get(card), after = card.getBoundingClientRect();
		const parent = card.parentElement, parentRect = parent.getBoundingClientRect();
		const sx = parentRect.width / parent.offsetWidth || 1;
		const sy = parentRect.height / parent.offsetHeight || sx;
		const computed = getComputedStyle(card);
		const [x = "0px", y = "0px"] = computed.translate === "none" ? [] : computed.translate.split(/\s+/);
		const translate = `calc(${x} + ${(before.left - after.left) / sx}px) calc(${y} + ${(before.bottom - after.bottom) / sy}px)`;
		const scales = computed.scale === "none" ? [1] : computed.scale.split(/\s+/).map(Number);
		const animation = card.animate([{ scale: scales.join(" "), opacity: computed.opacity, translate }, { scale: scales.map(value => value * 1.5).join(" "), opacity: "0", translate }], {
			duration: selectionDuration, easing: "linear", fill: "forwards",
		});
		state.selections.add(animation);
		return animation.finished.catch(() => {});
	});
	const finished = Promise.all(animations).then(release);
	state.pending = Promise.race([finished, new Promise(resolve => {
		state.resolveSelection = resolve;
		state.selectionTimer = setTimeout(resolve, selectionCloseDelay);
	})]).then(() => {
		clearTimeout(state.selectionTimer);
		state.selectionTimer = 0;
		state.resolveSelection = null;
		state.selecting = false;
		state.selectionDone = !state.disposed;
		return state.selectionDone;
	});
	return state.pending;
}

function dispose(state, reusing = false) {
	if (state.disposed) return;
	state.disposed = true;
	liveStates.delete(state);
	state.observer.disconnect();
	state.parentObserver?.disconnect();
	cancelAnimationFrame(state.frame);
	clearTimeout(state.selectionTimer);
	state.resolveSelection?.();
	if (state.wrappedClose && state.dialog.close === state.wrappedClose) state.dialog.close = state.originalClose;
	if (state.savedInert != null) state.dialog.inert = state.savedInert;
	state.dialog.removeEventListener("click", state.block, true);
	state.dialog.removeEventListener("touchend", state.block, true);
	state.dialog.classList.remove("dialog-xinsha-card-selecting");
	for (const animation of state.entries) animation.cancel();
	for (const animation of state.selections) animation.cancel();
	for (const [node, saved] of state.clips) {
		for (const [key] of saved.styles) node.style.removeProperty(key);
		for (const [key, value, priority] of saved.styles) if (value) node.style.setProperty(key, value, priority);
	}
	state.clips.clear();
	restoreStyles(state);
	if (state.nativeClosed && !reusing) state.dialog.remove();
	if (states.get(state.dialog) === state) states.delete(state.dialog);
}

function wrapClose(state) {
	const original = state.dialog.close;
	if (typeof original !== "function" || original._xinshaCardState === state) return;
	const wrapped = function (...args) {
		if (state.disposed || state.closingNative) return original.apply(this, args);
		if (state.nativeClosed) return state.closeResult;
		if (enabled(this) && state.event?.isMine?.() && state.event.result?.bool && !state.pending) playSelection(this);
		if (!state.pending || state.selectionDone || !enabled(this)) {
			dispose(state);
			return original.apply(this, args);
		}
		// 原生close立即移出ui.dialogs、恢复前一窗口；仅暂留无交互的旧DOM播放画面。
		state.nativeClosed = true;
		state.savedInert = this.inert;
		this.inert = true;
		saveStyle(state, this, "pointer-events", "none");
		const ownDelete = Object.getOwnPropertyDescriptor(this, "delete");
		this.delete = function () { return this; };
		state.closingNative = true;
		try { state.closeResult = original.apply(this, args); }
		finally {
			state.closingNative = false;
			if (ownDelete) Object.defineProperty(this, "delete", ownDelete);
			else delete this.delete;
			state.pending.then(() => {
				// 同一dialog若已被重新打开，旧动画不得关闭新的选择。
				if (state.disposed || states.get(this) !== state) return;
				dispose(state);
			});
		}
		return state.closeResult;
	};
	wrapped._xinshaCardState = state;
	state.originalClose = original;
	state.wrappedClose = wrapped;
	state.dialog.close = wrapped;
}

function installConfirmHook() {
	if (typeof ui.click.ok !== "function" || ui.click.ok._xinshaCardConfirm) return;
	const original = ui.click.ok;
	const wrapped = function (...args) {
		const event = _status.event;
		const dialog = event?.dialog?.nodeType === 1 ? event.dialog : ui.dialog;
		const state = states.get(dialog);
		if (state?.submitted && state.event === event) return state.confirmResult;
		if (!event?.isMine?.() || !state || state.disposed || !enabled(dialog) || !selectedCards(state).length) return original.apply(this, args);
		playSelection(dialog);
		state.submitted = true;
		// 本地与联机都当次提交、清空全局选牌并恢复流程；动画回调不触碰_status.event。
		return state.confirmResult = original.apply(this, args);
	};
	wrapped._xinshaCardConfirm = true;
	ui.click.ok = wrapped;
}

function attach(dialog, options = {}) {
	if (!enabled(dialog)) return false;
	let state = states.get(dialog);
	if (state && !state.disposed && (state.nativeClosed || options.event && state.event && options.event !== state.event)) {
		dispose(state, true);
		state = null;
	}
	if (state && !state.disposed) {
		Object.assign(state.options, options);
		if (options.event) state.event = options.event;
		wrapClose(state);
		return true;
	}
	state = { dialog, event: options.event || _status.event, options, entered: new WeakSet(), entries: new Set(), selections: new Set(), styles: new Map(), clips: new Map(), frame: 0, disposed: false };
	states.set(dialog, state); liveStates.add(state);
	state.block = event => {
		if (!state.selecting) return;
		event.preventDefault(); event.stopImmediatePropagation();
	};
	dialog.addEventListener("click", state.block, true);
	dialog.addEventListener("touchend", state.block, true);
	const schedule = () => {
		if (!state.frame) state.frame = requestAnimationFrame(() => {
			state.frame = 0;
			if (state.disposed) return;
			state.wasConnected ||= dialog.isConnected;
			if (dialog.parentNode && !state.parentObserver) {
				state.parentObserver = new MutationObserver(() => { if (!dialog.isConnected) dispose(state); });
				state.parentObserver.observe(dialog.parentNode, { childList: true });
			}
			wrapClose(state); animateEntry(state);
		});
	};
	state.observer = new MutationObserver(records => {
		if (!dialog.isConnected && state.wasConnected) return dispose(state);
		state.wasConnected ||= dialog.isConnected;
		if (records.some(record => record.type === "childList" || record.target === dialog)) schedule();
	});
	state.observer.observe(dialog, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
	wrapClose(state); installConfirmHook(); schedule();
	return true;
}

function clear() {
	for (const state of liveStates) dispose(state);
}

/** 一将通用卡牌窗口：open自动接入；自定义布局可传handAreas和视口坐标entryFrom。 */
const xinshaDialogCardAnimations = {
	attach,
	playEnter(dialog) { const state = states.get(dialog); if (state) animateEntry(state); },
	playSelection,
	dispose(dialog) { const state = states.get(dialog); if (state) dispose(state); },
	clear,
};

export { xinshaDialogCardAnimations };
