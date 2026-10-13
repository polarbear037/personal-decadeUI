import { ui, lib, game, _status } from "noname";
const e = null,
	t = "sort",
	n = "escaped",
	a = /(iPhone|iPod|Android|ios|iPad|Mobile)/i.test(navigator.userAgent),
	r = "PointerEvent" in window,
	o = r ? ["pointerdown", "pointermove", "pointerup"] : a ? ["touchstart", "touchmove", "touchend"] : ["mousedown", "mousemove", "mouseup"],
	i = r ? "pointercancel" : a ? "touchcancel" : null,
	s = { dragMode: e, sourceNode: null, movedNode: null, startX: 0, startY: 0, initialTransform: { x: 0, y: 0, scale: 1 }, originalPointerEvents: null, savedWaitingForDrag: null },
	d = fn => new Promise(t => requestAnimationFrame(() => t(fn()))),
	c = e => (r ? e : (e.touches?.[0] ?? e.changedTouches?.[0] ?? e)),
	l = e => e?.closest?.(".card") ?? null,
	u = () => ui?.handcards1Container?.classList.contains("scrollh") || "scroll" === getComputedStyle(ui?.handcards1Container).overflowX,
	m = async (card, tx, ty, scale = card?.scale ?? 1) => {
		card &&
			Number.isFinite(tx) &&
			Number.isFinite(ty) &&
			(await d(() => {
				((card.tx = tx), (card.ty = ty), (card.style.transform = card._transform = `translate(${tx}px, ${ty}px) scale(${scale})`));
			}));
	},
	g = async (skipLayout = !1) => {
		const card = s.sourceNode;
		card && (s.dragMode !== t || s.movedNode || (card.style.transform = `translate(${s.initialTransform.x}px, ${s.initialTransform.y}px) scale(${s.initialTransform.scale})`), Object.assign(card.style, { transition: "", pointerEvents: s.originalPointerEvents ?? "", opacity: "1", zIndex: "" }), document.removeEventListener(o[1], v), document.removeEventListener(o[2], w), i && document.removeEventListener(i, w), window.removeEventListener("blur", w), Object.assign(s, { sourceNode: null, movedNode: null, dragMode: e, savedWaitingForDrag: null }), skipLayout || d(() => window.decadeUI?.layout?.updateHand?.()), (_status.dragged = null));
	},
	f = async t => {
		if (!lib.config.enable_drag) return;
		if (game.me?.hasSkillTag("noSortCard")) return;
		if (!r && 2 === t.button) return;
		if (u()) return;
		s.sourceNode && (await g(!0));
		const card = l(t.target);
		if (!card || card.parentNode !== ui.handcards1) return;
		const { clientX: n, clientY: a } = c(t),
			m = await ((f = card),
			d(() => {
				try {
					const e = new DOMMatrixReadOnly(getComputedStyle(f).transform);
					return { x: e.m41, y: e.m42, scale: e.m11 };
				} catch {
					return { x: 0, y: 0, scale: 1 };
				}
			}));
		var f;
		(Object.assign(s, { sourceNode: card, startX: n, startY: a, initialTransform: { x: m.x, y: m.y, scale: m.scale }, dragMode: e, originalPointerEvents: getComputedStyle(card).pointerEvents, savedWaitingForDrag: card._waitingfordrag || { clientX: n, clientY: a } }), (card.scale = m.scale), delete card._waitingfordrag, document.addEventListener(o[1], v, { passive: !1 }), document.addEventListener(o[2], w, { passive: !1 }), i && document.addEventListener(i, w, { passive: !1 }), window.addEventListener("blur", w, { once: !0 }));
	},
	v = async e => {
		const card = s.sourceNode;
		if (!card) return;
		if (u()) return g();
		_status.dragged = !0;
		const { clientX: clientX, clientY: clientY, pageX: pageX, pageY: pageY } = c(e),
			dx = clientX - s.startX,
			dy = clientY - s.startY,
			absDx = Math.abs(dx),
			absDy = Math.abs(dy);
		if (!s.dragMode) {
			if (Math.sqrt(dx * dx + dy * dy) < 5) return;
			if (absDy > absDx || dy < -50) return ((s.dragMode = n), s.savedWaitingForDrag && (card._waitingfordrag = s.savedWaitingForDrag), g(!0));
			((s.dragMode = t), e.preventDefault(), e.stopPropagation(), (_status.mousedragging = _status.mousedragorigin = null), delete card._waitingfordrag, Object.assign(card.style, { pointerEvents: "none", transition: "none", opacity: "0.5", zIndex: "99" }));
		}
		if (s.dragMode === t) {
			if (dy < -50) return ((card.style.transform = `translate(${s.initialTransform.x}px, ${s.initialTransform.y}px) scale(${s.initialTransform.scale})`), (s.dragMode = n), s.savedWaitingForDrag && (card._waitingfordrag = s.savedWaitingForDrag), g(!0));
			(e.preventDefault(), e.stopPropagation());
			const t = window.game?.documentZoom ?? 1;
			card.style.transform = `translate(${s.initialTransform.x + dx / t}px, ${s.initialTransform.y}px) scale(${card.scale})`;
			const a = l(document.elementFromPoint(pageX, pageY));
			a && a !== card && a.parentNode === ui.handcards1 && s.movedNode !== a && ((s.movedNode = a), await p(card, a));
		}
	},
	p = async (src, tgt) => {
		const container = ui.handcards1,
			children = Array.from(container.childNodes),
			srcIdx = children.indexOf(src),
			tgtIdx = children.indexOf(tgt);
		if (-1 === srcIdx || -1 === tgtIdx) return;
		const scale = window.decadeUI?.boundsCaches?.hand?.cardScale ?? 1,
			moveLeft = srcIdx > tgtIdx;
		container.insertBefore(src, moveLeft ? tgt : tgt.nextSibling);
		const srcTx = Number.isFinite(src.tx) ? src.tx : s.initialTransform.x;
		(await m(src, tgt.tx, s.initialTransform.y, scale), await m(tgt, srcTx, tgt.ty, scale));
		const [start, end] = moveLeft ? [tgtIdx + 1, srcIdx] : [srcIdx, tgtIdx - 1],
			updated = Array.from(container.childNodes);
		(await Promise.all(
			updated.slice(start, end + 1).map(async t => {
				if (!t || t === src || void 0 === t.tx) return;
				const neighbor = children[children.indexOf(t) + (moveLeft ? -1 : 1)];
				neighbor && (await m(t, neighbor.tx, t.ty, scale));
			})
		),
			d(() => window.decadeUI?.layout?.updateHand?.()));
	},
	w = e => {
		if (s.dragMode === t && (e?.preventDefault?.(), e?.stopPropagation?.(), e?.stopImmediatePropagation?.(), (_status.mousedragging = _status.mousedragorigin = null), (_status.mouseleft = !1), (_status.clicked = !0), s.sourceNode && (delete s.sourceNode._waitingfordrag, s.sourceNode.classList.contains("selected")))) {
			s.sourceNode.classList.remove("selected");
			const e = ui.selected.cards.indexOf(s.sourceNode);
			(e > -1 && ui.selected.cards.splice(e, 1), game.uncheck(), game.check());
		}
		g();
	},
	y = async () => {
		if (!ui?.handcards1) return setTimeout(y, 1e3);
		(ui.handcards1.removeEventListener(o[0], f), ui.handcards1.addEventListener(o[0], f, { passive: !1 }));
	},
	x = () => {
		(g(!0), ui?.handcards1?.removeEventListener(o[0], f));
	};
function h() {
	const _decadeUI = window.decadeUI || {};
	((window.decadeUI = _decadeUI), Object.assign(_decadeUI, { initCardDragSwap: y, destroyCardDragSwap: x }), "complete" === document.readyState ? setTimeout(y, 1e3) : window.addEventListener("load", () => setTimeout(y, 1e3), { once: !0 }));
}
export { h as setupCardDragSort };
