import "noname";
import { CONFIG as CONFIG } from "./config.js";
function i(dots) {
	decadeUI.animate.add(
		function (source, target, e) {
			const ctx = e.context;
			((ctx.shadowColor = "yellow"), (ctx.shadowBlur = 1), (this.head = this.head || 0), (this.tail = this.tail || -1));
			const speed = CONFIG.ANIM_SPEED * (e.deltaTime / CONFIG.FRAME_RATE);
			if (((this.head = Math.min(this.head + speed, 1)), this.head >= 1 && (this.tail += speed), this.tail > 1)) return !0;
			const tail = Math.max(0, this.tail),
				lerp = decadeUI.get.lerp;
			return (e.drawLine(lerp(source.x, target.x, tail), lerp(source.y, target.y, tail), lerp(source.x, target.x, this.head), lerp(source.y, target.y, this.head), CONFIG.LINE_COLOR, CONFIG.LINE_WIDTH), !1);
		},
		!0,
		{ x: dots[0], y: dots[1] },
		{ x: dots[2], y: dots[3] }
	);
}
export { i as drawLine };
