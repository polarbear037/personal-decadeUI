import { lib, game, ui, get, _status } from "noname";
import { officialPromptText } from "./officialPromptText.js";
import { getOfficialScenePrompt } from "./officialPromptBridge.js";

const officialColors = { player: "#E4A840", skill: "#FFD800", card: "#FFD800", number: "#FFE073", discard: "#FF5050", gain: "#91F47E" };

function plainPrompt(value) {
	if (typeof value !== "string") return "";
	const holder = document.createElement("div");
	holder.innerHTML = value.replace(/<color=(#[\da-f]{6})>/gi, '<font color="$1">').replace(/<\/color>/gi, "</font>").replace(/<br\s*\/?\s*>/gi, "\n");
	return holder.textContent.trim();
}

function officialText(key, values = {}) {
	const template = officialPromptText[key];
	if (typeof template !== "string") return "";
	// 未提供所有参数时不展示模板占位符，也不猜测参数的业务含义。
	if ([...template.matchAll(/\{(\w+)\}/g)].some(match => values[match[1]] == null)) return "";
	return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key]));
}

function skillNameForPrompt(skill, player) {
	if (!skill) return "";
	const base = skill.replace(/_(?:backup|cost)$/, "");
	// 将灵使用全局规则事件，没有普通技能翻译；通用弹窗和提示共用真实技能名。
	if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && lib.skill?.[base]?.jiang0JianglingRule) {
		const id = /^jiang0_rule_(\d+)$/.exec(base)?.[1];
		const row = id && game.jiang0Skills?.context?.row?.(player, Number(id));
		if (row?.SkillName) return plainPrompt(row.SkillName);
	}
	const source = get.sourceSkillFor?.(base) || (lib.translate?.[base] ? base : skill);
	const name = plainPrompt(get.skillTranslation?.(source, player) || lib.translate?.[source] || "");
	return name === source && !lib.translate?.[source] && !/[\u3400-\u9fff]/.test(name) ? "" : name;
}

function selectionRange(value, ...args) {
	if (value == null) return null;
	try {
		// get.select(undefined) 会默认返回 [1, 1]，不能把它当成真实的选取要求。
		const raw = typeof value === "function" ? value(...args) : value;
		if (typeof raw === "number" && Number.isFinite(raw)) return [raw, raw];
		return Array.isArray(raw) && raw.length === 2 && raw.every(Number.isFinite) ? raw : null;
	} catch (error) {
		return null;
	}
}

function rangeText(range) {
	if (!range) return "";
	const [min, max] = range;
	return max === -1 ? (min > 0 ? `至少${min}` : "任意数量") : min === max ? `${max}` : `${min}至${max}`;
}

function cardForPrompt(event) {
	// 复用本体对虚拟牌、转化牌的判定，不能把作为材料的闪当成正在使用的牌。
	if (event === _status.event && typeof get.card === "function") {
		const card = get.card();
		if (card?.name) return card;
	}
	if (event.skill) {
		const viewAs = lib.skill?.[event.skill]?.viewAs;
		if (viewAs && typeof viewAs === "object") return viewAs;
		if (typeof viewAs === "function" && ui.selected?.cards?.length) {
			try { return viewAs(ui.selected.cards, event.player); } catch (error) { return null; }
		}
		return null;
	}
	return ui.selected?.cards?.length === 1 ? ui.selected.cards[0] : ["chooseToUse", "chooseToRespond"].includes(event.name) ? null : event.card;
}

function targetRangeForPrompt(event, card, skillInfo) {
	const targetChoice = ["chooseTarget", "chooseCardTarget"].includes(event.name);
	if (!targetChoice && event.name !== "chooseToUse") return null;
	if (!targetChoice) {
		if (card && lib.card?.[card.name]?.notarget) return [0, 0];
		if (!card && !event.skill) return null;
	}
	const value = event.selectTarget ?? skillInfo?.selectTarget ?? (card && lib.card?.[card.name]?.selectTarget);
	return selectionRange(value, card, event.player);
}

function playerNameForPrompt(player) {
	if (!player) return "";
	return plainPrompt(get.translation(player.name || player));
}

