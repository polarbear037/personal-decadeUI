import { game } from "noname";
import { wrapBefore as wrapBefore, wrapAround as wrapAround } from "../utils/safeOverride.js";
function t() {
	if (game._decadeUI_fixMoveAnimZoom) return [];
	game._decadeUI_fixMoveAnimZoom = !0;
	const restoreFns = [],
		normalizeZoom = () => {
			const e = game.documentZoom;
			("number" != typeof e || !isFinite(e) || e <= 0) && (game.documentZoom = 1);
		};
	return (
		restoreFns.push(wrapBefore(game, "$swapElement", normalizeZoom)),
		restoreFns.push(
			wrapAround(game, "$elementGoto", function (original, element, parent, position, duration, timefun) {
				normalizeZoom();
				const fromParent = element?.parentElement,
					toParent = parent,
					restore = [],
					forceVisible = e => {
						e?.style && (restore.push([e, e.style.overflow]), (e.style.overflow = "visible"));
					};
				(forceVisible(fromParent), forceVisible(toParent));
				const restoreOverflow = () => {
					restore.forEach(([p, ov]) => {
						p.style.overflow = ov;
					});
				};
				try {
					const n = original.call(this, element, parent, position, duration, timefun);
					return n?.then ? n.finally(restoreOverflow) : (restoreOverflow(), n);
				} catch (a) {
					throw (restoreOverflow(), a);
				}
			})
		),
		restoreFns
	);
}
export { t as applyMoveAnimFix };
