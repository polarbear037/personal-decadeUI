import "noname";
function t(t, n) {
	const e = n.statics?.handTips || [];
	let i;
	(n.statics || (n.statics = {}), n.statics.handTips || (n.statics.handTips = e));
	for (let s = 0; s < e.length; s++) void 0 === i && e[s].closed ? ((i = e[s]), (i.closed = !1)) : e[s].hide();
	return (
		void 0 === i &&
			((i = (function (decadeUI) {
				const create =
						decadeUI.element?.create ||
						((cls, parent) => {
							const el = document.createElement("div");
							return (cls && (el.className = cls), parent && parent.appendChild(el), el);
						}),
					tip = create("hand-tip", window.ui?.arena);
				return (
					(tip.clear = function () {
						const nodes = this.childNodes;
						for (let n = 0; n < nodes.length; n++) nodes[n].textContent = "";
						this.dataset.text = "";
					}),
					(tip.setText = function (text, type) {
						(this.clear(), this.appendText(text, type));
					}),
					(tip.setInfomation = function (text) {
						(this.$info || (this.$info = create("hand-tip-info", window.ui?.arena)), (this.$info.innerHTML = text));
					}),
					(tip.appendText = function (text, type) {
						if (void 0 === text || "" === text) return;
						void 0 === type && (type = "");
						const nodes = this.childNodes;
						for (let s = 0; s < nodes.length; s++) if ("" === nodes[s].textContent) return ((nodes[s].textContent = text), (nodes[s].dataset.type = type), nodes[s]);
						const span = document.createElement("span");
						return ((span.textContent = text), (span.dataset.type = type), this.appendChild(span));
					}),
					(tip.strokeText = function () {
						this.dataset.text = this.innerText;
					}),
					(tip.show = function () {
						// 连续战斗清场会移除 DOM，缓存提示再次显示时须挂回当前场景。
						const arena = window.ui?.arena;
						if (arena) {
							if (this.parentNode !== arena) arena.appendChild(this);
							if (this.$info && this.$info.parentNode !== arena) arena.appendChild(this.$info);
						}
						(this.classList.remove("hidden"), this.$info?.innerHTML && this.$info.show?.());
					}),
					(tip.hide = function () {
						(this.classList.add("hidden"), this.$info && this.$info.hide?.());
					}),
					(tip.close = function () {
						((this.closed = !0), this.hide(), this.$info && (this.$info.innerHTML = ""));
						const tips = decadeUI.statics?.handTips || [];
						for (let t = 0; t < tips.length; t++) if (!tips[t].closed) return void tips[t].show();
					}),
					(tip.isEmpty = function () {
						const t = this.childNodes;
						for (let n = 0; n < t.length; n++) if ("" !== t[n].textContent) return !1;
						return !0;
					}),
					tip
				);
			})(n)),
			e.unshift(i)),
		i.setText(t),
		i.show(),
		i
	);
}
export { t as showHandTip };
