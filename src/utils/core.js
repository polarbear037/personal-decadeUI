import { lib } from "noname";
function e() {
	return "android" === lib.device || "ios" === lib.device;
}
function t(min = -2147483648, max = 2147483648) {
	return (min > max && ([min, max] = [max, min]), Math.floor(Math.random() * (max + 1 - min)) + min);
}
function n(elementFrom, elementTo) {
	if (!(elementFrom instanceof HTMLElement && elementTo instanceof HTMLElement)) return (console.error("getMapElementPos: 参数必须是HTMLElement"), null);
	const rectFrom = elementFrom.getBoundingClientRect(),
		rectTo = elementTo.getBoundingClientRect();
	return { x: rectFrom.left - rectTo.left, y: rectFrom.top - rectTo.top, left: rectFrom.left - rectTo.left, top: rectFrom.top - rectTo.top };
}
function o(cards, delay, fadeDelay) {
	(Array.isArray(cards) || (cards = [cards]),
		setTimeout(() => {
			null != fadeDelay ? (cards.forEach(card => card.classList.add("removing")), setTimeout(() => cards.forEach(card => card.remove()), fadeDelay)) : cards.forEach(card => card.remove());
		}, delay));
}
export { o as delayRemoveCards, n as getMapElementPos, t as getRandom, e as isMobile };
