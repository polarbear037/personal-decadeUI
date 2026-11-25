import { game, lib, ui, _status } from "noname";

export const cardMovementConfigKey = "extension_十周年UI_cardMovementDiagnostics";
const storageKey = "extension_十周年UI_cardMovementTrace";
const incidentKey = storageKey + "_incident";
const maxRows = 2000, maxCharacters = 1000000, maxWatching = 32;
const maxKeyRows = 4000, maxKeyCharacters = 3000000;
const keyKinds = new Set(["start", "event", "copy", "$throw", "$throwordered2", "$draw", "$give", "$gain2",
	"moveTo", "moveTo-result", "moveDelete", "moveDelete-result", "animation-create", "animation-observed", "transform-write", "incident", "game-over"]);
const session = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
let sequence = 0, active = false, installed = false, generation = 0;
let rows = [], characters = 0, revision = 0, savedRevision = 0;
let keyRows = [], keyCharacters = 0, keyTruncated = false;
let observer, sampleTimer, saveTimer, refreshTimer, lastError = "", saving = Promise.resolve();
const ids = new WeakMap(), eventIds = new WeakMap(), animationIds = new WeakMap();
const createdAnimations = new WeakSet();
const watching = new Map(), hooks = [], calls = new Set();
let reportedEvents = new WeakSet();
const sessions = [{ id: session, started: new Date().toISOString() }];
const safely = callback => { try { return callback(); } catch (error) { lastError = String(error).slice(0, 240); } };
const identify = (map, value, prefix) => {
	if (!value || !["object", "function"].includes(typeof value)) return null;
	if (!map.has(value)) map.set(value, `${session}:${prefix}${++sequence}`);
	return map.get(value);
};
const actor = player => player ? { id: player.playerid, name: player.name, seat: player.dataset?.position } : null;
const isCard = node => node?.nodeType === 1 && node.classList.contains("card") && !node.classList.contains("mark");
const cardInfo = node => node ? {
	id: identify(ids, node, "c"), cardid: node.cardid, name: node.name, suit: node.suit, number: node.number,
} : null;
function zone(node) {
	if (!node) return "detached";
	for (const key of ["ordering", "discardPile", "cardPile", "special", "arena", "handcards1", "handcards2"])
		if (node === ui[key]) return key;
	const player = node.closest?.(".player");
	if (player) return { player: actor(player), area: node.className?.toString().slice(0, 80) };
	return node.id || node.className?.toString().slice(0, 80) || node.nodeName;
}
function keepKeyRow(row, size = JSON.stringify(row).length) {
	// 样式刷新和逐帧采样不能挤掉副本来源、动画端点及其事件父链。
	if (!keyKinds.has(row.kind) || row.kind === "copy" && !row.source) return;
	keyRows.push({ row, size }); keyCharacters += size;
	while (keyRows.length > maxKeyRows || keyCharacters > maxKeyCharacters) {
		keyCharacters -= keyRows.shift().size; keyTruncated = true;
	}
}
function push(row, retainKey = true) {
	row = { at: Date.now(), ...row };
	const size = JSON.stringify(row).length;
	rows.push({ row, size }); characters += size; revision++;
	if (retainKey) keepKeyRow(row, size);
	while (rows.length > maxRows || characters > maxCharacters) characters -= rows.shift().size;
	if (active && !saveTimer) saveTimer = setTimeout(() => { saveTimer = 0; void flush(); }, 3000);
}
function context() {
	const event = _status.event;
	if (!event || typeof event !== "object") return null;
	const id = identify(eventIds, event, "e");
	if (!reportedEvents.has(event)) {
		reportedEvents.add(event);
		const chain = [], seen = new Set();
		for (let current = event; current && chain.length < 10 && !seen.has(current); current = current.parent) {
			seen.add(current);
			chain.push({ id: identify(eventIds, current, "e"), name: current.name, type: current.type, step: current.step,
				player: actor(current.player), dying: actor(current.dying), card: current.card?.name, skill: current.skill });
		}
		push({ kind: "event", id, chain });
	}
	return { id, name: event.name, type: event.type, step: event.step };
}
function record(kind, details = {}, stack = false) {
	if (!active) return;
	push({ kind, event: context(), ...details, ...(stack ? { stack: new Error().stack?.split("\n").slice(3, 11).join("\n").slice(0, 1400) } : {}) });
}
function pose(node, computed = true) {
	const style = computed && node.isConnected && !document.hidden ? getComputedStyle(node) : node.style;
	const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform || undefined);
	return { transform: style.transform, x: matrix.e, y: matrix.f, scaleX: matrix.a, scaleY: matrix.d,
		translate: style.translate, scale: style.scale, rotate: style.rotate, visibility: style.visibility, opacity: style.opacity,
		left: style.left, top: style.top, zone: zone(node.parentNode), connected: node.isConnected, fixed: !!node.fixed };
}
function endpoints(animation) {
	const frames = animation.effect?.getKeyframes?.() || [];
	const point = frame => frame ? Object.fromEntries(["transform", "translate", "scale", "rotate", "left", "top", "right", "bottom", "offsetDistance", "visibility", "opacity"].filter(key => key in frame).map(key => [key, frame[key]])) : {};
	const timing = animation.effect?.getTiming?.();
	return { animation: identify(animationIds, animation, "a"), from: point(frames[0]), to: point(frames.at(-1)),
		duration: timing?.duration, delay: timing?.delay, easing: timing?.easing, fill: timing?.fill };
}
function summarizeArgs(args) {
	return args.slice(0, 4).map(value => {
		if (isCard(value)) return cardInfo(value);
		if (Array.isArray(value)) return value.slice(0, 30).map(item => isCard(item) ? cardInfo(item) : typeof item);
		if (value?.classList?.contains("player")) return actor(value);
		return ["number", "boolean", "string"].includes(typeof value) ? String(value).slice(0, 120) : null;
	});
}
function preserveMethodProperties(original, wrapper) {
	// 外部扩展通过函数标记判断是否已接入。透明包装不能丢标记而触发反复包装。
	for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(original))) {
		if (!["length", "name", "prototype", "arguments", "caller"].includes(key)) Object.defineProperty(wrapper, key, descriptor);
	}
	for (const key of Object.getOwnPropertySymbols(original)) Object.defineProperty(wrapper, key, Object.getOwnPropertyDescriptor(original, key));
}
function wrap(object, key, kind, instance = false) {
	const original = object?.[key];
	if (typeof original !== "function" || hooks.some(hook => hook.object === object && hook.key === key && hook.wrapper === original)) return;
	const own = Object.getOwnPropertyDescriptor(object, key);
	const wrapper = function (...args) {
		if (!active) return original.apply(this, args);
		const callKey = `${identify(ids, this, "o")}:${key}`;
		if (calls.has(callKey)) return original.apply(this, args);
		calls.add(callKey);
		let before, result;
		safely(() => {
			before = isCard(this) ? pose(this, kind !== "copy") : undefined;
			record(kind, { node: isCard(this) ? cardInfo(this) : undefined, player: actor(isCard(this) ? null : this), args: summarizeArgs(args), before }, true);
		});
		try { result = original.apply(this, args); return result; }
		finally {
			safely(() => {
				if (kind === "copy" && isCard(result)) {
					record("copy", { source: cardInfo(this), node: cardInfo(result), before, after: pose(result, false) }, true);
					watch(result);
				} else if (isCard(this)) {
					record(kind + "-result", { node: cardInfo(this), before, after: pose(this) }); watch(this);
				} else {
					if (isCard(result)) watch(result);
					for (const value of args.flat(1)) if (isCard(value)) { watch(value); if (value.clone) watch(value.clone); }
				}
			});
			calls.delete(callKey);
		}
	};
	preserveMethodProperties(original, wrapper);
	object[key] = wrapper;
	hooks.push({ object, key, original, wrapper, own, instance });
}
function restore(hook) {
	if (hook.object[hook.key] !== hook.wrapper) return;
	if (hook.own) Object.defineProperty(hook.object, hook.key, hook.own);
	else delete hook.object[hook.key];
}
function unwatch(node) {
	watching.delete(node);
	for (let index = hooks.length - 1; index >= 0; index--) if (hooks[index].instance && hooks[index].object === node) {
		safely(() => restore(hooks[index])); hooks.splice(index, 1);
	}
}
function watch(node) {
	if (!isCard(node)) return;
	const existing = watching.get(node);
	if (existing) { existing.until = performance.now() + 8000; return; }
	if (watching.size >= maxWatching) {
		const expendable = [...watching.keys()].find(card => !card.classList.contains("thrown"));
		if (!expendable && !node.classList.contains("thrown")) return;
		unwatch(expendable || watching.keys().next().value);
	}
	watching.set(node, { until: performance.now() + 8000, signature: "", effects: new WeakSet() });
	// Card.copy 会把 moveTo/moveDelete 复制为自身方法，不能只包装 prototype。
	for (const key of ["moveTo", "moveDelete"]) if (Object.hasOwn(node, key)) wrap(node, key, key, true);
	if (!sampleTimer) sampleTimer = setTimeout(sample, 60);
}
function sample() {
	sampleTimer = 0;
	if (!active) return;
	for (const [node, state] of watching) safely(() => {
		if (performance.now() > state.until) return unwatch(node);
		const current = pose(node);
		const effects = !document.hidden && node.isConnected ? node.getAnimations().filter(animation => animation.effect?.target === node).slice(0, 6).map(animation => {
			if (!state.effects.has(animation)) {
				state.effects.add(animation);
				record("animation-observed", { node: cardInfo(node), ...endpoints(animation), kindOfAnimation: animation.constructor.name, property: animation.transitionProperty });
			}
			return { animation: identify(animationIds, animation, "a"), id: animation.id, state: animation.playState, time: Math.round(animation.currentTime || 0) };
		}) : [];
		const signature = JSON.stringify({ ...current, effects });
		if (state.signature !== signature) { state.signature = signature; record("pose", { node: cardInfo(node), ...current, effects }); }
	});
	if (watching.size) sampleTimer = setTimeout(sample, 60);
}
function refreshHooks() {
	if (!active) return;
	const player = lib.element.Player?.prototype, card = lib.element.Card?.prototype;
	for (const key of ["$throw", "$throwordered2", "$draw", "$give", "$gain2"]) wrap(player, key, key);
	for (const key of ["copy", "moveTo", "moveDelete"]) wrap(card, key, key);
	const original = Element.prototype.animate;
	if (!hooks.some(hook => hook.object === Element.prototype && hook.key === "animate" && hook.wrapper === original)) {
		const wrapper = function (...args) {
			const animation = original.apply(this, args);
			if (active && isCard(this) && !createdAnimations.has(animation)) safely(() => {
				createdAnimations.add(animation); watch(this);
				record("animation-create", { node: cardInfo(this), ...endpoints(animation), before: pose(this) }, true);
			});
			return animation;
		};
		hooks.push({ object: Element.prototype, key: "animate", original, wrapper, own: Object.getOwnPropertyDescriptor(Element.prototype, "animate") });
		preserveMethodProperties(original, wrapper);
		Element.prototype.animate = wrapper;
	}
}
function observe() {
	observer = new MutationObserver(mutations => safely(() => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes") {
				const node = mutation.target;
				if (!isCard(node)) continue;
				const oldTransform = mutation.oldValue?.match(/(?:^|;)\s*transform\s*:\s*([^;]+)/)?.[1] || "";
				if (mutation.attributeName === "style" && node.classList.contains("thrown") && oldTransform !== node.style.transform) {
					record("transform-write", { node: cardInfo(node), from: oldTransform, to: node.style.transform });
				}
				record("node-change", { node: cardInfo(node), attribute: mutation.attributeName,
					oldTransform,
					transform: node.style.transform, classes: node.className.slice(0, 180) }); watch(node);
				continue;
			}
			for (const [kind, nodes] of [["remove", mutation.removedNodes], ["append", mutation.addedNodes]]) for (const root of nodes) {
				if (root.nodeType !== 1) continue;
				for (const node of isCard(root) ? [root] : root.querySelectorAll(".card:not(.mark)")) {
					record(kind, { node: cardInfo(node), zone: zone(mutation.target), current: pose(node, false) }); watch(node);
				}
			}
		}
	}));
	observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["style", "class"] });
}
function snapshot() {
	return { schema: 1, sessions: sessions.slice(-4), enabled: active, savedAt: new Date().toISOString(),
		rows: rows.map(entry => entry.row), truncated: rows.length >= maxRows || characters >= maxCharacters - 3000,
		keyRows: keyRows.map(entry => entry.row), keyTruncated };
}
function flush() {
	clearTimeout(saveTimer); saveTimer = 0;
	saving = saving.catch(() => {}).then(async () => {
		if (revision === savedRevision) return;
		const currentRevision = revision;
		if (!lib.db) { lastError = "本体数据库不可用，当前仅保留内存记录"; return; }
		try { await game.putDB("data", storageKey, snapshot()); savedRevision = currentRevision; lastError = ""; }
		catch (error) { lastError = String(error); }
	});
	return saving;
}
function scene() {
	return { style: lib.config.extension_十周年UI_newDecadeStyle, mode: lib.config.mode, zoom: game.documentZoom,
		viewport: [innerWidth, innerHeight], replay: !!_status.video, online: !!game.online,
		players: (game.players || []).map(player => ({ ...actor(player), hp: player.hp, maxHp: player.maxHp })),
		settings: Object.fromEntries(["animation", "low_performance", "sync_speed", "duration", "game_speed", "extension_十周年UI_cardGhostEffect", "extension_十周年UI_cardPrettify"].map(key => [key, lib.config[key]])) };
}
function setEnabled(value, persist = true) {
	if (persist) game.saveConfig(cardMovementConfigKey, !!value);
	if (active === !!value) return;
	active = !!value;
	if (active) {
		safely(() => { refreshHooks(); observe(); record("start", { scene: scene() }); });
		refreshTimer = setInterval(() => safely(refreshHooks), 5000);
	} else {
		observer?.disconnect(); observer = null;
		clearTimeout(sampleTimer); sampleTimer = 0; clearInterval(refreshTimer); refreshTimer = 0;
		for (const hook of hooks.slice().reverse()) safely(() => restore(hook));
		hooks.length = 0; watching.clear(); calls.clear();
		void flush();
	}
}
async function clear() {
	generation++;
	const clearedRevision = revision + 1;
	clearTimeout(saveTimer); saveTimer = 0;
	rows = []; characters = 0; keyRows = []; keyCharacters = 0; keyTruncated = false;
	revision++; savedRevision = revision; reportedEvents = new WeakSet();
	saving = saving.catch(() => {}).then(async () => {
		await game.deleteDB("data", storageKey); await game.deleteDB("data", incidentKey);
		if (revision === clearedRevision) savedRevision = revision;
		lastError = "";
	}).catch(error => { lastError = String(error); });
	await saving;
}
async function saveIncident(label = "刚才出现飞牌异常") {
	const requestedGeneration = generation;
	await ready;
	if (requestedGeneration !== generation) return null;
	safely(() => record("incident", { label, scene: scene() }));
	const incident = { label, capturedAt: new Date().toISOString(), trace: snapshot() };
	if (!lib.db) throw Error("本体数据库不可用，无法保存异常现场");
	saving = saving.catch(() => {}).then(() => game.putDB("data", incidentKey, incident));
	await saving; await flush(); return incident;
}
const ready = (async () => {
	const initialGeneration = generation;
	try {
		const stored = await game.getDB("data", storageKey);
		if (initialGeneration !== generation || stored?.schema !== 1 || !Array.isArray(stored.rows)) return;
		const current = rows.map(entry => entry.row), currentKey = keyRows.map(entry => entry.row);
		rows = []; characters = 0; keyRows = []; keyCharacters = 0;
		keyTruncated = !!stored.keyTruncated;
		for (const row of (stored.keyRows || stored.rows).concat(currentKey)) keepKeyRow(row);
		for (const row of stored.rows.slice(-maxRows).concat(current)) push(row, false);
		sessions.unshift(...(stored.sessions || []).slice(-3));
	} catch (error) { lastError = String(error); }
})();
export const cardMovementDiagnostics = {
	storageKey, ready, snapshot, flush, clear, setEnabled, refreshHooks, saveIncident,
	getIncident: () => game.getDB("data", incidentKey),
	status: () => ({ enabled: active, rows: rows.length, keyRows: keyRows.length, watching: watching.size, error: lastError }),
	async export() {
		await ready; await flush();
		const data = { recent: snapshot(), incident: await this.getIncident() };
		game.export(JSON.stringify(data, null, 2), `十周年UI-飞牌诊断-${Date.now()}.json`);
	},
};
export function installCardMovementDiagnostics() {
	if (installed) return cardMovementDiagnostics;
	installed = true;
	setEnabled(lib.config[cardMovementConfigKey] !== false, false);
	window.addEventListener("pagehide", () => { void flush(); });
	window.addEventListener("keydown", event => {
		if (!event.repeat && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && event.code === "KeyL") {
			event.preventDefault(); event.stopImmediatePropagation();
			void import("./card-movement-panel.js").then(module => module.showCardMovementDiagnostics()).catch(error => { lastError = String(error); });
		}
	}, true);
	document.addEventListener("visibilitychange", () => { if (document.hidden) void flush(); });
	lib.onover?.push(() => { safely(() => record("game-over", { scene: scene() })); void flush(); });
	return cardMovementDiagnostics;
}
