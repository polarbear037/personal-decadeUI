import { lib, game, ui, get } from "noname";
import { xinshaPromptEntries, xinshaPhasePrompt } from "./xinshaPromptData.js";
import { plainPrompt, skillNameForPrompt, selectionRange, cardForPrompt } from "./officialPrompt.js";
import { getXinshaPlayerCardPrompt } from "./xinshaPlayerCardPrompt.js";

const xinshaPromptColors = { skill: "#A3F030", player: "#FFE100", card: "#FFD979", phase: "#FFCF3B" };
// spell 表中的标准卡牌 ID；同时校验中文名，避免给自定义同名牌套错版本。
const standardCards = { sha: 1, shan: 2, tao: 3, shunshou: 4, guohe: 5, wugu: 6, wuzhong: 7, juedou: 8, nanman: 9, wanjian: 10, shandian: 11, taoyuan: 12, wuxie: 13, jiedao: 14, lebu: 15, qinglong: 26, jiu: 82, huogong: 83, bingliang: 84, tiesuo: 85 };
const byName = new Map();
for (const entry of xinshaPromptEntries) {
	if (!byName.has(entry.name)) byName.set(entry.name, []);
	byName.get(entry.name).push(entry);
}

function escapeText(value) {
	return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function colored(value, type) {
	return `<font color="${xinshaPromptColors[type]}">${escapeText(value)}</font>`;
}

function normalizeDescription(value) {
	return plainPrompt(value).replace(/[\s\p{P}\p{S}]/gu, "");
}

function similarity(a, b) {
	a = normalizeDescription(a);
	b = normalizeDescription(b);
	if (!a || !b) return 0;
	if (a === b) return 1;
	const pairs = text => new Set(Array.from({ length: text.length - 1 }, (_, i) => text.slice(i, i + 2)));
	const left = pairs(a), right = pairs(b);
	return 2 * [...left].filter(pair => right.has(pair)).length / (left.size + right.size || 1);
}

function findXinshaPromptEntry(id, name, player, card = false) {
	const candidates = (byName.get(name) || []).filter(entry => card ? entry.type !== 2 : entry.type === 2);
	if (!candidates.length) return null;
	const base = String(id || "").replace(/_(?:backup|cost)$/, "");
	if (card && standardCards[base]) return candidates.find(entry => entry.id === standardCards[base]) || null;
	const source = card ? base : get.sourceSkillFor?.(base) || base;
	const description = card ? lib.translate?.[base + "_info"] : get.skillInfoTranslation?.(source, player) || lib.translate?.[source + "_info"];
	const exact = candidates.filter(entry => entry.className && entry.className.toLowerCase() === source.replace(/_/g, "").toLowerCase());
	if (exact.length === 1) return exact[0];
	const ranked = (exact.length ? exact : candidates).map(entry => ({ entry, score: similarity(description, entry.description) })).sort((a, b) => b.score - a.score);
	const top = ranked[0];
	if (top.score >= 0.74) {
		const competing = ranked.filter(row => top.score - row.score < 0.08);
		if (competing.every(row => JSON.stringify(row.entry.prompts) === JSON.stringify(top.entry.prompts))) return top.entry;
	}
	// 基本牌/锦囊常有同名的空壳技能；只在有说明的正式条目提示完全一致时共用。
	const described = candidates.filter(entry => entry.description);
	if (card && described.length && described.every(entry => JSON.stringify(entry.prompts) === JSON.stringify(described[0].prompts))) return described[0];
	return null;
}

function formatXinshaTemplate(template, values) {
	if (!template || /[;|]/.test(template) || [...template.matchAll(/\{(\w+)\}/g)].some(match => values[match[1]] == null)) return "";
	// values 仅由本模块转义并着色，不能直接插入外部 HTML 或执行客户端代码。
	return template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
}

function promptContext(event) {
	const seen = new Set();
	for (let current = event, depth = 0; current && depth < 16 && !seen.has(current); depth++) {
		seen.add(current);
		const trigger = current._trigger || current.getTrigger?.();
		if (trigger?.player || trigger?.target) return trigger;
		current = current.getParent?.() || current.parent;
	}
	return null;
}

function xinshaSkillContext(skill, player) {
	const base = skill?.replace(/_(?:backup|cost)$/, "");
	const info = lib.skill?.[base];
	// 犟0的规则不加入技能面板，也没有lib.translate；读取当前出战将灵的真实技能编号。
	const ruleId = info?.jiang0JianglingRule && /^jiang0_rule_(\d+)$/.exec(base)?.[1];
	const row = ruleId && game.jiang0Skills?.context?.row?.(player, Number(ruleId));
	const record = row && xinshaPromptEntries.find(entry => entry.type === 2 && entry.id === row.GameSkillID && entry.name === row.SkillName);
	return {
		base, record,
		name: record?.name || skillNameForPrompt(skill, player),
		description: row?.SkillDesc || base && (get.skillInfoTranslation?.(base, player) || lib.translate?.[base + "_info"]),
	};
}

function xinshaRangeText(value) {
	if (!value) return "1";
	if (value[1] === -1 || value[1] === Infinity) return value[0] > 0 ? `至少${value[0]}` : "任意数量";
	return value[0] === value[1] ? String(value[1]) : `${value[0]}至${value[1]}`;
}

function xinshaCardName(card) {
	// 仅传逻辑牌名与属性；isCard会让get.translation附加虚拟牌并不存在的花色、点数。
	return card && plainPrompt(get.translation({ name: get.name?.(card) || card.name, nature: get.nature?.(card, false) || card.nature }));
}

function normalizeVirtualCardDetail(detail, card) {
	const text = plainPrompt(detail), translated = card && plainPrompt(get.translation(card));
	if (!text || !translated) return detail;
	for (const prefix of ["视为使用一张", "视为使用1张", "视为再使用一张", "视为再使用1张"]) {
		if (text.startsWith(prefix + translated)) return `${prefix}【${xinshaCardName(card)}】${text.slice(prefix.length + translated.length)}`;
	}
	return detail;
}

function xinshaSelectionRange(value, ...args) {
	try {
		const raw = typeof value === "function" ? value(...args) : value;
		if (Array.isArray(raw) && raw.length === 2 && Number.isFinite(raw[0]) && raw[1] === Infinity) return [raw[0], -1];
		return selectionRange(raw);
	} catch (error) { return null; }
}

function xinshaTargetRange(event, card, info) {
	const choice = ["chooseTarget", "chooseCardTarget"].includes(event.name);
	if (!choice && event.name !== "chooseToUse") return null;
	if (!choice && card && lib.card?.[card.name]?.notarget) return [0, 0];
	if (!choice && !card && !event.skill) return null;
	return xinshaSelectionRange(event.selectTarget ?? info?.selectTarget ?? (card && lib.card?.[card.name]?.selectTarget), card, event.player);
}

function templateFitsChoice(template, event, cards, targets) {
	const text = plainPrompt(template);
	if (!text) return false;
	// ActiveTip同时包含选牌、选人、选项等不同阶段，不能只因同名就覆盖当前操作。
	const picksCards = /(?:选择|选取|选出|弃置|弃掉|交出|将)(?:(?!角色|目标|名|人)[^，。；;]){0,40}(?:牌|【星】|“田”|“荣”)/.test(text);
	const picksTargets = /(?:选择|选取|指定|交给|转移给|令)[^，。；;]{0,40}(?:角色|目标|一人|其他人)/.test(text);
	if (event.name === "chooseTarget" && (!picksTargets || picksCards)) return false;
	if (["chooseCard", "chooseToDiscard"].includes(event.name) && (!picksCards || picksTargets)) return false;
	if (event.name === "chooseCardTarget" && ((cards?.[1] !== 0) !== picksCards || (targets?.[1] !== 0) !== picksTargets)) return false;
	if (event.name === "chooseToUse" && event.skill) {
		const needsCards = cards && cards[1] !== 0 && (ui.selected?.cards?.length || 0) < cards[0];
		if (needsCards && !picksCards || !needsCards && targets?.[1] > 0 && !picksTargets) return false;
	}
	const numbers = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
	const count = value => numbers[value] || Number(value);
	for (const [noun, selection] of [["(?:名|个)(?:目标)?(?:角色|目标)", targets], ["张(?:[^，。；;张名个]{0,12})牌", cards]]) {
		if (!selection || selection[1] === 0) continue;
		const match = text.match(new RegExp(`(?:选择|选取|弃置)(至多|至少)?([0-9]+|[一二两三四五六七八九十])(?:至([0-9]+|[一二两三四五六七八九十]))?${noun}`));
		if (!match) continue;
		const min = match[1] === "至多" ? 0 : count(match[2]);
		const max = match[1] === "至少" ? -1 : count(match[3] || match[2]);
		if (max !== selection[1] || min > selection[0]) return false;
	}
	return true;
}

function buildXinshaPrompt(event, main = "", skill = "", detail = "") {
	// check() 可早于 dialog 创建；此时 get.prompt2 的标题/说明仍带着本体的 ### 协议。
	if (typeof main === "string" && main.startsWith("###")) {
		const parts = main.slice(3).split("###");
		main = parts[0];
		detail ||= parts[1] || "";
	}
	main = plainPrompt(main);
	if (!skill && event.logSkill === "qinglong_skill") skill = event.logSkill;
	// 响应事件的祖先可能是对方的乱击、武圣等用牌技能；它不是本人选中的转化技能。
	if (!event.skill && (event.respondTo?.[1] || event.type === "dying")) skill = "";
	const { name, base, description, record: jianglingRecord } = xinshaSkillContext(skill, event.player);
	const skillInfo = lib.skill?.[event.skill] || lib.skill?.[base];
	const nativeSkillInstruction = typeof skillInfo?.prompt === "string" && main === plainPrompt(skillInfo.prompt) &&
		!/(?:只能|必须|不得|不能|不可|尚未|本轮|额外|仅限|点数|花色|距离|：|:)/.test(main);
	const parent = event.getParent?.() || event.parent;
	const parentUse = parent?.name === "chooseUseTarget" && ["chooseTarget", "chooseBool"].includes(event.name);
	const card = parentUse && parent.card || cardForPrompt(event);
	const cardName = card && plainPrompt(get.translation(get.name?.(card) || card.name || card));
	if (parentUse && card) {
		detail = normalizeVirtualCardDetail(detail, card);
		// 无目标牌另走chooseBool，不能只接管chooseTarget的默认标题。
		const targets = parent.targets2 || [];
		if (event.name === "chooseBool" && !parent.prompt && main === plainPrompt(`是否${targets.length ? "对" : ""}${get.translation(targets)}使用${get.translation(card)}?`)) {
			main = `是否${targets.length ? "对" + plainPrompt(get.translation(targets)) : ""}使用【${xinshaCardName(card)}】？`;
		}
	}
	const cards = xinshaSelectionRange(event.selectCard ?? lib.skill?.[event.skill]?.selectCard);
	const targets = xinshaTargetRange(event, card, lib.skill?.[event.skill]);
	const phase = event.name === "chooseToUse" && event.type === "phase" && !event.skill;
	const generic = !main || main === name || (name && main.replace(/[【】“”‘’《》？?：:\s]/g, "") === `是否发动${name}`) || main === plainPrompt(xinshaPhasePrompt) || (description && normalizeDescription(main) === normalizeDescription(description)) || /^(?:请选择要使用的(?:卡)?牌|请选择一张卡牌|请选择一张牌|请选择目标|请选择一名角色|选择目标)$/.test(main) || (phase && event.prompt == null);
	const trigger = promptContext(event);
	const playerName = player => plainPrompt(get.translation(player?.name || player || ""));
	const source = event.respondTo?.[0] || event.source || trigger?.player;
	const target = event.dying || event.target || event.targets?.[0] || ui.selected?.targets?.[0] || trigger?.target;
	const values = { Source: source ? colored(playerName(source), "player") : null, Target: target ? colored(playerName(target), "player") : null, Skill: name ? colored(`“${name}”`, "skill") : null };
	const nativeDyingPrompt = event.dying && main === `${plainPrompt(get.translation(event.dying))}濒死，是否帮助？`;
	const nativeResponsePrompt = /^(?:请使用一张闪响应杀|请(?:使用|打出)(?:一|1)张[^，。]+)$/.test(main);
	const nativeVirtualDetail = cardName && [`视为使用一张【${cardName}】`, `视为使用1张【${cardName}】`, `视为使用一张${cardName}`, `视为使用1张${cardName}`].includes(plainPrompt(detail));
	// chooseUseTarget的默认标题翻译整个VCard，会带上虚构花色（如杀【♦】）。只识别本体生成的原文。
	const nativeUseTarget = event.name === "chooseTarget" && cardName && parent?.name === "chooseUseTarget" && !parent.prompt && main === plainPrompt(`选择${get.translation(card)}的目标`);
	const virtualTarget = event.name === "chooseTarget" && cardName && (nativeUseTarget || nativeVirtualDetail &&
		(generic || /^(?:请选择(?:一|1)名角色|请选择(?:一|1)个目标)$/.test(main)));
	const qinglongResponse = event.name === "chooseToUse" && !event.skill && base === "qinglong_skill" &&
		(generic || main === plainPrompt(get.prompt("qinglong_skill", event.sourcex, event.player)));
	const damageAmounts = event.controls?.filter(control => control !== "cancel2");
	const jiedaoAmount = base === "spjiedao" && event.name === "chooseControl" && damageAmounts?.length &&
		damageAmounts.every((control, index) => control === get.cnNumber(index + 1, true)) &&
		(generic || main === plainPrompt(get.prompt("spjiedao", trigger?.player, event.player)));
	let richMain = "", entry = null, field = "";
	const use = (record, key, template = record?.prompts[key], extra = {}) => {
		const rich = formatXinshaTemplate(template, { ...values, ...extra });
		if (rich) { entry = record; field = key; richMain = rich; }
	};
	const playerCardPrompt = getXinshaPlayerCardPrompt(event, main);
	// MiYun.getActiveTip 根据四个操作阶段拆分 ActiveTip；不能将整串分支当作未知模板。
	const miyun = base === "dcmiyun" && xinshaPromptEntries.find(entry => entry.id === 2407 && entry.className === "MiYun");
	const miyunBranch = miyun && (
		event.name === "chooseTarget" && main === "密运：获得一名其他角色的一张牌，称为“安”" ? 0 :
		event.name === "chooseCardTarget" && main === "密运：将包括“安”在内的任意张手牌交给一名其他角色" ?
			ui.selected?.cards?.some(card => card.hasGaintag?.("dcmiyun_tag")) ? 1 : 3 : -1
	);
	if (playerCardPrompt) {
		richMain = playerCardPrompt;
		entry = miyun || null;
		field = "windowSnitch.initUI";
	} else if (jiedaoAmount) {
		// 本体的一、二是伤害加值；chooseControl不能遗漏spell[829]的数值选择提示。
		use(xinshaPromptEntries.find(entry => entry.id === 829 && entry.name === name), "ActiveTip");
	} else if (miyun && miyunBranch >= 0) {
		use(miyun, "ActiveTip", miyun.prompts.ActiveTip.split("|")[miyunBranch]);
	} else if (qinglongResponse) {
		// 装备追刀读取 spell[26].DefensiveTip，不能当作武将技能 AskTip 或装备牌 ActiveTip。
		use(findXinshaPromptEntry("qinglong", plainPrompt(get.translation("qinglong")), event.player, true), "DefensiveTip");
	} else if (event.type === "wuxie") {
		const info = event.info_map || event.getParent?.()?._info_map;
		const original = info?._source || info;
		const affected = original?.multitarget ? original.targets : [original?.target];
		const targetNames = affected?.filter(Boolean).map(player => player === game.me ? "你" : playerName(player)).join("、");
		const originalName = original?.card?.viewAs || original?.card?.name;
		if ((info?.state ?? 1) > 0 && originalName && targetNames) {
			const actor = original.player ? colored(playerName(original.player), "player") : "";
			const targetText = colored(targetNames, "player");
			const cardText = colored(`【${plainPrompt(get.translation(originalName))}】`, "card");
			const response = colored("【无懈可击】", "card");
			if (original.isJudge && ["lebu", "shandian"].includes(originalName)) richMain = `${targetText}的${cardText}即将判定，是否出${response}`;
			else if (["nanman", "wanjian"].includes(originalName)) richMain = `为${targetText}使用一张${response}`;
			else if (actor && ["shunshou", "guohe", "jiedao", "tiesuo", "zhijizhibi", "yuanjiao"].includes(originalName)) richMain = `${actor}对${targetText}使用${cardText}，是否出${response}`;
			else if (actor && ["wugu", "juedou", "taoyuan"].includes(originalName)) richMain = `${actor}的${cardText}对${targetText}即将生效，是否出${response}`;
			if (richMain) { entry = findXinshaPromptEntry("wuxie", "无懈可击", event.player, true); field = "WuXieKeJi.getAskTip"; }
		}
	} else if (event.type === "dying" && event.dying && !event.skill && (generic || nativeDyingPrompt)) {
		const tao = findXinshaPromptEntry("tao", "桃", event.player, true);
		use(tao, "ActiveTip", tao?.prompts.ActiveTip?.split("|")[1], { Count: String(Math.max(1, 1 - event.dying.hp)) });
	} else if (["chooseToUse", "chooseToRespond"].includes(event.name) && event.respondTo?.[1] && !event.skill && (generic || nativeResponsePrompt) && (!cards || cards[1] === 1)) {
		const attack = event.respondTo[1];
		const record = findXinshaPromptEntry(attack.name, plainPrompt(get.translation(attack.name || attack)), event.player, true);
		use(record, "DefensiveTip");
	} else if (virtualTarget) {
		// 本体将泛化选目标标题与“视为使用”说明拆成两行；已知卡牌共用官方目标提示。
		const record = jianglingRecord || (skill && findXinshaPromptEntry(skill, name, event.player));
		if (record && templateFitsChoice(record.prompts.ActiveTip, event, cards, targets)) use(record, "ActiveTip");
		if (!richMain) {
			const cardRecord = findXinshaPromptEntry(card.name, cardName, event.player, true);
			if (templateFitsChoice(cardRecord?.prompts.ActiveTip, event, cards, targets)) use(cardRecord, "ActiveTip");
		}
		if (nativeVirtualDetail) detail = "";
		if (!richMain) main = `${name ? `“${name}”：` : ""}请选择${xinshaRangeText(targets)}名角色，视为使用【${xinshaCardName(card)}】`;
	} else if (phase && generic) {
		if (cardName) {
			const record = findXinshaPromptEntry(card.name, cardName, event.player, true);
			const template = record?.prompts.ActiveTip;
			// 桃的两支分别是正常使用、濒死；其余动态分支交给本体保留真实操作要求。
			if (!(card.name === "sha" && targets?.[1] > 1)) use(record, "ActiveTip", card.name === "tao" ? template?.split("|")[0] : template);
			if (!richMain && record && !template) richMain = `是否使用${colored(`【${cardName}】`, "card")}`;
			if (!richMain) main = `请使用【${cardName}】${targets?.[1] > 1 ? `，请选择${targets[0]}至${targets[1]}名角色` : ""}`;
		} else richMain = xinshaPhasePrompt;
	} else if (skill && name && (generic || nativeSkillInstruction)) {
		const record = jianglingRecord || findXinshaPromptEntry(skill, name, event.player);
		if (record) {
			if (event.name === "chooseBool") use(record, "AskTip", record.prompts.AskTip || `是否发动{Skill}`);
			else if (["chooseToUse", "chooseCard", "chooseCardTarget", "chooseTarget"].includes(event.name)) {
				const text = record.prompts.ActiveTip;
				if (templateFitsChoice(text, event, cards, targets)) use(record, "ActiveTip", text);
			}
		}
	}
	// 未匹配到模板时保留本体的具体操作；不借用 OL 文案或猜测官方协议参数。
	if (!richMain && (!main || generic) && !virtualTarget) {
		const originalMain = main;
		const range = xinshaRangeText;
		if (name && event.name === "chooseBool") main = `是否发动“${name}”`;
		else if (event.name === "chooseCardTarget") {
			const choices = [];
			if (cards?.[1] !== 0) choices.push(`${range(cards)}张牌`);
			if (targets?.[1] !== 0) choices.push(`${range(targets)}名角色`);
			main = choices.length ? `请选择${choices.join("和")}` : name ? `是否发动“${name}”` : originalMain || "请确认";
		}
		else if (event.name === "chooseTarget" || event.skill && targets && targets[1] !== 0 && (!cards || cards[1] === 0 || (ui.selected?.cards?.length || 0) >= cards[0])) main = `请选择${range(targets)}名角色`;
		else if (event.name === "chooseToDiscard") main = `请弃置${range(cards)}张牌`;
		else if (["chooseControl", "chooseButton"].includes(event.name)) main = name && originalMain.includes(name) ? originalMain : "请选择一项";
		else if (cards && cards[1] !== 0) main = `请选择${range(cards)}张牌`;
		else if (!main && name) main = `是否使用“${name}”`;
		// 未匹配模板不代表没有技能。操作兜底不能吃掉本体已有的技能名。
		if (name && !main.includes(name)) main = `“${name}”：${main}`;
	}
	if (richMain) main = plainPrompt(richMain);
	if (!main) return null;
	// 原版求桃提示已给出所需数量，不再附加本体的“当前体力”第二行。
	const nativeDyingDetail = event.type === "dying" && field === "ActiveTip" && entry?.id === 3 && plainPrompt(detail) === `当前体力：${event.dying.hp}`;
	// 武圣等转化技能的说明框打开后，追刀主窗口仍保留着装备介绍，不能跟到转化操作提示后面。
	const nativeQinglongDetail = event.logSkill === "qinglong_skill" && lib.translate?.qinglong_skill_info && normalizeDescription(detail) === normalizeDescription(lib.translate.qinglong_skill_info);
	const detailText = nativeDyingDetail || nativeQinglongDetail ? "" : plainPrompt(detail);
	return { main, detail: detailText && normalizeDescription(detailText) !== normalizeDescription(description) ? detailText : "", skill: name, official: richMain ? { richMain, entryId: entry?.id || "phase", field: field || "TXT_Deal_Card" } : null };
}

function renderXinshaPrompt(tip, prompt, event, richMain = "") {
	tip.replaceChildren();
	delete tip.dataset.officialPromptMode;
	if (prompt.official) {
		tip.dataset.officialSkillId = prompt.official.entryId;
		tip.dataset.officialPromptField = prompt.official.field;
	} else {
		delete tip.dataset.officialSkillId;
		delete tip.dataset.officialPromptField;
	}
	const tokens = new Map();
	if (prompt.skill) tokens.set(prompt.skill, "skill");
	for (const player of [...(game.players || []), ...(game.dead || []), event.source, event.dying]) {
		if (player) { const name = plainPrompt(get.translation(player.name || player)); if (name.length > 1 && !tokens.has(name)) tokens.set(name, "player"); }
	}
	const names = [...tokens].sort((a, b) => b[0].length - a[0].length);
	const appendPlain = (parent, text) => {
		while (text) {
			const named = names.find(([name]) => text.startsWith(name));
			const card = text.match(/^【[^】]+】/);
			const value = named?.[0] || card?.[0] || text[0];
			const type = named?.[1] || (card ? "card" : "");
			const span = document.createElement("span");
			span.textContent = value;
			if (type) { span.dataset.type = type; span.style.color = xinshaPromptColors[type]; }
			parent.appendChild(span);
			text = text.slice(value.length);
		}
	};
	const append = (text, className, rich = false) => {
		if (!text) return;
		const line = document.createElement("span");
		line.className = className;
		if (rich) {
			const holder = document.createElement("div");
			holder.innerHTML = text;
			const walk = (node, color = "") => {
				if (node.nodeType === 3) {
					const span = document.createElement("span");
					span.textContent = node.textContent;
					if (color) span.style.color = color;
					if (color.toUpperCase() === xinshaPromptColors.skill) span.dataset.type = "skill";
					line.appendChild(span);
				} else if (node.nodeName === "BR") line.appendChild(document.createElement("br"));
				else if (!["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(node.nodeName)) {
					const own = node.getAttribute?.("color") || node.style?.color;
					for (const child of node.childNodes) walk(child, own && CSS.supports("color", own) ? own : color);
				}
			};
			for (const node of holder.childNodes) walk(node);
		} else appendPlain(line, text);
		tip.appendChild(line);
	};
	// 原生提示的蓝字、粗体等不属于一将富文本；回退文案也沿用此处的官方字体配色。
	const markup = prompt.official?.richMain || "";
	append(markup || prompt.main, "decade-official-main", !!markup);
	if (prompt.detail !== prompt.main) append(prompt.detail, "decade-official-detail");
	tip.strokeText?.();
}

export { xinshaPromptColors, findXinshaPromptEntry, buildXinshaPrompt, renderXinshaPrompt };
