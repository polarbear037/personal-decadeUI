import { game, lib, get } from "noname";
function i() {
	((game.trySkillAudio = function (skill, player, directaudio, nobroadcast, skillInfo, args) {
		if ((nobroadcast || game.broadcast(game.trySkillAudio, skill, player, directaudio, nobroadcast, skillInfo, args), !lib.config.background_speak)) return;
		const info = skillInfo || lib.skill[skill];
		if (!info) return;
		if (info.direct && !directaudio) return;
		if (lib.skill.global.includes(skill) && !info.forceaudio) return;
		const u = get.Audio.skill({ skill: skill, player: player, info: skillInfo, args: args }).audioList.slice().randomRemove();
		return u ? (u.text && player?.say && lib.config.extension_十周年UI_skillDieAudio && player.say(u.text), game.tryAudio({ audioList: [u.file], random: !1 })) : void 0;
	}),
		(game.tryDieAudio = function (player, dieInfo) {
			if ((game.broadcast(game.tryDieAudio, player, dieInfo), !lib.config.background_speak)) return;
			if (!player) return;
			const o = get.Audio.die({ player: player, info: dieInfo }).audioList.slice().randomRemove();
			return o ? (o.text && player.say && lib.config.extension_十周年UI_skillDieAudio && player.say(o.text), game.tryAudio({ audioList: [o.file], random: !1 })) : void 0;
		}));
}
export { i as setupSkillDieAudio };
