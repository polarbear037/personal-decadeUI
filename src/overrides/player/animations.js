import { game, get, ui, lib } from "noname";
import { getDui as getDui } from "./base.js";
import { isOfficialPlayerPopup, syncOfficialPlayerPopups } from "../../ui/officialPlayerPopup.js";
const t = { thunder: ["play5", "play6"], fire: ["play3", "play4"], __default: ["play1", "play2"] };
function a(num, nature = "soil", font, nobroadcast) {
	const player = this;
	if ("string" == typeof num) {
		(game.addVideo("damagepop", player, [num, nature, font]), !1 !== nobroadcast && game.broadcast((e, t, na, n) => e.$damagepop(t, na, n), player, num, nature, font));
		syncOfficialPlayerPopups();
		// 所有界面样式共用技能名过滤，不随优化提示的样式或开关变化。
		if (!isOfficialPlayerPopup(num)) return;
		const e = ui.create.div(".damage.skill-popup", ui.arena);
		e.dataset.nature = nature || "soil";
		let t = 0,
			o = 0,
			d = player;
		for (; d && d !== ui.arena;) ((t += d.offsetLeft || 0), (o += d.offsetTop || 0), (d = d.offsetParent));
		((e.style.position = "absolute"), (e.style.left = `${t}px`), (e.style.top = `${o + 80}px`), (e.style.width = `${player.offsetWidth}px`), (e.style.zIndex = "200"));
		const r = num.split(""),
			c = Math.ceil(r.length / 2);
		return (
			r.forEach((char, a) => {
				const span = document.createElement("span");
				((span.textContent = char), (span.className = a < c ? "char-left" : "char-right"), (span.style.animationDelay = 0.05 * a + "s"), e.appendChild(span));
			}),
			void setTimeout(() => e.delete(), 1500)
		);
	}
	if ("number" != typeof num) {
		if (player.damagepopups?.length) {
			const e = player.damagepopups[0];
			(player.appendChild(e),
				ui.refresh(e),
				e.classList.add("damageadded"),
				e.listenTransition(() => setTimeout(() => e.delete(), 200)),
				setTimeout(() => {
					(player.damagepopups.shift(), player.$damagepop());
				}, 500));
		}
		return;
	}
	const animation = getDui()?.animation;
	if (animation)
		if (num < 0 && "water" !== nature) {
			const e = t[nature] || t.__default,
				i = num <= -2 ? e[1] : e[0];
			animation.playSpine({ name: "effect_shoujidonghua", action: i }, { scale: 0.8, parent: player });
		} else num > 0 && "wood" === nature && animation.playSpine("effect_zhiliao", { scale: 0.7, parent: player });
}
function n(source) {
	("player" === get.itemtype(source) ? game.addVideo("damage", this, source.dataset.position) : game.addVideo("damage", this), game.broadcast((player, source) => player.$damage(source), this, source), this.queueCssAnimation("player-hurt 0.3s"));
}
function i(card1, target, card2) {
	const cardsetions = l([this, target]);
	(game.broadcast((p, t, c1, c2, cs) => p.$compare(c1, t, c2, cs), this, target, card1, card2, cardsetions), game.addVideo("compare", this, [get.cardInfo(card1), target.dataset.position, get.cardInfo(card2)]));
	const { scale: scale, centerX: centerX, y: o } = p();
	(h(card1, this, Math.round(centerX - 62), o, scale, cardsetions, 300),
		setTimeout(() => {
			h(card2, target, Math.round(centerX + 62), o, scale, cardsetions, 200);
		}, 200));
}
function s(card1, targets, cards) {
	const cardsetions = l([this, ...targets]);
	(game.broadcast((p, c1, ts, cs, cst) => p.$compareMultiple(c1, ts, cs, cst), this, card1, targets, cards, cardsetions), game.addVideo("compareMultiple", this, [get.cardInfo(card1), get.targetsInfo(targets), get.cardsInfo(cards)]));
	const { scale: scale, centerX: centerX, y: o } = p(),
		d = Math.round(centerX - (124 * targets.length) / 2);
	(h(card1, this, d, o, scale, cardsetions, 300),
		targets.forEach((target, t) => {
			setTimeout(
				() => {
					h(cards[t], target, d + 124 * (t + 1), o, scale, cardsetions, 200);
				},
				200 * (t + 1)
			);
		}));
}
function o(target, config) {
	if ("players" === get.itemtype(target)) return void target.forEach(e => this.line(e, config));
	if ("player" !== get.itemtype(target)) return;
	if (target === this) return;
	const player = this,
		dui = getDui();
	(game.broadcast((player, target, config) => player.line(target, config), player, target, config), game.addVideo("line", player, [target.dataset.position, config]), player.checkBoundsCache(!0), target.checkBoundsCache(!0));
	const hand = dui.boundsCaches.hand;
	let x1, y1, x2, y2;
	(player === game.me ? (hand.check(), (x1 = ui.arena.offsetWidth / 2), (y1 = hand.y)) : ((x1 = player.cacheLeft + player.cacheWidth / 2), (y1 = player.cacheTop + player.cacheHeight / 2)), target === game.me ? (hand.check(), (x2 = ui.arena.offsetWidth / 2), (y2 = hand.y)) : ((x2 = target.cacheLeft + target.cacheWidth / 2), (y2 = target.cacheTop + target.cacheHeight / 2)), game.linexy([x1, y1, x2, y2], config, !0));
}
function d() {
	(this.stopDynamic(), (this.node.gainSkill.innerHTML = null), this.node.dieidentity || (this.node.dieidentity = ui.create.div("died-identity", this)), this.node.dieidentity.classList.add("died-identity"));
	const player = this,
		decadeUI = window.decadeUI,
		identity = decadeUI.getPlayerIdentity(this),
		style = decadeUI.config.newDecadeStyle,
		url = (function (style, identity, player) {
			const basePath = window.decadeUIPath + "image/styles/",
				styleMap = { onlineUI: `online/dead4_${identity}.png`, babysha: `baby/dead3_${identity}.png`, codename: `codename/dead_${identity}.png`, on: `decade/dead_${identity}.png`, othersOff: `decade/dead_${identity}.png` };
			if (styleMap[style]) return basePath + styleMap[style];
			if (player !== game.me) return basePath + `shousha/dead2_${identity}.png`;
			return basePath + "shousha/dead2_me.png";
		})(style, identity, player),
		image = new Image();
	((image.onerror = () => {
		player.node.dieidentity.innerHTML = `${decadeUI.getPlayerIdentity(player, player.identity, !0)}<br>阵亡`;
	}),
		(player._trueMe || player) !== game.me && player !== game.me && "off" === style ? (player.node.dieidentity.innerHTML = `\n\t\t\t<div style="width:21px; height:81px; left:22.5px; top:-12px; position:absolute;\n\t\t\t\tbackground-image: url(${lib.assetURL}extension/十周年UI/image/ui/misc/likai.png);\n\t\t\t\tbackground-size: 100% 100%;">\n\t\t\t</div>\n\t\t`) : (player.node.dieidentity.innerHTML = ""),
		(player.node.dieidentity.style.backgroundImage = `url("${url}")`),
		(image.src = url),
		setTimeout(() => {
			decadeUI.animation?.playSpine("effect_zhenwang", { parent: player, scale: 0.8 });
		}, 250));
}
function r(name, type, color, avatar) {
	("string" != typeof type && (type = "legend"),
		game.addVideo("skill", this, [name, type, color, avatar]),
		game.broadcastAll(
			(player, type, name, color, avatar) => {
				const decadeUI = window.decadeUI;
				if (!decadeUI) return (game.delay(2.5), void (name && player.$fullscreenpop(name, color, avatar)));
				(decadeUI.delay(2500), name && decadeUI.effect.skill(player, name, avatar));
			},
			this,
			type,
			name,
			color,
			avatar
		));
}
function c(animation) {
	this.style.animation;
	let animations = this._cssanimations;
	(void 0 === animations &&
		((animations = []),
			(this._cssanimations = animations),
			this.addEventListener("animationend", function (e) {
				if (this.style.animationName !== e.animationName) return;
				const current = this.style.animation,
					animations = this._cssanimations;
				for (; animations.length;) {
					if (((this.style.animation = animations.shift()), this.style.animation !== current)) return;
					animations.current = this.style.animation;
				}
				((animations.current = ""), (this.style.animation = ""));
			})),
		animations.current || animations.length ? animations.push(animation) : ((animations.current = animation), (this.style.animation = animation)));
}
function l(players) {
	if (!lib.config.card_animation_info) return null;
	const cardsetions = {};
	return (
		players.forEach(p => {
			cardsetions[p.playerid] = get.cardsetion(p);
		}),
		cardsetions
	);
}
function p() {
	const bounds = getDui().boundsCaches.arena;
	return (bounds.updated || bounds.update(), { scale: bounds.cardScale, centerX: (bounds.width - bounds.cardWidth) / 2, y: Math.round(0.45 * bounds.height - bounds.cardHeight / 2) });
}
function h(card, owner, t, a, scale, cardsetions, delay) {
	const node = card.copy("thrown");
	if ((node.classList.add("infohidden"), node.classList.remove("decade-card"), (node.style.background = ""), (node.style.transform = `translate(${t}px, ${a}px) scale(${scale}) perspective(600px) rotateY(180deg)`), ui.arena.appendChild(node), ui.thrown.push(node), cardsetions?.[owner.playerid])) {
		ui.create.div(".cardsetion", cardsetions[owner.playerid], node).style.setProperty("display", "block", "important");
	}
	return (
		setTimeout(() => {
			((node.style.transition = "all ease-in 0.3s"),
				(node.style.transform = `translate(${t}px, ${a}px) scale(${scale}) perspective(600px) rotateY(270deg) translateX(52px)`),
				node.listenTransition(() => {
					(node.classList.remove("infohidden"), card.classList.contains("decade-card") ? (node.classList.add("decade-card"), (node.style.background = card.style.background)) : card.classList.contains("fullimage") && (node.classList.add("fullimage"), card.style.backgroundImage ? ((node.style.backgroundImage = card.style.backgroundImage), (node.style.backgroundSize = card.style.backgroundSize)) : (node.style.background = card.style.background)), (node.style.transition = "all 0s"), ui.refresh(node), (node.style.transform = `translate(${t}px, ${a}px) scale(${scale}) perspective(600px) rotateY(-90deg) translateX(52px)`), ui.refresh(node), (node.style.transition = ""), ui.refresh(node), (node.style.transform = `translate(${t}px, ${a}px) scale(${scale})`));
				}));
		}, delay),
		node
	);
}
export { i as playerCompare, s as playerCompareMultiple, n as playerDamage, a as playerDamagepop, d as playerDieAfter, o as playerLine, c as playerQueueCssAnimation, r as playerSkill };
