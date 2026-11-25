import { createXinshaPlayerTab } from "./xinsha-player-avatar.js";

const installations = new WeakMap();

export function installXinshaRecord({ lib, game, ui, get, status }) {
	if (installations.has(game)) return installations.get(game);
	let disposed = false;
	const enabled = () => !disposed && lib.config.extension_十周年UI_enable !== false && lib.config.extension_十周年UI_newDecadeStyle === "othersOff";
	const participants = new WeakMap();
	const originalLog = game.log, originalPause = ui.click.pause;
	let panel, roster, activePlayer, observer, resizeObserver, lifecycleObserver, previousFocus, savedUI;
	const stylesheet = document.createElement("link");
	stylesheet.rel = "stylesheet";
	stylesheet.href = new URL("../styles/xinsha-record.css", import.meta.url).href;
	document.head.appendChild(stylesheet);

	// 本体日志仍由原入口生成、广播和录制；仅给新日志节点保存只读玩家关联。
	function log(...args) {
		const before = ui.sidebar?.firstChild;
		const result = originalLog.apply(this, args);
		const node = ui.sidebar?.firstChild;
		if (enabled() && node && node !== before) {
			const players = new Set();
			for (const value of args) {
				const type = get.itemtype(value);
				if (type === "player") players.add(value);
				else if (type === "players") for (const player of value) players.add(player);
			}
			if (players.size) participants.set(node, players);
		}
		return result;
	}
	game.log = log;

	function getRoster() {
		return [...new Set([...(game.players || []), ...(game.dead || [])])]
			.map((player, index) => ({ player, seat: player.getSeatNum?.() || index + 1 }))
			.sort((a, b) => a.seat - b.seat);
	}
	function namesOf(player) {
		// 暗将不使用真实姓名，复用本体对该玩家的可见翻译。
		return [...new Set([!player.isUnseen?.(0) && get.translation(player),
			!player.isUnseen?.(0) && get.translation(player.name1 || player.name),
			player.name2 && !player.isUnseen?.(1) && get.translation(player.name2),
		].filter(name => typeof name === "string" && name && !name.includes("<")))];
	}
	function relatesTo(node, player, names) {
		const known = participants.get(node);
		if (known) return known.has(player);
		const text = node.textContent || "";
		const seat = roster.find(row => row.player === player)?.seat;
		if (new RegExp(`(?:^|[^0-9])${seat}号位`).test(text)) return true;
		// 旧日志、录像和联机的字符串日志没有对象关联：优先完整高亮姓名，
		// 再按最长的可见译名匹配；同名且无法区分的记录不猜座位。
		const labels = [...node.querySelectorAll(".bluetext")].map(span => span.textContent);
		let remaining = text;
		for (const entry of names) {
			const unique = names.filter(other => other.name === entry.name).length === 1;
			const matches = labels.length ? labels.includes(entry.name) : remaining.includes(entry.name);
			if (matches && unique && entry.player === player) return true;
			if (!labels.length && matches) remaining = remaining.split(entry.name).join(" ");
		}
		return false;
	}
	function render() {
		if (!panel) return;
		const list = panel.querySelector(".xinsha-record-list");
		const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 4;
		const oldTop = list.scrollTop;
		const fragment = document.createDocumentFragment();
		const names = activePlayer ? roster.flatMap(row => namesOf(row.player).map(name => ({ player: row.player, name })))
			.sort((a, b) => b.name.length - a.name.length) : [];
		for (const node of [...ui.sidebar.children].reverse()) {
			if (activePlayer && !relatesTo(node, activePlayer, names)) continue;
			const row = node.cloneNode(true);
			row.className = "xinsha-record-row";
			row.removeAttribute("style");
			fragment.appendChild(row);
		}
		list.replaceChildren(fragment);
		list.scrollTop = atBottom ? list.scrollHeight : oldTop;
	}
	function select(player = null) {
		activePlayer = player;
		for (const tab of panel.querySelectorAll(".xinsha-player-tab")) tab.setAttribute("aria-pressed", String(tab._recordPlayer === player));
		render();
		panel.querySelector(".xinsha-record-list").scrollTop = 1e9;
	}
	function position() {
		if (!panel) return;
		const host = ui.window;
		const unit = Math.min(host.clientWidth / 1334, host.clientHeight / 750);
		const safe = !lib.device || host.clientWidth / host.clientHeight > 1.86 ? 60 : 0;
		const width = Math.max(1334, Math.min(1750, host.clientWidth / unit - safe * 2));
		const scene = panel.firstElementChild;
		Object.assign(scene.style, {
			left: `${(host.clientWidth - width * unit) / 2}px`, top: `${Math.max(0, (host.clientHeight - 750 * unit) / 2)}px`, transform: `scale(${unit})`,
		});
	}
	function onKey(event) {
		if (event.key === "Escape") {
			event.preventDefault(); event.stopImmediatePropagation(); close();
		} else if (event.key === "Tab") {
			const nodes = [...panel.querySelectorAll("button,[tabindex='0']")];
			const index = nodes.indexOf(document.activeElement);
			nodes[(index + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length]?.focus();
			event.preventDefault(); event.stopImmediatePropagation();
		}
	}
	function close() {
		if (!panel) return;
		observer?.disconnect(); resizeObserver?.disconnect(); lifecycleObserver?.disconnect();
		observer = resizeObserver = lifecycleObserver = null;
		document.removeEventListener("keydown", onKey, true);
		panel.remove(); panel = null; roster = null; activePlayer = null;
		ui.window.classList.remove("xinsha-record-open");
		if (!savedUI.systemHidden) ui.system.show();
		if (!savedUI.timeHidden) ui.time.show();
		game.resume2();
		game.onresume?.();
		if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
		previousFocus = null;
	}
	function open() {
		if (!enabled() || panel || status.paused2 || status.pausing || status.nopause || (!status.video && (!status.gameStarted || lib.config.test_game))) return;
		if (!ui.sidebar || !ui.window) return;
		ui.click.shortcut(false);
		previousFocus = document.activeElement;
		savedUI = { systemHidden: ui.system.classList.contains("hidden"), timeHidden: ui.time.classList.contains("hidden") };
		ui.system.hide(); ui.time.hide(); game.pause2();
		panel = document.createElement("div");
		panel.className = "xinsha-record-overlay";
		panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "牌局记录"); panel.setAttribute("aria-modal", "true");
		const scene = document.createElement("section"); scene.className = "xinsha-record-scene";
		const title = document.createElement("h2"); title.className = "xinsha-record-title"; title.textContent = "牌局记录";
		const list = document.createElement("div"); list.className = "xinsha-record-list"; list.tabIndex = 0; list.setAttribute("aria-label", "牌局记录内容");
		const tabs = document.createElement("nav"); tabs.className = "xinsha-record-tabs"; tabs.setAttribute("aria-label", "按人物查看记录");
		scene.append(title, list, tabs); panel.appendChild(scene); ui.window.appendChild(panel);
		ui.window.classList.add("xinsha-record-open");
		roster = getRoster();
		for (const row of [{ player: null, label: "全部" }, ...roster]) {
			const tab = createXinshaPlayerTab(tabs, {
				...row, title: row.player ? `${row.seat}号位 ${namesOf(row.player).join(" / ") || "未知武将"}` : "全部", selected: !row.player,
				onClick: event => { event.stopPropagation(); select(row.player); },
			});
			tab._recordPlayer = row.player;
		}
		// 面板内滚动/点击不穿透牌局；右侧空白沿原记录入口的习惯点击关闭。
		for (const type of ["click", "touchend", "pointerdown", "mousedown", "contextmenu"]) scene.addEventListener(type, event => event.stopPropagation());
		panel.addEventListener("click", event => { event.stopPropagation(); close(); });
		panel.addEventListener("contextmenu", event => { event.preventDefault(); event.stopPropagation(); close(); });
		document.addEventListener("keydown", onKey, true);
		observer = new MutationObserver(render); observer.observe(ui.sidebar, { childList: true });
		resizeObserver = new ResizeObserver(position); resizeObserver.observe(ui.window);
		lifecycleObserver = new MutationObserver(() => { if (!panel?.isConnected || !enabled()) close(); });
		lifecycleObserver.observe(ui.window, { childList: true }); lifecycleObserver.observe(document.body, { attributes: true, attributeFilter: ["data-style"] });
		position(); select(); list.focus({ preventScroll: true }); game.onpause?.();
	}
	function pause(...args) {
		if (!enabled()) return originalPause.apply(this, args);
		if (!status.video && (!ui.pause || ui.pause.classList.contains("hidden"))) return;
		open();
	}
	ui.click.pause = pause;
	// 本体系统栏/快捷菜单可能早于皮肤安装，节点仍持有旧 pause 回调。
	// 只接管这两个原入口，其他风格继续使用各节点原来的监听器。
	function onEntry(event) {
		if (!enabled() || !(event.target instanceof Element)) return;
		const shortcut = ui.shortcut?.querySelector('[data-position="4"]');
		const entry = [ui.pause, shortcut].find(node => node?.contains(event.target));
		if (!entry) return;
		event.preventDefault(); event.stopImmediatePropagation(); pause.call(entry, event);
	}
	for (const type of ["click", "touchend"]) document.addEventListener(type, onEntry, true);
	const onover = lib.onover;
	onover?.push(close);
	const api = { open, close, get panel() { return panel; }, dispose() {
		if (disposed) return;
		close();
		disposed = true;
		if (game.log === log) game.log = originalLog;
		if (ui.click.pause === pause) ui.click.pause = originalPause;
		for (const type of ["click", "touchend"]) document.removeEventListener(type, onEntry, true);
		const index = onover?.indexOf(close); if (index >= 0) onover.splice(index, 1);
		stylesheet.remove(); installations.delete(game);
	} };
	installations.set(game, api);
	return api;
}
