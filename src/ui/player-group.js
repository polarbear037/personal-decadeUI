import { lib, get, game } from "noname";
import { refreshDynamicSkinTop } from "./dynamicOutcrop.js";
function updateCampName(group) {
	const campName = this.node.campWrap.node.campName;
	const { campIdentityImageMode, newDecadeStyle } = decadeUI.config;
	this._finalGroup = group;
	campName.innerHTML = "";
	campName.style.backgroundImage = "";

	const showText = () => {
		const label = get.translation(group);
		const plain = get.plainText(label);
		campName.innerHTML = plain.length <= 2 ? label : label.replaceAll(plain, plain[0]);
	};
	if (!campIdentityImageMode || newDecadeStyle === "onlineUI") {
		this._lastCampTask = null;
		showText();
		return;
	}

	const prefix = newDecadeStyle === "off" ? "image/styles/shousha/name2_" : newDecadeStyle === "babysha" ? "image/styles/baby/hs_" : "image/styles/decade/name_";
	const task = (async () => {
		const showImage = async url => {
			if (!url) return false;
			const image = new Image();
			const loaded = await new Promise(resolve => {
				image.onload = () => resolve(true);
				image.onerror = () => resolve(false);
				image.src = url;
			});
			// 武将已换势力或切到文字时，丢弃旧请求的结果。
			if (this._lastCampTask !== task) return true;
			if (loaded) campName.style.backgroundImage = `url("${url}")`;
			return loaded;
		};
		if (await showImage(decadeUIPath + prefix + group + ".png")) return;
		const registered = lib.card[`group_${group}`]?.image;
		if (registered) {
			try {
				const url = registered.startsWith("db:")
					? await game.getDB("image", registered.slice(3))
					: lib.assetURL + registered.replace(/^ext:/, "extension/");
				if (await showImage(url)) return;
			} catch {}
		}
		if (await showImage(`${lib.assetURL}image/card/group_${group}.png`)) return;
		if (newDecadeStyle !== "codename") showText();
	})();
	this._lastCampTask = task;
}
function a() {
	Object.defineProperties(lib.element.player, {
		group: {
			configurable: !0,
			get() {
				return this._group;
			},
			set(group) {
				group && ((this._group = group), (this.node.campWrap.dataset.camp = get.character(this.name)?.groupBorder || group), updateCampName.call(this, group), refreshDynamicSkinTop(this));
			},
		},
	});
}
export { a as definePlayerGroupProperty };
