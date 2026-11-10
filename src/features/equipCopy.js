import { lib, get, ui, game } from "noname";
const e = "equipHand",
	s = ["chooseCard", "chooseToUse", "chooseToRespond", "chooseToDiscard", "chooseCardTarget", "chooseToGive"],
	t = /* @__PURE__ */ new WeakMap();
let equipCopyInitialized = false;
let copyOwnerEvent = null;
function n(original) {
	const card = ui.create.card(ui.special);
	(card.init([original.suit, original.number, original.name, original.nature]), (card.cardid = original.cardid), (card.wunature = original.wunature), (card.storage = original.storage), (card.relatedCard = original), (card.owner = get.owner(original)));
	const equippedLabel = document.createElement("div");
	equippedLabel.className = "equip-hand-equipped";
	equippedLabel.textContent = "已装备";
	card.appendChild(equippedLabel);
	const syncSelection = () => {
		if ("s" !== get.position(card) || !card.hasGaintag(e)) return;
		ui.selected.cards.remove(card);
		const selected = card.classList.contains("selected");
		(card.updateTransform(selected, 0), card.relatedCard.classList.toggle("selected", selected), selected ? ui.selected.cards.add(card.relatedCard) : ui.selected.cards.remove(card.relatedCard), game.check());
	};
	return (card.addEventListener("click", syncSelection), (card._syncSelection = syncSelection), card);
}
function cleanup(event, player) {
	if (!player) return;
	if (copyOwnerEvent === event) copyOwnerEvent = null;
	const cards = event.result?.cards;
	cards &&
		cards.forEach((card, t) => {
			if (card.hasGaintag(e)) {
				const e = player.getCards("e", e => e.cardid === card.cardid)[0];
				e && (cards[t] = e);
			}
		});
	const copies = player.getCards("s", c => c.hasGaintag(e));
	for (const e of copies) (e._syncSelection && (e.removeEventListener("click", e._syncSelection), delete e._syncSelection), e.discard(), e.delete());
	(!(function (event) {
		t.has(event) && ((event.filterCard = t.get(event)), t.delete(event));
	})(event),
	event._equipCopyOriginalPosition !== undefined && ((event.position = event._equipCopyOriginalPosition), delete event._equipCopyOriginalPosition),
		(event.copyCards = !1),
		player === game.me && ui.updatehl());
}
function a() {
	if (equipCopyInitialized) return;
	equipCopyInitialized = true;
	(lib.hooks.checkBegin.add(async event => {
		if (!lib.config["extension_十周年UI_enableEquipCopy"] || lib.config["extension_十周年UI_aloneEquip"]) return;
		if (copyOwnerEvent !== null && copyOwnerEvent !== event && copyOwnerEvent.copyCards) cleanup(copyOwnerEvent, copyOwnerEvent.player);
		if (event.player !== game.me) return;
		const player = event.player;
		if (!(event.position?.includes("e") && player.countCards("e") && !event.copyCards && s.includes(event.name))) return;
		(event.copyCards = !0, copyOwnerEvent = event);
		const includeS = !event.position.includes("s");
		(event._equipCopyOriginalPosition = event.position, (event.position = event.position.replace("e", "")), includeS && (event.position += "s"));
		if (!event._equipCopyPatched) {
			event._equipCopyPatched = !0;
			for (const key of ["backup", "restore"]) {
				const original = event[key];
				event[key] = function (...args) {
					if (key === "backup") {
						if (this.copyCards) cleanup(this, this.player);
						if (this._backup && !this._equipCopyBaseBackup) this._equipCopyBaseBackup = this._backup;
					} else if (this.copyCards) cleanup(this, this.player);
					const result = original.apply(this, args);
					if (key === "restore" && !this.skill && this._equipCopyBaseBackup) {
						this.position = this._equipCopyBaseBackup.position;
						this.filterCard = this._equipCopyBaseBackup.filterCard;
					}
					return result;
				};
			}
		}
		const a = player.getCards("e").map(n),
			i = typeof event.filterCard === "function" ? a.filter(e => event.filterCard.call(event, e.relatedCard || e, player)) : a.slice();
		event.filterCard = (function (event, filter, includeS) {
				return (
					t.has(event) || t.set(event, filter),
					function (card, player) {
						const real = card.relatedCard || card;
						return "e" !== get.position(card) && !(includeS && "s" === get.position(card) && "card" === get.itemtype(card) && !card.hasGaintag(e)) && (filter ? filter.call(this, real, player) : !0);
					}
				);
			})(event, event.filterCard, includeS);
		const c = (function (event, player, copies, filtered) {
			if (!event.filterCard || !("object" == typeof event.selectCard || event.selectCard > 1)) return event.filterCard ? filtered : copies;
			const originalPosition = event._equipCopyOriginalPosition || event.position;
			const result = [...filtered],
				validCards = player.getCards("he", card => {
					const real = card.relatedCard || card;
					return originalPosition.includes(get.position(real)) && event.filterCard.call(event, real, player);
				});
			for (const card of validCards) {
				((ui.selected.cards = ui.selected.cards || []), ui.selected.cards.add(card));
				for (const s of copies) {
					if (result.includes(s)) continue;
					const e = s.relatedCard || s;
					originalPosition.includes(get.position(e)) && event.filterCard.call(event, e, player) && result.push(s);
				}
				ui.selected.cards.remove(card);
			}
			return result;
		})(event, player, a, i);
		(c.length && player.directgains(c, null, e),
			(function (cards) {
				for (const card of cards) (card.node.gaintag.classList.remove("gaintag", "info"), (card.node.gaintag.textContent = ""));
			})([...a, ...i]),
			a.sort((e, s) => (s.name !== e.name ? lib.sort.card(s.name, e.name) : s.suit !== e.suit ? lib.suit.indexOf(s) - lib.suit.indexOf(e) : s.number - e.number)));
	}),
		lib.hooks.checkCard.add((card, event) => {
			if (lib.config["extension_十周年UI_enableEquipCopy"] && !lib.config["extension_十周年UI_aloneEquip"] && event.copyCards && "e" === get.position(card) && card.classList.contains("selected")) {
				const s = event.player.getCards("s", s => s.hasGaintag(e) && s.relatedCard === card)[0];
				s && !s.classList.contains("selected") && (card.classList.remove("selected"), ui.selected.cards.remove(card));
			}
		}),
		lib.hooks.checkEnd.add(event => {
			if (lib.config["extension_十周年UI_enableEquipCopy"] && !lib.config["extension_十周年UI_aloneEquip"] && event.copyCards)
				for (const s of event.player.getCards("e"))
					if (s.classList.contains("selected")) {
						const t = event.player.getCards("s", t => t.hasGaintag(e) && t.relatedCard === s)[0];
						t && !t.classList.contains("selected") && (s.classList.remove("selected"), ui.selected.cards.remove(s));
					}
		}),
		lib.hooks.uncheckBegin.add(async (event, args) => {
			if (!lib.config["extension_十周年UI_enableEquipCopy"] || lib.config["extension_十周年UI_aloneEquip"]) return;
			const shouldCleanup = args.includes("card") && event.copyCards && (event.result || (["chooseToUse", "chooseToRespond"].includes(event.name) && !event.result));
			if (shouldCleanup) cleanup(event, event.player);
		}));
}
export { a as setupEquipCopy };
