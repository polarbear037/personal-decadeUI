import { lib } from "noname";
import { cardSkinMeta as cardSkinMeta } from "../../config/utils.js";
import { generateSkinFilename as generateSkinFilename, isSkinPreloaded as isSkinPreloaded, getSkinCache as getSkinCache, getFallbackKey as getFallbackKey, getFallbackSkinUrl as getFallbackSkinUrl, createSkinAsset as createSkinAsset, buildSkinUrl as buildSkinUrl, loadSkinImage as loadSkinImage, loadFallbackSkin as loadFallbackSkin } from "./skin-loader.js";
function l(cardElement, url) {
	((cardElement.style.background = `url("${url}")`), cardElement.classList.add("decade-card"));
}
function u(u, card) {
	const f = Array.isArray(card) ? card[2] : card.name,
		m = Array.isArray(card) ? card[3] : card.nature,
		{ skinKey: y, isOff: g } = (function () {
			const skinKey = lib.config.extension_十周年UI_cardPrettify;
			return { skinKey: skinKey, isOff: !skinKey || "off" === skinKey };
		})();
	if ((u.classList.remove("decade-card"), g))
		return void (function (cardElement) {
			(cardElement.classList.remove("decade-card"), cardElement.style.removeProperty("background"));
		})(u);
	if (!cardSkinMeta[y]) return;
	if (
		((function (cardElement) {
			cardElement._decadeRawBg || (cardElement._decadeRawBg = cardElement.style.backgroundImage || cardElement.style.background || "");
		})(u),
		u.classList.add("decade-card"),
		u.classList.contains("infohidden"))
	)
		return;
	const k = generateSkinFilename(f, m);
	isSkinPreloaded(y)
		? (function (cardElement, skinKey, filename) {
				const o = getSkinCache(skinKey)[filename],
					fallbackKey = getFallbackKey(skinKey);
				if (void 0 === o) {
					const s = getFallbackSkinUrl(fallbackKey, filename);
					s ? l(cardElement, s) : cardElement.classList.remove("decade-card");
				} else o?.url ? l(cardElement, o.url) : cardElement.classList.remove("decade-card");
			})(u, y, k)
		: (function (cardElement, skinKey, filename) {
				const cache = getSkinCache(skinKey);
				let asset = cache[filename];
				const fallbackKey = getFallbackKey(skinKey);
				if (!0 === asset?.loaded && asset.url) l(cardElement, asset.url);
				else if (!1 !== asset?.loaded) {
					if ((asset || ((asset = createSkinAsset(filename)), (cache[filename] = asset)), void 0 === asset.loaded)) {
						const a = buildSkinUrl(skinKey, filename),
							r = cardElement._decadeRawBg || "";
						(loadSkinImage({
							url: a,
							asset: asset,
							onSuccess: () => {},
							onError: () => {
								fallbackKey
									? loadFallbackSkin({
											asset: asset,
											fallbackKey: fallbackKey,
											filename: filename,
											onSuccess: fallbackUrl => {
												cardElement.style.background = `url("${fallbackUrl}")`;
											},
											onFail: () => {
												((cardElement.style.background = r), cardElement.classList.remove("decade-card"));
											},
										})
									: ((asset.loaded = !1), (cardElement.style.background = r), cardElement.classList.remove("decade-card"));
							},
						}),
							(cardElement.style.background = `url("${a}")`));
					}
				} else cardElement.classList.remove("decade-card");
			})(u, y, k);
}
function f(card, asset, fallbackKey, filename) {
	const rawBg = card._decadeRawBg || "";
	if (!fallbackKey) return ((card.style.background = rawBg), void card.classList.remove("decade-card"));
	const fallbackUrl = getFallbackSkinUrl(fallbackKey, filename);
	fallbackUrl ? (card.style.background = `url("${fallbackUrl}")`) : ((card.style.background = rawBg), card.classList.remove("decade-card"));
}
function m(card) {
	card && u(card, card);
}
export { u as applyCardSkin, f as handleSkinFallback, m as refreshCardSkin };
