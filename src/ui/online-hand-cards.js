import { game, get, lib, ui, _status } from "noname";

// OL 4.0.2：kki 47×108；Cns 每行四张、牌缩放0.85，展开200ms。
const scale = 0.72;
const trackedPlayers = new Set();
const recommendations = new Map();
let popup, timer, installed = false;

function isOnlineStyle() {
	return lib.config.extension_十周年UI_newDecadeStyle === "onlineUI";
}

function visibleHandCards(player, viewer = game.me) {
	if (!viewer || player === viewer || player.isDead() || game.observe) return [];
	return player.getCards("h", card => get.is.shownCard(card) || player.isUnderControl(true, viewer) || viewer.hasSkillTag("viewHandcard", null, player, true));
}

function canRecommend(sender, target) {
	return game.players.includes(sender) && game.players.includes(target) && sender !== target && !sender.isDead() && !target.isDead() && !_status.over && !game.observe && target.isFriendOf(sender);
}

function cardName(card) {
	if (card.name === "sha") {
		const nature = get.nature(card);
		if (nature === "fire") return "火杀";
		if (nature === "thunder") return "雷杀";
		if (nature === "ice") return "冰杀";
	}
	return (get.translation(card.name) || "").slice(0, 2);
}

function signature(cards) {
	return JSON.stringify(cards.map(card => [card.cardid, card.name, card.nature, card.suit, card.number, recommendations.has(card)]));
}

function closeOnlineHandCards(player) {
	if (!popup || player && popup.player !== player) return;
	clearTimeout(popup.sendTimer);
	popup.node.remove();
	popup = null;
}

function setRecommendationBadge(card, active, isSender = false) {
	let badge = card.querySelector(":scope > .dui-mate-recommend-badge");
	if (!active) {
		badge?.remove();
		return;
	}
	if (!badge) {
		badge = document.createElement("span");
		badge.className = "dui-mate-recommend-badge";
		badge.setAttribute("role", "img");
		badge.setAttribute("aria-label", "推荐");
		card.appendChild(badge);
	}
	badge.dataset.recommendation = isSender ? "sent" : "received";
}

function receiveRecommendation(sender, target, ids) {
	if (!isOnlineStyle() || game.online && target !== game.me || !canRecommend(sender, target) || !Array.isArray(ids)) return;
	const cards = target.getCards("h").filter(card => ids.includes(card.cardid));
	for (const [card, entry] of recommendations) {
		if (entry.target !== target || entry.sender !== sender) continue;
		card.classList.remove("dui-mate-recommended");
		delete card.dataset.mateRecommender;
		setRecommendationBadge(card, false);
		recommendations.delete(card);
	}
	for (const card of cards) {
		card.classList.add("dui-mate-recommended");
		card.dataset.mateRecommender = get.translation(sender);
		setRecommendationBadge(card, true);
		recommendations.set(card, { target, sender });
	}
	// 仅显示建议，不改动选牌、出牌或AI决策。
	if (cards.length) target.popup("队友推荐", "wood", false);
}

function deliverRecommendation(sender, target, ids) {
	if (!canRecommend(sender, target) || !Array.isArray(ids)) return;
	const validIds = visibleHandCards(target, sender).filter(card => ids.includes(card.cardid)).slice(0, 1).map(card => card.cardid);
	if (!validIds.length) return;
	if (target === game.me || !target.ws) receiveRecommendation(sender, target, validIds);
	else target.send("decadeUIMateCard", sender, target, validIds);
}

