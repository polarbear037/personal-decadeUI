import { lib } from "noname";
import { cardDefines as cardDefines, skillDefines as skillDefines, chupaiAnimations as chupaiAnimations } from "./configs/skillAnimations.js";
import { cardTriggers as cardTriggers } from "./configs/cardTriggers.js";
function t(animation) {
	((animation.playLoseHp = player => {
		player && animation.playSpine("effect_loseHp", { scale: 0.6, speed: 0.8, parent: player });
	}),
		(animation.playRecoverNumber = (player, num) => {
			!player || !num || num < 1 || num > 9 || "off" === lib.config.extension_十周年UI_newDecadeStyle || animation.playSpine({ name: "globaltexiao/huifushuzi/shuzi2", action: String(num) }, { speed: 0.6, scale: 0.5, parent: player, y: 20 });
		}),
		(animation.playVirtualDamageNumber = (player, num) => {
			!player || num < 0 || num > 9 || animation.playSpine({ name: "globaltexiao/xunishuzi/SS_PaiJu_xunishanghai", action: "play" + num }, { speed: 0.6, scale: 0.5, parent: player, y: 20 });
		}),
		(animation.playDamageNumber = (player, num) => {
			if (!player || !num || num <= 1 || num > 9 || !lib.config.extension_十周年UI_newDecadeStyle) return;
			const isNewStyle = "off" !== lib.config.extension_十周年UI_newDecadeStyle,
				animName = isNewStyle ? "globaltexiao/shanghaishuzi/SZN_shuzi" : "globaltexiao/shanghaishuzi/shuzi",
				options = { speed: 0.6, scale: 0.4, parent: player };
			(isNewStyle && (options.y = 20), animation.playSpine({ name: animName, action: String(num) }, options));
		}),
		(lib.element.player.inits = [].concat(lib.element.player.inits || []).concat(async player => {
			if (player.ChupaizhishiXObserver) return;
			let timer = null;
			const i = element => {
					element.ChupaizhishiXid ||
						timer ||
						((window.chupaiload = !0),
						(timer = setTimeout(() => {
							const config = decadeUI.config.chupaizhishi,
								animConfig = chupaiAnimations[config];
							("off" !== config && animConfig && (element.ChupaizhishiXid = animation.playSpine({ name: animConfig.name, loop: !0 }, { parent: element, scale: animConfig.scale })), (timer = null));
						}, 300)));
				},
				stopAnimation = element => {
					(element.ChupaizhishiXid && (animation.stopSpine(element.ChupaizhishiXid), delete element.ChupaizhishiXid), timer && (clearTimeout(timer), (timer = null)));
				},
				observer = new MutationObserver(mutations => {
					for (const a of mutations) {
						if ("class" !== a.attributeName) continue;
						const e = a.target;
						e.classList.contains("selectable") ? i(e) : stopAnimation(e);
					}
				});
			(observer.observe(player, { attributes: !0, attributeFilter: ["class"] }), (player.ChupaizhishiXObserver = observer));
		})));
	for (const [i, a] of Object.entries(cardDefines))
		lib.animate.card[i] = card => {
			animation.playSpine(a.name, { x: a.x, y: a.y, scale: a.scale });
		};
	for (const [e, a] of Object.entries(skillDefines))
		lib.animate.skill[e] = function (name) {
			animation.playSpine(a.name, { x: a.x, y: a.y, scale: a.scale, parent: this });
		};
	for (const [e, i] of Object.entries(cardTriggers)) lib.card[e] && Object.assign(lib.card[e], i);
}
export { t as initSkillAnimations };
