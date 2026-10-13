import "noname";
import { TimeStep as TimeStep } from "./TimeStep.js";
import { useNewDpr as useNewDpr } from "./utils.js";
class i {
	constructor(params = {}) {
		((this.id = void 0),
			(this.name = params.name),
			(this.skeleton = params.skeleton),
			(this.x = params.x),
			(this.y = params.y),
			(this.width = params.width),
			(this.height = params.height),
			(this.angle = params.angle),
			(this.scale = params.scale),
			(this.opacity = params.opacity),
			(this.flipX = params.flipX),
			(this.flipY = params.flipY),
			(this.clip = params.clip),
			(this.hideSlots = params.hideSlots),
			(this.clipSlots = params.clipSlots),
			(this.disableMask = params.disableMask),
			(this.premultipliedAlpha = params.alpha),
			(this.unpackPremultipliedAlpha = !!params.unpackPremultipliedAlpha),
			(this.renderX = void 0),
			(this.renderY = void 0),
			(this.renderAngle = void 0),
			(this.renderScale = void 0),
			(this.renderOpacity = void 0),
			(this.renderClip = void 0),
			(this.mvp = new spine.webgl.Matrix4()),
			(this.action = params.action),
			(this.loop = params.loop),
			(this.loopCount = params.loopCount),
			(this.speed = params.speed),
			(this.completed = !0),
			(this.onupdate = params.onupdate),
			(this.oncomplete = params.oncomplete),
			(this.referNode = params.referNode),
			(this.referFollow = params.referFollow),
			(this.referBounds = void 0),
			(this.timestepMap = {}));
	}
	fadeTo(opacity, duration) {
		return (void 0 !== opacity && (this.updateTimeStep("opacity", this.opacity ?? 1, opacity, duration), (this.opacity = opacity)), this);
	}
	moveTo(t, e, duration) {
		return (void 0 !== t && (this.updateTimeStep("x", this.x ?? [0, 0.5], t, duration), (this.x = t)), void 0 !== e && (this.updateTimeStep("y", this.y ?? [0, 0.5], e, duration), (this.y = e)), this);
	}
	scaleTo(scale, duration) {
		return (void 0 !== scale && (this.updateTimeStep("scale", this.scale ?? 1, scale, duration), (this.scale = scale)), this);
	}
	rotateTo(angle, duration) {
		return (void 0 !== angle && (this.updateTimeStep("angle", this.angle ?? 0, angle, duration), (this.angle = angle)), this);
	}
	update(t) {
		const calc = (value, refer) => (Array.isArray(value) ? value[0] + value[1] * refer : value),
			zoom = useNewDpr ? parseFloat(window.getComputedStyle(document.body).zoom) : 1,
			dpr = t.dpr / zoom,
			referSize = { width: t.canvas.width, height: t.canvas.height },
			domNode = this.referNode instanceof HTMLElement ? this.referNode : void 0;
		domNode && ((!this.referFollow && this.referBounds) || (this.referBounds = this._calcReferBounds(domNode)), (referSize.height = this.referBounds.height * dpr), (referSize.width = this.referBounds.width * dpr));
		const skeletonSize = this.skeleton.bounds.size;
		let renderX, renderY, renderScale, renderScaleX, renderScaleY;
		const tsX = this.timestepMap.x;
		tsX && !tsX.completed ? (tsX.update(t.delta), (renderX = calc(tsX.current, referSize.width))) : void 0 !== this.x && (renderX = calc(this.x, referSize.width));
		const tsY = this.timestepMap.y;
		(tsY && !tsY.completed ? (tsY.update(t.delta), (renderY = calc(tsY.current, referSize.height))) : void 0 !== this.y && (renderY = calc(this.y, referSize.height)), void 0 !== this.width && (renderScaleX = calc(this.width, referSize.width) / skeletonSize.x), void 0 !== this.height && (renderScaleY = calc(this.height, referSize.height) / skeletonSize.y), domNode && ((renderX = void 0 !== renderX ? renderX + this.referBounds.x * dpr : (this.referBounds.x + this.referBounds.width / 2) * dpr), (renderY = void 0 !== renderY ? renderY + this.referBounds.y * dpr : (this.referBounds.y + this.referBounds.height / 2) * dpr)), this.mvp.ortho2d(0, 0, t.canvas.width, t.canvas.height), this._applyTranslation(renderX, renderY));
		const tsScale = this.timestepMap.scale;
		((renderScale = tsScale && !tsScale.completed ? (tsScale.update(t.delta), tsScale.current) : (this.scale ?? 1)), (renderScale *= renderScaleX && !renderScaleY ? renderScaleX : !renderScaleX && renderScaleY ? renderScaleY : renderScaleX && renderScaleY ? Math.min(renderScaleX, renderScaleY) : dpr * zoom), 1 !== renderScale && this.mvp.scale(renderScale, renderScale, 0));
		const tsAngle = this.timestepMap.angle;
		((this.renderAngle = tsAngle && !tsAngle.completed ? (tsAngle.update(t.delta), tsAngle.current) : this.angle), this.renderAngle && this.mvp.rotate(this.renderAngle, 0, 0, 1));
		const tsOpacity = this.timestepMap.opacity;
		((this.renderOpacity = tsOpacity && !tsOpacity.completed ? (tsOpacity.update(t.delta), tsOpacity.current) : this.opacity), (this.renderX = renderX), (this.renderY = renderY), (this.renderScale = renderScale), this.clip && (this.renderClip = { x: calc(this.clip.x, t.canvas.width), y: calc(this.clip.y, t.canvas.height), width: calc(this.clip.width, t.canvas.width), height: calc(this.clip.height, t.canvas.height) }), this.onupdate && this.onupdate());
	}
	_calcReferBounds(domNode) {
		const isNativeGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect.toString().includes("[native code]");
		let rect = domNode.getBoundingClientRect();
		if (useNewDpr)
			if (isNativeGetBoundingClientRect) {
				let e = 1,
					i = domNode;
				for (; i && i !== document.body; ) ((e *= parseFloat(window.getComputedStyle(i).zoom)), (i = i.parentElement));
				rect = new DOMRect(rect.x / e, rect.y / e, rect.width / e, rect.height / e);
			} else {
				const e = window.documentZoom || 1;
				rect = new DOMRect(rect.x * e, rect.y * e, rect.width * e, rect.height * e);
				let i = 1,
					o = domNode;
				for (; o && o !== document.body; ) ((i *= parseFloat(window.getComputedStyle(o).zoom)), (o = o.parentElement));
				rect = new DOMRect(rect.x / i, rect.y / i, rect.width / i, rect.height / i);
			}
		const bodyHeight = decadeUI.get.bodySize().height * (useNewDpr ? window.documentZoom : 1);
		return { x: rect.left, y: bodyHeight - rect.bottom, width: rect.width, height: rect.height };
	}
	_applyTranslation(t, e) {
		void 0 !== t && void 0 === e ? (this.mvp.translate(t, 0, 0), this.mvp.setY(0)) : void 0 === t && void 0 !== e ? (this.mvp.translate(0, e, 0), this.mvp.setX(0)) : void 0 !== t && void 0 !== e ? this.mvp.translate(t, e, 0) : this.mvp.setPos2D(0, 0);
	}
	setAction(action, transition) {
		if (!this.skeleton || this.skeleton.node !== this) return console.error("setAction: 节点失去关联");
		if (null === this.skeleton.data.findAnimation(action)) return console.error("setAction: 未找到对应骨骼动作");
		this.skeleton.state.setAnimation(0, action, this.loop).mixDuration = void 0 === transition ? 0.5 : transition / 1e3;
	}
	resetAction(transition) {
		if (!this.skeleton || this.skeleton.node !== this) return console.error("resetAction: 节点失去关联");
		this.skeleton.state.setAnimation(0, this.skeleton.defaultAction, this.loop).mixDuration = void 0 === transition ? 0.5 : transition / 1e3;
	}
	complete() {
		if (this.oncomplete) {
			if ("string" == typeof this.oncomplete) {
				const t = this.oncomplete,
					e = t.indexOf("{"),
					i = t.lastIndexOf("}");
				if (-1 === e || -1 === i) return ((this.oncomplete = void 0), console.error(this.name + " 的 oncomplete 函数语法错误"));
				this.oncomplete = new Function(t.substring(e + 1, i));
			}
			"function" == typeof this.oncomplete && this.oncomplete();
		}
	}
	updateTimeStep(key, start, end, duration) {
		if (!duration) return;
		let ts = this.timestepMap[key];
		return (ts ? ((ts.start = ts.completed ? start : ts.current), (ts.end = end), (ts.time = ts.percent = 0), (ts.completed = !1), (ts.duration = duration)) : ((ts = new TimeStep({ start: start, end: end, duration: duration })), (this.timestepMap[key] = ts)), ts);
	}
}
export { i as APNode };
