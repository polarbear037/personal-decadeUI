import { lib, game, get, ui, _status } from "noname";

// OL 4.0.2 Ens.UpdateOptTips / createShaCntPart。官方设计坐标以 146px 立绘为基准。
const choiceNames = new Set([
	"chooseBool", "chooseCard", "chooseTarget", "chooseCardTarget", "chooseButton", "chooseControl",
	"chooseToUse", "chooseToRespond", "chooseToDiscard", "choosePlayerCard", "discardPlayerCard",
	"gainPlayerCard", "chooseToCompare", "chooseToCompareMultiple", "chooseToMove",
]);
const seats = new Map();
let installed = false;
let stopped = false;

function parentOf(event) {
	return event?.parent || event?.getParent?.();
}

function eventChain(event) {
	const chain = [], seen = new Set();
	while (event && !seen.has(event) && chain.length < 32) {
		seen.add(event);
		chain.push(event);
		if (event.name === "game" || event.name === "phase" || /^phase(?:Use|Discard|Judge|Draw|Zhunbei|Jieshu)$/.test(event.name)) break;
		event = parentOf(event);
	}
	return chain;
}

function plainName(value) {
	const holder = document.createElement("div");
	holder.innerHTML = String(value || "");
	return holder.textContent.trim();
}

function skillForChoice(chain, player) {
	for (const event of chain) {
		if (/^(?:game|phase)/.test(event.name)) break;
		// 不把另一名角色的触发技能借给当前响应者。
		if (event.player && event.player !== player) break;
		const candidates = [event.skill, event._skill, event.sourceSkill, event.hsskill, event.result?.skill];
		if (!choiceNames.has(event.name)) candidates.push(event.name);
		for (let skill of candidates.flat()) {
			if (typeof skill !== "string") continue;
			skill = skill.replace(/_(?:cost|backup)$/, "");
			skill = get.sourceSkillFor?.(skill) || skill;
			const info = lib.skill[skill];
			if (!info || info.charlotte || info.nopop || !lib.translate[skill]) continue;
			return plainName(get.skillTranslation?.(skill, player) || get.translation(skill));
		}
	}
	return "";
}

function cardForChoice(chain) {
	const event = chain[0];
	if (event.type === "wuxie") return "无懈可击";
	if (event.type === "dying") return plainName(get.translation("tao"));
	for (const current of chain) {
		const card = current.card || current.result?.card || current.respondTo?.[1];
		if (card?.name && lib.card[card.name]) {
			// 实体牌 translation 会附加花色点数；官方这里只显示技能牌名（包括火/雷杀）。
			return plainName(get.translation({ name: card.viewAs || card.name, nature: card.nature }));
		}
	}
	// 有些响应事件只提供所需牌的 filterCard 对象，没有传入 respondTo。
	if (typeof event.filterCard === "object" && typeof event.filterCard?.name === "string" && lib.card[event.filterCard.name]) {
		return plainName(get.translation(event.filterCard.name));
	}
	return "";
}

function getThinkingState(player, chain) {
	const phase = chain.find(event => ["phaseUse", "phaseDiscard"].includes(event.name) && !event.finished && event.player === player);
	const phaseThinking = _status.currentPhase === player && phase ? { kind: phase.name === "phaseDiscard" ? "discard" : "play", text: phase.name === "phaseDiscard" ? " 弃牌" : " 出牌" } : null;
	// 从当前子事件向外查找最近的具体操作，技能触发也可以独立于选择和用牌事件存在。
	// 只有完全没有具体牌/技能时，才回退为阶段文字。
	for (let index = 0; index < chain.length; index++) {
		const event = chain[index];
		if (choiceNames.has(event.name) && !event.finished) {
			if (event.player !== player) return null;
			const context = chain.slice(index);
			const skill = skillForChoice(context, player);
			if (skill) return { kind: "skill", text: `“${skill}”`, suffix: "技能" };
			if (event.name === "chooseToDiscard" && phase?.name === "phaseDiscard") return { kind: "discard", text: " 弃牌" };
			const card = cardForChoice(context);
			if (card) return { kind: "card", text: card };
			if (event.name === "chooseToUse" && event.type === "phase") return { kind: "play", text: " 出牌" };
			return { kind: "waiting", text: "" };
		}
		if (["useCard", "respond", "useSkill"].includes(event.name)) {
			if (event.player !== player) return null;
			const skill = skillForChoice([event], player);
			if (skill) return { kind: "skill", text: `“${skill}”`, suffix: "技能" };
			const card = cardForChoice([event]);
			if (card) return { kind: "card", text: card };
			return phaseThinking;
		}
		if (event.player && !event.finished) {
			const skill = skillForChoice([event], event.player);
			if (skill) return event.player === player ? { kind: "skill", text: `“${skill}”`, suffix: "技能" } : null;
		}
	}
	return phaseThinking;
}

function removeToast(state) {
	clearTimeout(state.toastDelay);
	clearTimeout(state.toastHide);
	clearTimeout(state.toastRemove);
	state.toast?.remove();
	state.toast = null;
}

function clearOnlinePlayerTips() {
	for (const state of seats.values()) {
		state.tip?.remove();
		removeToast(state);
	}
	seats.clear();
}

