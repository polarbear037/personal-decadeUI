import { _status, get, lib } from "noname";
const e = {
		olziruo: {
			sort: {
				async content(event, trigger, player) {
					(event.getParent(2).goto(0), (!_status.connectMode && event.isMine()) || player.tempBanSkill("olziruo_sort", { player: ["useCard1", "useSkillBegin", "chooseToUseEnd"] }));
					const next = player.chooseToMove("自若：请整理手牌顺序", !0);
					(next.set("list", [["手牌", player.getCards("h")]]),
						next.set("processAI", list => {
							const player = get.player(),
								cards = list[0][1].slice();
							return (cards.sort((a, b) => get.useful(b, player) - get.useful(a, player)), player.storage.olziruo && cards.reverse(), [cards]);
						}));
					const result = await next.forResult();
					result?.bool &&
						(result.moved[0].reverse().forEach(card => {
							player.node.handcards1.insertBefore(card, player.node.handcards1.firstChild);
						}),
						decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI));
				},
			},
		},
		jsrgzhasi: {
			undist: {
				init(player) {
					player._distanceDisplay && (player._distanceDisplay.style.display = "none");
				},
				onremove(player) {
					player._distanceDisplay && (player._distanceDisplay.style.display = "");
				},
			},
		},
	};
export { e as inheritSubSkill };
