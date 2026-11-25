import { ui, game, lib } from "noname";
import { positionHandDisplays } from "../ui/hand-displays.js";
import { finishXinshaHandMotion, withXinshaHandLayout } from "../ui/handcard-motion-xinsha.js";
import { updateXinshaDiscardMotion, finishXinshaDiscardMotion } from "../ui/discard-motion-xinsha.js";
function e() {
	return {
		update() {
			(this.updateHand(), this.updateDiscard());
		},
		updateHand() {
			window.decadeUI?.cardAlternateName?.updateVisibility?.();
			if (!game.me) return;
			const handNode = ui.handcards1;
			if (!handNode) return console.error("hand undefined");
			const t = [...handNode.childNodes].filter(card => !card.classList.contains("removing") || ((card.scaled = !1), !1));
			if (!t.length) return;
			const bounds = decadeUI.boundsCaches.hand;
			bounds.check();
			const { width: pw, cardWidth: cw, cardHeight: ch, cardScale: cs, x: boundsX } = bounds,
				csw = cw * cs,
				style = decadeUI?.config?.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle,
				l = Math.round((ch * cs - ch) / 2 + (style === "othersOff" ? handNode.offsetHeight - ch * cs : 0));
			// 原版牌框画在 126×174 内；本地 CSS border 额外占位，不能再计入一将的卡面步进。
			const faceWidth = style === "othersOff" ? (t[0].clientWidth || cw) * cs : csw;
			// 一将实局按卡面宽度紧排，不在描边及贴图边缘之外再附加两设计单位留缝。
			let xMargin = style === "othersOff" ? faceWidth : csw + 2,
				xStart = (csw - cw) / 2;
			// 一将 SelfCardsArea：从容器 left=card_width/2 起排，保留设置给出的实际牌宽。
			if (style === "othersOff") xStart += csw / 2;
			// 原版预留区容纳 126 设计单位的牌尾；本地调大卡牌时，从排布宽度中扣回超出的部分。
			const nativeCardWidth = style === "othersOff" ? 126 * parseFloat(ui.window?.style.getPropertyValue("--yjcm-unit")) : 0,
				cardOverflow = nativeCardWidth > 0 ? Math.max(0, csw - nativeCardWidth) : 0;
			const totalW = csw + xMargin * (t.length - 1),
				limitW = pw - (style === "othersOff" ? csw / 2 + cardOverflow : 0),
				compressed = style === "othersOff" ? t.length * xMargin > limitW : totalW > limitW;
			let f = !1;
			if (compressed) {
				// SelfCardsArea.adjustCardPos：min(card_width + spacing, (width - left) / count)。
				if (((xMargin = style === "othersOff" ? limitW / t.length : csw - Math.abs(limitW - csw * t.length) / (t.length - 1)), lib.config.fold_card)) {
					const e = parseFloat(lib.config.extension_十周年UI_handFoldMin) || 9,
						t = cs * e;
					xMargin < t && ((f = !0), (xMargin = t));
				}
			} else {
				("codename" === style || ("on" === style && !lib.config.phonelayout)) && (xStart = (ui.arena.offsetWidth - totalW) / 2 - boundsX);
			}
			let selectedIndex = -1,
				spreadOffsetLeft = 0,
				spreadOffsetRight = 0,
				baseShift = 0;
			let xinshaPositions;
			if (style === "othersOff") {
				// SelfCardsArea.adjustCardPos：选中牌起，交替向右、向左给最多五张牌留出 80 设计单位。
				const current = ui.selected?.cards?.filter(card => t.includes(card)).at(-1) || ui._handcardHover,
					index = t.indexOf(current),
					wideStep = faceWidth * 80 / 126;
				if (lib.config.spread_card && !f && index >= 0 && t.length >= 5 && limitW / t.length < wideStep) {
					const expanded = new Set();
					for (let distance = 0; expanded.size < 5 && distance < t.length; distance++) {
						if (index - distance >= 0) expanded.add(index - distance);
						if (expanded.size < 5 && index + distance + 1 < t.length) expanded.add(index + distance + 1);
					}
					const narrowStep = Math.min(faceWidth, (limitW - wideStep * expanded.size) / (t.length - expanded.size));
					let x = xStart;
					xinshaPositions = t.map((card, i) => {
						const position = x;
						x += expanded.has(i) ? wideStep : narrowStep;
						return position;
					});
				}
			} else if (compressed && xMargin < csw - 0.5 && !f && "function" == typeof ui.getSpreadOffset) {
				const e = ui.getSpreadOffset(t, { cardWidth: csw, currentMargin: xMargin });
				if ((({ spreadIndex: selectedIndex, spreadLeft: spreadOffsetLeft, spreadRight: spreadOffsetRight } = e), -1 !== selectedIndex)) {
					const e = xStart + selectedIndex * xMargin,
						t = Math.max(0, limitW - csw);
					baseShift = Math.round(Math.max(0, Math.min(t, e)) - e);
				}
			}
			const updateCards = () => t.forEach((card, e) => {
				let fx = xinshaPositions ? xinshaPositions[e] : xStart + e * xMargin + baseShift;
				(spreadOffsetLeft || spreadOffsetRight) && (e < selectedIndex ? (fx -= spreadOffsetLeft) : e > selectedIndex && (fx += spreadOffsetRight));
				const a = Math.round(fx);
				((card.tx = a), (card.ty = l), (card.scaled = !0));
				// directgain重新入手会加临时隐藏标记，落位后恢复牌面；真实暗牌标记仍由原流程维护。
				// remove 即使未命中也会发出 class 变更，整手重排会反复唤醒牌面观察器。
				if (card.classList.contains("drawinghidden")) card.classList.remove("drawinghidden");
				// 基础位置交给 updateTransform 合成，避免已选牌先落下再抬起。
				card.updateTransform(card.classList.contains("selected") || (style === "othersOff" && lib.config.spread_card && card === ui._handcardHover), 0, `translate(${a}px,${l}px) scale(${cs})`);
			});
			if (style === "othersOff") withXinshaHandLayout(updateCards);
			else updateCards();
			const container = ui.handcards1Container;
			container.classList.toggle("scrollh", f);
			f ? ((container.style.overflowX = "scroll"), (container.style.overflowY = "hidden"), (handNode.style.width = `${Math.round(t.length * xMargin + (csw - xMargin) + (style === "othersOff" ? csw / 2 : 0))}px`)) : ((container.style.overflowX = container.style.overflowY = ""), (handNode.style.width = "100%"));
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
			totalW > limitW && (xMargin = (limitW - csw) / (cards.length - 1));
			const placements = cards.map((card, e) => {
				const t = Math.round(xStart + e * xMargin);
				((card.tx = t), (card.ty = c), (card.scaled = !0));
				return { card, transform: `translate(${t}px,${c}px) scale(${cs})` };
			});
			if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") updateXinshaDiscardMotion(placements);
			else for (const { card, transform } of placements) {
				finishXinshaDiscardMotion(card);
				card.style.transform = transform;
			}
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
			for (const card of ui.handcards1?.children ?? []) finishXinshaHandMotion(card);
			(ui.arena.classList.toggle("dui-mobile", decadeUI.isMobile()), (decadeUI.dataset.animSizeUpdated = !1), (decadeUI.dataset.bodySize.updated = !1), Object.values(decadeUI.boundsCaches).forEach(e => (e.updated = !1)));
			const ensureStyle = selector => decadeUI.sheet.getStyle(selector) || decadeUI.sheet.insertRule(`${selector} { zoom: 1; }`),
				buttonsWindow = ensureStyle("#window > .dialog.popped .buttons:not(.smallzoom)"),
				buttonsArena = ensureStyle("#arena:not(.choose-character) .buttons:not(.smallzoom)");
			((decadeUI.zooms.card = decadeUI.getCardBestScale()), ui.me && (ui.me.style.height = `${Math.round(decadeUI.getHandCardSize().height * decadeUI.zooms.card + 30.4)}px`), buttonsArena && (buttonsArena.zoom = decadeUI.zooms.card), buttonsWindow && (buttonsWindow.zoom = decadeUI.zooms.card), this.update());
			for (const player of game.players || [])
				if (player.node?.showCards && !player.node.showCards.classList.contains("hidden")) positionHandDisplays(player);
			// 尺寸变化立即落位，避免防抖与移牌过渡让卡牌在拖动窗口时滞后。
			for (const card of [...(ui.handcards1?.children ?? []), ...(ui.thrown ?? [])]) {
				finishXinshaHandMotion(card);
				finishXinshaDiscardMotion(card);
				for (const animation of card.getAnimations?.() ?? [])
					if (animation.transitionProperty === "transform") animation.finish();
			}
		},
	};
}
export { e as createLayoutModule };
