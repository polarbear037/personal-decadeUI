import { lib, get } from "noname";
import { cardSkinMeta as cardSkinMeta } from "../../config/utils.js";
import { getChixuerenSkinFilename as getChixuerenSkinFilename } from "./chixueren.js";
import { generateSkinFilename as generateSkinFilename, isSkinPreloaded as isSkinPreloaded, getSkinCache as getSkinCache, getFallbackKey as getFallbackKey, getFallbackSkinUrl as getFallbackSkinUrl, createSkinAsset as createSkinAsset, buildSkinUrl as buildSkinUrl, loadSkinImage as loadSkinImage, loadFallbackSkin as loadFallbackSkin } from "./skin-loader.js";
// 已存在的牌及后续装备区迁移也可恢复原生皮肤，无需再次 init 卡牌。
lib.decadeCardSkin = { restore: card => applySkin(card, card, { skipProvider: true }) };
function l(cardElement, url) {
	((cardElement.style.background = `url("${url}")`), cardElement.classList.add("decade-card"));
}
function p(cardElement, card, skinKey) {
	const owner = typeof get.owner === "function" ? get.owner(cardElement) : null;
	const chixuerenFilename = getChixuerenSkinFilename(cardElement, owner);
	const cardName = Array.isArray(card) ? card[2] : card?.name || cardElement?.name;
	const nature = Array.isArray(card) ? card[3] : card?.nature || cardElement?.nature;
	return chixuerenFilename && skinKey === "online" ? chixuerenFilename : generateSkinFilename(cardName, nature);
}
let observerInstalled = false;
function installChixuerenObserver() {
	if (observerInstalled || typeof MutationObserver === "undefined" || !document.body) return;
	observerInstalled = true;
	new MutationObserver(records => {
		for (const record of records) {
			for (const added of record.addedNodes) {
				if (added.nodeType !== 1) continue;
				const cards = [];
				if (added.classList?.contains("card") && added.dataset?.cardName === "chixueren") cards.push(added);
				added.querySelectorAll?.('.card[data-card-name="chixueren"]').forEach(card => cards.push(card));
				cards.forEach(card => !card._decadeChixuerenSkinClone && applySkin(card, card));
			}
		}
	}).observe(document.body, { childList: true, subtree: true });
}
function applySkin(cardElement, card, options = {}) {
	const cardName = Array.isArray(card) ? card[2] : card?.name || cardElement?.name || cardElement?.dataset?.cardName;
	// Faction dialog buttons are group_* virtual cards whose country images are set by their own dialog renderer.
	// The generic skin loader has no matching card assets and its asynchronous fallback can overwrite those images.
	if (typeof cardName === "string" && cardName.startsWith("group_")) return;
	// 废除装备槽是占位节点，没有对应的卡牌皮肤。
	if (typeof cardName === "string" && cardName.startsWith("empty_equip")) return;
	cardName === "chixueren" && (installChixuerenObserver(), cardElement._decadeChixuerenRefreshBound || ((cardElement._decadeChixuerenRefreshBound = true), cardElement.addEventListener("decadeUIChixuerenRefresh", () => applySkin(cardElement, cardElement))));
	// 只接管图像：卡牌节点、数据初始化和装备布局仍使用本体流程。
	// provider 在创建/复制时同步准备首帧，缺图时可跳过 provider 恢复原生换肤。
	if (!options.skipProvider && lib.cardSkinProvider?.apply(cardElement, () => applySkin(cardElement, cardElement, { skipProvider: true }))) {
		if (!cardElement.classList.contains("decade-card")) cardElement.classList.add("decade-card");
		return true;
	}
	if (options.providerOnly) return false;
	const f = cardName,
		{ skinKey: y, isOff: g } = (function () {
			const skinKey = lib.config.extension_十周年UI_cardPrettify;
			return { skinKey: skinKey, isOff: !skinKey || "off" === skinKey };
		})();
	if ((cardElement.classList.remove("decade-card"), g))
		return void (function (cardElement) {
			(cardElement.classList.remove("decade-card"), cardElement.style.removeProperty("background"));
		})(cardElement);
	if (!cardSkinMeta[y]) return;
	if (
		((function (cardElement) {
			cardElement._decadeRawBg || (cardElement._decadeRawBg = cardElement.style.backgroundImage || cardElement.style.background || "");
		})(cardElement),
		cardElement.classList.add("decade-card"),
		cardElement.classList.contains("infohidden"))
	)
		return;
	const k = p(cardElement, card, y);
	f === "chixueren" && (cardElement._decadeChixuerenSkinFilename = k);
	const cachedAsset = getSkinCache(y)[k];
	// A completed directory scan can still lack a variant card skin (for example chixueren2).
	// Load that missing asset on demand instead of treating READ_OK as proof it exists.
	isSkinPreloaded(y) && cachedAsset !== undefined
		? (function (cardElement, skinKey, filename) {
				const o = getSkinCache(skinKey)[filename],
					fallbackKey = getFallbackKey(skinKey);
				if (void 0 === o) {
					const s = getFallbackSkinUrl(fallbackKey, filename);
					s ? l(cardElement, s) : cardElement.classList.remove("decade-card");
				} else o?.url ? l(cardElement, o.url) : cardElement.classList.remove("decade-card");
			})(cardElement, y, k)
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
			})(cardElement, y, k);
}
function f(card, asset, fallbackKey, filename) {
	const rawBg = card._decadeRawBg || "";
	if (!fallbackKey) return ((card.style.background = rawBg), void card.classList.remove("decade-card"));
	const fallbackUrl = getFallbackSkinUrl(fallbackKey, filename);
	fallbackUrl ? (card.style.background = `url("${fallbackUrl}")`) : ((card.style.background = rawBg), card.classList.remove("decade-card"));
}
function m(card) {
	card && applySkin(card, card);
}
export { applySkin as applyCardSkin, f as handleSkinFallback, m as refreshCardSkin };
