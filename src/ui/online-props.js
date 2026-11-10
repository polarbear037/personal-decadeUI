import { lib, game, ui, _status } from "noname";

// gn_paijuhudong.expressionItem；原配置、APK 脚本和素材哈希见 verification/online-props-source/。
export const onlineProps = [
	{ id: 101, emotion: "flower", name: "鲜花", cost: 1, icon: 12110101, animation: "fx_uihd_huashu", curve: [0.1, 0.2], scale: 1, speed: 26, clips: [["fly1", "hit1", 1.1]], sound: "hua", hit: "Nhit" },
	{ id: 102, emotion: "wine", name: "美酒", cost: 5, icon: 12110201, animation: "fx_uihd_qingmeijiu", curve: [0.1, 0.2], scale: 1, speed: 21, clips: [["fly1", "hit1", 2.467]], sound: "jiu", hit: "Nhit" },
	{ id: 4, emotion: "egg", name: "鸡蛋", cost: 1, icon: 12010401, animation: "Ol_DaoJu_jidan", curve: [0, 0.5], scale: 1.2, speed: 26, clips: [["fly1", "hit1", 0.567]], sound: "jidan", hit: "Bhit" },
	{ id: 2, emotion: "shoe", name: "草鞋", cost: 5, icon: 12010201, animation: "fx_uihd_caoxie", curve: [0, 0.5], scale: 0.8, speed: 26, clips: [["fly1", "hit1", 0.834], ["fly2", "hit2", 1]], sound: "caoxie", hit: "Ahit" },
];
const controllers = new WeakMap();
const isOnline = () => lib.config.extension_十周年UI_newDecadeStyle === "onlineUI";
const assetRoot = () => `${lib.assetURL || ""}extension/十周年UI/`;
const isPresent = player => player && player.isConnected !== false && player.isIn?.() !== false && !player.isDead?.();

function avatarRect(player) {
	// 本人的 player 还承载手牌布局；其他座位按完整角色区域定位。
	if (player !== game.me) return player.getBoundingClientRect();
	for (const avatar of [player.node?.avatar, player.node?.avatar2]) {
		const rect = avatar?.getBoundingClientRect();
		if (rect?.width > 0 && rect.height > 0 && !avatar.classList.contains("hidden")) return rect;
	}
	return player.getBoundingClientRect();
}

export function getOnlinePropRoute(start, end, curvature = Math.random() * 0.5) {
	const dx = end.x - start.x, dy = end.y - start.y;
	const distance = Math.hypot(dx, dy);
	// 官方将方向向量的 X 归正，取上侧法线，控制点抬高 distance/2×curveParam。
	const sign = dx < 0 ? -1 : 1;
	return { start, end, distance, control: { x: (start.x + end.x) / 2 + sign * dy * curvature / 2, y: (start.y + end.y) / 2 - sign * dx * curvature / 2 } };
}

export function getOnlinePropPoint(route, progress) {
	const t = Math.max(0, Math.min(1, progress)), n = 1 - t;
	return { x: n * n * route.start.x + 2 * n * t * route.control.x + t * t * route.end.x, y: n * n * route.start.y + 2 * n * t * route.control.y + t * t * route.end.y };
}

export function getOnlinePropFlight(from, to, prop, count, index = 0, random = Math.random) {
	const scale = to.width / 174;
	const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
	const offsets = prop.emotion === "shoe" && index === 0 ? [-0.15, -0.15] : [0, 0];
	const thresholds = prop.emotion === "shoe" && index === 1 ? [[1, 0], [2, 0.2], [4, 0.4], [6, 0.99]] : [[1, 0], [2, 0.2], [4, 0.4], [6, 0.5], [8, 0.6]];
	// 所有逻辑位移和速度使用同一角色坐标比例，不能把官方逻辑像素直接加到屏幕坐标。
	const spread = 100 * scale * thresholds.filter(row => row[0] <= count).at(-1)[1];
	const end = { x: to.x + to.width / 2 + offsets[0] * from.width / 2 + (2 * random() - 1) * spread, y: to.y + to.height / 2 - offsets[1] * from.height / 2 + (2 * random() - 1) * spread };
	const curvature = prop.curve[0] + random() * (prop.curve[1] - prop.curve[0]);
	const route = getOnlinePropRoute(start, end, curvature);
	return { ...route, scale, duration: route.distance / (prop.speed * 100 * scale) * 1000, delay: index * 200 };
}