function wuxiePrompt(event) {
	const info = event.info_map || event.getParent?.()?._info_map;
	if (!info) return "";
	const source = info._source || info;
	const card = plainPrompt(get.translation(source.card?.viewAs || source.card?.name || source.card));
	const state = (info.state ?? 1) > 0 ? "生效" : "失效";
	if (source.isJudge) return `${source.target === game.me ? "你的" : playerNameForPrompt(source.target) + "的"}${card}即将${state}，是否使用【无懈可击】？`;
	const targets = source.multitarget && source.targets?.length ? source.targets : source.target ? [source.target] : [];
	const targetNames = targets.map(target => target === source.player ? "自己" : playerNameForPrompt(target)).join("、");
	return `${playerNameForPrompt(source.player)}${targetNames ? "对" + targetNames : ""}使用的${card}即将${state}，是否使用【无懈可击】？`;
}

function buildOfficialPrompt(event, main = "", skill = "", detail = "") {
	main = plainPrompt(main);
	const name = skillNameForPrompt(skill, event.player);
	const selected = ui.selected || {};
	const card = cardForPrompt(event);
	const cardName = plainPrompt(card && get.translation(get.name?.(card) || card.name || card));
	const isPhase = event.name === "chooseToUse" && event.type === "phase";
	const skillInfo = lib.skill?.[event.skill];
	const cards = selectionRange(event.selectCard ?? skillInfo?.selectCard);
	const targets = targetRangeForPrompt(event, card, skillInfo);
	// 本体在未设置 prompt 时自行创建默认 dialog；该标题不能盖过实时卡牌提示。
	const nativePhasePrompt = isPhase && !event.skill && event.prompt == null;
	const isGeneric = nativePhasePrompt || !main || main === officialText("DealCard_Opt_Msg") || main === name || (name && main.replace(/[【】“”‘’《》？?：:\s]/g, "") === `是否发动${name}`) || /^(?:请选择要使用的(?:卡)?牌|请选择一张卡牌|请选择一张牌|请选择目标|请选择一名角色|选择目标)$/.test(main);
	const official = getOfficialScenePrompt(event, { skill, name, card, cardName, cards, targets, generic: !!isGeneric });
	if (official) {
		main = plainPrompt(official.richMain);
	} else if (event.type === "wuxie") {
		main = wuxiePrompt(event) || (/是否.*无懈可击/.test(main) ? main : `${main}${main ? " " : ""}是否使用【无懈可击】？`);
	} else if (isPhase && !event.skill && isGeneric) {
		main = cardName ? `使用【${cardName}】${targets?.[1] > 0 ? `，请选择${rangeText(targets)}名角色` : ""}` : officialText("DealCard_Opt_Msg");
	} else if (!main || (event.skill && isGeneric && event.name === "chooseToUse")) {
		switch (event.name) {
			case "chooseBool": main = name ? `是否发动“${name}”？` : ""; break;
			case "chooseToDiscard": main = officialText("Game_SelfSeatUI_DiscardRequest", { 0: officialText("MOVE_CARD_DISCARD") || "弃置", 1: rangeText(cards) || 1 }); break;
			case "chooseCard": main = cards ? `请选择${rangeText(cards)}张${event.position === "h" ? "手牌" : event.position === "e" ? "装备牌" : "牌"}` : officialText("Select_Card_Tips"); break;
			case "chooseTarget": main = `请选择${rangeText(targets) || 1}名角色`; break;
			case "chooseCardTarget": main = `请选择${rangeText(cards) || 1}张牌和${rangeText(targets) || 1}名角色`; break;
			case "chooseControl": main = officialText("Select_Opt_Msg"); break;
			case "chooseButton": main = officialText("Select_Opt_Msg"); break;
			case "chooseToCompare":
			case "chooseToCompareMultiple": main = officialText("PinDian_Operate_Tips", { Source: playerNameForPrompt(event.player), SpellName: name }); break;
			case "chooseToRespond": {
				const source = event.respondTo?.[1];
				main = `请打出${rangeText(cards) || 1}张牌${source ? "响应【" + plainPrompt(get.translation(source.name || source)) + "】" : ""}`;
				break;
			}
			case "chooseToUse":
				if (event.type === "dying" && event.dying) main = `${playerNameForPrompt(event.dying)}濒死，需要${Math.max(1, 1 - event.dying.hp)}张【桃】，是否帮助？`;
				else if (name) {
					const selectingTargets = targets && targets[1] !== 0 && (!cards || cards[1] === 0 || (selected.cards?.length || 0) >= cards[0]);
					main = `发动“${name}”${selectingTargets ? `，请选择${rangeText(targets)}名角色` : cards && cards[1] !== 0 ? `，请选择${rangeText(cards) || 1}张牌` : ""}`;
				}
				else main = cardName ? `请使用【${cardName}】` : "请选择要使用的牌";
				break;
			default: main = name ? `是否发动“${name}”？` : officialText("Select_Card_Tips");
		}
	}
	if (name && (!main || main === name)) main = `是否发动“${name}”？`;
	if (!main) return null;
	let detailText = plainPrompt(detail);
	const baseSkill = skill?.replace(/_(?:backup|cost)$/, "");
	const skillDescription = baseSkill && (get.skillInfoTranslation?.(baseSkill, event.player) || lib.translate?.[baseSkill + "_info"]);
	// 保持“优化提示”原有的短提示用途；完整技能说明不重复挤到牌区上方。
	if (detailText && detailText.replace(/\s/g, "") === plainPrompt(skillDescription).replace(/\s/g, "")) detailText = "";
	return { main, detail: detailText, skill: name, official };
}

