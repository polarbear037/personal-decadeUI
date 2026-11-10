import { lib, _status, game } from "noname";
let e = null,
	n = null;
const t = (styleEl, css) => (styleEl || ((styleEl = document.createElement("style")), document.head.appendChild(styleEl)), (styleEl.innerHTML = css), styleEl),
	r = { five: "kuang1", four: "kuang2", three: "kuang3", two: "kuang3", one: null },
	o = { five: "kb4", four: "kb3", three: "kb2", two: "kb2", one: null };
function i() {
	const config = lib.config.extension_十周年UI_cardkmh;
	return config && "off" !== config;
}
function a(player, isMe) {
	if (!player) return null;
	if (isMe) return lib.config.extension_十周年UI_cardbj || null;
	if (!i()) return null;
	const level = player.dataset?.borderLevel || lib.config.extension_十周年UI_borderLevel || "five";
	return o[level] || null;
}
function s(card, player, isMe = !1) {
	const border = (function (player, isMe) {
		if (!player) return null;
		if (isMe) {
			const e = lib.config.extension_十周年UI_cardkmh;
			return e && "off" !== e ? e : null;
		}
		if (!i()) return null;
		const level = player.dataset?.borderLevel || lib.config.extension_十周年UI_borderLevel || "five";
		return level in r ? r[level] : "kuang1";
	})(player, isMe);
	if (border) {
		const borderUrl = `${lib.assetURL}extension/十周年UI/image/ui/card/${border}.png`;
		Object.assign(card.style, { width: "108px", height: "150px", border: "1px solid", borderRadius: "10px", borderImageSource: `url('${borderUrl}')`, borderImageSlice: "17", borderImageWidth: "16px" });
	}
	const bg = a(player, isMe);
	if (bg && !card.dataset.identityCard && (card.classList.contains("infohidden") || card.classList.contains("infoflip") || !card.childElementCount)) {
		const e = `${lib.assetURL}extension/十周年UI/image/ui/card/${bg}.png`;
		(card.style.setProperty("background", `url('${e}')`, "important"), card.style.setProperty("background-size", "100% 100%", "important"), (card.classList.contains("infohidden") || card.classList.contains("infoflip")) && (card.innerHTML = ""));
	}
}
function d() {
	const r = lib.config.extension_十周年UI_cardkmh,
		o = lib.config.extension_十周年UI_cardbj,
		i = ".hand-cards > .handcards > .card";
	e = t(e, ((borderName, selector, imageWidth) => (borderName && "off" !== borderName ? `${selector} { width: 108px; height: 150px; border: 1px solid; border-radius: 10px; border-image-source: url('${lib.assetURL}extension/十周年UI/image/ui/card/${borderName}.png'); border-image-slice: 17; border-image-width: ${imageWidth}px; }` : ""))(r, i, 20));
	const a = o ? `${i}:empty, ${i}.infohidden { background: url('${lib.assetURL}extension/十周年UI/image/ui/card/${o}.png'); background-size: 100% 100% !important; }` : "";
	n = t(n, a);
}
function c() {
	const e = document.createElement("style");
	((e.innerHTML = "\n\t\t.hand-cards > .handcards > .card {\n\t\t\tmargin: 0; width: 108px; height: 150px; position: absolute;\n\t\t\ttransition-property: transform, opacity, left, top;\n\t\t\tz-index: 51;\n\t\t}\n\t"),
		document.head.appendChild(e),
		d(),
		new MutationObserver(e => {
			e.forEach(e => {
				e.addedNodes.forEach(node => {
					if (1 === node.nodeType) {
						node.classList?.contains("dialog") && setTimeout(() => l(node), 50);
						const n = node.querySelectorAll?.(".dialog");
						n?.forEach(e => setTimeout(() => l(e), 50));
					}
				});
			});
		}).observe(document.body, { childList: !0, subtree: !0 }),
		document.querySelectorAll(".dialog").forEach(e => setTimeout(() => l(e), 50)));
}
function l(dialog) {
	if (!i()) return;
	const cards = dialog.querySelectorAll(".card.infohidden, .card.infoflip");
	if (!cards.length) return;
	const sourcePlayer = _status.event?.target,
		isMe = !sourcePlayer || sourcePlayer === game.me,
		bgName = a(sourcePlayer || game.me, isMe);
	cards.forEach(card => {
		// Online faction buttons reuse the `.card.infohidden` classes, but their
		// background and optional custom-faction label are owned by that dialog.
		if (card.closest?.(".online-faction-dialog")) return;
		if (!card.dataset.identityCard)
			if ((card.innerHTML && (card.innerHTML = ""), bgName)) {
				const e = `${lib.assetURL}extension/十周年UI/image/ui/card/${bgName}.png`;
				(card.style.setProperty("background-image", `url('${e}')`, "important"), card.style.setProperty("background-size", "100% 100%", "important"));
			} else (card.style.removeProperty("background-image"), card.style.removeProperty("background-size"));
	});
}
export { s as applyCardBorder, c as setupCardStyles, d as updateCardStyles };
