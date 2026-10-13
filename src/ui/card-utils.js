import { ui, get, _status, lib } from "noname";
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
		(s =
			"judge" === event.name
				? (function (card, event, decadeUI) {
						const initialText = event.judgestr + "的判定牌";
						return (
							event.addMessageHook?.("judgeResult", function () {
								const evt = this,
									resultCard = evt.result.card.clone,
									apcard = evt.apcard;
								let action,
									judgeValue = resultCard.querySelector(".used-info");
								(judgeValue || ((judgeValue = document.createElement("div")), (judgeValue.className = "used-info"), resultCard.appendChild(judgeValue)), (evt.result.suit === get.suit(resultCard) && evt.result.number === get.number(resultCard)) || e(resultCard, evt.result.suit, evt.result.number, decadeUI.element));
								const getEffect = evt.judge2;
								let tagText;
								((action = getEffect ? getEffect(evt.result) : (decadeUI.get?.judgeEffect?.(evt.judgestr, evt.result.judge) ?? evt.result.judge)), (action = "boolean" == typeof action ? (action ? 1 : -1) : evt.result.judge), action >= 0 ? ((action = "play4"), (tagText = "判定生效")) : ((action = "play5"), (tagText = "判定失效")), apcard?._ap && apcard._ap.stopSpineAll(), apcard?._ap && apcard === resultCard ? apcard._ap.playSpine({ name: "effect_panding", action: action }) : decadeUI.animation?.cap?.playSpineTo?.(resultCard, { name: "effect_panding", action: action }), (evt.apcard = void 0), (judgeValue.innerHTML = (get.translation(evt.judgestr) || "") + tagText));
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
						if (isCardUseEvent) {
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
									decadeUI.animation?.cap?.playSpineTo?.(card, key);
								} else {
									const n = t[e];
									n && decadeUI.animation?.cap?.playSpineTo?.(card, n.key, n.opts);
								}
							}
						}
						return text;
					})(card, player, event, a)),
		(u.innerHTML = s));
}
export { t as cardEffectMap, e as cardTempSuitNum, n as getShaEffectKey, a as tryAddPlayerCardUseTag };
