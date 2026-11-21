import { createXinshaPlayerAvatar } from "./xinsha-player-avatar.js";

const INSTALL_KEY = "__decadeUIXinshaBattleTools";
const IMAGE_ROOT = new URL("../../image/ui/xinsha-battle/", import.meta.url).href;
const imageUrl = file => IMAGE_ROOT + file;
const signalLoads = new WeakMap();
const SIGNAL_SPINE = "xinsha-battle/sgs_paiju_zhanshuxinhao";
const asList = value => Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

// 卡牌的 derivation 是本体的武将归属声明；技能 derivation 还可能包含技能，需排除非卡牌。
export function collectSpecialCardSeats(players, lib, get) {
	const cardsByGeneral = new Map();
	for (const [id, card] of Object.entries(lib.card || {})) {
		for (const owner of asList(card.derivation)) {
			if (!cardsByGeneral.has(owner)) cardsByGeneral.set(owner, new Set());
			cardsByGeneral.get(owner).add(id);
		}
	}
	return players.flatMap((player, index) => {
		const names = [...new Set([player.isUnseen?.(0) ? null : player.name1 || player.name, player.isUnseen?.(1) ? null : player.name2].filter(Boolean))];
		if (!names.length) return [];
		const cards = new Set();
		for (const name of names) {
			for (const id of cardsByGeneral.get(name) || []) cards.add(id);
			const info = get.character?.(name) || lib.character?.[name];
			const skills = [...asList(info?.skills || info?.[3]), ...asList(player.getSkills?.())];
			for (const skill of skills) {
				for (const id of asList(lib.skill?.[skill]?.derivation)) if (lib.card?.[id]) cards.add(id);
			}
		}
		return cards.size ? [{ player, names, cards: [...cards], seat: player.getSeatNum?.() || index + 1 }] : [];
	}).sort((a, b) => a.seat - b.seat);
}