function install() {
	startRefresh();
	if (installed) return;
	installed = true;
	lib.message.client.decadeUIMateCard = receiveRecommendation;
	lib.message.server.decadeUIMateCard = function (targetId, ids) {
		if (lib.node.observing.includes(this)) return;
		deliverRecommendation(lib.playerOL[this.id], lib.playerOL[targetId], ids);
	};
	document.addEventListener("pointerdown", event => {
		if (popup && !popup.node.contains(event.target) && !popup.player.node.showCards.contains(event.target)) closeOnlineHandCards();
	}, true);
	document.addEventListener("keydown", event => {
		if (popup && event.key === "Escape") { event.stopPropagation(); closeOnlineHandCards(); }
	}, true);
	lib.onover.push(() => {
		closeOnlineHandCards();
		clearInterval(timer);
		timer = undefined;
		for (const player of trackedPlayers) player.node.showCards?.hide();
		trackedPlayers.clear();
		for (const card of recommendations.keys()) {
			card.classList.remove("dui-mate-recommended");
			delete card.dataset.mateRecommender;
			setRecommendationBadge(card, false);
		}
		recommendations.clear();
	});
}

function startRefresh() {
	if (timer || _status.over) return;
	timer = setInterval(() => {
		for (const player of trackedPlayers) {
			if (!player.isConnected) { trackedPlayers.delete(player); closeOnlineHandCards(player); continue; }
			if (isOnlineStyle() || player.node.showCards?.classList.contains("online-handdisplays")) player.decadeUI_updateShowCards();
		}
		if (popup) renderPopup();
		for (const [card, { target }] of recommendations) {
			if (!isOnlineStyle() || _status.over || target.isDead() || !target.getCards("h").includes(card)) {
				card.classList.remove("dui-mate-recommended");
				delete card.dataset.mateRecommender;
				setRecommendationBadge(card, false);
				recommendations.delete(card);
			}
		}
	}, 250);
}

function updateOnlineHandCards(player, cards) {
	const panel = player.node.showCards;
	panel.classList.toggle("online-handdisplays", isOnlineStyle());
	if (!isOnlineStyle()) {
		delete panel.dataset.cards;
		panel.style.top = "90px";
		panel.style.removeProperty("bottom");
		panel.removeAttribute("role");
		panel.removeAttribute("tabindex");
		panel.removeAttribute("aria-label");
		panel.onkeydown = null;
		closeOnlineHandCards(player);
		return false;
	}
	install();
	trackedPlayers.add(player);
	if (game.observe || !game.me) cards = [];
	if (!cards.length || _status.over) {
		panel.hide();
		panel.replaceChildren();
		delete panel.dataset.cards;
		closeOnlineHandCards(player);
		return true;
	}
	panel.style.top = "auto";
	panel.style.bottom = "0px";
	panel.setAttribute("role", "button");
	panel.tabIndex = 0;
	panel.setAttribute("aria-label", `${get.translation(player)}的手牌，共${cards.length}张`);
	panel.onkeydown = event => {
		if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); openOnlineHandCards(player); }
	};
	const key = signature(cards);
	if (key !== panel.dataset.cards) {
		panel.dataset.cards = key;
		panel.replaceChildren();
		for (const card of cards.slice(0, 4)) {
			const label = document.createElement("div");
			label.className = "handcard";
			label.textContent = cardName(card);
			label.classList.toggle("dui-mate-recommended-label", recommendations.has(card));
			panel.appendChild(label);
		}
		if (cards.length > 4) {
			const more = document.createElement("div");
			more.className = "handcard-more";
			more.textContent = "...";
			panel.appendChild(more);
		}
	}
	panel.show();
	return true;
}

function positionPopup() {
	const { player, node } = popup;
	const anchor = player.node.showCards.getBoundingClientRect(), host = ui.window.getBoundingClientRect();
	const zoom = host.width / ui.window.offsetWidth || 1;
	const width = node.offsetWidth, height = node.offsetHeight;
	const rightSide = anchor.left + anchor.width / 2 > host.left + host.width / 2;
	let left = rightSide ? (anchor.left - host.left) / zoom - width - 5 : (anchor.right - host.left) / zoom + 5;
	let top = (anchor.bottom - host.top) / zoom - height;
	left = Math.max(8, Math.min(left, ui.window.offsetWidth - width - 8));
	top = Math.max(8, Math.min(top, ui.window.offsetHeight - height - 8));
	node.style.left = `${left}px`;
	node.style.top = `${top}px`;
	node.style.transformOrigin = rightSide ? "right center" : "left center";
}

