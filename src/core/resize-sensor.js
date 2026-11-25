import "noname";
const t = () =>
	class {
		constructor(element) {
			((this.element = element), (this.width = element.clientWidth || 1), (this.height = element.clientHeight || 1), (this.maxSize = 1e4), (this.events = []), this.initScrollElements());
		}
		initScrollElements() {
			const containerStyle = "position:absolute;top:0;bottom:0;left:0;right:0;z-index:-10000;overflow:hidden;visibility:hidden;transition:all 0s;",
				childStyle = "transition:all 0s!important;animation:none!important;";
			((this.expand = this.createContainer(containerStyle)), (this.shrink = this.createContainer(containerStyle)));
			const expandChild = document.createElement("div");
			((expandChild.style.cssText = childStyle), (expandChild.style.width = this.maxSize * this.width + "px"), (expandChild.style.height = this.maxSize * this.height + "px"));
			const shrinkChild = document.createElement("div");
			((shrinkChild.style.cssText = childStyle), (shrinkChild.style.width = "250%"), (shrinkChild.style.height = "250%"), this.expand.appendChild(expandChild), this.shrink.appendChild(shrinkChild), this.element.appendChild(this.expand), this.element.appendChild(this.shrink), this.expand.offsetParent !== this.element && (this.element.style.position = "relative"), this.resetScroll(), (this.onscroll = this.handleScroll.bind(this)), this.expand.addEventListener("scroll", this.onscroll), this.shrink.addEventListener("scroll", this.onscroll));
		}
		createContainer(style) {
			const div = document.createElement("div");
			return ((div.style.cssText = style), div);
		}
		resetScroll() {
			const maxW = this.maxSize * this.width,
				maxH = this.maxSize * this.height;
			((this.expand.scrollTop = this.shrink.scrollTop = maxH), (this.expand.scrollLeft = this.shrink.scrollLeft = maxW));
		}
		handleScroll() {
			const t = this.element.clientWidth || 1,
				e = this.element.clientHeight || 1;
			((t === this.width && e === this.height) || ((this.width = t), (this.height = e), this.dispatchEvent()), this.resetScroll());
		}
		addListener(callback, capture = !0) {
			this.events.push({ callback: callback, capture: capture });
		}
		removeListener(callback) {
			if (this.events) this.events = this.events.filter(event => event.callback !== callback);
		}
		dispatchEvent() {
			let t = !1;
			(this.events.forEach(e => {
				e.capture ? e.callback() : (t = !0);
			}),
				t && requestAnimationFrame(() => this.dispatchDeferredEvents()));
		}
		dispatchDeferredEvents() {
			this.events.forEach(t => {
				t.capture || t.callback();
			});
		}
		close() {
			(this.expand.removeEventListener("scroll", this.onscroll), this.shrink.removeEventListener("scroll", this.onscroll), this.element && (this.element.removeChild(this.expand), this.element.removeChild(this.shrink)), (this.events = null));
		}
	};
export { t as createResizeSensorClass };
