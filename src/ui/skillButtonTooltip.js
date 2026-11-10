import { ui, lib, get } from "noname";
import { isOnlineTooltip, createOfficialTooltip, layoutOfficialTooltip } from "./officialTooltip.js";
class t {
	constructor() {
		((this.tooltip = null), (this.currentButton = null), (this.hideTimeout = null), (this.showTimeout = null), (this.showDelay = 500));
	}
	createTooltip() {
		if (isOnlineTooltip()) {
			if (!this.tooltip?.dataset.decadeTooltip) {
				this.tooltip?.remove();
				this.tooltip = document.createElement("div");
				this.tooltip.className = "skill-button-tooltip decade-official-tooltip-host";
				this.tooltip.dataset.decadeTooltip = "skill";
				this.tooltip.style.cssText = "position:absolute;z-index:99999;display:none;opacity:0";
				ui.window.append(this.tooltip);
				this.tooltip.addEventListener("mouseenter", () => clearTimeout(this.hideTimeout));
				this.tooltip.addEventListener("mouseleave", () => this.hide());
			}
			return this.tooltip;
		}
		if (this.tooltip?.dataset.decadeTooltip) { this.tooltip.remove(); this.tooltip = null; }
		return (this.tooltip || ((this.tooltip = document.createElement("div")), (this.tooltip.className = "skill-button-tooltip"), (this.tooltip.style.cssText = "\n\t\t\tposition: absolute;\n\t\t\tbackground: rgba(0, 0, 0, 0.9);\n\t\t\tcolor: white;\n\t\t\tpadding: 10px 15px;\n\t\t\tborder-radius: 4px;\n\t\t\tborder: 1px solid white;\n\t\t\tfont-family: yuanli, sans-serif;\n\t\t\tfont-size: 14px;\n\t\t\tline-height: 1.6;\n\t\t\tmax-width: 300px;\n\t\t\tword-wrap: break-word;\n\t\t\tz-index: 99999;\n\t\t\tpointer-events: none;\n\t\t\topacity: 0;\n\t\t\ttransition: opacity 0.2s ease;\n\t\t\tbox-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);\n\t\t"), ui.arena.appendChild(this.tooltip)), this.tooltip);
	}
	getElementPosition(element) {
		let left = 0,
			top = 0,
			current = element;
		for (; current && current !== ui.arena && current !== document.body; ) ((left += current.offsetLeft || 0), (top += current.offsetTop || 0), (current = current.offsetParent));
		return { left: left, top: top, width: element.offsetWidth || 0, height: element.offsetHeight || 0 };
	}
	getSkillDescription(skillName, player) {
		let str = "";
		try {
			if (player && lib.dynamicTranslate && lib.dynamicTranslate[skillName]) {
				const i = lib.dynamicTranslate[skillName](player, skillName);
				"string" == typeof i && i && (str = i);
			}
			if ((str || (str = lib.translate[skillName + "_info"] || ""), !str && lib.skill[skillName])) {
				const i = lib.skill[skillName];
				if (i.prompt) {
					if (typeof i.prompt === "function") {
						try {
							const s = i.prompt(player, skillName);
							"string" == typeof s && s && (str = s);
						} catch (s) {
							console.warn(`执行技能 ${skillName} 的 prompt 函数时出错:`, s);
						}
					} else if ("string" == typeof i.prompt) str = i.prompt;
				}
				if (!str && i.description) str = i.description;
				else if (!str && i.sourceSkill) {
					const s = i.sourceSkill,
						o = skillName.replace(s + "_", "");
					if (lib.skill[s] && lib.skill[s].subSkill && lib.skill[s].subSkill[o]) {
						((str = lib.skill[s].subSkill[o].description || ""), str || (str = lib.translate[s + "_info"] || ""));
					}
					if (!str && lib.skill[s] && lib.skill[s].prompt) {
						if (typeof lib.skill[s].prompt === "function") {
							try {
								const o = lib.skill[s].prompt(player, s);
								"string" == typeof o && o && (str = o);
							} catch (o) {
								console.warn(`执行父技能 ${s} 的 prompt 函数时出错:`, o);
							}
						} else if ("string" == typeof lib.skill[s].prompt) str = lib.skill[s].prompt;
					}
				}
			}
			!str && void 0 !== get && get.skillInfoTranslation && (str = get.skillInfoTranslation(skillName, player) || "");
		} catch (i) {
			(console.error(`获取技能 ${skillName} 的描述时出错:`, i), (str = lib.translate[skillName + "_info"] || ""));
		}
		return str;
	}
	formatSkillDescription(text) {
		if (!text) return "";
		const { text: protectedText, brackets: brackets } = this.protectBrackets(text);
		return ((text = protectedText), (text = this.addLineBreaksBeforeNumbers(text)), (text = this.addLineBreakAfterLastNumber(text)), (text = this.addLineBreaksBeforeRegularNumbers(text)), (text = this.addLineBreakAfterLastRegularNumber(text)), (text = this.addLineBreaksBeforeYinYang(text)), (text = this.addLineBreakAfterLastYinYang(text)), (text = this.restoreBrackets(text, brackets)));
	}
	protectBrackets(text) {
		const brackets = [];
		let protectedText = text.replace(/〖[^〗]*〗/g, t => {
			const i = brackets.length;
			return (brackets.push(t), `__BRACKET_${i}__`);
		});
		return (
			(protectedText = protectedText.replace(/（[^）]*）/g, t => {
				const i = brackets.length;
				return (brackets.push(t), `__BRACKET_${i}__`);
			})),
			{ text: protectedText, brackets: brackets }
		);
	}
	restoreBrackets(text, brackets) {
		let iteration = 0;
		for (; /__BRACKET_\d+__/.test(text) && iteration < 10; ) ((text = text.replace(/__BRACKET_(\d+)__/g, (match, index) => brackets[parseInt(index)] || match)), iteration++);
		return text;
	}
	addLineBreaksBeforeNumbers(text) {
		return text.replace(/(\S)([①②③④⑤⑥⑦⑧⑨⑩])/g, "$1<br>$2");
	}
	addLineBreakAfterLastNumber(text) {
		return text.replace(/([①②③④⑤⑥⑦⑧⑨⑩])(?![\s\S]*[①②③④⑤⑥⑦⑧⑨⑩])([^。]*?。)/g, "$1$2<br>");
	}
	addLineBreaksBeforeRegularNumbers(text) {
		return text.replace(/(\S)(\d+[、.])/g, "$1<br>$2");
	}
	addLineBreakAfterLastRegularNumber(text) {
		return text.replace(/(\d+[、.])(?![\s\S]*\d+[、.])([^。]*?。)/g, "$1$2<br>");
	}
	addLineBreaksBeforeYinYang(text) {
		return text.replace(/([^①②③④⑤⑥⑦⑧⑨⑩\s])([阳阴]：)/g, "$1<br>$2");
	}
	addLineBreakAfterLastYinYang(text) {
		const yinYangMatch = text.match(/([阳阴]：)(?![\s\S]*[阳阴]：)/);
		if (!yinYangMatch) return text;
		const yinYangIndex = yinYangMatch.index + yinYangMatch[0].length,
			afterYinYang = text.substring(yinYangIndex),
			hasCircleNumbers = /[①②③④⑤⑥⑦⑧⑨⑩]/.test(afterYinYang),
			hasSpecialNumbers = /[⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑]/.test(afterYinYang),
			hasRegularNumbers = /\d+[、.]/.test(afterYinYang);
		return hasCircleNumbers || hasSpecialNumbers || hasRegularNumbers ? text : text.replace(/([阳阴]：)(?![\s\S]*[阳阴]：)([^。；]*?[。；])/, "$1$2<br>");
	}
	show(button, skillName, player) {
		button &&
			skillName &&
			(clearTimeout(this.hideTimeout),
			clearTimeout(this.showTimeout),
			(this.currentButton = button),
			(this.showTimeout = setTimeout(() => {
				if (this.currentButton !== button || !button.isConnected) return;
				const tooltip = this.createTooltip(),
					skillInfo = this.getSkillDescription(skillName, player),
					formattedInfo = this.formatSkillDescription(skillInfo),
					skillTranslation = lib.translate[skillName] || get.translation(skillName) || skillName;
				if (isOnlineTooltip()) {
					tooltip.replaceChildren(createOfficialTooltip("skill", skillTranslation, skillInfo));
				} else tooltip.innerHTML = `<strong style="font-size: 20px;">${skillTranslation}</strong><br>${formattedInfo}`;
				(
					(tooltip.style.opacity = "0"),
					(tooltip.style.display = "block"),
					(tooltip.style.left = "-9999px"),
					(tooltip.style.top = "-9999px"),
					requestAnimationFrame(() => {
						if (this.currentButton !== button || !button.isConnected) return this.hide();
						this.positionTooltip(tooltip, button);
						document.fonts?.ready.then(() => {
							if (this.currentButton === button && button.isConnected) this.positionTooltip(tooltip, button);
						});
					}));
			}, this.showDelay)));
	}
	positionTooltip(tooltip, button) {
		if (tooltip.dataset.decadeTooltip) {
			layoutOfficialTooltip(tooltip);
			const parent = tooltip.offsetParent || ui.window;
			const bounds = parent.getBoundingClientRect(), anchor = button.getBoundingClientRect();
			const scaleX = bounds.width / parent.offsetWidth || 1, scaleY = bounds.height / parent.offsetHeight || 1;
			const width = tooltip.offsetWidth, height = tooltip.offsetHeight;
			const left = (anchor.left + anchor.width / 2 - bounds.left) / scaleX - width / 2;
			let top = (anchor.top - bounds.top) / scaleY - height - 10;
			if (top < 5) top = (anchor.bottom - bounds.top) / scaleY + 10;
			tooltip.style.left = `${Math.max(5, Math.min(left, parent.offsetWidth - width - 5))}px`;
			tooltip.style.top = `${Math.max(5, Math.min(top, parent.offsetHeight - height - 5))}px`;
			tooltip.style.opacity = "1";
			return;
		}
		const buttonPos = this.getElementPosition(button),
			tooltipWidth = tooltip.offsetWidth,
			tooltipHeight = tooltip.offsetHeight;
		let left = buttonPos.left + buttonPos.width / 2 - tooltipWidth / 2;
		const arenaWidth = ui.arena.offsetWidth;
		left < 10 ? (left = 10) : left + tooltipWidth > arenaWidth - 10 && (left = arenaWidth - tooltipWidth - 10);
		const top = buttonPos.top - tooltipHeight - 10;
		((tooltip.style.left = `${left}px`), (tooltip.style.top = `${top}px`), (tooltip.style.opacity = "1"));
	}
	hide() {
		// 官方长说明允许从按钮移到提示内滚动；进入提示时取消此延时。
		if (this.tooltip?.dataset.decadeTooltip) {
			clearTimeout(this.showTimeout);
			clearTimeout(this.hideTimeout);
			this.hideTimeout = setTimeout(() => {
				this.tooltip.style.display = "none";
				this.tooltip.style.opacity = "0";
				this.currentButton = null;
			}, 200);
			return;
		}
		(clearTimeout(this.showTimeout),
			this.tooltip
				? ((this.tooltip.style.opacity = "0"),
					(this.currentButton = null),
					(this.hideTimeout = setTimeout(() => {
						this.tooltip && "0" === this.tooltip.style.opacity && ((this.tooltip.style.left = "-9999px"), (this.tooltip.style.display = "none"));
					}, 200)))
				: (this.currentButton = null));
	}
	attach(button, skillName, player) {
		if (!button || !skillName) return;
		if ("ios" === lib.device || "android" === lib.device) return;
		if ("true" === button.dataset.tooltipAttached) return;
		const self = this;
		(button.addEventListener("mouseenter", function () {
			self.show(button, skillName, player);
		}),
			button.addEventListener("mouseleave", function () {
				self.hide();
			}),
			(button.dataset.tooltipAttached = "true"));
	}
	destroy() {
		(clearTimeout(this.showTimeout), clearTimeout(this.hideTimeout), this.tooltip && this.tooltip.parentNode && this.tooltip.parentNode.removeChild(this.tooltip), (this.tooltip = null), (this.currentButton = null));
	}
}
const e = new t();
export { t as SkillButtonTooltip, e as skillButtonTooltip };
