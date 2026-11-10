import { lib, get, _status } from "noname";
import { rememberEquipPresentation, updateEquipPresentation, refreshEquipLayout } from "./equip-layout.js";
const e = {
		界: "jie",
		神: "shen",
		武: "wu",
		族: "clan",
		标: "std",
		乐: "yue",
		谋: "sb",
		SP: "sp",
		OL: "ol",
		TW: "tw",
		星: "star",
		"☆": "star",
		"★": "star",
		新杀: "dc",
		新杀谋: "sb",
		"新杀|谋": "sb",
		"新杀|牢": "lao",
		OL谋: "sb",
		OL界: "jie",
		OL神: "shen",
		OL乐: "yue",
		OL汉: "han",
		手杀: "mb",
		手杀SP: "mb",
		手杀界: "jie",
		手杀神: "shen",
		手杀乐: "yue",
		"手杀|牢": "lao",
		"手杀|SP": "sp",
		手杀合: "he",
		TW谋: "sb",
		TW神: "shen",
		"TW|起": "jsrg",
		旧: "old",
		旧神: "old",
		旧晋: "old",
		毅重: "old",
		节钺: "old",
		"旧|OL": "old",
		"旧|神": "old",
		"旧|界": "old",
		"旧|谋": "old",
		"旧|幻": "old",
		"旧|势": "old",
		"旧|☆": "old",
		"旧|SP": "old",
		"旧|友": "old",
		"旧|族": "old",
		"旧|星": "old",
		"旧|威": "old",
		"旧|武": "old",
		"旧|侠": "old",
		"旧|起": "old",
		"旧|玄": "old",
		"旧|魔": "old",
		牢: "lao",
		"牢|爻": "lao",
		"牢|神": "lao",
		"牢|SP": "lao",
		"牢|谋": "lao",
		微信: "wei",
		"微信|牢": "lao",
		"微信|神": "shen",
		"微信|☆": "star",
		"微信|谋": "sb",
		"微信|界": "jie",
		"SP|微信": "sp",
		"SP|微信|神": "shen",
		欢杀: "Mbaby",
		"欢杀|神": "shen",
		"欢杀|谋": "sb",
		"欢杀|星": "star",
		"SP|欢杀": "sp",
		"SP|欢杀|神": "shen",
		"欢杀|界": "jie",
		极: "ji",
		极略SK: "sk",
		"极略★SK": "sk",
		极略SK神: "shen",
		极略SP神: "shen",
		极略SR: "sr",
		界SP: "jie",
		爻: "yao",
		魔: "dm",
		"TW|魔": "dm",
		"OL|魔": "dm",
		闪: "shan",
		晋: "jin",
		威: "v",
		玄: "xuan",
		势: "pot",
		友: "you",
		幻: "huan",
		起: "jsrg",
		经典: "jd",
		经典神: "shen",
		忍: "ren",
		有: "nailong",
		烈: "lie",
		韩氏: "hanshi",
		魂: "hun",
		汉: "han",
		狂: "kuang",
		喵: "miao",
		念: "nian",
		战: "zhan",
		战役篇: "zhan",
		战役篇神: "shen",
		桃: "tao",
		桃神: "shen",
		汉末: "han",
		汉末神: "shen",
		长安: "chang",
		长安神: "shen",
		渭南: "wn",
		渭南神: "shen",
		荆: "jing",
		荆神: "shen",
		疑: "sxrm",
		梦: "meng",
		承: "cheng",
		转: "zhuan",
		合: "he",
		衰: "shuai",
		兴: "xing",
		SCL: "scl",
		将: "jiang",
		用间: "yongjian",
		君: "jun",
		侠: "xia",
		K系列: "k",
		智将: "zhijiang",
		龙: "long",
		欧陆: "eu",
		九鼎: "jiding",
		燕幽: "yy",
		荆扬: "jianghua",
		蛇: "she",
		青史: "qingshi",
		徐兖: "xuyuan",
		风云: "fengyun",
		慢: "man",
		飞鸿: "feihong",
		虎翼: "huyi",
		闪耀: "shanyao",
		闪耀战姬: "shanyao",
		领主: "lingzhu",
		志气: "zhi",
		文心雕龙: "wen",
		礼: "li",
		书: "shu",
		数: "shuxue",
		御: "yu",
		射: "sheji",
		"骏骊|神": "shen",
		S特神: "shen",
		"26|神": "shen",
		"26|SP": "sp",
		"飞鸿|神": "shen",
		"☆神": "shen",
		"赛马|神": "shen",
		"SP|赛马|神": "shen",
		集蜜: "jm",
		雁翎: "yan",
		缘: "yuan",
		"26|界": "jie",
	},
	n = name => `${name}-mark`,
	s = name => `${name}Mark`,
	r = {
		get prefixConfigs() {
			return { ...e };
		},
		registerPrefix: (n, s) => "string" == typeof n && "string" == typeof s && !(!n.trim() || !s.trim()) && ((e[n] = s), !0),
		registerPrefixes(configs) {
			if (!configs || "object" != typeof configs) return [];
			const registered = [];
			for (const [s, r] of Object.entries(configs)) this.registerPrefix(s, r) && registered.push(s);
			return registered;
		},
		hasPrefix: prefix => prefix in e,
		shouldShowPrefixMark: () => "on" === lib.config?.["extension_十周年UI_newDecadeStyle"],
		getPrefixConfig(character) {
			const prefix = lib.translate?.[`${character}_prefix`],
				name = e[prefix];
			return name ? { className: n(name), property: s(name) } : null;
		},
		createMarkElement: (config, playerElement) => (playerElement[config.property] ??= decadeUI.element.create(config.className, playerElement)),
		showPrefixMark(e, n, s = !1) {
			if (!this.shouldShowPrefixMark()) return;
			if (
				!s &&
				!((playerElement, character) => {
					if ("guozhan" === get.mode()) {
						if (!_status.gameStarted) return !1;
						if ("function" == typeof playerElement?.isUnseen) {
							if (playerElement.name1 === character) return !playerElement.isUnseen(0);
							if (playerElement.name2 === character) return !playerElement.isUnseen(1);
							if (playerElement.name === character) return !playerElement.isUnseen(0);
						}
						return !1;
					}
					return !0;
				})(n, e)
			)
				return;
			const r = this.getPrefixConfig(e);
			if (!r) return;
			if (e !== (n.name1 || n.name)) return;
			const a = this.createMarkElement(r, n);
			n.contains(a) || n.appendChild(a);
			const i = n.node?.name;
			i && (i.innerText = get.rawName(e));
		},
		clearPrefixMarks(playerElement) {
			if (!playerElement) return;
			[...new Set(Object.values(e))].forEach(name => {
				const property = s(name),
					markElement = playerElement[property];
				markElement && (markElement.remove(), delete playerElement[property]);
			});
		},
		setupShowCharacterHook() {
			const self = this;
			((lib.skill._decadePrefixMark = {
				charlotte: !0,
				forced: !0,
				popup: !1,
				priority: 100,
				trigger: { player: ["showCharacterEnd"] },
				filter: () => self.shouldShowPrefixMark(),
				async content(_event, _trigger, player) {
					const name1 = player.name1 || player.name;
					(name1 && !player.isUnseen?.(0) && self.showPrefixMark(name1, player, !0), player.name2 && !player.isUnseen?.(1) && self.showPrefixMark(player.name2, player, !0));
				},
			}),
				lib.skill.global || (lib.skill.global = []),
				lib.skill.global.includes("_decadePrefixMark") || lib.skill.global.push("_decadePrefixMark"));
		},
	};
