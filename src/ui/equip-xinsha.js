import { get, lib } from "noname";

// EquipArea.YjcmLayout / EquipCardUi (6.4.5)，见 verification/yjcm-equip-layout-source.json。
const slotRows = { 5: 1, 1: 2, 2: 3, 3: 4, 4: 5 };

function updateXinshaExtraEquipPresentation(card) {
	const label = card?.node?.name2;
	if (!label) return;
	if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && card.extraEquip) {
		// 本体占位保留“来源技能＋装备名”；不把技能视为效果改造成实体装备。
		if (card.dataset.xinshaExtraEquip !== "1") card.dataset.xinshaExtraEquip = "1";
		label.dataset.xinshaExtraEquip = "1";
		label.style.setProperty("--xinsha-extra-equip-size", String(Math.min(20, 120 / Math.max(1, Array.from(label.textContent).length))));
	} else {
		delete card.dataset.xinshaExtraEquip;
		delete label.dataset.xinshaExtraEquip;
		label.style.removeProperty("--xinsha-extra-equip-size");
	}
}

function updateXinshaEquipPresentation(card, virtualCard, translated) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") return false;
	// 直接标记装备卡，避免 CSS :has(...[data-*]) 对无关属性变更触发全场样式失效。
	if (card.dataset.xinshaEquip !== "1") card.dataset.xinshaEquip = "1";
	const label = card.node.name2;
	if (!label.dataset.xinshaEquip) label.replaceChildren();
	label.dataset.xinshaEquip = "1";
	for (const className of ["decade-equip-type-icon", "decade-equip-range", "decade-equip-name", "decade-equip-number", "decade-equip-suit"]) {
		if (label.querySelector(`.${className}`)) continue;
		const node = document.createElement(["decade-equip-type-icon", "decade-equip-number", "decade-equip-suit"].includes(className) ? "img" : "span");
		node.className = className;
		if (node.tagName === "IMG") node.draggable = false;
		label.appendChild(node);
	}
	const path = window.decadeUIPath || `${lib.assetURL || ""}extension/${window.decadeUIName || "十周年UI"}/`;
	const slot = Number(get.equipNum(virtualCard)) || Number(get.equipNum(card)) || 5;
	const image = (className, file, alt) => {
		const node = label.querySelector(`.${className}`);
		node.hidden = !file;
		if (file) {
			const src = `${path}image/ui/equip/xinsha/${file}.png`;
			if (node.getAttribute("src") !== src) node.setAttribute("src", src);
		} else node.removeAttribute("src");
		node.alt = alt;
	};
	// 类型小图来自 equip_card 原条；马的 +/- 距离单独拼装，不套 OL 的半栏控件。
	image("decade-equip-type-icon", `type${Math.min(slot, 5)}`, ["", "武器", "防具", "防御马", "进攻马", "宝物"][slot] || "装备");
	const suit = card.suit || get.suit(card, false);
	image("decade-equip-suit", ({ heart: "cflag0", diamond: "cflag1", spade: "cflag2", club: "cflag3" })[suit], ({ heart: "♥", diamond: "♦", spade: "♠", club: "♣" })[suit] || "");
	const rawNumber = card.number ?? get.number(card, false);
	const number = Number(({ A: 1, J: 11, Q: 12, K: 13 })[rawNumber] || rawNumber);
	const validNumber = Number.isInteger(number) && number >= 1 && number <= 13;
	const red = suit === "heart" || suit === "diamond";
	image("decade-equip-number", validNumber ? `${red ? "red" : "black"}${number}` : null, validNumber ? get.strNumber(number) : "");
	const info = get.info(virtualCard, false);
	const range = slot === 1 ? 1 - (Number(info?.distance?.attackFrom) || 0) : slot === 3 ? "+1" : slot === 4 ? "−1" : "";
	label.querySelector(".decade-equip-range").textContent = String(range);
	const name = label.querySelector(".decade-equip-name");
	const fullName = get.translation(virtualCard.name);
	name.textContent = ({ 八卦阵: "八卦阵", 白银狮子: "白银狮" })[fullName] || translated.replace(/(?:\s|&nbsp;)+[+−-]?\d+\s*$/, "").replace(/&nbsp;/g, " ");
	// 常规原图为预绘字；扩展的长牌名按同一可用区域收小，避免截掉最后一个字。
	name.style.setProperty("--xinsha-equip-name-size", String(Math.min(20, (slot === 2 || slot === 5 ? 76 : 62) / Math.max(1, Array.from(name.textContent).length))));
	name.title = fullName;
	return true;
}

function updateXinshaEquipLayout(player, cards, wrapper) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") return false;
	const equips = player.node.equips;
	// 官方只提供额外武器（防具位）；其余扩展装备栏保留无名杀语义，增加独立行。
	const counts = {};
	for (const card of cards) {
		const slot = Number(card.dataset.equipSlot);
		if (slotRows[slot] && (!card.classList.contains("hidden") || card.classList.contains("feichu"))) counts[slot] = (counts[slot] || 0) + 1;
	}
	const rows = {}, indices = {};
	const replaceArmor = counts[1] > 1 && (Number(player.disabledSlots?.equip2) || 0) >= 1 + (Number(player.expandedSlots?.equip2) || 0);
	let next = 1;
	for (const slot of [5, 1, 2, 3, 4]) {
		if (slot === 2 && replaceArmor) { rows[slot] = rows[1] + 1; continue; }
		rows[slot] = next;
		next += Math.max(1, counts[slot] || 0, 1 + (Number(player.expandedSlots?.[`equip${slot}`]) || 0));
	}
	for (const card of cards) {
		const slot = Number(card.dataset.equipSlot);
		const index = indices[slot] || 0;
		const visible = !card.classList.contains("hidden") || card.classList.contains("feichu");
		card.style.setProperty("--equip-row", String((rows[slot] || next) + index));
		card.style.setProperty("--equip-column", "1 / -1");
		if (replaceArmor && slot === 2 && card.classList.contains("feichu") && !card.extraEquip) card.dataset.equipReplaced = "true";
		else delete card.dataset.equipReplaced;
		if (visible) indices[slot] = index + 1;
	}
	for (const host of [equips, wrapper, wrapper?.back]) {
		if (!host) continue;
		host.dataset.equipLayout = "xinsha";
		delete host.dataset.loneAttackHorse;
		delete host.dataset.expandedEquip;
		host.style.setProperty("--equip-rows", String(Math.max(5, next - 1)));
	}
	if (wrapper?.back) for (const background of wrapper.back.children) {
		background.style.setProperty("--equip-row", String(rows[Number(background.dataset.type) + 1] || next));
	}
	return true;
}

export { updateXinshaEquipPresentation, updateXinshaExtraEquipPresentation, updateXinshaEquipLayout };
