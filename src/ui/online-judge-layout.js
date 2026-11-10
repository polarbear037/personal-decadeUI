import { game, lib, ui } from "noname";

const layouts = new WeakMap();

// Uvi.layoutDecideCards：手牌高194、底距15，座位高232、底距18。
// 换算到武将牌左上角后为16/62/92。36是承载节点，不能据此缩小动画。
export function onlineJudgeGeometry(player, skillCount) {
	const scale = Math.min(player.offsetWidth / 174, player.offsetHeight / 232);
	const y = skillCount === 1 ? 92 : skillCount === 2 || skillCount === 4 ? 62 : 16;
	return { scale, y: y * scale };
}

function clearCard(card) {
	delete card.dataset.onlineJudgeQueue;
	delete card.dataset.onlineJudgeEffect;
	card.style.removeProperty("--online-judge-x");
	card.querySelector(":scope > .dui-judge-queue-arrow")?.remove();
}

export function clearOnlineJudgeLayout(player) {
	const state = layouts.get(player);
	if (!state) return;
	state.observer.disconnect(); state.resize.disconnect();
	for (const card of state.cards) clearCard(card);
	const judges = player.node?.judges;
	if (judges) {
		delete judges.dataset.onlineJudgeLayout;
		judges.style.removeProperty("--online-judge-y");
		judges.style.removeProperty("--online-judge-scale");
	}
	layouts.delete(player);
}

export function syncOnlineJudgeLayout(player) {
	const judges = player?.node?.judges;
	if (!judges) return;
	const isSelf = player === game.me || player.dataset.position === "0";
	if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI" || !isSelf) {
		clearOnlineJudgeLayout(player); return;
	}
	const allCards = [...judges.children].filter(card => card.classList.contains("card"));
	if (!allCards.length) { clearOnlineJudgeLayout(player); return; }
	let state = layouts.get(player);
	const firstLayout = !state;
	if (!state) {
		const update = () => syncOnlineJudgeLayout(player);
		state = { cards: new Set(), observer: new MutationObserver(update), resize: new ResizeObserver(update) };
		state.observer.observe(judges, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
		state.resize.observe(player);
		layouts.set(player, state);
	}
	const cards = allCards.filter(card => !card.classList.contains("removing"));
	for (const card of state.cards) if (!allCards.includes(card)) clearCard(card);
	state.cards = new Set(allCards);
	// 本体delete()保留淡出DOM，离开队列后仍保留其原落点，实际移除再清理。
	if (!cards.length) return;
	const count = ui.skillControl?.node?.combined?.children.length || 0;
	const geometry = onlineJudgeGeometry(player, count);
	if (firstLayout) judges.style.setProperty("--online-judge-transition", "none");
	judges.dataset.onlineJudgeLayout = "true";
	judges.style.setProperty("--online-judge-y", `${geometry.y}px`);
	for (const [index, card] of cards.entries()) {
		const name = card.viewAs || card.name;
		card.dataset.onlineJudgeQueue = index === 0 ? "active" : "pending";
		// dns.ShowInQueue只压暗bmpFace；兵、乐替代bmpFace的动画保持原色。
		card.dataset.onlineJudgeEffect = String(name === "bingliang" || name === "lebu");
		// 坐标映射与PNG绘制尺寸分开：恢复原有50px图标，以原节点右沿(-4)定位。
		card.style.setProperty("--online-judge-x", `${-4 * geometry.scale - 50 - (cards.length - 1 - index) * 50}px`);
		let arrow = card.querySelector(":scope > .dui-judge-queue-arrow");
		if (index === cards.length - 1) { arrow?.remove(); continue; }
		if (!arrow) {
			arrow = document.createElement("img"); arrow.className = "dui-judge-queue-arrow";
			arrow.alt = ""; arrow.setAttribute("aria-hidden", "true"); card.append(arrow);
		}
		const src = `${lib.assetURL}extension/十周年UI/image/ui/judge-mark/decideCardUI_queue_arrow_${index === 0 ? "light" : "gray"}.png`;
		if (arrow.getAttribute("src") !== src) arrow.setAttribute("src", src);
	}
	if (firstLayout) {
		// 先提交首次落点，不能从旧主题top插值，避免飞入动画读到过渡中的坐标。
		getComputedStyle(judges).top;
		judges.style.removeProperty("--online-judge-transition");
	}
}
