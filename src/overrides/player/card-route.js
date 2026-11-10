import { STYLE_TO_SKIN, DEFAULT_SKIN } from "../../../ui/constants.js";
import * as fallbackActions from "./card-actions.js";
import * as fallbackMovement from "./card-movement.js";
import { refreshEquipLayout } from "../../ui/equip-layout.js";
import { installEquipSweepCompatibility } from "../../ui/equip-effects.js";

const ACTION_EXPORTS = ["playerHandleEquipChange", "playerLose", "playerRespond", "playerRespondAnimateBefore", "playerUseCard", "playerUseCardAnimateBefore"];
const MOVEMENT_EXPORTS = ["playerAddVirtualJudge", "playerDirectgain", "playerDirectgains", "playerDraw", "playerGain2", "playerGive", "playerPhaseJudge", "playerThrow", "playerThrowordered2", "setBasePlayerDraw"];

let actionOverrides = fallbackActions;
let movementOverrides = fallbackMovement;

function hasExpectedExports(module, names) {

	return names.every(name => typeof module[name] === "function");
}

async function loadStyleModule(path, fallback, names, label, skin) {

	try {
		const module = await import(path);
		if (!hasExpectedExports(module, names)) {
			throw new Error(`缺少导出：${names.filter(name => typeof module[name] !== "function").join(", ")}`);
		}
		return module;
	} catch (error) {
		console.warn(`[十周年UI] ${skin} 样式${label}模块加载失败，使用兜底模块：`, error);
		return fallback;
	}
}

async function loadPlayerCardOverrides(style) {
	const skin = STYLE_TO_SKIN[style] || DEFAULT_SKIN;
	const [actions, movement] = await Promise.all([
		loadStyleModule(`./card-actions-${skin}.js`, fallbackActions, ACTION_EXPORTS, "卡牌动作", skin),
		loadStyleModule(`./card-movement-${skin}.js`, fallbackMovement, MOVEMENT_EXPORTS, "卡牌移动", skin),
	]);
	[actionOverrides, movementOverrides] = [actions, movement];
	return { skin, actions, movement };
}

function playerHandleEquipChange() {
	const result = actionOverrides.playerHandleEquipChange.apply(this, arguments);
	refreshEquipLayout(this);
	installEquipSweepCompatibility();
	return result;
}

function playerLose() {
	return actionOverrides.playerLose.apply(this, arguments);
}

function playerRespond() {
	return actionOverrides.playerRespond.apply(this, arguments);
}

function playerRespondAnimateBefore() {
	return actionOverrides.playerRespondAnimateBefore.apply(this, arguments);
}

function playerUseCard() {
	return actionOverrides.playerUseCard.apply(this, arguments);
}

function playerUseCardAnimateBefore() {
	return actionOverrides.playerUseCardAnimateBefore.apply(this, arguments);
}

function playerAddVirtualJudge() {
	return movementOverrides.playerAddVirtualJudge.apply(this, arguments);
}

function playerDirectgain() {
	return movementOverrides.playerDirectgain.apply(this, arguments);
}

function playerDirectgains() {
	return movementOverrides.playerDirectgains.apply(this, arguments);
}

function playerDraw() {
	return movementOverrides.playerDraw.apply(this, arguments);
}

function playerGain2() {
	return movementOverrides.playerGain2.apply(this, arguments);
}

function playerGive() {
	return movementOverrides.playerGive.apply(this, arguments);
}

function playerPhaseJudge() {
	return movementOverrides.playerPhaseJudge.apply(this, arguments);
}

function playerThrow() {
	return movementOverrides.playerThrow.apply(this, arguments);
}

function playerThrowordered2() {
	return movementOverrides.playerThrowordered2.apply(this, arguments);
}

function setBasePlayerDraw() {
	return movementOverrides.setBasePlayerDraw.apply(this, arguments);
}

export {
	loadPlayerCardOverrides,
	playerHandleEquipChange,
	playerLose,
	playerRespond,
	playerRespondAnimateBefore,
	playerUseCard,
	playerUseCardAnimateBefore,
	playerAddVirtualJudge,
	playerDirectgain,
	playerDirectgains,
	playerDraw,
	playerGain2,
	playerGive,
	playerPhaseJudge,
	playerThrow,
	playerThrowordered2,
	setBasePlayerDraw,
};
