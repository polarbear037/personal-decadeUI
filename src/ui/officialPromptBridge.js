import { lib, game, ui, get } from "noname";
import { officialSkillPrompts } from "./officialSkillPromptData.js";
import { officialPromptText } from "./officialPromptText.js";

let entriesByName;

function promptPlain(value) {
	if (typeof value !== "string") return "";
	const holder = document.createElement("div");
	holder.innerHTML = value.replace(/<color=(#[\da-f]{6})>/gi, '<font color="$1">').replace(/<\/color>/gi, "</font>").replace(/<br\s*\/?\s*>/gi, "\n");
	return holder.textContent.trim();
}

function normalizedDescription(value) {
	return promptPlain(value).replace(/[\s\p{P}\p{S}]/gu, "");
}

function descriptionSimilarity(left, right) {
	left = normalizedDescription(left);
	right = normalizedDescription(right);
	if (!left || !right) return 0;
	if (left === right) return 1;
	const pairs = text => new Set(Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2)));
	const a = pairs(left), b = pairs(right);
	return 2 * [...a].filter(pair => b.has(pair)).length / (a.size + b.size || 1);
}

function findOfficialPromptEntry(id, name, player, card = false) {
	if (!entriesByName) {
		entriesByName = new Map();
		for (const entry of officialSkillPrompts) {
			const list = entriesByName.get(entry.name) || [];
			list.push(entry);
			entriesByName.set(entry.name, list);
		}
	}
	const candidates = (entriesByName.get(name) || []).filter(entry => card ? entry.type !== 2 : entry.type === 2);
	if (!candidates.length) return null;
	const base = String(id || "").replace(/_(?:backup|cost)$/, "");
	const sourceSkill = card ? base : get.sourceSkillFor?.(base) || base;
	const key = sourceSkill.replace(/_/g, "").toLowerCase();
	const description = card ? lib.translate?.[base + "_info"] : get.skillInfoTranslation?.(sourceSkill, player) || lib.translate?.[sourceSkill + "_info"];
	const exact = candidates.filter(entry => String(entry.className || "").toLowerCase() === key);
	if (exact.length === 1) return exact[0];
	const pool = exact.length ? exact : candidates;
	const ranked = pool.map(entry => ({ entry, score: descriptionSimilarity(description, entry.description) })).sort((a, b) => b.score - a.score);
	if (ranked[0].score >= 0.74 && (!ranked[1] || ranked[0].score - ranked[1].score >= 0.08)) return ranked[0].entry;
	// 同名且提示相同的版本无需猜版本；不同技能效果绝不只按中文名称套用。
	const same = pool.every(entry => JSON.stringify(entry.prompts) === JSON.stringify(pool[0].prompts));
	return (exact.length && same || card && pool.length === 1 || same && ranked[0].score >= 0.74) ? pool[0] : null;
}

