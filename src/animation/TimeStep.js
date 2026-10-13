import "noname";
import { ease as ease } from "./easing.js";
import { lerp as lerp } from "./utils.js";
class s {
	constructor({ start: start, end: end, duration: duration }) {
		((this.start = this.current = start), (this.end = end), (this.time = 0), (this.percent = 0), (this.duration = duration), (this.completed = !1));
	}
	update(delta) {
		((this.time += delta), (this.percent = ease(Math.min(this.time / this.duration, 1))));
		const isArray = Array.isArray(this.start) || Array.isArray(this.end),
			start = Array.isArray(this.start) ? this.start : [this.start, 0],
			end = Array.isArray(this.end) ? this.end : [this.end, 0];
		((this.current = isArray ? [lerp(start[0], end[0], this.percent), lerp(start[1], end[1], this.percent)] : lerp(start[0], end[0], this.percent)), this.time >= this.duration && (this.completed = !0));
	}
}
export { s as TimeStep };
