import { lib, ui } from "noname";
import { officialSkillPrompts } from "./officialSkillPromptData.js";
import { getOptimizedPromptStyle } from "./promptStyle.js";

// 官方表中的动画技能名优先匹配；表外技能再按当前游戏实际注册的译名判断。
// 同名版本的广播文字相同，任一版本匹配即可保留该名字。
const popupNames = new Set(officialSkillPrompts.filter(entry => entry.name && entry.type === 2 && entry.aniType > 0 && entry.aniType <= 8).map(entry => entry.name));

function isOfficialPlayerPopup(text) {
	if (typeof text !== "string" || !text.trim()) return false;
	const name = text.trim();
	if (popupNames.has(name)) return true;
	// 官方静态表不包含所有本体版本、装备技能和扩展技能，以当前注册译名补全。
	// 不缓存未命中结果，兼容开局后动态注册技能或更新翻译。
	for (const skill in lib.skill) {
		if (lib.translate[skill] === name) return true;
	}
	return false;
}

function syncOfficialPlayerPopups() {
	const arena = ui.arena;
	if (!arena) return;
	const enabled = getOptimizedPromptStyle() === "online";
	if (enabled) arena.dataset.decadeOfficialPlayerPopups = "true";
	else delete arena.dataset.decadeOfficialPlayerPopups;
	// 开关切换也处理尚未退场的文字，不改伤害数字、录像或联机消息。
	for (const node of arena.querySelectorAll(":scope > .damage.skill-popup")) {
		node.classList.toggle("decade-player-popup-hidden", enabled && !isOfficialPlayerPopup(node.textContent));
	}
}

export { isOfficialPlayerPopup, syncOfficialPlayerPopups };
