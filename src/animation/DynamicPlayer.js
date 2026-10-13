import "noname";
import { AnimationPlayer as AnimationPlayer } from "./AnimationPlayer.js";
import { observeSize as observeSize, throttle as throttle } from "./utils.js";
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
		const renderer = new AnimationPlayer(pathPrefix);
		((this.canvas = renderer.canvas),
			(this.renderer = renderer),
			decadeUI.bodySensor.addListener(
				throttle(
					() => {
						this.renderer.resized = !1;
					},
					100,
					this
				),
				!0
			));
	}
	play(sprite) {
		const item = "string" == typeof sprite ? { name: sprite } : sprite;
		if (((this.unpackPremultipliedAlpha = !!item.unpackPremultipliedAlpha), (item.id = this.BUILT_ID++), (item.loop = !0), this.offscreen)) (this.initialized || ((this.initialized = !0), (this.dpr = Math.max(window.devicePixelRatio * (window.documentZoom || 1), 1)), (this.height = this.canvas.clientHeight), (this.width = this.canvas.clientWidth)), "function" == typeof item.oncomplete && (item.oncomplete = item.oncomplete.toString()), this.renderer.postMessage({ message: "PLAY", id: this.id, dpr: this.dpr, dprAdaptive: this.dprAdaptive, outcropMask: this.outcropMask, useMipMaps: this.useMipMaps, width: this.width, height: this.height, sprite: item, unpackPremultipliedAlpha: !!item.unpackPremultipliedAlpha }));
		else {
			const e = this.renderer;
			((e.useMipMaps = this.useMipMaps), (e.dprAdaptive = this.dprAdaptive), (e.outcropMask = this.outcropMask), (e.unpackPremultipliedAlpha = !!item.unpackPremultipliedAlpha), item.unpackPremultipliedAlpha && !0 !== item.alpha && (item.alpha = !0));
			const t = () => {
				const t = e.playSpine(item);
				((t.opacity = 0), t.fadeTo(1, 600));
			};
			e.hasSpine(item.name) ? t() : e.loadSpine(item.name, "skel", t);
		}
		return item;
	}
	stop(sprite) {
		this.offscreen ? this.renderer.postMessage({ message: "STOP", id: this.id, sprite: sprite }) : this.renderer.stopSpine(sprite);
	}
	stopAll() {
		this.offscreen ? this.renderer.postMessage({ message: "STOPALL", id: this.id }) : this.renderer.stopSpineAll();
	}
	update(force) {
		if (!this.offscreen) return ((this.renderer.resized = !1), (this.renderer.useMipMaps = this.useMipMaps), (this.renderer.dprAdaptive = this.dprAdaptive), (this.renderer.outcropMask = this.outcropMask), void (this.renderer.unpackPremultipliedAlpha = this.unpackPremultipliedAlpha));
		((this.dpr = Math.max(window.devicePixelRatio * (window.documentZoom || 1), 1)), !1 !== force && this.renderer.postMessage({ message: "UPDATE", id: this.id, dpr: this.dpr, dprAdaptive: this.dprAdaptive, outcropMask: this.outcropMask, useMipMaps: this.useMipMaps, width: this.width, height: this.height, unpackPremultipliedAlpha: this.unpackPremultipliedAlpha }));
	}
}
export { s as BUILT_ID, a as DynamicPlayer, r as DynamicWorkers };
