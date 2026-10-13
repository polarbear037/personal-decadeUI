import { get, ui, game, _status } from "noname";
const a = {
	guhuo_guess: {
		async content(event, trigger, player) {
			(player.addTempSkill("guhuo_phase"), (event.fake = !1), (event.betrayer = null));
			const [card] = trigger.cards,
				isFake = card.name !== trigger.card.name || ("sha" === card.name && !get.is.sameNature(trigger.card, card));
			((event.fake = isFake), player.popup(trigger.card.name, "metal"));
			const next = player.lose(card, ui.ordering);
			((next.relatedEvent = trigger), await next, (trigger.throw = !1), (trigger.skill = "xinfu_guhuo_backup"));
			const actionText = "useCard" === trigger.name ? "使用" : "打出",
				targetText = trigger.targets?.length ? `对${get.translation(trigger.targets)}` : "",
				cardText = (get.translation(trigger.card.nature) || "") + get.translation(trigger.card.name);
			(game.log(player, "声明", targetText, actionText, trigger.card),
				(event.prompt = `${get.translation(player)}声明${targetText}${actionText}${cardText}，是否质疑？`),
				(event.targets = game.filterPlayer(current => current !== player && !current.hasSkill("chanyuan")).sortBySeat(_status.currentPhase)),
				game.broadcastAll(
					(card, player) => {
						const bounds = decadeUI.boundsCaches.arena;
						bounds.updated || bounds.update();
						const scale = bounds.cardScale,
							s = Math.round((bounds.width - bounds.cardWidth) / 2),
							n = Math.round(0.45 * bounds.height - bounds.cardHeight / 2),
							node = (_status.event.guhuoNode = card.copy("thrown"));
						(node.classList.add("infohidden"), node.classList.remove("decade-card"), (node.style.background = ""), (node.style.transform = `translate(${s}px, ${n}px) scale(${scale}) perspective(600px) rotateY(180deg)`), ui.arena.appendChild(node), ui.thrown.push(node));
						ui.create.div(".cardsetion", get.cardsetion(player), node).style.setProperty("display", "block", "important");
					},
					card,
					player
				));
			for (const n of event.targets) {
				if (
					"reguhuo_betray" ===
					(
						await n
							.chooseButton([event.prompt, [["reguhuo_ally", "reguhuo_betray"], "vcard"]], !0)
							.set("ai", button => {
								const player = _status.event.player,
									evt = _status.event.getParent("guhuo_guess"),
									evtx = evt?.getTrigger();
								if (!evt) return Math.random();
								const card = { name: evtx.card.name, nature: evtx.card.nature, isCard: !0 },
									ally = "reguhuo_ally" === button.link[2];
								if (ally && (player.hp <= 1 || get.attitude(player, evt.player) >= 0)) return 1.1;
								if (!ally && get.attitude(player, evt.player) < 0 && "useCard" === evtx.name) {
									const a = evtx.targets || [];
									let n = 0;
									for (const r of a) {
										const isMe = r === evt.player;
										n += get.effect(r, card, evt.player, player) / (isMe ? 1.5 : 1);
									}
									return ((n /= 1.5 * a.length || 1), n > 0 ? 0 : n < -7 ? Math.random() + Math.pow(-(n + 7) / 8, 2) : Math.pow((get.value(card, evt.player, "raw") - 4) / (0 === n ? 5 : 10), 2));
								}
								return Math.random();
							})
							.forResult()
					).links[0][2]
				) {
					(n.addExpose(0.2), game.log(n, "#y质疑"), n.popup("质疑！", "fire"), (event.betrayer = n));
					break;
				}
				(game.log(n, "#g不质疑"), n.popup("不质疑", "wood"), await game.delayx());
			}
			(game.broadcastAll(node => {
				const bounds = decadeUI.boundsCaches.arena;
				bounds.updated || bounds.update();
				const scale = bounds.cardScale,
					r = Math.round((bounds.width - bounds.cardWidth) / 2),
					s = Math.round(0.45 * bounds.height - bounds.cardHeight / 2);
				((node.style.transition = "all ease-in 0.3s"),
					(node.style.transform = `translate(${r}px, ${s}px) scale(${scale}) perspective(600px) rotateY(270deg) translateX(52px)`),
					node.listenTransition(() => {
						(node.classList.remove("infohidden"), card.classList.contains("decade-card") && (node.classList.add("decade-card"), (node.style.background = card.style.background)), (node.style.transition = "all 0s"), ui.refresh(node), (node.style.transform = `translate(${r}px, ${s}px) scale(${scale}) perspective(600px) rotateY(-90deg) translateX(52px)`), ui.refresh(node), (node.style.transition = ""), ui.refresh(node), (node.style.transform = `translate(${r}px, ${s}px) scale(${scale})`));
					}));
			}, event.guhuoNode),
				await game.delay(2),
				event.betrayer && (event.fake ? (event.betrayer.popup("质疑正确", "wood"), game.log(player, "声明的", trigger.card, "作废了"), trigger.cancel(), trigger.getParent().goto(0), (trigger.line = !1)) : (event.betrayer.popup("质疑错误", "fire"), await event.betrayer.addSkills("chanyuan")), await game.delay(2), event.fake && game.broadcastAll(() => ui.clear())));
		},
	},
};
export { a as guhuoSkill };
