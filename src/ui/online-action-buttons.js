import { lib, game, ui, _status } from "noname";

function syncOnlineControlVisibility() {
	let resolving = false;
	if (lib.config.extension_十周年UI_newDecadeStyle === "onlineUI" && _status.gameStarted && !_status.over && !ui.arena?.classList.contains("choose-character")) {
		const visited = new Set();
		for (let event = _status.event; event && !visited.has(event); event = event.parent) {
			visited.add(event);
			if (/^chooseCharacter/.test(event.name)) break;
			// 本体的当前操作优先：顺拆取牌为 gainPlayerCard/discardPlayerCard，不能只认 choose 前缀。
			// backup 后的事件可能保留旧 result；最终提交的完整 uncheck 才会清除 imchoosing。
			if (event.isMine?.() && ((event === _status.event && _status.imchoosing) || (/^choose/.test(event.name) && !event.result))) break;
			if (["useCard", "respond", "useSkill"].includes(event.name) || (["chooseToUse", "chooseToRespond"].includes(event.name) && event.result?.bool)) {
				resolving = true;
				break;
			}
		}
	}
	ui.control?.classList.toggle("online-controls-resolving", resolving);
}

function selectedRecastCard(event) {
	if (event?.name !== "chooseToUse" || event.type !== "phase" || event.player !== game.me || event.skill || !event.isMine()) return null;
	const cards = ui.selected.cards;
	if (cards.length !== 1 || !lib.skill._recasting || !lib.filter.filterEnable(event, event.player, "_recasting")) return null;
	return lib.skill._recasting.filterCard(cards[0], event.player) ? cards[0] : null;
}

function recastSelectedCard() {
	const event = _status.event;
	const card = selectedRecastCard(event);
	if (!card) return;
	// 复用本体技能的备份、选牌和确认流程，结算仍由 _recasting 完成。
	ui.click.skill("_recasting");
	if (card.classList.contains("selectable")) {
		_status.clicked = false;
		ui.click.card.call(card);
		if (!event.result?.bool && event.skill === "_recasting" && ui.selected.cards.includes(card) && game.check()) ui.click.ok(ui.confirm?.node.ok);
	}
}

export function attachOnlineRecastButton(confirm) {
	const button = document.createElement("div");
	button.className = "online-recast-button";
	button.textContent = "重铸";
	button.link = "_recasting";
	button.setAttribute("role", "button");
	button.style.display = "none";
	// 本体仍通过 firstChild/lastChild 取得确定与取消。
	confirm.insertBefore(button, confirm.node.cancel);
	confirm.recastButton = button;
	button.addEventListener(lib.config.touchscreen ? "touchend" : "click", event => {
		event.stopPropagation();
		recastSelectedCard();
	});
}

function syncOnlineSelectionButtons(quickSelect = _status.event?.aiChoose || _status.event?.promptdiscard) {
	if (!quickSelect?.classList.contains("online-quick-select")) return;
	const chooseAll = _status.event?.cardChooseAll;
	const hasChooseAll = chooseAll?.isConnected === true && !chooseAll.classList.contains("removing");
	// 官方按钮共用一个槽位，选中手牌后切换到本体的反选控件。
	const showReverse = hasChooseAll && ui.selected.cards.length > 0;
	quickSelect.classList.toggle("online-selection-hidden", showReverse);
	if (hasChooseAll) {
		chooseAll.classList.add("online-card-choose-all");
		chooseAll.classList.toggle("online-selection-hidden", !showReverse);
	}
}

