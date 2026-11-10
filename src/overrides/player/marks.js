import { game, ui, lib, get } from "noname";
import { getBasePlayerMethods as getBasePlayerMethods } from "./base.js";
import { getOnlineCircleMark, observeOnlineMarks } from "../../ui/online-circle-marks.js";
const e = ["xinfu_falu_"],
	n = /* @__PURE__ */ new Set(["starcanxi_wangsheng", "starcanxi_xiangsi", "starcanxi_cancel"]),
	a = /* @__PURE__ */ new Set(["starcanxi_qun", "starcanxi_shu", "starcanxi_wei", "starcanxi_wu", "starcanxi_jin", "starcanxi_shen"]);

function customMarkShowsCards(mark, player, storage) {
	// 使用本体的技能介绍回调和当前视角检查展示内容，不打开预览窗口。
	const dialog = ui.create.dialog("hidden", "notouchscroll");
	try {
		const result = mark.info.mark(dialog, storage, player, undefined, mark.skill);
		if (result instanceof Promise) {
			result.catch(() => {});
			return true;
		}
		return !!dialog.content.querySelector(".button.card");
	} catch {
		// 依赖真实点击事件的扩展回调仍在原入口执行。
		return true;
	}
}

export function getOnlineMarkPresentation(mark, player) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI") return;
	const skill = lib.skill[mark.skill];
	if (skill?.zhuanhuanji || skill?.zhuanhuanji2) return;
	const info = mark.info;
	if (mark._nointro) return "status";
	const hasExpansion = mark.skill && player?.getExpansions?.(mark.skill)?.length > 0;
	// 「赂」仅显示库存。能点开的「赂存」按钮来自独立的已用牌名记录。
	if (mark.skill === "olsblucun") return hasExpansion ? "status" : "empty";
	if (mark.skill === "olsblucun_used") return player?.storage?.olsblucun_used?.length ? "dialog" : "empty";
	if (!hasExpansion && (info?.content === "expansion" || info?.markcount === "expansion")) return "empty";
	if (get.itemtype(mark) === "card") return "dialog";
	const storage = player?.storage?.[mark.skill];
	const hasStoredCards = ["card", "cards"].includes(get.itemtype(storage));
	if (!mark._customintro && typeof info?.mark === "function" && (hasExpansion || hasStoredCards)) {
		return customMarkShowsCards(mark, player, storage) ? "dialog" : "status";
	}
	if (hasExpansion) return "dialog";
	if (hasStoredCards && (mark._customintro || info?.content === "card" || info?.content === "cards")) return "dialog";
	if (typeof info?.id === "string" && info.id.startsWith("subplayer") && player?.isUnderControl(true)) {
		const subplayer = player.storage[info.id];
		if (subplayer?.hs?.length || subplayer?.es?.length) return "dialog";
	}
	if (getOnlineCircleMark(mark)) return "graphic";
	return "status";
}

function syncOnlineMarkPresentation(mark, player) {
	const presentation = getOnlineMarkPresentation(mark, player);
	if (presentation && (mark.skill === "olsblucun" || mark.skill === "olsblucun_used")) {
		mark.dataset.onlineLucun = mark.skill === "olsblucun" ? "pile" : "used";
		const label = get.translation("olsblucun");
		if (mark.text && mark.text.textContent !== label) mark.text.textContent = label;
	}
	if (presentation && mark.dataset.onlineMarkType !== presentation) mark.dataset.onlineMarkType = presentation;
	if (presentation === "dialog" || presentation === "graphic") observeOnlineMarks(player);
	return presentation;
}

export function refreshOnlineMarkView() {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI") return;
	for (const player of [...game.players, ...game.dead]) {
		for (const mark of Object.values(player.marks)) {
			if (typeof mark.info?.mark === "function") syncOnlineMarkPresentation(mark, player);
		}
	}
}