export class XinshaBattleTools {
	constructor({ lib, game, ui, get, status, animation = () => globalThis.decadeUI?.animation }) {
		Object.assign(this, { lib, game, ui, get, status, animation });
		this.effects = new Set();
		this.audios = new Set();
		this.cleanups = [];
		this.selected = false;
		this.disposed = false;
		this.onDocumentClick = this.onDocumentClick.bind(this);
	}
	getPlayers() {
		return (this.game.players || []).filter(player => !player.isDead?.() && !player.classList.contains("dead"));
	}
	mount() {
		this.root = document.createElement("div");
		this.root.className = "xinsha-battle-tools";
		(this.ui.window || this.ui.arena?.parentElement || document.body).appendChild(this.root);
		this.signalButton = this.createButton("xinsha-battle-signal", "发送集火信号", "tactical-signal.png");
		this.signalButton.setAttribute("aria-pressed", "false");
		this.cardButton = this.createButton("xinsha-battle-special", "武将专属卡牌", "gameinfo_specialCard_btn.png");
		this.listen(this.signalButton, "click", event => {
			event.stopPropagation();
			this.setSelected(!this.selected);
		});
		this.listen(this.cardButton, "click", event => {
			event.stopPropagation();
			this.setSelected(false);
			if (this.panel) this.closeCards();
			else this.openCards();
		});
		this.listen(document, "click", this.onDocumentClick, true);
		this.listen(document, "keydown", event => {
			if (event.key !== "Escape" || (!this.selected && !this.panel)) return;
			this.setSelected(false);
			this.closeCards();
			event.stopImmediatePropagation();
		}, true);
		const blockTargetTouch = event => {
			if (this.selected && event.target.closest?.(".xinsha-battle-target")) event.stopImmediatePropagation();
		};
		for (const type of ["pointerdown", "touchstart", "touchend"]) this.listen(document, type, blockTargetTouch, true);
		this.resizeObserver = new ResizeObserver(() => this.positionCards());
		this.resizeObserver.observe(this.root);
		this.refresh();
		return this;
	}
	listen(node, name, callback, options) {
		node.addEventListener(name, callback, options);
		this.cleanups.push(() => node.removeEventListener(name, callback, options));
	}
	createButton(className, label, image) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = className;
		button.title = label;
		button.setAttribute("aria-label", label);
		button.style.backgroundImage = `url("${imageUrl(image)}")`;
		this.root.appendChild(button);
		return button;
	}
	refresh() {
		if (this.disposed) return;
		const live = this.getPlayers();
		this.signalButton.hidden = !live.includes(this.game.me) || live.length < 2 || !!this.status.video;
		this.roster = this.lib.config.mode !== "guozhan" && Number(this.game.roundNumber || 1) <= 1
			? collectSpecialCardSeats([...live, ...(this.game.dead || [])], this.lib, this.get) : [];
		this.cardButton.hidden = !this.roster.length;
		if (this.panel) {
			if (!this.roster.length) this.closeCards();
			else this.openCards(this.activePlayer);
		}
		if (this.selected) this.setSelected(!this.signalButton.hidden);
	}
	setSelected(selected) {
		this.selected = !!selected && !this.signalButton.hidden && !this.disposed;
		this.signalButton.setAttribute("aria-pressed", String(this.selected));
		this.clearTargets();
		if (!this.selected) return;
		this.closeCards();
		this.targets = this.getPlayers().filter(player => player !== this.game.me).map(player => {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "xinsha-battle-target";
			button.setAttribute("aria-label", `集火${this.get.translation(player.name1 || player.name)}`);
			button.style.setProperty("--xinsha-signal-image", `url("${imageUrl("tactical-signal.png")}")`);
			button._xinshaTarget = player;
			player.appendChild(button);
			return button;
		});
	}
	clearTargets() {
		for (const target of this.targets || []) target.remove();
		this.targets = [];
	}
	onDocumentClick(event) {
		if (this.disposed) return;
		if (this.root.contains(event.target)) return;
		if (this.selected) {
			const target = event.target.closest?.(".xinsha-battle-target")?._xinshaTarget;
			this.setSelected(false);
			event.stopImmediatePropagation();
			event.preventDefault();
			if (target && this.getPlayers().includes(target)) this.sendSignal(target);
		} else if (this.panel) this.closeCards();
	}
	sendSignal(target) {
		const now = performance.now();
		if (this.lastSignalTime != null && now - this.lastSignalTime < 300) return;
		this.lastSignalTime = now;
		const source = this.game.me;
		if (typeof this.game.broadcastAll === "function") {
			this.game.broadcastAll(function (source, target) {
				globalThis.__decadeUIXinshaBattleTools?.receiveSignal(source, target);
			}, source, target);
		} else void this.receiveSignal(source, target);
	}
	async receiveSignal(source, target) {
		if (this.disposed || this.status.over || this.status.video || !this.getPlayers().includes(target)) return;
		if (source !== this.game.me && source?.side !== undefined && source.side !== this.game.me?.side) return;
		const animation = this.animation();
		if (!animation?.gl) return;
		const effect = { done: false, sprite: null };
		const complete = effect.complete = () => {
			if (effect.done) return;
			effect.done = true;
			clearTimeout(effect.timer);
			if (effect.sprite && !effect.sprite.completed) animation.stopSpine(effect.sprite);
			this.effects.delete(effect);
		};
		this.effects.add(effect);
		effect.timer = setTimeout(complete, 10000);
		try {
			let loaded = signalLoads.get(animation);
			if (!loaded) {
				loaded = new Promise((resolve, reject) => animation.hasSpine(SIGNAL_SPINE) ? resolve() : animation.loadSpine(SIGNAL_SPINE, "skel", resolve, () => reject(new Error("Tactical signal Spine failed to load"))))
					.catch(error => { signalLoads.delete(animation); throw error; });
				signalLoads.set(animation, loaded);
			}
			await loaded;
			if (this.disposed || effect.done || this.status.over || !target.isConnected || !this.getPlayers().includes(target)) return complete();
			effect.sprite = animation.playSpine({
				name: SIGNAL_SPINE, action: "play", loop: false, oncomplete: complete,
				onupdate: () => {
					if (this.disposed || this.status.over || !target.isConnected || !this.getPlayers().includes(target)) return queueMicrotask(complete);
					if (effect.sprite?.referBounds) effect.sprite.scale = effect.sprite.referBounds.width / 221;
				},
			}, { parent: target, follow: true, scale: target.offsetWidth / 221, x: [0, Math.random()], y: [0, Math.random() * 2 / 3] });
			if (!effect.sprite) return complete();
			if (this.lib.config.background_audio !== false) {
				const audio = this.game.playAudio("..", "extension", "十周年UI", "audio", "xinsha-battle", "gongji.mp3");
				if (audio?.pause) {
					this.audios.add(audio);
					audio.addEventListener?.("ended", () => this.audios.delete(audio), { once: true });
				}
			}
		} catch (error) {
			console.error("[十周年UI] 集火信号播放失败：", error);
			complete();
		}
	}
	// SpecialCardTips.showWithTarget：RIGHT_TOP 对齐目标的世界左上角。
	// 原生视口矩形仅换算一次到共同 root，绕过第三方 rect 包装。
	positionCards() {
		if (!this.panel) return;
		const width = parseFloat(getComputedStyle(this.root).width);
		const root = Element.prototype.getBoundingClientRect.call(this.root);
		const button = Element.prototype.getBoundingClientRect.call(this.cardButton);
		const zoom = root.width / width, scale = width / 1920;
		Object.assign(this.panel.style, {
			left: `${(button.left - root.left) / zoom - 715 * scale}px`, top: `${(button.top - root.top) / zoom}px`,
			transform: `scale(${scale})`,
		});
	}
	openCards(player) {
		this.closeCards();
		if (!this.roster.length) return;
		const panel = this.panel = document.createElement("section");
		panel.className = "xinsha-battle-special-panel";
		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-label", "武将专属卡牌说明");
		const tabs = document.createElement("nav");
		tabs.className = "xinsha-battle-special-tabs";
		const list = document.createElement("div");
		list.className = "xinsha-battle-special-list";
		panel.append(tabs, list);
		this.root.appendChild(panel);
		const active = this.roster.find(row => row.player === player) || this.roster[0];
		for (const row of this.roster) {
			const tab = document.createElement("button");
			tab.type = "button";
			tab.className = "xinsha-battle-special-tab";
			tab.setAttribute("aria-pressed", String(row === active));
			tab.title = row.names.map(name => this.get.translation(name)).join(" / ");
			const avatar = createXinshaPlayerAvatar(tab, row.player);
			avatar.classList.add("xinsha-battle-special-avatar");
			const seat = document.createElement("span");
			seat.textContent = "一二三四五六七八九十"[row.seat - 1] || String(row.seat);
			tab.append(avatar, seat);
			tab.addEventListener("click", () => this.openCards(row.player));
			tabs.appendChild(tab);
		}
		this.activePlayer = active.player;
		this.cardResizeObserver = new ResizeObserver(entries => {
			for (const { target } of entries) {
				const card = target.firstElementChild;
				if (card?.offsetWidth) target.style.setProperty("--xinsha-card-scale", String(target.clientWidth / card.offsetWidth));
			}
		});
		for (const name of active.cards) {
			const row = document.createElement("article");
			row.className = "xinsha-battle-special-row";
			const cardHost = document.createElement("div");
			cardHost.className = "xinsha-battle-special-card";
			const info = this.lib.card[name];
			const visibleCard = [...(this.game.players || []), ...(this.game.dead || [])]
				.flatMap(owner => owner.getCards?.("ej") || []).find(card => card.name === name);
			const color = info.cardcolor;
			const suit = visibleCard?.suit || (["heart", "diamond", "spade", "club"].includes(color) ? color : color === "red" ? "heart" : "spade");
			const card = this.ui.create.card(cardHost, "noclick", true);
			card.init([suit, visibleCard?.number ?? info.number ?? "", name, visibleCard?.nature]);
			const description = document.createElement("div");
			description.className = "xinsha-battle-special-desc";
			description.innerHTML = this.get.translation(`${name}_info`) || this.get.translation(name);
			row.append(cardHost, description);
			list.appendChild(row);
			this.cardResizeObserver.observe(cardHost);
		}
		this.positionCards();
		for (const host of list.querySelectorAll(".xinsha-battle-special-card")) {
			const card = host.firstElementChild;
			if (card?.offsetWidth) host.style.setProperty("--xinsha-card-scale", String(host.clientWidth / card.offsetWidth));
		}
		// 原生滚动支持滚轮、触屏与键盘，不依赖大厅滚动模块。
		list.tabIndex = 0;
	}
	closeCards() {
		this.cardResizeObserver?.disconnect();
		this.cardResizeObserver = null;
		this.panel?.remove();
		this.panel = null;
	}
	destroy() {
		if (this.disposed) return;
		this.disposed = true;
		this.setSelected(false);
		this.closeCards();
		for (const cleanup of this.cleanups.splice(0)) cleanup();
		for (const effect of [...this.effects]) effect.complete();
		for (const audio of this.audios) audio.pause?.();
		this.audios.clear();
		this.resizeObserver?.disconnect();
		this.root?.remove();
		if (globalThis[INSTALL_KEY] === this) delete globalThis[INSTALL_KEY];
	}
}

