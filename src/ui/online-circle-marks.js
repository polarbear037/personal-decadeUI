import { ui } from "noname";
import { element } from "../utils/element.js";
import { onlineCircleMarks } from "./online-circle-mark-data.js";

const observedMarks = new WeakSet();

export function getOnlineCircleMark(mark) {
	return Object.hasOwn(onlineCircleMarks, mark.skill) ? onlineCircleMarks[mark.skill] : undefined;
}

export function observeOnlineMarks(player) {
	const marks = player.node.marks;
	if (observedMarks.has(marks)) return;
	observedMarks.add(marks);
	const badges = new Map();
	const observer = new MutationObserver(() => {
		const visibleMarks = new Set();
		let actionIndex = 0;
		for (const mark of marks.children) {
			if (mark.classList.contains("removing")) continue;
			if (mark.dataset.onlineMarkType === "dialog") {
				mark.style.setProperty("--online-mark-index", actionIndex++);
				continue;
			}
			if (mark.dataset.onlineMarkType !== "graphic") continue;
			const data = getOnlineCircleMark(mark);
			if (!data) continue;
			const count = data.counted ? Number(mark.markcount?.textContent) : 0;
			if (data.counted && !(count > 0)) continue;
			visibleMarks.add(mark);
			let badge = badges.get(mark);
			if (!badge) {
				const lane = (player.node.xSkillMarks ??= ui.create.div(".skillMarks", player));
				badge = element.create("online-circle-mark", lane, "button");
				badge.type = "button";
				badge.dataset.stateId = data.id;
				badge.style.setProperty("--online-circle-color", data.color);
				badge.classList.toggle("two-glyphs", data.text.length === 2);
				for (const glyph of data.text) element.create("online-circle-glyph", badge, "span").textContent = glyph;
				if (data.counted) badge.countLabel = element.create("online-circle-count", badge, "span");
				badge.addEventListener("touchend", event => event.stopPropagation());
				badge.addEventListener("click", event => {
					event.stopPropagation();
					if (!marks.contains(mark) || mark.classList.contains("removing")) return;
					if (!event.clientX && !event.clientY) {
						const rect = badge.getBoundingClientRect();
						event = new MouseEvent("click", { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
					}
					ui.click.card.call(mark, event);
				});
				badges.set(mark, badge);
			}
			if (badge.countLabel) badge.countLabel.textContent = count;
			badge.classList.toggle("lit", data.lightAt != null && count >= data.lightAt);
		}
		for (const [mark, badge] of badges) {
			if (visibleMarks.has(mark)) continue;
			badge.remove();
			badges.delete(mark);
		}
	});
	observer.observe(marks, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "data-online-mark-type"] });
}
