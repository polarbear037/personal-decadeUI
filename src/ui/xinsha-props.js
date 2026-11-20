import { lib, game, ui, _status } from "noname";
import { useNewDpr } from "../animation/utils.js";

// 官方 GameAniLayer.onPlaySendItemAni：静图飞行300ms，命中后播放 Spine play。
// 官方两行顺序；猪猪侠通过原生投掷可选参数传递，其他客户端仍显示合法基础道具。
export const xinshaProps = [
	{ id: 1, emotion: "flower", name: "鲜花", icon: "gi_sl_flower_big", thumbnail: "gi_sl_flower", cost: 1, size: [75,95], spine: "SF_bianta_eff_xianhua", sound: "flower" },
	{ id: 3, emotion: "wine", name: "鸡腿", icon: "gi_sl_gift_icon3_big", thumbnail: "gi_sl_gift_icon3", cost: 10, size: [98,111], spine: "SF_bianta_eff_jitui", sound: "drumstick" },
	{ id: 37, emotion: "flower", name: "猪猪侠·表情一", icon: "gi_sl_gift_icon37_big", cost: 1, size: [100,100], spine: "SF_paiju_ZhuZhuXiabq2" },
	{ id: 38, emotion: "flower", name: "猪猪侠·表情二", icon: "gi_sl_gift_icon38_big", cost: 1, size: [100,100], spine: "SF_paiju_ZhuZhuXiabq29" },
	{ id: 2, emotion: "egg", name: "菜叶", icon: "gi_sl_greens_big", thumbnail: "gi_sl_greens", cost: 1, size: [110,110], spine: "SF_bianta_eff_caiye", sound: "greens" },
	{ id: 4, emotion: "shoe", name: "水桶", icon: "gi_sl_gift_icon4_big", thumbnail: "gi_sl_gift_icon4", cost: 10, size: [93,102], spine: "SF_paiju_shuitong", sound: "pail", offset: [-78, -103] },
	{ id: 39, emotion: "egg", name: "猪猪侠·表情三", icon: "gi_sl_gift_icon39_big", cost: 1, size: [100,100], spine: "SF_paiju_ZhuZhuXiabq34" },
	{ id: 40, emotion: "egg", name: "猪猪侠·表情四", icon: "gi_sl_gift_icon40_big", cost: 1, size: [100,100], spine: "SF_paiju_ZhuZhuXiabq36" },
];
const enabled = () => lib.config.extension_十周年UI_enable !== false && lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && !_status.over;
const url = file => `${lib.assetURL || ""}extension/十周年UI/${file}`;
const present = player => !!player && player.isConnected !== false;
function skeletonScale(node) {
	let zoom = 1;
	if (useNewDpr) for (let current = node; current; current = current.parentElement) zoom *= parseFloat(getComputedStyle(current).zoom) || 1;
	return node.getBoundingClientRect().width / zoom / 190;
}
let controller;

