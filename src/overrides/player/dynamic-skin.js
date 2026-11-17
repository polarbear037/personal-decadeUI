import { game, _status } from "noname";
import "../../animation/utils.js";
import { DynamicPlayer as i } from "../../animation/DynamicPlayer.js";
import { getResourceUrl } from "../../core/resourcePaths.js";
function r(player, animation, clearMissing = false) {
	const background = animation?.background;
	if (typeof background === "string" && background.trim()) {
		player.$dynamicWrap.style.setProperty("--dynamic-skin-background", `url("${getResourceUrl("动态皮肤文件", background)}")`);
	} else if (clearMissing) {
		player.$dynamicWrap.style.removeProperty("--dynamic-skin-background");
	}
}
function n(n, e) {
	if (((e = !0 === e), void 0 === n)) return console.error("playDynamic: 参数1不能为空");
	let t = this.dynamic;
	(t ? (e && t.deputy ? (t.stop(t.deputy), (t.deputy = null)) : t.primary && (t.stop(t.primary), (t.primary = null))) : ((t = new i(getResourceUrl("动态皮肤文件"))), (t.dprAdaptive = !0), (this.dynamic = t), this.$dynamicWrap.appendChild(t.canvas)),
		"string" == typeof n && (n = { name: n }),
		this.doubleAvatar &&
			(n = (function (animation, deputy) {
				const result = { ...animation };
				Array.isArray(result.x) ? ((result.x = [...result.x]), (result.x[1] += deputy ? 0.25 : -0.25)) : void 0 === result.x ? (result.x = [0, deputy ? 0.75 : 0.25]) : (result.x = [result.x, deputy ? 0.25 : -0.25]);
				return ((result.clip = { x: [0, deputy ? 0.5 : 0], y: 0, width: [0, 0.5], height: [0, 1], clipParent: !0 }), result);
			})(n, e)),
		this.$dynamicWrap.parentNode !== this && this.appendChild(this.$dynamicWrap),
		(t.outcropMask = window.decadeUI?.config?.dynamicSkinOutcrop));
	const a = t.play(n);
	r(this, n);
	(e ? (t.deputy = a) : (t.primary = a), this.classList.add(e ? "d-skin2" : "d-skin"));
}
function e(i, n) {
	const e = this.dynamic;
	e &&
		((n = !0 === n),
		(i = !0 === i) && e.primary ? (e.stop(e.primary), (e.primary = null)) : n && e.deputy ? (e.stop(e.deputy), (e.deputy = null)) : i || n || (e.stopAll(), (e.primary = null), (e.deputy = null)),
		!e.offscreen &&
			e.renderer &&
			(function (renderer, player) {
				if (!renderer.spine || !renderer.spine.skeletons) return;
				for (const n of renderer.spine.skeletons) n.node && n.node.referNode === player && ((n.completed = !0), (n.node = void 0));
			})(e.renderer, this),
		e.primary || e.deputy || (this.classList.remove("d-skin", "d-skin2"), this.$dynamicWrap.remove()));
}
function t() {
	const i = window.decadeUI;
	if ("function" == typeof game.qhly_changeDynamicSkin) return (this.name1 && game.qhly_changeDynamicSkin(this, void 0, this.name1, !1, !0), void (this.doubleAvatar && this.name2 && game.qhly_changeDynamicSkin(this, void 0, this.name2, !0, !0)));
	if (!i?.config?.dynamicSkin || null === _status.mode) return;
	if (
		((i.CUR_DYNAMIC ??= 0),
		(i.MAX_DYNAMIC ??= (function () {
			const i = window.decadeUI?.isMobile?.() ? 2 : 10,
				offscreenBonus = window.OffscreenCanvas ? 8 : 0;
			return i + offscreenBonus;
		})()),
		!this.dynamic && i.CUR_DYNAMIC >= i.MAX_DYNAMIC)
	)
		return;
	const n = i.dynamicSkin;
	if (!n) return;
	const e = this.doubleAvatar && this.name2 ? [this.name1, this.name2] : [this.name1];
	let t = !1;
	e.forEach((e, a) => {
		const r = n[e];
		if (!r) return;
		const o = Object.keys(r);
		if (!o.length) return;
		const s = r[o[0]];
		if (!s?.name) return;
		const d = (function (skin) {
			const animation = { json: skin.json, skelType: skin.skelType, version: skin.version, name: skin.name, action: skin.action, loop: !0, loopCount: -1, speed: skin.speed ?? 1, filpX: skin.filpX, filpY: skin.filpY, opacity: skin.opacity, x: skin.x, y: skin.y, scale: skin.scale, angle: skin.angle, hideSlots: skin.hideSlots, clipSlots: skin.clipSlots };
			void 0 !== skin.alpha && (animation.alpha = skin.alpha);
			void 0 !== skin.unpackPremultipliedAlpha && (animation.unpackPremultipliedAlpha = skin.unpackPremultipliedAlpha);
			(skin.player || void 0 !== skin._transform) && (animation.player = { ...(skin.player || {}), ...(void 0 !== skin._transform && { _transform: skin._transform }) });
			return animation;
		})(s);
		(this.playDynamic(d, 1 === a), r(this, s, !0), t || ((t = !0), i.CUR_DYNAMIC++));
	});
}
export { t as playerApplyDynamicSkin, n as playerPlayDynamic, e as playerStopDynamic };
