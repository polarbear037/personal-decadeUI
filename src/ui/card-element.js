import { ui, lib, game } from "noname";
import { element as element } from "../utils/element.js";
function n(position, info, noclick) {
	const card = ui.create.div(".card");
	card.node = { image: ui.create.div(".image", card), info: ui.create.div(".info", card), suitnum: element.create("suit-num", card), name: ui.create.div(".name", card), name2: ui.create.div(".name2", card), background: ui.create.div(".background", card), intro: ui.create.div(".intro", card), range: ui.create.div(".range", card), gaintag: element.create("gaintag info", card), judgeMark: element.create("judge-mark", card), cardMask: element.create("card-mask", card) };
	const extend = { $name: element.create("top-name", card), $vertname: card.node.name, $equip: card.node.name2, $suitnum: card.node.suitnum, $range: card.node.range, $gaintag: card.node.gaintag };
	for (const i in extend) card[i] = extend[i];
	return (
		Object.setPrototypeOf(card, lib.element.Card.prototype),
		(card.node.intro.innerText = lib.config.intro),
		noclick || lib.setIntro(card),
		(card.storage = {}),
		(card.vanishtag = []),
		(card.gaintag = []),
		(card._uncheck = []),
		"noclick" !== info && (card.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card), lib.config.touchscreen ? (card.addEventListener("touchstart", ui.click.cardtouchstart), card.addEventListener("touchmove", ui.click.cardtouchmove)) : (card.addEventListener("mouseenter", ui.click.cardmouseenter), card.addEventListener("mouseleave", ui.click.cardmouseleave)), lib.cardSelectObserver && lib.cardSelectObserver.observe(card, { attributes: !0 })),
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