export function installXinshaProps() {
	if (controller) return controller;
	const prototype = lib.element.Player?.prototype || lib.element.player;
	if (!prototype?.$throwEmotion) return;
	const original = prototype.$throwEmotion, originalThrow = prototype.throwEmotion, active = new Set(), loads = new WeakMap(), listeners = [];
	let combos = new WeakMap();
	const balanceAmount = 1500 + Math.floor(Math.random() * 4001);
	let panel, selected, resize, hold, held, repeated, ignored, remembered = xinshaProps[0], last = -Infinity;
	const image = prop => url(`image/ui/xinsha-props/${prop.icon}.png`);
	const avatar = player => player === game.me ? [player.node?.avatar, player.node?.avatar2].find(node => node && !node.classList.contains("hidden") && node.getBoundingClientRect().width) || player : player;
	const propOf = (emotion, meta) => meta?.xinshaProp ? xinshaProps.find(p => p.id === meta.xinshaProp && p.emotion === emotion) : xinshaProps.find(p => p.emotion === emotion);
	const hasPoint = meta => Array.isArray(meta?.xinshaHit) && meta.xinshaHit.length === 2 && meta.xinshaHit.every(Number.isFinite);
	function throwData(source, target, prop, touch) {
		const now = performance.now(), rect = avatar(target).getBoundingClientRect(), unit = rect.width / 190 || 1, height = rect.height / unit;
		let state = combos.get(source);
		if (!state) combos.set(source, state = { points: [] });
		const count = state.target === target && state.id === prop.id && now - state.at < 5000 ? state.count + 1 : 1;
		state.target = target; state.id = prop.id; state.at = now; state.count = count;
		state.points = state.points.filter(p => now - p.at < 1000);
		const input = { x: touch?.clientX ?? rect.left + rect.width / 2, y: touch?.clientY ?? rect.top + rect.height / 2, at: now };
		const recent = [input, ...state.points], cells = Array.from({ length: 100 }, (_, i) => i);
		let point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, at: now };
		// GameGiveItemManager.getRandomWorldPt：内缩50，10×10随机取格；与点击及最近1秒落点至少相隔60。
		if (height > 100) while (cells.length) {
			const cell = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
			const dx = 9, dy = (height - 100) / 10;
			const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
			const x = randomInt(Math.floor(50 + Math.floor(cell / 10) * dx), Math.floor(50 + (Math.floor(cell / 10) + 1) * dx));
			const y = randomInt(Math.floor(50 + (cell % 10) * dy), Math.floor(50 + (cell % 10 + 1) * dy));
			const candidate = { x: rect.left + x * unit, y: rect.top + y * unit, at: now };
			if (recent.every(p => Math.hypot(candidate.x - p.x, candidate.y - p.y) / unit >= 60)) { point = candidate; break; }
		}
		state.points.push(input, point);
		// GameAniLayer首击保持中心；同目标、同道具5秒内连击才读取随机坐标。
		return { xinshaProp: prop.id, xinshaCombo: count, xinshaHit: count > 1 ? [(point.x - rect.left) / unit - 95, (point.y - rect.top) / unit - height / 2] : [0, 0] };
	}
	const listen = (type, fn, options = { capture: true, passive: false }) => { window.addEventListener(type, fn, options); listeners.push(() => window.removeEventListener(type, fn, options)); };
	function cancelHold() { clearInterval(hold); hold = null; held = null; repeated = false; }
	function notify(open) {
		for (const p of [...(game.players || []), ...(game.dead || [])]) for (const node of [p.node?.avatar, p.node?.avatar2]) if (node) node._doubleClicking = false;
		document.dispatchEvent(new CustomEvent("decadeui:xinsha-prop-visibility", { detail: { open } }));
	}
	function hide() {
		const open = !!panel;
		cancelHold(); resize?.disconnect(); panel?.remove(); panel = selected = resize = null;
		for (const node of document.querySelectorAll(".xinsha-prop-target")) node.remove();
		if (open) notify(false);
	}
	function stop() { hide(); combos = new WeakMap(); for (const entry of [...active]) entry.cleanup(); }
	async function load(animation, name) {
		let cache = loads.get(animation);
		if (!cache) loads.set(animation, cache = new Map());
		if (!cache.has(name)) cache.set(name, new Promise((resolve, reject) => animation.hasSpine(name) ? resolve() : animation.loadSpine(name, "skel", resolve, reject)).catch(error => { cache.delete(name); throw error; }));
		return cache.get(name);
	}
	function play(source, target, prop, meta) {
		if (!enabled() || !present(source) || !present(target) || source === target || !ui.window?.isConnected) return false;
		// 复用十周年已有3.6画布，不新增WebGL context。
		const animation = globalThis.decadeUI?.animation;
		if (!animation?.loadSpine || !animation.gl) return false;
		const host = ui.window, hostRect = host.getBoundingClientRect(), from = avatar(source).getBoundingClientRect(), to = avatar(target).getBoundingClientRect();
		if (!hostRect.width || !from.width || !to.width) return false;
		const sx = host.clientWidth / hostRect.width, sy = host.clientHeight / hostRect.height;
		const flight = document.createElement("img"); flight.className = "xinsha-prop-flight"; flight.src = image(prop); flight.alt = "";
		const targetNode = avatar(target), scale = to.width * sx / 190;
		const width = prop.size[0] * .8 * scale, height = prop.size[1] * .8 * scale;
		const nearTop = (to.top + to.height / 2 - hostRect.top) * sy < 110 * host.clientHeight / 750;
		const offset = prop.offset || [0,0], hit = hasPoint(meta) ? meta.xinshaHit : [0,0];
		const impactOffset = [(nearTop ? offset[0] : 0) + hit[0], (nearTop ? offset[1] : 0) - hit[1]];
		flight.style.cssText = `position:absolute;left:0;top:0;width:${width}px;height:${height}px;visibility:hidden;pointer-events:none;z-index:100;`;
		host.append(flight);
		const center = r => ({ x: (r.left + r.width / 2 - hostRect.left) * sx - width / 2, y: (r.top + r.height / 2 - hostRect.top) * sy - height / 2 });
		const a = center(from), b = center(to), name = `xinsha-props/${prop.spine}`;
		b.x += hit[0] * scale; b.y += hit[1] * scale;
		if (!nearTop) { b.x -= offset[0] * scale; b.y += offset[1] * scale; }
		let sprite, timer, cancelled = false;
		const motion = flight.animate([{ transform: `translate(${a.x}px,${a.y}px)` }, { transform: `translate(${b.x}px,${b.y}px)` }], { duration: 300, fill: "forwards", easing: "linear" });
		motion.pause();
		const entry = { source, target, cleanup() {
			if (cancelled) return;
			cancelled = true; clearTimeout(timer); motion.cancel(); flight.remove();
			if (sprite && !sprite.completed) animation.stopSpine(sprite);
			active.delete(entry);
		} };
		active.add(entry);
		const ready = load(animation, name);
		Promise.all([ready, flight.decode()]).then(() => { if (cancelled || !enabled() || !present(target)) return entry.cleanup(); flight.style.visibility = "visible"; motion.play(); }, error => { console.warn("一将成名互动素材加载失败", name, error); entry.cleanup(); });
		motion.onfinish = async () => {
			flight.remove();
			try {
				await ready;
				if (cancelled || !enabled() || !present(target)) return entry.cleanup();
				const hitScale = skeletonScale(targetNode);
				sprite = animation.playSpine({ name, action: "play", loop: false, oncomplete: () => { active.delete(entry); clearTimeout(timer); cancelled = true; }, onupdate() {
					if (!enabled() || !present(target)) return queueMicrotask(entry.cleanup);
					if (this.referBounds) { this.scale = this.referBounds.width / 190; this.x[0] = impactOffset[0] * this.scale; this.y[0] = impactOffset[1] * this.scale; }
				} }, { parent: targetNode, follow: true, x: [impactOffset[0] * hitScale, .5], y: [impactOffset[1] * hitScale, .5], scale: hitScale });
				if (prop.sound && lib.config.background_audio !== false) game.playAudio("..", "extension", "十周年UI", "audio", "xinsha-props", prop.sound + ".mp3");
				document.dispatchEvent(new CustomEvent("decadeui:xinsha-prop-hit", { detail: { source, target, emotion: prop.emotion, propId: prop.id, hit: hit.slice(), combo: meta?.xinshaCombo || 1 } }));
			} catch (error) { console.warn("一将成名互动素材加载失败", name, error); entry.cleanup(); }
		};
		ready.catch(() => {});
		timer = setTimeout(entry.cleanup, 10000);
		return true;
	}
	prototype.$throwEmotion = function (target, emotion, ...args) {
		const prop = propOf(emotion, args[0]);
		if (!enabled() || !prop) return original.call(this, target, emotion, ...args);
		if (!play(this, target, prop, args[0])) return original.call(this, target, emotion, ...args);
		game.addVideo?.("throwEmotion", this, hasPoint(args[0]) || prop.id >= 37 ? [target.dataset.position, emotion, args[0] || { xinshaProp: prop.id }] : [target.dataset.position, emotion]);
		document.dispatchEvent(new CustomEvent("decadeui:xinsha-prop-sent", { detail: { source: this, target, emotion, propId: prop.id, hit: hasPoint(args[0]) ? args[0].xinshaHit.slice() : [0,0], combo: args[0]?.xinshaCombo || 1 } }));
		return { xinshaProp: true };
	};
	const wrapped = prototype.$throwEmotion;
	const throwWithPoint = function (target, emotion, ...args) {
		const prop = propOf(emotion, args[0]);
		if (enabled() && prop && present(target) && !hasPoint(args[0])) args[0] = throwData(this, target, prop);
		return originalThrow.call(this, target, emotion, ...args);
	};
	prototype.throwEmotion = throwWithPoint;
	// 本体录像默认只传前两项；普通录像保持原路径。
	const nativeVideo = game.videoContent?.throwEmotion;
	const replay = function (player, content, ...args) {
		if (enabled() && player && content?.[2]?.xinshaProp) return player.$throwEmotion(game.playerMap[content[0]], content[1], content[2]);
		return nativeVideo?.call(this, player, content, ...args);
	};
	if (nativeVideo) game.videoContent.throwEmotion = replay;
	function send(target) {
		if (!enabled() || !selected || !present(game.me) || !(game.players || []).includes(target) || target === game.me || target.isDead?.()) return;
		const now = performance.now(); if (now - last < 100) return; last = now;
		const args = [target, selected.emotion, throwData(game.me, target, selected, held?.point)];
		if (game.online) game.send("throwEmotion", ...args);
		else game.me.throwEmotion(...args);
	}
	function select(prop) {
		selected = remembered = prop;
		for (const node of panel.querySelectorAll("button")) {
			const checked = Number(node.dataset.propId) === prop.id;
			node.classList.toggle("xinsha-prop-selected", checked); node.setAttribute("aria-pressed", String(checked));
		}
		for (const node of document.querySelectorAll(".xinsha-prop-target")) node.remove();
		for (const target of game.players || []) if (target !== game.me && !target.isDead?.()) {
			const mark = document.createElement("div"); mark.className = "xinsha-prop-target"; target.append(mark);
		}
	}
	function position() {
		if (!panel || !ui.window) return;
		const scale = Math.min(ui.window.clientWidth / 1334, ui.window.clientHeight / 750);
		panel.style.transform = `scale(${scale * .8})`;
	}
	function show() {
		if (!enabled() || !present(game.me)) return;
		if (panel) return hide();
		panel = document.createElement("div"); panel.className = "xinsha-prop-panel"; panel.setAttribute("aria-label", "砸蛋送花互动道具");
		const balance = document.createElement("div"); balance.className = "xinsha-prop-balance"; balance.setAttribute("aria-label", "鲜花余额");
		const flower = document.createElement("img"); flower.src = url("image/ui/xinsha-props/gi_sl_flower.png"); flower.alt = "";
		const amount = document.createElement("span"); amount.textContent = balanceAmount; balance.append(flower, amount); panel.append(balance);
		const grid = document.createElement("div"); grid.className = "xinsha-prop-grid"; panel.append(grid);
		for (const prop of xinshaProps) {
			const button = document.createElement("button"), icon = document.createElement("img"), cost = document.createElement("span");
			button.type = "button"; button.dataset.propId = prop.id; button.dataset.emotion = prop.emotion; button.setAttribute("aria-label", prop.name); button.title = prop.name;
			icon.className = "xinsha-prop-icon"; icon.src = url(`image/ui/xinsha-props/${prop.thumbnail || prop.icon}.png`); icon.alt = "";
			if (prop.thumbnail) button.classList.add("xinsha-prop-small-icon");
			cost.className = "xinsha-prop-cost";
			const currency = document.createElement("img"); currency.src = flower.src; currency.alt = "";
			const count = document.createElement("span"); count.textContent = prop.cost; cost.append(currency, count); button.append(icon, cost);
			button.addEventListener("click", event => { event.stopPropagation(); select(prop); });
			button.addEventListener("touchend", event => { event.preventDefault(); event.stopPropagation(); select(prop); }, { passive: false }); grid.append(button);
		}
		position(); ui.window.append(panel); select(remembered); resize = new ResizeObserver(position); resize.observe(ui.window); notify(true);
	}
	const consume = e => { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); };
	const playerOf = e => (game.players || []).find(p => p === e.target.closest?.(".player"));
	function start(target, point, touch = false) { cancelHold(); if (!target || target === game.me || !selected) return; held = { target, point, touch: touch ? point : null }; hold = setInterval(() => { repeated = true; send(target); }, 200); }
	function finish(target) { if (held?.target === target) { if (!repeated) send(target); ignored = { target, until: performance.now() + 750 }; } cancelHold(); }
	listen("pointerdown", e => { if (e.pointerType === "touch" || !panel) return; if (!enabled()) return stop(); if (panel.contains(e.target) || e.target.closest?.(".yjcm-flower")) return; const p = playerOf(e); if (!p) return hide(); consume(e); start(p, e); });
	listen("pointerup", e => { if (e.pointerType !== "touch" && panel) { if (playerOf(e)) consume(e); finish(playerOf(e)); } });
	listen("touchstart", e => { if (!panel) return; if (!enabled()) return stop(); if (panel.contains(e.target) || e.target.closest?.(".yjcm-flower")) return; const p = playerOf(e); if (!p) return hide(); consume(e); if (e.touches.length === 1) start(p, e.touches[0], true); });
	listen("touchmove", e => { if (!panel || !held?.touch) return; consume(e); const t = [...e.touches].find(t => t.identifier === held.touch.identifier); if (!t || Math.hypot(t.clientX - held.touch.clientX, t.clientY - held.touch.clientY) > 10) cancelHold(); });
	listen("touchend", e => { if (!panel) return; if (playerOf(e)) consume(e); if (!held?.touch) return; const t = [...e.changedTouches].find(t => t.identifier === held.touch.identifier); finish(t && !e.touches.length ? playerOf({ target: document.elementFromPoint(t.clientX, t.clientY) || document.body }) : null); });
	for (const type of ["pointercancel", "touchcancel", "blur"]) listen(type, cancelHold);
	for (const type of ["mousedown", "mouseup", "dblclick", "contextmenu"]) listen(type, e => { if (panel && enabled() && playerOf(e)) consume(e); });
	listen("click", e => { if (!panel || !enabled() || !playerOf(e)) return; consume(e); const target = playerOf(e); if (ignored?.target !== target || performance.now() > ignored.until) send(target); ignored = null; });
	listen("keydown", e => { if (e.key === "Escape") hide(); });
	const style = document.createElement("link"); style.rel = "stylesheet"; style.href = url("src/styles/xinsha-props.css"); document.head.append(style);
	const observer = new MutationObserver(() => { if (!enabled() || panel && !panel.isConnected) stop(); else for (const entry of [...active]) if (!present(entry.source) || !present(entry.target)) entry.cleanup(); });
	observer.observe(document.body, { attributes: true, attributeFilter: ["data-style"], childList: true, subtree: true });
	(lib.onover ||= []).push(stop);
	controller = { show, hide, stop, play, get isOpen() { return !!panel && enabled(); }, get activeCount() { return active.size; }, dispose() {
		stop(); observer.disconnect(); style.remove(); listeners.forEach(remove => remove());
		const i = lib.onover.indexOf(stop); if (i >= 0) lib.onover.splice(i, 1);
		if (prototype.$throwEmotion === wrapped) prototype.$throwEmotion = original;
		if (prototype.throwEmotion === throwWithPoint) prototype.throwEmotion = originalThrow;
		if (game.videoContent?.throwEmotion === replay) game.videoContent.throwEmotion = nativeVideo;
		controller = undefined; delete game.decadeXinshaProps;
	} };
	game.decadeXinshaProps = controller;
	return controller;
}
