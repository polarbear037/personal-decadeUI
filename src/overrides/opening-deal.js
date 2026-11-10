import { lib, _status, get, game } from "noname";

const INITIAL_DEAL_ANIMATION_MS = 850;
const LUCKY_CARD_CHANGE_INTERVAL_MS = 100;

function appendCards(target, cards) {
	if (cards?.length) target.push(...cards);
}

function animateInitialDeal(player, cards, gaintagList, count) {
	if (player === game.me) {
		if (window.decadeUI?.layoutHandDraws && window.decadeUI?.queueNextFrameTick && window.decadeUI?.layoutHand) {
			for (const [group, gaintag] of gaintagList || [[cards, undefined]]) {
				if (!group?.length) continue;
				group._duiFromArenaCenter = true;
				window.decadeUI.layoutHandDraws(group);
				delete group._duiFromArenaCenter;
				player.directgain(group, false, gaintag);
				for (const card of group) {
					card.classList?.remove("drawinghidden");
					void card.offsetWidth;
				}
			}
			window.decadeUI.queueNextFrameTick(window.decadeUI.layoutHand, window.decadeUI);
		} else if (gaintagList) {
			for (const [group, gaintag] of gaintagList) player.directgain(group, false, gaintag);
		} else player.directgain(cards, false);
	} else player.$draw?.(count, !1);
}

function commitRemoteGain(player, cards, gaintagList) {
	if (player === game.me) return;
	if (gaintagList) {
		for (const [group, gaintag] of gaintagList) player.directgain(group, false, gaintag);
	} else player.directgain(cards, false);
}

function broadcastAnimatedDeal(player, cards, gaintagList) {
	if (game.broadcastAll) game.broadcastAll(animateInitialDeal, player, cards, gaintagList, cards.length);
	else animateInitialDeal(player, cards, gaintagList, cards.length);
}

async function finishAnimatedDeal(player, cards, gaintagList, interval = LUCKY_CARD_CHANGE_INTERVAL_MS) {
	if (interval > 0) await new Promise(resolve => setTimeout(resolve, interval));
	if (game.broadcastAll) game.broadcastAll(commitRemoteGain, player, cards, gaintagList);
	else commitRemoteGain(player, cards, gaintagList);
}

function dealCardsToPlayer(player, num, context) {
	const numx = "function" == typeof num ? num(player) : num,
		cards = [],
		otherGetCards = context.otherPile?.[player.playerid]?.getCards;
	if (otherGetCards) appendCards(cards, otherGetCards(numx));
	else if (player.getTopCards) appendCards(cards, player.getTopCards(numx));
	else appendCards(cards, get.cards(numx));
	let gaintagList;
	if (context.gaintag?.[player.playerid]) {
		const gaintag = context.gaintag[player.playerid],
			list = "function" == typeof gaintag ? gaintag(numx, cards) : [[cards, gaintag]];
		gaintagList = list;
	}
	if (cards.length) {
		broadcastAnimatedDeal(player, cards, gaintagList);
		context.hasAnimatedDeal = !0;
	}
	context.pendingGains.push({ player, cards, gaintagList });
}

function dealInitialCards(player, num, context) {
	const end = player;
	do {
		const current = player;
		context.players.push(current);
		context.targets?.includes(current) !== !1 && dealCardsToPlayer(current, num, context);
		!0 === current.singleHp && "guozhan" !== get.mode() && !("doudizhu" === lib.config.mode && "online" === _status.mode) && context.doubleDrawPlayers.push(current);
		player = current.next;
	} while (player !== end);
}

async function finishInitialDeal(context) {
	context.hasAnimatedDeal && (await new Promise(resolve => setTimeout(resolve, INITIAL_DEAL_ANIMATION_MS)));
	for (const { player, cards, gaintagList } of context.pendingGains) {
		if (!cards.length) continue;
		if (game.broadcastAll) game.broadcastAll(commitRemoteGain, player, cards, gaintagList);
		else commitRemoteGain(player, cards, gaintagList);
	}
	const waitings = context.doubleDrawPlayers.map(player => player.doubleDraw?.()).filter(Boolean);
	await Promise.all(waitings);
	for (const player of context.players) player._start_cards = player.getCards("h");
}

export { dealInitialCards, finishInitialDeal, broadcastAnimatedDeal, finishAnimatedDeal };
