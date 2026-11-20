import { ui, lib, game } from "noname";
import { element as element } from "../utils/element.js";
const isXinshaCardTag = () => lib.config.extension_十周年UI_newDecadeStyle === "othersOff";
let tagMeasuringContext;
let xinshaHandHover;
const isXinshaHand = () => (window.decadeUI?.config?.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle) === "othersOff";

function clearXinshaHandHover() {
	const hover = xinshaHandHover;
	if (!hover) return;
	xinshaHandHover = null;
	clearTimeout(hover.releaseTimer);
	for (const type of ["mousemove", "mousedown", "mouseup", "click"]) document.removeEventListener(type, trackXinshaHandHover, true);
	window.removeEventListener("blur", clearXinshaHandHover);
	if (ui._handcardHover === hover.card) {
		ui._handcardHover = null;
		ui.updatehl();
	}
}

function trackXinshaHandHover(event) {
	const hover = xinshaHandHover;
	if (!hover) return;
	if (!isXinshaHand() || lib.config.touchscreen || !lib.config.spread_card || hover.card.parentNode !== ui.handcards1) return clearXinshaHandHover();
	const { card, rect } = hover,
		inside = event.clientX >= rect.left && event.clientX < rect.right && event.clientY >= rect.top && event.clientY < rect.bottom;
	if (event.type === "mousedown") {
		if (event.button !== 0) return;
		hover.pressed = true;
		if (inside && !card.contains(event.target)) {
			// 在原命中区按下时先恢复基础排布，让本体 windowmousedown 的 elementFromPoint 仍命中同一张牌。
			hover.redirectClick = true;
			ui._handcardHover = null;
			const cards = [...ui.handcards1.children], transitions = cards.map(node => [node.style.getPropertyValue("transition-property"), node.style.getPropertyPriority("transition-property")]);
			cards.forEach(node => node.style.setProperty("transition-property", "none", "important"));
			window.decadeUI.layout.updateHand();
			card.getBoundingClientRect();
			cards.forEach((node, i) => transitions[i][0] ? node.style.setProperty("transition-property", ...transitions[i]) : node.style.removeProperty("transition-property"));
		}
		return;
	}
	if (event.type === "mouseup") {
		hover.releaseTimer = setTimeout(clearXinshaHandHover, 0);
		return;
	}
	if (event.type === "click") {
		if (hover.pressed && hover.redirectClick && !card.contains(event.target)) {
			event.stopImmediatePropagation();
			ui.click.card.call(card, event);
		}
		return clearXinshaHandHover();
	}
	if (hover.pressed) return;
	if (ui.selected.cards.length) return clearXinshaHandHover();
	// transform 自己引起的 enter/leave 不代表鼠标移动；保留原来露出的命中条，避免末位牌反复重排。
	if (event.clientX === hover.x && event.clientY === hover.y) return;
	hover.x = event.clientX;
	hover.y = event.clientY;
	if (!inside && !card.contains(event.type === "mouseleave" ? event.relatedTarget : event.target)) clearXinshaHandHover();
}

