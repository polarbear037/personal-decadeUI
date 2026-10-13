import "noname";
class t {
	constructor(element, updateBefore) {
		((this.element = element), (this.updateBefore = updateBefore), (this.updated = !1), (this._x = 0), (this._y = 0), (this._width = 0), (this._height = 0));
	}
	get x() {
		return (this.updated || this.update(), this._x);
	}
	set x(value) {
		this._x = value;
	}
	get y() {
		return (this.updated || this.update(), this._y);
	}
	set y(value) {
		this._y = value;
	}
	get width() {
		return (this.updated || this.update(), this._width);
	}
	set width(value) {
		this._width = value;
	}
	get height() {
		return (this.updated || this.update(), this._height);
	}
	set height(value) {
		this._height = value;
	}
	check() {
		this.updated || this.update();
	}
	update() {
		this.updateBefore && this.updateBefore.call(this);
		const element = this.element;
		((this.updated = !0), element && ((this._x = element.offsetLeft), (this._y = element.offsetTop), (this._width = element.offsetWidth), (this._height = element.offsetHeight)));
	}
}
function e(decadeUI) {
	const caches = {};
	return (
		(caches.window = new t(null, function () {
			this.element = window.ui?.window;
		})),
		(caches.arena = new t(null, function () {
			if (((this.element = window.ui?.arena), !window.ui?.arena)) return;
			if (((this.cardScale = decadeUI.getCardBestScale?.()), null != this.cardWidth)) return;
			for (const t of window.ui.arena.childNodes) if (t.classList?.contains("card")) return ((this.cardWidth = t.offsetWidth), void (this.cardHeight = t.offsetHeight));
			const card = decadeUI.element?.create?.("card") || document.createElement("div");
			(card.className || (card.className = "card"), (card.style.opacity = "0"), window.ui.arena.appendChild(card), (this.cardWidth = card.offsetWidth), (this.cardHeight = card.offsetHeight), card.remove());
		})),
		(caches.hand = new t(null, function () {
			if (((this.element = window.ui?.me), !window.ui?.handcards1)) return;
			if (((this.cardScale = decadeUI.getCardBestScale?.()), null != this.cardWidth)) return;
			for (const t of window.ui.handcards1.childNodes) if (t.classList?.contains("card")) return ((this.cardWidth = t.offsetWidth), void (this.cardHeight = t.offsetHeight));
			const card = decadeUI.element?.create?.("card") || document.createElement("div");
			(card.className || (card.className = "card"), (card.style.opacity = "0"), window.ui.handcards1.appendChild(card), (this.cardWidth = card.offsetWidth), (this.cardHeight = card.offsetHeight), card.remove());
		})),
		caches
	);
}
export { t as BoundsCache, e as createBoundsCaches };
