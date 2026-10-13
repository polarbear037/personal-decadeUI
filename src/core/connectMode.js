import { lib, ui, _status } from "noname";
function e() {
	Object.defineProperties(_status, {
		connectMode: {
			configurable: !0,
			get() {
				return this._connectMode;
			},
			set(value) {
				if (((this._connectMode = value), !value || !lib.extensions)) return;
				const decadeExtension = lib.extensions.find(ext => ext[0] === decadeUIName);
				if (!decadeExtension) return;
				const startBeforeFunction = lib.init.startBefore;
				lib.init.startBefore = function (...args) {
					try {
						((_status.extension = decadeExtension[0]), (_status.evaluatingExtension = decadeExtension[3]), decadeExtension[1](decadeExtension[2], decadeExtension[4]), delete _status.extension, delete _status.evaluatingExtension);
					} catch (e) {
						console.error(e);
					}
					startBeforeFunction?.apply(this, args);
				};
			},
		},
		_connectMode: { value: !1, writable: !0 },
	});
}
function t() {
	lib.configMenu.appearence.config.layout.visualMenu = (node, link) => {
		if (((node.className = `button character themebutton ${lib.config.theme}`), node.classList.add(link), node.created)) return;
		((node.created = !0), (node.style.overflow = "scroll"));
		const list = ["re_caocao", "re_liubei", "sp_zhangjiao", "sunquan"];
		for (; list.length; ) ui.create.div(".avatar", ui.create.div(".seat-player.fakeplayer", node)).setBackground(list.randomRemove(), "character");
	};
}
export { e as setupConnectMode, t as setupLayoutVisualMenu };
