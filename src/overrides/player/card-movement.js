import { game, get, _status, ui, lib } from "noname";
import { applyCardBorder as applyCardBorder } from "../../ui/cardStyles.js";

let baseDraw = null;
let decadeUIInstance = null;

// ==========================
// 【摸牌/获得卡牌 动画参数】
// ==========================
const GAIN_CARD_MOVE_DURATION = 500;      // 卡牌从牌堆/目标飞到手牌的动画时长（毫秒）
const GAIN_CARD_REMOVE_DELAY = 480;       // 卡牌动画结束后，多久从舞台移除（防止残影）
const GAIN_CARD_REMOVE_DURATION = 380;    // 卡牌消失/淡出的动画时长

// ==========================
// 【装备牌 动画参数】
// ==========================
const EQUIP_CARD_MOVE_DURATION = 430;     // 装备牌从手牌飞到装备区的动画时长
const EQUIP_CARD_CLEANUP_DELAY = 0;       // 装备牌动画结束后，清理元素的延迟时间
const EQUIP_CARD_TARGET_HEIGHT = 10;      // 装备牌落地后的目标高度（缩放用，单位px）
const EQUIP_CARD_TARGET_LEFT_OFFSET = -10;// 装备牌落点的水平偏移（左/右微调）



const EQUIP_ENTRY_DELAY = EQUIP_CARD_MOVE_DURATION + 220;




// 装备入场动画的触发延迟（在卡牌飞到位后，再等220ms触发）
const EQUIP_ENTRY_DURATION = 260;         // 装备“进场/亮起”的动画时长
const EQUIP_ENTRY_PENDING_WINDOW = 1600;  // 装备进场动画的最长等待窗口（超时强制结束）
const EQUIP_ENTRY_SETTLING_CLASS = "decade-equip-entry-settling"; 
// 装备稳定状态的CSS类名（控制最终显示样式）
const EQUIP_ENTRY_SETTLING_CLEANUP_DELAY = 0; 
// 装备稳定后，清理入场动画的延迟时间

// ==========================
// 【延时锦囊判定牌 动画参数】
// ==========================
const DELAY_JUDGE_HOLD_DELAY = 100;       // 延时锦囊出牌后，动画开始前的等待延迟（防止瞬间飞出）
const DELAY_JUDGE_MOVE_DURATION = 245;    // 延时锦囊从手牌飞到判定区的动画时长（你之前卡帧，这里调短了）
const DELAY_JUDGE_TARGET_SIZE = 45;       // 延时锦囊落地后的目标尺寸（缩放用，单位px）
const DELAY_JUDGE_TARGET_GAP = 25;        // 多张延时锦囊在判定区堆叠时，每张之间的水平间距（px）

// 主视角（自己）判定区坐标微调
const DELAY_JUDGE_TARGET_ME_OFFSET_X = -105; // 水平偏移：负数=左移，正数=右移
const DELAY_JUDGE_TARGET_ME_OFFSET_Y = 12;  // 垂直偏移：正数=下移，负数=上移

// 其他玩家/AI判定区坐标微调
const DELAY_JUDGE_TARGET_OTHER_OFFSET_X = 10;  // 水平偏移：负数=左移，正数=右移
const DELAY_JUDGE_TARGET_OTHER_OFFSET_Y = -22; // 垂直偏移：正数=下移，负数=上移


function getDui() {
	return decadeUIInstance || (decadeUIInstance = window.decadeUI);
}

function setBasePlayerDraw(draw) {
	baseDraw = draw;
}

function readTransform(card) {
	const result = {
		x: Number.isFinite(card.tx) ? card.tx : 0,
		y: Number.isFinite(card.ty) ? card.ty : 0,
		scale: 1,
	};
	const transform = card.style.transform || getComputedStyle(card).transform || "";
	const translate = transform.match(/translate\(\s*(-?(?:\d*\.\d+|\d+))px\s*,\s*(-?(?:\d*\.\d+|\d+))px\s*\)/);
	if (translate) {
		result.x = parseFloat(translate[1]);
		result.y = parseFloat(translate[2]);
	}
	const scale = transform.match(/scale\(\s*(-?(?:\d*\.\d+|\d+))\s*\)/);
	if (scale) result.scale = parseFloat(scale[1]);
	else if (transform && transform !== "none") {
		const Matrix = window.DOMMatrixReadOnly || window.WebKitCSSMatrix;
		if (Matrix) {
			try {
				const matrix = new Matrix(transform);
				if (Number.isFinite(matrix.m41)) result.x = matrix.m41;
				if (Number.isFinite(matrix.m42)) result.y = matrix.m42;
				const matrixScale = Math.hypot(matrix.a, matrix.b);
				if (Number.isFinite(matrixScale) && matrixScale > 0) result.scale = matrixScale;
			} catch (error) { }
		}
	}
	return result;
}