const installations = new WeakMap();
export function installXinshaBattleTools({ lib, game, ui, get, status }) {
	if (installations.has(game)) return installations.get(game);
	const enabled = () => lib.config.extension_十周年UI_enable !== false && lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && !status.video && !status.over;
	let styleReady, disposed = false;
	const stop = () => globalThis[INSTALL_KEY]?.destroy();
	const prepareStyle = () => styleReady ||= new Promise((resolve, reject) => {
		let link = document.getElementById("xinsha-battle-tools-css");
		if (link?.sheet) return resolve();
		if (!link) {
			link = document.createElement("link"); link.id = "xinsha-battle-tools-css"; link.rel = "stylesheet";
			link.href = new URL("../styles/xinsha-battle-tools.css", import.meta.url).href;
		}
		link.addEventListener("load", resolve, { once: true });
		link.addEventListener("error", () => { styleReady = null; link.remove(); reject(new Error("Xinsha battle tools stylesheet failed to load")); }, { once: true });
		if (!link.isConnected) document.head.append(link);
	});
	async function refresh(started = false) {
		if (disposed) return;
		if (!enabled()) return stop();
		if (!ui.window?.isConnected || !game.me || !game.players?.length || !(started || status.gameStarted || game.roundNumber > 0)) return;
		try { await prepareStyle(); }
		catch (error) { console.error("[十周年UI] 对局工具样式加载失败：", error); return; }
		if (disposed || !enabled() || !ui.window?.isConnected) return;
		const current = globalThis[INSTALL_KEY];
		if (current && !current.disposed && current.root?.isConnected) current.refresh();
		else { current?.destroy(); globalThis[INSTALL_KEY] = new XinshaBattleTools({ lib, game, ui, get, status }).mount(); }
	}
	const skill = "decadeUI_xinshaBattleTools";
	lib.skill[skill] = {
		trigger: { global: ["gameStart", "roundStart", "enterGame", "dieAfter", "showCharacterAfter", "changeSkillsAfter"] },
		forced: true, popup: false, firstDo: true, charlotte: true,
		filter: enabled, async content() { await refresh(true); },
	};
	game.addGlobalSkill(skill);
	const observer = new MutationObserver(() => {
		const current = globalThis[INSTALL_KEY];
		if (!enabled() || current && !current.root?.isConnected) stop();
		else if (!current) void refresh();
	});
	observer.observe(document.body, { attributes: true, attributeFilter: ["data-style"] });
	// arenaReady 时 ui.window 才创建，观察宿主移除而不监视整个牌局子树。
	const ready = () => { if (disposed) return; if (ui.window) observer.observe(ui.window, { childList: true }); void refresh(); };
	const readyCallbacks = lib.arenaReady ||= [], overCallbacks = lib.onover ||= [];
	readyCallbacks.push(ready);
	overCallbacks.push(stop);
	if (globalThis.decadeUI?.create) globalThis.decadeUI.create.playerAvatar = createXinshaPlayerAvatar;
	const manager = { refresh, stop, dispose() {
		if (disposed) return; disposed = true; stop(); observer.disconnect();
		game.removeGlobalSkill?.(skill); if (lib.skill[skill]?.filter === enabled) delete lib.skill[skill];
		for (const [list, callback] of [[readyCallbacks, ready], [overCallbacks, stop]]) { const i = list.indexOf(callback); if (i >= 0) list.splice(i, 1); }
		installations.delete(game);
	} };
	installations.set(game, manager);
	if (ui.window) ready();
	return manager;
}
