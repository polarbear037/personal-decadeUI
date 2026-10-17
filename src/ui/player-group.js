import { lib, get, game } from "noname";
import { refreshDynamicSkinTop } from "./dynamicOutcrop.js";
function e(group) {
	if (decadeUI.config.campIdentityImageMode)
		((this._lastCampTask = this._lastCampTask || Promise.resolve()),
			(this._lastCampTask = this._lastCampTask.then(async () => {
				((this.node.campWrap.node.campName.innerHTML = ""), (this.node.campWrap.node.campName.style.backgroundImage = ""), (this._finalGroup = group));
				const create = () => {
						if ("codename" !== decadeUI.config.newDecadeStyle && this._finalGroup) {
							const e = get.translation(this._finalGroup),
								a = get.plainText(e);
							this.node.campWrap.node.campName.innerHTML = a.length <= 2 ? e : e.replaceAll(a, a[0]);
						} else this.node.campWrap.node.campName.innerHTML = "";
					},
					loadImage = url =>
						new Promise((resolve, reject) => {
							const img = new Image();
							((img.onload = () => resolve(url)), (img.onerror = () => reject(url)), (img.src = url));
						});
				if ("onlineUI" !== decadeUI.config.newDecadeStyle) {
					try {
						const a = "off" === decadeUI.config.newDecadeStyle ? "image/styles/shousha/name2_" : "babysha" === decadeUI.config.newDecadeStyle ? "image/styles/baby/hs_" : "image/styles/decade/name_",
							n = decadeUIPath + a + group + ".png";
						return (await loadImage(n), void (this.node.campWrap.node.campName.style.backgroundImage = `url("${n}")`));
					} catch {}
					try {
						const a = `group_${group}`,
							n = lib.card[a];
						if (!n?.image) throw new Error();
						let i;
						return ((i = n.image.startsWith("db:") ? await game.getDB("image", n.image.slice(3)) : n.image.startsWith("ext:") ? `${lib.assetURL}${n.image.replace(/^ext:/, "extension/")}` : `${lib.assetURL}${n.image}`), await loadImage(i), void (this.node.campWrap.node.campName.style.backgroundImage = `url("${i}")`));
					} catch {}
					create();
				} else create();
			})));
	else if (this._finalGroup) {
		const e = get.translation(this._finalGroup),
			a = get.plainText(e);
		this.node.campWrap.node.campName.innerHTML = a.length <= 2 ? e : e.replaceAll(a, a[0]);
	} else this.node.campWrap.node.campName.innerHTML = "";
}
function a() {
	Object.defineProperties(lib.element.player, {
		group: {
			configurable: !0,
			get() {
				return this._group;
			},
			set(group) {
				group && ((this._group = group), (this.node.campWrap.dataset.camp = get.character(this.name)?.groupBorder || group), e.call(this, group), refreshDynamicSkinTop(this));
			},
		},
	});
}
export { a as definePlayerGroupProperty };
