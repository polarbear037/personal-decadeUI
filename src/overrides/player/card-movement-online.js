import { game, get, _status, ui, lib } from "noname";
import { applyCardBorder as applyCardBorder } from "../../ui/cardStyles.js";
import { getDrawStackStart } from "../../ui/layout-utils.js";
import { applyHandCardPosition } from "../../utils/hand-card-position.js";

let baseDraw = null;
let decadeUIInstance = null;
let equipAudioOriginal = null;
let equipAudioWrapper = null;
const activeEquipFlights = new Set();
const EQUIP_AUDIO_SUBTYPES = new Set(["equip1", "equip2", "equip3", "equip4", "equip5"]);

// ==========================
// 【摸牌/获得卡牌 动画参数】
// ==========================
const GAIN_CARD_MOVE_DURATION = 450; // 放慢摸牌/获得牌的飞行速度
const GAIN_CARD_REMOVE_DELAY = 610; // 给较慢的飞行动画留出落牌时间
const GAIN_CARD_REMOVE_DURATION = 220;

// ==========================
// 【装备牌 动画参数】
// ==========================
const EQUIP_CARD_HOLD_DELAY = 300; // 出手后保留装备牌悬停展示的时间
const EQUIP_CARD_LIFT_HEIGHT = 20; // 装备牌展示时的抬升高度（单位px）
const EQUIP_CARD_DISPLAY_SCALE = 1.15; // 展示倍率，乘以 arena.cardScale
const EQUIP_CARD_LIFT_DURATION = 220; // 装备牌抬升并放大的时长（毫秒）
const EQUIP_CARD_MOVE_DURATION = 350; // 装备牌从悬停位置飞入对应装备槽的时长
const EQUIP_CARD_CLEANUP_DELAY = 0; // 装备牌动画结束后，清理元素的延迟时间
const EQUIP_CARD_TARGET_HEIGHT = 10; // 装备牌落地后的目标高度（缩放用，单位px）
const EQUIP_CARD_TARGET_LEFT_OFFSET = -10; // 装备牌落点的水平偏移（左/右微调）
const EQUIP_CARD_REMOTE_TARGET_LEFT_OFFSET = -4; // 非主视角装备牌相对装备区左边缘再向左微调
const EXPANSION_COVER_MOVE_DURATION = 700; // 盖到武将牌上的卡牌移动速度（毫秒）

const EQUIP_ENTRY_DELAY = EQUIP_CARD_MOVE_DURATION + 220;

const ONLINE_DYNAMIC_JUDGE_MARKS = Object.freeze({
	// Online 统一使用用户指定的按钮动画布局。
	lebu: Object.freeze({ file: "FX_LBSS_icon_play_dynamic.png", size: "95%", position: "50% 80%" }),
	bingliang: Object.freeze({ file: "FX_BLCD_icon_play_dynamic.png", size: "95%", position: "50% 80%" }),
	shandian: Object.freeze({ file: "FX_SD_icon_play_dynamic.png", size: "95%", position: "50% 80%" }),
});

function applyJudgeMarkIcon(judgeNode, name, path, judgeText, suffix) {
	const request = {};
	judgeNode._decadeUIJudgeMarkRequest = request;
	const onlineDynamic = lib.config.extension_十周年UI_newDecadeStyle === "onlineUI" ? ONLINE_DYNAMIC_JUDGE_MARKS[name] : null;
	if (onlineDynamic) {
		judgeNode.style.backgroundSize = onlineDynamic.size;
		judgeNode.style.backgroundPosition = onlineDynamic.position;
		judgeNode.style.backgroundRepeat = "no-repeat";
		// 向上扩展绘制区域并保持原节点底边，避免较高的新图被 45px 标记节点裁切。
		judgeNode.style.height = "60px";
		judgeNode.style.marginTop = "-15px";
	} else {
		judgeNode.style.removeProperty("background-size");
		judgeNode.style.removeProperty("background-position");
		judgeNode.style.removeProperty("background-repeat");
		judgeNode.style.removeProperty("height");
		judgeNode.style.removeProperty("margin-top");
	}
	if (!name) {
		judgeNode.style.backgroundImage = `url("${path}tongyong.png")`;
		return;
	}
	const image = new Image();
	image.onload = function () {
		if (judgeNode._decadeUIJudgeMarkRequest !== request) return;
		judgeNode.style.backgroundImage = `url("${image.src}")`;
		judgeNode.innerText = "";
		judgeNode.style.fontSize = "0px";
	};
	image.onerror = function () {
		if (judgeNode._decadeUIJudgeMarkRequest !== request) return;
		const fallbackName = onlineDynamic ? name : "tongyong";
		judgeNode.style.backgroundImage = `url("${path}${fallbackName}.png")`;
		judgeNode.innerText = onlineDynamic ? "" : judgeText ? judgeText[0] : "";
		judgeNode.style.fontSize = onlineDynamic ? "0px" : "";
		if (onlineDynamic) {
			judgeNode.style.removeProperty("background-size");
			judgeNode.style.removeProperty("background-position");
			judgeNode.style.removeProperty("background-repeat");
			judgeNode.style.removeProperty("height");
			judgeNode.style.removeProperty("margin-top");
		}
	};
	image.src = `${path}${onlineDynamic ? onlineDynamic.file : `${name}${suffix}`}`;
}

// broadcastAll 会把回调重新编译到其他客户端；通过 game 实例注册，避免回调捕获模块局部变量。
game._decadeUIApplyJudgeMarkIcon = applyJudgeMarkIcon;

// 装备入场动画参数
const EQUIP_ENTRY_DURATION = 260; // 装备“进场/亮起”的动画时长
const EQUIP_ENTRY_PENDING_WINDOW = 1600; // 装备进场动画的最长等待窗口（超时强制结束）
const EQUIP_ENTRY_SETTLING_CLASS = "decade-equip-entry-settling";
// 装备稳定状态的CSS类名（控制最终显示样式）
const EQUIP_ENTRY_SETTLING_CLEANUP_DELAY = 0;
// 装备稳定后，清理入场动画的延迟时间

const localHandVisibilityStates = new WeakMap();
const pendingWuguGains = new WeakMap();
const handledWuguGains = new WeakMap();

// ==========================
// 【延时锦囊判定牌 动画参数】
// ==========================
const DELAY_JUDGE_HOLD_DELAY = 100; // 延时锦囊出牌后，动画开始前的等待延迟（防止瞬间飞出）
const DELAY_JUDGE_MOVE_DURATION = 370; // 放慢延时锦囊飞入判定区的速度
const DELAY_JUDGE_TARGET_SIZE = 45; // 延时锦囊落地后的目标尺寸（缩放用，单位px）
const DELAY_JUDGE_TARGET_GAP = 25; // 多张延时锦囊在判定区堆叠时，每张之间的水平间距（px）

// 主视角（自己）判定区坐标微调
const DELAY_JUDGE_TARGET_ME_OFFSET_X = -105; // 水平偏移：负数=左移，正数=右移
const DELAY_JUDGE_TARGET_ME_OFFSET_Y = 12; // 垂直偏移：正数=下移，负数=上移

// 其他玩家/AI判定区坐标微调
const DELAY_JUDGE_TARGET_OTHER_OFFSET_X = 10; // 水平偏移：负数=左移，正数=右移
const DELAY_JUDGE_TARGET_OTHER_OFFSET_Y = -22; // 垂直偏移：正数=下移，负数=上移

function getDui() {
	return decadeUIInstance || (decadeUIInstance = window.decadeUI);
}

