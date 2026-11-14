import "noname";
import { AnimationPlayer as AnimationPlayer } from "./AnimationPlayer.js";
import { playCardSpineTo } from "./CardSpinePlayer.js";
class e {
	constructor(size, pathPrefix, thisName) {
		this.pathPrefix = pathPrefix;
		this.capacity = size || 1;
		this.lazy = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
		this.skelTypes = new Map();
		self.spine ? ((this.name = thisName), (this.animations = Array.from({ length: this.lazy ? 1 : this.capacity }, () => new AnimationPlayer(pathPrefix)))) : console.error("spine 未定义.");
	}
	loadSpine(filename, skelType, onload, onerror) {
		this.skelTypes.set(filename, skelType || "skel");
		this.animations[0].loadSpine(
			filename,
			skelType,
			() => {
				for (let e = 1; e < this.animations.length; e++) {
					const a = this.animations[e];
					window.requestIdleCallback ? requestIdleCallback(() => a.prepSpine(filename, !0), { timeout: 200 }) : setTimeout(() => a.prepSpine(filename, !0), 50);
				}
				onload && onload();
			},
			onerror
		);
	}
	playSpineTo(element, animation, position) {
		if (animation?.version === "4.0") return playCardSpineTo(this, element, animation, position);
		if (this.lazy) return this.playSpineToLazy(element, animation, position);
		element._cardSpineEffect?.cancel();
		if ((position?.parent && (position.parent = void 0), element._ap?.canvas.parentNode !== element)) {
			for (const i of this.animations) if (!i.running) return (i.canvas.parentNode !== element && ((element._ap = i), element.appendChild(i.canvas)), void i.playSpine(animation, position));
			console.error(`spine: ${this.name || ""} 可用动画播放组件不足`);
		} else element._ap.playSpine(animation, position);
	}
	playSpineToLazy(element, animation, position) {
		element._cardSpineEffect?.cancel();
		if (position?.parent) position = { ...position, parent: undefined };
		let player = element._ap?.canvas.parentNode === element ? element._ap : this.animations.find(p => !p.running && !p._poolLoading && !p.gl?.isContextLost());
		if (!player && this.animations.length < this.capacity) { player = new AnimationPlayer(this.pathPrefix); this.animations.push(player); }
		if (!player) return void console.error(`spine: ${this.name || ""} 可用动画播放组件不足`);
		if (player.gl?.isContextLost()) return;
		element._ap = player;
		if (player.canvas.parentNode !== element) element.appendChild(player.canvas);
		const revision = player._poolRevision = (player._poolRevision || 0) + 1, name = typeof animation === "string" ? animation : animation.name;
		const play = () => {
			if (revision !== player._poolRevision) return;
			player._poolLoading = false;
			if (element.isConnected && element._ap === player && player.canvas.parentNode === element) player.playSpine(animation, position);
		};
		if (player.hasSpine(name)) return play();
		player._poolLoading = true;
		player.loadSpine(name, this.skelTypes.get(name) || "skel", play, () => { if (revision === player._poolRevision) player._poolLoading = false; });
	}
}
export { e as AnimationPlayerPool };
