import { get, lib } from "noname";

const equipPresentations = new WeakMap();

const EQUIP_NAMES = {
	爪黄飞电: "爪黄&nbsp;&nbsp;+1",
	大宛: "大宛&nbsp;&nbsp;-1",
	绝影: "绝影&nbsp;&nbsp;+1",
	赤兔: "赤兔&nbsp;&nbsp;-1",
	骅骝: "骅骝&nbsp;&nbsp;+1",
	紫骍: "紫骍&nbsp;&nbsp;-1",
	的卢: "的卢&nbsp;&nbsp;+1",
	吴六剑: "吴六剑&nbsp;2",
	机关弩: "机关弩&nbsp;1",
	雌雄双股剑: "雌雄剑&nbsp;2",
	方天画戟: "方天戟&nbsp;4",
	贯石斧: "贯石斧&nbsp;3",
	寒冰剑: "寒冰剑&nbsp;2",
	麒麟弓: "麒麟弓&nbsp;5",
	青釭剑: "青釭剑&nbsp;2",
	青龙偃月刀: "青龙刀&nbsp;3",
	丈八蛇矛: "丈八矛&nbsp;3",
	古锭刀: "古锭刀&nbsp;2",
	朱雀羽扇: "朱雀扇&nbsp;4",
	七宝刀: "七宝刀&nbsp;2",
	银月枪: "银月枪&nbsp;3",
	衠钢槊: "衠钢槊&nbsp;3",
	飞龙夺凤: "飞龙刀&nbsp;2",
	三尖两刃刀: "三尖刀&nbsp;3",
	诸葛连弩: "诸葛弩&nbsp;1",
	倚天剑: "倚天剑&nbsp;2",
	七星宝刀: "七星刀&nbsp;2",
	折戟: "折戟&nbsp;&nbsp;0",
	无锋剑: "无锋剑&nbsp;1",
	涯角枪: "涯角枪&nbsp;3",
	五行鹤翎扇: "五行扇&nbsp;4",
	断剑: "断剑&nbsp;&nbsp;0",
	霹雳车: "霹雳车&nbsp;9",
	水波剑: "水波剑&nbsp;2",
	红缎枪: "红缎枪&nbsp;3",
	天雷刃: "天雷刃&nbsp;4",
	混毒弯匕: "混毒匕&nbsp;1",
	元戎精械弩: "精械弩&nbsp;3",
	乌铁锁链: "铁锁链&nbsp;3",
	太极拂尘: "太极拂&nbsp;5",
	灵宝仙壶: "灵宝壶&nbsp;3",
	冲应神符: "冲应符",
	先天八卦阵: "先天八卦",
	八卦阵: "八卦",
	照月狮子盔: "狮子盔",
	玲珑狮蛮带: "狮蛮带",
	束发紫金冠: "紫金冠",
	红棉百花袍: "百花袍",
	无双方天戟: "方天戟",
	白银狮子: "银狮子",
	仁王金刚盾: "金剛盾",
	桐油百韧甲: "百韧甲",
	定澜夜明珠: "夜明珠",
	霹雳投石车: "霹雳车",
};

// 只保存装备栏改写的节点；离区时不重新 init 卡牌，保留其他扩展的卡面和标签。
function rememberEquipPresentation(card) {
	const name2 = card?.node?.name2;
	if (name2 && !equipPresentations.has(card)) equipPresentations.set(card, Array.from(name2.childNodes));
}

function restoreEquipPresentation(card, source = card) {
	if (!card?.classList) return;
	if (Object.prototype.hasOwnProperty.call(source, "_decadeEquipFlightVisibility")) card.style.visibility = source._decadeEquipFlightVisibility;
	const entryStyle = source._decadeEquipEntryStyle;
	if (entryStyle) {
		for (const property of ["opacity", "transition", "willChange", "transformOrigin", "overflow", "clipPath", "webkitClipPath", "translate"]) card.style[property] = entryStyle[property];
	}
	const name2 = card.node?.name2 || card.querySelector?.(":scope > .name2");
	const originalNodes = equipPresentations.get(source);
	if (name2) {
		if (originalNodes) name2.replaceChildren(...(source === card ? originalNodes : originalNodes.map(node => node.cloneNode(true))));
		name2.querySelectorAll(".decade-equip-horse, .decade-equip-feichu").forEach(node => node.remove());
		delete name2.dataset.decadeEquip;
		delete name2.dataset.decadeHorse;
		delete name2.dataset.decadeFeichu;
	}
	delete card.dataset.equipSlot;
	delete card.dataset.equipReplaced;
	card.style.removeProperty("--equip-row");
	card.style.removeProperty("--equip-column");
	delete card.dataset.decadeHorse;
	card.classList.remove("equiped");
	if (source === card) {
		equipPresentations.delete(card);
		delete card._decadeEquipFlightVisibility;
		delete card._decadeEquipEntryStyle;
		delete card._decadeEquipEntryAnimated;
	}
}