function formatOfficialTemplate(template, values) {
	if (!template || [...template.matchAll(/\{(\w+)\}/g)].some(match => values[match[1]] == null)) return "";
	const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	return template.replace(/\{(\w+)\}/g, (_, key) => escape(values[key])).replace(/<color=(#[\da-f]{6})>/gi, '<font color="$1">').replace(/<\/color>/gi, "</font>");
}

function promptPlayerName(player) {
	return player ? promptPlain(get.translation(player.name || player)) : "";
}

function contextForPrompt(event) {
	const seen = new Set();
	for (let current = event, depth = 0; current && depth < 16 && !seen.has(current); depth++) {
		seen.add(current);
		const trigger = current._trigger || current.getTrigger?.();
		if (trigger?.player || trigger?.target) return trigger;
		const parent = current.getParent?.() || current.parent;
		if (parent === current) break;
		current = parent;
	}
	return null;
}

function chooseTemplateBranch(entry, field, event, cards, targets) {
	const template = entry.prompts[field];
	if (!template) return "";
	if (field === "ActiveTip" && ["Sha", "HuoSha", "LeiSha", "BingSha"].includes(entry.className)) return template.split(";")[targets?.[1] > 1 ? 1 : 0] || "";
	if (field === "ActiveTip" && entry.className === "Tao") return template.split("|")[event.type === "dying" && event.dying ? event.dying === event.player ? 2 : 1 : 0] || "";
	if (field === "ActiveTip" && entry.className === "WuXieKeJi") return template.split("|")[(event.info_map?.state ?? event.getParent?.()?._info_map?.state ?? 1) > 0 ? 0 : 1] || "";
	if (field === "ActiveTip" && entry.activeBranch === "cards-complete" && event.type === "phase") return template.split(";")[cards && (ui.selected?.cards?.length || 0) >= cards[0] ? 1 : 0] || "";
	// 分隔符是官方代码中的分支，不是应该展示给玩家的标点。
	return /[;|]/.test(template) ? "" : template;
}

function getOfficialScenePrompt(event, { skill, name, card, cardName, cards, targets, generic }) {
	const result = (entry, field, values = {}, text) => {
		const template = text ?? chooseTemplateBranch(entry, field, event, cards, targets);
		const richMain = formatOfficialTemplate(template, values);
		return richMain ? { richMain, entryId: entry.id, field } : null;
	};
	const trigger = contextForPrompt(event);
	const source = event.respondTo?.[0] || event.source || trigger?.player;
	const target = event.target || event.targets?.[0] || ui.selected?.targets?.[0] || trigger?.target;
	const values = { Source: source ? promptPlayerName(source) : null, Target: target ? promptPlayerName(target) : null };
	if (event.type === "wuxie") {
		const info = event.info_map || event.getParent?.()?._info_map;
		const original = info?._source || info;
		const entry = findOfficialPromptEntry("wuxie", "无懈可击", event.player, true);
		if (entry && original?.card) {
			const affected = original.isJudge ? [original.target] : original.multitarget ? original.targets : [original.target];
			const affectedNames = affected?.filter(Boolean).map(player => player === game.me ? "你" : promptPlayerName(player)).join("、");
			if (affectedNames) return result(entry, "ActiveTip", { 0: promptPlain(get.translation(original.card.viewAs || original.card.name || original.card)), 1: affectedNames });
		}
		return null;
	}
	if (event.type === "dying" && event.dying && generic) {
		const entry = findOfficialPromptEntry("tao", "桃", event.player, true);
		if (entry) return result(entry, "ActiveTip", { Source: promptPlayerName(event.dying), Count: Math.max(1, 1 - event.dying.hp) });
	}
	if (event.respondTo?.[1] && generic && !event.skill) {
		const attack = event.respondTo[1];
		const entry = findOfficialPromptEntry(attack.name, promptPlain(get.translation(attack.name || attack)), event.player, true);
		if (entry) {
			if (entry.className === "JieDaoShaRen") return source && (event.sourcex || target) ? result(entry, "DefensiveTip", { 0: promptPlayerName(event.sourcex || target), 1: promptPlayerName(source) }) : null;
			const required = cards?.[1] > 0 ? cards[1] : 1;
			// 双杀/双闪的数量由原生 prompt 决定，不能套用静态的一张牌文案。
			if (required === 1) return result(entry, "DefensiveTip", values);
		}
	}
	if (event.type === "phase" && event.name === "chooseToUse" && card && !event.skill && generic) {
		const entry = findOfficialPromptEntry(card.name, cardName, event.player, true);
		if (entry) {
			if (entry.className === "TieSuoLianHuan") {
				const key = targets?.[1] === 0 ? "TIESUOLIANHUAN_ActiveTips2" : targets?.[0] > 0 ? "TIESUOLIANHUAN_ActiveTips4" : "TIESUOLIANHUAN_ActiveTips1";
				return result(entry, "ActiveTip", {}, officialPromptText[key]);
			}
			let numeric;
			if (entry.className === "WuGuFengDeng") numeric = game.players?.length;
			else if (["JueDou", "ShanDian"].includes(entry.className)) numeric = entry.name;
			else if (lib.card?.[card.name]?.type === "equip") numeric = "";
			return result(entry, "ActiveTip", { ...values, TargetCount: targets?.[1] > 0 ? targets[1] : 1, 0: numeric });
		}
	}
	if (!skill || !name || !generic) return null;
	const entry = findOfficialPromptEntry(skill, name, event.player);
	if (!entry) return null;
	if (event.name === "chooseBool") {
		const field = entry.prompts.AskTip ? "AskTip" : /^是否/.test(promptPlain(entry.prompts.ActiveTip)) ? "ActiveTip" : "";
		return field ? result(entry, field, values) : null;
	}
	if (["chooseToUse", "chooseCardTarget", "chooseCard", "chooseTarget"].includes(event.name)) {
		const template = chooseTemplateBranch(entry, "ActiveTip", event, cards, targets);
		if (event.name === "chooseTarget" && /(?:手牌|装备牌|弃置.*张牌)/.test(promptPlain(template))) return null;
		return result(entry, "ActiveTip", values, template);
	}
	return null;
}

export { findOfficialPromptEntry, formatOfficialTemplate, getOfficialScenePrompt };
