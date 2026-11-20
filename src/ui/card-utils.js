import { ui, get, _status, lib } from "noname";
import { playXinshaCardEffect } from "./card-effects-xinsha.js";
function e(card, e, t, n) {
	const a =
		n?.create ||
		((cls, parent, tag) => {
			const el = document.createElement(tag || "div");
			return (cls && (el.className = cls), parent && parent.appendChild(el), el);
		});
	let i = !1;
	card._tempSuitNum && (i = !0);
	let s = card._tempSuitNum || ui.create.div(".tempsuitnum", card);
	((card._tempSuitNum = s),
		i || ((s.$num = a("num", s, "span")), (s.$num.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif'), (s.$br = a(null, s, "br")), (s.$suit = a("suit", s, "span")), (s.$suit.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif')),
		(function () {
			const isRed = e === "heart" || e === "diamond";
			const colorP = isRed ? "r" : "b";
			const suitImgMap = { spade: "spade", heart: "heart", club: "club", diamond: "diamond" };
			const rawNum = typeof t === "number" ? t : parseInt(t);
			if (rawNum >= 1 && rawNum <= 13) {
				s.$num.innerHTML = '<img src="' + decadeUIPath + "images/suits/num_" + colorP + "_" + rawNum + '.png" class="suit-num-img">';
			} else {
				const numText = t ? get.strNumber(t) : "▣";
				if (("" + numText).toLowerCase() === "x") {
					s.$num.innerHTML = '<img src="' + decadeUIPath + "images/suits/num_" + colorP + '_x.png" class="suit-num-img">';
				} else {
					s.$num.innerHTML = "" + numText;
				}
			}
			s.$br.style.display = "none";
			if (e && suitImgMap[e]) {
				s.$suit.innerHTML = '<img src="' + decadeUIPath + "images/suits/" + suitImgMap[e] + '.png" class="suit-img">';
			} else {
				s.$suit.innerHTML = (e && get.translation(e)) || "◈";
			}
			card.dataset.tempsn = e;
		})());
}
const t = { effect_caochuanjiejian: { key: "effect_caochuanjiejian" }, shan: { key: "effect_shan" }, tao: { key: "effect_tao", opts: { scale: 0.9 } }, tiesuo: { key: "effect_tiesuolianhuan", opts: { scale: 0.9 } }, jiu: { key: "effect_jiu", opts: { y: [-30, 0.5] } }, kaihua: { key: "effect_shushangkaihua" }, wuzhong: { key: "effect_wuzhongshengyou" }, wuxie: { key: "effect_wuxiekeji", opts: { y: [10, 0.5], scale: 0.9 } }, nanman: { key: "effect_nanmanruqin", opts: { scale: 0.45 } }, wanjian: { key: "effect_wanjianqifa", opts: { scale: 0.78 } }, wugu: { key: "effect_wugufengdeng", opts: { y: [10, 0.5] } }, taoyuan: { key: "SF_kapai_eff_taoyuanjieyi", opts: { y: [10, 0.5] } }, shunshou: { key: "effect_shunshouqianyang" }, huogong: { key: "effect_huogong", opts: { x: [8, 0.5], scale: 0.5 } }, guohe: { key: "effect_guohechaiqiao", opts: { y: [10, 0.5] } }, yuanjiao: { key: "effect_yuanjiaojingong" }, zhibi: { key: "effect_zhijizhibi" }, zhulu_card: { key: "effect_zhulutianxia" } };
function n(nature, card) {
	return { thunder: "effect_leisha", fire: "effect_huosha" }[nature] || ("red" === get.color(card) ? "effect_hongsha" : "effect_heisha");
}
// GameMoveManager.getMoveToZoneCardTextLabel → CardUiNew.setCardTextLabel。
// 原版把整句交给固定宽度的白字标签换行，不使用 cardsetion 的势力色/强制换行。
function xinshaCardText(card, player, event) {
	const plain = value => {
		const node = document.createElement("span");
		node.innerHTML = value || "";
		return node.textContent || "";
	};
	const name = current => plain(get.slimName?.(current?.name) || get.translation(current?.name));
	const skillName = skill => {
		if (!skill) return "";
		const source = get.sourceSkillFor?.(skill) || skill;
		return source ? plain(get.skillTranslation?.(source, player) || get.translation(source)) : "";
	};
	const owner = name(player);
	if (event.name === "judge") return plain(get.translation(event.judgestr)) + "判定牌";
	if (["useCard", "respond"].includes(event.name)) {
		const used = event.card;
		// 转化牌在原版牌底只显示转化技能；原牌使用不重复拼接技能名。
		const originals = used?.cards || event.cards || [card];
		if (event.skill && (!originals.length || originals.some(original => original.name !== used?.name || !get.is.sameNature(get.nature(original), get.nature(used), true)))) {
			const skill = skillName(event.skill);
			if (skill) return skill;
		}
		if ((get.type?.(used) || lib.card[used?.name]?.type) === "equip") return owner + "装备";
		const targets = event.targets || [];
		if (["nanman", "wanjian"].includes(used?.name) || targets.includes(player)) return owner + "使用";
		if (targets.length) return owner + "对" + targets.map(name).join("、");
		return owner + "打出";
	}
	if (["lose", "loseAsync", "discard", "recast", "showCards", "chooseToCompare"].includes(event.name)) {
		let source = event;
		const seen = new Set();
		while (source && !seen.has(source)) {
			seen.add(source);
			if (source.name === "recast") return owner + "重铸";
			if (source.name === "chooseToCompare" || source.name === "showCards") return owner + skillName(source.skill) + "展示";
			if (source.name === "useCard" && source.card?.name === "guohe") return "过河拆桥弃置";
			if (["game", "phase", "phaseDiscard", "phaseUse"].includes(source.name)) break;
			const skill = source.skill || (lib.skill[source.name] ? source.name : "");
			if (skill && event.type === "discard") return owner + skillName(skill) + "弃置";
			source = source.getParent?.() || source.parent;
		}
		if (event.type === "discard" || event.name === "discard") return owner + "弃置";
	}
	return "";
}
function setXinshaCardText(node, text) {
	node.replaceChildren();
	if (!text) return;
	const label = document.createElement("span");
	label.className = "dui-yjcm-used-text";
	label.textContent = text;
	node.appendChild(label);
}
function a(card, player, event, a) {
	if (!card || !player || !event) return;
	const i =
		a.element?.create ||
		((cls, parent) => {
			const el = document.createElement("div");
			return (cls && (el.className = cls), parent && parent.appendChild(el), el);
		});
	let s,
		u = card.querySelector(".used-info");
	(u || (u = card.appendChild(i("used-info"))),
		(card.$usedtag = u),
		event.blameEvent && (event = event.blameEvent),
		lib._leiOlTrickJudgeOnCardThrown?.(card, event),
		(s =
			"judge" === event.name
				? (function (card, event, decadeUI) {
						const initialText = lib.config.extension_十周年UI_newDecadeStyle === "othersOff" ? xinshaCardText(card, player, event) : event.judgestr + "的判定牌";
						return (
							event.addMessageHook?.("judgeResult", function () {
								const evt = this,
									resultCard = evt.result.card.clone,
									apcard = evt.apcard;
								let judgeValue = resultCard.querySelector(".used-info");
								(judgeValue || ((judgeValue = document.createElement("div")), (judgeValue.className = "used-info"), resultCard.appendChild(judgeValue)), (evt.result.suit === get.suit(resultCard) && evt.result.number === get.number(resultCard)) || e(resultCard, evt.result.suit, evt.result.number, decadeUI.element));
								const getEffect = evt.judge2;
								let tagText;
								const effect = getEffect ? getEffect(evt.result) : (decadeUI.get?.judgeEffect?.(evt.judgestr, evt.result.judge) ?? evt.result.judge);
								const rawEffect = effect == null ? evt.result.judge : effect;
								const numericEffect = typeof rawEffect === "boolean" ? (rawEffect ? 1 : -1) : Number(rawEffect);
								const success = !Number.isNaN(numericEffect) && numericEffect >= 0;
								((tagText = success ? "判定生效" : "判定失效"), apcard?._ap?.stopSpineAll?.(), playJudgeResultEffect(resultCard, success, decadeUI, apcard), (evt.apcard = void 0), (judgeValue.innerHTML = (get.translation(evt.judgestr) || "") + tagText));
								if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") setXinshaCardText(judgeValue, xinshaCardText(resultCard, player, evt));
							}),
							decadeUI.animation?.cap?.playSpineTo?.(card, { name: "effect_panding", action: "play", loop: !0 }),
							(event.apcard = card),
							initialText
						);
					})(card, event, a)
				: (function (card, player, event, decadeUI) {
						const i = _status.event;
						const isCardUseEvent = ["useCard", "respond"].includes(event.name);
						let text = "";
						if (isCardUseEvent && lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") {
							try {
								_status.event = event;
								text = get.cardsetion?.(player) || "";
							} finally {
								_status.event = i;
							}
						}
						if (isCardUseEvent) {
							const i = event.card.name,
								s = get.nature(event.card);
							if ("off" !== lib.config.cardtempname && (card.name !== i || !get.is.sameNature(s, card.nature, !0))) {
								card._tempName || (card._tempName = ui.create.div(".temp-name", card));
								let e = get.translation(i) || "";
								(s && "sha" === i && (e = (get.translation(s) || "") + e), s && (card._tempName.dataset.nature = s), (card._tempName.innerHTML = e), (card._tempName.tempname = e));
							}
							const u = get.number(event.card),
								c = get.suit(event.card);
							if (("1" === card.dataset.views || 1 !== event.card.cards?.length || (card.number === u && card.suit === c) || e(card, c, u, decadeUI.element), event.card && (!event.card.cards || !event.card.cards.length || 1 === event.card.cards.length))) {
								const e = event.card.name,
									i = event.card.nature;
								if ("sha" === e) {
									const key = n(i, card);
									playXinshaCardEffect(card, key, undefined, decadeUI.animation?.cap);
								} else {
									const n = t[e];
									n && playXinshaCardEffect(card, n.key, n.opts, decadeUI.animation?.cap);
								}
							}
						}
						return text;
					})(card, player, event, a)),
		(u.innerHTML = s));
	if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") setXinshaCardText(u, xinshaCardText(card, player, event));
}
function getJudgeResultEffect(success) {
	const online = typeof lib !== "undefined" && lib.config?.extension_十周年UI_newDecadeStyle === "onlineUI";
	return online ? { name: "panding", action: success ? "play" : "play2" } : { name: "effect_panding", action: success ? "play4" : "play5" };
}
function playJudgeResultEffect(card, success, decadeUI, apcard) {
	if (!card) return false;
	const uiRuntime = decadeUI || (typeof window !== "undefined" ? window.decadeUI : null);
	card?._ap?.stopSpineAll?.();
	const effect = getJudgeResultEffect(success);
	if (effect.name === "panding") {
		const cap = uiRuntime?.animation?.cap;
		if (!card.isConnected || typeof cap?.playSpineTo !== "function") return false;
		// 画布直接附在卡牌内，使用未变换的逻辑卡宽，缩放由卡牌自身继承。
		// 官方 tns/aCs：126×174 牌面，Spine 原点 (63,87)，自身 scale=1。
		const scale = (card.clientWidth || 108) / 126;
		return !!cap.playSpineTo(card, { ...effect, version: "4.0", json: false, speed: 1, loop: false, scale });
	}
	const cap = uiRuntime?.animation?.cap;
	if (apcard?._ap && apcard === card && typeof apcard._ap.playSpine === "function") {
		apcard._ap.playSpine(effect);
		return true;
	}
	if (!cap || typeof cap.playSpineTo !== "function") return false;
	cap.playSpineTo(card, effect);
	return true;
}
function playTrickJudgeResult(card, success, decadeUI) {
	return playJudgeResultEffect(card, success, decadeUI);
}
export { t as cardEffectMap, e as cardTempSuitNum, n as getShaEffectKey, a as tryAddPlayerCardUseTag, getJudgeResultEffect, playTrickJudgeResult };
