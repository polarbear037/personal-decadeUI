import { lib } from "noname";
import { SVG_NS as SVG_NS, CLIP_PATHS as CLIP_PATHS } from "./constants.js";
function n() {
	const n = document.body.appendChild(document.createElementNS(SVG_NS, "svg")).appendChild(document.createElementNS(SVG_NS, "defs"));
	CLIP_PATHS.forEach(({ id: id, d: i }) => {
		const clipPath = n.appendChild(document.createElementNS(SVG_NS, "clipPath"));
		((clipPath.id = id), clipPath.setAttribute("clipPathUnits", "objectBoundingBox"), clipPath.appendChild(document.createElementNS(SVG_NS, "path")).setAttribute("d", i));
	});
}
function i(ctx) {
	if (window.get) {
		if ("function" == typeof window.get.cardsetion) {
			const t = window.get.cardsetion;
		const toleratedErrors = ["indexOf", "sourceSkill"];
			window.get.cardsetion = (...args) => {
				try {
					return t.apply(ctx, args);
				} catch (i) {
				if (toleratedErrors.some(feature => i?.message?.includes(feature))) return "";
					throw i;
				}
			};
		}
		if ("function" == typeof window.get.getPlayerIdentity) {
			const t = window.get.getPlayerIdentity;
			window.get.getPlayerIdentity = (player, identity, chinese, isMark) => ("string" != typeof (identity = identity || player?.identity || "") && (identity = ""), null != player?.special_identity && "string" != typeof player.special_identity && (player.special_identity = ""), t.call(ctx, player, identity, chinese, isMark));
		}
	}
}
const o = ctx => {
	const sensorNode = ctx.element.create("sensor", document.body);
	sensorNode.id = "decadeUI-body-sensor";
	const bodySensor = new ctx.ResizeSensor(sensorNode);
	(n(), document.addEventListener("click", e => decadeUI.set.activeElement(e.target), !0));
	const handTipHeight = lib.config["extension_十周年UI_handTipHeight"] || "20";
	return (document.documentElement.style.setProperty("--hand-tip-bottom", `calc(${handTipHeight}% + 10px)`), i(ctx), bodySensor);
};
export { n as initSvgClipPaths, o as initializeDecadeUIEnvironment, i as patchGlobalMethods };
