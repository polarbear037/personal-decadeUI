import { lib, ui } from "noname";
import { officialSkillPrompts } from "./officialSkillPromptData.js";

// 官方 MUt.labelHandler 只显示 skill.Name；AniType=NONE 不创建通用技能名动画。
// 同名版本的广播文字相同：任一官方武将技能版本有此动画即可保留该名字。
const popupNames = new Set(officialSkillPrompts.filter(entry => entry.name && entry.type === 2 && entry.aniType > 0 && entry.aniType <= 8).map(entry => entry.name));

function isOfficialPlayerPopup(text) {
	return typeof text === "string" && popupNames.has(text.trim());
}

function syncOfficialPlayerPopups() {
	const arena = ui.arena;
	if (!arena) return;
	const enabled = !!lib.config.extension_十周年UI_optimizePrompt;
	if (enabled) arena.dataset.decadeOfficialPlayerPopups = "true";
	else delete arena.dataset.decadeOfficialPlayerPopups;
	// 开关切换也处理尚未退场的文字，不改伤害数字、录像或联机消息。
	for (const node of arena.querySelectorAll(":scope > .damage.skill-popup")) {
		node.classList.toggle("decade-player-popup-hidden", enabled && !isOfficialPlayerPopup(node.textContent));
	}
}

export { isOfficialPlayerPopup, syncOfficialPlayerPopups };