export function syncOnlineActionButtons() {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI") return;
	syncOnlineSelectionButtons();
	const confirm = ui.confirm;
	if (!confirm?.recastButton || !confirm.isConnected || confirm.classList.contains("closing")) return;
	const button = confirm.recastButton;
	button.style.display = selectedRecastCard(_status.event) ? "flex" : "none";
	const ok = confirm.node.ok;
	const cancel = confirm.node.cancel;
	// 设计坐标以确定按钮 207px 为基准，跟随当前确认栏的实际缩放。
	const scale = ok.offsetWidth / 207;
	const offsetIn = (node, parent) => {
		const rect = node.getBoundingClientRect();
		const parentRect = parent.getBoundingClientRect();
		const zoom = parentRect.width / parent.offsetWidth || 1;
		return { left: (rect.left - parentRect.left) / zoom, top: (rect.top - parentRect.top) / zoom };
	};
	const parent = button.offsetParent || ui.control;
	const okPosition = offsetIn(ok, parent);
	const cancelPosition = offsetIn(cancel, parent);
	button.style.setProperty("--ol-action-scale", scale);
	button.style.left = `${okPosition.left + ok.offsetWidth / 2 - 322 * scale}px`;
	button.style.top = `${cancelPosition.top + cancel.offsetHeight / 2 - 26 * scale}px`;
	for (const control of ui.controls) {
		if (!control.matches(".online-quick-select, .online-card-choose-all") || !control.isConnected || control.classList.contains("closing")) continue;
		const parent = control.offsetParent || ui.control;
		const okPosition = offsetIn(ok, parent);
		const cancelPosition = offsetIn(cancel, parent);
		control.style.setProperty("--ol-action-scale", scale);
		control.style.setProperty("--ol-action-left", `${okPosition.left + ok.offsetWidth / 2 - 322 * scale}px`);
		control.style.setProperty("--ol-action-top", `${cancelPosition.top + cancel.offsetHeight / 2 - 26 * scale}px`);
	}
	const ignore = ui.tempnowuxie;
	if (!ignore?.classList.contains("online-tempnowuxie") || !ignore.isConnected) return;
	const ignorePosition = offsetIn(cancel, ignore.offsetParent || ui.control);
	ignore.style.setProperty("--ol-action-scale", scale);
	ignore.style.setProperty("--ol-action-left", `${ignorePosition.left + cancel.offsetWidth / 2 + 161.5 * scale}px`);
	ignore.style.setProperty("--ol-action-top", `${ignorePosition.top + cancel.offsetHeight / 2 - 31.5 * scale}px`);
}

export function initOnlineActionButtons() {
	lib.announce.subscribe("Noname.Game.Event.Changed", syncOnlineControlVisibility);
	lib.hooks.checkEnd.add(syncOnlineControlVisibility);
	lib.onover.push(() => ui.control?.classList.remove("online-controls-resolving"));
	const createControl = ui.create.control;
	ui.create.control = function (...args) {
		const control = createControl.apply(this, args);
		if (lib.config.extension_十周年UI_newDecadeStyle === "onlineUI" && (Array.isArray(args[0]) ? args[0] : args).includes("AI代选")) {
			control.classList.add("online-quick-select");
			control.firstChild.textContent = "一键选择";
			syncOnlineSelectionButtons(control);
			requestAnimationFrame(syncOnlineActionButtons);
		}
		if ((Array.isArray(args[0]) ? args[0] : args).includes(ui.click.tempnowuxie)) {
			control.classList.add("online-tempnowuxie");
			control.firstChild.textContent = "本次不无懈";
			requestAnimationFrame(syncOnlineActionButtons);
		}
		return control;
	};
	lib.hooks.checkEnd.add(syncOnlineActionButtons);
	lib.hooks.uncheckEnd.add(() => {
		syncOnlineControlVisibility();
		if (ui.confirm?.recastButton) ui.confirm.recastButton.style.display = "none";
	});
	// 原生控件会在确认栏前创建；尺寸变化后重新对齐，不移动或重建其 DOM。
	const observer = new ResizeObserver(syncOnlineActionButtons);
	const observeConfirm = confirm => {
		observer.disconnect();
		observer.observe(ui.control);
		observer.observe(confirm);
	};
	return observeConfirm;
}
