import { lib, ui, game } from "noname";
import { updateXinshaCardName, clearXinshaCardName } from "./cardAlternateName-xinsha.js";

const handKeys = ["handcards1", "handcards2"];
let observedZones = [], observers = [];
const taggedCards = new Set();

function updateVisibility() {
	const zones = handKeys.map(key => game.me?.node?.[key]).filter(Boolean);
	if (zones.length !== observedZones.length || zones.some((zone, index) => zone !== observedZones[index])) {
		observers.forEach(observer => observer.disconnect());
		for (const zone of observedZones) {
			delete zone.dataset.cardAlternateNameVisible;
			delete zone.dataset.cardAlternateNameStyle;
		}
		observedZones = zones;
		observers = zones.map(zone => {
			const observer = new MutationObserver(updateVisibility);
			observer.observe(zone, { childList: true });
			return observer;
		});
	}
	const enabled = lib.config.extension_十周年UI_cardAlternateName !== false,
		style = window.decadeUI?.config?.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle,
		xinsha = style === "othersOff",
		cardsByZone = zones.map(zone => [...zone.children].filter(card => card.classList.contains("card") && !card.classList.contains("removing"))),
		count = zones.reduce((sum, zone) => sum + zone.childElementCount, 0),
		activeTags = new Set();
	zones.forEach((zone, index) => {
		// 原版 SelfCardsArea 按当前页 >=15 张；其他风格沿用原有总数门槛与样式。
		const visible = enabled && (xinsha ? cardsByZone[index].length : count) >= 15 ? "on" : "off";
		if (zone.dataset.cardAlternateNameVisible !== visible) zone.dataset.cardAlternateNameVisible = visible;
		if (xinsha && enabled) {
			if (zone.dataset.cardAlternateNameStyle !== "xinsha") zone.dataset.cardAlternateNameStyle = "xinsha";
			if (visible === "on") for (const card of cardsByZone[index]) {
				updateXinshaCardName(card);
				activeTags.add(card);
			}
		} else delete zone.dataset.cardAlternateNameStyle;
	});
	for (const card of taggedCards) if (!activeTags.has(card)) clearXinshaCardName(card);
	taggedCards.clear();
	for (const card of activeTags) taggedCards.add(card);
	return zones.length > 0;
}

function initCardAlternateNameVisible() {
	clearInterval(window._cardAlternateNameVisibleTimer);
	ui.window?._cardAlternateNameVisibleObservers?.forEach(observer => observer.disconnect());
	if (ui.window) delete ui.window._cardAlternateNameVisibleObservers;
	if (window.decadeUI) {
		window.decadeUI.cardAlternateName ||= {};
		window.decadeUI.cardAlternateName.updateVisibility = updateVisibility;
	}
	const attach = () => {
		if (updateVisibility()) {
			clearInterval(window._cardAlternateNameVisibleTimer);
			window._cardAlternateNameVisibleTimer = null;
		}
	};
	window._cardAlternateNameVisibleTimer = setInterval(attach, 500);
	attach();
}

export { initCardAlternateNameVisible };
