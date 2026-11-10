import { ui, _status, lib, get, game } from "noname";
import { element as element } from "../utils/element.js";
const characterVoicePlayed = new WeakMap();
function playCharacterSelectionVoice(node) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI" || !node.classList.contains("selectable") || node.classList.contains("noclick")) return;
	const event = _status.event;
	if (_status.dragged || _status.clicked || _status.tempNoButton || _status.draggingtouchdialog || _status.justdragged || typeof event?.custom?.replace?.button === "function") return;
	if (event?.name !== "chooseButton" || typeof event.isMine === "function" && !event.isMine()) return;
	const characterName = node.link;
	if (!characterName || characterVoicePlayed.get(node) === characterName) return;
	const character = lib.character[characterName];
	const skills = Array.isArray(character) ? character[3] : character?.skills;
	const voicedSkills = (skills || []).filter(skill => lib.skill[skill]?.audio && !lib.skill[skill]?.silent);
	if (!voicedSkills.length) return;
	characterVoicePlayed.set(node, characterName);
	const skill = voicedSkills[Math.floor(Math.random() * voicedSkills.length)];
	game.trySkillAudio(skill, characterName, true, true);
}
function n() {
	return function (item, type, position, noclick, node) {
		(node ? (node.classList.add("button", "character", "decadeUI"), (node.style.display = "")) : (node = ui.create.div(".button.character.decadeUI")), (node._link = item), "characterx" === type && (_status.noReplaceCharacter ? (type = "character") : lib.characterReplace[item]?.length && (item = lib.characterReplace[item].randomGet())), "characterx" === type && lib.characterReplace[item]?.length && (item = lib.characterReplace[item].randomGet()), (node.link = item), decadeUI.element.create("character", node));
		const clickType = lib.config.touchscreen ? "touchend" : "click";
		if (!node._decadeCharacterVoiceHandler) {
			node._decadeCharacterVoiceHandler = () => playCharacterSelectionVoice(node);
			node.addEventListener(clickType, node._decadeCharacterVoiceHandler, true);
		}
		return (
			get.is.double(node._link, !0) && (node._changeGroup = !0),
			"characterx" === type && lib.characterReplace[node._link]?.length > 1 && (node._replaceButton = !0),
			(node.refresh = function (node, item, intersection) {
				(node.setBackground(item, "character"), node.node && (node.node.name.remove(), node.node.hp.remove(), node.node.group.remove(), node.node.intro.remove(), node.node.replaceButton && node.node.replaceButton.remove()), (node.node = { name: element.create("name", node), hp: element.create("hp", node), group: element.create("identity", node), intro: element.create("intro", node), info: element.create("info", node) }));
				const infoitem = get.character(item);
				if (((node.node.name.innerHTML = get.slimName(item)), "default" === lib.config.buttoncharacter_style || "simple" === lib.config.buttoncharacter_style)) {
					("simple" === lib.config.buttoncharacter_style && (node.node.group.style.display = "none"), node.classList.add("newstyle"), (node.node.name.dataset.nature = get.groupnature(get.bordergroup(infoitem))), (node.node.group.dataset.nature = get.groupnature(get.bordergroup(infoitem), "raw")), ui.create.div(node.node.hp));
					const e = get.infoHp(infoitem[2]),
						t = get.infoMaxHp(infoitem[2]),
						o = get.infoHujia(infoitem[2]),
						r = ("single" === get.mode() && "changban" === _status.mode) || (("guozhan" === get.mode() || ("string" == typeof (c = _status.connectMode ? lib.configOL.double_character : get.config("double_character")) ? "double" === c : Boolean(c))) && (_status.connectMode || "pingjun" === (_status.connectMode ? lib.configOL.double_hp : get.config("double_hp"))));
					let d = get.numStr(e / (r ? 2 : 1));
					(e !== t && (d += "/" + get.numStr(t / (r ? 2 : 1))), ui.create.div(".text", d, node.node.hp), 0 === infoitem[2] ? node.node.hp.hide() : get.infoHp(infoitem[2]) <= 3 ? (node.node.hp.dataset.condition = "mid") : (node.node.hp.dataset.condition = "high"), o > 0 && (ui.create.div(node.node.hp, ".shield"), ui.create.div(".text", get.numStr(o), node.node.hp)));
				} else {
					const e = get.infoHp(infoitem[2]),
						t = get.infoMaxHp(infoitem[2]),
						o = get.infoHujia(infoitem[2]);
					if (t > 14) ((node.node.hp.innerHTML = "string" == typeof infoitem[2] ? infoitem[2] : get.numStr(infoitem[2])), node.node.hp.classList.add("text"));
					else {
						for (let o = 0; o < t; o++) {
							const t = ui.create.div("", node.node.hp);
							o >= e && t.classList.add("exclude");
						}
						for (let e = 0; e < o; e++) ui.create.div(node.node.hp, ".shield");
					}
				}
				var c;
				if ((node.node.hp.childNodes.length || (node.node.name.style.top = "8px"), node.node.name.querySelectorAll("br").length >= 4 && (node.node.name.classList.add("long"), "old" === lib.config.buttoncharacter_style && (node.addEventListener("mouseenter", ui.click.buttonnameenter), node.addEventListener("mouseleave", ui.click.buttonnameleave))), (node.node.intro.innerText = lib.config.intro), noclick || lib.setIntro(node), infoitem[1])) {
					const e = get.is.double(item, !0);
					(e ? ((node.node.group.innerHTML = e.reduce((prev, cur) => `${prev}<div data-nature="${get.groupnature(cur)}">${get.translation(cur)}</div>`, "")), e.length > 4 && (node.node.group.style.height = /* @__PURE__ */ new Set([5, 6, 9]).has(e.length) ? "48px" : "64px")) : (node.node.group.innerHTML = `<div>${get.translation(infoitem[1])}</div>`), (node.node.group.style.backgroundColor = get.translation(`${get.bordergroup(infoitem)}Color`)));
				} else node.node.group.style.display = "none";
				if (node._replaceButton) {
					const e = ui.create.div(".button.replaceButton", node);
					((node.node.replaceButton = e),
						(e.innerText = "切换"),
						(e._node = node),
						e.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
							_status.tempNoButton = !0;
							const e = this._node,
								list = lib.characterReplace[e._link];
							let link = e.link,
								index = list.indexOf(link);
							((index = index === list.length - 1 ? 0 : index + 1),
								(e.link = list[index]),
								e.refresh(e, list[index]),
								setTimeout(() => {
									_status.tempNoButton = void 0;
								}, 200));
						}));
				}
			}),
			node.refresh(node, item, position?.intersection),
			position && position.appendChild(node),
			node
		);
	};
}
export { n as createCharacterButtonPreset };
