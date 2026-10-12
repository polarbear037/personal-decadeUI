import { game, ui, get, _status } from "noname";
import { playShowCardAudio, getBasePlayerMethods } from "./base.js";
import { animatePendingEquipEntries, markPendingEquipEntry } from "./card-movement.js";

function playerUseCard() {
	const event = getBasePlayerMethods().useCard.apply(this, arguments);
	playShowCardAudio();
	if (isEquipUseEvent(event, this)) markPendingEquipEntry(this, event.cards?.length ? event.cards : event.card);
	event.pushHandler("decadeUI_TargetHighlight", (event, trigger) => {
		if (trigger.state !== "begin" || event.step !== 1 || event.hideTargets) return;
		event.targets?.forEach(target => target.classList.add("target"));
	});
	const finish = event.finish;
	event.finish = function () {
		finish?.apply(this, arguments);
		this.targets?.forEach(target => target.classList.remove("target"));
	};
	return event;
}

function playerRespond() {
	playShowCardAudio();
	return getBasePlayerMethods().respond.apply(this, arguments);
}

function playerLose() {
	const result = getBasePlayerMethods().lose.apply(this, arguments);
	const event = _status.event?.name === "loseAsync" ? _status.event.getParent() : _status.event;
	if (event?.name === "useCard" || event?.name === "respond") {
		result.animate = true;
		result.blameEvent = event;
	}
	return result;
}

function isEquipUseEvent(event, player) {
	if (!event?.card) return false;
	try {
		return get.type(event.card, null, player) === "equip";
	} catch (error) {
		return false;
	}
}

function playerUseCardAnimateBefore(event) {
	const base = getBasePlayerMethods();
	base.useCardAnimateBefore?.apply(this, arguments);
	if (isEquipUseEvent(event, this)) markPendingEquipEntry(this, event.cards?.length ? event.cards : event.card);
	if (hasOwnerLoseMap(event)) event.throw = false;
}

function playerRespondAnimateBefore(event) {
	const base = getBasePlayerMethods();
	base.respondAnimateBefore?.apply(this, arguments);
	if (hasOwnerLoseMap(event)) event.throw = false;
}

function playerHandleEquipChange() {
	const previousEquips = this._decadeKnownEquipCards ? Array.from(this._decadeKnownEquipCards) : [];
	getBasePlayerMethods().$handleEquipChange.apply(this, arguments);
	animatePendingEquipEntries(this, previousEquips);
	this._decadeKnownEquipCards = Array.from(this.node?.equips?.childNodes || []);
	if (this !== game.me || !ui.equipSolts) return;
	const extraCount = Array.from(this.node.equips.childNodes).filter(card => ![1, 2, 3, 4, 5].includes(get.equipNum(card))).length;
	let slotDelta = extraCount - Array.from(ui.equipSolts.back.children).filter(item => item.dataset.type === "5").length;
	if (slotDelta > 0) {
		while (slotDelta > 0) {
			slotDelta--;
			window.decadeUI.element.create(null, ui.equipSolts.back).dataset.type = 5;
		}
	} else if (slotDelta < 0) {
		for (let index = 0; index > slotDelta; index--) {
			const slot = Array.from(ui.equipSolts.back.children).find(item => item.dataset.type === "5");
			if (slot?.dataset.type === "5") slot.remove();
		}
	}
	Array.from(this.node?.equips?.children || []).forEach(card => {
		card.offsetWidth;
		card.classList.add("equiped");
	});
}

function hasOwnerLoseMap(event) {
	return !!event?.lose_map && Object.keys(event.lose_map).some(key => key !== "noowner" && event.lose_map[key].length > 0);
}

export {
	playerHandleEquipChange,
	playerLose,
	playerRespond,
	playerRespondAnimateBefore,
	playerUseCard,
	playerUseCardAnimateBefore,
};
