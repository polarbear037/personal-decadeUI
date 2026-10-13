import { game, get } from "noname";
import { wrapAfter as wrapAfter } from "../utils/safeOverride.js";
function t() {
	const restoreFns = [];
	return (
		restoreFns.push(
			wrapAfter(get, "skillState", function (skills, player) {
				if (game.me !== player && skills?.global) {
					skills.global = skills.global.concat();
					for (let t = skills.global.length - 1; t >= 0; t--) skills.global[t].includes("decadeUI") && skills.global.splice(t, 1);
				}
			})
		),
		restoreFns
	);
}
function l(obj) {
	return { "[object Array]": "array", "[object Object]": "object", "[object HTMLDivElement]": "div", "[object HTMLTableElement]": "table", "[object HTMLTableRowElement]": "tr", "[object HTMLTableCellElement]": "td", "[object HTMLBodyElement]": "td" }[(obj = Object.prototype.toString.call(obj))];
}
export { t as applyGetOverrides, l as getObjtype };
