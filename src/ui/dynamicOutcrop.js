import { lib, ui } from "noname";

const playerStates = new WeakMap();
const dynamicStates = new WeakMap();

const onlineTopGroups = {
	wei: "wei",
	shu: "shu",
	wu: "wu",
	qun: "qun",
	jin: "jin",
	shen: "shen",
	xie: "xie",
	yao: "yao",
	ye: "yeXin",
	yeXin: "yeXin",
	gary: "gary",
};
const mobileTopGroups = {
	wei: "wei",
	shu: "shu",
	wu: "wu",
	qun: "qun",
	jin: "jin",
	shen: "shen",
	ye: "ye",
	yeXin: "ye",
	weizhi: "weizhi",
};

function getOutcropMode(player) {
	const style = ui.arena?.dataset.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle;
	if (style !== "on" && style !== "othersOff") return null;
	if (player.parentNode !== ui.arena || player.classList.contains("qh-isBigAvatar")) return null;
	return !!lib.config.extension_十周年UI_dynamicSkinOutcrop;
}

function getDynamicTopStyle(player) {
	const style = ui.arena?.dataset.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle;
	if (style !== "onlineUI" && style !== "off") return null;
	if (player.parentNode !== ui.arena || player.classList.contains("qh-isBigAvatar")) return null;
	return lib.config.extension_十周年UI_dynamicSkinOutcrop ? style : null;
}

function getDynamicTopUrl(player, style) {
	const group = String(player.group || "");
	const groups = style === "onlineUI" ? onlineTopGroups : mobileTopGroups;
	const groupName = Object.hasOwn(groups, group) ? groups[group] : style === "onlineUI" ? "gary" : "weizhi";
	const root = window.decadeUIPath || `${lib.assetURL || ""}extension/十周年UI/`;
	const prefix = style === "onlineUI" ? "image/styles/decade/seat_dynamic_top_" : "image/styles/shousha/border_";
	return { group: groupName, url: `${root}${prefix}${groupName}.png` };
}

function getDynamicTopNode(player) {
	return Array.from(player.children || []).find(node => node.classList?.contains("dynamic-skin-top"));
}

function hideDynamicSkinTop(player) {
	const top = getDynamicTopNode(player);
	if (!top) return;
	top.hidden = true;
	top.style.display = "none";
	top.style.backgroundImage = "";
}

function refreshDynamicSkinTopInternal(player) {
	const dynamic = player?.dynamic;
	const state = dynamicStates.get(dynamic);
	const style = getDynamicTopStyle(player);
	if (!state || !state.activeSprites.size || !style) return hideDynamicSkinTop(player);
	let top = getDynamicTopNode(player);
	if (!top) {
		const createElement = player.ownerDocument?.createElement || (typeof document !== "undefined" && document.createElement);
		if (typeof createElement !== "function") return;
		top = createElement.call(player.ownerDocument || document, "div");
		top.className = "dynamic-skin-top";
		player.appendChild(top);
	}
	const asset = getDynamicTopUrl(player, style);
	top.dataset.group = asset.group;
	top.style.backgroundImage = `url("${asset.url}")`;
	top.hidden = false;
	top.style.display = "";
}

// 皮肤切换会使用 skin.player = skin；只复制配置对象，保留回调和非配置实例。
function copySkin(value, seen = new Map()) {
	if (!value || typeof value !== "object") return value;
	if (seen.has(value)) return seen.get(value);
	if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return value;
	const copy = Array.isArray(value) ? [] : {};
	seen.set(value, copy);
	for (const key of Object.keys(value)) copy[key] = copySkin(value[key], seen);
	return copy;
}

function getBackgrounds(sprite) {
	return [...new Set([sprite.beijing, sprite.dybg, sprite.player?.beijing, sprite.player?.dybg])].filter(background => background && typeof background === "object");
}

function restoreLegacyCrop(background) {
	const clip = background.clip;
	// 千幻聆音会在提交给播放器前写入这两种露头裁切；先还原，防止关闭后残留。
	if (clip && (clip.y === 0 || (Array.isArray(clip.y) && clip.y.every(value => value === 0))) && Array.isArray(clip.height) && clip.height[0] === 0 && [0.9, 0.873].includes(clip.height[1])) {
		background.clip = { ...clip, height: [0, 1] };
	}
}

function cropBackground(background, sprite, canvasHeight) {
	const clip = background.clip || sprite.clip || { x: 0, y: 0, width: [0, 1], height: [0, 1] };
	const y = Array.isArray(clip.y) ? clip.y : [clip.y || 0, 0];
	const height = Array.isArray(clip.height) ? clip.height : [clip.height ?? canvasHeight, 0];
	const croppedHeight = [-y[0], 0.9 - y[1]];
	if (croppedHeight[0] + croppedHeight[1] * canvasHeight <= 0) {
		background.clip = { ...clip, height: 0 };
		return;
	}
	// 保留原有更小的裁切范围，以及双将的 x / width；仅限制背景顶边。
	background.clip = { ...clip, height: height[0] + height[1] * canvasHeight <= croppedHeight[0] + croppedHeight[1] * canvasHeight ? height : croppedHeight };
}

