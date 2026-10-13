import { get, game, lib, _status, ui } from "noname";
const e = {
	twtanfeng: {
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("twtanfeng"), (card, player, target) => target !== player && target.countDiscardableCards(player, "hej") > 0)
				.set("ai", target => {
					const player = _status.event.player;
					let num = 1;
					return (get.attitude(player, target) > 0 ? (num = 3) : (target.countCards("he") && target.canUse("sha", player)) || (num = target.hp + target.countCards("hs", { name: ["tao", "jiu"] }) <= 1 ? 2 : 1.2), get.effect(target, { name: "guohe" }, player, player) * num * (player.hp <= 1 && get.attitude(player, target) <= 0 ? 0 : 1));
				})
				.setHiddenSkill("twtanfeng")
				.forResult();
			if (!result?.bool) return;
			const target = result.targets[0];
			((event.target = target), player.logSkill("twtanfeng", target), await player.discardPlayerCard(target, "hej", !0));
			const next = target.chooseToUse();
			(next.set("openskilldialog", `###探锋：选择一张牌当作【杀】对${get.translation(player)}使用###或点击"取消"，受到其造成的1点火焰伤害，并令其跳过本回合的一个阶段（准备阶段和结束阶段除外）`), next.set("norestore", !0), next.set("_backupevent", "twtanfeng_backup"), next.set("custom", { add: {}, replace: { window() {} } }), next.backup("twtanfeng_backup"), next.set("targetRequired", !0), next.set("complexSelect", !0), next.set("filterTarget", (card, player, target) => !(target !== _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) && card && lib.filter.targetEnabled(card, player, target)), next.set("sourcex", player), next.set("addCount", !1));
			const useRes = await next;
			if (useRes?.bool) return;
			if ((player.line(target, "fire"), await target.damage(1, "fire"), !target.isIn())) return;
			const phaseMap = { phaseJudge: "判定阶段", phaseDraw: "摸牌阶段", phaseUse: "出牌阶段", phaseDiscard: "弃牌阶段" },
				list = Object.entries(phaseMap)
					.filter(([phase]) => !player.skipList.includes(phase))
					.map(([, name]) => name),
				list2 = list.filter(name => "判定阶段" !== name && "弃牌阶段" !== name),
				cResult = await target
					.chooseControl(list)
					.set("prompt", `探锋：令${get.translation(player)}跳过一个阶段`)
					.set("ai", () => _status.event.choice)
					.set(
						"choice",
						(() => {
							const att = get.attitude(target, player),
								num = player.countCards("j");
							return att > 0 ? (list.includes("判定阶段") && num > 0 ? "判定阶段" : "弃牌阶段") : list.includes("摸牌阶段") && player.hasJudge("lebu") ? "摸牌阶段" : (list.includes("出牌阶段") && player.hasJudge("bingliang")) || player.needsToDiscard() > 0 ? "出牌阶段" : list2.randomGet();
						})()
					)
					.forResult();
			for (const [i, l] of Object.entries(phaseMap)) l === cResult.control && player.skip(i);
			(target.popup(cResult.control), target.line(player), game.log(player, "跳过了", `#y${cResult.control}`));
		},
		subSkill: {
			backup: {
				viewAs: { name: "sha" },
				filterCard: !0,
				position: "hes",
				check(card) {
					const player = _status.event.player,
						target = _status.event.getParent().player,
						eff = get.effect(target, get.autoViewAs({ name: "sha" }, [card]), player, player),
						eff2 = get.damageEffect(player, target, player, "fire");
					return eff < 0 || eff2 > 0 || eff2 > eff || get.tag(card, "recover") ? 0 : (1 === player.hp ? 10 : 6) - get.value(card);
				},
			},
		},
	},
	olhedao: {
		tianshuClear(skill, player, num = 1) {
			(num > 0 &&
				get.info(skill)?.nopop &&
				(game.broadcastAll(
					(player, skill) => {
						(delete lib.skill[skill].nopop, (lib.skill[skill].markimage = "image/card/tianshu1.png"), player.marks[skill] && player.marks[skill].text.setBackgroundImage(lib.skill[skill].markimage));
					},
					player,
					skill
				),
				player.update()),
				(player.storage[skill][0] -= num),
				player[player.storage[skill][0] <= 0 ? "removeSkill" : "markSkill"](skill));
		},
	},
};
export { e as inheritComplexSkill };
