import { lib, game, ui, get, _status } from "noname";

const simplifySkillPromptKey = "extension_十周年UI_simplifySkillPrompt";
let installed = false;
let pendingClick = null;
const clickPrompts = new WeakMap();
let controlConfirmationInstalled = false;

function initXinshaControlConfirmation() {
	const steps = lib.element.content.chooseToUse;
	if (controlConfirmationInstalled || !Array.isArray(steps) || typeof steps[0] !== "function") return;
	controlConfirmationInstalled = true;
	const original = steps[0];
	steps[0] = async function (event, ...args) {
		// 烈骧已在 chooseControl 明确选择摸牌数；本体 backup 的 manualConfirm 会重复询问。
		// 仅处理这个无牌、无目标的发动步骤，后续摸牌和选伤害目标仍由原技能结算。
		const confirmed = lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && isSkillPromptSimplified() &&
			event.isMine() && event.skill === "dcliexiang_backup" && event._backup && !!event.openskilldialog;
		const result = await original.call(this, event, ...args);
		if (confirmed && event === _status.event && event.skill === "dcliexiang_backup" &&
			!event.filterButton && !event.filterCard && !event.filterTarget && game.check()) {
			ui.click.ok();
		}
		return result;
	};
}

function isSkillPromptSimplified() {
	return lib.config[simplifySkillPromptKey] !== false;
}

function getSimplifiedSkillPrompt(event) {
	const prompt = clickPrompts.get(event);
	return isSkillPromptSimplified() && prompt && prompt.skill === event.skill ? prompt.text : undefined;
}

function initSimplifiedSkillPrompt() {
	if (installed || !lib.hooks?.checkEnd || typeof ui.click.skill !== "function") return;
	installed = true;
	initXinshaControlConfirmation();
	lib.init.css(`${lib.assetURL}extension/十周年UI/src/styles`, "skill-prompt");
	const original = ui.click.skill;
	lib.hooks.checkEnd.add((event, { ok }) => {
		if (!pendingClick || event !== pendingClick.event || event.skill !== pendingClick.skill) return;
		pendingClick.ok = ok;
		// 本体在 check() 之后才创建技能说明框；取消这个创建标记，保留 backup 和选择检查。
		if (event.skillDialog === true) {
			event.skillDialog = false;
			const info = get.info(event.skill);
			const prompt = info.prompt || info.promptfunc;
			const text = typeof prompt === "function" ? prompt.call(info, event, event.player) : prompt;
			// 自定义操作要求仍要显示；不把 _info 或 dynamicTranslate 的整段技能介绍搬过来。
			clickPrompts.set(event, { skill: event.skill, text: typeof text === "string" ? text : undefined });
		}
	});
	ui.click.skill = function (skill, ...args) {
		const event = _status.event;
		if (!isSkillPromptSimplified() || !event?.isMine()) return original.call(this, skill, ...args);
		const previous = pendingClick;
		const click = { event, skill, ok: false };
		pendingClick = click;
		try {
			const result = original.call(this, skill, ...args);
			// 点击已经表达发动意愿。没有可选择的牌、目标或按钮时，直接提交本体结果。
			// 允许选零张的技能仍可能需要选牌，不能只按最小数量为零就自动提交。
			const hasSelection = ["Button", "Card", "Target"].some(type => event[`filter${type}`] && get.select(event[`select${type}`])[1] !== 0);
			if (click.ok && event === _status.event && event.skill === skill && !hasSelection && !get.info(skill)?.manualConfirm && !get.info(get.card() || {})?.manualConfirm) {
				ui.click.ok();
			}
			return result;
		} finally {
			pendingClick = previous;
		}
	};
}

export { simplifySkillPromptKey, isSkillPromptSimplified, getSimplifiedSkillPrompt, initSimplifiedSkillPrompt, initXinshaControlConfirmation };