export function installOnlineProps() {
	if (controllers.has(lib)) return controllers.get(lib);
	const active = new Set(), shakes = new Map(), goodHitTimes = new WeakMap();
	let sequence = 0, panel, panelObserver, selected, holdTimer, heldTarget, heldTouch, holdRepeated = false, ignoredClick, lastSend = -Infinity, playingPropNum = 0, currentBatch;
	const nativeThrow = lib.element.Player.prototype.$throwEmotion;
	const props = new Map(onlineProps.map(prop => [prop.emotion, prop]));
	const enabled = () => isOnline() && !_status.over;
	const getApi = () => globalThis.skinSwitch?.chukuangWorkerApi;
	const imageUrl = name => `${assetRoot()}ui/assets/lbtn/OL_line/props/${name}.png`;

	function sound(name) {
		if (lib.config.background_audio && name) game.playAudio("..", "extension", "十周年UI", "audio", "online-props", name + ".ogg");
	}
	function clearHold() { clearInterval(holdTimer); holdTimer = null; }
	function cancelHold() { clearHold(); heldTarget = null; heldTouch = null; holdRepeated = false; }
	function startHold(target) {
		cancelHold(); heldTarget = target;
		holdTimer = setInterval(() => { holdRepeated = true; send(target); }, 200);
	}
	function finishHold(target) {
		if (heldTarget && heldTarget === target) {
			if (!holdRepeated) send(target);
			ignoredClick = { target, until: performance.now() + 750 };
		}
		cancelHold();
	}
	function notifyVisibility(open) {
		for (const player of [...(game.players || []), ...(game.dead || [])]) {
			for (const avatar of [player.node?.avatar, player.node?.avatar2]) if (avatar) avatar._doubleClicking = false;
		}
		document.dispatchEvent(new CustomEvent("decadeui:online-prop-visibility", { detail: { open } }));
	}
	function hide() {
		const wasOpen = !!panel;
		cancelHold();
		panelObserver?.disconnect(); panelObserver = null;
		window.removeEventListener("resize", positionPanel);
		panel?.remove(); panel = null; selected = null; ignoredClick = null;
		for (const node of document.querySelectorAll(".online-prop-target")) node.remove();
		if (wasOpen) notifyVisibility(false);
	}
	function clearEffects() {
		for (const entry of [...active]) entry.cleanup();
		for (const animation of shakes.values()) animation.cancel();
		shakes.clear();
	}
	function stop() { hide(); clearEffects(); }
	function viewport() {
		// 所有互动道具固定共用第二画布，避开裴秀小人对第一画布的层级和显隐调整。
		const canvas = document.getElementById("chukuang-canvas");
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
		const width = parseFloat(style.width) || canvas.clientWidth, height = parseFloat(style.height) || canvas.clientHeight;
		if (!rect.width || !rect.height || !width || !height) return null;
		return { width, height, rect, sx: width / rect.width, sy: height / rect.height };
	}
	function shake(player, type) {
		if (shakes.has(player) || !player.animate) return;
		const scale = avatarRect(player).width / (player.getBoundingClientRect().width / (player.offsetWidth || 1)) / 174;
		const offsets = type === "Ahit" ? [[0, 0, 0], [4, -3, 7], [8, 0, 0], [10, 3, 6], [12, 0, 0]] : [[0, 0, 0], [6, -2, 5], [12, 0, 0]];
		const animation = player.animate(offsets.map(([frame, x, y]) => ({ offset: frame / 12, transform: `translate(${x * scale}px,${y * scale}px)`, composite: "add" })), { duration: 200 });
		shakes.set(player, animation);
		animation.onfinish = animation.oncancel = () => shakes.delete(player);
	}
	function playGoodHit(player) {
		const now = performance.now();
		if (now - (goodHitTimes.get(player) ?? -Infinity) <= 1000) return;
		goodHitTimes.set(player, now);
		const api = getApi(), view = viewport();
		if (!api || !view) return;
		const rect = avatarRect(player);
		const scale = Math.max(rect.width * view.sx / 174, rect.height * view.sy / 232);
		const x = (rect.left + rect.width / 2 - view.rect.left) * view.sx;
		const y = (rect.top + rect.height / 2 - view.rect.top) * view.sy;
		const sprite = { id: `online-prop-good-${++sequence}`, name: "../../../十周年UI/assets/animation/online-props/FX_MatchGame_daoju_shouji3", version: "4.0", json: false, action: "play", loop: false };
		const entry = { cleanup() { clearTimeout(this.timer); api.stopEffect(sprite); active.delete(this); } };
		active.add(entry);
		api.playEffect(sprite, { x, y: view.height - y, scale }, success => {
			if (!active.has(entry) || !success) return entry.cleanup();
			entry.timer = setTimeout(() => entry.cleanup(), 1000);
		});
		entry.timer = setTimeout(() => entry.cleanup(), 10000);
	}

	function play(source, target, prop) {
		const api = getApi();
		if (!enabled() || !isPresent(source) || !isPresent(target) || source === target) return false;
		if (!api?.playEffect || !api?.stopEffect || !api?._postPlayEffect || !api?._startFollowUpdate) {
			game.print?.("Online 互动道具需要开启皮肤切换扩展。");
			return false;
		}
		globalThis.skinSwitch.chukuangWorkerInit?.();
		const view = viewport();
		if (!view) return false;
		const from = avatarRect(source), to = avatarRect(target);
		const toCanvas = rect => ({ x: (rect.left - view.rect.left) * view.sx, y: (rect.top - view.rect.top) * view.sy, width: rect.width * view.sx, height: rect.height * view.sy });
		const batch = { cancelled: false, entries: new Set(), hit: false };
		const count = ++playingPropNum;
		currentBatch = batch;
		const cancelBatch = () => { batch.cancelled = true; for (const entry of [...batch.entries]) entry.cleanup(); };
		for (const [index, [fly, hit, duration]] of prop.clips.entries()) {
			const route = getOnlinePropFlight(toCanvas(from), toCanvas(to), prop, count, index);
			let point = { ...route.start }, frame, timer, moveTimer, finished = false;
			const sprite = { id: `online-prop-${++sequence}`, name: `../../../十周年UI/assets/animation/online-props/${prop.animation}`, version: "4.0", json: false, action: fly, loop: true };
			const elementId = api._elementIdCounter++;
			const anchor = { getBoundingClientRect: () => ({ left: point.x - 0.5, right: point.x + 0.5, top: point.y - 0.5, bottom: point.y + 0.5, width: 1, height: 1, x: point.x - 0.5, y: point.y - 0.5 }) };
			const position = () => ({ parent: { boundRect: anchor.getBoundingClientRect(), bodySize: { bodyWidth: view.width, bodyHeight: view.height } }, elementId, follow: true, scale: route.scale * prop.scale, x: [0, 0.5], y: [0, 0.5] });
			// 轨迹已换算成画布逻辑坐标，直接发往第一 Worker，保留原跟随换算。
			const playAction = onStart => api._postPlayEffect(globalThis.skinSwitch.chukuangWorker, "PLAY_EFFECT", sprite, position(), onStart);
			const entry = { cleanup() {
				if (finished) return;
				finished = true; cancelAnimationFrame(frame); clearTimeout(timer); clearTimeout(moveTimer);
				api._followUpdateMap?.delete(elementId); api.stopEffect(sprite);
				batch.entries.delete(entry); active.delete(entry);
				if (!batch.entries.size && currentBatch === batch) { currentBatch = null; playingPropNum = 0; }
			} };
			batch.entries.add(entry); active.add(entry);
			const valid = () => !finished && !batch.cancelled && enabled() && isPresent(source) && isPresent(target);
			const arrive = () => {
				if (!valid()) return cancelBatch();
				point = route.end;
				api.stopEffect(sprite);
				sprite.action = hit; sprite.loop = false;
				playAction(success => {
					if (!valid() || !success) return entry.cleanup();
					clearTimeout(timer);
					timer = setTimeout(() => entry.cleanup(), duration * 1000 + 50);
				});
				if (index === 0) sound(`DaoJu_${prop.sound}_hit`);
				if (prop.hit === "Nhit") playGoodHit(target);
				else shake(target, prop.hit);
				if (!batch.hit) {
					batch.hit = true;
					document.dispatchEvent(new CustomEvent("leiol:throwEmotionHit", { detail: { player: target, source, emotion: prop.emotion } }));
				}
			};
			const begin = () => {
				if (!valid()) return entry.cleanup();
				playAction(success => {
					if (!valid() || !success) return entry.cleanup();
					if (index === 0) sound(`DaoJu_${prop.sound}_fly`);
					api._startFollowUpdate(globalThis.skinSwitch.chukuangWorker, elementId, anchor, null);
					moveTimer = setTimeout(() => {
						const beginAt = performance.now();
						const update = now => {
							if (!valid()) return cancelBatch();
							const t = (now - beginAt) / Math.max(route.duration, 1);
							point = getOnlinePropPoint(route, t);
							if (t >= 1) arrive(); else frame = requestAnimationFrame(update);
						};
						frame = requestAnimationFrame(update);
					}, route.delay);
				});
				timer = setTimeout(() => entry.cleanup(), 10000);
			};
			begin();
		}
		return true;
	}

	lib.element.Player.prototype.$throwEmotion = function (target, emotion, ...args) {
		const prop = props.get(emotion);
		if (!isOnline() || !prop) return nativeThrow.call(this, target, emotion, ...args);
		if (play(this, target, prop)) game.addVideo("throwEmotion", this, [target.dataset.position, emotion]);
		// 神黄忠模块据此等待真实命中事件，不再按本体旧演出的 600ms 重复播报。
		return { onlineProp: true };
	};
	function targetOf(event) {
		const target = playerOf(event);
		return selected && target !== game.me && (game.players || []).includes(target) && isPresent(target) ? target : null;
	}
	function playerOf(event) {
		const player = event.target.closest?.(".player");
		return [...(game.players || []), ...(game.dead || [])].includes(player) ? player : null;
	}
	function send(target) {
		if (!enabled() || !selected || !isPresent(game.me) || !isPresent(target)) return hide();
		const now = performance.now();
		if (now - lastSend < 100) return;
		lastSend = now;
		if (game.online) game.send("throwEmotion", target, selected.emotion);
		else game.me.throwEmotion(target, selected.emotion);
	}
	function select(prop) {
		cancelHold(); ignoredClick = null;
		selected = prop;
		for (const button of panel.querySelectorAll(".online-prop-item")) button.classList.toggle("online-prop-selected", button.dataset.emotion === prop.emotion);
		for (const node of document.querySelectorAll(".online-prop-target")) node.remove();
		for (const target of game.players || []) {
			if (target === game.me || !isPresent(target)) continue;
			const marker = document.createElement("div"); marker.className = "online-prop-target";
			const content = document.createElement("div"); content.className = "online-prop-target-content";
			const arrow = document.createElement("img"); arrow.src = imageUrl("interact_arrow");
			const text = document.createElement("span"); text.textContent = `点击${prop.name === "鲜花" ? "送花" : prop.name === "美酒" ? "敬酒" : prop.name === "草鞋" ? "丢鞋" : "砸蛋"}`;
			content.append(arrow, text); marker.append(content); target.append(marker);
		}
	}
	function positionPanel() {
		if (!panel?.isConnected) return;
		const host = ui.window.getBoundingClientRect();
		if (!host.width || !host.height) return;
		// 按原版参考图的面板/画面比例定位，独立于手牌区域。
		const width = ui.window.clientWidth || host.width;
		const scale = width / 1720;
		panel.style.left = `${80 * scale}px`;
		panel.style.top = `${ui.window.clientHeight * (155 / 286)}px`;
		panel.style.transform = `scale(${scale})`;
	}
	function show() {
		if (!enabled() || !isPresent(game.me)) return;
		if (panel?.isConnected) return hide();
		panel = document.createElement("div"); panel.className = "online-prop-panel";
		panel.setAttribute("aria-label", "互动道具");
		const list = document.createElement("div"); list.className = "online-prop-list";
		for (const prop of onlineProps) {
			const button = document.createElement("button"); button.className = "online-prop-item"; button.dataset.emotion = prop.emotion;
			const icon = document.createElement("span"); icon.className = "online-prop-icon";
			const picture = document.createElement("img"); picture.src = imageUrl(prop.icon); icon.append(picture);
			const name = document.createElement("span"); name.className = "online-prop-name"; name.textContent = prop.name;
			const cost = document.createElement("span"); cost.className = "online-prop-cost";
			const amount = document.createElement("span"); amount.className = "online-prop-amount"; amount.textContent = String(prop.cost); cost.append(amount);
			const basket = document.createElement("img"); basket.src = imageUrl(12110000); cost.append(basket);
			button.append(icon, name, cost);
			button.onclick = event => { event.stopPropagation(); select(prop); };
			button.addEventListener("touchend", event => {
				consume(event);
				if (!_status.dragged && !event.touches.length) select(prop);
			}, { passive: false });
			list.append(button);
		}
		const tip = document.createElement("div"); tip.className = "online-prop-tip"; tip.textContent = "点击道具使用";
		panel.append(list, tip); ui.window.append(panel);
		positionPanel();
		panelObserver = new ResizeObserver(positionPanel);
		panelObserver.observe(ui.window);
		window.addEventListener("resize", positionPanel);
		notifyVisibility(true);
	}
	function consume(event) { if (event.cancelable) event.preventDefault(); event.stopImmediatePropagation(); }
	// window 捕获阶段早于拍一拍的 document 捕获和头像节点监听；兼容事件也必须拦截。
	window.addEventListener("pointerdown", event => {
		// 触摸走独立的 TouchEvent 路径，兼容不支持 PointerEvent 的手机 WebView，并避免重复投掷。
		if (event.pointerType === "touch") return;
		if (!panel) return;
		if (!enabled()) return stop();
		if (event.target.closest?.("[data-online-prop-button]")) return;
		if (panel.contains(event.target)) return;
		if (!playerOf(event)) return hide();
		consume(event);
		const target = targetOf(event);
		if (!target || event.button !== 0) return;
		startHold(target);
	}, true);
	window.addEventListener("pointerup", event => {
		if (event.pointerType === "touch") return;
		if (!panel || !enabled()) return cancelHold();
		if (playerOf(event)) consume(event);
		finishHold(targetOf(event));
	}, true);
	window.addEventListener("pointercancel", event => { if (event.pointerType !== "touch") cancelHold(); }, true);
	window.addEventListener("blur", cancelHold, true);
	window.addEventListener("touchstart", event => {
		if (!panel) return;
		if (!enabled()) return stop();
		if (event.target.closest?.("[data-online-prop-button]") || panel.contains(event.target)) return;
		if (!playerOf(event)) return hide();
		consume(event);
		if (event.touches.length !== 1) return cancelHold();
		const target = targetOf(event), touch = event.touches[0];
		if (!target) return cancelHold();
		startHold(target);
		heldTouch = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
	}, { capture: true, passive: false });
	window.addEventListener("touchmove", event => {
		if (!panel || !enabled()) return cancelHold();
		if (heldTouch || playerOf(event)) consume(event);
		if (!heldTouch) return;
		const touch = Array.from(event.touches).find(touch => touch.identifier === heldTouch.id);
		if (event.touches.length !== 1 || !touch || Math.hypot(touch.clientX - heldTouch.x, touch.clientY - heldTouch.y) > 10) cancelHold();
	}, { capture: true, passive: false });
	window.addEventListener("touchend", event => {
		if (!panel || !enabled()) return cancelHold();
		if (heldTouch || playerOf(event)) consume(event);
		if (!heldTouch) return;
		const touch = Array.from(event.changedTouches).find(touch => touch.identifier === heldTouch.id);
		if (!touch || event.touches.length) return cancelHold();
		// TouchEvent.target 始终指向按下节点，释放时按实际指尖位置核对目标。
		finishHold(targetOf({ target: document.elementFromPoint(touch.clientX, touch.clientY) || document.body }));
	}, { capture: true, passive: false });
	window.addEventListener("touchcancel", event => {
		if (panel && enabled() && (heldTouch || playerOf(event))) consume(event);
		cancelHold();
	}, { capture: true, passive: false });
	for (const type of ["mousedown", "mouseup", "dblclick", "contextmenu"]) {
		window.addEventListener(type, event => { if (panel && enabled() && playerOf(event)) consume(event); }, { capture: true, passive: false });
	}
	window.addEventListener("click", event => {
		if (!panel || !enabled()) return;
		if (!playerOf(event)) return;
		consume(event);
		const target = targetOf(event);
		if (!target) return;
		if (ignoredClick?.target !== target || performance.now() > ignoredClick.until) send(target);
		ignoredClick = null;
	}, true);
	lib.onover ||= []; lib.onover.push(stop);
	const controller = { show, hide, stop, play, get isOpen() { return !!panel?.isConnected && enabled(); }, get selected() { return selected; }, get activeCount() { return active.size; } };
	game.decadeOnlineProps = controller;
	controllers.set(lib, controller);
	return controller;
}