function writeTransform(card, transform) {
	card.tx = transform.x;
	card.ty = transform.y;
	card.scaled = true;
	card.style.transform = `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;
}

function cubicBezier(progress, start, control1, control2, end) {
	const rest = 1 - progress;
	return rest * rest * rest * start + 3 * rest * rest * progress * control1 + 3 * rest * progress * progress * control2 + progress * progress * progress * end;
}

function easeOutCubic(progress) {
	return 1 - Math.pow(1 - progress, 3);
}

function nowTime() {
	return typeof performance == "object" && typeof performance.now == "function" ? performance.now() : Date.now();
}

function normalizeCards(cards) {
	if (!cards) return [];
	if (Array.isArray(cards)) return cards.filter(Boolean);
	if (get.itemtype(cards) == "cards") return cards.filter(Boolean);
	return [cards].filter(Boolean);
}

function normalizeDomNodes(nodes) {
	if (!nodes) return [];
	return Array.from(nodes).filter(node => node?.nodeType === 1 && node.classList?.contains("card"));
}

function markPendingEquipEntry(player, cards) {
	if (!player) return;
	const pending = player._decadeEquipEntryAnimation || {
		cardids: new Set(),
		names: new Set(),
		until: 0,
		delayUntil: 0,
		retries: 0,
	};
	for (const card of normalizeCards(cards)) {
		if (card.cardid) pending.cardids.add(card.cardid);
		if (card.name) pending.names.add(card.name);
	}
	const now = nowTime();
	pending.until = Math.max(pending.until || 0, now + EQUIP_ENTRY_PENDING_WINDOW);
	pending.delayUntil = Math.max(pending.delayUntil || 0, now + EQUIP_ENTRY_DELAY);
	pending.retries = 0;
	player._decadeEquipEntryAnimation = pending;
	markEquipEntrySettling(player);
	ensureEquipEntryObserver(player);
}

function isPendingEquipEntryCard(card, pending) {
	if (!card || !pending) return false;
	if (pending.cardids?.size && pending.cardids.has(card.cardid)) return true;
	if (pending.names?.size && pending.names.has(card.name)) return true;
	return !pending.cardids?.size && !pending.names?.size;
}

function markEquipEntrySettling(player) {
	const equips = player?.node?.equips;
	if (!equips?.classList) return;
	equips.classList.add(EQUIP_ENTRY_SETTLING_CLASS);
	if (player._decadeEquipEntrySettlingTimer) clearTimeout(player._decadeEquipEntrySettlingTimer);
	player._decadeEquipEntrySettlingTimer = setTimeout(() => clearEquipEntrySettling(player), EQUIP_ENTRY_PENDING_WINDOW + EQUIP_ENTRY_SETTLING_CLEANUP_DELAY);
}

function clearEquipEntrySettling(player, delay = 0) {
	const equips = player?.node?.equips;
	if (player?._decadeEquipEntrySettlingTimer) {
		clearTimeout(player._decadeEquipEntrySettlingTimer);
		delete player._decadeEquipEntrySettlingTimer;
	}
	const cleanup = () => equips?.classList?.remove(EQUIP_ENTRY_SETTLING_CLASS);
	if (delay > 0) player._decadeEquipEntrySettlingTimer = setTimeout(cleanup, delay);
	else cleanup();
}

function restartEquipEntryAnimation(card) {
	if (!card?.classList) return;
	card.classList.remove("equiped");
	card.offsetWidth;
	card.classList.add("equiped");
}

function cleanupEquipEntryCard(card, saved) {
	if (!card?.parentNode) return;
	card.style.transition = saved.transition;
	card.style.willChange = saved.willChange;
	card.style.transformOrigin = saved.transformOrigin;
	card.style.overflow = saved.overflow;
	card.style.clipPath = saved.clipPath;
	card.style.webkitClipPath = saved.webkitClipPath;
	card.style.translate = saved.translate;
	if (saved.opacity) card.style.opacity = saved.opacity;
	else card.style.removeProperty("opacity");
	if (saved.transform) card.style.transform = saved.transform;
	else card.style.removeProperty("transform");
}

function copyVisualStyle(source, target) {
	const computed = getComputedStyle(source);
	for (let index = 0; index < computed.length; index++) {
		const name = computed[index];
		target.style.setProperty(name, computed.getPropertyValue(name), computed.getPropertyPriority(name));
	}
	const sourceChildren = Array.from(source.children || []);
	const targetChildren = Array.from(target.children || []);
	for (let index = 0; index < sourceChildren.length; index++) {
		if (targetChildren[index]) copyVisualStyle(sourceChildren[index], targetChildren[index]);
	}
}

function createEquipEntryClone(card) {
	const clone = card.cloneNode(true);
	copyVisualStyle(card, clone);
	clone.classList.add("decade-equip-entry-clone");
	return clone;
}

function createEquipEntryMask(parentRect, cardRect) {
	const mask = document.createElement("div");
	Object.assign(mask.style, {
		position: "absolute",
		left: `${Math.round(parentRect.left)}px`,
		top: `${Math.round(cardRect.top)}px`,
		width: `${Math.round(Math.max(parentRect.width, cardRect.left - parentRect.left + cardRect.width, cardRect.width))}px`,
		height: `${Math.round(cardRect.height)}px`,
		overflow: "hidden",
		pointerEvents: "none",
		zIndex: "120",
	});
	return mask;
}

function animateEquipEntryCard(card, delay) {
	if (!card?.parentNode || card._decadeEquipEntryAnimated) return;
	card._decadeEquipEntryAnimated = true;
	const saved = {
		transform: card.style.transform || "",
		transition: card.style.transition || "",
		opacity: card.style.opacity || "",
		willChange: card.style.willChange || "",
		transformOrigin: card.style.transformOrigin || "",
		overflow: card.style.overflow || "",
		clipPath: card.style.clipPath || "",
		webkitClipPath: card.style.webkitClipPath || "",
		translate: card.style.translate || "",
	};
	card.style.transition = "none";
	card.style.opacity = "0";
	setTimeout(() => {
		if (!card.parentNode) return;
		requestAnimationFrame(() => {
			if (!card.parentNode) return;
			const cardRect = getArenaRelativeRect(card);
			const parentRect = getArenaRelativeRect(card.parentNode);
			if (!cardRect.width || !cardRect.height) {
				cleanupEquipEntryCard(card, saved);
				return;
			}
			const mask = createEquipEntryMask(parentRect, cardRect);
			const clone = createEquipEntryClone(card);
			const endX = Math.round(cardRect.left - parentRect.left);
			const startOffset = -Math.round(cardRect.width + endX);
			Object.assign(clone.style, {
				position: "absolute",
				left: `${endX}px`,
				top: "0",
				width: `${cardRect.width}px`,
				height: `${cardRect.height}px`,
				margin: "0",
				opacity: "1",
				pointerEvents: "none",
				zIndex: "1",
				transform: `translateX(${startOffset}px)`,
				transition: "none",
				willChange: "transform",
			});
			mask.appendChild(clone);
			ui.arena.appendChild(mask);
			let cleaned = false;
			const cleanup = () => {
				if (cleaned) return;
				cleaned = true;
				clone.removeEventListener("transitionend", cleanup);
				mask.remove();
				cleanupEquipEntryCard(card, saved);
			};
			clone.addEventListener("transitionend", cleanup);
			requestAnimationFrame(() => {
				if (!mask.parentNode || !clone.parentNode) return cleanup();
				clone.style.transition = `transform ${EQUIP_ENTRY_DURATION}ms linear`;
				clone.style.transform = "translateX(0)";
			

			});
			setTimeout(cleanup, EQUIP_ENTRY_DURATION + 80);
		});
	}, Math.max(0, delay));
}


function ensureEquipEntryObserver(player) {
	if (!player?.node?.equips || player._decadeEquipEntryObserver || typeof MutationObserver != "function") return;
	const observer = new MutationObserver(records => {
		const addedCards = [];
		for (const record of records) addedCards.push(...normalizeDomNodes(record.addedNodes));
		if (addedCards.length) animatePendingEquipEntries(player, null, addedCards);
	});
	observer.observe(player.node.equips, { childList: true });
	player._decadeEquipEntryObserver = observer;
}

function animatePendingEquipEntries(player, previousCards, candidateCards) {
	const pending = player?._decadeEquipEntryAnimation;
	if (!pending) return;
	const now = nowTime();
	if (pending.until && now > pending.until) {
		delete player._decadeEquipEntryAnimation;
		clearEquipEntrySettling(player);
		return;
	}
	const previous = new Set(previousCards || []);
	const currentCards = normalizeDomNodes(player.node?.equips?.childNodes);
	const newCards = candidateCards ? normalizeDomNodes(candidateCards).filter(card => card.parentNode === player.node?.equips) : currentCards.filter(card => !previous.has(card));
	let cards = newCards.filter(card => isPendingEquipEntryCard(card, pending));
	if (!cards.length && newCards.length === 1) cards = newCards;
	if (!cards.length && !candidateCards) {
		const currentMatches = currentCards.filter(card => !card._decadeEquipEntryAnimated && isPendingEquipEntryCard(card, pending));
		if (currentMatches.length === 1) cards = currentMatches;
	}
	if (!cards.length) {
		if ((pending.retries || 0) < 4) {
			pending.retries = (pending.retries || 0) + 1;
			setTimeout(() => animatePendingEquipEntries(player, previousCards), 50);
		}
		else {
			delete player._decadeEquipEntryAnimation;
			clearEquipEntrySettling(player);
		}
		return;
	}
	const delay = Math.max(0, (pending.delayUntil || now) - now);
	// cards.forEach((card, index) => animateEquipEntryCard(card, delay + index * 45));
	cards.forEach(restartEquipEntryAnimation);
	delete player._decadeEquipEntryAnimation;
	clearEquipEntrySettling(player, EQUIP_ENTRY_SETTLING_CLEANUP_DELAY);
}

function getArenaRelativeRect(node) {
	const rect = node.getBoundingClientRect();
	const arenaRect = ui.arena.getBoundingClientRect();
	const scaleX = arenaRect.width / ui.arena.offsetWidth || 1;
	const scaleY = arenaRect.height / ui.arena.offsetHeight || 1;
	return {
		left: (rect.left - arenaRect.left) / scaleX + ui.arena.scrollLeft,
		top: (rect.top - arenaRect.top) / scaleY + ui.arena.scrollTop,
		width: rect.width / scaleX,
		height: rect.height / scaleY,
	};
}

function isUsableRect(rect) {
	return !!rect && Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.width > 0 && rect.height > 0;
}

function getDelayJudgeTargetRect(player, card) {
	const judgeNode = card?.node?.judgeMark?.node?.judge || card?.node?.judgeMark || card;
	if (judgeNode?.parentNode) {
		const rect = getArenaRelativeRect(judgeNode);
		if (isUsableRect(rect)) {
			const size = DELAY_JUDGE_TARGET_SIZE;
			return {
				left: rect.left + (rect.width - size) / 2,
				top: rect.top + (rect.height - size) / 2,
				width: size,
				height: size,
			};
		}
	}
	return getFallbackDelayJudgeTargetRect(player, card);
}

function getRectCenter(rect) {
	return {
		x: Math.round(rect.left + rect.width / 2),
		y: Math.round(rect.top + rect.height / 2),
	};
}

function getFallbackDelayJudgeTargetRect(player, card) {
	player?.checkBoundsCache?.(true);
	const playerRect = getArenaRelativeRect(player);
	const judgeCount = Math.max(0, Array.from(player?.node?.judges?.children || []).filter(item => item !== card && !item.classList?.contains("removing")).length);
	const isMe = player === game.me || player?.dataset?.position === "0";
	const size = DELAY_JUDGE_TARGET_SIZE;
	if (isMe) {
		return {
			left: Math.round(playerRect.left + DELAY_JUDGE_TARGET_ME_OFFSET_X - judgeCount * DELAY_JUDGE_TARGET_GAP),
			top: Math.round(playerRect.top + DELAY_JUDGE_TARGET_ME_OFFSET_Y),
			width: size,
			height: size,
		};
	}
	return {
		left: Math.round(playerRect.left + DELAY_JUDGE_TARGET_OTHER_OFFSET_X + judgeCount * DELAY_JUDGE_TARGET_GAP),
		top: Math.round(playerRect.top + playerRect.height + DELAY_JUDGE_TARGET_OTHER_OFFSET_Y),
		width: size,
		height: size,
	};
}

function skipDelayJudgeSourceMoveDelete() {
	this._decadeDelayJudgeMoveDeleteSkipped = true;
}

function markDelayJudgeSourceCard(card) {
	if (!card?.classList) return;
	card._decadeDelayJudgePending = true;
	card.classList.add("decade-delay-judge-source");
	if (typeof card.moveDelete == "function" && card.moveDelete !== skipDelayJudgeSourceMoveDelete) {
		card._decadeDelayJudgeOriginalMoveDelete = card.moveDelete;
		card.moveDelete = skipDelayJudgeSourceMoveDelete;
	}
}

function releaseDelayJudgeSourceCard(card) {
	if (!card) return;
	delete card._decadeDelayJudgePending;
	delete card._decadeDelayJudgeMoveDeleteSkipped;
	if (card._decadeDelayJudgeOriginalMoveDelete) {
		card.moveDelete = card._decadeDelayJudgeOriginalMoveDelete;
		delete card._decadeDelayJudgeOriginalMoveDelete;
	}
	card.classList?.remove("decade-delay-judge-source");
}

function getDelayJudgeSourceKeys(card, cards) {
	const ids = new Set();
	const names = new Set();
	for (const item of [card, ...normalizeCards(cards)]) {
		if (item?.cardid) ids.add(item.cardid);
		if (item?.name) names.add(item.name);
	}
	return { ids, names };
}

function findDelayJudgeSourceCard(card, cards) {
	const { ids, names } = getDelayJudgeSourceKeys(card, cards);
	const candidates = [];
	const add = item => {
		if (Array.isArray(item)) return item.forEach(add);
		if (!item || candidates.includes(item)) return;
		if (!item.parentNode || item._decadeDelayJudgeFlying) return;
		if (!item.classList?.contains("card") || !item.classList.contains("thrown")) return;
		candidates.push(item);
	};
	Array.from(ui.thrown || []).slice().reverse().forEach(add);
	Array.from(ui.arena?.childNodes || []).reverse().forEach(add);
	const matched = candidates.filter(item => ids.has(item.cardid) || names.has(item.name));
	return matched.find(item => item._decadeDelayJudgePending) || matched[0] || null;
}

function forgetThrownCard(source) {
	if (Array.isArray(ui.thrown)) {
		if (typeof ui.thrown.remove == "function") ui.thrown.remove(source);
		else ui.thrown = ui.thrown.filter(card => card !== source);
	}
}

function removeDelayJudgeSourceCard(source) {
	if (!source) return;
	releaseDelayJudgeSourceCard(source);
	forgetThrownCard(source);
	source.remove?.();
}

function createDelayJudgeFlightClone(source) {
	const sourceRect = getArenaRelativeRect(source);
	if (!sourceRect.width || !sourceRect.height) return null;
	const clone = source.cloneNode(true);
	copyVisualStyle(source, clone);
	clone.classList.add("decade-delay-judge-flight-clone");
	clone.classList.remove("invalided", "removing", "decade-delay-judge-source");
	clone.fixed = true;

	// ==========新增：删除出牌信息used-info，去掉飞行小字==========
	const usedTag = clone.querySelector(".used-info");
	if (usedTag) usedTag.remove();

	Object.assign(clone.style, {
		position: "absolute",
		left: `${Math.round(sourceRect.left)}px`,
		top: `${Math.round(sourceRect.top)}px`,
		width: `${Math.round(sourceRect.width)}px`,
		height: `${Math.round(sourceRect.height)}px`,
		margin: "0",
		opacity: "1",
		pointerEvents: "none",
		zIndex: "7",
		transform: "translate(0px,0px) scale(1)",
		translate: "none",
		scale: "none",
		rotate: "none",
		transformOrigin: "center center",
		transition: "none",
		willChange: "transform",
	});
	return { clone, sourceRect };
}

function animateDelayJudgeFlightClone(clone, sourceRect, targetRect, onFinish) {
	const sourceCenter = getRectCenter(sourceRect);
	const targetCenter = getRectCenter(targetRect);
	const targetHeight = Math.max(1, Math.round(targetRect.height));
	// 原比例 * 0.7，整体缩小延时锦囊动画，数值越小缩得越小
const targetScale = Math.max(0.01, (targetHeight / sourceRect.height) * 0.3);
	const startTime = nowTime();
	const step = now => {
		if (!clone.parentNode) return onFinish?.();
		const rawProgress = Math.min(Math.max((now - startTime) / DELAY_JUDGE_MOVE_DURATION, 0), 1);
		const progress = rawProgress;
		const dx = (targetCenter.x - sourceCenter.x) * progress;
		const dy = (targetCenter.y - sourceCenter.y) * progress;
		const scale = 1 + (targetScale - 1) * progress;
		clone.style.transition = "none";
		clone.style.transform = `translate(${Math.round(dx)}px,${Math.round(dy)}px) scale(${scale})`;
		if (rawProgress < 1) requestAnimationFrame(step);
		else onFinish?.();
	};
	requestAnimationFrame(step);
}

function prepareDelayJudgeAttachedCard(card) {
	if (!card?.classList) return;
	card.classList.remove("drawinghidden");
	card.classList.add("decade-delay-judge-attached", "decade-delay-judge-pending");
	card.style.transition = "none";
	card.style.webkitTransition = "none";
	card.style.animation = "none";
	card.style.webkitAnimation = "none";
	card.style.transform = "";
	card.style.opacity = "0";
	card.style.visibility = "hidden";
}

function revealDelayJudgeAttachedCard(card) {
	if (!card?.classList) return;
	card.classList.remove("drawinghidden", "decade-delay-judge-pending");
	card.classList.add("decade-delay-judge-attached");
	card.style.transition = "none";
	card.style.webkitTransition = "none";
	card.style.animation = "none";
	card.style.webkitAnimation = "none";
	card.style.transform = "";
	card.style.opacity = "";
	card.style.visibility = "";
}

function isDelayJudgeCard(card, player) {
	if (!card) return false;
	if (lib.card?.[card.name]?.type === "delay") return true;
	try {
		return get.type(card, null, player) === "delay";
	} catch (error) {
		return false;
	}
}

function animateDelayJudgeUseToPlayer(player, card, cards) {
	if (!isDelayJudgeCard(card, player)) return false;
	const source = findDelayJudgeSourceCard(card, cards);
	if (!source) return false;
	source._decadeDelayJudgeFlying = true;
	setTimeout(() => {
		if (!card.parentNode || !source.parentNode) {
			if (source.parentNode) removeDelayJudgeSourceCard(source);
			return revealDelayJudgeAttachedCard(card);
		}
		const flight = createDelayJudgeFlightClone(source);
		if (!flight) {
			removeDelayJudgeSourceCard(source);
			revealDelayJudgeAttachedCard(card);
			return;
		}
		const { clone, sourceRect } = flight;
		ui.arena.appendChild(clone);
		removeDelayJudgeSourceCard(source);
		requestAnimationFrame(() => {
			if (!clone.parentNode) return revealDelayJudgeAttachedCard(card);
			const targetRect = getDelayJudgeTargetRect(player, card);
			animateDelayJudgeFlightClone(clone, sourceRect, targetRect, () => {
				clone.remove();
				revealDelayJudgeAttachedCard(card);
			});
		});
		getDui().layout?.invalidateDiscard?.();
	}, DELAY_JUDGE_HOLD_DELAY);
	return true;
}

function getUseCardEvent(event) {
	if (!event) return null;
	if (event.name === "useCard") return event;
	if (event.blameEvent?.name === "useCard") return event.blameEvent;
	if (event.relatedEvent?.name === "useCard") return event.relatedEvent;
	return event.getParent?.("useCard") || null;
}

function shouldUseDirectEquipAnimation(cards, player) {
	if (cards?.some(card => card?._decadeEquipUseAnimation)) return true;
	const event = _status.event;
	const useEvent = getUseCardEvent(event);
	if (!useEvent || useEvent.player !== player) return false;
	if (event?.name === "lose" && event.position && event.position !== ui.ordering) return false;
	const card = useEvent.card;
	if (!card || get.type(card, null, player) !== "equip") return false;
	if (!cards?.length) return true;
	if (useEvent.cards?.length && cards.some(card => useEvent.cards.includes(card))) return true;
	if (cards.length === 1 && card.name && cards[0]?.name === card.name) return true;
	return !useEvent.cards?.length;
}

function shouldUseDirectDelayJudgeAnimation(cards, player) {
	if (cards?.some(card => card?._decadeDelayJudgePending)) return true;
	const event = _status.event;
	const useEvent = getUseCardEvent(event);
	if (!useEvent || useEvent.player !== player) return false;
	if (event?.name === "lose" && event.position && event.position !== ui.ordering) return false;
	const card = useEvent.card;
	if (!isDelayJudgeCard(card, player)) return false;
	if (!cards?.length) return true;
	if (useEvent.cards?.length && cards.some(card => useEvent.cards.includes(card))) return true;
	if (cards.length === 1 && card?.name && cards[0]?.name === card.name) return true;
	return !useEvent.cards?.length;
}

function getPlayerCardTransform(player, scale) {
	const dui = getDui();
	const arena = dui.boundsCaches.arena;
	arena.check();
	player.checkBoundsCache?.();
	return {
		x: Math.round((player.cacheWidth - arena.cardWidth) / 2 + player.cacheLeft),
		y: Math.round((player.cacheHeight - arena.cardHeight) / 2 + player.cacheTop),
		scale,
	};
}

function getEquipTargetTransform(player, index, total) {
	const arena = getDui().boundsCaches.arena;
	arena.check();
	player.checkBoundsCache?.(true);
	const targetScale = EQUIP_CARD_TARGET_HEIGHT / arena.cardHeight;
	return {
		x: Math.round(player.cacheLeft + EQUIP_CARD_TARGET_LEFT_OFFSET - arena.cardWidth / 2),
		y: Math.round(player.cacheTop + player.cacheHeight / 2 - arena.cardHeight / 2 + (index - (total - 1) / 2) * 4),
		scale: targetScale,
	};
}

function animateEquipCardToPlayer(card, player, index, total) {
	const dui = getDui();
	const arena = dui.boundsCaches.arena;
	arena.check();
	if (card.throwordered === undefined && !card.style.transform) {
		writeTransform(card, getPlayerCardTransform(player, arena.cardScale));
	} else {
		card.throwordered = undefined;
	}
	card.classList.add("thrown", "decade-equip-direct");
	card.fixed = true;
	applyCardBorder(card, player, player === game.me);
	let usedInfo = card.querySelector(".used-info");
	if (usedInfo == null) usedInfo = card.appendChild(dui.element.create("used-info"));
	card.$usedtag = usedInfo;
	dui.tryAddPlayerCardUseTag(card, player, _status.event);
	ui.arena.appendChild(card);
	const target = getEquipTargetTransform(player, index, total);
	card._decadeEquipUseDirect = true;
	card._decadeEquipDirectUntil = performance.now() + EQUIP_CARD_MOVE_DURATION;
	dui.queueNextFrameTick(() => {
		if (!card.parentNode) return;
		card.style.transition = `transform ${EQUIP_CARD_MOVE_DURATION}ms linear, opacity ${EQUIP_CARD_MOVE_DURATION}ms linear`;
		card.style.willChange = "transform, opacity";
		card.style.opacity = "0.88";
		writeTransform(card, target);
		setTimeout(() => {
			if (!card.parentNode || !card._decadeEquipUseDirect) return;
			card.style.transition = "opacity 180ms ease-out";
			card.style.opacity = "0";
			setTimeout(() => card.remove(), 190);
		}, EQUIP_CARD_MOVE_DURATION + EQUIP_CARD_CLEANUP_DELAY);
	});
	return card;
}


             
function animateGainCards(cards, layoutTarget, moveDuration = GAIN_CARD_MOVE_DURATION, removeDelay = GAIN_CARD_REMOVE_DELAY, removeDuration = GAIN_CARD_REMOVE_DURATION) {
    if (!cards.length) return;
    if (typeof requestAnimationFrame !== "function") {
        layoutTarget();
        getDui().delayRemoveCards(cards, removeDelay, removeDuration);
        return;
    }

    const starts = cards.map(readTransform);
    



    cards.forEach(card => {
        card.style.transition = "none";
        card.style.willChange = "transform";
    });

    layoutTarget();

    // ===================== 弧度控制区（这里改数字就行）=====================
    const ARC_HEIGHT = 75;  // 弧度高度，0=纯直线，20=小弧度，40=中等，80=原版弧度
    const SPREAD_OFFSET = 16; // 卡牌横向散开量，0=不偏移，16=原版散开
    // ======================================================================

    const states = cards.map((card, index) => {
        const start = starts[index];
        const end = readTransform(card);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.hypot(dx, dy);

        // 计算弧度方向（上/下）
        const midY = (start.y + end.y) / 2;
        const arenaMiddleY = ((ui.arena?.offsetHeight || window.innerHeight || 0) / 2);
        const direction = Math.abs(dy) > 1 ? (dy < 0 ? 1 : -1) : (midY < arenaMiddleY ? 1 : -1);

        // 应用弧度与偏移
        const bend = ARC_HEIGHT * direction;
        const spread = (index - (cards.length - 1) / 2) * SPREAD_OFFSET;

        return {
            card,
            start,
            end,
            control1: {
                x: start.x + dx * 0.3 + spread,
                y: start.y + dy * 0.3 + bend,
            },
            control2: {
                x: start.x + dx * 0.7 + spread,
                y: start.y + dy * 0.3 + bend,
            },
        };
    });

    states.forEach(({ card, start }) => writeTransform(card, start));

    const startTime = performance.now();
    const step = now => {
        const rawProgress = Math.min(Math.max((now - startTime) / moveDuration, 0), 1);
        const progress = easeOutCubic(rawProgress);

        for (const state of states) {
            if (!state.card.parentNode) continue;
            const transform = {
                x: cubicBezier(progress, state.start.x, state.control1.x, state.control2.x, state.end.x),
                y: cubicBezier(progress, state.start.y, state.control1.y, state.control2.y, state.end.y),
                scale: state.start.scale + (state.end.scale - state.start.scale) * progress,
            };
            writeTransform(state.card, transform);
        }

        if (rawProgress < 1) {
            requestAnimationFrame(step);
        } else {
            for (const state of states) {
                if (!state.card.parentNode) continue;
                writeTransform(state.card, state.end);
                state.card.style.transition = "";
                state.card.style.willChange = "";
            }
        }
    };

    requestAnimationFrame(step);
    getDui().delayRemoveCards(cards, removeDelay, removeDuration);
}




function playerDirectgain(cards, broadcast, gaintag) {
	const hs = this.getCards("hs");
	for (let index = 0; index < cards.length; index++) {
		if (hs.includes(cards[index])) cards.splice(index--, 1);
	}
	const handcards1 = [];
	const handcards2 = [];
	for (let index = 0; index < cards.length; index++) {
		cards[index].fix();
		if (gaintag) {
			if (typeof gaintag == "string") gaintag = [gaintag];
			gaintag.forEach(tag => cards[index].addGaintag(tag));
		}
		const sort = lib.config.sort_card(cards[index]);
		if (this == game.me) cards[index].classList.add("drawinghidden");
		if (get.is.singleHandcard() || sort > 0) handcards1.push(cards[index]);
		else handcards2.push(cards[index]);
	}
	this.node.handcards1.append(...handcards1);
	if (handcards2.length) this.node.handcards2.append(...handcards2);
	if (this == game.me || _status.video) ui.updatehl();
	if (!_status.video) {
		game.addVideo("directgain", this, get.cardsInfo(cards));
		this.update();
	}
	if (broadcast !== false) {
		game.broadcast(function (player, cards) {
			player.directgain(cards);
		}, this, cards);
	}
	return this;
}

function playerDirectgains(cards, broadcast, gaintag) {
	const hs = this.getCards("hs");
	for (var index = 0; index < cards.length; index++) {
		if (hs.includes(cards[index])) cards.splice(index--, 1);
	}
	var insertCard = function (card, node) {
		if (gaintag) {
			for (var index = 0; index < node.childNodes.length; index++) {
				var child = node.childNodes[node.childNodes.length - index - 1];
				if (!child.classList.contains("glows")) break;
				if (child.hasGaintag(gaintag)) return void node.insertBefore(card, child.nextSibling);
			}
		}
		node.appendChild(card);
	};
	for (index = 0; index < cards.length; index++) {
		cards[index].fix();
		cards[index].remove();
		if (gaintag) {
			if (typeof gaintag == "string") gaintag = [gaintag];
			gaintag.forEach(tag => cards[index].addGaintag(tag));
		}
		cards[index].classList.add("glows");
		if (this == game.me) cards[index].classList.add("drawinghidden");
		if (get.is.singleHandcard()) insertCard(cards[index], this.node.handcards1);
		else insertCard(cards[index], this.node.handcards2);
	}
	if (this == game.me || _status.video) ui.updatehl();
	if (!_status.video) {
		game.addVideo("directgains", this, { cards: get.cardsInfo(cards), gaintag });
		this.update();
	}
	if (broadcast !== false) {
		game.broadcast(function (player, cards, gaintag) {
			player.directgains(cards, null, gaintag);
		}, this, cards, gaintag);
	}
	return this;
}

function playerDraw(cards, broadcast, init) {
	if (game.chess) return baseDraw.call(this, cards, broadcast, init);
	let draws;
	let withCards;
	var event;
	if (broadcast !== false && broadcast !== "nobroadcast") {
		game.broadcast(function (player, cards, broadcast, init) {
			player.$draw(cards, broadcast, init);
		}, this, cards, broadcast, init);
	}
	if (get.itemtype(cards) == "cards") {
		draws = cards.concat();
		withCards = true;
	} else if (get.itemtype(cards) == "card") {
		draws = [cards];
		withCards = true;
	} else {
		draws = new Array(typeof cards == "number" ? cards : 1);
	}
	if (broadcast !== false) {
		if (withCards) game.addVideo("drawCard", this, get.cardsInfo(draws));
		else game.addVideo("draw", this, cards);
	}
	if (_status.event && _status.event.name) {
		event = _status.event;
		if (event.name != "gain" && !event.name.includes("raw")) withCards = true;
	}
	if (game.me == this && !withCards) return;
	const fragment = document.createDocumentFragment();
	let card;
	const dui = getDui();
	const player = this;
	for (let index = 0; index < draws.length; index++) {
		card = draws[index];
		card = card == null ? dui.element.create("card thrown drawingcard") : card.copy("thrown", "drawingcard", false);
		card.fixed = true;
		if (player !== game.me) applyCardBorder(card, player);
		draws[index] = card;
		fragment.appendChild(card);
	}
	dui.layoutDrawCards(draws, player, true);
	ui.arena.appendChild(fragment);
	dui.queueNextFrameTick(function () {
		animateGainCards(draws, function () {
			dui.layoutDrawCards(draws, player);
		});
	});
}

function playerGain2(cards, log) {
	let itemtype = get.itemtype(cards);
	if (itemtype != "cards") {
		if (itemtype != "card") return;
		itemtype = "cards";
		cards = [cards];
	}
	if (log === true) game.log(this, "获得了", cards);
	game.broadcast(function (player, cards) {
		player.$gain2(cards);
	}, this, cards);
	const gains = [];
	const draws = [];
	let card;
	let clone;
	const player = this;
	for (let index = 0; index < cards.length; index++) {
		clone = cards[index].clone;
		card = cards[index].copy("thrown", "gainingcard");
		card.fixed = true;
		if (player !== game.me) applyCardBorder(card, player);
		if (clone && clone.parentNode == ui.arena) {
			card.scaled = true;
			card.style.transform = clone.style.transform;
			gains.push(card);
		} else {
			draws.push(card);
		}
	}
	if (gains.length) game.addVideo("gain2", this, get.cardsInfo(gains));
	if (draws.length) game.addVideo("drawCard", this, get.cardsInfo(draws));
	if (cards.duiMod && this == game.me) return;
	cards = gains.concat(draws);
	const dui = getDui();
	dui.layoutDrawCards(draws, this, true);
	const fragment = document.createDocumentFragment();
	for (let index = 0; index < cards.length; index++) fragment.appendChild(cards[index]);
	ui.arena.appendChild(fragment);
	dui.queueNextFrameTick(function () {
		animateGainCards(cards, function () {
			dui.layoutDrawCards(cards, player);
		});
	});
}

function playerGive(cards, target, log, broadcast) {
	let itemtype;
	const duiMod = cards.duiMod && game.me == target;
	if (typeof cards == "number") {
		itemtype = "number";
		cards = new Array(cards);
	} else if ((itemtype = get.itemtype(cards)) == "cards") {
		cards = cards.concat();
	} else {
		if (itemtype != "card") return;
		cards = [cards];
	}
	if (broadcast !== false) {
		let videoCards = cards;
		if (itemtype == "number") {
			videoCards = cards.length;
			game.addVideo("give", this, [videoCards, target.dataset.position]);
		} else {
			game.addVideo("giveCard", this, [get.cardsInfo(videoCards), target.dataset.position]);
		}
		game.broadcast(function (player, cards, target, broadcast) {
			player.$give(cards, target, false, broadcast);
		}, this, videoCards, target, broadcast);
	}
	if (log != 0) {
		if (itemtype == "number") game.log(target, "从", this, "获得了" + get.cnNumber(cards.length) + "张牌");
		else game.log(target, "从", this, "获得了", cards);
	}
	if (this.$givemod) return void this.$givemod(cards, target);
	if (duiMod) return;
	let card;
	const dui = getDui();
	const hand = dui.boundsCaches.hand;
	hand.check();
	const draws = [];
	const player = this;
	const fragment = document.createDocumentFragment();
	for (let index = 0; index < cards.length; index++) {
		if ((card = cards[index])) {
			const copy = card.copy("card", "thrown", "gainingcard", false);
			let fromHand = player == game.me;
			if (fromHand) {
				fromHand = card.throwWith ? card.throwWith == "h" || card.throwWith == "s" : card.parentNode == player.node.handcards1;
			}
			if (fromHand) {
				copy.tx = Math.round(hand.x + card.tx);
				copy.ty = Math.round(hand.y + 30 + card.ty);
				copy.scaled = true;
				copy.style.transform = "translate(" + copy.tx + "px," + copy.ty + "px) scale(" + hand.cardScale + ")";
			} else {
				draws.push(copy);
			}
			card = copy;
		} else {
			card = dui.element.create("card thrown gainingcard");
			draws.push(card);
		}
		cards[index] = card;
		cards[index].fixed = true;
		fragment.appendChild(cards[index]);
	}
	if (draws.length) dui.layoutDrawCards(draws, player);
	ui.arena.appendChild(fragment);
	dui.queueNextFrameTick(function () {
		animateGainCards(cards, function () {
			dui.layoutDrawCards(cards, target);
		});
	});
}

function playerThrow(cards, broadcast, highlight, log) {
	let itemtype;
	const duiMod = cards.duiMod && game.me == this && !log;
	if (typeof cards == "number") {
		itemtype = "number";
		cards = new Array(cards);
	} else if ((itemtype = get.itemtype(cards)) == "cards") {
		cards = cards.concat();
	} else if (itemtype == "card") {
		cards = [cards];
	} else {
		const event = _status.event;
		if (event && event.card && event.cards === cards) {
			const virtualCard = ui.create.card().init([event.card.suit, event.card.number, event.card.name, event.card.nature]);
			if (event.card.suit == "none") virtualCard.node.suitnum.style.display = "none";
			virtualCard.dataset.virtual = 1;
			cards = [virtualCard];
		}
	}
	let card;
	let copy;
	const player = this;
	const dui = getDui();
	const hand = dui.boundsCaches.hand;
	hand.check();
	const directEquip = shouldUseDirectEquipAnimation(cards, player);
	const directDelayJudge = !directEquip && shouldUseDirectDelayJudgeAnimation(cards, player);
	for (let index = 0; index < cards.length; index++) {
		card = cards[index];
		if (card) {
			copy = card.copy("thrown");
			if (directEquip) copy._decadeEquipUseAnimation = true;
			if (directDelayJudge) markDelayJudgeSourceCard(copy);
			if (duiMod && (card.throwWith == "h" || card.throwWith == "s")) {
				copy.tx = Math.round(hand.x + card.tx);
				copy.ty = Math.round(hand.y + 30 + card.ty);
				copy.scaled = true;
				copy.throwordered = true;
				copy.style.transform = "translate(" + copy.tx + "px," + copy.ty + "px) scale(" + hand.cardScale + ")";
			}
			card = copy;
		} else {
			card = dui.element.create("card infohidden infoflip");
			card.moveTo = lib.element.card.moveTo;
			card.moveDelete = lib.element.card.moveDelete;
		}
		cards[index] = card;
	}
	if (broadcast !== false) {
		if (broadcast !== "nobroadcast") {
			game.broadcast(function (player, cards, broadcast, highlight, log) {
				player.$throw(cards, broadcast, highlight, log);
			}, this, cards, 0, broadcast, log);
		}
		game.addVideo("throw", this, [get.cardsInfo(cards), 0, log]);
	}
	cards.sort((a, b) =>
		a.tx === undefined && b.tx === undefined
			? 0
			: a.tx === undefined
				? decadeUI.config.rightLayout
					? -1
					: 1
				: b.tx === undefined
					? decadeUI.config.rightLayout
						? 1
						: -1
					: a.tx - b.tx
	);
	if (directEquip) {
		markPendingEquipEntry(player, cards);
		for (let index = 0; index < cards.length; index++) {
			animateEquipCardToPlayer(cards[index], player, index, cards.length);
		}
		if (game.chess) this.chessFocus();
		return cards[cards.length - 1];
	}
	for (let index = 0; index < cards.length; index++) {
		(card => {
			player.$throwordered2(card, log);
		})(cards[index]);
	}
	if (game.chess) this.chessFocus();
	return cards[cards.length - 1];
}

function playerThrowordered2(card, center) {
	if (_status.connectMode) ui.todiscard = [];
	const dui = getDui();
	if (card.throwordered === undefined) {
		const arena = dui.boundsCaches.arena;
		let x;
		let y;
		if (!arena.updated) arena.update();
		this.checkBoundsCache();
		if (center) {
			x = (arena.width - arena.cardWidth) / 2 - 0.08 * arena.width;
			y = (arena.height - arena.cardHeight) / 2;
		} else {
			x = (this.cacheWidth - arena.cardWidth) / 2 + this.cacheLeft;
			y = (this.cacheHeight - arena.cardHeight) / 2 + this.cacheTop;
		}
		card.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) scale(${arena.cardScale})`;
	} else {
		card.throwordered = undefined;
	}
	card.classList.add("thrown");
	if (card.fixed) return ui.arena.appendChild(card);
	let usedInfo = card.querySelector(".used-info");
	if (usedInfo == null) usedInfo = card.appendChild(dui.element.create("used-info"));
	card.$usedtag = usedInfo;
	applyCardBorder(card, this, this === game.me);
	ui.thrown.push(card);
	ui.arena.appendChild(card);
	dui.tryAddPlayerCardUseTag(card, this, _status.event);
	dui.queueNextFrameTick(dui.layoutDiscard, dui);
	return card;
}

