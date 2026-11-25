import "noname";
import { AnimationPlayer as AnimationPlayer } from "./AnimationPlayer.js";
import { loadCardSpineRuntime } from "./CardSpinePlayer.js";
import { observeSize as observeSize, throttle as throttle } from "./utils.js";
import { disposeAnimationRenderer } from "./dispose-renderer.js";
let s = 0;
const r = new Array(2);
class a {
	constructor(e) {
		((this.id = s++), (this.dpr = 1), (this.width = 120), (this.height = 180), (this.dprAdaptive = !1), (this.BUILT_ID = 0), (this.unpackPremultipliedAlpha = !1), (this.offscreen = !1), this.offscreen || this._initMainThreadRenderer(e));
	}
	_initOffscreenRenderer(pathPrefix) {
		for (let s = 0; s < r.length; s++) {
			if (r[s]) {
				if (r[s].capacity >= 4) continue;
			} else ((r[s] = new Worker(decadeUIPath + "src/animation/dynamicWorker.js")), (r[s].capacity = 0));
			((this.renderer = r[s]),
				(this.canvas = document.createElement("canvas")),
				(this.canvas.className = "animation-player"),
				observeSize(
					this.canvas,
					throttle(
						newSize => {
							((this.height = Math.round(newSize.height)), (this.width = Math.round(newSize.width)), this.update());
						},
						100,
						this
					)
				));
			const a = this.canvas.transferControlToOffscreen();
			(r[s].postMessage({ message: "CREATE", id: this.id, canvas: a, pathPrefix: pathPrefix }, [a]), r[s].capacity++, (this.offscreen = !0));
			break;
		}
	}
	_initMainThreadRenderer(pathPrefix) {
		this.pathPrefix = pathPrefix;
		this.activePlays = new Map();
		const renderer = new AnimationPlayer(pathPrefix);
		((this.canvas = renderer.canvas),
			(this.renderer = renderer),
			(this.resizeSensor = decadeUI.bodySensor).addListener(
				(this.onResize = throttle(
					() => {
						this.update();
					},
					100,
					this
				)),
				!0
			));
	}
	play(sprite) {
		if (this.destroyed) return null;
		const item = "string" == typeof sprite ? { name: sprite } : sprite;
		if (((this.unpackPremultipliedAlpha = !!item.unpackPremultipliedAlpha), (item.id = this.BUILT_ID++), (item.loop = !0), this.offscreen)) (this.initialized || ((this.initialized = !0), (this.dpr = Math.max(window.devicePixelRatio * (window.documentZoom || 1), 1)), (this.height = this.canvas.clientHeight), (this.width = this.canvas.clientWidth)), "function" == typeof item.oncomplete && (item.oncomplete = item.oncomplete.toString()), this.renderer.postMessage({ message: "PLAY", id: this.id, dpr: this.dpr, dprAdaptive: this.dprAdaptive, outcropMask: this.outcropMask, useMipMaps: this.useMipMaps, width: this.width, height: this.height, sprite: item, unpackPremultipliedAlpha: !!item.unpackPremultipliedAlpha }));
		else {
			this.activePlays.set(item, null);
			if (item.unpackPremultipliedAlpha && item.alpha !== true) item.alpha = true;
			if (item.version && item.version !== "3.6") {
				this._playVersioned(item);
				return item;
			}
			const e = this.renderer;
			((e.useMipMaps = this.useMipMaps), (e.dprAdaptive = this.dprAdaptive), (e.outcropMask = this.outcropMask), (e.unpackPremultipliedAlpha = !!item.unpackPremultipliedAlpha), item.unpackPremultipliedAlpha && !0 !== item.alpha && (item.alpha = !0));
			const t = () => {
				if (!this.activePlays.has(item)) return;
				const t = e.playSpine(item);
				if (!t) { this.activePlays.delete(item); return; }
				this._sortLayer(e, t, item);
				this.activePlays.set(item, { renderer: e, node: t });
				((t.opacity = 0), t.fadeTo(1, 600));
			};
			e.hasSpine(item.name) ? t() : e.loadSpine(item.name, item.json || item.skelType === "json" ? "json" : "skel", t);
		}
		return item;
	}
	async _playVersioned(item) {
		try {
			// 共用原画布；3.6 继续使用本扩展播放器，不丢失其皮肤与 context 恢复逻辑。
			this.managerReady ||= loadCardSpineRuntime(this.canvas.ownerDocument).then(Manager => {
				if (this.destroyed) return null;
				this.manager = new Manager(this.pathPrefix, this.canvas, this.id, { offscreen: false, animation: this.renderer });
				this.renderer.sharedManager = this.manager;
				if (this.renderer.nodes.some(node => !node.completed)) this.renderer.gl.renderAni ||= this.renderer;
				return this.manager;
			}).catch(error => { this.managerReady = null; throw error; });
			const manager = await this.managerReady;
			if (this.destroyed || !this.activePlays.has(item)) return;
			const renderer = manager.getAnimation(item.version);
			this._updateRenderer(renderer);
			const play = () => {
				if (!this.activePlays.has(item)) {
					if (this.destroyed) disposeAnimationRenderer(renderer);
					return;
				}
				const node = renderer.playSpine({ ...item, json: item.json === true || item.skelType === "json" });
				if (!node) { this.activePlays.delete(item); return; }
				this._sortLayer(renderer, node, item);
				this.activePlays.set(item, { renderer, node });
				node.opacity = 0;
				node.fadeTo(1, 600);
				// 高版本运行库不负责初始隐藏；完成首帧后才显示共用画布。
				requestAnimationFrame(() => requestAnimationFrame(() => {
					if (this.activePlays.has(item) && !node.completed) this.canvas.style.visibility = "visible";
				}));
			};
			if (renderer.hasSpine(item.name)) play();
			else renderer.loadSpine(item.name, item.json === true || item.skelType === "json" ? "json" : item.json === false ? "skel" : manager.resolveSkelFileTypeSync(item.name), play, () => {
				this.activePlays.delete(item);
				if (this.destroyed) disposeAnimationRenderer(renderer);
			});
		} catch (error) {
			this.activePlays.delete(item);
			console.error("[十周年UI] Dynamic Spine load failed", item.name, item.version, error);
		}
	}
	_updateRenderer(renderer) {
		renderer.resized = false;
		renderer.useMipMaps = this.useMipMaps;
		renderer.dprAdaptive = this.dprAdaptive;
		renderer.outcropMask = this.outcropMask;
		renderer.unpackPremultipliedAlpha = this.unpackPremultipliedAlpha;
	}
	_sortLayer(renderer, node, item) {
		if (item.layer === undefined) return;
		node._dynamicLayer = item.layer;
		renderer.nodes.sort((a, b) => (a._dynamicLayer ?? 0) - (b._dynamicLayer ?? 0));
	}
	stop(sprite) {
		if (this.offscreen) return this.renderer.postMessage({ message: "STOP", id: this.id, sprite });
		const item = this.activePlays.has(sprite) ? sprite : [...this.activePlays.keys()].find(item => item.id === (sprite?.id ?? sprite));
		const active = this.activePlays.get(item);
		this.activePlays.delete(item);
		active?.renderer.stopSpine(active.node);
		this._hideIfIdle();
	}
	stopAll() {
		if (this.offscreen) return this.renderer.postMessage({ message: "STOPALL", id: this.id });
		this.activePlays.clear();
		this.renderer.stopSpineAll();
		this.manager?.stopSpineAll();
		this._hideIfIdle();
	}
	_hideIfIdle() {
		if (![...this.activePlays.values()].some(active => active && !active.node.completed)) this.canvas.style.visibility = "hidden";
	}
	update(force) {
		if (this.destroyed) return;
		if (!this.offscreen) {
			for (const renderer of new Set([this.renderer, ...Object.values(this.manager?.animations || {})])) this._updateRenderer(renderer);
			return;
		}
		((this.dpr = Math.max(window.devicePixelRatio * (window.documentZoom || 1), 1)), !1 !== force && this.renderer.postMessage({ message: "UPDATE", id: this.id, dpr: this.dpr, dprAdaptive: this.dprAdaptive, outcropMask: this.outcropMask, useMipMaps: this.useMipMaps, width: this.width, height: this.height, unpackPremultipliedAlpha: this.unpackPremultipliedAlpha }));
	}
	destroy() {
		if (this.destroyed) return;
		this.stopAll();
		this.destroyed = true;
		this.resizeSensor?.removeListener(this.onResize);
		for (const renderer of new Set([this.renderer, ...Object.values(this.manager?.animations || {})])) {
			renderer.destroyed = true;
			disposeAnimationRenderer(renderer);
		}
		this.primary = this.deputy = null;
		this.canvas.remove();
		this.canvas.width = this.canvas.height = 0;
		this.renderer.gl?.getExtension("WEBGL_lose_context")?.loseContext();
	}
}
export { s as BUILT_ID, a as DynamicPlayer, r as DynamicWorkers };
