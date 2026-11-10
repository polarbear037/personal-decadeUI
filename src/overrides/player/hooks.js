import { lib, get, game } from "noname";
const t = ["_recasting", "jiu"];
function n() {
	const addHook = (name, fn) => (lib.hooks[name] ??= []).push(fn);
	(addHook("addSkillCheck", e), addHook("removeSkillCheck", i), addHook("checkSkillAnimate", o));
}
function e(skill, player) {
	if ("string" != typeof skill) return;
	if (!["name", "name1", "name2"].flatMap(t => (player[t] ? ("name1" === t && player.name === player.name1 ? [] : get.character(player[t], 3) || []) : [])).includes(skill)) {
		const n = get.info(skill);
		n && !n.nopop && lib.translate[skill + "_info"] && player.node.gainSkill?.gain(skill);
	}
	s();
}
function i(skill, player) {
	"string" == typeof skill && (player.node.gainSkill?.skills?.includes(skill) && player.node.gainSkill.lose(skill), s());
}
function o(player, n) {
	const e = lib.config;
	if (!e["extension_十周年UI_enable"] || "0" === e.extension_十周年UI_jindutiaoYangshi) return;
	if (player === game.me) return;
	if (e.extension_十周年UI_newDecadeStyle === "onlineUI") return;
	player.querySelector(".tipskill")?.remove();
	const i = e.extension_十周年UI_newDecadeStyle;
	t.includes(n) ||
		"othersOff" === i ||
		"on" === i ||
		(function (player, skillName) {
			const box = document.createElement("div"),
				img = document.createElement("img"),
				text = document.createElement("div");
			((box.className = "tipskill"),
				(box.style.cssText = "\n\t\tdisplay: block;\n\t\tposition: absolute;\n\t\tpointer-events: none;\n\t\tz-index: 90;\n\t\t--w: 133px;\n\t\t--h: calc(var(--w) * 50/431);\n\t\twidth: var(--w);\n\t\theight: var(--h);\n\t\tbottom: 0px;\n\t".replace(/\s+/g, " ")),
				(text.innerHTML = get.skillTranslation(skillName, player).slice(0, 2)),
				(text.style.cssText = "\n\t\tcolor: #ADC63A;\n\t\ttext-shadow: #707852 0 0;\n\t\tfont-size: 11px;\n\t\tfont-family: shousha;\n\t\tdisplay: block;\n\t\tposition: absolute;\n\t\tz-index: 91;\n\t\tbottom: -22px;\n\t\tletter-spacing: 1.5px;\n\t\tline-height: 15px;\n\t\tleft: 15px;\n\t".replace(/\s+/g, " ")),
				(img.src = lib.assetURL + "extension/十周年UI/ui/assets/lbtn/shoushatip/skilltip.png"),
				(img.style.cssText = "\n\t\tdisplay: block;\n\t\tposition: absolute;\n\t\tz-index: 91;\n\t\t--w: 133px;\n\t\t--h: calc(var(--w) * 50/431);\n\t\twidth: var(--w);\n\t\theight: var(--h);\n\t\tbottom: -22px;\n\t".replace(/\s+/g, " ")),
				box.appendChild(img),
				box.appendChild(text),
				player.appendChild(box),
				setTimeout(() => box.remove(), 1500));
		})(player, n);
}
function s() {
	[...(game.players || []), ...(game.dead || [])].forEach(p => p.decadeUI_updateShowCards?.());
}
export { n as registerDecadeUIHooks };
