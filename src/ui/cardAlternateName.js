import { lib, ui, game } from "noname";
const e = ["handcards1", "handcards2"],
	a = () => e.map(name => game.me?.node?.[name]).filter(Boolean),
	r = () => {
		const e = !1 !== lib.config.extension_十周年UI_cardAlternateName;
		const n = a();
		const t = n.reduce((e, a) => e + a.childElementCount, 0);
		const d = e && t >= 15 ? "on" : "off";
		n.forEach(zone => {
			zone.dataset.cardAlternateNameVisible = d;
		});
	};
function n() {
	window._cardAlternateNameVisibleTimer && (clearInterval(window._cardAlternateNameVisibleTimer), (window._cardAlternateNameVisibleTimer = null));
	const e = () => {
		(() => {
			const zones = a();
			return (
				!!zones.length &&
				(ui.window._cardAlternateNameVisibleObservers?.forEach(ob => ob.disconnect()),
				(ui.window._cardAlternateNameVisibleObservers = zones.map(e => {
					const a = new MutationObserver(r);
					return (a.observe(e, { childList: !0 }), a);
				})),
				r(),
				!0)
			);
		})() && (clearInterval(window._cardAlternateNameVisibleTimer), (window._cardAlternateNameVisibleTimer = null));
	};
	((window._cardAlternateNameVisibleTimer = setInterval(e, 500)), e(), window.decadeUI && (window.decadeUI.cardAlternateName || (window.decadeUI.cardAlternateName = {}), (window.decadeUI.cardAlternateName.updateVisibility = r)));
}
export { n as initCardAlternateNameVisible };