function recommendCard(card, button) {
	const state = popup;
	if (!isOnlineStyle() || !state || !canRecommend(game.me, state.player) || !visibleHandCards(state.player).includes(card)) return;
	clearTimeout(state.sendTimer);
	const wasSelected = state.selected === card;
	state.selected = wasSelected ? null : card;
	for (const item of state.grid.querySelectorAll(".dui-mate-card-selected")) {
		item.classList.remove("dui-mate-card-selected");
		setRecommendationBadge(item, false);
	}
	if (wasSelected) return;
	button.classList.add("dui-mate-card-selected");
	setRecommendationBadge(button, true, true);
	// Cns默认推荐上限1张，点击后100ms合并发送并收起。
	state.sendTimer = setTimeout(() => {
		if (popup !== state || !isOnlineStyle() || !canRecommend(game.me, state.player) || !visibleHandCards(state.player).includes(card)) return;
		if (game.online) game.send("decadeUIMateCard", state.player.playerid, [card.cardid]);
		else deliverRecommendation(game.me, state.player, [card.cardid]);
		closeOnlineHandCards();
	}, 100);
}

function renderPopup() {
	if (!popup) return;
	const { player, node, grid, title } = popup;
	const cards = visibleHandCards(player);
	if (!isOnlineStyle() || !player.isConnected || !cards.length || _status.over) return closeOnlineHandCards();
	const key = signature(cards);
	if (key !== popup.key) {
		popup.key = key;
		grid.replaceChildren();
		for (const card of cards) {
			const cell = document.createElement("div");
			cell.className = "dui-mate-card-cell";
			grid.appendChild(cell);
			const button = ui.create.button(card, "card", cell, true);
			button.classList.add("dui-mate-card");
			button.classList.toggle("dui-mate-card-selected", popup.selected === card || recommendations.has(card));
			setRecommendationBadge(button, button.classList.contains("dui-mate-card-selected"), true);
			if (canRecommend(game.me, player)) {
				button.tabIndex = 0;
				button.setAttribute("role", "button");
				button.setAttribute("aria-label", `推荐${get.translation(card)}`);
				button.addEventListener("click", event => { event.stopPropagation(); recommendCard(card, button); });
				button.addEventListener("keydown", event => {
					if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); recommendCard(card, button); }
				});
			}
		}
		const width = Math.max([137, 137, 250, 365][cards.length] || 476.4, (get.translation(player).length + 3) * 26 + 16);
		node.style.width = `${width * scale}px`;
		node.style.height = `${(cards.length > 8 ? 400 : cards.length > 4 ? 380 : 220) * scale}px`;
		title.textContent = `${get.translation(player)}的手牌`;
	}
	positionPopup();
}

function openOnlineHandCards(player) {
	if (!isOnlineStyle()) return false;
	install();
	if (popup?.player === player) { closeOnlineHandCards(); return true; }
	closeOnlineHandCards();
	if (!visibleHandCards(player).length) return true;
	const node = document.createElement("div"), grid = document.createElement("div"), title = document.createElement("div");
	node.className = "dui-mate-hand-popup";
	node.setAttribute("role", "dialog");
	node.setAttribute("aria-label", `${get.translation(player)}的手牌`);
	grid.className = "dui-mate-hand-grid";
	title.className = "dui-mate-hand-title";
	node.append(grid, title);
	node.addEventListener("click", event => event.stopPropagation());
	ui.window.appendChild(node);
	popup = { player, node, grid, title };
	renderPopup();
	return true;
}

export { updateOnlineHandCards, openOnlineHandCards, closeOnlineHandCards };