// 横条仅由装备栏专属节点组成，普通卡面和其他扩展添加的节点保留在快照中。
function updateEquipPresentation(card, virtualCard = card) {
	const name2 = card?.node?.name2;
	if (!name2 || card.classList.contains("feichu") || card.classList.contains("emptyequip") || card.extraEquip) return;
	const info = get.info?.(virtualCard, false);
	if (info?.type !== "equip") return;
	rememberEquipPresentation(card);
	if (!name2.dataset.decadeEquip) {
		name2.replaceChildren();
		for (const className of ["decade-equip-type-icon", "decade-equip-suit", "decade-equip-number", "decade-equip-name"]) {
			const node = name2.ownerDocument.createElement(className === "decade-equip-name" ? "span" : "img");
			node.className = className;
			if (node.tagName === "IMG") node.draggable = false;
			name2.appendChild(node);
		}
		name2.dataset.decadeEquip = "1";
	}
	const path = window.decadeUIPath || `${lib.assetURL || ""}extension/${window.decadeUIName || "十周年UI"}/`;
	const slot = getEquipSlot(virtualCard) || getEquipSlot(card) || 5;
	const icon = name2.querySelector(".decade-equip-type-icon");
	const iconSource = `${path}image/ui/equip/official/new_equip_type_${Math.min(slot, 5) + 2}_new.png`;
	if (icon.getAttribute("src") !== iconSource) icon.setAttribute("src", iconSource);
	icon.alt = ["", "武器", "防具", "防御马", "进攻马", "宝物"][slot] || "坐骑";
	const suit = getHorseSuit(card);
	const suitNode = name2.querySelector(".decade-equip-suit");
	const numberNode = name2.querySelector(".decade-equip-number");
	const setImage = (node, file, label) => {
		node.hidden = !file;
		if (file) {
			const source = `${path}images/${file}.png`;
			if (node.getAttribute("src") !== source) node.setAttribute("src", source);
		} else node.removeAttribute("src");
		node.alt = label;
	};
	const suitLabel = ({ heart: "♥", diamond: "♦", spade: "♠", club: "♣" })[suit] || "";
	setImage(suitNode, suitLabel ? `suit/${suit}` : "", suitLabel);
	const numberLabel = getHorseNumber(card);
	const number = Number(({ A: 1, J: 11, Q: 12, K: 13 })[numberLabel] || numberLabel);
	const color = suit === "heart" || suit === "diamond" ? "r" : "b";
	setImage(numberNode, Number.isInteger(number) && number >= 1 && number <= 13 ? `number/${color}${number}` : "", numberLabel);
	const translated = get.translation(virtualCard.name);
	const label = name2.querySelector(".decade-equip-name");
	const text = (EQUIP_NAMES[translated] || translated).replace(/&nbsp;/g, "\u00a0");
	if (label.textContent !== text) label.textContent = text;
	label.title = translated;
}

function isLayoutEquipCard(card) {
	if (!card || card.classList?.contains("removing")) return false;
	// 普通空槽带 hidden；可见的 emptyequip 可能承载 extraEquip 技能，仍需显示。
	if (card.classList?.contains("hidden") && !card.classList.contains("feichu")) return false;
	return true;
}

function getEquipSlot(card) {
	try {
		const slot = Number(get.equipNum(card));
		return slot >= 1 && slot <= 5 ? slot : 0;
	} catch {
		return 0;
	}
}

const FEICHU_DISTANCES = { 3: "+1", 4: "-1" };

function updateFeichuPresentation(card, slot) {
	const name2 = card?.node?.name2;
	if (!name2) return;
	const existing = name2.querySelector?.(":scope > .decade-equip-feichu");
	if (!card.classList?.contains("feichu") || card.extraEquip) {
		existing?.remove();
		delete name2.dataset.decadeFeichu;
		return;
	}
	const marker = existing || name2.ownerDocument.createElement("span");
	marker.className = "decade-equip-feichu";
	marker.dataset.slot = String(slot);
	if (!existing) name2.appendChild(marker);
	let icon = marker.querySelector(":scope > .decade-equip-feichu-icon");
	let label = marker.querySelector(":scope > .decade-equip-feichu-label");
	if (!icon) {
		icon = marker.ownerDocument.createElement("span");
		icon.className = "decade-equip-feichu-icon";
		marker.prepend(icon);
	}
	icon.classList.remove("icon", "icon-shield", "feichu");
	if (!label) {
		label = marker.ownerDocument.createElement("span");
		label.className = "decade-equip-feichu-label";
		marker.appendChild(label);
	}
	let distance = marker.querySelector(":scope > .decade-equip-feichu-distance");
	const distanceText = FEICHU_DISTANCES[slot];
	if (distanceText) {
		if (!distance) {
			distance = marker.ownerDocument.createElement("span");
			distance.className = "decade-equip-feichu-distance";
			marker.appendChild(distance);
		}
		distance.textContent = distanceText;
	} else {
		distance?.remove();
	}
	label.textContent = "废除";
	name2.dataset.decadeFeichu = "1";
}

