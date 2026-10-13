import { createCollapseEnd as createCollapseEnd, getAllCardSkinPresets as getAllCardSkinPresets, createCollapseTitle as createCollapseTitle } from "../utils.js";
import { onCardAlternateNameClick as onCardAlternateNameClick, onChupaizhishiUpdate as onChupaizhishiUpdate, onCardkmhUpdate as onCardkmhUpdate, onCardkmhClick as onCardkmhClick, onCardPrettifyClick as onCardPrettifyClick, onHandFoldMinUpdate as onHandFoldMinUpdate, onHandFoldMinBlur as onHandFoldMinBlur, onDiscardScaleUpdate as onDiscardScaleUpdate, onDiscardScaleBlur as onDiscardScaleBlur, onCardScaleUpdate as onCardScaleUpdate, onCardScaleBlur as onCardScaleBlur, onHandTipHeightUpdate as onHandTipHeightUpdate, onHandTipHeightBlur as onHandTipHeightBlur, onAutoSelectUpdate as onAutoSelectUpdate, onAutoSelectClick as onAutoSelectClick, onCardGhostEffectClick as onCardGhostEffectClick } from "../handlers/card-handlers.js";
const b = createCollapseTitle("card_title", "卡牌相关"),
	_ = { name: "幻影出牌", intro: "开启后，卡牌打出或摸牌时会产生幻影拖尾效果，性能杀手请注意", init: !0, onclick: onCardGhostEffectClick },
	S = { name: "自动选择", intro: "开启后会关闭自动确认，自动选择单个合法目标和手牌，重启生效", init: !0, onclick: onAutoSelectClick, update: onAutoSelectUpdate },
	q = { name: "出牌信息提示", init: !0 },
	y = { name: "出牌信息提示高度", init: "20", intro: "输入0~100的数值，设置手牌提示框的底部高度百分比（默认值为20）", input: !0, onblur: onHandTipHeightBlur, update: onHandTipHeightUpdate },
	P = { name: "手牌大小", intro: "输入0.10~1.00的小数，回车保存并生效", init: "0.18", input: !0, onblur: onCardScaleBlur, update: onCardScaleUpdate },
	w = { name: "弃牌堆卡牌大小", intro: "输入0.10~1.00的小数，回车保存并生效", init: "0.14", input: !0, onblur: onDiscardScaleBlur, update: onDiscardScaleUpdate },
	x = { name: "手牌折叠", intro: "输入数值，控制手牌折叠时的最小间距（默认值为9，建议不要超过80）", init: "9", input: !0, onblur: onHandFoldMinBlur, update: onHandFoldMinUpdate },
	z = {
		name: "卡牌美化",
		init: "decade",
		get item() {
			return getAllCardSkinPresets().reduce((options, skin) => ((options[skin.key] = skin.label), options), { off: "关闭" });
		},
		onclick: onCardPrettifyClick,
	},
	A = { name: "卡牌边框", init: "off", item: { off: "关闭", kuang1: "大司马", kuang2: "大将军", kuang3: "国都护" }, onclick: onCardkmhClick, update: onCardkmhUpdate },
	E = { name: "出牌指示", intro: "切换目标指示特效", init: "off", item: { jiangjun: "将军", weijiangjun: "卫将军", cheqijiangjun: "车骑将军", biaoqijiangjun: "骠骑将军", dajiangjun: "大将军", dasima: "大司马", shoushaX: "手杀经典", shousha: "手杀新版", random: "随机", off: "关闭" }, update: onChupaizhishiUpdate },
	F = { name: "牌名辅助", intro: "在卡牌底部显示醒目的牌名标签，帮助快速识别手牌", init: !1, onclick: onCardAlternateNameClick },
	G = createCollapseEnd("card_title"),
	H = { card_title: b, cardGhostEffect: _, autoSelect: S, cardPrompt: q, handTipHeight: y, cardScale: P, discardScale: w, handFoldMin: x, cardPrettify: z, cardkmh: A, chupaizhishi: E, cardAlternateName: F, card_title_end: G };
export { S as autoSelect, F as cardAlternateName, H as cardConfigs, _ as cardGhostEffect, z as cardPrettify, q as cardPrompt, P as cardScale, b as card_title, G as card_title_end, A as cardkmh, E as chupaizhishi, w as discardScale, x as handFoldMin, y as handTipHeight };
