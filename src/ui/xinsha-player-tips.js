import { lib, game, get, ui, _status } from "noname";

// YJCM 6.4.5 GameSeatCcb.createStatusBar / updateTimeBar，来源见 verification/yjcm-player-tips-source.json。
const choices = new Set([
	"chooseBool", "chooseCard", "chooseTarget", "chooseCardTarget", "chooseButton", "chooseControl",
	"chooseToUse", "chooseToRespond", "chooseToDiscard", "choosePlayerCard", "discardPlayerCard",
	"gainPlayerCard", "chooseToCompare", "chooseToCompareMultiple", "chooseToMove",
]);
const phases = {
	phaseBefore: "准备阶段", phaseBegin: "回合开始", phaseZhunbei: "回合开始",
	phaseJudge: "判定阶段", phaseDraw: "摸牌阶段", phaseUse: "出牌阶段",
	phaseDiscard: "弃牌阶段", phaseJieshu: "结束阶段", phaseEnd: "结束阶段",
};
const seats = new Map();
let installed = false;

function eventChain(event) {
	const chain = [], seen = new Set();
	while (event && !seen.has(event) && chain.length < 32) {
		seen.add(event);
		chain.push(event);
		if (["game", "phase"].includes(event.name) || phases[event.name]) break;
		event = event.parent || event.getParent?.();
	}
	return chain;
}

function plainName(value) {
	const node = document.createElement("div");
	node.innerHTML = String(value || "");
	return node.textContent.trim();
}

function skillName(event, player) {
	if (event.player && event.player !== player) return "";
	const candidates = [event.skill, event._skill, event.sourceSkill, event.hsskill, event.result?.skill];
	if (!choices.has(event.name) && !phases[event.name] && !["game", "phase"].includes(event.name)) candidates.push(event.name);
	for (let skill of candidates.flat()) {
		if (typeof skill !== "string") continue;
		skill = skill.replace(/_(?:cost|backup)$/, "");
		skill = get.sourceSkillFor?.(skill) || skill;
		const info = lib.skill[skill];
		if (!info || info.charlotte || info.nopop || !lib.translate[skill]) continue;
		// 原版 getShortName 没有 ShortName 时返回完整 Name，不截取前两个字。
		return plainName(get.skillTranslation?.(skill, player) || get.translation(skill));
	}
	return "";
}

function cardName(event, chain) {
	if (event.type === "wuxie") return "无懈可击";
	const required = typeof event.filterCard === "object" ? event.filterCard?.name : null;
	if (typeof required === "string" && lib.card[required]) return plainName(get.translation(required));
	if (event.type === "dying") return "桃";
	const card = event.result?.card || event.card;
	if (card?.name && lib.card[card.viewAs || card.name]) return plainName(get.translation({ name: card.viewAs || card.name, nature: card.nature }));
	if (choices.has(event.name)) {
		// respondTo 是对方使用的牌，提示应写当前角色需要响应的牌。
		const incoming = event.respondTo?.[1] || chain.find(parent => parent.name === "useCard")?.card;
		const response = { sha: "shan", nanman: "sha", juedou: "sha", wanjian: "shan" }[incoming?.name];
		if (response) return plainName(get.translation(response));
	}
	return "";
}

function thinkingState(player, chain) {
	for (let index = 0; index < chain.length; index++) {
		const event = chain[index];
		if (event.finished) continue;
		if (choices.has(event.name)) {
			// 无懈询问对所有座位公开倒计时，不通过手牌判断，避免泄露隐藏信息。
			if (event.type === "wuxie") return { subject: "无懈可击" };
			if (event.player !== player) return null;
			for (const context of chain.slice(index)) {
				if (context.player && context.player !== player || phases[context.name] || ["phase", "game"].includes(context.name)) break;
				const skill = skillName(context, player);
				if (skill) return { subject: skill };
			}
			const card = cardName(event, chain.slice(index));
			if (card) return { subject: card };
			const phase = chain.find(parent => phases[parent.name] && parent.player === player);
			return { text: phase ? phases[phase.name] : "准备阶段" };
		}
		if (["useCard", "respond", "useSkill"].includes(event.name)) {
			if (event.player !== player) return null;
			const subject = skillName(event, player) || cardName(event, chain.slice(index));
			if (subject) return { subject };
		}
		if (event.player) {
			const skill = skillName(event, player);
			if (skill) return { subject: skill };
		}
		if (phases[event.name] && event.player === player && _status.currentPhase === player) return { text: phases[event.name] };
	}
	return null;
}

function clearXinshaPlayerTips() {
	for (const node of seats.values()) node.remove();
	seats.clear();
}

function refreshXinshaPlayerTips() {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || !_status.gameStarted || _status.over || ui.arena?.classList.contains("choose-character")) {
		clearXinshaPlayerTips();
		return;
	}
	const chain = eventChain(_status.event);
	if (chain.some(event => /^chooseCharacter/.test(event.name))) return clearXinshaPlayerTips();
	const players = new Set((game.players || []).filter(player => player !== game.me && !player.isDead?.() && player.isConnected !== false));
	for (const [player, node] of seats) {
		if (!players.has(player)) { node.remove(); seats.delete(player); }
	}
	for (const player of players) {
		let node = seats.get(player);
		// 进度条是显隐的唯一来源；事件仍在或阶段未结束都不能延长提示寿命。
		const progress = player.querySelector(":scope > .timeai, :scope > .timePhase");
		if (!progress) {
			node?.remove();
			seats.delete(player);
			continue;
		}
		const thinking = thinkingState(player, chain);
		// 事件先切换、计时条稍后清理时，保留当前文案直至进度条同步退出。
		if (!thinking && node?.parentNode === player) continue;
		const content = thinking || { text: "准备阶段" };
		const key = content.subject || content.text;
		if (node?.parentNode === player && node.dataset.text === key) continue;
		if (!node || node.parentNode !== player) {
			node?.remove();
			node = document.createElement("div");
			node.className = "tipshow playertip decade-xinsha-player-tip";
			node.setAttribute("role", "status");
			player.appendChild(node);
			seats.set(player, node);
		}
		const text = document.createElement("div");
		text.className = "decade-xinsha-thinking-text";
		if (content.subject) {
			const subject = document.createElement("span");
			subject.textContent = content.subject;
			text.append(subject, "思考中");
		} else text.textContent = content.text;
		node.replaceChildren(text);
		node.dataset.text = key;
	}
}

function initXinshaPlayerTips() {
	if (installed) return;
	installed = true;
	const timer = setInterval(refreshXinshaPlayerTips, 100);
	lib.announce.subscribe("Noname.Game.Event.Changed", refreshXinshaPlayerTips);
	lib.hooks.checkEnd.add(refreshXinshaPlayerTips);
	lib.onover.push(() => { clearInterval(timer); clearXinshaPlayerTips(); });
}

export { initXinshaPlayerTips, refreshXinshaPlayerTips, clearXinshaPlayerTips };