function getHorseSuit(card) {
	try {
		return card?.suit || get.suit(card, false) || "none";
	} catch {
		return card?.suit || "none";
	}
}

function getHorseNumber(card) {
	let number = card?.number;
	try {
		if (number == null) number = get.number(card, false);
		return typeof get.strNumber === "function" ? get.strNumber(number) : String(number ?? "");
	} catch {
		return String(number ?? "");
	}
}

function updateHorseImage(node, file, label) {
	let image = node.querySelector(":scope > img");
	if (!file) {
		node.textContent = label;
		return;
	}
	if (!image) {
		image = node.ownerDocument.createElement("img");
		image.draggable = false;
		node.replaceChildren(image);
	}
	const extensionPath = window.decadeUIPath || `${lib.assetURL || ""}extension/${window.decadeUIName || "十周年UI"}/`;
	const source = `${extensionPath}images/${file}.png`;
	if (image.getAttribute("src") !== source) image.setAttribute("src", source);
	image.alt = label;
}

function updateCompactHorsePresentation(card, slot, layout) {
	const name2 = card?.node?.name2;
	if (!name2) return;
	const existing = name2.querySelector?.(":scope > .decade-equip-horse");
	const shouldCompact = layout === "combined" && (slot === 3 || slot === 4) && !card.classList?.contains("feichu") && !card.classList?.contains("emptyequip") && !card.extraEquip;
	if (!shouldCompact) {
		existing?.remove();
		delete name2.dataset.decadeHorse;
		delete card.dataset.decadeHorse;
		return;
	}
	const marker = existing || name2.ownerDocument.createElement("span");
	marker.className = "decade-equip-horse";
	marker.dataset.slot = String(slot);
	if (!existing) name2.appendChild(marker);
	const create = className => {
		const node = marker.ownerDocument.createElement("span");
		node.className = className;
		marker.appendChild(node);
		return node;
	};
	let icon = marker.querySelector(":scope > .decade-equip-horse-icon") || create("decade-equip-horse-icon");
	let suit = marker.querySelector(":scope > .decade-equip-horse-suit") || create("decade-equip-horse-suit");
	let number = marker.querySelector(":scope > .decade-equip-horse-number") || create("decade-equip-horse-number");
	let distance = marker.querySelector(":scope > .decade-equip-horse-distance") || create("decade-equip-horse-distance");
	icon.dataset.slot = String(slot);
	distance.textContent = slot === 3 ? "+1" : "-1";
	suit.dataset.suit = getHorseSuit(card);
	const suitLabel = ({ heart: "♥", diamond: "♦", spade: "♠", club: "♣" })[suit.dataset.suit] || "";
	updateHorseImage(suit, suitLabel ? `suit/${suit.dataset.suit}` : "", suitLabel);
	const numberLabel = getHorseNumber(card);
	const rawNumber = Number(({ A: 1, J: 11, Q: 12, K: 13 })[numberLabel] || numberLabel);
	const color = suit.dataset.suit === "heart" || suit.dataset.suit === "diamond" ? "r" : "b";
	updateHorseImage(number, Number.isInteger(rawNumber) && rawNumber >= 1 && rawNumber <= 13 ? `number/${color}${rawNumber}` : "", numberLabel);
	name2.dataset.decadeHorse = "1";
	card.dataset.decadeHorse = "1";
}

