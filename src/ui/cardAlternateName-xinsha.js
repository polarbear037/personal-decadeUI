import { get } from "noname";

// spell_desc.ShortName；没有原版简称的扩展牌保留完整译名。
const shortNames = {
	顺手牵羊: "顺手", 过河拆桥: "过河", 五谷丰登: "五谷", 无中生有: "无中",
	南蛮入侵: "南蛮", 万箭齐发: "万箭", 桃园结义: "桃园", 无懈可击: "无懈",
	借刀杀人: "借刀", 乐不思蜀: "乐", 八卦阵: "八卦", 爪黄飞电: "飞电",
	诸葛连弩: "连弩", 雌雄双股剑: "雌雄", 青釭剑: "青釭", 青龙偃月刀: "青龙",
	丈八蛇矛: "丈八", 贯石斧: "贯石", 方天画戟: "方天", 麒麟弓: "麒麟",
	兵粮寸断: "兵粮", 铁索连环: "铁锁", 古锭刀: "古锭", 朱雀羽扇: "朱雀", 白银狮子: "白银",
	仁王盾: "仁王", 寒冰剑: "寒冰", 笑里藏刀: "笑里", 美人计: "美人", 木牛流马: "木马",
	以逸待劳: "待劳", 远交近攻: "远交", 知己知彼: "知己", 三尖两刃刀: "三尖", 吴六剑: "吴六",
	混水摸鱼: "混水", 项羽刀: "项羽", 太平要术: "太平", 七宝刀: "七宝", 白衣渡江: "白衣",
	水淹七军: "水淹", 落井下石: "落井", 兵临城下: "兵临", 投石车: "投石", 你死我活: "死活",
	两肋插刀: "插刀", 有难同当: "同当", 武圣归来: "归来", 有福同享: "同享", 见好就收: "见好",
	望梅止渴: "望梅", 至死方休: "至死", 火上浇油: "浇油",
};

function updateXinshaCardName(card) {
	let name = get.translation(card.name);
	if (card.name === "sha" && card.nature) name = get.natureList(card.nature).map(nature => get.translation(nature)).join("") + name;
	name = shortNames[name] || name;
	let tag = card.querySelector(":scope > .dui-xinsha-card-name");
	if (!tag) {
		tag = document.createElement("span");
		tag.className = "dui-xinsha-card-name";
		// 副本和离开手牌区的牌默认隐藏；只有一将手牌作用域会显示。
		tag.hidden = true;
		tag.setAttribute("aria-hidden", "true");
		tag.appendChild(document.createElement("span"));
		card.appendChild(tag);
	}
	if (tag.firstChild.textContent !== name) tag.firstChild.textContent = name;
}

function clearXinshaCardName(card) {
	card.querySelector(":scope > .dui-xinsha-card-name")?.remove();
}

export { updateXinshaCardName, clearXinshaCardName };
