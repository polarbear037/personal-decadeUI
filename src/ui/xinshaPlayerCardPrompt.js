import { get } from "noname";
import { getOptimizedPromptStyle } from "./promptStyle.js";

// windowSnitch.initUI 的取牌窗口文案，与技能表中的 ActiveTip 是两个入口。
function getXinshaPlayerCardPrompt(event, original) {
	if (document.body.dataset.style !== "othersOff" || getOptimizedPromptStyle() !== "xinsha" || !event?.target || event.name !== "gainPlayerCard") return "";
	if (typeof event.selectButton === "function") return "";
	const range = get.select(event.selectButton);
	if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] < 0 || range[1] < 1) return "";
	const name = get.translation(event.target);
	const amount = range[0] === range[1] ? get.cnNumber(range[0]) : `${get.cnNumber(range[0])}至${get.cnNumber(range[1])}`;
	const zone = event.position === "h" || event.position == null ? "手" : event.position === "e" ? "装备" : "";
	const holder = document.createElement("div");
	holder.innerHTML = original;
	// 只替换本体自动生成的提示，第三方技能自定义的具体操作要求继续保留。
	if (holder.textContent !== `获得${name}${amount}张${zone}牌`) return "";
	const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	const prefix = range[0] === range[1] ? "请选择" : "请至多选择";
	return `${prefix}<span data-type="player" style="color:#FFE100">${escape(name)}</span>的${range[1]}张牌`;
}

export { getXinshaPlayerCardPrompt };
