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
			const event2 = get.event();
			const player = event2.player;
			const selecteds = [...ui.selected.cards].map(card => player.getCards("s", i => i.relatedCard === card)[0] || card);
			ui.selected.cards.length = 0;
			game.check();
			const selectables = get.selectableCards();
			if (lib.config["extension_十周年UI_aloneEquip"]) {
				for (const card of player.getCards("e")) {
					const selectableEquip = card.classList.contains("selectable") && card.classList.contains("equip-card-selectable");
					if (!selectables.includes(card) && selectableEquip) selectables.push(card);
				}
			}
			const cards = selecteds.length ? selectables.filter(c => !selecteds.includes(c)) : selectables;
			const toSelect = cards.length <= selectCard[1] ? cards : cards.randomGets(selectCard[1]);
			ui.selected.cards.push(...toSelect);
			for (const card of ui.selected.cards) {
				card.classList.add("selected");
				card.updateTransform(true, 0);
			}
			for (const card of selecteds) {
				card.classList.remove("selected");
				card.updateTransform(false, 0);
			}
			game.check();
			if (typeof event2.custom?.add?.card == "function") event2.custom.add.card();
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
