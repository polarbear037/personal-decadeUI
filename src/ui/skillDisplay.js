import { lib, game, get } from "noname";
import { isDoubleCharacterMode as isDoubleCharacterMode } from "./characterBackground.js";
const ONLINE_CONVERSION_ICON_ROOT = "extension/十周年UI/ui/assets/skill/online";

function getConversionDisplaySrc(state) {
	if (lib.config.extension_十周年UI_newDecadeStyle === "onlineUI") {
		return `${lib.assetURL}${ONLINE_CONVERSION_ICON_ROOT}/skillitem_yinyang_${state === "yang" ? "bg" : "bg_1"}.png`;
	}
	return `extension/十周年UI/ui/assets/skill/baby/${state === "yang" ? "mark_yanghs.png" : "mark_yinghs.png"}`;
}

function bindConversionIconUpdates() {
	if (typeof document === "undefined" || document.__decadeUIConversionIconUpdates) return;
	const handler = event => {
		const detail = event.detail;
		if (!detail?.skill || !detail.state) return;
		for (const box of document.querySelectorAll(".baby_skill_box[data-skill]")) {
			if (box.dataset.skill !== detail.skill) continue;
			const icon = box.querySelector(".baby_skill_conversion_mark");
			if (icon) icon.src = getConversionDisplaySrc(detail.state);
		}
	};
	document.addEventListener("decadeui:conversion-icon-change", handler);
	document.__decadeUIConversionIconUpdates = handler;
}
function t() {
	const playerSkillArrays = /* @__PURE__ */ new WeakMap(),
		getAllPlayersCount = () => game.players.length + (game.dead?.length || 0),
		i = (e, player) => {
			if (!player || player === game.me || !lib.translate?.[e]) return !1;
			const t = get.info(e);
			return !t?.nopop || t.enable || e.startsWith("olhedao_tianshu_");
		},
		getSkillName = skill => lib.translate?.[skill] || skill,
		r = player => {
			if (getAllPlayersCount() > 5) return;
			const i = player.node?.avatar;
			if (!i) return;
			i.parentNode.querySelectorAll(".baby_skill").forEach(e => e.remove());
			const r = playerSkillArrays.get(player) || [],
				a = /* @__PURE__ */ new Set(),
				o = r.filter(e => {
					const t = getSkillName(e);
					return !a.has(t) && (a.add(t), !0);
				}),
				s = i.getBoundingClientRect().left < window.innerWidth / 2,
				c = isDoubleCharacterMode(),
				d = c ? 135 : 75,
				p = document.createDocumentFragment();
			(o.forEach((e, t) => {
				const n = document.createElement("div");
				((n.className = "baby_skill"), Object.assign(n.style, { position: "absolute", bottom: 35 * t + 30 + "px", zIndex: "102", left: s ? `${i.offsetWidth + (c ? 65 : 10)}px` : "", right: s ? "" : `${i.offsetWidth + d}px` }));
				const r = document.createElement("div");
				((r.className = "baby_skill_box"),
					(r.dataset.skill = e),
					(r.textContent = getSkillName(e).slice(0, 2)),
					(r.style.cursor = "pointer"),
					r.addEventListener("click", t => {
						var n;
						(t.stopPropagation(),
							(n = "BtnSure"),
							game.playAudio("..", "extension", "十周年UI", `audio/${n}`),
							((skill, targetEl) => {
								if ((document.querySelector(".baby_skill_popup")?.remove(), !lib.skill[skill])) return;
								const popup = document.createElement("div");
								((popup.className = "baby_skill_popup"), (popup.innerHTML = `\n\t\t\t<div class="skill_title">${getSkillName(skill)}</div>\n\t\t\t<div class="skill_description">${get.translation(skill, "info") || "暂无描述"}</div>\n\t\t`), document.body.appendChild(popup));
								const title = popup.querySelector(".skill_title"),
									desc = popup.querySelector(".skill_description");
								popup.style.height = `${title.scrollHeight + desc.scrollHeight + 32}px`;
								const rect = targetEl.getBoundingClientRect(),
									popupRect = popup.getBoundingClientRect();
								let left = rect.left + rect.width / 2 - popupRect.width / 2,
									top = rect.top - popupRect.height - 10;
								((left = Math.max(10, Math.min(left, window.innerWidth - popupRect.width - 10))), top < 10 && (top = rect.bottom + 10), (popup.style.left = `${left}px`), (popup.style.top = `${top}px`));
								const closeHandler = e => {
									popup.contains(e.target) || (popup.remove(), document.removeEventListener("click", closeHandler));
								};
								setTimeout(() => document.addEventListener("click", closeHandler), 100);
							})(e, t.target));
					}),
					n.appendChild(r));
				const a = ((skill, player) => {
					const info = get.info(skill);
					if (!info) return null;
					if (info.limited) return "xiandingjihs.png";
					if (info.juexingji) return "juexingjihs.png";
					if (get.is.zhuanhuanji(skill, player)) {
						const markNode = player?.node?.xSkillMarks?.querySelector(`.skillMarkItem.zhuanhuanji[data-id="${skill}"]`);
						return markNode?.classList.contains("yin") ? "mark_yinghs.png" : "mark_yanghs.png";
					}
					return null;
				})(e, player);
				if (a) {
					const icon = document.createElement("img");
					if (get.is.zhuanhuanji(e, player)) {
						icon.className = "baby_skill_conversion_mark";
						const markNode = player?.node?.xSkillMarks?.querySelector(`.skillMarkItem.zhuanhuanji[data-id="${e}"]`);
						icon.src = getConversionDisplaySrc(markNode?.classList.contains("yin") ? "yin" : "yang");
					} else icon.src = `extension/十周年UI/ui/assets/skill/baby/${a}`;
					Object.assign(icon.style, { position: "absolute", top: "3px", right: "-15px", width: "16px", height: "16px", zIndex: "103" });
					n.appendChild(icon);
				}
				p.appendChild(n);
			}),
				i.parentNode.appendChild(p), bindConversionIconUpdates());
		},
		updateSkillArray = (player, skill, add = !0) => {
			if (getAllPlayersCount() > 5 || !i(skill, player)) return;
			playerSkillArrays.has(player) || playerSkillArrays.set(player, []);
			const arr = playerSkillArrays.get(player),
				idx = arr.indexOf(skill);
			(add && -1 === idx ? arr.push(skill) : !add && idx > -1 && arr.splice(idx, 1), r(player));
		},
		refreshPlayerSkills = player => {
			if (getAllPlayersCount() > 5 || !player?.node?.avatar) return;
			const skills = [...(player.skills || []), ...(player.additionalSkills ? Object.keys(player.additionalSkills) : [])];
			(playerSkillArrays.set(
				player,
				skills.filter(s => i(s, player))
			),
				r(player));
		};
	["showCharacterEnd", "hideCharacter", "changeCharacter", "removeCharacter"].forEach(event => {
		const original = lib.element.player[event];
		"function" == typeof original &&
			(lib.element.player[event] = function (...args) {
				(original.apply(this, args), refreshPlayerSkills(this));
			});
	});
	const origAdd = lib.element.player.addSkill,
		origRemove = lib.element.player.removeSkill;
	((lib.element.player.addSkill = function (e, ...t) {
		const n = origAdd.apply(this, [e, ...t]);
		return ((Array.isArray(e) ? e : [e]).forEach(e => requestAnimationFrame(() => updateSkillArray(this, e, !0))), n);
	}),
		(lib.element.player.removeSkill = function (e, ...t) {
			const n = origRemove.apply(this, [e, ...t]);
			return ((Array.isArray(e) ? e : [e]).forEach(e => requestAnimationFrame(() => updateSkillArray(this, e, !1))), n);
		}));
	const origIsUnderControl = lib.element.player.isUnderControl;
	("function" == typeof origIsUnderControl &&
		(lib.element.player.isUnderControl = function (...e) {
			const result = origIsUnderControl.apply(this, e),
				t = this.__babyshaUnderControl;
			return ((this.__babyshaUnderControl = result), void 0 !== t && t !== result && getAllPlayersCount() <= 5 && requestAnimationFrame(() => refreshPlayerSkills(this)), result);
		}),
		(lib.skill._zhuanhuanjiUpdate = {
			charlotte: !0,
			forced: !0,
			popup: !1,
			silent: !0,
			trigger: { global: "changeZhuanhuanji" },
			filter: event => getAllPlayersCount() <= 5 && event.player && event.skill,
			async content(event) {
				r(event.player);
			},
		}),
		(lib.refreshPlayerSkills = refreshPlayerSkills));
}
function n() {
	for (const player of [...game.players, ...(game.dead || [])]) player.node?.avatar?.parentNode?.querySelectorAll(".baby_skill").forEach(e => e.remove());
}
function i() {
	(bindConversionIconUpdates(), "babysha" === lib.config.extension_十周年UI_newDecadeStyle && game.players.length <= 5 && t(), (lib.clearAllSkillDisplay = n));
}
export { n as clearAllSkillDisplay, t as initSkillDisplay, i as setupSkillDisplay };
