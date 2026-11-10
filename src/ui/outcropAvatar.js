import { game, lib } from "noname";
import { getResourceUrl } from "../core/resourcePaths.js";
const avatarRequests = new WeakMap();
const t = { shizhounian: "十周年露头皮肤", shousha: "手杀露头皮肤" },
	n = /* @__PURE__ */ new Map(),
	e = {
		pending: [],
		active: 0,
		maxConcurrent: 4,
		add(task) {
			this.active < this.maxConcurrent ? (this.active++, task()) : this.pending.push(task);
		},
		next() {
			(this.active--, this.pending.length > 0 && this.active < this.maxConcurrent && (this.active++, this.pending.shift()()));
		},
	},
	r = () => lib.config?.extension_十周年UI_outcropSkin ?? "off";
function a(characterName) {
	const characterInfo = lib.character?.[characterName];
	if (!characterInfo) return null;
	if (characterInfo.img) {
		const match = characterInfo.img.match(/^extension\/([^\/]+)\//);
		if (match) return match[1];
	}
	if (Array.isArray(characterInfo.trashBin))
		for (const e of characterInfo.trashBin)
			if ("string" == typeof e && e.startsWith("img:")) {
				const match = e.slice(4).match(/^extension\/([^\/]+)\//);
				if (match) return match[1];
			}
	return null;
}
function o(t) {
	if (!t) return t;
	const n = lib.character?.[t];
	if (!n) return t;
	if (n.img) {
		const t = (function (ref) {
			if (!ref || "string" != typeof ref) return null;
			if (ref.startsWith("character:")) return ref.slice(10);
			const match = ref.match(/image\/character\/([^\/]+)\.(jpg|png|webp|gif)$/i);
			return match ? match[1] : null;
		})(n.img);
		if (t) return t;
	}
	const e = (function (extArray) {
		if (!Array.isArray(extArray)) return null;
		for (const n of extArray) if ("string" == typeof n && n.startsWith("character:")) return n.slice(10);
		return null;
	})(n.trashBin);
	return e || t;
}
function getExplicitOutcropImage(characterName) {
	const marker = lib.character?.[characterName]?.trashBin?.find(value => typeof value === "string" && value.startsWith("outcrop:"));
	const image = marker?.slice(8);
	return image && image !== "original" ? image : null;
}
function s(n, e) {
	if (!(e = e ?? r()) || "off" === e || !t[e]) return null;
	const explicitImage = getExplicitOutcropImage(n);
	if (explicitImage) return explicitImage;
	const s = o(n),
		i = t[e],
		c = a(n);
	return c && c !== window.decadeUIName
		? `${lib.assetURL}extension/${c}/image/character/${e === "shizhounian" ? "dcloutou" : "ssloutou"}/${s}.jpg`
		: getResourceUrl(i, `${s}.jpg`);
}
function i(path) {
	if (n.has(path)) return n.get(path);
	const promise = new Promise(n => {
		e.add(() => {
			const r = new Image(),
				a = result => {
					(e.next(), n(result));
				};
			((r.onload = () => a(!0)), (r.onerror = () => a(!1)), (r.src = path));
		});
	});
	return (n.set(path, promise), promise);
}
async function c(n, e, s) {
	if (!e || !n) return !1;
	e.classList.remove("has-explicit-outcrop");
	const request = {};
	avatarRequests.set(e, request);
	const isCurrentRequest = () => avatarRequests.get(e) === request;
	if ("off" === (s = s ?? r())) return (e.classList.remove("has-outcrop"), !1);
	const c = t[s];
	if (!c) return (e.classList.remove("has-outcrop"), !1);
	const u = e.classList.contains("avatar2") || e.classList.contains("deputy-avatar");
	if (
		(function (node, isVice) {
			const player = node?.parentElement;
			return !!player?.classList && (isVice ? player.classList.contains("unseen2_show") || player.classList.contains("unseen2") : player.classList.contains("unseen_show") || player.classList.contains("unseen"));
		})(e, u)
	) {
		const imageUrl = getResourceUrl(t[s], "hidden_image.jpg");
		const exists = await i(imageUrl);
		if (!isCurrentRequest()) return !1;
		return exists ? (e.style.setProperty("background-image", `url("${imageUrl}")`, "important"), e.classList.add("has-outcrop"), !0) : (e.classList.remove("has-outcrop"), !1);
	}
	// 独立角色可提供扩展内的真实露头PNG，沿用同一加载缓存、暗将保护与请求失效检查。
	const explicitImage = getExplicitOutcropImage(n);
	if (explicitImage) {
		const exists = await i(explicitImage);
		if (!isCurrentRequest()) return !1;
		if (exists) return ((e.style.backgroundImage = `url("${explicitImage}")`), e.classList.add("has-outcrop", "has-explicit-outcrop"), !0);
		return (e.classList.remove("has-outcrop"), !1);
	}
	const f = o(n),
		l = [],
		h = a(n);
	(h && h !== window.decadeUIName && l.push(`${lib.assetURL}extension/${h}/image/character/${s === "shizhounian" ? "dcloutou" : "ssloutou"}/${f}.jpg`), l.push(getResourceUrl(t[s], `${f}.jpg`)));
	for (const t of l) {
		const exists = await i(t);
		if (!isCurrentRequest()) return !1;
		if (exists) return ((e.style.backgroundImage = `url("${t}")`), e.classList.add("has-outcrop"), !0);
	}
	return (e.classList.remove("has-outcrop"), !1);
}
async function u(player, outcropStyle) {
	if (!player?.node) return;
	outcropStyle = outcropStyle ?? r();
	const tasks = [],
		name1 = player.name1 || player.name;
	player.node.avatar && name1 && tasks.push(c(name1, player.node.avatar, outcropStyle));
	const name2 = player.name2;
	(player.node.avatar2 && name2 && tasks.push(c(name2, player.node.avatar2, outcropStyle)), await Promise.all(tasks));
}
function f(outcropStyle) {
	outcropStyle = outcropStyle ?? r();
	const players = [...(game.players || []), ...(game.dead || [])];
	return Promise.all(players.map(n => u(n, outcropStyle)));
}
function l() {
	n.clear();
}
function h(callback) {
	return new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				entry.isIntersecting && callback(entry.target);
			});
		},
		{ rootMargin: "50px" }
	);
}
let p = null;
function m() {
	return (
		p ||
			(p = h(node => {
				const characterName = node._outcropCharacter;
				characterName && (c(characterName, node), p.unobserve(node), delete node._outcropCharacter);
			})),
		p
	);
}
function g(node, characterName) {
	node && characterName && "off" !== r() && ((node._outcropCharacter = characterName), m().observe(node));
}
function d() {
	const t = window.decadeUI;
	(t && ((t.updateOutcropAvatar = u), (t.updateAllOutcropAvatars = f), (t.clearOutcropCache = l), (t.registerLazyOutcrop = g), (t.applyOutcropAvatar = c)),
		(function () {
			if (y) return;
			const proto = HTMLDivElement.prototype;
			if (((y = proto.setBackground), !y)) return;
			proto.setBackground = function (name, type, ...args) {
				const result = y.call(this, name, type, ...args);
				if ("character" === type && "off" !== r()) {
					["avatar", "avatar2", "primary-avatar", "deputy-avatar"].some(className => this.classList.contains(className)) &&
						this.parentElement?.classList.contains("player") &&
						setTimeout(() => {
							c(name, this);
						}, 0);
				}
				return result;
			};
		})(),
		(function () {
			if (!lib.element?.Player?.prototype?.smoothAvatar) return;
			const originalSmoothAvatar = lib.element.Player.prototype.smoothAvatar;
			lib.element.Player.prototype.smoothAvatar = function (vice, video) {
				const result = originalSmoothAvatar.call(this, vice, video);
				if ("off" !== r()) {
					const player = this;
					setTimeout(() => {
						const characterName = vice ? player.name2 : player.name1 || player.name,
							avatarNode = vice ? player.node?.avatar2 : player.node?.avatar;
						characterName && avatarNode && c(characterName, avatarNode);
					}, 150);
				}
				return result;
			};
		})(),
		(function () {
			if (!lib.element?.Player?.prototype?.changeSkin) return;
			const originalChangeSkin = lib.element.Player.prototype.changeSkin;
			lib.element.Player.prototype.changeSkin = function (map, character) {
				const result = originalChangeSkin.call(this, map, character);
				if ("off" !== r() && character) {
					const player = this;
					setTimeout(() => {
						const t = player.name2 === character ? player.node?.avatar2 : player.node?.avatar;
						t && c(character, t);
					}, 150);
				}
				return result;
			};
		})(),
		(function () {
			if (!lib.element?.Player?.prototype?.$showCharacter) return;
			const original$showCharacter = lib.element.Player.prototype.$showCharacter;
			lib.element.Player.prototype.$showCharacter = function (num, log) {
				const result = original$showCharacter.call(this, num, log);
				if ("off" !== r()) {
					const player = this;
					setTimeout(() => {
						if ((0 === num || 2 === num) && player.node?.avatar) {
							const t = player.name1 || player.name;
							t && c(t, player.node.avatar);
						}
						if ((1 === num || 2 === num) && player.node?.avatar2) {
							const t = player.name2;
							t && c(t, player.node.avatar2);
						}
					}, 50);
				}
				return result;
			};
		})());
}
let y = null;
export { c as applyOutcropAvatar, i as checkImageExists, l as clearOutcropCache, h as createLazyObserver, m as getLazyObserver, o as getOutcropCharacterName, s as getOutcropImagePath, r as getOutcropStyle, g as registerLazyOutcrop, d as setupOutcropAvatar, f as updateAllOutcropAvatars, u as updatePlayerOutcropAvatar };