function semanticTokens(event, skill) {
	const tokens = new Map();
	const add = (text, type) => { text = plainPrompt(text); if (text?.length > 1 && !tokens.has(text)) tokens.set(text, type); };
	add(skill, "skill");
	for (const player of [...(game.players || []), ...(game.dead || []), event.player, event.source, event.dying, ...(event.targets || [])]) if (player) add(playerNameForPrompt(player), "player");
	for (const id of Object.keys(lib.card || {})) add(get.translation(id), "card");
	return [...tokens.entries()].sort((a, b) => b[0].length - a[0].length);
}

function appendSemanticText(parent, text, tokens, inheritedColor = "") {
	// 按最长名称优先着色；不用 innerHTML 拼接玩家名或第三方扩展文本。
	let index = 0;
	while (index < text.length) {
		const rest = text.slice(index);
		const named = tokens.find(([value]) => rest.startsWith(value));
		const number = rest.match(/^\d+(?:[至/~]\d+)?/);
		const card = rest.match(/^[【“](杀|闪|桃|酒)[】”]/) || (inheritedColor && rest.match(/^(杀|闪|桃|酒)$/));
		const action = rest.match(/^(弃置|获得|回复)/);
		const value = named?.[0] || number?.[0] || card?.[0] || action?.[0] || text[index];
		const type = named?.[1] || (number ? "number" : card ? "card" : action ? action[0] === "弃置" ? "discard" : "gain" : "");
		const color = inheritedColor || officialColors[type] || "";
		const previous = parent.lastElementChild;
		if (previous && previous.dataset.type === type && previous.dataset.color === color) previous.textContent += value;
		else {
			const span = document.createElement("span");
			span.textContent = value;
			span.dataset.type = type;
			span.dataset.color = color;
			if (color) span.style.color = color;
			parent.appendChild(span);
		}
		index += value.length;
	}
}

function renderOfficialPrompt(tip, prompt, event, richMain = "") {
	const tokens = semanticTokens(event, prompt.skill);
	tip.replaceChildren();
	if (prompt.official) {
		richMain = prompt.official.richMain;
		tip.dataset.officialSkillId = prompt.official.entryId;
		tip.dataset.officialPromptField = prompt.official.field;
	} else {
		delete tip.dataset.officialSkillId;
		delete tip.dataset.officialPromptField;
	}
	tip.dataset.officialPromptMode = ["chooseBool", "chooseControl"].includes(event.name) ? "choice" : "card";
	const appendLine = (text, className, rich = false) => {
		if (!text) return;
		const line = document.createElement("span");
		line.className = className;
		if (rich && plainPrompt(text) === prompt.main) {
			const holder = document.createElement("div");
			holder.innerHTML = text;
			const walk = (node, color = "") => {
				if (node.nodeType === 3) appendSemanticText(line, node.textContent, tokens, color);
				else if (node.nodeName === "BR") line.appendChild(document.createElement("br"));
				else if (!["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(node.nodeName)) {
					const own = node.getAttribute?.("color") || node.style?.color;
					const nextColor = own && CSS.supports("color", own) ? own : color;
					for (const child of node.childNodes) walk(child, nextColor);
				}
			};
			for (const node of holder.childNodes) walk(node);
		} else appendSemanticText(line, text, tokens);
		tip.appendChild(line);
	};
	const useRichMain = !!richMain && plainPrompt(richMain) === prompt.main;
	appendLine(useRichMain ? richMain : prompt.main, "decade-official-main", useRichMain);
	if (prompt.detail && prompt.detail !== prompt.main) appendLine(prompt.detail, "decade-official-detail");
	tip.strokeText?.();
}

export { officialColors, officialText, plainPrompt, skillNameForPrompt, selectionRange, cardForPrompt, targetRangeForPrompt, buildOfficialPrompt, renderOfficialPrompt };
