import { game, _status, ui, lib, get } from "noname";
import { applyCardBorder as applyCardBorder } from "../../ui/cardStyles.js";
import { applyCardSkin as applyCardSkin, handleSkinFallback as handleSkinFallback } from "./skin-applier.js";
import { isSkinPreloaded as isSkinPreloaded, getSkinCache as getSkinCache, generateSkinFilename as generateSkinFilename, getFallbackKey as getFallbackKey, getFallbackSkinUrl as getFallbackSkinUrl } from "./skin-loader.js";
import { CARD_ANIMATION as CARD_ANIMATION, LAYOUT as LAYOUT } from "../../constants.js";
import { restoreEquipPresentation } from "../../ui/equip-layout.js";
import { ensureChixuerenCardDefinition as ensureChixuerenCardDefinition, getChixuerenSkinFilename as getChixuerenSkinFilename } from "./chixueren.js";
let h = null,
	u = null;
function l(init, copy) {
	((h = init), (u = copy), ensureChixuerenCardDefinition());
}
function m() {
	ensureChixuerenCardDefinition();
	const clone = u.apply(this, arguments);
	// 推荐属于当前手牌，不能随出牌/移牌副本带走。
	clone.querySelectorAll(".dui-mate-recommend-badge").forEach(badge => badge.remove());
	clone.classList.remove("dui-mate-recommended", "dui-mate-card-selected");
	delete clone.dataset.mateRecommender;
	restoreEquipPresentation(clone, this);
	((clone.nature = this.nature), this._decadeEquipUseAnimation && (clone._decadeEquipUseAnimation = !0));
	if (clone.name === "chixueren") {
		clone._decadeChixuerenSkinClone = true;
		clone._decadeChixuerenSkinFilename = this._decadeChixuerenSkinFilename;
	}
	const skinKey = lib.config.extension_十周年UI_cardPrettify;
	if (!skinKey || "off" === skinKey) return clone;
	if (!isSkinPreloaded(skinKey)) return clone;
	const cache = getSkinCache(skinKey),
		owner = typeof get.owner === "function" ? get.owner(this) : null,
		filename = skinKey === "online" ? this._decadeChixuerenSkinFilename || getChixuerenSkinFilename(this, owner) || generateSkinFilename(clone.name, clone.nature) : generateSkinFilename(clone.name, clone.nature),
		asset = cache[filename],
		fallbackKey = getFallbackKey(skinKey);
	clone.name === "chixueren" && (clone._decadeChixuerenSkinFilename = filename);
	if (asset && !asset.loaded && clone.classList.contains("decade-card"))
		void 0 === asset.loaded && asset.image
			? asset.image.addEventListener("error", () => {
					handleSkinFallback(clone, asset, fallbackKey, filename);
				})
			: !1 === asset.loaded && handleSkinFallback(clone, asset, fallbackKey, filename);
	else if (!asset && fallbackKey) {
		const e = getFallbackSkinUrl(fallbackKey, filename);
		e && ((clone.style.background = `url("${e}")`), clone.classList.add("decade-card"));
	}
	return clone;
}
function f(card) {
	ensureChixuerenCardDefinition();
	(h.apply(this, arguments), (this.node.range.innerHTML = ""));
	const t = lib.card[card[2]];
	return (
		t && ((this.dataset.cardName = card[2]), (this.dataset.cardType = t.type || ""), (this.dataset.cardSubtype = t.subtype || ""), (this.dataset.cardMultitarget = t.multitarget ? "1" : "0")),
		(function (cardElement, card) {
			const tags = Array.isArray(card[4]) ? [...card[4]] : [];
			if (!cardElement.cardid) return;
			_status.cardtag = _status.cardtag || {};
			for (const r in _status.cardtag) _status.cardtag[r].includes(cardElement.cardid) && tags.push(r);
			const uniqueTags = [...new Set(tags)];
			if (0 === uniqueTags.length) return;
			let tagstr = ' <span class="cardtag">';
			(uniqueTags.forEach(tag => {
				((_status.cardtag[tag] = _status.cardtag[tag] || []), _status.cardtag[tag].includes(cardElement.cardid) || _status.cardtag[tag].push(cardElement.cardid), (tagstr += lib.translate[tag + "_tag"]));
			}),
				(cardElement.node.range.innerHTML += tagstr + "</span>"));
		})(this, card),
		(function (t, card) {
			const e = t.$vertname;
			t.$name.innerHTML = e.innerHTML;
			let n = card[1] || "";
			parseInt(n) == n && (n = parseInt(n));
			((n = get.strNumber(n, !0) || n),
				(function () {
					const suit = t.suit;
					const isRed = suit === "heart" || suit === "diamond";
					const colorP = isRed ? "r" : "b";
					const suitImgMap = { spade: "spade", heart: "heart", club: "club", diamond: "diamond" };
					const rawNum = t.number;
					const numText = "string" == typeof n ? n : (0 !== t.number && get.strNumber(t.number)) || t.number || "";
					if (rawNum >= 1 && rawNum <= 13) {
						t.$suitnum.$num.innerHTML = '<img src="' + decadeUIPath + "images/suits/num_" + colorP + "_" + rawNum + '.png" class="suit-num-img">';
					} else if (("" + numText).toLowerCase() === "x") {
						t.$suitnum.$num.innerHTML = '<img src="' + decadeUIPath + "images/suits/num_" + colorP + '_x.png" class="suit-num-img">';
					} else {
						t.$suitnum.$num.innerHTML = "" + numText;
					}
					t.$suitnum.$br.style.display = "none";
					if (suitImgMap[suit]) {
						t.$suitnum.$suit.innerHTML = '<img src="' + decadeUIPath + "images/suits/" + suitImgMap[suit] + '.png" class="suit-img">';
					} else {
						t.$suitnum.$suit.innerHTML = get.translation((t.dataset.suit = suit));
					}
					t.dataset.suit = suit;
				})());
			const s = t.$equip,
				r = s.innerHTML,
				i = r.indexOf(" ");
			((s.$suitnum.innerHTML = r.slice(0, i)), (s.$name.innerHTML = r.slice(i)));
			const a = t.node,
				o = a.background;
			((a.judgeMark.node.judge.innerHTML = o.innerHTML), o.classList.contains("tight") && o.classList.remove("tight"));
			for (; a.info.firstChild; ) a.info.removeChild(a.info.lastChild);
		})(this, card),
		(function (cardElement) {
			cardElement.style.color && cardElement.style.removeProperty("color");
			cardElement.style.textShadow && cardElement.style.removeProperty("text-shadow");
			cardElement.node.info.style.opacity && cardElement.node.info.style.removeProperty("opacity");
			cardElement.$vertname.style.opacity && cardElement.$vertname.style.removeProperty("opacity");
		})(this),
		applyCardSkin(this, card),
		this
	);
}
function p(bool, delay, baseTransform) {
	if (delay)
		return void setTimeout(() => {
			this.updateTransform(this.classList.contains("selected"));
		}, delay);
	if (baseTransform !== undefined) this._transform = baseTransform;
	let transform = baseTransform;
	if (_status.event.player == game.me && this._transform && this.parentNode?.parentNode?.parentNode == ui.me && (!_status.mousedown || _status.mouseleft))
		if (bool) {
			const offset = window.decadeUI?.isMobile?.() ? LAYOUT.CARD_SELECT_OFFSET_MOBILE : LAYOUT.CARD_SELECT_OFFSET_DESKTOP;
			transform = `${this._transform} translateY(-${offset}px)`;
		} else transform = this._transform || "";
	if (transform !== undefined && this.style.transform !== transform) this.style.transform = transform;
}
function g(player) {
	if (!player) return;
	if (this.name?.startsWith("shengbei_left_") || this.name?.startsWith("shengbei_right_")) return this;
	const _decadeUI = window.decadeUI,
		arena = _decadeUI?.boundsCaches?.arena;
	(arena?.updated || arena?.update(), player.checkBoundsCache?.(), (this.fixed = !0));
	const s = Math.round((player.cacheWidth - arena.cardWidth) / 2 + player.cacheLeft),
		r = Math.round((player.cacheHeight - arena.cardHeight) / 2 + player.cacheTop),
		scale = arena.cardScale;
	return ((this.tx = s), (this.ty = r), (this.scaled = !0), (this.style.transform = `translate(${s}px,${r}px) scale(${scale})`), player !== game.me && applyCardBorder(this, player), this);
}
function y(player) {
	if (((this.fixed = !0), this._decadeEquipUseDirect)) {
		const e = Math.max(0, (this._decadeEquipDirectUntil || 0) - ("object" == typeof performance && "function" == typeof performance.now ? performance.now() : Date.now()));
		return void setTimeout(() => {
			this.parentNode && (delete this._decadeEquipUseDirect, delete this._decadeEquipDirectUntil, (this.style.transition = "opacity 180ms ease-out"), (this.style.willChange = ""), (this.style.opacity = "0"), setTimeout(() => this.delete(), 190));
		}, e);
	}
	(this.name?.startsWith("shengbei_left_") || this.name?.startsWith("shengbei_right_") || this.moveTo(player), setTimeout(() => this.delete(), CARD_ANIMATION.MOVE_DELETE_DELAY));
}
export { m as cardCopy, f as cardInit, y as cardMoveDelete, g as cardMoveTo, p as cardUpdateTransform, l as setBaseCardMethods };
