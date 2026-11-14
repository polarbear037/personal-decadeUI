import { AnimationPlayer as AnimationPlayer } from "./AnimationPlayer.js";
import { AnimationPlayerPool as AnimationPlayerPool } from "./AnimationPlayerPool.js";
import { assetList as assetList } from "./configs/assetList.js";
import { initSkillAnimations as initSkillAnimations } from "./initAnimations.js";
const o = 0,
	t = 1,
	s = 2,
	d = 3,
	c = { effect_youxikaishi: o, effect_youxikaishi_shousha: o, effect_loseHp: o, aar_chupaizhishiX: t, aar_chupaizhishi: t, SF_xuanzhong_eff_jiangjun: t, SF_xuanzhong_eff_weijiangjun: t, SF_xuanzhong_eff_cheqijiangjun: t, SF_xuanzhong_eff_biaoqijiangjun: t, SF_xuanzhong_eff_dajiangjun: t, SF_xuanzhong_eff_dasima: t, "globaltexiao/huifushuzi/shuzi2": t, "globaltexiao/shanghaishuzi/shuzi": t, "globaltexiao/shanghaishuzi/SZN_shuzi": t },
	l = /* @__PURE__ */ new Map();
function u(lib, game, ui, get, ai, _status) {
	((decadeUI.animation = (() => {
		const animation = new AnimationPlayer(decadeUIPath + "assets/animation/", document.body, "decadeUI-canvas");
		if ((decadeUI.bodySensor.addListener(() => (animation.resized = !1), !0), (animation.cap = new AnimationPlayerPool(4, decadeUIPath + "assets/animation/", "decadeUI.animation")), !animation.gl)) return (initSkillAnimations(animation), animation);
		const originalPlaySpine = animation.playSpine,
			originalCapPlaySpineTo = animation.cap.playSpineTo,
			getFileType = name => assetList.find(a => a.name === name)?.fileType || "skel",
			capHasSpine = name => animation.cap.animations?.[0]?.hasSpine?.(name),
			ensureLoaded = (name, player, isCap, callback) => {
				if (isCap ? capHasSpine(name) : player?.hasSpine?.(name)) return void callback();
				const key = (isCap ? "cap:" : "") + name;
				if ("loading" === l.get(key)) {
					const n = key + "_cb";
					return void l.set(n, [...(l.get(n) || []), callback]);
				}
				l.set(key, "loading");
				const onLoad = () => {
						(l.set(key, "loaded"), callback());
						const cbKey = key + "_cb";
						((l.get(cbKey) || []).forEach(cb => cb()), l.delete(cbKey));
					},
					onError = () => l.set(key, "error");
				isCap
					? animation.cap.loadSpine(name, getFileType(name), onLoad, onError)
					: player.loadSpine(
							name,
							getFileType(name),
							() => {
								(player.prepSpine(name), onLoad());
							},
							onError
						);
			};
		((animation.playSpine = function (sprite, position) {
			if (!sprite) return;
			const name = "string" == typeof sprite ? sprite : sprite.name;
			return name ? (this.hasSpine(name) ? originalPlaySpine.call(this, sprite, position) : void ensureLoaded(name, this, !1, () => originalPlaySpine.call(this, sprite, position))) : originalPlaySpine.call(this, sprite, position);
		}),
			(animation.loopSpine = function (n, e) {
				return ("string" == typeof n ? (n = { name: n, loop: !0 }) : n && (n.loop = !0), this.playSpine(n, e));
			}),
			(animation.cap.playSpineTo = function (element, anim, position) {
				if (!anim) return;
				if (anim.version === "4.0") return originalCapPlaySpineTo.call(this, element, anim, position);
				const name = "string" == typeof anim ? anim : anim.name;
				return name ? (capHasSpine(name) ? originalCapPlaySpineTo.call(this, element, anim, position) : void ensureLoaded(name, null, !0, () => originalCapPlaySpineTo.call(this, element, anim, position))) : originalCapPlaySpineTo.call(this, element, anim, position);
			}));
		const groups = [[], [], [], []];
		assetList.forEach(n => groups[c[n.name] ?? s].push(n));
		const preload = (files, concurrency, onDone) => {
			if (!files.length) return onDone?.();
			const queue = [...files];
			let active = 0,
				done = 0;
			const next = () => {
				for (; active < concurrency && queue.length; ) {
					const e = queue.shift(),
						i = e.follow;
					(i ? capHasSpine(e.name) : animation.hasSpine(e.name))
						? (++done, files.length)
						: (active++,
							ensureLoaded(e.name, animation, i, () => {
								(active--, ++done === files.length || next());
							}));
				}
			};
			next();
		};
		return (
			preload(groups[o], 2),
			lib.arenaReady.push(() => {
				setTimeout(() => preload(groups[t], 2), 500);
				const n = () => preload([...groups[s], ...groups[d]], 2);
				window.requestIdleCallback ? requestIdleCallback(n, { timeout: 8e3 }) : setTimeout(n, 3e3);
			}),
			initSkillAnimations(animation),
			animation
		);
	})()),
		(window.dcdAnim = decadeUI.animation),
		(window.dcdBackAnim = decadeUI.backgroundAnimation),
		(window.game = game),
		(window.get = get),
		(window.ui = ui),
		(window._status = _status));
}
"undefined" != typeof window &&
	window.decadeModule &&
	window.decadeModule.import((lib, game, ui, get, ai, _status) => {
		u(lib, game, ui, get, 0, _status);
	});
export { u as setupGameAnimation };