export { r as prefixMarkModule };
if (!lib.config["extension_十周年UI_aloneEquip"]) {
	//装备栏美化
	lib.element.player.$addVirtualEquip = function (card, cards) {
		const player = this;
		const isViewAsCard = cards.length !== 1 || cards[0].name !== card.name;
		const cardx = isViewAsCard ? game.createCard(card) : cards[0];
		cardx.fix();
		const cardSymbol = Symbol("card");
		cardx.cardSymbol = cardSymbol;
		cardx[cardSymbol] = card;
		if (card.subtypes) cardx.subtypes = card.subtypes;
		cardx.style.transform = "";
		cardx.classList.remove("drawinghidden");
		delete cardx._transform;

		updateEquipPresentation(cardx, card);

		if (isViewAsCard) {
			cardx.cards = cards || [];
			cardx.viewAs = card.name;
			cardx.classList.add("fakeequip");
		} else {
			delete cardx.viewAs;
			cardx.classList.remove("fakeequip");
		}
		let equipped = false,
			equipNum = get.equipNum(cardx);
		if (player.node.equips.childNodes.length) {
			for (let i = 0; i < player.node.equips.childNodes.length; i++) {
				if (get.equipNum(player.node.equips.childNodes[i]) >= equipNum) {
					equipped = true;
					player.node.equips.insertBefore(cardx, player.node.equips.childNodes[i]);
					break;
				}
			}
		}
		if (equipped === false) {
			player.node.equips.appendChild(cardx);
			if (cards?.length && _status.discarded) _status.discarded.removeArray(cards);
		}
	};
} else {
	// 独立装备栏沿用本体装备流程，在本体改写 name2 前保存原始节点。
	const addVirtualEquip = lib.element.player.$addVirtualEquip;
	lib.element.player.$addVirtualEquip = function (card, cards) {
		for (const source of cards || []) rememberEquipPresentation(source);
		const result = addVirtualEquip.apply(this, arguments);
		refreshEquipLayout(this);
		return result;
	};
}
