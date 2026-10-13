import { get, lib } from "noname";
import { cardSkinMeta as cardSkinMeta } from "../../config/utils.js";
const o = { bingkele: "decade", gold: "caise" };
function e() {
	return window.decadeUI?.statics?.cards;
}
function r(skinKey) {
	const res = e();
	return res ? res[skinKey] || (res[skinKey] = {}) : {};
}
function t(skinKey) {
	const res = e();
	return !!res?.READ_OK?.[skinKey];
}
function i(skinKey) {
	const fallbackKey = o[skinKey];
	return fallbackKey && cardSkinMeta[fallbackKey] ? fallbackKey : null;
}
function s(skinKey, filename) {
	const skin = cardSkinMeta[skinKey];
	if (!skin) return "";
	const decadeUIName = window.decadeUI?.extensionName || "十周年UI",
		folder = skin.dir || skinKey,
		extension = skin.extension || "png";
	return `${lib.assetURL}extension/${decadeUIName}/image/card-skins/${folder}/${filename}.${extension}`;
}
function u(cardName, cardNature) {
	let filename = cardName;
	if ("sha" === cardName && cardNature && !Array.isArray(cardNature)) {
		filename += "_" + get.natureList(cardNature).sort(lib.sort.nature).join("_");
	}
	return filename;
}
function a(n, o) {
	if (!n) return null;
	const e = r(n)[o];
	return !0 === e?.loaded ? e.url : null;
}
function c(n) {
	return { name: n, url: void 0, loaded: void 0, image: void 0 };
}
function d({ url: url, asset: asset, onSuccess: onSuccess, onError: onError }) {
	const image = new Image();
	return (
		(image.onload = () => {
			((asset.loaded = !0), (asset.url = url));
		}),
		(image.onerror = () => {
			onError?.();
		}),
		(asset.url = url),
		(asset.image = image),
		(image.src = url),
		image
	);
}
function l({ asset: asset, fallbackKey: fallbackKey, filename: filename, onSuccess: onSuccess, onFail: onFail }) {
	const fallbackUrl = s(fallbackKey, filename),
		fallbackImage = new Image();
	((fallbackImage.onload = () => {
		((asset.loaded = !0), (asset.url = fallbackUrl), onSuccess?.(fallbackUrl));
	}),
		(fallbackImage.onerror = () => {
			((asset.loaded = !1), onFail?.());
		}),
		(fallbackImage.src = fallbackUrl));
}
export { s as buildSkinUrl, c as createSkinAsset, u as generateSkinFilename, e as getCardResources, i as getFallbackKey, a as getFallbackSkinUrl, r as getSkinCache, t as isSkinPreloaded, l as loadFallbackSkin, d as loadSkinImage };
