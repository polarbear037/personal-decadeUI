import { get, lib, ui } from "noname";
import { CONFIG as CONFIG, GENERAL_NAME_STYLE as GENERAL_NAME_STYLE } from "./config.js";
import { isPlayer as isPlayer, getName as getName, getDefaultAvatar as getDefaultAvatar, toKebab as toKebab } from "./utils.js";
import { checkImageExists as checkImageExists, getOutcropStyle as getOutcropStyle, getOutcropImagePath as getOutcropImagePath } from "../ui/outcropAvatar.js";
import { getResourceUrl } from "../core/resourcePaths.js";
function f(player, a, f) {
	if (!isPlayer(player)) return;
	const g = decadeUI.animation,
		m = g.spine.assets.effect_xianding;
	if (!m) return void console.error("[effect_xianding]特效未加载");
	m.ready || g.prepSpine("effect_xianding");
	const u = "vice" === f,
		l = player.group,
		p = getName(player, u);
	!(async function (n, i, player, a, f) {
		try {
			const g = await (async function (name) {
					if (!name) return null;
					const nameinfo = get.character(name),
						mode = get.mode();
					let realName = name;
					lib.characterPack[`mode_${mode}`]?.[name] && "guozhan" === mode && (realName = name.startsWith("gz_shibing") ? name.slice(3, 11) : name.slice(3));
					if (lib.config.skin[realName]) return lib.config.skin[realName][1];
					if (nameinfo?.img) return nameinfo.img;
					if (nameinfo?.trashBin)
						for (const value of nameinfo.trashBin) {
							if (value.startsWith("img:")) return value.slice(4);
							if (value.startsWith("ext:")) return value.replace(/^ext:/, "extension/");
						}
					const lihuiPath = getResourceUrl("立绘文件", `${realName}.jpg`);
					if (await checkImageExists(lihuiPath)) return lihuiPath;
					const outcropStyle = getOutcropStyle();
					if ("off" !== outcropStyle) {
						const e = getOutcropImagePath(realName, outcropStyle);
						if (e && (await checkImageExists(e))) return e;
					}
					return `${lib.assetURL}image/character/${realName}.jpg`;
				})(n),
				[m, u] = await Promise.all([d(g, player, n), h(i)]);
			!(function (n, i, a, c, o) {
				const s = decadeUI.animation,
					f = s.playSpine("effect_xianding");
				if (!f?.skeleton) return void console.error("Spine动画加载失败");
				const d = f.skeleton;
				((function (skeleton, slotName, img, anim, cacheKey) {
					const slot = skeleton.findSlot(slotName),
						attachment = slot.getAttachment();
					if (attachment.camp === cacheKey) return;
					((attachment.cached = attachment.cached || {}), attachment.cached[cacheKey] || (attachment.cached[cacheKey] = anim.createTextureRegion(img)));
					const region = attachment.cached[cacheKey];
					((attachment.width = region.width), (attachment.height = region.height), attachment.setRegion(region), attachment.updateOffset(), (attachment.camp = cacheKey));
				})(d, "shilidipan", i, s, a),
					(function (skeleton, img, anim) {
						const slot = skeleton.findSlot("wujiang"),
							attachment = slot.getAttachment(),
							region = anim.createTextureRegion(img),
							scale = Math.min(CONFIG.SKILL_MAX_W / region.width, CONFIG.SKILL_MAX_H / region.height);
						((attachment.width = region.width * scale), (attachment.height = region.height * scale), attachment.setRegion(region), attachment.updateOffset());
					})(d, n, s));
				const h = d.bounds.size;
				((f.scale = Math.max(s.canvas.width / h.x, s.canvas.height / h.y)),
					(function (skillName, playerName, spriteScale) {
						const skillEl = decadeUI.element.create("skill-name");
						((skillEl.innerHTML = skillName), (skillEl.style.top = `calc(50% + ${CONFIG.SKILL_NAME_Y * spriteScale}px)`));
						const nameEl = decadeUI.element.create("general-name");
						nameEl.innerHTML = playerName;
						const styles = { ...GENERAL_NAME_STYLE, right: `calc(50% - ${CONFIG.GENERAL_X * spriteScale}px)`, top: `calc(50% - ${CONFIG.GENERAL_Y * spriteScale}px)` };
						((nameEl.style.cssText = Object.entries(styles)
							.map(([k, v]) => `${toKebab(k)}: ${v}`)
							.join("; ")),
							ui.arena.appendChild(skillEl),
							ui.arena.appendChild(nameEl),
							skillEl.removeSelf(CONFIG.EFFECT_DURATION),
							nameEl.removeSelf(CONFIG.EFFECT_DURATION));
					})(c, o, f.scale));
			})(m, u, i, a, f);
		} catch (err) {
			console.error("技能特效加载失败:", err);
		}
	})(u ? player.name2 : player.name, l, player, a, p);
}
function d(src, player, characterName) {
	return new Promise((resolve, reject) => {
		if (!src) return void reject(new Error("图片路径为空"));
		const img = new Image();
		((img.onload = () => resolve(img)),
			(img.onerror = async () => {
				const fallback = await (async function (e, player) {
					return getDefaultAvatar(player);
				})(0, player);
				fallback && fallback !== src ? ((img.onload = () => resolve(img)), (img.onerror = () => reject(new Error("图片加载失败"))), (img.src = fallback)) : reject(new Error("图片加载失败"));
			}),
			(img.src = src.startsWith("http") || src.startsWith("data:") ? src : `${lib.assetURL}${src.replace(lib.assetURL, "")}`));
	});
}
function h(e) {
	return new Promise(t => {
		const n = new Image();
		((n.onload = () => t(n)),
			(n.onerror = () => {
				((n.onload = () => t(n)), (n.src = `${decadeUIPath}image/ui/misc/bg_xianding_qun.png`));
			}),
			(n.src = `${decadeUIPath}image/ui/misc/bg_xianding_${e}.png`));
	});
}
export { f as playSkillEffect };
