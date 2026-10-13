import { lib, get, game, _status, ui } from "noname";
import { element as element } from "../utils/element.js";
import { updatePlayerOutcropAvatar as updatePlayerOutcropAvatar } from "./outcropAvatar.js";
import { getResourceUrl } from "../core/resourcePaths.js";
function i(base) {
	return function (character, character2) {
		(base.lib.element.player.$init.apply(this, arguments), (this.doubleAvatar = void 0 !== (character2 && lib.character[character2])));
		const info = lib.character[character];
		(info && get.is.newLayout && (game.minskin || !get.is.newLayout() || info.isMinskin ? (info.isMinskin || game.minskin) && this.classList.add("minskin") : this.classList.remove("minskin")), this.node.name && this.group && (this.node.name.dataset.nature = get.groupnature(this.group)), "othersOff" === lib.config.extension_十周年UI_newDecadeStyle && (this.checkAndAddExperienceSuffix(character), character2 && this.checkAndAddExperienceSuffix(character2, !0)));
		if ("random" === lib.config.extension_十周年UI_borderLevel)
			if (this === game.me) this.dataset.borderLevel = "five";
			else {
				const levels = ["one", "two", "three", "four", "five"];
				this.dataset.borderLevel = levels[Math.floor(Math.random() * levels.length)];
			}
		else delete this.dataset.borderLevel;
		let CUR_DYNAMIC = decadeUI.CUR_DYNAMIC ?? 0,
			MAX_DYNAMIC = decadeUI.MAX_DYNAMIC ?? (decadeUI.isMobile() ? 2 : 10) + (window.OffscreenCanvas ? 8 : 0);
		((decadeUI.CUR_DYNAMIC = CUR_DYNAMIC), (decadeUI.MAX_DYNAMIC = MAX_DYNAMIC), this.dynamic && this.stopDynamic());
		if ((this.dynamic || CUR_DYNAMIC < MAX_DYNAMIC) && decadeUI.config.dynamicSkin && null !== _status.mode) {
			const e = decadeUI.dynamicSkin,
				t = this.doubleAvatar ? [character, character2] : [character];
			let i;
			for (let n = 0; n < t.length; n++) {
				const o = e[t[n]];
				if (!o) continue;
				const s = Object.keys(o);
				if (!s.length) {
					console.error(`player.init: ${t[n]} 没有设置动皮参数`);
					continue;
				}
				const d = o[s[0]];
				(void 0 === d.speed && (d.speed = 1), this.playDynamic({ name: d.name, action: d.action, loop: !0, loopCount: -1, speed: d.speed, filpX: void 0, filpY: void 0, opacity: void 0, x: d.x, y: d.y, scale: d.scale, angle: d.angle, hideSlots: d.hideSlots, clipSlots: d.clipSlots }, 1 === n), d.background ? this.$dynamicWrap.style.setProperty("--dynamic-skin-background", `url("${getResourceUrl("动态皮肤文件", d.background)}")`) : this.$dynamicWrap.style.removeProperty("--dynamic-skin-background"), i || ((i = !0), decadeUI.CUR_DYNAMIC++));
			}
		}
		if (!this.node.showCards) {
			const player = this;
			((player.node.showCards = element.create("handdisplays", player)), player.node.showCards.hide());
			const t = player.getBoundingClientRect(),
				i = window.innerWidth || document.documentElement.clientWidth,
				n = player.node.showCards,
				o = 10,
				s = "babysha" === lib.config.extension_十周年UI_newDecadeStyle;
			((s && t.left < i / 2) || (!s && t.left >= i / 2) ? ((n.style.left = ""), (n.style.right = player.offsetWidth + o + "px")) : ((n.style.left = player.offsetWidth + o + "px"), (n.style.right = "")),
				(n.style.top = "90px"),
				(player.node.showCards.onclick = function () {
					const cards = player.getCards("h", e => get.is.shownCard(e) || player.isUnderControl(!0) || game.me?.hasSkillTag("viewHandcard", null, player, !0));
					if (cards.length > 0) {
						const t = ui.create.div(".popup-container", ui.window),
							i = ui.create.dialog(get.translation(player) + "的手牌", cards);
						((i.static = !0),
							t.addEventListener("click", () => {
								(t.delete(), i.close(), i.delete());
							}));
					}
				}),
				["handcards1", "handcards2"].forEach(zone => {
					new MutationObserver(mutations => {
						for (const t of mutations)
							if ("childList" === t.type && (t.addedNodes.length || t.removedNodes.length)) {
								player.decadeUI_updateShowCards();
								break;
							}
					}).observe(player.node[zone], { childList: !0 });
				}));
		}
		(window.decadeModule?.prefixMark && (window.decadeModule.prefixMark.showPrefixMark(character, this), character2 && this.doubleAvatar && window.decadeModule.prefixMark.showPrefixMark(character2, this)), this.node.seat || (this.node.seat = element.create("seat", this)), this.decadeUI_updateShowCards());
		const outcropStyle = lib.config.extension_十周年UI_outcropSkin;
		return (outcropStyle && "off" !== outcropStyle && updatePlayerOutcropAvatar(this, outcropStyle), this);
	};
}
export { i as createPlayerInit };