function setBasePlayerDraw(fn) {
	baseDraw = fn;
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

function easeOutSine(progress) {
	return Math.sin((progress * Math.PI) / 2);
}

function quadraticBezier(progress, start, control, end) {
	const inverse = 1 - progress;
	return inverse ** 2 * start + 2 * inverse * progress * control + progress ** 2 * end;
}

function getOfficialBezierControlPoint(start, end, allowSeatToSeat = true) {
	const arena = getDui().boundsCaches.arena;
	arena.check();
	// 摸牌保持原有横向展开；玩家间传牌沿起终点矩形内侧的直角转向。
	if (!allowSeatToSeat) return { x: end.x, y: end.y + arena.cardWidth };
	const sameColumn = start.x === end.x;
	const sameRow = start.y === end.y;
	return {
		x: sameColumn || sameRow ? (start.x + end.x) / 2 : start.y < end.y ? start.x : end.x,
		y: sameColumn || sameRow ? (start.y + end.y) / 2 : start.y > end.y ? start.y : end.y,
	};
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

function setDrawCardStartPosition(cards) {
	if (!cards.length) return;
	const arena = getDui().boundsCaches.arena;
	const start = getDrawStackStart(cards.length, arena);
	cards.forEach((card, index) => writeTransform(card, {
		x: Math.round(start.x + index * start.spacing),
		y: Math.round(start.y),
		scale: start.scale,
	}));
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

function equipFlightMatchesCard(flight, card) {
	if (!flight || !card) return false;
	if (flight.sourceCard) {
		if (card === flight.sourceCard) return true;
		return !!card.viewAs && card.viewAs === flight.name;
	}
	if (flight.cardid && card.cardid) return flight.cardid === card.cardid;
	const cardName = card.viewAs || card.name;
	return !!flight.name && flight.name === cardName;
}

function ensureEquipAudioDeferral() {
	if (equipAudioWrapper && game.playAudio === equipAudioWrapper) return;
	if (typeof game.playAudio !== "function") return;
	equipAudioOriginal = game.playAudio;
	equipAudioWrapper = function (...args) {
		if (args[0] === "effect" && EQUIP_AUDIO_SUBTYPES.has(args[1])) {
			const flight = Array.from(activeEquipFlights).find(item => !item.completed && item.audioSubtype === args[1]);
			if (flight) {
				if (!flight.pendingAudio) flight.pendingAudio = [];
				flight.pendingAudio.push({ context: this, args });
				return;
			}
		}
		return equipAudioOriginal.apply(this, args);
	};
	game.playAudio = equipAudioWrapper;
}

function releaseEquipAudioDeferral() {
	if (activeEquipFlights.size || !equipAudioWrapper) return;
	if (game.playAudio === equipAudioWrapper) game.playAudio = equipAudioOriginal;
	equipAudioOriginal = null;
	equipAudioWrapper = null;
}

function markEquipFlight(player, card) {
	const useCard = getUseCardEvent(_status.event)?.card;
	const equippedCard = useCard && get.type(useCard, null, player) === "equip" ? useCard : card;
	const subtype = get.subtype(equippedCard);
	const flight = {
		sourceCard: card._decadeEquipSourceCard || null,
		cardid: card.cardid,
		name: equippedCard.viewAs || equippedCard.name,
		audioSubtype: subtype === "equip6" ? "equip3" : subtype,
		completed: false,
		equippedCard: null,
	};
	flight.promise = new Promise(resolve => {
		flight.resolve = resolve;
	});
	if (!Array.isArray(player._decadeEquipFlights)) player._decadeEquipFlights = [];
	player._decadeEquipFlights.push(flight);
	activeEquipFlights.add(flight);
	ensureEquipAudioDeferral();
	flight.fallbackTimer = setTimeout(
		() => finishEquipFlight(player, flight),
		EQUIP_CARD_LIFT_DURATION + EQUIP_CARD_HOLD_DELAY + EQUIP_CARD_MOVE_DURATION + 300
	);
	return flight;
}

function hideEquipFlightCard(player, card) {
	const flight = player?._decadeEquipFlights?.find(item => !item.completed && equipFlightMatchesCard(item, card));
	if (!flight) return false;
	flight.equippedCard = card;
	if (!Object.prototype.hasOwnProperty.call(card, "_decadeEquipFlightVisibility")) {
		card._decadeEquipFlightVisibility = card.style.visibility || "";
	}
	card.style.visibility = "hidden";
	return true;
}

function finishEquipFlight(player, flight) {
	if (!flight || flight.completed) return;
	flight.completed = true;
	if (flight.fallbackTimer) clearTimeout(flight.fallbackTimer);
	const equippedCards = normalizeDomNodes(player?.node?.equips?.childNodes);
	const trackedCard = flight.equippedCard;
	if (trackedCard && Object.prototype.hasOwnProperty.call(trackedCard, "_decadeEquipFlightVisibility")) {
		trackedCard.style.visibility = trackedCard._decadeEquipFlightVisibility || "";
		delete trackedCard._decadeEquipFlightVisibility;
	}
	const card = flight.equippedCard?.parentNode === player?.node?.equips
		? flight.equippedCard
		: equippedCards.find(item => equipFlightMatchesCard(flight, item));
	if (card) {
		if (Object.prototype.hasOwnProperty.call(card, "_decadeEquipFlightVisibility")) {
			card.style.visibility = card._decadeEquipFlightVisibility || "";
			delete card._decadeEquipFlightVisibility;
		}
		card._decadeEquipEntryAnimated = true;
		restartEquipEntryAnimation(card);
	}
	const flights = player?._decadeEquipFlights;
	if (Array.isArray(flights)) {
		const index = flights.indexOf(flight);
		if (index !== -1) flights.splice(index, 1);
		if (!flights.length) delete player._decadeEquipFlights;
	}
	for (const audio of flight.pendingAudio || []) equipAudioOriginal?.apply(audio.context, audio.args);
	activeEquipFlights.delete(flight);
	flight.resolve?.();
	releaseEquipAudioDeferral();
}

function isPendingEquipEntryCard(card, pending) {
	if (!card || !pending) return false;
	if (pending.cardids?.size && card.cardid) return pending.cardids.has(card.cardid);
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
	if (!card?.parentNode || card._decadeEquipEntryStyle !== saved) return;
	delete card._decadeEquipEntryStyle;
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
	card._decadeEquipEntryStyle = saved;
	card.style.transition = "none";
	card.style.opacity = "0";
	setTimeout(
		() => {
			if (!card.parentNode || card._decadeEquipEntryStyle !== saved) return;
			requestAnimationFrame(() => {
				if (!card.parentNode || card._decadeEquipEntryStyle !== saved) return;
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
		},
		Math.max(0, delay)
	);
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
	const flightCards = newCards.filter(card => hideEquipFlightCard(player, card));
	let cards = newCards.filter(card => !flightCards.includes(card) && !card._decadeEquipEntryAnimated && isPendingEquipEntryCard(card, pending));
	if (!cards.length && !flightCards.length && newCards.length === 1) cards = newCards;
	if (!cards.length && !candidateCards) {
		const currentMatches = currentCards.filter(card => !card._decadeEquipEntryAnimated && !hideEquipFlightCard(player, card) && isPendingEquipEntryCard(card, pending));
		if (currentMatches.length === 1) cards = currentMatches;
	}
	if (!cards.length) {
		if (flightCards.length) return;
		if ((pending.retries || 0) < 4) {
			pending.retries = (pending.retries || 0) + 1;
			setTimeout(() => animatePendingEquipEntries(player, previousCards), 50);
		} else {
			delete player._decadeEquipEntryAnimation;
			clearEquipEntrySettling(player);
		}
		return;
	}
	// 让装备实体牌播放 equip.css 中从左侧插入的 insertEquips 动画。
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

function getArenaRelativeTransform(node) {
	const rect = getArenaRelativeRect(node);
	const arena = getDui().boundsCaches.arena;
	arena.check();
	return {
		x: rect.left,
		y: rect.top,
		scale: rect.width && arena.cardWidth ? rect.width / arena.cardWidth : 1,
	};
}

function isLocalHandCard(card, target = game.me) {
	const handNode = target?.node?.handcards1 || (target === game.me ? ui.handcards1 : null);
	return !!card && !!handNode && card.parentNode === handNode;
}

function getLocalHandCardTarget(card, target = game.me) {
	if (!isLocalHandCard(card, target)) return null;
	const arena = getDui().boundsCaches.arena;
	arena.check();
	const transition = card.style.getPropertyValue("transition-property");
	const priority = card.style.getPropertyPriority("transition-property");
	try {
		// The real card is hidden during flight. Measure its settled layout rather
		// than an in-progress transform transition or a cached hand-area offset.
		card.style.setProperty("transition-property", "none", "important");
		const rect = getArenaRelativeRect(card);
		if (!isUsableRect(rect)) return null;
		return {
			x: rect.left + (rect.width - arena.cardWidth) / 2,
			y: rect.top + (rect.height - arena.cardHeight) / 2,
			scale: rect.width / arena.cardWidth,
		};
	} finally {
		if (transition) card.style.setProperty("transition-property", transition, priority);
		else card.style.removeProperty("transition-property");
	}
}

function getWuguContext(event = _status.event, dialogId) {
	let current = event;
	const explicitId = dialogId;
	let resolvedId = dialogId;
	for (let depth = 0; current && depth < 24; depth++) {
		if (resolvedId == null && current.preResult != null) resolvedId = current.preResult;
		if (resolvedId == null && current.dialog?.videoId != null) resolvedId = current.dialog.videoId;
		const cardName = current.card?.name || current.cardname;
		if (current.name === "wugu" || cardName === "wugu") return { event: current, dialogId: resolvedId };
		const parent = typeof current.getParent === "function" ? current.getParent() : current.parent;
		if (!parent || parent === current) break;
		current = parent;
	}
	return explicitId == null ? null : { event: null, dialogId: explicitId };
}

function findWuguDialog(dialogId) {
	const dialogs = Array.from(ui?.dialogs || []);
	let dialog = dialogId == null
		? null
		: dialogs.find(item => String(item?.videoId ?? item?.dataset?.videoId) === String(dialogId));
	if (!dialog && dialogId != null && typeof document !== "undefined") {
		dialog = Array.from(document.querySelectorAll(".dialog")).find(item => String(item?.videoId ?? item?.dataset?.videoId) === String(dialogId));
	}
	if (!dialog && dialogId == null) {
		dialog = dialogs.find(item => item?.getAttribute?.("data-dialog-name") === "wugu" || item?.dataset?.dialogName === "wugu");
	}
	return dialog || null;
}

function findWuguDialogForCard(card) {
	const cardId = card?.cardid == null ? null : String(card.cardid);
	for (const dialog of Array.from(ui?.dialogs || [])) {
		const markedWugu = dialog?.getAttribute?.("dialog-name") === "wugu"
			|| dialog?.getAttribute?.("data-dialog-name") === "wugu"
			|| dialog?.dataset?.dialogName === "wugu"
			|| dialog?.querySelector?.('[sourceCard="wugu"]')
			|| String(dialog?.content?.firstChild?.textContent || "").includes("五谷丰登");
		if (!markedWugu || !dialog.querySelectorAll) continue;
		const match = Array.from(dialog.querySelectorAll(".button, .card")).some(node => {
			if (node.link === card) return true;
			const linkId = node.link?.cardid ?? node.dataset?.cardid;
			return cardId != null && linkId != null && String(linkId) === cardId;
		});
		if (match) return dialog;
	}
	return null;
}

function getWuguSelectionStart(card, dialogId) {
	const dialog = findWuguDialog(dialogId) || findWuguDialogForCard(card);
	if (!dialog?.querySelectorAll) return null;
	const cardId = card?.cardid == null ? null : String(card.cardid);
	const candidates = Array.from(dialog.querySelectorAll(".button, .card"));
	const source = candidates.find(node => {
		if (node.link === card) return true;
		const linkId = node.link?.cardid ?? node.dataset?.cardid;
		return cardId != null && linkId != null && String(linkId) === cardId;
	});
	if (!source) return null;
	const rect = getArenaRelativeRect(source);
	if (!isUsableRect(rect)) return null;
	const arena = getDui().boundsCaches.arena;
	arena.check();
	const scale = arena.cardWidth > 0 ? rect.width / arena.cardWidth : 1;
	return {
		x: rect.left + (rect.width - arena.cardWidth) / 2,
		y: rect.top + (rect.height - arena.cardHeight) / 2,
		scale,
	};
}

function isWuguEntryInScope(entry, event, dialogId, recipient) {
	if (!entry) return false;
	const context = getWuguContext(event, dialogId);
	if (!context) return false;
	if (entry.recipient && recipient && entry.recipient !== recipient) return false;
	if (entry.dialogId != null && context.dialogId != null) return String(entry.dialogId) === String(context.dialogId);
	return !!recipient && entry.recipient === recipient && context.event;
}

function isCardInPlayerHand(card, player) {
	return !!card && (card.parentNode === player?.node?.handcards1 || card.parentNode === player?.node?.handcards2);
}

function prepareWuguGain(cards, event = _status.event, dialogId, recipient) {
	const list = normalizeCards(cards);
	const context = getWuguContext(event, dialogId);
	let found = false;
	for (const card of list) {
		const existing = pendingWuguGains.get(card);
		const handled = handledWuguGains.get(card);
		if (handled && isWuguEntryInScope(existing || handled, event, dialogId, recipient)) {
			found = true;
			continue;
		}
		if (handled && !context) continue;
		if (existing && !handled) {
			if (recipient && !existing.recipient) existing.recipient = recipient;
			found = true;
			continue;
		}
		if (!context) continue;
		const start = getWuguSelectionStart(card, context?.dialogId ?? dialogId);
		if (!start) continue;
		const dialog = findWuguDialog(context?.dialogId ?? dialogId) || findWuguDialogForCard(card);
		handledWuguGains.delete(card);
		pendingWuguGains.set(card, { start, dialogId: context?.dialogId ?? dialogId ?? dialog?.videoId, recipient });
		found = true;
	}
	return found;
}

function hasPendingWuguGain(cards, event = _status.event, dialogId, recipient) {
	const list = normalizeCards(cards);
	if (list.some(card => {
		const handled = handledWuguGains.get(card);
		return handled && isWuguEntryInScope(pendingWuguGains.get(card) || handled, event, dialogId, recipient);
	})) return true;
	return prepareWuguGain(list, event, dialogId, recipient);
}

function getWuguDialogId(cards, event = _status.event, dialogId, recipient) {
	for (const card of normalizeCards(cards)) {
		const entry = pendingWuguGains.get(card);
		if (entry?.dialogId != null && isWuguEntryInScope(entry, event, dialogId, recipient)) return entry.dialogId;
	}
	return undefined;
}

function isHandledWuguGain(cards, event = _status.event, dialogId, recipient) {
	const list = normalizeCards(cards);
	return list.length > 0 && list.every(card => {
		const entry = pendingWuguGains.get(card);
		return handledWuguGains.has(card) && isWuguEntryInScope(entry || handledWuguGains.get(card), event, dialogId, recipient);
	});
}

function isPendingWuguGain(cards, event = _status.event, dialogId, recipient) {
	const list = normalizeCards(cards);
	return list.length > 0 && list.every(card => {
		const entry = pendingWuguGains.get(card);
		return entry && !handledWuguGains.has(card) && isWuguEntryInScope(entry, event, dialogId, recipient);
	});
}

function playPendingWuguGain(cards, player, event = _status.event, dialogId) {
	const list = normalizeCards(cards);
	const flights = [];
	const localHandTargets = new Map();
	const pendingEntries = [];
	for (const sourceCard of list) {
		const entry = pendingWuguGains.get(sourceCard);
		if (!entry || handledWuguGains.has(sourceCard) || (entry.recipient && entry.recipient !== player) || !isCardInPlayerHand(sourceCard, player)) continue;
		pendingEntries.push({ sourceCard, entry });
	}
	if (!pendingEntries.length) return isHandledWuguGain(list, event, dialogId, player);
	const target = player || game.me;
	for (const { sourceCard, entry } of pendingEntries) {
		const flight = sourceCard.copy("thrown", "gainingcard");
		flight.classList.add("drawingcard");
		// 五谷副本会先插入 arena，再等待下一帧启动曲线动画。先写入
		// 选牌位置的 transform，避免浏览器用默认 left/top 在左上角绘制一帧。
		flight.style.left = "0px";
		flight.style.top = "0px";
		writeTransform(flight, entry.start);
		// 主视角的手牌根节点 z-index 为 3，副本落入手牌区后应在其后方；
		// 第三视角保持原有 gainingcard 层级，确保飞牌可见。
		if (target === game.me) flight.style.zIndex = "2";
		else flight.style.removeProperty("z-index");
		flight.fixed = true;
		flight._decadeMotionStartTransform = entry.start;
		if (target !== game.me) applyCardBorder(flight, target);
		flights.push(flight);
		handledWuguGains.set(sourceCard, { dialogId: entry.dialogId, recipient: target });
		if (target === game.me && isLocalHandCard(sourceCard, target)) localHandTargets.set(flight, sourceCard);
	}
	if (!flights.length) return true;
	game.addVideo("gain2", target, get.cardsInfo(pendingEntries.map(({ sourceCard }) => sourceCard)));
	const dui = getDui();
	const fragment = document.createDocumentFragment();
	for (const flight of flights) fragment.appendChild(flight);
	const localVisibilityEntries = hideLocalHandTargets(localHandTargets);
	let localFinished = false;
	const finishLocal = () => {
		if (localFinished) return;
		localFinished = true;
		finishLocalHandFlight(localHandTargets, localVisibilityEntries);
	};
	try {
		ui.arena.appendChild(fragment);
		dui.queueNextFrameTick(() => {
			try {
				// 主视角用获得牌曲线，避免摸牌控制点低于手牌落点造成下探回弹。
				animateGainCards(flights, () => {
					if (localHandTargets.size) applyLocalHandTargets(flights, target, localHandTargets, dui);
					else dui.layoutDrawCards(flights, target, false, { compact: true });
				}, GAIN_CARD_MOVE_DURATION, GAIN_CARD_REMOVE_DELAY, GAIN_CARD_REMOVE_DURATION, target === game.me, false, false, localVisibilityEntries.length ? finishLocal : undefined);
			} catch (error) {
				finishLocal();
				if (localVisibilityEntries.length) console.error("[十周年UI] 五谷本地获得牌动画启动失败", error);
				else throw error;
			}
		});
	} catch (error) {
		finishLocal();
		if (localVisibilityEntries.length) console.error("[十周年UI] 五谷本地获得牌动画排队失败", error);
		else throw error;
	}
	return true;
}

function collectLocalHandCards(value, handNode, result, seen) {
	if (!value) return;
	if (Array.isArray(value)) {
		value.forEach(item => collectLocalHandCards(item, handNode, result, seen));
		return;
	}
	if (typeof value !== "object" || seen.has(value)) return;
	seen.add(value);
	if (value.parentNode === handNode && value.classList?.contains("card")) result.push(value);
}

function getCurrentLocalGainCards(source, target, count) {
	const handNode = target?.node?.handcards1 || (target === game.me ? ui.handcards1 : null);
	if (!handNode || target !== game.me || count <= 0) return [];
	const event = _status.event;
	const result = [];
	const seen = new Set();
	const sourceKey = source?.playerid ?? source?.dataset?.position;
	const sourceEntry = sourceKey != null ? event?.losing_map?.[sourceKey] : null;
	collectLocalHandCards(sourceEntry, handNode, result, seen);
	if (result.length) return result.slice(0, count);
	collectLocalHandCards(event?.cards, handNode, result, seen);
	return result.slice(0, count);
}

function applyLocalHandTargets(cards, player, localHandTargets, dui) {
	dui.layoutHand?.();
	dui.layoutDrawCards(cards, player, false, { compact: true });
	for (const [card, targetCard] of localHandTargets) {
		const target = getLocalHandCardTarget(targetCard, game.me);
		if (target) writeTransform(card, target);
	}
}

function hideLocalHandTargets(localHandTargets) {
	const entries = [];
	const hidden = new Set();
	for (const [flightCard, targetCard] of localHandTargets) {
		if (!targetCard) continue;
		let state = localHandVisibilityStates.get(targetCard);
		if (!state) {
			state = {
				count: 0,
				value: targetCard.style.getPropertyValue("visibility"),
				priority: targetCard.style.getPropertyPriority("visibility"),
				opacity: targetCard.style.getPropertyValue("opacity"),
				opacityPriority: targetCard.style.getPropertyPriority("opacity"),
				transitionProperty: targetCard.style.getPropertyValue("transition-property"),
				transitionPropertyPriority: targetCard.style.getPropertyPriority("transition-property"),
			};
			localHandVisibilityStates.set(targetCard, state);
		}
		if (!hidden.has(targetCard)) {
			hidden.add(targetCard);
			state.count++;
			targetCard.style.setProperty("transition-property", "transform, left, top", "important");
			targetCard.style.setProperty("visibility", "hidden", "important");
			targetCard.style.setProperty("opacity", "0", "important");
			entries.push(targetCard);
		}
		if (state.value) flightCard.style.setProperty("visibility", state.value, state.priority);
		else flightCard.style.removeProperty("visibility");
		if (state.opacity) flightCard.style.setProperty("opacity", state.opacity, state.opacityPriority);
		else flightCard.style.removeProperty("opacity");
		if (state.transitionProperty) flightCard.style.setProperty("transition-property", state.transitionProperty, state.transitionPropertyPriority);
		else flightCard.style.removeProperty("transition-property");
	}
	return entries;
}

function restoreLocalHandTargets(entries) {
	for (const targetCard of entries || []) {
		const state = localHandVisibilityStates.get(targetCard);
		if (!state) continue;
		state.count--;
		if (state.count > 0) continue;
		if (state.value) targetCard.style.setProperty("visibility", state.value, state.priority);
		else targetCard.style.removeProperty("visibility");
		if (state.opacity) targetCard.style.setProperty("opacity", state.opacity, state.opacityPriority);
		else targetCard.style.removeProperty("opacity");
		// 先提交落地透明度，再恢复原过渡，避免恢复时出现淡入。
		getComputedStyle(targetCard).opacity;
		if (state.transitionProperty) targetCard.style.setProperty("transition-property", state.transitionProperty, state.transitionPropertyPriority);
		else targetCard.style.removeProperty("transition-property");
		localHandVisibilityStates.delete(targetCard);
	}
}

function finishLocalHandFlight(localHandTargets, visibilityEntries) {
	restoreLocalHandTargets(visibilityEntries);
	for (const card of localHandTargets.keys()) card.remove();
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
	Array.from(ui.thrown || [])
		.slice()
		.reverse()
		.forEach(add);
	Array.from(ui.arena?.childNodes || [])
		.reverse()
		.forEach(add);
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
	if (cards?.some(card => card?._decadeRemoteEquipThrow)) return false;
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

function getEquipTargetTransform(card, player, index, total) {
	const arena = getDui().boundsCaches.arena;
	arena.check();
	player.checkBoundsCache?.(true);
	const equipNum = Math.min(5, Math.max(1, Number(get.equipNum(card)) || 1));
	const slotNode = player === game.me && ui.equipSolts?.back
		? Array.from(ui.equipSolts.back.children).find(slot => Number(slot.dataset.type) === equipNum - 1)
		: null;
	let slotRect = slotNode ? getArenaRelativeRect(slotNode) : null;
	if (!isUsableRect(slotRect)) {
		const equippedCard = Array.from(player.node?.equips?.children || []).find(equipped => Number(get.equipNum(equipped)) === equipNum);
		slotRect = equippedCard ? getArenaRelativeRect(equippedCard) : null;
	}
	if (!isUsableRect(slotRect)) {
		const equipsRect = player.node?.equips ? getArenaRelativeRect(player.node.equips) : null;
		if (isUsableRect(equipsRect)) {
			const slotHeight = equipsRect.height / 5;
			slotRect = {
				left: equipsRect.left,
				top: equipsRect.top + (equipNum - 1) * slotHeight,
				width: equipsRect.width,
				height: slotHeight,
			};
		}
	}
	const targetScale = EQUIP_CARD_TARGET_HEIGHT / arena.cardHeight;
	if (isUsableRect(slotRect)) {
		return {
			x: Math.round((player === game.me && slotNode ? slotRect.left + slotRect.width / 2 : slotRect.left + EQUIP_CARD_REMOTE_TARGET_LEFT_OFFSET) - arena.cardWidth / 2),
			y: Math.round(slotRect.top + slotRect.height / 2 - arena.cardHeight / 2),
			scale: targetScale,
		};
	}
	return {
		x: Math.round(player.cacheLeft + player.cacheWidth / 2 + EQUIP_CARD_TARGET_LEFT_OFFSET - arena.cardWidth / 2),
		y: Math.round(player.cacheTop + player.cacheHeight / 2 - arena.cardHeight / 2 + (index - (total - 1) / 2) * 4),
		scale: targetScale,
	};
}

function animateEquipCardToPlayer(card, player, index, total) {
	const dui = getDui();
	const arena = dui.boundsCaches.arena;
	const flight = markEquipFlight(player, card);
	arena.check();
	let start;
	if (card._decadeEquipStartRect) {
		const sourceRect = card._decadeEquipStartRect;
		const centerX = sourceRect.left + sourceRect.width / 2;
		const centerY = sourceRect.top + sourceRect.height / 2;
		start = {
			x: Math.round(centerX - arena.cardWidth / 2),
			y: Math.round(centerY - arena.cardHeight / 2),
			scale: sourceRect.width / arena.cardWidth || arena.cardScale,
		};
		delete card._decadeEquipStartRect;
	} else if (card._decadeEquipStartTransform) {
		start = card._decadeEquipStartTransform;
		delete card._decadeEquipStartTransform;
	} else if (card.throwordered === undefined && !card.style.transform) {
		if (player === game.me && Number.isFinite(card.tx) && Number.isFinite(card.ty)) {
			const hand = dui.boundsCaches.hand;
			hand.check();
			start = {
				x: Math.round(hand.x + card.tx),
				y: Math.round(hand.y + 30 + card.ty),
				scale: hand.cardScale,
			};
		} else {
			start = getPlayerCardTransform(player, arena.cardScale);
		}
	} else {
		start = readTransform(card);
		card.throwordered = undefined;
	}
	const wasHovered = !!card._decadeEquipStartHovered;
	delete card._decadeEquipStartHovered;
	writeTransform(card, start);
	card.classList.add("thrown", "decade-equip-direct");
	card.fixed = true;
	applyCardBorder(card, player, player === game.me);
	let usedInfo = card.querySelector(".used-info");
	if (usedInfo == null) usedInfo = card.appendChild(dui.element.create("used-info"));
	card.$usedtag = usedInfo;
	dui.tryAddPlayerCardUseTag(card, player, _status.event);
	ui.arena.appendChild(card);
	const target = getEquipTargetTransform(card, player, index, total);
	card._decadeEquipUseDirect = true;
	card._decadeEquipDirectUntil = performance.now() + EQUIP_CARD_LIFT_DURATION + EQUIP_CARD_HOLD_DELAY + EQUIP_CARD_MOVE_DURATION + 120;
	card.style.transition = "none";
	card.style.willChange = "transform, opacity";
	card.style.opacity = "1";
	const display = {
		x: start.x,
		y: start.y - (wasHovered ? 0 : EQUIP_CARD_LIFT_HEIGHT),
		scale: arena.cardScale * EQUIP_CARD_DISPLAY_SCALE,
	};
	dui.queueNextFrameTick(() => {
		if (!card.parentNode) return;
		card.style.transition = `transform ${EQUIP_CARD_LIFT_DURATION}ms ease-out`;
		writeTransform(card, display);
		setTimeout(() => {
			if (!card.parentNode || !card._decadeEquipUseDirect) return;
			card.style.transition = `transform ${EQUIP_CARD_MOVE_DURATION}ms linear, opacity ${EQUIP_CARD_MOVE_DURATION}ms linear`;
			card.style.opacity = "0.88";
			writeTransform(card, target);
			setTimeout(() => finishEquipFlight(player, flight), EQUIP_CARD_MOVE_DURATION);
			setTimeout(() => {
				if (!card.parentNode || !card._decadeEquipUseDirect) return;
				card.style.transition = "opacity 180ms ease-out";
				card.style.opacity = "0";
				setTimeout(() => card.remove(), 190);
			}, EQUIP_CARD_MOVE_DURATION + EQUIP_CARD_CLEANUP_DELAY);
		}, EQUIP_CARD_LIFT_DURATION + EQUIP_CARD_HOLD_DELAY);
	});
	return card;
}

function animateGainCards(cards, layoutTarget, moveDuration = GAIN_CARD_MOVE_DURATION, removeDelay = GAIN_CARD_REMOVE_DELAY, removeDuration = GAIN_CARD_REMOVE_DURATION, allowSeatToSeat = false, coverLoop = false, coverLoopUpward = false, onComplete) {
	if (!cards.length) {
		onComplete?.();
		return;
	}
	if (typeof requestAnimationFrame !== "function") {
		layoutTarget();
		onComplete?.();
		getDui().delayRemoveCards(cards, removeDelay, removeDuration);
		return;
	}

	const starts = cards.map(card => card._decadeMotionStartTransform || readTransform(card));

	cards.forEach(card => {
		card.style.transition = "none";
		card.style.willChange = "transform";
	});

	const followPlayer = layoutTarget()?.followPlayer;
	const followOrigin = followPlayer && {
		x: followPlayer.cacheLeft + followPlayer.cacheWidth / 2,
		y: followPlayer.cacheTop + followPlayer.cacheHeight / 2,
	};

	const states = cards.map((card, index) => {
		const start = starts[index];
		const end = readTransform(card);
		const useSeatToSeatCurve = typeof allowSeatToSeat === "function" ? allowSeatToSeat(card, index) : allowSeatToSeat;
		const control = getOfficialBezierControlPoint(start, end, useSeatToSeatCurve);
		const leftCardCount = cards.length === 1 ? 1 : cards.length - 1;
		delete card._decadeMotionStartTransform;
		return {
			card,
			start,
			end,
			control,
			useSeatToSeatCurve,
			coverLoopSide: coverLoop ? (cards.length === 1 || index < cards.length - 1 ? -1 : 1) : 0,
			coverLoopDepth: coverLoop && index < leftCardCount
				? leftCardCount === 1 ? Number(cards.length > 1) : index / (leftCardCount - 1)
				: 0,
		};
	});

	states.forEach(({ card, start }) => writeTransform(card, start));

	const startTime = performance.now();
	let completed = false;
	const complete = () => {
		if (completed) return;
		completed = true;
		onComplete?.();
	};
	const step = now => {
		try {
			const rawProgress = Math.min(Math.max((now - startTime) / moveDuration, 0), 1);
			const progress = easeOutSine(rawProgress);
			const loopOffset = coverLoop ? Math.sin(Math.PI * progress) * getDui().boundsCaches.arena.cardWidth * 0.45 : 0;
			const followX = followOrigin && followPlayer.isConnected !== false
				? followPlayer.offsetLeft + followPlayer.offsetWidth / 2 - followOrigin.x : 0;
			const followY = followOrigin && followPlayer.isConnected !== false
				? followPlayer.offsetTop + followPlayer.offsetHeight / 2 - followOrigin.y : 0;

			for (const state of states) {
				if (!state.card.parentNode) continue;
				// 接牌角色可能仍处于布局过渡中，终点跟随其当前位置，避免落在过渡前的位置。
				const end = followOrigin ? { ...state.end, x: state.end.x + followX, y: state.end.y + followY } : state.end;
				const control = followOrigin ? getOfficialBezierControlPoint(state.start, end, state.useSeatToSeatCurve) : state.control;
				state.followEnd = end;
				const linearX = state.start.x + (end.x - state.start.x) * progress;
				const linearY = state.start.y + (end.y - state.start.y) * progress;
				const transform = {
					x: state.coverLoopSide
						? linearX + state.coverLoopSide * loopOffset
						: quadraticBezier(progress, state.start.x, control.x, end.x),
					y: state.coverLoopSide
						? linearY + loopOffset * (coverLoopUpward ? -1 : 1) * (1 + state.coverLoopDepth * 0.35)
						: quadraticBezier(progress, state.start.y, control.y, end.y),
					scale: state.start.scale + (state.end.scale - state.start.scale) * progress,
				};
				writeTransform(state.card, transform);
			}

			if (rawProgress < 1) {
				requestAnimationFrame(step);
			} else {
				for (const state of states) {
					if (!state.card.parentNode) continue;
					writeTransform(state.card, state.followEnd || state.end);
					state.card.style.transition = "";
					state.card.style.willChange = "";
				}
				complete();
			}
		} catch (error) {
			if (onComplete) complete();
			throw error;
		}
	};

	requestAnimationFrame(step);
	getDui().delayRemoveCards(cards, removeDelay, removeDuration);
}

function animateCardAlongBezier(card, start, end, duration, onComplete) {
	const control = getOfficialBezierControlPoint(start, end, true);
	const startTime = performance.now();
	const step = now => {
		if (!card.parentNode) return;
		const rawProgress = Math.min((now - startTime) / duration, 1);
		const progress = easeOutSine(rawProgress);
		writeTransform(card, {
			x: quadraticBezier(progress, start.x, control.x, end.x),
			y: quadraticBezier(progress, start.y, control.y, end.y),
			scale: start.scale + (end.scale - start.scale) * progress,
		});
		card.style.opacity = String(progress < 0.78 ? 1 : 1 - (progress - 0.78) / 0.22);
		if (rawProgress < 1) requestAnimationFrame(step);
		else {
			writeTransform(card, end);
			card.style.opacity = "0";
			card.style.willChange = "";
			onComplete?.();
		}
	};
	card.style.willChange = "transform, opacity";
	requestAnimationFrame(step);
}

function playerDirectgain(cards, broadcast, gaintag) {
	const hs = this.getCards("hs");
	for (let index = 0; index < cards.length; index++) {
		if (hs.includes(cards[index])) cards.splice(index--, 1);
	}
	const cards1 = [];
	const cards2 = [];
	for (let index = 0; index < cards.length; index++) {
		cards[index].fix();
		if (gaintag) {
			if (typeof gaintag == "string") gaintag = [gaintag];
			gaintag.forEach(tag => cards[index].addGaintag(tag));
		}
		const sort = lib.config.sort_card(cards[index]);
		if (this == game.me) cards[index].classList.add("drawinghidden");
		if (get.is.singleHandcard() || sort > 0) cards1.push(cards[index]);
		else cards2.push(cards[index]);
	}
	this.node.handcards1.append(...cards1);
	if (cards2.length) this.node.handcards2.append(...cards2);
	if (this == game.me || _status.video) ui.updatehl();
	if (!_status.video) {
		game.addVideo("directgain", this, get.cardsInfo(cards));
		this.update();
	}
	if (broadcast !== false) {
		game.broadcast(
			function (player, cards) {
				player.directgain(cards);
			},
			this,
			cards
		);
	}
	if (hasPendingWuguGain(cards, _status.event, undefined, this)) playPendingWuguGain(cards, this, _status.event);
	return this;
}

function playerDirectgains(cards, broadcast, gaintag) {
	const hs = this.getCards("hs");
	for (var index = 0; index < cards.length; index++) {
		if (hs.includes(cards[index])) cards.splice(index--, 1);
	}
	var addLast = function (card, node) {
		if (gaintag) {
			for (var index = 0; index < node.childNodes.length; index++) {
				var add = node.childNodes[node.childNodes.length - index - 1];
				if (!add.classList.contains("glows")) break;
				if (add.hasGaintag(gaintag)) return void node.insertBefore(card, add.nextSibling);
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
		if (get.is.singleHandcard()) addLast(cards[index], this.node.handcards1);
		else addLast(cards[index], this.node.handcards2);
	}
	if (this == game.me || _status.video) ui.updatehl();
	if (!_status.video) {
		game.addVideo("directgains", this, { cards: get.cardsInfo(cards), gaintag });
		this.update();
	}
	if (broadcast !== false) {
		game.broadcast(
			function (player, cards, gaintag) {
				player.directgains(cards, null, gaintag);
			},
			this,
			cards,
			gaintag
		);
	}
	return this;
}

function playerDraw(num, init, config) {
	if (game.chess) return baseDraw.call(this, num, init, config);
	let draws;
	let cards;
	var isDrawCard;
	if (init !== false && init !== "nobroadcast") {
		game.broadcast(
			function (player, num, init, config) {
				player.$draw(num, init, config);
			},
			this,
			num,
			init,
			config
		);
	}
	if (get.itemtype(num) == "cards") {
		draws = num.concat();
		cards = true;
	} else if (get.itemtype(num) == "card") {
		draws = [num];
		cards = true;
	} else {
		draws = new Array(typeof num == "number" ? num : 1);
	}
	if (init !== false) {
		if (cards) game.addVideo("drawCard", this, get.cardsInfo(draws));
		else game.addVideo("draw", this, num);
	}
	if (_status.event && _status.event.name) {
		isDrawCard = _status.event;
		if (isDrawCard.name != "gain" && !isDrawCard.name.includes("raw")) cards = true;
	}
	if (game.me == this && !cards) return;
	const fragment = document.createDocumentFragment();
	let card;
	const _dui = getDui();
	const player = this;
	for (let index = 0; index < draws.length; index++) {
		card = draws[index];
		card = card == null ? _dui.element.create("card thrown drawingcard") : card.copy("thrown", "drawingcard", false);
		card.fixed = true;
		if (player !== game.me) applyCardBorder(card, player);
		draws[index] = card;
		fragment.appendChild(card);
	}
	setDrawCardStartPosition(draws);
	ui.arena.appendChild(fragment);
	_dui.queueNextFrameTick(function () {
		animateGainCards(draws, function () {
			player.checkBoundsCache?.(true);
			_dui.layoutDrawCards(draws, player, false, { compact: true });
			return { followPlayer: player };
		});
	});
}

function playerGain2(cards, log, dialogId) {
	let type = get.itemtype(cards);
	if (type != "cards") {
		if (type != "card") return;
		type = "cards";
		cards = [cards];
	}
	if (log === true) game.log(this, "获得了", cards);
	prepareWuguGain(cards, _status.event, dialogId, this);
	const wuguDialogId = getWuguDialogId(cards, _status.event, dialogId, this) ?? dialogId;
	game.broadcast(
		function (player, cards, dialogId) {
			player.$gain2(cards, undefined, dialogId);
		},
		this,
		cards,
		wuguDialogId
	);
	if (isHandledWuguGain(cards, _status.event, dialogId, this) || isPendingWuguGain(cards, _status.event, dialogId, this)) {
		playPendingWuguGain(cards, this, _status.event, dialogId);
		return;
	}
	const gains = [];
	const draws = [];
	const seatToSeatCards = new Set();
	const localHandTargets = new Map();
	let card;
	let clone;
	const player = this;
	for (let index = 0; index < cards.length; index++) {
		const sourceCard = cards[index];
		clone = sourceCard.clone;
		card = sourceCard.copy("thrown", "gainingcard");
		card.fixed = true;
		if (player !== game.me) applyCardBorder(card, player);
		const sourceNode = clone && ui.arena.contains(clone) ? clone : ui.arena.contains(sourceCard) ? sourceCard : null;
		if (sourceNode) {
			card.scaled = true;
			card.style.transform = sourceNode.style.transform;
			card._decadeMotionStartTransform = getArenaRelativeTransform(sourceNode);
			gains.push(card);
			seatToSeatCards.add(card);
		} else {
			draws.push(card);
		}
		if (player === game.me && isLocalHandCard(sourceCard, player)) localHandTargets.set(card, sourceCard);
	}
	if (gains.length) game.addVideo("gain2", this, get.cardsInfo(gains));
	if (draws.length) game.addVideo("drawCard", this, get.cardsInfo(draws));
	if (cards.duiMod && this == game.me) return;
	cards = gains.concat(draws);
	const _dui = getDui();
	setDrawCardStartPosition(draws);
	const fragment = document.createDocumentFragment();
	for (let i = 0; i < cards.length; i++) fragment.appendChild(cards[i]);
	const localVisibilityEntries = hideLocalHandTargets(localHandTargets);
	let localFinished = false;
	const finishLocal = () => {
		if (localFinished) return;
		localFinished = true;
		finishLocalHandFlight(localHandTargets, localVisibilityEntries);
	};
	try {
		ui.arena.appendChild(fragment);
		_dui.queueNextFrameTick(function () {
			try {
				animateGainCards(cards, function () {
					if (localHandTargets.size) applyLocalHandTargets(cards, player, localHandTargets, _dui);
					else _dui.layoutDrawCards(cards, player, false, { compact: true });
				}, GAIN_CARD_MOVE_DURATION, GAIN_CARD_REMOVE_DELAY, GAIN_CARD_REMOVE_DURATION, card => seatToSeatCards.has(card), false, false, localVisibilityEntries.length ? finishLocal : undefined);
			} catch (error) {
				finishLocal();
				if (localVisibilityEntries.length) console.error("[十周年UI] 本地获得牌动画启动失败", error);
				else throw error;
			}
		});
	} catch (error) {
		finishLocal();
		if (localVisibilityEntries.length) console.error("[十周年UI] 本地获得牌动画排队失败", error);
		else throw error;
	}
}

function playerGive(cards, target, log, record) {
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
	if (record !== false) {
		let cards2 = cards;
		if (itemtype == "number") {
			cards2 = cards.length;
			game.addVideo("give", this, [cards2, target.dataset.position]);
		} else {
			game.addVideo("giveCard", this, [get.cardsInfo(cards2), target.dataset.position]);
		}
		game.broadcast(
			function (source, cards2, target, record) {
				source.$give(cards2, target, false, record);
			},
			this,
			cards2,
			target,
			record
		);
	}
	if (log != 0) {
		if (itemtype == "number") game.log(target, "从", this, "获得了" + get.cnNumber(cards.length) + "张牌");
		else game.log(target, "从", this, "获得了", cards);
	}
	if (this.$givemod) return void this.$givemod(cards, target);
	if (duiMod) return;
	const giveToExpansion = isExpansionGiveTo(target);
	const useOnlineLocalExpansionMotion = lib.config.extension_十周年UI_newDecadeStyle === "onlineUI" && this === game.me;
	let card;
	const _dui = getDui();
	const hand = _dui.boundsCaches.hand;
	hand.check();
	const arena = _dui.boundsCaches.arena;
	arena.check();
	const draws = [];
	const localHandTargets = new Map();
	const player = this;
	const fragment = document.createDocumentFragment();
	const localHandCards = getCurrentLocalGainCards(player, target, cards.length);
	for (let index = 0; index < cards.length; index++) {
		const sourceCard = cards[index];
		const targetCard = sourceCard || localHandCards[index];
		if (sourceCard) {
			const isLocalTargetCard = target === game.me && isLocalHandCard(sourceCard, target);
			const sourceTransform = !isLocalTargetCard && ui.arena.contains(sourceCard) ? getArenaRelativeTransform(sourceCard) : null;
			const copy = sourceCard.copy("card", "thrown", "gainingcard", false);
			if (sourceTransform) copy._decadeMotionStartTransform = sourceTransform;
			let fromHand = player == game.me;
			if (fromHand) {
				fromHand = sourceCard.throwWith ? sourceCard.throwWith == "h" || sourceCard.throwWith == "s" : sourceCard.parentNode == player.node.handcards1;
			}
			if (fromHand) {
				copy.tx = Math.round(hand.x + sourceCard.tx);
				copy.ty = Math.round(hand.y + 30 + sourceCard.ty);
				copy.scaled = true;
				copy.style.transform = "translate(" + copy.tx + "px," + copy.ty + "px) scale(" + hand.cardScale + ")";
			} else {
				draws.push(copy);
			}
			card = copy;
		} else {
			card = _dui.element.create("card thrown gainingcard");
			draws.push(card);
		}
		if (target === game.me && isLocalHandCard(targetCard, target)) localHandTargets.set(card, targetCard);
		cards[index] = card;
		cards[index].fixed = true;
		fragment.appendChild(cards[index]);
	}
	if (draws.length) _dui.layoutDrawCards(draws, player);
	const localVisibilityEntries = giveToExpansion ? [] : hideLocalHandTargets(localHandTargets);
	let localFinished = false;
	const finishLocal = () => {
		if (localFinished) return;
		localFinished = true;
		finishLocalHandFlight(localHandTargets, localVisibilityEntries);
	};
	try {
		ui.arena.appendChild(fragment);
		_dui.queueNextFrameTick(function () {
			const play = () => {
				if (giveToExpansion) {
					const targetTransform = getPlayerCardTransform(target, arena.cardScale);
					const cardSpacing = Math.max(12, arena.cardWidth - 110);
					animateGainCards(cards, () => {
						cards.forEach((card, index) => writeTransform(card, {
							x: targetTransform.x + ((useOnlineLocalExpansionMotion ? cards.length - 1 - index : index) - (cards.length - 1) / 2) * cardSpacing,
							y: targetTransform.y,
							scale: targetTransform.scale,
						}));
					}, EXPANSION_COVER_MOVE_DURATION, EXPANSION_COVER_MOVE_DURATION, 180, true, true, useOnlineLocalExpansionMotion);
					return;
				}
				animateGainCards(cards, function () {
					if (localHandTargets.size) applyLocalHandTargets(cards, target, localHandTargets, _dui);
					else _dui.layoutDrawCards(cards, target);
				}, 750, 750, GAIN_CARD_REMOVE_DURATION, true, false, false, localVisibilityEntries.length ? finishLocal : undefined);
			};
			if (!localVisibilityEntries.length) return play();
			try {
				play();
			} catch (error) {
				finishLocal();
				console.error("[十周年UI] 本地给予牌动画启动失败", error);
			}
		});
	} catch (error) {
		finishLocal();
		if (localVisibilityEntries.length) console.error("[十周年UI] 本地给予牌动画排队失败", error);
		else throw error;
	}
}

function isExpansionGiveTo(target) {
	const event = _status.event;
	if (event?.name === "addToExpansion" && event.player === target) return true;
	return event?.getParent?.("addToExpansion", false, true)?.player === target;
}

function playerThrow(cards, time, record, nosource) {
	let itemtype;
	const duiMod = cards.duiMod && game.me == this && !nosource;
	if (typeof cards == "number") {
		itemtype = "number";
		cards = new Array(cards);
	} else if ((itemtype = get.itemtype(cards)) == "cards") {
		cards = cards.concat();
	} else if (itemtype == "card") {
		cards = [cards];
	} else {
		const evt = _status.event;
		if (evt && evt.card && evt.cards === cards) {
			const card = ui.create.card().init([evt.card.suit, evt.card.number, evt.card.name, evt.card.nature]);
			if (evt.card.suit == "none") card.node.suitnum.style.display = "none";
			card.dataset.virtual = 1;
			cards = [card];
		}
	}
	let card;
	let clone;
	const player = this;
	const _dui = getDui();
	const hand = _dui.boundsCaches.hand;
	hand.check();
	const directEquip = shouldUseDirectEquipAnimation(cards, player);
	const directDelayJudge = !directEquip && shouldUseDirectDelayJudgeAnimation(cards, player);
	for (let index = 0; index < cards.length; index++) {
		card = cards[index];
		if (card) {
			const sourceCard = card;
			clone = sourceCard.copy("thrown");
			if (directEquip) clone._decadeEquipSourceCard = sourceCard;
			if (directEquip && ui.arena.contains(sourceCard)) {
				clone._decadeEquipStartRect = getArenaRelativeRect(sourceCard);
				clone._decadeEquipStartHovered = sourceCard.classList.contains("selected");
			}
			if (directEquip) clone._decadeEquipUseAnimation = true;
			if (directDelayJudge) markDelayJudgeSourceCard(clone);
			if (duiMod && (card.throwWith == "h" || card.throwWith == "s") && !applyHandCardPosition(card, clone, player, _dui.boundsCaches.arena)) {
				clone.tx = Math.round(hand.x + card.tx);
				clone.ty = Math.round(hand.y + 30 + card.ty);
				clone.scaled = true;
				clone.throwordered = true;
				clone.style.transform = "translate(" + clone.tx + "px," + clone.ty + "px) scale(" + hand.cardScale + ")";
			}
			card = clone;
		} else {
			card = _dui.element.create("card infohidden infoflip");
			card.moveTo = lib.element.card.moveTo;
			card.moveDelete = lib.element.card.moveDelete;
		}
		cards[index] = card;
	}
	if (time !== false) {
		if (time !== "nobroadcast") {
			game.broadcast(
				function (player, cards, time, record, nosource, equipUseAnimation) {
					const remoteCards = Array.isArray(cards) ? cards : [cards];
					remoteCards.forEach(card => { if (card && typeof card === "object") card._decadeRemoteEquipThrow = true; });
					let shownCard;
					try {
						shownCard = player.$throw(cards, false, false, nosource, false);
					} finally {
						remoteCards.forEach(card => { if (card && typeof card === "object") delete card._decadeRemoteEquipThrow; });
					}
					if (!equipUseAnimation || !shownCard || shownCard._decadeEquipUseDirect || !shownCard.style || !ui.arena?.contains(shownCard)) return;
					if (Array.isArray(ui.thrown)) {
						const thrownIndex = ui.thrown.indexOf(shownCard);
						if (thrownIndex !== -1) ui.thrown.splice(thrownIndex, 1);
					}
					shownCard.fixed = true;
					const arenaRect = ui.arena.getBoundingClientRect();
					const cardRect = shownCard.getBoundingClientRect();
					const arenaScaleX = arenaRect.width / (ui.arena.clientWidth || arenaRect.width) || 1;
					const arenaScaleY = arenaRect.height / (ui.arena.clientHeight || arenaRect.height) || 1;
					const cardWidth = shownCard.offsetWidth || cardRect.width / arenaScaleX;
					const cardHeight = shownCard.offsetHeight || cardRect.height / arenaScaleY;
					const start = {
						x: (cardRect.left - arenaRect.left) / arenaScaleX,
						y: (cardRect.top - arenaRect.top) / arenaScaleY,
						scale: cardRect.height / arenaScaleY / cardHeight,
					};
					const equipNum = Math.min(5, Math.max(1, Number(get.equipNum(shownCard)) || 1));
					let slot = player === game.me && ui.equipSolts?.back
						? Array.from(ui.equipSolts.back.children).find(item => Number(item.dataset.type) === equipNum - 1)
						: null;
					let slotRect = slot?.getBoundingClientRect();
					if (!slotRect || !slotRect.width || !slotRect.height) {
						const equipped = Array.from(player.node?.equips?.children || []).find(item => Number(get.equipNum(item)) === equipNum);
						slotRect = equipped?.getBoundingClientRect();
					}
					if (!slotRect || !slotRect.width || !slotRect.height) {
						const equipsRect = player.node?.equips?.getBoundingClientRect?.();
						if (equipsRect?.width && equipsRect.height) {
							const slotHeight = equipsRect.height / 5;
							slotRect = { left: equipsRect.left, top: equipsRect.top + (equipNum - 1) * slotHeight, width: equipsRect.width, height: slotHeight };
						}
					}
					if (!slotRect?.width || !slotRect.height) return;
					const targetScale = 10 / cardHeight;
					const target = {
						x: (slotRect.left - arenaRect.left) / arenaScaleX - cardWidth * targetScale / 2 - 4,
						y: (slotRect.top - arenaRect.top) / arenaScaleY + slotRect.height / arenaScaleY / 2 - cardHeight * targetScale / 2,
						scale: targetScale,
					};
					const writeTransform = (x, y, scale) => { shownCard.style.transform = `translate(${x}px,${y}px) scale(${scale})`; };
					shownCard.style.transformOrigin = "0 0";
					shownCard.style.willChange = "transform, opacity";
					shownCard.style.transition = "none";
					writeTransform(start.x, start.y, start.scale);
					requestAnimationFrame(() => {
						if (!shownCard.parentNode) return;
						shownCard.style.transition = "transform 220ms ease-out";
						writeTransform(start.x, start.y - 20, start.scale * 1.15);
						setTimeout(() => {
							if (!shownCard.parentNode) return;
							shownCard.style.transition = "transform 350ms linear, opacity 350ms linear";
							shownCard.style.opacity = "0.88";
							writeTransform(target.x, target.y, target.scale);
							setTimeout(() => {
								shownCard.style.transition = "opacity 180ms ease-out";
								shownCard.style.opacity = "0";
								setTimeout(() => shownCard.remove(), 190);
							}, 350);
						}, 520);
					});
				},
				this,
				cards,
				0,
				time,
				nosource,
				directEquip
			);
		}
		game.addVideo("throw", this, [get.cardsInfo(cards), 0, nosource]);
	}
	cards.sort((a, b) => (a.tx === undefined && b.tx === undefined ? 0 : a.tx === undefined ? (decadeUI.config.rightLayout ? -1 : 1) : b.tx === undefined ? (decadeUI.config.rightLayout ? 1 : -1) : a.tx - b.tx));
	if (directEquip) {
		markPendingEquipEntry(player, cards);
		for (let index = 0; index < cards.length; index++) {
			animateEquipCardToPlayer(cards[index], player, index, cards.length);
		}
		if (game.chess) this.chessFocus();
		return cards[cards.length - 1];
	}
	for (let i = 0; i < cards.length; i++) {
		(card => {
			player.$throwordered2(card, nosource);
		})(cards[i]);
	}
	if (game.chess) this.chessFocus();
	return cards[cards.length - 1];
}

function playerThrowordered2(card, nosource) {
	if (_status.connectMode) ui.todiscard = [];
	const _dui = getDui();
	if (card.throwordered === undefined) {
		const arena = _dui.boundsCaches.arena;
		let x;
		let y;
		if (!arena.updated) arena.update();
		this.checkBoundsCache();
		if (nosource) {
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
	let tagNode = card.querySelector(".used-info");
	if (tagNode == null) tagNode = card.appendChild(_dui.element.create("used-info"));
	card.$usedtag = tagNode;
	applyCardBorder(card, this, this === game.me);
	ui.thrown.push(card);
	ui.arena.appendChild(card);
	_dui.tryAddPlayerCardUseTag(card, this, _status.event);
	_dui.queueNextFrameTick(_dui.layoutDiscard, _dui);
	return card;
}

function playerPhaseJudge(card) {
	game.addVideo("phaseJudge", this, get.cardInfo(card));
	const player = this;
	if (card[card.cardSymbol]?.cards?.length) {
		const cards = card[card.cardSymbol].cards;
		if ((player.$throw(cards), lib.config.low_performance && cards[0] && cards[0].clone)) {
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
		if ((player.$throw(virtualCard), lib.config.low_performance && virtualCard && virtualCard.clone)) {
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

function playerAddVirtualJudge(VCard, cards) {
	if (game.online) return;
	const card = VCard;
	const isViewAsCard = cards.length !== 1 || cards[0].name !== VCard.name || !card.isCard;
	let cardx;
	if (get.itemtype(card) == "card" && card.isViewAsCard) cardx = card;
	else cardx = isViewAsCard ? game.createCard(card.name, cards.length == 1 ? get.suit(cards[0]) : "none", cards.length == 1 ? get.number(cards[0]) : 0) : cards[0];
	game.broadcastAll(
		(player, cardx, isViewAsCard, VCard, cards) => {
			if ((cardx.fix(), !cardx.isViewAsCard)) {
				const cardSymbol = Symbol("card");
				cardx.cardSymbol = cardSymbol;
				cardx[cardSymbol] = VCard;
			}
			if (((cardx.style.transform = ""), cardx.classList.remove("drawinghidden"), delete cardx._transform, isViewAsCard && !cardx.isViewAsCard)) {
				cardx.isViewAsCard = true;
				cardx.destroyLog = false;
				for (let realCard of cards) {
					realCard.goto(ui.special);
					realCard.destiny = player.node.judges;
					if (realCard.destroyed) realCard._destroyed_Virtua = realCard.destroyed;
					realCard.destroyed = function (card, id, player, event) {
						if (card._destroyed_Virtua) {
							if (typeof card._destroyed_Virtua == "function") {
								if (card._destroyed_Virtua(card, id, player, event) === true) return true;
							} else {
								if (lib.skill[card._destroyed_Virtua]) {
									if (!player || !player.hasSkill(card._destroyed_Virtua)) return (delete card._destroyed_Virtua, false);
								}
								if (typeof card._destroyed_Virtua == "string") return card._destroyed_Virtua == id;
								if (card._destroyed_Virtua === true) return true;
							}
						}
						return (id != "ordering" || !["phaseJudge", "executeDelayCardEffect"].includes(event.getParent().name)) && (id != "judge" || player !== undefined);
					};
				}
			}
			const judgeMarkMap = isDelayJudgeCard(cardx, player);
			if (judgeMarkMap) prepareDelayJudgeAttachedCard(cardx);
			else cardx.classList.add("drawinghidden");
			if (isViewAsCard) {
				cardx.cards = cards || [];
				cardx.viewAs = VCard.name;
				const judgeText = lib.translate[cardx.viewAs + "_bg"] || get.translation(cardx.viewAs)[0];
				if (cardx.classList.contains("fullskin") || cardx.classList.contains("fullborder") || cardx.classList.contains("fullimage")) {
					cardx.classList.add("fakejudge");
					if (cardx.classList.contains("fullimage")) {
						cardx.classList.remove("fullimage");
						cardx.classList.add("fullskin");
						cardx.style.backgroundImage = "";
					}
					if (window.decadeUI) cardx.node.judgeMark.node.judge.innerHTML = judgeText;
					else cardx.node.background.innerHTML = judgeText;
				}
			} else {
				delete cardx.viewAs;
				cardx.classList.remove("fakejudge");
				if (window.decadeUI) cardx.node.judgeMark.node.judge.innerHTML = lib.translate[cardx.name + "_bg"] || get.translation(cardx.name)[0];
			}
			player.node.judges.insertBefore(cardx, player.node.judges.firstChild);
			const judgeName = lib.config.extension_十周年UI_newDecadeStyle === "onlineUI" ? cardx.viewAs || cardx.name : cardx.name;
			if (["bingliang", "lebu", "shandian", "fulei", "hongshui", "huoshan", "caomu", "jlsgqs_shuiyanqijun", "jydiy_zouhuorumo", "jydiy_yungongliaoshang", "xwjh_biguanqingxiu", "xumou_jsrg", "dczixi_bingliang", "dczixi_lebu", "dczixi_shandian"].includes(judgeName)) {
				let name = judgeName;
				const judgeText = lib.translate[name + "_bg"] || get.translation(name) || "";
				cardx.node.judgeMark.node.judge.innerText = "";
				cardx.node.judgeMark.node.judge.style.fontSize = "";
				const suffix = (lib.config.extension_十周年UI_newDecadeStyle === "on" || lib.config.extension_十周年UI_newDecadeStyle === "othersOff") && ["bingliang", "lebu", "shandian"].includes(name) ? "1.png" : ".png";
				const path = `${lib.assetURL}extension/十周年UI/image/ui/judge-mark/`;
				game._decadeUIApplyJudgeMarkIcon(cardx.node.judgeMark.node.judge, name, path, judgeText, suffix);
				cardx.node.judgeMark.node.judge.style.zIndex = "99";
				cardx.node.judgeMark.node.judge.parentElement.children[0].style.background = "none";
				cardx.node.judgeMark.node.judge.parentElement.children[0].style.display = "none";
			} else {
				game._decadeUIApplyJudgeMarkIcon(cardx.node.judgeMark.node.judge, null, `${lib.assetURL}extension/十周年UI/image/ui/judge-mark/`, "", ".png");
			}
			ui.updatej(player);
			if (judgeMarkMap && !animateDelayJudgeUseToPlayer(player, cardx, cards)) revealDelayJudgeAttachedCard(cardx);
		},
		this,
		cardx,
		isViewAsCard,
		VCard,
		cards
	);
}

export { animatePendingEquipEntries, hasPendingWuguGain, markPendingEquipEntry, playPendingWuguGain, playerAddVirtualJudge, playerDirectgain, playerDirectgains, playerDraw, playerGain2, playerGive, playerPhaseJudge, playerThrow, playerThrowordered2, setBasePlayerDraw };
