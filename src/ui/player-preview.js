import { game, get, lib, ui } from "noname";
import { createPlayerElement } from "./player-element.js";
import { playerPlayDynamic } from "../overrides/player/dynamic-skin.js";
import { DynamicPlayer } from "../animation/DynamicPlayer.js";
import { getResourceUrl } from "../core/resourcePaths.js";
import { prepareDynamicBackground } from "./dynamicOutcrop.js";

const skinKeys = ["name", "json", "skelType", "version", "action", "speed", "x", "y", "scale", "angle", "clip", "flipX", "flipY", "filpX", "filpY", "opacity", "alpha", "hideSlots", "clipSlots", "unpackPremultipliedAlpha", "background"];
const copySprite = skin => Object.fromEntries(skinKeys.filter(key => skin[key] !== undefined).map(key => [key, Array.isArray(skin[key]) ? [...skin[key]] : skin[key]]));

let previewStyle;
function getPreviewSkin(source, name, secondary) {
	if (window.decadeUI?.config?.dynamicSkin === false || lib.config.extension_千幻聆音_qhly_decadeCloseDynamic) return;
	const file = typeof game.qhly_getSkin === "function" ? game.qhly_getSkin(name) : lib.config.qhly_skinset?.skin?.[name];
	if (!file && typeof game.qhly_getSkin !== "function" && lib.config.skin?.[name]) return;
	const selected = typeof file === "string" && file ? file.split(/[\\/]/).pop().replace(/\.[^.]+$/, "") : "经典形象";
	const toggles = lib.config.qhly_skinset?.djtoggle?.[name];
	if (toggles?.[selected] || toggles?.[`${selected}.jpg`] || (file && toggles?.[file])) return;
	const configured = window.decadeUI?.dynamicSkin?.[name]?.[selected];
	// 原皮同样只匹配“经典形象”，绝不退到该武将配置中的第一项。
	if (!configured?.name) return;
	const current = source.dynamic?.[secondary ? "deputy" : "primary"];
	const matches = current && (current.name === configured.name || (current.skinName || current.player?.skinName) === selected);
	return { original: matches ? { ...configured, ...current.player, ...Object.fromEntries(Object.entries(current).filter(([, value]) => value !== undefined)) } : configured, current: !!matches };
}
function preparePlayerStyle(host) {
	// 复用战场卡牌的原规则，包括龙框、血条；只为信息窗补上原 #arena 作用域。
	if (!previewStyle) {
		previewStyle = document.createElement("style");
		previewStyle.id = "decade-player-preview-style";
		const rules = [];
		const append = (selectors, declarations, base) => {
			if (!selectors.length || !declarations) return;
			const selector = selectors.join(",").replaceAll("#arena", "#window .yjcm-player-preview-host");
			// SVG 本地片段属于当前文档；素材和变量中的相对图片地址仍按原 CSS 解析。
			declarations = declarations.replace(/url\(["']?([^"')]+)["']?\)/g, (_, url) => `url("${url.startsWith("#") ? url : new URL(url, base).href}")`);
			rules.push(`${selector}{${declarations}}`);
		};
		const collect = (sheet, base) => {
			for (const rule of sheet.cssRules) {
				if (rule.styleSheet) { collect(rule.styleSheet, new URL(rule.href, base).href); continue; }
				if (!rule.selectorText?.includes("#arena")) continue;
				let depth = 0;
				const selectors = rule.selectorText.replace(/[()[\],]/g, char => {
					if (char === "(" || char === "[") depth++;
					if (char === ")" || char === "]") depth--;
					return char === "," && !depth ? "\n" : char;
				}).split("\n").filter(selector => selector.includes("#arena"));
				append(selectors.filter(selector => selector.includes(".player")), rule.style.cssText, base);
				// 等阶血框等资源由 arena 的场景变量提供；只继承变量，不复制场景自身的布局。
				const variables = [...rule.style].filter(name => name.startsWith("--")).map(name => `${name}:${rule.style.getPropertyValue(name)}${rule.style.getPropertyPriority(name) ? " !important" : ""};`).join("");
				append(selectors.filter(selector => !selector.includes(".player")), variables, base);
			}
		};
		for (const sheet of document.styleSheets) {
			if (sheet.href && decodeURIComponent(sheet.href).includes("/extension/十周年UI/")) collect(sheet, sheet.href);
		}
		rules.push('#window .yjcm-player-preview-host .camp-border.yjcm-preview-dragon-canvas::after{content:none!important;}');
		previewStyle.textContent = rules.join("\n");
		document.head.append(previewStyle);
	}
	Object.assign(host.dataset, ui.arena.dataset);
	for (const name of ui.arena.style) if (name.startsWith("--")) host.style.setProperty(name, ui.arena.style.getPropertyValue(name), ui.arena.style.getPropertyPriority(name));
}

