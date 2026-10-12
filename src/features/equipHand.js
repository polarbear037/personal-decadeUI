import { get, lib, ui, game } from "noname";
import { setupEquipCopy } from "./equipCopy.js";
import { setupEquipAlone } from "./equipAlone.js";
import { wrapAround } from "../utils/safeOverride.js";

function loadLateEquipStyle() {
	const id = "decade-equip-style-override";
	document.getElementById(id)?.remove();
	const link = document.createElement("link");
	link.id = id;
	link.rel = "stylesheet";
	link.href = `${lib.assetURL}extension/十周年UI/src/styles/equip.css?v=${lib.extensionPack.十周年UI.version}&late=${Date.now()}`;
	document.head.appendChild(link);
}

function setupChooseAllForEquips() {
	wrapAround(ui.create, "cardChooseAll", () => {
		const event = get.event();
		if (!event.isMine() || !event.allowChooseAll || event.complexCard || event.complexSelect || !lib.config.choose_all_button) return null;
		const selectCard = get.select(event.selectCard);
		if (selectCard[1] <= 1) return null;
		event.cardChooseAll = ui.create.control("全选", () => {
			const currentEvent = get.event();
			const player = currentEvent.player;
			const previousSelected = [...ui.selected.cards].map(card => player.getCards("s", equip => equip.relatedCard === card)[0] || card);
			ui.selected.cards.length = 0;
			game.check();
			const selectableCards = get.selectableCards();
			if (lib.config["extension_十周年UI_aloneEquip"]) {
				for (const card of player.getCards("e")) {
					const selectableEquip = card.classList.contains("selectable") && card.classList.contains("equip-card-selectable");
					if (!selectableCards.includes(card) && selectableEquip) selectableCards.push(card);
				}
			}
			const candidates = previousSelected.length ? selectableCards.filter(card => !previousSelected.includes(card)) : selectableCards;
			const cards = candidates.length <= selectCard[1] ? candidates : candidates.randomGets(selectCard[1]);
			ui.selected.cards.push(...cards);
			for (const card of ui.selected.cards) {
				card.classList.add("selected");
				card.updateTransform(true, 0);
			}
			for (const card of previousSelected) {
				card.classList.remove("selected");
				card.updateTransform(false, 0);
			}
			game.check();
			if (typeof currentEvent.custom?.add?.card == "function") currentEvent.custom.add.card();
		});
	});
}

function setupEquipHand() {
	loadLateEquipStyle();
	setupChooseAllForEquips();
	setupEquipCopy();
	setupEquipAlone();
}

export { setupEquipHand };
