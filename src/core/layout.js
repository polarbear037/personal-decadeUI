import { ui, game, lib } from "noname";
function e() {
	return {
		update() {
			(this.updateHand(), this.updateDiscard());
		},
		updateHand() {
			if (!game.me) return;
			const handNode = ui.handcards1;
			if (!handNode) return console.error("hand undefined");
			const t = [...handNode.childNodes].filter(card => !card.classList.contains("removing") || ((card.scaled = !1), !1));
			if (!t.length) return;
			const bounds = decadeUI.boundsCaches.hand;
			bounds.check();
			const { width: pw, cardWidth: cw, cardHeight: ch, cardScale: cs, x: boundsX } = bounds,
				csw = cw * cs,
				l = Math.round((ch * cs - ch) / 2);
			let xMargin = csw + 2,
				xStart = (csw - cw) / 2;
			const totalW = t.length * csw + 2 * (t.length - 1),
				limitW = pw;
			let f = !1;
			if (totalW > limitW) {
				if (((xMargin = csw - Math.abs(limitW - csw * t.length) / (t.length - 1)), lib.config.fold_card)) {
					const e = parseFloat(lib.config.extension_十周年UI_handFoldMin) || 9,
						t = cs * e;
					xMargin < t && ((f = !0), (xMargin = t));
				}
			} else {
				const e = decadeUI?.config?.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle;
				("codename" === e || (("on" === e || "othersOff" === e) && !lib.config.phonelayout)) && (xStart = (ui.arena.offsetWidth - totalW) / 2 - boundsX);
			}
			let selectedIndex = -1,
				spreadOffsetLeft = 0,
				spreadOffsetRight = 0,
				baseShift = 0;
			if (totalW > limitW && xMargin < csw - 0.5 && !f && "function" == typeof ui.getSpreadOffset) {
				const e = ui.getSpreadOffset(t, { cardWidth: csw, currentMargin: xMargin });
				if ((({ spreadIndex: selectedIndex, spreadLeft: spreadOffsetLeft, spreadRight: spreadOffsetRight } = e), -1 !== selectedIndex)) {
					const e = xStart + selectedIndex * xMargin,
						t = Math.max(0, limitW - csw);
					baseShift = Math.round(Math.max(0, Math.min(t, e)) - e);
				}
			}
			t.forEach((card, e) => {
				let fx = xStart + e * xMargin + baseShift;
				(spreadOffsetLeft || spreadOffsetRight) && (e < selectedIndex ? (fx -= spreadOffsetLeft) : e > selectedIndex && (fx += spreadOffsetRight));
				const a = Math.round(fx);
				((card.tx = a), (card.ty = l), (card.scaled = !0));
				// 基础位置交给 updateTransform 合成，避免已选牌先落下再抬起。
				card.updateTransform(card.classList.contains("selected"), 0, `translate(${a}px,${l}px) scale(${cs})`);
			});
			const container = ui.handcards1Container;
			f ? (container.classList.add("scrollh"), (container.style.overflowX = "scroll"), (container.style.overflowY = "hidden"), (handNode.style.width = `${Math.round(t.length * xMargin + (csw - xMargin))}px`)) : (container.classList.remove("scrollh"), (container.style.overflowX = container.style.overflowY = ""), (handNode.style.width = "100%"));
		},
		updateDiscard() {
			if (((ui.thrown ??= []), (ui.thrown = ui.thrown.filter(e => !(e.classList.contains("drawingcard") || e.classList.contains("removing") || e.parentNode !== ui.arena || e.fixed) && (e.classList.remove("removing"), !0))), !ui.thrown.length)) return;
			const cards = ui.thrown,
				bounds = decadeUI.boundsCaches.arena;
			bounds.check();
			const { width: pw, height: ph, cardWidth: cw, cardHeight: ch } = bounds,
				cs = decadeUI.getCardBestScale({ height: ch }, lib.config?.extension_十周年UI_discardScale ?? 0.14),
				csw = cw * cs,
				c = Math.round((ph - ch) / 2) - 5,
				maxWidth = 0.7 * pw,
				totalW = cards.length * csw + 2 * (cards.length - 1),
				limitW = Math.min(maxWidth, pw);
			let xMargin = csw + 2,
				xStart = (pw - Math.min(totalW, limitW)) / 2 + (csw - cw) / 2;
			(totalW > limitW && (xMargin = (limitW - csw) / (cards.length - 1)),
				cards.forEach((card, e) => {
					const t = Math.round(xStart + e * xMargin);
					((card.tx = t), (card.ty = c), (card.scaled = !0), (card.style.transform = `translate(${t}px,${c}px) scale(${cs})`));
				}));
		},
		clearout(card) {
			!card ||
				card.fixed ||
				card.classList.contains("removing") ||
				(card.name?.startsWith("shengbei_left_") || card.name?.startsWith("shengbei_right_")
					? card.delete()
					: (ui.thrown.includes(card) || (ui.thrown.unshift(card), decadeUI.queueNextFrameTick(decadeUI.layoutDiscard, decadeUI)),
						card.classList.add("invalided"),
						setTimeout(
							e => {
								(e.remove(), decadeUI.queueNextFrameTick(decadeUI.layoutDiscard, decadeUI));
							},
							2333,
							card
						)));
		},
		_debounce(config) {
			const { defaultDelay: defaultDelay, maxDelay: maxDelay, timeoutKey: timeoutKey, timeKey: timeKey, immediateCallback: immediateCallback, callback: callback } = config,
				nowTime = Date.now();
			if (this[timeoutKey]) {
				if ((clearTimeout(this[timeoutKey]), nowTime - this[timeKey] > maxDelay)) return ((this[timeoutKey] = this[timeKey] = null), void immediateCallback());
			} else this[timeKey] = nowTime;
			this[timeoutKey] = setTimeout(
				() => {
					((this[timeoutKey] = this[timeKey] = null), callback());
				},
				this[timeoutKey] ? nowTime - this[timeKey] : defaultDelay
			);
		},
		delayClear() {
			this._debounce({ defaultDelay: 500, maxDelay: 1e3, timeoutKey: "_delayClearTimeout", timeKey: "_delayClearTimeoutTime", immediateCallback: ui.clear, callback: ui.clear });
		},
		invalidate() {
			(this.invalidateHand(), this.invalidateDiscard());
		},
		invalidateHand() {
			this._debounce({ defaultDelay: 40, maxDelay: 180, timeoutKey: "_handcardTimeout", timeKey: "_handcardTimeoutTime", immediateCallback: () => this.updateHand(), callback: () => this.updateHand() });
		},
		invalidateDiscard() {
			this._debounce({ defaultDelay: ui.thrown?.length > 15 ? 80 : 40, maxDelay: 180, timeoutKey: "_discardTimeout", timeKey: "_discardTimeoutTime", immediateCallback: () => this.updateDiscard(), callback: () => this.updateDiscard() });
		},
		resize() {
			if (!ui.arena) return;
			(ui.arena.classList.toggle("dui-mobile", decadeUI.isMobile()), (decadeUI.dataset.animSizeUpdated = !1), (decadeUI.dataset.bodySize.updated = !1), Object.values(decadeUI.boundsCaches).forEach(e => (e.updated = !1)));
			const ensureStyle = selector => decadeUI.sheet.getStyle(selector) || decadeUI.sheet.insertRule(`${selector} { zoom: 1; }`),
				buttonsWindow = ensureStyle("#window > .dialog.popped .buttons:not(.smallzoom)"),
				buttonsArena = ensureStyle("#arena:not(.choose-character) .buttons:not(.smallzoom)");
			((decadeUI.zooms.card = decadeUI.getCardBestScale()), ui.me && (ui.me.style.height = `${Math.round(decadeUI.getHandCardSize().height * decadeUI.zooms.card + 30.4)}px`), buttonsArena && (buttonsArena.zoom = decadeUI.zooms.card), buttonsWindow && (buttonsWindow.zoom = decadeUI.zooms.card), this.update());
			// 尺寸变化立即落位，避免防抖与移牌过渡让卡牌在拖动窗口时滞后。
			for (const card of [...(ui.handcards1?.children ?? []), ...(ui.thrown ?? [])])
				for (const animation of card.getAnimations?.() ?? [])
					if (animation.transitionProperty === "transform") animation.finish();
		},
	};
}
export { e as createLayoutModule };
