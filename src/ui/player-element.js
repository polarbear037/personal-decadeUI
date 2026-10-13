import { ui, lib, get, game, _status } from "noname";
import { element as element } from "../utils/element.js";
import { installDynamicOutcrop } from "./dynamicOutcrop.js";
class t {
	constructor(dom) {
		((this.dom = dom), (this._cache = null));
		new MutationObserver(() => (this._cache = null)).observe(dom, { childList: !0 });
	}
	get childNodes() {
		return (this._cache || (this._cache = Array.from(this.dom.childNodes)), this._cache);
	}
}
function i(i, n) {
	const player = ui.create.div(".player", i),
		a = {
			node: { avatar: ui.create.div(".primary-avatar", player, ui.click.avatar).hide(), avatar2: ui.create.div(".deputy-avatar", player, ui.click.avatar2).hide(), turnedover: element.create("turned-over", player), framebg: ui.create.div(".framebg", player), intro: ui.create.div(".intro", player), identity: ui.create.div(".identity", player), hp: ui.create.div(".hp", player), long: ui.create.div(".long", player), wei: ui.create.div(".wei", player), name: ui.create.div(".name", player), name2: ui.create.div(".name.name2", player), nameol: ui.create.div(".nameol", player), count: ui.create.div(".card-count", player), equips: ui.create.div(".equips", player).hide(), judges: ui.create.div(".judges", player), marks: element.create("dui-marks", player), chain: element.create("chain", player), handcards1: ui.create.div(".handcards"), handcards2: ui.create.div(".handcards"), expansions: ui.create.div(".expansions") },
			phaseNumber: 0,
			invisibleSkills: [],
			skipList: [],
			skills: [],
			initedSkills: [],
			additionalSkills: {},
			disabledSkills: {},
			hiddenSkills: [],
			awakenedSkills: [],
			forbiddenSkills: {},
			popups: [],
			damagepopups: [],
			judging: [],
			extraEquip: [],
			stat: [{ card: {}, skill: {}, triggerSkill: {} }],
			actionHistory: [{ useCard: [], respond: [], skipped: [], lose: [], gain: [], sourceDamage: [], damage: [], custom: [], useSkill: [] }],
			tempSkills: {},
			storage: { counttrigger: new Proxy({}, { get: (e, t) => player.getStat("triggerSkill")[t], set: (e, t, i) => ((player.getStat("triggerSkill")[t] = i), !0), deleteProperty: (e, t) => (delete player.getStat("triggerSkill")[t], !0), has: (e, t) => t in player.getStat("triggerSkill"), ownKeys: () => Reflect.ownKeys(player.getStat("triggerSkill")), getOwnPropertyDescriptor: (e, prop) => Object.getOwnPropertyDescriptor(player.getStat("triggerSkill"), prop) }) },
			marks: {},
			expandedSlots: {},
			disabledSlots: {},
			ai: { friend: [], enemy: [], neutral: [], handcards: { global: [], source: [], viewed: [] } },
			queueCount: 0,
			outCount: 0,
			vcardsMap: { handcards: [], equips: [], judges: [] },
		},
		s = new Image();
	((s.onerror = function () {
		const node = element.create("chain-back", player.node.chain);
		for (let i = 0; i < 40; i++) element.create("cardbg", node).style.transform = `translateX(${5 * i - 5}px)`;
		s.onerror = void 0;
	}),
		(s.src = decadeUIPath + "image/ui/chain/tie_suo.png"));
	const r = { $cardCount: a.node.count, $dynamicWrap: element.create("dynamic-wrap") };
	((a.node.handcards1._childNodesWatcher = new t(a.node.handcards1)), (a.node.handcards2._childNodesWatcher = new t(a.node.handcards2)), decadeUI.get.extend(player, r), decadeUI.get.extend(player, a), Object.setPrototypeOf(player, lib.element.Player.prototype), (player.node.action = ui.create.div(".action", player.node.avatar)));
	installDynamicOutcrop(player);
	const o = ui.create.div(player.node.identity);
	((o.player = player),
		(function (realIdentity, player) {
			Object.defineProperties(realIdentity, {
				innerHTML: {
					configurable: !0,
					get() {
						return this.innerText;
					},
					set(value) {
						if ("guozhan" === get.mode() || "jiange" === _status.mode || "siguo" === _status.mode) return ((this.style.display = "none"), (this.innerText = value), void this.parentNode.classList.add("guozhan-mode"));
						if ("codename" === lib.config.extension_十周年UI_newDecadeStyle && "猜" === value) return ((this.innerText = ""), (this.style.visibility = ""), void (this.parentNode.style.backgroundImage = ""));
						const identity = this.parentNode.dataset.color,
							handlerMap = {
								猜: () => {
									let e = "cai";
									return ("purple" === _status.mode && "cai" === identity && (e += "_blue"), e);
								},
								友: () => "friend",
								敌: () => "enemy",
								反: () => ("doudizhu" === get.mode() ? "nongmin" : "fan"),
								主: () => {
									let e = "zhu";
									return ("versus" === get.mode() && "wei" === get.translation(player.side + "Color") ? ((e += "_blue"), player.classList.add("opposite-camp")) : "doudizhu" === get.mode() && (e = "dizhu"), e);
								},
								忠: () => ("identity" === get.mode() && "purple" === _status.mode ? ("rZhong" === player.identity ? "qianfeng_blue" : "qianfeng") : "versus" === get.mode() && "wei" === get.translation(player.side + "Color") ? (player.classList.add("opposite-camp"), "zhong_blue") : "zhong"),
								内: () => ("purple" === _status.mode ? ("rNei" === identity ? "xizuo" : "xizuo_blue") : "nei"),
								野: () => "ye",
								首: () => "zeishou",
								帅: () => "zhushuai",
								将: () => ("three" === _status.mode || "wei" === get.translation(player.side + "Color") ? "zhushuai_blue" : "dajiang"),
								兵: () => (!1 === player.side ? "qianfeng_blue" : "qianfeng"),
								卒: () => (!1 === player.side ? "qianfeng_blue" : "qianfeng"),
								师: () => "junshi",
								盟: () => "mengjun",
								神: () => "boss",
								从: () => "suicong",
								先: () => "xianshou",
								后: () => "houshou",
								民: () => "commoner",
							}[value];
						if (!handlerMap) return ((this.innerText = value), (this.style.visibility = ""), void (this.parentNode.style.backgroundImage = ""));
						let filename = handlerMap();
						(["cai_blue", "nongmin", "dizhu", "zhong_blue", "xizuo", "xizuo_blue", "zhushuai_blue", "qianfeng_blue", "qianfeng"].includes(filename) || "b" !== this.parentNode.dataset.color?.[0] || ((filename += "_blue"), player.classList.add("opposite-camp")), (this.innerText = value), (this.style.visibility = "hidden"));
						const style = lib.config.extension_十周年UI_newDecadeStyle,
							s = decadeUIPath + ({ onlineUI: "image/styles/online/identity2_", babysha: "image/styles/baby/identity3_", on: "image/styles/decade/identity_", othersOff: "image/styles/decade/identity_", codename: "image/styles/codename/identity5_" }[style] || "image/styles/shousha/identity2_") + filename + ".png",
							image = new Image();
						((image.node = this),
							(image.onerror = function () {
								this.node.style.visibility = "";
							}),
							(image.src = s),
							(this.parentNode.style.backgroundImage = `url("${s}")`));
					},
				},
			});
		})(o, player),
		Object.defineProperties(player.node.count, {
			innerHTML: {
				configurable: !0,
				get() {
					return this.textContent;
				},
				set(value) {
					this.textContent !== value && ((this.textContent = value), (this.dataset.text = value));
				},
			},
		}));
	(new MutationObserver(mutations => {
		for (const t of mutations)
			if ("childList" === t.type) {
				(Array.from(t.addedNodes).some(e => !e.classList?.contains("emptyequip")) || Array.from(t.removedNodes).some(e => !e.classList?.contains("emptyequip"))) && player.$handleEquipChange();
			}
	}).observe(a.node.equips, { childList: !0 }),
		n ? (player.noclick = !0) : (player.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.target), player.node.identity.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.identity), lib.config.touchscreen && (player.addEventListener("touchstart", ui.click.playertouchstart), player.addEventListener("touchmove", ui.click.playertouchmove))));
	const d = element.create("camp-wrap"),
		l = element.create("hp-wrap");
	(player.insertBefore(d, player.node.name), player.insertBefore(l, player.node.hp), (player.node.campWrap = d), (player.node.hpWrap = l), l.appendChild(player.node.hp));
	const c = { node: { back: element.create("camp-back", d), border: element.create("camp-border", d), campName: element.create("camp-name", d), avatarName: player.node.name, avatarDefaultName: element.create("avatar-name-default", d) } };
	(decadeUI.get.extend(d, c), d.appendChild(player.node.name), (d.node.avatarName.className = "avatar-name"), (d.node.avatarDefaultName.innerHTML = "guozhan" === get.mode() ? "主将" : "隐匿"));
	const u = { mask: player.insertBefore(element.create("mask"), player.node.identity), gainSkill: element.create("gain-skill", player) };
	return (
		(u.gainSkill.player = player),
		(u.gainSkill.skills = []),
		(u.gainSkill.gain = function (skill) {
			if (!this.skills.includes(skill) && lib.translate[skill]) {
				if ("off" === lib.config.extension_十周年UI_newDecadeStyle && "off" !== lib.config.extension_十周年UI_gainSkillsVisible) {
					const t = lib.skill[skill];
					if (!t || t.charlotte || t.sub || (t.mark && !t.limited) || t.nopop || !1 === t.popup || t.equipSkill) return;
					if (t.onremove && game.me !== this.player.storage[skill]) return;
					if ("othersOn" === lib.config.extension_十周年UI_gainSkillsVisible && this.player === game.me) return;
					(t.intro || (t.intro = { content: () => get.skillInfoTranslation(skill, this.player, !1) }), this.player.markSkill(skill));
				}
				(this.skills.push(skill),
					(this.innerHTML = this.skills
						.map(e => lib.translate[e] || "")
						.filter(Boolean)
						.join(" ")));
			}
		}),
		(u.gainSkill.lose = function (skill) {
			const index = this.skills.indexOf(skill);
			index >= 0 &&
				(this.skills.splice(index, 1),
				(this.innerHTML = this.skills
					.map(e => lib.translate[e] || "")
					.filter(Boolean)
					.join(" ")));
		}),
		decadeUI.get.extend(player.node, u),
		player
	);
}
export { i as createPlayerElement };