function r(item) {
	if (!item) return !1;
	const style = window.decadeUI?.config?.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle,
		markStyle = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;
	if ("Off" === style) return !1;
	if ("decade" === markStyle) {
		const e = get.info(item);
		if (e?.zhuanhuanji || e?.zhuanhuanji2 || e?.limited) return !0;
	}
	return "string" == typeof item && ("on" === style || "othersOff" === style) && (!(!e.some(p => item.startsWith(p)) || n.has(item)) || !!a.has(item));
}
function i(name, info, card, nobroadcast) {
	if (r(name)) return;
	return getBasePlayerMethods().markSkill.apply(this, [name, info, card, nobroadcast]);
}
function o(name, info, card, nobroadcast) {
	if (r(name)) return;
	return getBasePlayerMethods().unmarkSkill.apply(this, [name, info, card, nobroadcast]);
}
function s(t, e, n) {
	const style = lib.config.extension_十周年UI_newDecadeStyle,
		i = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;
	const useTwoCharacters = style === "onlineUI" || i === "decade";
	if (t && "Off" !== style && "decade" === i) {
		const e = get.info(t);
		if (e && (e.zhuanhuanji || e.zhuanhuanji2 || e.limited)) return;
	}
	if (t && "string" == typeof t) {
		if (t.startsWith("xinfu_falu_") && ("on" === style || "othersOff" === style)) return;
		if (a.has(t) && ("on" === style || "othersOff" === style)) return;
	}
	if ("cards" === get.itemtype(t)) return t.map(card => this.mark(card, e));
	const o = (function (t, e) {
		let n,
			a = t;
		if ("card" === get.itemtype(t)) ((n = t.copy("mark")), (n.suit = t.suit), (n.number = t.number), t.classList.contains("fullborder") && (n.classList.add("fakejudge", "fakemark"), n.node.mark || (n.node.mark = n.querySelector(".mark-text") || window.decadeUI.element.create("mark-text", n)), (n.node.mark.innerHTML = lib.translate[t.name + "_bg"] || get.translation(t.name)[0])), (a = t.name));
		else {
			n = ui.create.div(".card.mark");
			const e = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;
			let a = lib.translate[t + "_bg"];
			((a && "+" !== a[0] && "-" !== a[0]) || (a = get.translation(t).slice(0, useTwoCharacters ? 2 : 1)), (n.text = window.decadeUI.element.create("mark-text", n)), lib.skill[t]?.markimage ? ((a = "　"), Object.assign(n.text.style, { animation: "none", boxShadow: "none", backgroundPosition: "center", backgroundSize: "contain", backgroundRepeat: "no-repeat" }), n.text.setBackgroundImage(lib.skill[t].markimage), n.text.classList.add("before-hidden")) : 2 === a.length && n.text.classList.add("small-text"), lib.skill[t]?.zhuanhuanji && ((n.text.style.animation = "none"), n.text.classList.add("before-hidden")), "decade" === e && a?.includes("☯") && n.style.setProperty("display", "none", "important"), (n.text.innerHTML = a));
			const r = n.setBackground;
			n.setBackground = function (a, i) {
				if ("character" === i) {
					let a = lib.translate[t + "_bg"];
					return ((a && "+" !== a[0] && "-" !== a[0]) || (a = get.translation(t).slice(0, useTwoCharacters ? 2 : 1)), n.text && ((n.text.innerHTML = a), 2 === a.length ? n.text.classList.add("small-text") : n.text.classList.remove("small-text")), this);
				}
				return r?.apply(this, arguments);
			};
		}
		if (((n.name = a), (n.skill = e || a), !n.classList.contains("own-skill") && !n.classList.contains("other-skill"))) {
			const t = lib.skill[n.skill]?.intro,
				e = "function" == typeof t?.mark || ["expansion", "card", "cards"].includes(t?.content);
			n.classList.add(e ? "other-skill" : "own-skill");
		}
		return n;
	})(t, n);
	return ("object" == typeof e ? (o.info = e) : "string" == typeof e && (o.markidentifer = e), c(o, this), this.node.marks.appendChild(o), this.updateMarks(), ui.updatem(this), o);
}
function c(mark, player) {
	syncOnlineMarkPresentation(mark, player);
	(mark.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card), lib.config.touchscreen || (lib.config.hover_all && lib.setHover(mark, ui.click.hoverplayer), lib.config.right_info && (mark.oncontextmenu = ui.click.rightplayer)));
}
function l(name, info, learn, learn2) {
	"object" == typeof name && (name = name.name);
	const nodeMark = ui.create.div(".card.mark"),
		nodeMarkText = ui.create.div(".mark-text", nodeMark);
	if ((info || (info = {}), info.name || (info.name = get.translation(name)), info.content || (info.content = get.skillintro(name, learn, learn2)), name.startsWith("unknown"))) {
		const e = get.translation(name)[0];
		("decade" === (window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle) && e?.includes("☯") && nodeMark.style.setProperty("display", "none", "important"), (nodeMarkText.innerHTML = e));
	} else {
		if (!get.character(name)) return console.error(name);
		const n = info.name.slice(0, 2);
		2 === n.length && nodeMarkText.classList.add("small-text");
		("decade" === (window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle) && n?.includes("☯") && nodeMark.style.setProperty("display", "none", "important"), (nodeMarkText.innerHTML = n));
	}
	((nodeMark.name = name + "_charactermark"), (nodeMark.info = info), (nodeMark.text = nodeMarkText));
	const hasCardDisplay = "function" == typeof lib.skill[name]?.intro?.mark;
	return (nodeMark.classList.add(hasCardDisplay ? "other-skill" : "own-skill"), c(nodeMark, this), this.node.marks.appendChild(nodeMark), ui.updatem(this), nodeMark);
}
function d(t, e) {
	if (!this.marks[t]) {
		const e = lib.skill[t];
		if (!e?.intro || (!this.storage[t] && !e.intro.markcount)) return this;
		if ((this.markSkill(t), !this.marks[t])) return this;
	}
	const n = this.marks[t],
		a = lib.skill[t];
	if (syncOnlineMarkPresentation(n, this) === "empty" && n.markcount) {
		n.markcount.remove();
		n.markcount = void 0;
	}
	if ((e && this.storage[t] && this.syncStorage(t), a?.intro && !a.intro.nocount && (this.storage[t] || a.intro.markcount))) {
		const e = (function (player, name, skillInfo) {
			const intro = skillInfo.intro;
			if ("function" == typeof intro.markcount) return intro.markcount(player.storage[name], player, name);
			if ("expansion" === intro.markcount) return player.countCards("x", card => card.hasGaintag(name));
			if ("number" == typeof player.storage[name + "_markcount"]) return player.storage[name + "_markcount"];
			if ("ghujia" === name) return player.hujia;
			if ("number" == typeof player.storage[name]) return player.storage[name];
			if (Array.isArray(player.storage[name])) return player.storage[name].length;
			return 0;
		})(this, t, a);
		e ? (n.markcount || (n.markcount = window.decadeUI.element.create("mark-count", n)), (n.markcount.textContent = e)) : n.markcount && (n.markcount.delete(), (n.markcount = void 0));
	} else (n.markcount && (n.markcount.delete(), (n.markcount = void 0)), "auto" === a?.mark && this.unmarkSkill(t));
	return this;
}
function k(t, e, n, a) {
	return (
		"object" == typeof e && (e = e.name),
		game.broadcastAll(
			(player, t, e, n, a) => {
				(player.marks[a]
					? (function (player, t, e, n, a) {
							const r = player.marks[t];
							((r.name = e + "_skillmark"), (r.info = { name: e, content: n, id: t }));
							const i = "function" == typeof lib.skill[e]?.intro?.mark;
							(r.classList.remove("own-skill", "other-skill"), r.classList.add(i ? "other-skill" : "own-skill"), game.addVideo("changeMarkCharacter", player, { id: t, name: e, content: n, target: a }));
						})(player, a, e, n, t)
					: (function (player, t, e, n, a) {
							const r = ui.create.div(".card.mark"),
								i = ui.create.div(".mark-text", r),
								o = get.translation(e),
								s = o.slice(0, 2);
							2 === s.length && i.classList.add("small-text");
							"decade" === (window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle) && s?.includes("☯") && r.style.setProperty("display", "none", "important");
							((i.innerHTML = s), (r.name = e + "_skillmark"), (r.info = { name: e, content: n, id: t }), (r.text = i));
							const c = "function" == typeof lib.skill[e]?.intro?.mark;
							(r.classList.add(c ? "other-skill" : "own-skill"), r.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card), lib.config.touchscreen || (lib.config.hover_all && lib.setHover(r, ui.click.hoverplayer), lib.config.right_info && (r.oncontextmenu = ui.click.rightplayer)));
							(player.node.marks.appendChild(r), (player.marks[t] = r), game.addVideo("markCharacter", player, { name: e, content: n, id: t, target: a }));
						})(player, a, e, n, t),
					player.marks[a].classList.add("skillmark"),
					(player.marks[a]._name = e),
					ui.updatem(player));
			},
			this,
			e,
			n,
			a,
			t
		),
		this
	);
}
export { s as playerMark, l as playerMarkCharacter, i as playerMarkSkill, k as playerMarkSkillCharacter, o as playerUnmarkSkill, d as playerUpdateMark };