function playerPhaseJudge(card) {
	game.addVideo("phaseJudge", this, get.cardInfo(card));
	const player = this;
	if (card[card.cardSymbol]?.cards?.length) {
		const cards = card[card.cardSymbol].cards;
		if (player.$throw(cards), lib.config.low_performance && cards[0] && cards[0].clone) {
			const time = get.time();
			_status.waitingForTransition = time;
			cards[0].clone.listenTransition(function () {
				if (_status.waitingForTransition == time && _status.paused) game.resume();
			});
			game.pause();
		} else {
			getDui().delay(451);
		}
	} else {
		const virtualCard = game.createCard(card.name, "虚拟", "");
		if (player.$throw(virtualCard), lib.config.low_performance && virtualCard && virtualCard.clone) {
			const time = get.time();
			_status.waitingForTransition = time;
			virtualCard.clone.listenTransition(function () {
				if (_status.waitingForTransition == time && _status.paused) game.resume();
			});
			game.pause();
		} else {
			getDui().delay(451);
		}
	}
}

function playerAddVirtualJudge(card, cards) {
	if (game.online) return;
	const judgeCard = card;
	const isViewAs = cards.length !== 1 || cards[0].name !== card.name || !judgeCard.isCard;
	let viewAsCard;
	if (get.itemtype(judgeCard) == "card" && judgeCard.isViewAsCard) viewAsCard = judgeCard;
	else viewAsCard = isViewAs ? game.createCard(judgeCard.name, cards.length == 1 ? get.suit(cards[0]) : "none", cards.length == 1 ? get.number(cards[0]) : 0) : cards[0];
	game.broadcastAll(
		(player, card, isViewAs, viewAsCard, cards) => {
			if (card.fix(), !card.isViewAsCard) {
				const cardSymbol = Symbol("card");
				card.cardSymbol = cardSymbol;
				card[cardSymbol] = viewAsCard;
			}
			if (card.style.transform = "", card.classList.remove("drawinghidden"), delete card._transform, isViewAs && !card.isViewAsCard) {
				card.isViewAsCard = true;
				card.destroyLog = false;
				for (let realCard of cards) {
					realCard.goto(ui.special);
					realCard.destiny = player.node.judges;
					if (realCard.destroyed) realCard._destroyed_Virtua = realCard.destroyed;
					realCard.destroyed = function (card, position, direct, event) {
						if (card._destroyed_Virtua) {
							if (typeof card._destroyed_Virtua == "function") {
								if (card._destroyed_Virtua(card, position, direct, event) === true) return true;
							} else {
								if (lib.skill[card._destroyed_Virtua]) {
									if (!direct || !direct.hasSkill(card._destroyed_Virtua)) return delete card._destroyed_Virtua, false;
								}
								if (typeof card._destroyed_Virtua == "string") return card._destroyed_Virtua == position;
								if (card._destroyed_Virtua === true) return true;
							}
						}
						return (position != "ordering" || !["phaseJudge", "executeDelayCardEffect"].includes(event.getParent().name)) && (position != "judge" || direct !== undefined);
					};
				}
			}
			const shouldAnimateDelayJudge = isDelayJudgeCard(card, player);
			if (shouldAnimateDelayJudge) prepareDelayJudgeAttachedCard(card);
			else card.classList.add("drawinghidden");
			if (isViewAs) {
				card.cards = cards || [];
				card.viewAs = viewAsCard.name;
				const judgeText = lib.translate[card.viewAs + "_bg"] || get.translation(card.viewAs)[0];
				if (card.classList.contains("fullskin") || card.classList.contains("fullborder") || card.classList.contains("fullimage")) {
					card.classList.add("fakejudge");
					if (card.classList.contains("fullimage")) {
						card.classList.remove("fullimage");
						card.classList.add("fullskin");
						card.style.backgroundImage = "";
					}
					if (window.decadeUI) card.node.judgeMark.node.judge.innerHTML = judgeText;
					else card.node.background.innerHTML = judgeText;
				}
			} else {
				delete card.viewAs;
				card.classList.remove("fakejudge");
				if (window.decadeUI) card.node.judgeMark.node.judge.innerHTML = lib.translate[card.name + "_bg"] || get.translation(card.name)[0];
			}
			player.node.judges.insertBefore(card, player.node.judges.firstChild);
			if (
				[
					"bingliang",
					"lebu",
					"shandian",
					"fulei",
					"hongshui",
					"huoshan",
					"caomu",
					"jlsgqs_shuiyanqijun",
					"jydiy_zouhuorumo",
					"jydiy_yungongliaoshang",
					"xwjh_biguanqingxiu",
					"xumou_jsrg",
					"dczixi_bingliang",
					"dczixi_lebu",
					"dczixi_shandian",
				].includes(card.name)
			) {
				let name = card.name;
				const judgeText = lib.translate[card.name + "_bg"] || get.translation(card.name) || "";
				card.node.judgeMark.node.judge.innerText = "";
				card.node.judgeMark.node.judge.style.fontSize = "";
				const suffix = (lib.config.extension_十周年UI_newDecadeStyle === "on" || lib.config.extension_十周年UI_newDecadeStyle === "othersOff") && ["bingliang", "lebu", "shandian"].includes(name) ? "1.png" : ".png";
				const path = `${lib.assetURL}extension/十周年UI/image/ui/judge-mark/`;
				const image = new Image();
				image.onload = function () {
					card.node.judgeMark.node.judge.style.backgroundImage = `url("${image.src}")`;
					card.node.judgeMark.node.judge.innerText = "";
					card.node.judgeMark.node.judge.style.fontSize = "0px";
				};
				image.onerror = function () {
					card.node.judgeMark.node.judge.style.backgroundImage = `url("${path}tongyong.png")`;
					card.node.judgeMark.node.judge.innerText = judgeText ? judgeText[0] : "";
				};
				image.src = `${path}${name}${suffix}`;
				card.node.judgeMark.node.judge.style.zIndex = "99";
				card.node.judgeMark.node.judge.parentElement.children[0].style.background = "none";
				card.node.judgeMark.node.judge.parentElement.children[0].style.display = "none";
			} else {
				card.node.judgeMark.node.judge.style.backgroundImage = `url("${lib.assetURL}extension/十周年UI/image/ui/judge-mark/tongyong.png")`;
			}
			ui.updatej(player);
			if (shouldAnimateDelayJudge && !animateDelayJudgeUseToPlayer(player, card, cards)) revealDelayJudgeAttachedCard(card);
		},
		this,
		viewAsCard,
		isViewAs,
		card,
		cards
	);
}

export {
	animatePendingEquipEntries,
	markPendingEquipEntry,
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
