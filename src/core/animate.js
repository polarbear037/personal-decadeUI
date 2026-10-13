import { ui } from "noname";
const e = () => ({
	updates: [],
	canvas: null,
	frameId: null,
	frameTime: null,
	check() {
		return !!ui.arena && (this.canvas || ((this.canvas = ui.arena.appendChild(document.createElement("canvas"))), (this.canvas.id = "decadeUI-canvas-arena")), !0);
	},
	add(updateFn, ...initArgs) {
		"function" == typeof updateFn && this.check() && (this.updates.push({ update: updateFn, inits: initArgs.slice(1), id: decadeUI.getRandom(0, 100) }), this.frameId || (this.frameId = requestAnimationFrame(this.update.bind(this))));
	},
	update() {
		const e = performance.now(),
			t = e - (this.frameTime ?? e);
		this.frameTime = e;
		const a = (function (canvas, deltaTime) {
			const ctx = canvas.getContext("2d");
			return {
				canvas: canvas,
				context: ctx,
				deltaTime: deltaTime,
				save: () => (ctx.save(), ctx),
				restore: () => (ctx.restore(), ctx),
				drawLine(x1, y1, x2, y2, color, lineWidth) {
					(ctx.beginPath(), color && (ctx.strokeStyle = color), lineWidth && (ctx.lineWidth = lineWidth), null == x2 || null == y2 ? ctx.lineTo(x1, y1) : (ctx.moveTo(x1, y1), ctx.lineTo(x2, y2)), ctx.stroke());
				},
				drawRect(e, t, width, height, color, lineWidth) {
					(ctx.beginPath(), color && (ctx.strokeStyle = color), lineWidth && (ctx.lineWidth = lineWidth), ctx.rect(e, t, width, height), ctx.stroke());
				},
				fillRect(e, t, width, height, color) {
					(color && (ctx.fillStyle = color), ctx.fillRect(e, t, width, height));
				},
				drawText(text, font, color, i, n, align, baseline, stroke = !1) {
					text && null != i && null != n && (font && (ctx.font = font), align && (ctx.textAlign = align), baseline && (ctx.textBaseline = baseline), color && (ctx[stroke ? "strokeStyle" : "fillStyle"] = color), ctx[stroke ? "strokeText" : "fillText"](text, i, n));
				},
				drawStrokeText(e, t, a, s, i, n, d) {
					this.drawText(e, t, a, s, i, n, d, !0);
				},
			};
		})(this.canvas, t);
		(decadeUI.dataset.animSizeUpdated || ((decadeUI.dataset.animSizeUpdated = !0), (this.canvas.width = this.canvas.parentNode.offsetWidth), (this.canvas.height = this.canvas.parentNode.offsetHeight)), (this.canvas.height = this.canvas.height));
		for (let s = this.updates.length - 1; s >= 0; s--) {
			const e = this.updates[s];
			a.save();
			const t = e.update.apply(e, [...e.inits, a]);
			(a.restore(), t && this.updates.splice(s, 1));
		}
		this.updates.length > 0 ? (this.frameId = requestAnimationFrame(this.update.bind(this))) : ((this.frameId = null), (this.frameTime = null));
	},
});
export { e as createDecadeUIAnimateModule };