function attachPreviewDragon(preview, source) {
	const sourceBorder = source.node.campWrap?.querySelector(".camp-border");
	const border = preview.node.campWrap?.querySelector(".camp-border");
	const skinSwitch = window.skinSwitch;
	if (!sourceBorder || !border || typeof skinSwitch?.createSpineCanvas !== "function") return () => {};
	let sourceCanvas, canvas, disposed = false, generation = 0;
	const clear = () => {
		generation++;
		canvas?.disposeSpine();
		canvas = null;
		border.classList.remove("yjcm-preview-dragon-canvas");
	};
	const sync = () => {
		const current = sourceBorder.querySelector("canvas.skin-switch-dragon-spine");
		if (current === sourceCanvas) return;
		sourceCanvas = current;
		clear();
		if (!current?.spinePlayback || disposed) return;
		const token = generation;
		const appearance = getComputedStyle(current);
		const style = Object.fromEntries(["position", "left", "top", "width", "height", "transform", "transform-origin", "filter", "z-index"].map(key => [key, appearance.getPropertyValue(key)]));
		const sourceSize = getComputedStyle(sourceBorder);
		for (const [key, axis] of [["left", "width"], ["width", "width"], ["top", "height"], ["height", "height"]]) {
			const size = parseFloat(sourceSize[axis]), value = parseFloat(style[key]);
			if (size > 0 && Number.isFinite(value)) style[key] = `${value / size * 100}%`;
		}
		const onError = error => {
			if (disposed || token !== generation) return;
			clear();
			console.warn("[十周年UI] Preview dragon playback failed", error);
		};
		// 复用场上的共享 Spine 播放与设计坐标；预览不创建新的 WebGL 上下文。
		skinSwitch.createSpineCanvas({ ...current.spinePlayback.sprite }, { parent: border, className: "yjcm-preview-dragon-spine", fps: current.spinePlayback.fps, sharedPlayback: true, onError }).then(created => {
			if (disposed || token !== generation) { created.disposeSpine(); return; }
			canvas = created;
			for (const [key, value] of Object.entries(style)) canvas.style.setProperty(key, value);
			canvas.style.pointerEvents = "none";
			border.classList.add("yjcm-preview-dragon-canvas");
		}).catch(onError);
	};
	const observer = new MutationObserver(sync);
	observer.observe(sourceBorder, { childList: true });
	sync();
	return () => { disposed = true; observer.disconnect(); clear(); };
}

export function createPlayerPreview(host, source, secondary = false) {
	preparePlayerStyle(host);
	const preview = createPlayerElement(host, true);
	preview._decadePreview = true;
	preview.classList.add("yjcm-character-preview");
	preview.setAttribute("aria-hidden", "true");
	let canvasObserver, disposeDragon = () => {};
	const hidden = source !== game.me && source.classList.contains(secondary ? "unseen2" : "unseen");
	const name = secondary ? source.name2 : source.name1 || source.name;
	if (!hidden) {
		// 复用卡牌 DOM 与现有头像/血条展示，不调用会注册技能、随机等阶或启动第三方动皮的战场 init。
		preview.name = preview.name1 = name;
		preview.doubleAvatar = false;
		preview.group = secondary ? get.character(name).group : source.group;
		preview.classList.remove("decade-uninitialized");
		preview.classList.add("fullskin");
		preview.node.name.innerHTML = get.slimNameHorizontal?.(name) || get.slimName(name);
		// 连同 data-condition、数字血条模式及样式一起复制，每次开窗都取来源角色的完整状态。
		const hp = source.node.hp.cloneNode(true);
		preview.node.hp.replaceWith(hp);
		preview.node.hp = hp;
		if (source.dataset.maxHp) preview.dataset.maxHp = source.dataset.maxHp;
		const borderLevel = source.dataset.borderLevel || ui.arena.dataset.borderLevel;
		if (borderLevel) preview.dataset.borderLevel = borderLevel;
		else delete preview.dataset.borderLevel;
		disposeDragon = attachPreviewDragon(preview, source);
		const avatar = secondary ? source.node.avatar2 : source.node.avatar;
		preview.node.avatar.show();
		if (avatar) {
			preview.node.avatar.style.cssText = avatar.style.cssText;
			preview.node.avatar.style.opacity = "1";
			preview.node.avatar.classList.toggle("has-outcrop", avatar.classList.contains("has-outcrop"));
		}
		const selectedSkin = getPreviewSkin(source, name, secondary);
		const original = selectedSkin?.original;
		const skin = original && copySprite(original);
		if (skin?.name) {
			// 战场双将的半幅偏移属于其画布，预览使用完整单将坐标。
			if (selectedSkin.current && source.doubleAvatar) {
				delete skin.clip;
				if (Array.isArray(skin.x)) skin.x[1] += secondary ? -.25 : .25;
			}
			const dynamic = new DynamicPlayer(getResourceUrl("动态皮肤文件"));
			preview.dynamic = dynamic;
			dynamic.dprAdaptive = true;
			preview.$dynamicWrap.append(dynamic.canvas);
			const backgrounds = [...new Set([original.beijing, original.dybg])].filter(background => background?.name);
			for (const background of backgrounds) {
				const sprite = prepareDynamicBackground(preview, skin, { ...copySprite(background), version: background.version || skin.version });
				sprite.layer = -1;
				dynamic.play(sprite);
			}
			skin.layer = 0;
			playerPlayDynamic.call(preview, skin);
			const canvas = preview.dynamic.canvas;
			const update = () => { preview.node.avatar.style.opacity = canvas.style.visibility === "visible" ? "0" : "1"; };
			canvasObserver = new MutationObserver(update);
			canvasObserver.observe(canvas, { attributes: true, attributeFilter: ["style"] });
			update();
		}
	} else {
		preview.classList.remove("decade-uninitialized");
		preview.node.avatar.show();
		preview.node.avatar.setBackgroundImage("extension/十周年UI/ui/assets/character/xinsha/official/game_playerinfo_new_empty.png");
		preview.node.name.textContent = "未知";
		preview.node.hpWrap.style.display = "none";
	}
	for (const key of ["avatar2", "turnedover", "identity", "intro", "count", "equips", "judges", "marks", "chain", "name2", "nameol", "gainSkill", "seat"]) preview.node[key]?.remove();
	const dispose = () => {
		canvasObserver?.disconnect();
		disposeDragon();
		preview.dynamic?.destroy();
		preview.dynamic = null;
		preview.remove();
	};
	return { player: preview, dispose };
}