function attachDynamicPlayer(player, dynamic) {
	if (!dynamic || typeof dynamic.play !== "function") return;
	if (dynamicStates.has(dynamic)) {
		refreshDynamicSkinTopInternal(player);
		return;
	}
	const play = dynamic.play;
	const state = { records: new WeakMap(), activeSprites: new Set() };
	dynamicStates.set(dynamic, state);
	[dynamic.primary, dynamic.deputy].forEach(sprite => sprite && state.activeSprites.add(sprite));
	dynamic.play = function (sprite, ...args) {
		const mode = getOutcropMode(player);
		if (mode === null || !sprite || typeof sprite !== "object") {
			const result = play.call(this, sprite, ...args);
			if (result && typeof result === "object") state.activeSprites.add(result);
			refreshDynamicSkinTopInternal(player);
			return result;
		}
		const original = copySkin(sprite);
		getBackgrounds(original).forEach(restoreLegacyCrop);
		const prepared = copySkin(original);
		if (mode) getBackgrounds(prepared).forEach(background => cropBackground(background, prepared, this.canvas.height || 200));
		this.outcropMask = mode;
		const result = play.call(this, prepared, ...args);
		if (result && typeof result === "object") {
			state.records.set(result, { original, args, mode });
			state.activeSprites.add(result);
		}
		refreshDynamicSkinTopInternal(player);
		return result;
	};
	if (typeof dynamic.stop === "function") {
		const stop = dynamic.stop;
		dynamic.stop = function (sprite, ...args) {
			const result = stop.call(this, sprite, ...args);
			if (sprite) state.activeSprites.delete(sprite);
			else state.activeSprites.clear();
			refreshDynamicSkinTopInternal(player);
			return result;
		};
	}
	if (typeof dynamic.stopAll === "function") {
		const stopAll = dynamic.stopAll;
		dynamic.stopAll = function (...args) {
			const result = stopAll.apply(this, args);
			state.activeSprites.clear();
			refreshDynamicSkinTopInternal(player);
			return result;
		};
	}
	if (typeof dynamic.destroy === "function") {
		const destroy = dynamic.destroy;
		dynamic.destroy = function (...args) {
			const result = destroy.apply(this, args);
			state.activeSprites.clear();
			if (player.dynamic === dynamic) hideDynamicSkinTop(player);
			return result;
		};
	}
	refreshDynamicSkinTopInternal(player);
}

function installDynamicWrapHook(player, state) {
	const wrap = player?.$dynamicWrap;
	if (!wrap || typeof wrap.appendChild !== "function") return;
	if (state.appendChildWrap === wrap && state.appendChildWrapper === wrap.appendChild) return;
	const appendChild = wrap.appendChild;
	wrap.appendChild = function (...args) {
		const result = appendChild.apply(this, args);
		const node = args[0];
		if (node?.classList?.contains?.("animation-player") || node === player.dynamic?.canvas) installDynamicOutcrop(player);
		return result;
	};
	state.appendChildWrap = wrap;
	state.appendChildWrapper = wrap.appendChild;
}

export function installDynamicOutcrop(player) {
	const state = playerStates.get(player) || {};
	const descriptor = Object.getOwnPropertyDescriptor(player, "dynamic");
	if (typeof state.getter === "function" && descriptor?.get === state.getter) {
		installDynamicWrapHook(player, state);
		refreshDynamicSkinTopInternal(player);
		return;
	}
	if (typeof state.getter === "function") hideDynamicSkinTop(player);
	if (descriptor && (!descriptor.configurable || descriptor.get || descriptor.set)) return;
	let dynamic = descriptor?.value;
	function getter() {
		return dynamic;
	}
	state.getter = getter;
	playerStates.set(player, state);
	// 在实际播放器实例上处理，千幻聆音重新定义 playDynamic 也不会覆盖此挂接。
	Object.defineProperty(player, "dynamic", {
		configurable: true,
		enumerable: descriptor?.enumerable ?? true,
		get: getter,
		set(value) {
			if (dynamic && dynamic !== value) hideDynamicSkinTop(player);
			dynamic = value;
			attachDynamicPlayer(player, value);
		},
	});
	installDynamicWrapHook(player, state);
	attachDynamicPlayer(player, dynamic);
}

export function refreshDynamicSkinTop(player) {
	installDynamicOutcrop(player);
	refreshDynamicSkinTopInternal(player);
}

export function refreshDynamicOutcrop(player) {
	installDynamicOutcrop(player);
	refreshDynamicSkinTopInternal(player);
	const dynamic = player.dynamic;
	const state = dynamicStates.get(dynamic);
	const mode = getOutcropMode(player);
	if (!state || mode === null) return;
	for (const layer of ["primary", "deputy"]) {
		const sprite = dynamic[layer];
		const record = sprite && state.records.get(sprite);
		if (!record || record.mode === mode) continue;
		if (!getBackgrounds(record.original).length) {
			record.mode = mode;
			continue;
		}
		const current = copySkin(sprite);
		const originalBackgrounds = getBackgrounds(record.original);
		getBackgrounds(current).forEach((background, index) => {
			const originalBackground = originalBackgrounds[index];
			if (!originalBackground || originalBackground.name !== background.name) return;
			if (originalBackground.clip === undefined) delete background.clip;
			else background.clip = copySkin(originalBackground.clip);
		});
		// 重播已完成左右分区的参数，不再经过 playDynamic，避免双将 x 偏移累加。
		// 使用当前参数，保留换肤编辑器在播放后调整过的位置、角度和缩放。
		dynamic.stop(sprite);
		dynamic[layer] = dynamic.play(current, ...record.args);
	}
}
