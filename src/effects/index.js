import "noname";
import { drawLine as drawLine } from "./line.js";
import { playKillEffect as playKillEffect } from "./kill.js";
import { playSkillEffect as playSkillEffect } from "./skill.js";
import { setGhostEffectEnabled as setGhostEffectEnabled, addGhostTrail as addGhostTrail, setupCardGhost as setupCardGhost } from "./cardGhost.js";
function t() {
	"undefined" != typeof decadeUI ? ((decadeUI.effect = { dialog: { create: () => decadeUI.dialog.create("effect-dialog dui-dialog") }, line: drawLine, kill: playKillEffect, skill: playSkillEffect, ghost: { add: addGhostTrail, setEnabled: setGhostEffectEnabled } }), setupCardGhost()) : console.error("decadeUI 未定义，无法初始化特效模块");
}
export { addGhostTrail as addGhostTrail, drawLine as drawLine, playKillEffect as playKillEffect, playSkillEffect as playSkillEffect, setGhostEffectEnabled as setGhostEffectEnabled, setupCardGhost as setupCardGhost, t as setupEffects };