function handCardMouseEnter(event) {
	if (!isXinshaHand() || this.parentNode !== ui.handcards1) return ui.click.cardmouseenter.call(this, event);
	if (!lib.config.spread_card || ui.selected.cards.length) return;
	if (xinshaHandHover) {
		trackXinshaHandHover(event);
		if (xinshaHandHover) return;
	}
	const bounds = this.getBoundingClientRect(), next = this.nextElementSibling?.getBoundingClientRect();
	const rect = { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
	if (next && next.left > rect.left && next.left < rect.right) rect.right = next.left;
	xinshaHandHover = { card: this, rect, x: event.clientX, y: event.clientY };
	ui._handcardHover = this;
	for (const type of ["mousemove", "mousedown", "mouseup", "click"]) document.addEventListener(type, trackXinshaHandHover, true);
	window.addEventListener("blur", clearXinshaHandHover);
	ui.updatehl();
}

function handCardMouseLeave(event) {
	if (!isXinshaHand() || this.parentNode !== ui.handcards1) return ui.click.cardmouseleave.call(this, event);
	trackXinshaHandHover(event);
}

// 原版 updateSkillText 对超宽文字整行缩小；不改牌的尺寸及 gaintag 数据。
function installXinshaCardTag(card) {
	if (!isXinshaCardTag()) return;
	const addGaintag = card.addGaintag;
	card.addGaintag = function () {
		const result = addGaintag.apply(this, arguments);
		if (!isXinshaCardTag()) return result;
		const tag = this.node.gaintag;
		if (!tag.textContent) return result;
		const text = document.createElement("span");
		text.className = "dui-yjcm-card-tag-text";
		text.append(...tag.childNodes);
		tag.append(text);
		const fit = () => {
			if (!isXinshaCardTag() || text.parentNode !== tag) return;
			const style = getComputedStyle(text);
			// addGaintag 也会在牌尚未插入 DOM 时调用，字体测量不依赖牌已显示。
			tagMeasuringContext ||= document.createElement("canvas").getContext("2d");
			tagMeasuringContext.font = `${style.fontSize || 24 * 108 / 126 + "px"} ${style.fontFamily || "dui-yjcm-card-tag"}`;
			const width = text.scrollWidth || tagMeasuringContext.measureText(text.textContent).width;
			const cardWidth = this.offsetWidth || 108;
			text.style.setProperty("--dui-yjcm-card-tag-scale", String(width > 0 ? Math.min(1, cardWidth * 116 / 126 / width) : 1));
		};
		fit();
		document.fonts?.load('24px "dui-yjcm-card-tag"').then(fit);
		return result;
	};
}

function n(position, info, noclick) {
	const card = ui.create.div(".card");
	card.node = { image: ui.create.div(".image", card), info: ui.create.div(".info", card), suitnum: element.create("suit-num", card), name: ui.create.div(".name", card), name2: ui.create.div(".name2", card), background: ui.create.div(".background", card), intro: ui.create.div(".intro", card), range: ui.create.div(".range", card), gaintag: element.create("gaintag info", card), judgeMark: element.create("judge-mark", card), cardMask: element.create("card-mask", card) };
	const extend = { $name: element.create("top-name", card), $vertname: card.node.name, $equip: card.node.name2, $suitnum: card.node.suitnum, $range: card.node.range, $gaintag: card.node.gaintag };
	for (const i in extend) card[i] = extend[i];
	return (
		Object.setPrototypeOf(card, lib.element.Card.prototype),
		installXinshaCardTag(card),
		(card.node.intro.innerText = lib.config.intro),
		noclick || lib.setIntro(card),
		(card.storage = {}),
		(card.vanishtag = []),
		(card.gaintag = []),
		(card._uncheck = []),
		"noclick" !== info && (card.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card), lib.config.touchscreen ? (card.addEventListener("touchstart", ui.click.cardtouchstart), card.addEventListener("touchmove", ui.click.cardtouchmove)) : (card.addEventListener("mouseenter", handCardMouseEnter), card.addEventListener("mouseleave", handCardMouseLeave)), lib.cardSelectObserver && lib.cardSelectObserver.observe(card, { attributes: !0 })),
		(card.$suitnum.$num = element.create(null, card.$suitnum, "span")),
		(card.$suitnum.$num.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif'),
		(card.$suitnum.$br = element.create(null, card.$suitnum, "br")),
		(card.$suitnum.$suit = element.create("suit", card.$suitnum, "span")),
		(card.$suitnum.$suit.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif'),
		(card.$equip.$suitnum = element.create(null, card.$equip, "span")),
		(card.$equip.$name = element.create(null, card.$equip, "span")),
		(card.node.judgeMark.node = { back: element.create("back", card.node.judgeMark), mark: element.create("mark", card.node.judgeMark), judge: element.create("judge", card.node.judgeMark) }),
		position && position.appendChild(card),
		card
	);
}
function t(baseCreate) {
	return function () {
		const result = baseCreate.apply(this, arguments);
		return (game.updateRoundNumber(), result);
	};
}
export { n as createCardElement, t as createCardsWrapper };
