import "noname";
import { AnimationPlayer as AnimationPlayer } from "./AnimationPlayer.js";
class e {
	constructor(size, pathPrefix, thisName) {
		self.spine ? ((this.name = thisName), (this.animations = Array.from({ length: size || 1 }, () => new AnimationPlayer(pathPrefix)))) : console.error("spine 未定义.");
	}
	loadSpine(filename, skelType, onload, onerror) {
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
		if ((position?.parent && (position.parent = void 0), element._ap?.canvas.parentNode !== element)) {
			for (const i of this.animations) if (!i.running) return (i.canvas.parentNode !== element && ((element._ap = i), element.appendChild(i.canvas)), void i.playSpine(animation, position));
			console.error(`spine: ${this.name || ""} 可用动画播放组件不足`);
		} else element._ap.playSpine(animation, position);
	}
}
export { e as AnimationPlayerPool };
