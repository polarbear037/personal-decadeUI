import { _status, lib, game } from "noname";
import { initRecast as initRecast } from "./recast.js";
import { animateSkill as animateSkill } from "./animate.js";
import { baseSkill as baseSkill } from "./base.js";
import { inheritSkill as inheritSkill } from "./inherit.js";
import { inheritComplexSkill as inheritComplexSkill } from "./inherit-complex.js";
import { guhuoSkill as guhuoSkill } from "./guhuo.js";
import { inheritSubSkill } from "./sub-skills.js";
const c = { ...inheritSkill, ...inheritComplexSkill, ...guhuoSkill };
function f() {
	if (!_status.connectMode) {
		((decadeUI.animateSkill = animateSkill), (decadeUI.skill = baseSkill), (decadeUI.inheritSkill = c), (decadeUI.inheritSubSkill = inheritSubSkill));
		for (const i of Object.keys(animateSkill)) ((lib.skill[i] = animateSkill[i]), game.addGlobalSkill(i));
		Object.assign(lib.skill, baseSkill);
		for (const i of Object.keys(c)) lib.skill[i] && Object.assign(lib.skill[i], c[i]);
		for (const i of Object.keys(inheritSubSkill)) if (lib.skill[i]?.subSkill) for (const s of Object.keys(inheritSubSkill[i])) lib.skill[i].subSkill[s] && Object.assign(lib.skill[i].subSkill[s], inheritSubSkill[i][s]);
		if (lib.config.extension_十周年UI_shiliyouhua) {
			Object.defineProperty(lib, "group", { get: () => ["wei", "shu", "wu", "qun", "jin"], set: () => {} });
		}
		initRecast();
	}
}
export { animateSkill as animateSkill, baseSkill as baseSkill, inheritSubSkill as inheritSubSkill, f as initSkills };