// 官方 LayoutEquipCards 将额外武器放在防具行，UUt 隐藏被替换的废除防具。
// 其他扩展产生的重复栏位按数量增加行，避免同类装备叠在同一格。
function updateExpandedEquipLayout(player, cards, layout, loneAttackHorse, wrapper) {
	const equips = player.node.equips;
	const counts = [0, 1, 1, 1, 1, 1];
	for (let slot = 1; slot <= 5; slot++) {
		counts[slot] = Math.max(1 + (Number(player.expandedSlots?.[`equip${slot}`]) || 0), cards.filter(card => Number(card.dataset.equipSlot) === slot && isLayoutEquipCard(card)).length);
	}
	const expanded = counts.some(count => count > 1);
	const replaceArmor = counts[1] > 1 && (Number(player.disabledSlots?.equip2) || 0) >= 1 + (Number(player.expandedSlots?.equip2) || 0);
	const positions = {};
	let row = 1;
	for (const group of layout === "combined" || loneAttackHorse ? [[1], [2], [3, 4], [5]] : [[1], [2], [3], [4, 5]]) {
		if (group[0] === 2 && replaceArmor) continue;
		for (const slot of group) positions[slot] = row;
		row += Math.max(...group.map(slot => counts[slot]));
	}
	const setPosition = (node, slot, index, replaced = false) => {
		if (replaced) node.dataset.equipReplaced = "true";
		else delete node.dataset.equipReplaced;
		if (expanded && positions[slot]) {
			const horseRow = loneAttackHorse && slot === 4 ? positions[3] : positions[slot];
			node.style.setProperty("--equip-row", String(horseRow + index));
			node.style.setProperty("--equip-column", layout === "combined" && (slot === 3 || slot === 4) ? slot === 4 && !loneAttackHorse ? "2" : "1" : "1 / -1");
		} else {
			node.style.removeProperty("--equip-row");
			node.style.removeProperty("--equip-column");
		}
	};
	const indices = {};
	for (const card of cards) {
		const slot = Number(card.dataset.equipSlot);
		const index = indices[slot] || 0;
		setPosition(card, slot, index, replaceArmor && slot === 2 && card.classList.contains("feichu") && !card.extraEquip);
		if (isLayoutEquipCard(card)) indices[slot] = index + 1;
	}
	for (const host of [equips, wrapper, wrapper?.back || wrapper?.querySelector(".equips-back")]) {
		if (!host) continue;
		if (expanded) {
			host.dataset.expandedEquip = "true";
			host.style.setProperty("--equip-rows", String(Math.max(4, row - 1)));
		} else {
			delete host.dataset.expandedEquip;
			host.style.removeProperty("--equip-rows");
		}
	}
	const back = wrapper?.back || wrapper?.querySelector(".equips-back");
	if (!back) return;
	for (let slot = 1; slot <= 5; slot++) {
		const backgrounds = Array.from(back.children).filter(node => Number(node.dataset.type) === slot - 1);
		while (backgrounds.length < counts[slot]) {
			const node = back.ownerDocument.createElement("div");
			node.dataset.type = String(slot - 1);
			back.appendChild(node);
			backgrounds.push(node);
		}
		backgrounds.forEach((node, index) => {
			if (index >= counts[slot]) node.remove();
			else setPosition(node, slot, index, replaceArmor && slot === 2);
		});
	}
}

function refreshEquipLayout(player) {
	const equips = player?.node?.equips;
	if (!equips?.children) return "normal";
	const activeSlots = new Set();
	for (const card of Array.from(equips.children)) {
		const slot = getEquipSlot(card);
		if (slot) {
			card.dataset.equipSlot = String(slot);
			updateEquipPresentation(card, card[card.cardSymbol] || card);
			updateFeichuPresentation(card, slot);
		} else {
			delete card.dataset.equipSlot;
		}
		if (slot && isLayoutEquipCard(card)) activeSlots.add(slot);
	}
	const hasTreasure = activeSlots.has(5);
	const hasAttackHorse = activeSlots.has(4);
	const loneAttackHorse = hasAttackHorse && !activeSlots.has(3) && Array.from(equips.children).some(card =>
		card.dataset.equipSlot === "4" && isLayoutEquipCard(card) && !card.classList.contains("feichu") && !card.classList.contains("emptyequip") && !card.extraEquip
	);
	const layout = hasTreasure ? "combined" : hasAttackHorse ? "attack" : "normal";
	for (const card of Array.from(equips.children)) {
		updateCompactHorsePresentation(card, Number(card.dataset.equipSlot || 0), layout);
	}
	equips.dataset.equipLayout = layout;
	equips.dataset.loneAttackHorse = String(loneAttackHorse);
	const wrapper = equips.parentElement?.classList?.contains("equips-wrap") ? equips.parentElement : null;
	if (wrapper) {
		wrapper.dataset.equipLayout = layout;
		wrapper.dataset.loneAttackHorse = String(loneAttackHorse);
	}
	updateExpandedEquipLayout(player, Array.from(equips.children), layout, loneAttackHorse, wrapper);
	return layout;
}

export { refreshEquipLayout, rememberEquipPresentation, restoreEquipPresentation, updateEquipPresentation };
