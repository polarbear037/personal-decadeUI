import { lib, game, get } from "noname";
const o = () => {
	const mode = get.mode();
	return "guozhan" === mode || lib.config.mode_config[mode]?.double_character;
};
function e() {
	if (!lib.config["extension_十周年UI_wujiangbeijing"]) return;
	const setPlayerBackground = player => {
		player && player.setAttribute("data-mode", o() ? "guozhan" : "normal");
	};
	((lib.skill._wjBackground = {
		charlotte: !0,
		forced: !0,
		popup: !1,
		priority: 100,
		trigger: { global: ["gameStart", "modeSwitch"], player: ["enterGame", "showCharacterEnd"] },
		async content() {
			(game.players.forEach(setPlayerBackground), game.dead.forEach(setPlayerBackground));
		},
	}),
		lib.arenaReady.push(() => {
			document.body.setAttribute("data-mode", o() ? "guozhan" : "normal");
		}));
}
export { o as isDoubleCharacterMode, e as setupCharacterBackground };
