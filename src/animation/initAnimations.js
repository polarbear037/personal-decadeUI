import { lib, game, ui, _status } from "noname";
import { cardDefines as cardDefines, skillDefines as skillDefines, chupaiAnimations as chupaiAnimations } from "./configs/skillAnimations.js";
import { cardTriggers as cardTriggers } from "./configs/cardTriggers.js";
function usesLeiOlTargetEffect() {
	const event = _status.event;
	const setting = lib.config.extension_雷的ol_targetEffect ?? "default";
	// 雷的ol用另一套共享画布播放；同一目标只保留其选目标美化。
	return game.hasExtension("雷的ol") && setting !== "off" && setting !== false &&
		typeof window.skinSwitch?.chukuangWorkerApi?.playEffect === "function" &&
		["chooseTarget", "chooseToUse", "chooseCardTarget", "chooseButtonTarget"].includes(event?.name) &&
		typeof event.isMine === "function" && event.isMine() && typeof event.filterTarget === "function";
}
function t(animation) {
	((animation.playLoseHp = player => {
		player && animation.playSpine("effect_loseHp", { scale: 0.6, speed: 0.8, parent: player });
	}),
		(animation.playRecoverNumber = (player, num) => {
			if (!player || !num || num < 1 || num > 9 || "off" === lib.config.extension_十周年UI_newDecadeStyle) return;
			// 当前安装包缺少回复数字骨骼，沿用本体的绿色数字及弹字队列。
			const popup = ui.create.div(".damage", "+" + num);
			popup.dataset.nature = "wood";
			player.damagepopups ||= [];
			player.damagepopups.push(popup);
			if (player.damagepopups.length === 1) player.$damagepop();
		}),
		(animation.playVirtualDamageNumber = (player, num) => {
			!player || num < 0 || num > 9 || animation.playSpine({ name: "globaltexiao/xunishuzi/SS_PaiJu_xunishanghai", action: "play" + num }, { speed: 0.6, scale: 0.5, parent: player, y: 20 });
		}),
		(animation.playDamageNumber = (player, num) => {
			if (!player || !num || num <= 1 || num > 9 || !lib.config.extension_十周年UI_newDecadeStyle) return;
			const isNewStyle = "off" !== lib.config.extension_十周年UI_newDecadeStyle,
				animName = "globaltexiao/shanghaishuzi/shuzi",
				options = { speed: 0.6, scale: 0.4, parent: player };
			(isNewStyle && (options.y = 20), animation.playSpine({ name: animName, action: String(num) }, options));
		}),
		(lib.element.player.inits = [].concat(lib.element.player.inits || []).concat(async player => {
			if (player.ChupaizhishiXObserver) return;
			let timer = null, loading = false, generation = 0;
			const shouldPlay = () => player.isConnected && player.classList.contains("selected") &&
				chupaiAnimations[decadeUI.config.chupaizhishi] && !usesLeiOlTargetEffect();
			const stopAnimation = () => {
				generation++;
				loading = false;
				if (player.ChupaizhishiXid) animation.stopSpine(player.ChupaizhishiXid);
				delete player.ChupaizhishiXid;
				if (timer !== null) clearTimeout(timer);
				timer = null;
			};
			const play = () => {
				timer = null;
				if (!shouldPlay()) return;
				const cfg = chupaiAnimations[decadeUI.config.chupaizhishi], current = generation;
				const start = () => {
					if (current !== generation) return;
					loading = false;
					if (shouldPlay()) player.ChupaizhishiXid = animation.playSpine({ name: cfg.name, loop: true, ...(cfg.anim ? { anim: cfg.anim } : {}) }, { parent: player, scale: cfg.scale });
				};
				// 冷加载结束后仍须核对选中状态，取消后不能补播循环特效。
				if (animation.hasSpine(cfg.name)) start();
				else {
					loading = true;
					animation.loadSpine(cfg.name, "skel", start, () => { if (current === generation) loading = false; });
				}
			};
			const refresh = (immediate = false) => {
				if (immediate || !shouldPlay()) stopAnimation();
				if (!shouldPlay() || player.ChupaizhishiXid || timer !== null || loading) return;
				window.chupaiload = true;
				if (immediate) play();
				else timer = setTimeout(play, 300);
			};
			const observer = new MutationObserver(() => refresh());
			observer.observe(player, { attributes: true, attributeFilter: ["class"] });
			player.ChupaizhishiXObserver = observer;
			player.ChupaizhishiXRefresh = refresh;
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
