import { game, get, lib } from "noname";
import { getBasePlayerMethods as getBasePlayerMethods } from "./base.js";
const s = /* @__PURE__ */ new Map();
function n(n) {
	if ((getBasePlayerMethods().$changeZhuanhuanji.apply(this, arguments), !get.is.zhuanhuanji(n, this))) return;
	if (this.hiddenSkills.includes(n) && this !== game.me) return;
	const t = this.node.xSkillMarks?.querySelector(`[data-id="${n}"]`);
	t &&
		(s.has(n)
			? ((t.dk = (function (i) {
					return s.get(i) ?? !1;
				})(n)),
				e(this, t, n))
			: (async function (i) {
					if (s.has(i)) return s.get(i);
					const n = `${lib.assetURL}extension/十周年UI/ui/assets/skill/shousha/zhuanhuanji/${i}_yang.png`;
					return new Promise(e => {
						const t = new Image();
						((t.onload = () => {
							(s.set(i, !0), e(!0));
						}),
							(t.onerror = () => {
								(s.set(i, !1), e(!1));
							}),
							(t.src = n));
					});
				})(n).then(exists => {
					((t.dk = exists), e(this, t, n));
				}));
}
function e(player, i, s) {
	"off" !== lib.config.extension_十周年UI_newDecadeStyle
		? (function (mark) {
				mark.classList.contains("yin") ? (mark.classList.remove("yin"), mark.classList.add("yang")) : (mark.classList.remove("yang"), mark.classList.add("yin"));
			})(i)
		: (function (player, i, s) {
				const n = "extension/十周年UI/ui/assets/skill/shousha/zhuanhuanji/",
					e = `${n}${s}_yang.png`,
					t = `${n}${s}_ying.png`,
					a = `${n}ditu_yang.png`,
					l = `${n}ditu_ying.png`;
				!0 === i.dd ? (player.setSkillYinYang(s, !1), (i.dd = !1), i.setBackgroundImage(i.dk ? e : a)) : (player.setSkillYinYang(s, !0), (i.dd = !0), i.setBackgroundImage(i.dk ? t : l));
			})(player, i, s);
}
function t(skill, isYang) {
	game.broadcastAll((player, skill, isYang) => player.$setSkillYinYang(skill, isYang), this, skill, isYang);
}
function a(skill, isYang) {
	((this.yangedSkills ??= []), (this.yingedSkills ??= []), isYang ? (this.yangedSkills.add(skill), this.yingedSkills.remove(skill)) : (this.yingedSkills.add(skill), this.yangedSkills.remove(skill)));
}
function l(skill, state) {
	game.broadcastAll((player, skill, state) => player.$setSkillState(skill, state), this, skill, state);
}
function o(i, s) {
	switch (s) {
		case "fail":
			!(function (player, skill) {
				if (player.hiddenSkills.includes(skill) && player !== game.me) return;
				const mark = player.node.xSkillMarks?.querySelector(`[data-id="${skill}"]`);
				mark && mark.classList.add("fail");
			})(this, i);
			break;
		case "shixiao":
			d(this, i, !0);
			break;
		case "unshixiao":
			d(this, i, !1);
	}
}
function d(player, skill, isShixiao) {
	((player.shixiaoedSkills ??= []), isShixiao ? player.shixiaoedSkills.add(skill) : player.shixiaoedSkills.remove(skill));
}
export { o as player$SetSkillState, a as player$SetSkillYinYang, n as playerChangeZhuanhuanji, l as playerSetSkillState, t as playerSetSkillYinYang };
