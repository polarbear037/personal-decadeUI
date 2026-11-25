import { lib, get } from "noname";

// 印牌窗口只展示来源技能的完整说明，不借用外层卡牌或其他角色的技能。
export function getPrintedSkillDescription(dialog, event) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || dialog?.dataset.lyjTable !== "printed") return "";
	const player = event?.player, seen = new Set();
	for (let current = event; current && seen.size < 32 && !seen.has(current);) {
		seen.add(current);
		if (/^chooseCharacter/.test(current.name) || ["game", "phase", "useCard", "respond"].includes(current.name) ||
			/^phase(?:Zhunbei|Judge|Draw|Use|Discard|Jieshu)(?:Before|Begin|End|After)?$/.test(current.name) || current.type === "card") break;
		for (const value of [current.sourceSkill, current.skill, current.hsskill, current.hiddenSkill, current.logSkill, current.result?.skill, current.name]) {
			const skill = Array.isArray(value) ? value[0] : value;
			if (typeof skill !== "string") continue;
			const base = skill.replace(/_(?:backup|cost)$/, "");
			if (!lib.skill[skill] && !lib.skill[base]) continue;
			for (const id of new Set([get.sourceSkillFor?.(skill), base, skill].filter(Boolean))) {
				let description;
				try { description = get.skillInfoTranslation(id, player || current.player); }
				catch { description = get.plainText(lib.translate[id + "_info"] || ""); }
				if (typeof description === "string" && description.trim()) return description.trim();
			}
		}
		try { current = current.getParent?.() || current.parent; } catch { current = current.parent; }
	}
	return "";
}

export function getPrintedSkillPromptHeight(dialog, description) {
	const holder = document.createElement("div"); holder.textContent = description;
	// 与通用提示层相同的设计宽度和字体；不按字数推测换行。
	holder.style.cssText = "position:fixed;left:-10000px;top:0;width:1220px;height:auto;margin:0;padding:0;border:0;font:30px/1 dui-yjcm-label,serif;white-space:normal;pointer-events:none;visibility:hidden";
	document.body.appendChild(holder);
	const textHeight = holder.offsetHeight; holder.remove();
	const count = dialog.buttons?.length || 1, rows = Math.ceil(count / Math.min(count, 5));
	// 印牌横幅39高、行距35、容器上下各4；底部继续使用120的提示锚点。
	const optionHeight = rows * 39 + (rows - 1) * 35 + 8;
	return Math.max(dialog.dataset.lyjBig === "true" ? 588 : 392, 60 + 48 + optionHeight + textHeight + 120);
}