function renderThinking(player, state, thinking) {
	if (!thinking) {
		state.tip?.remove();
		state.tip = null;
		state.thinkingKey = "";
		return;
	}
	const key = `${thinking.kind}:${thinking.text}`;
	if (state.thinkingKey === key && state.tip?.parentNode === player) return;
	if (!state.tip || state.tip.parentNode !== player) {
		state.tip?.remove();
		state.tip = document.createElement("div");
		state.tip.className = "tipshow playertip decade-online-player-tip";
		state.tip.setAttribute("role", "status");
		player.appendChild(state.tip);
	}
	state.tip.dataset.kind = thinking.kind;
	const text = document.createElement("div");
	text.className = "decade-online-thinking-text";
	text.append("思考");
	const subject = document.createElement("span");
	subject.textContent = thinking.text;
	text.append(subject, thinking.suffix || "");
	state.tip.replaceChildren(text);
	state.thinkingKey = key;
}

function setCount(node, count) {
	node.textContent = String(count);
	node.classList.toggle("is-zero", count === 0);
}

function showCountToast(player, state, count, previous) {
	const existing = state.toast && !state.toast.classList.contains("is-leaving");
	clearTimeout(state.toastHide);
	clearTimeout(state.toastRemove);
	if (!existing) {
		state.toast?.remove();
		state.toast = document.createElement("div");
		state.toast.className = "decade-online-sha-toast";
		state.toast.setAttribute("role", "status");
		player.appendChild(state.toast);
	}
	const toast = state.toast;
	toast.dataset.unlimited = String(count.max === Infinity);
	toast.setAttribute("aria-label", count.max === Infinity ? "出杀次数 ∞" : `出杀次数：${count.remaining}/${count.max}`);
	const line = document.createElement("div");
	line.className = "decade-online-sha-line";
	const label = document.createElement("span");
	label.className = "decade-online-sha-label";
	label.textContent = count.max === Infinity ? "出杀次数 " : "出杀次数：";
	const current = document.createElement("span");
	current.className = "decade-online-sha-current";
	setCount(current, count.max === Infinity ? "∞" : count.remaining);
	const max = document.createElement("span");
	max.className = "decade-online-sha-max";
	max.textContent = count.max === Infinity ? "" : `/${count.max}`;
	line.append(label, current, max);
	toast.replaceChildren(line);
	if (previous && previous.remaining !== count.remaining && Number.isFinite(count.max) && Number.isFinite(previous.remaining)) {
		const increased = count.remaining > previous.remaining;
		const old = document.createElement("span"), incoming = document.createElement("span"), glow = document.createElement("span");
		old.className = "decade-online-sha-old";
		incoming.className = "decade-online-sha-incoming";
		glow.className = "decade-online-sha-glow";
		for (const effect of [old, incoming, glow]) effect.setAttribute("aria-hidden", "true");
		setCount(old, previous.remaining);
		setCount(incoming, count.remaining);
		setCount(glow, count.remaining);
		current.append(old, incoming, glow);
		current.classList.add("is-changing");
		current.style.setProperty("--count-direction", increased ? -1 : 1);
	}
	state.toastHide = setTimeout(() => {
		toast.classList.add("is-leaving");
		state.toastRemove = setTimeout(() => {
			toast.remove();
			if (state.toast === toast) state.toast = null;
		}, 150);
	}, 2000);
}

function syncShaCount(player, state, chain) {
	const inPhase = _status.currentPhase === player && chain.some(event => event.name === "phaseUse" && event.player === player);
	if (!inPhase || typeof player.getCardUsable !== "function") {
		removeToast(state);
		state.count = null;
		state.phase = null;
		return;
	}
	const phase = chain.find(event => event.name === "phaseUse");
	if (state.phase !== phase) {
		removeToast(state);
		state.count = null;
		state.phase = phase;
	}
	const max = player.getCardUsable("sha", true);
	const count = { max, remaining: max === Infinity ? Infinity : Math.max(0, player.getCardUsable("sha")) };
	const previous = state.count;
	if (previous?.max === max && previous.remaining === count.remaining) return;
	state.count = count;
	clearTimeout(state.toastDelay);
	if (!(max > 1)) return removeToast(state);
	// Ens 的调用方 SeatUI.onSetShaCnt / onUpdateShaCnt 均延迟 200ms 显示。
	state.toastDelay = setTimeout(() => showCountToast(player, state, count, previous), 200);
}

function refreshOnlinePlayerTips() {
	if (stopped || !_status.gameStarted || _status.over || lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI" || ui.arena?.classList.contains("choose-character")) {
		clearOnlinePlayerTips();
		return;
	}
	const chain = eventChain(_status.event);
	if (chain.some(event => /^chooseCharacter/.test(event.name))) return clearOnlinePlayerTips();
	const players = new Set((game.players || []).filter(player => player !== game.me && !player.isDead?.() && player.isConnected !== false));
	for (const [player, state] of seats) {
		if (!players.has(player)) {
			state.tip?.remove();
			removeToast(state);
			seats.delete(player);
		}
	}
	for (const player of players) {
		let state = seats.get(player);
		if (!state) seats.set(player, state = {});
		renderThinking(player, state, getThinkingState(player, chain));
		syncShaCount(player, state, chain);
	}
}

function initOnlinePlayerTips() {
	if (installed) return;
	installed = true;
	const timer = setInterval(refreshOnlinePlayerTips, 100);
	lib.onover.push(() => {
		stopped = true;
		clearInterval(timer);
		clearOnlinePlayerTips();
	});
	lib.announce.subscribe("Noname.Game.Event.Changed", refreshOnlinePlayerTips);
	lib.hooks.checkEnd.add(refreshOnlinePlayerTips);
}

export { initOnlinePlayerTips, refreshOnlinePlayerTips, clearOnlinePlayerTips };
