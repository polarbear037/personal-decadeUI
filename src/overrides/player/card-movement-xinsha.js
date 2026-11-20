import { markXinshaDelayJudgeSource } from "../../ui/delay-judge-xinsha.js";
import { applyHandCardPosition } from "../../utils/hand-card-position.js";
import{game,get,_status,ui,lib}from"noname";import{applyCardBorder as e}from"../../ui/cardStyles.js";let t=null,n=null;function a(){return n||(n=window.decadeUI),n}function d(e){t=e}function i(e,t,n){const a=this.getCards("hs");for(let r=0;r<e.length;r++)a.includes(e[r])&&e.splice(r--,1);const d=[],i=[];for(let r=0;r<e.length;r++){e[r].fix(),n&&("string"==typeof n&&(n=[n]),n.forEach(t=>e[r].addGaintag(t)));const t=lib.config.sort_card(e[r]);this==game.me&&e[r].classList.add("drawinghidden"),get.is.singleHandcard()||t>0?d.push(e[r]):i.push(e[r])}return this.node.handcards1.append(...d),i.length&&this.node.handcards2.append(...i),(this==game.me||_status.video)&&ui.updatehl(),_status.video||(game.addVideo("directgain",this,get.cardsInfo(e)),this.update()),!1!==t&&game.broadcast(function(player,e){player.directgain(e)},this,e),this}function r(e,t,n){for(var a=this.getCards("hs"),d=0;d<e.length;d++)a.includes(e[d])&&e.splice(d--,1);var i=function(card,e){if(n)for(var t=0;t<e.childNodes.length;t++){var a=e.childNodes[e.childNodes.length-t-1];if(!a.classList.contains("glows"))break;if(a.hasGaintag(n))return void e.insertBefore(card,a.nextSibling)}e.appendChild(card)};for(d=0;d<e.length;d++)e[d].fix(),e[d].remove(),n&&("string"==typeof n&&(n=[n]),n.forEach(t=>e[d].addGaintag(t))),e[d].classList.add("glows"),this==game.me&&e[d].classList.add("drawinghidden"),get.is.singleHandcard()?i(e[d],this.node.handcards1):i(e[d],this.node.handcards2);return(this==game.me||_status.video)&&ui.updatehl(),_status.video||(game.addVideo("directgains",this,{cards:get.cardsInfo(e),gaintag:n}),this.update()),!1!==t&&game.broadcast(function(player,e,t){player.directgains(e,null,t)},this,e,n),this}function s(n,d,i){if(game.chess)return t.call(this,n,d,i);let r,s;var event;if(!1!==d&&"nobroadcast"!==d&&game.broadcast(function(e,t,n,a){e.$draw(t,n,a)},this,n,d,i),"cards"==get.itemtype(n)?(r=n.concat(),s=!0):"card"==get.itemtype(n)?(r=[n],s=!0):r=new Array("number"==typeof n?n:1),!1!==d&&(s?game.addVideo("drawCard",this,get.cardsInfo(r)):game.addVideo("draw",this,n)),_status.event&&_status.event.name&&("gain"==(event=_status.event).name||event.name.includes("raw")||(s=!0)),game.me==this&&!s)return;const o=document.createDocumentFragment();let card;const c=a(),player=this;for(let t=0;t<r.length;t++)card=r[t],card=null==card?c.element.create("card thrown drawingcard"):card.copy("thrown","drawingcard",!1),card.fixed=!0,player!==game.me&&e(card,player),r[t]=card,o.appendChild(card);c.layoutDrawCards(r,player,!0),ui.arena.appendChild(o),c.queueNextFrameTick(function(){c.layoutDrawCards(r,player),c.delayRemoveCards(r,460,220)})}function o(t,n){let d=get.itemtype(t);if("cards"!=d){if("card"!=d)return;d="cards",t=[t]}!0===n&&game.log(this,"获得了",t),game.broadcast(function(e,t){e.$gain2(t)},this,t);const i=[],r=[];let card,s;const player=this;for(let a=0;a<t.length;a++)s=t[a].clone,card=t[a].copy("thrown","gainingcard"),card.fixed=!0,player!==game.me&&e(card,player),s&&s.parentNode==ui.arena?(card.scaled=!0,card.style.transform=s.style.transform,i.push(card)):r.push(card);if(i.length&&game.addVideo("gain2",this,get.cardsInfo(i)),r.length&&game.addVideo("drawCard",this,get.cardsInfo(r)),t.duiMod&&this==game.me)return;t=i.concat(r);const o=a();o.layoutDrawCards(r,this,!0);const c=document.createDocumentFragment();for(let e=0;e<t.length;e++)c.appendChild(t[e]);ui.arena.appendChild(c),o.queueNextFrameTick(function(){o.layoutDrawCards(t,player),o.delayRemoveCards(t,460,220)})}function c(e,t,n,d){let i;const r=e.duiMod&&game.me==t;if("number"==typeof e)i="number",e=new Array(e);else if(i=get.itemtype(e),"cards"==i)e=e.concat();else{if("card"!=i)return;e=[e]}if(!1!==d){let n=e;"number"==i?(n=e.length,game.addVideo("give",this,[n,t.dataset.position])):game.addVideo("giveCard",this,[get.cardsInfo(n),t.dataset.position]),game.broadcast(function(e,t,n,a){e.$give(t,n,!1,a)},this,n,t,d)}if(0!=n&&("number"==i?game.log(t,"从",this,"获得了"+get.cnNumber(e.length)+"张牌"):game.log(t,"从",this,"获得了",e)),this.$givemod)return void this.$givemod(e,t);if(r)return;let card;const s=a(),o=s.boundsCaches.hand;o.check();const c=[],player=this,l=document.createDocumentFragment();for(let a=0;a<e.length;a++){if(card=e[a],card){const e=card.copy("card","thrown","gainingcard",!1);let t=player==game.me;t&&(t=card.throwWith?"h"==card.throwWith||"s"==card.throwWith:card.parentNode==player.node.handcards1),t?(e.tx=Math.round(o.x+card.tx),e.ty=Math.round(o.y+30+card.ty),e.scaled=!0,e.style.transform="translate("+e.tx+"px,"+e.ty+"px) scale("+o.cardScale+")"):c.push(e),card=e}else card=s.element.create("card thrown gainingcard"),c.push(card);e[a]=card,e[a].fixed=!0,l.appendChild(e[a])}c.length&&s.layoutDrawCards(c,player),ui.arena.appendChild(l),s.queueNextFrameTick(function(){s.layoutDrawCards(e,t),s.delayRemoveCards(e,460,220)})}function l(e,t,n,d){let i;const r=e.duiMod&&game.me==this&&!d;if("number"==typeof e)i="number",e=new Array(e);else if(i=get.itemtype(e),"cards"==i)e=e.concat();else if("card"==i)e=[e];else{const t=_status.event;if(t&&t.card&&t.cards===e){const n=ui.create.card().init([t.card.suit,t.card.number,t.card.name,t.card.nature]);"none"==t.card.suit&&(n.node.suitnum.style.display="none"),n.dataset.virtual=1,e=[n]}}let card,s;const player=this,o=a(),c=o.boundsCaches.hand;c.check();for(let a=0;a<e.length;a++)card=e[a],card?(s=card.copy("thrown"),!r||"h"!=card.throwWith&&"s"!=card.throwWith||applyHandCardPosition(card,s,player,o.boundsCaches.arena)||(s.tx=Math.round(c.x+card.tx),s.ty=Math.round(c.y+30+card.ty),s.scaled=!0,s.throwordered=!0,s.style.transform="translate("+s.tx+"px,"+s.ty+"px) scale("+c.cardScale+")"),card=s):(card=o.element.create("card infohidden infoflip"),card.moveTo=lib.element.card.moveTo,card.moveDelete=lib.element.card.moveDelete),e[a]=card;!1!==n&&("nobroadcast"!==n&&game.broadcast(function(e,t,n,a,d){e.$throw(t,n,a,d)},this,e,0,n,d),game.addVideo("throw",this,[get.cardsInfo(e),0,d])),e.sort((e,t)=>void 0===e.tx&&void 0===t.tx?0:void 0===e.tx?decadeUI.config.rightLayout?-1:1:void 0===t.tx?decadeUI.config.rightLayout?1:-1:e.tx-t.tx);for(let a=0;a<e.length;a++)(e=>{player.$throwordered2(e,d)})(e[a]);return game.chess&&this.chessFocus(),e[e.length-1]}// YJCM 6.4.5 MoveCardController.defaultAction / moveCardsFromStackToEquipArea。
// 官方参数及用户要求的连续展示适配见 verification/yjcm-equip-animation-source.json；不延迟规则结算。
const xinshaEquipFlights = new Set();
let xinshaEquipCleanupInstalled = false;

function xinshaEquipUseEvent(player) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") return null;
	let event = _status.event;
	const seen = new Set();
	while (event && !seen.has(event)) {
		seen.add(event);
		const use = [event, event.blameEvent, event.relatedEvent].find(item => item?.name === "useCard");
		if (use) return use.player === player && get.type(use.card, null, player) === "equip" ? use : null;
		if (event.name === "lose" && event.position && event.position !== ui.ordering) return null;
		event = event.parent || event.getParent?.();
	}
	return null;
}

function xinshaEquipTransform(node) {
	const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
	return { x: matrix.m41, y: matrix.m42, scale: Math.hypot(matrix.a, matrix.b) || 1 };
}

function writeXinshaEquipTransform(node, point, opacity = 1) {
	node.tx = point.x;
	node.ty = point.y;
	node.scaled = true;
	node.style.transform = `translate(${point.x}px,${point.y}px) scale(${point.scale})`;
	node.style.opacity = String(opacity);
}

function xinshaEquipRect(node) {
	const arenaRect = ui.arena.getBoundingClientRect(), rect = node.getBoundingClientRect();
	const zoomX = arenaRect.width / ui.arena.clientWidth || 1, zoomY = arenaRect.height / ui.arena.clientHeight || 1;
	return { x: (rect.left + rect.width / 2 - arenaRect.left) / zoomX, y: (rect.top + rect.height / 2 - arenaRect.top) / zoomY, width: rect.width / zoomX, height: rect.height / zoomY };
}

function xinshaEquipCenter(flight, node) {
	const rect = xinshaEquipRect(node), bounds = a().boundsCaches.arena;
	return { x: rect.x - bounds.cardWidth / 2, y: rect.y - bounds.cardHeight / 2, scale: flight.start.scale };
}

function xinshaEquipStackPoint(flight, selfDisplay = false) {
	// GameLayer.initContent：处理区中心(display.cx, display.cy + 20)。
	// 本人展示段适配到手牌上方(cx,cy-175)，与后续getSeatPos(view)的武将中心分开。
	const windowNode = ui.window || document.body, rect = windowNode.getBoundingClientRect();
	const arenaRect = ui.arena.getBoundingClientRect(), bounds = a().boundsCaches.arena;
	const zoomX = arenaRect.width / ui.arena.clientWidth || 1, zoomY = arenaRect.height / ui.arena.clientHeight || 1;
	const windowZoom = rect.height / windowNode.clientHeight || 1;
	const unit = parseFloat(getComputedStyle(windowNode).getPropertyValue("--yjcm-unit")) || Math.min(windowNode.clientWidth / 1334, windowNode.clientHeight / 750);
	return {
		x: (rect.left + rect.width / 2 - arenaRect.left) / zoomX - bounds.cardWidth / 2,
		y: (rect.top + rect.height / 2 + (selfDisplay ? 175 : -20) * unit * windowZoom - arenaRect.top) / zoomY - bounds.cardHeight / 2,
		scale: selfDisplay ? flight.start.scale : a().getCardBestScale({ height: bounds.cardHeight }, lib.config.extension_十周年UI_discardScale ?? 0.14),
	};
}

function xinshaEquipMatches(flight, card) {
	if (card === flight.source || card.cards?.includes(flight.source)) return true;
	if (flight.source?.cardid && card.cardid === flight.source.cardid) return true;
	return !flight.source && (card.viewAs || card.name) === flight.name;
}

function syncXinshaEquipFlight(flight) {
	const equips = flight.player.node?.equips;
	if (!equips) return;
	// 装备在动画中被替换/移走时，不让旧回调写回手牌样式。
	if (flight.equipped && flight.equipped.parentNode !== equips) return finishXinshaEquipFlight(flight);
	const card = Array.from(equips.children).find(card => xinshaEquipMatches(flight, card));
	if (!card || flight.equipped === card) return;
	flight.equipped = card;
	if (!Object.prototype.hasOwnProperty.call(card, "_decadeEquipFlightVisibility")) card._decadeEquipFlightVisibility = card.style.visibility;
	card.style.visibility = "hidden";
}

function finishXinshaEquipFlight(flight) {
	if (flight.done) return;
	flight.done = true;
	cancelAnimationFrame(flight.frame);
	cancelAnimationFrame(flight.displayFrame);
	clearTimeout(flight.waitTimer);
	flight.displayAnimation?.cancel();
	flight.resizeObserver?.disconnect();
	flight.observer.disconnect();
	const card = flight.equipped;
	if (card && Object.prototype.hasOwnProperty.call(card, "_decadeEquipFlightVisibility")) {
		card.style.visibility = card._decadeEquipFlightVisibility;
		delete card._decadeEquipFlightVisibility;
	}
	flight.node.remove();
	xinshaEquipFlights.delete(flight);
}

function xinshaEquipSlot(flight) {
	const player = flight.player, equips = player.node?.equips;
	if (flight.equipped?.parentNode === equips) return xinshaEquipCenter(flight, flight.equipped);
	const subtype = get.subtype({ name: flight.name }), slot = Number(subtype?.slice(5)) || 1;
	if (player === game.me && ui.equipSolts?.back && ui.equipSolts.contains(equips)) {
		const background = Array.from(ui.equipSolts.back.children).find(node => Number(node.dataset.type) === Math.min(slot, 5) - 1);
		if (background) return xinshaEquipCenter(flight, background);
	}
	// 尚未实际入栏时沿当前装备栏定位；布局变化时重算，兼容扩展栏和换装重排。
	const center = xinshaEquipCenter(flight, equips || player);
	if (equips) {
		const row = ({ 5: 0, 1: 1, 2: 2, 3: 3, 4: 4 })[slot] ?? 1;
		const rows = Number(equips.style.getPropertyValue("--equip-rows")) || 5;
		center.y += ((row + 0.5) / rows - 0.5) * xinshaEquipRect(equips).height;
	}
	return center;
}

function xinshaEquipLerp(from, to, ratio, scale) {
	return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio, scale };
}

function queueXinshaEquipEntryStart(flight) {
	if (flight.done || flight.phase !== "stack" || flight.started != null || flight.frame) return;
	const animation = flight.displayAnimation;
	if (!animation) return;
	const style = getComputedStyle(flight.node);
	if (style.visibility !== "visible" || style.display === "none") return;
	flight.frame = requestAnimationFrame(time => {
		flight.frame = 0;
		if (flight.done || flight.displayAnimation !== animation) return;
		const style = getComputedStyle(flight.node);
		if (style.visibility !== "visible" || style.display === "none") return;
		flight.started = flight.phaseStarted = time;
		animation.play();
		animation.startTime = time;
	});
}

function animateXinshaEquipDisplay(flight) {
	const stacking = flight.phase === "stack";
	const display = stacking ? xinshaEquipStackPoint(flight, flight.selfUse) : xinshaEquipCenter(flight, flight.player);
	const previous = flight.display;
	if (flight.displayAnimation && previous.x === display.x && previous.y === display.y && previous.scale === display.scale) return;
	flight.display = display;
	// stack普通入场与本人飞向武将是两段独立动画，均不逐帧写style或读布局。
	const from = stacking ? flight.start : flight.seatStart;
	// 无名杀的通知间隔不等于官方网络通知间隔。仅展示段适配：
	// 本人从手牌飞行300ms；其他座位向中央飞出约60%，用200ms保留可见轨迹。
	const duration = stacking ? (flight.selfUse ? 300 : 200) : 1300 / 3;
	const keyframes = Array.from({ length: 79 }, (_, index) => {
		const time = index * duration / 78, progress = Math.min(time / (1300 / 3), 1);
		const pulse = time < 1000 / 3 ? 1 : 1 - 0.03 * Math.min((time - 1000 / 3) / 100, 1);
		const scale = stacking ? from.scale : pulse * display.scale;
		const opacity = 1;
		const ratio = stacking ? Math.sin(time / duration * (flight.selfUse ? Math.PI / 2 : Math.asin(0.6))) : 1 - Math.cos(progress * Math.PI / 2);
		const point = xinshaEquipLerp(from, display, ratio, scale);
		return { transform: `translate(${point.x}px,${point.y}px) scale(${point.scale})`, opacity };
	});
	if (flight.displayAnimation) flight.displayAnimation.effect.setKeyframes(keyframes);
	else {
		const animation = flight.node.animate(keyframes, { duration, easing: "linear", fill: "both" });
		flight.displayAnimation = animation;
		if (stacking) {
			// 首段在首次可绘制帧绑定起点。旧渲染时间戳会把本帧结算耗时
			// 算进动画，繁忙时用户第一眼就看到终点；后续段仍按统一时间轴无缝衔接。
			animation.pause();
			animation.currentTime = 0;
			queueXinshaEquipEntryStart(flight);
		} else animation.startTime = flight.phaseStarted;
		animation.finished.then(() => {
			if (flight.done || flight.displayAnimation !== animation) return;
			if (stacking) {
				flight.entryComplete = true;
				beginXinshaEquipReturn(flight);
			} else {
				flight.displayAnimation = null;
				animation.cancel();
				flight.phase = "slot";
				flight.display = { ...flight.display, scale: flight.start.scale * 0.97 };
				flight.ready = true;
				flight.phaseStarted += duration;
				animateXinshaEquipSlot(flight);
			}
		}, () => {
			// 正常衔接先解除当前动画引用；仅外部取消当前动画才结束整个飞行。
			if (!flight.done && flight.displayAnimation === animation) finishXinshaEquipFlight(flight);
		});
	}
}

function refreshXinshaEquipDisplay(flight) {
	if (flight.done) return;
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || _status.over || !flight.node.isConnected || !flight.player.isConnected) return finishXinshaEquipFlight(flight);
	if (!flight.displayAnimation || flight.displayFrame) return;
	flight.displayFrame = requestAnimationFrame(() => {
		flight.displayFrame = 0;
		if (flight.done) return;
		if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || _status.over || !flight.node.isConnected || !flight.player.isConnected) return finishXinshaEquipFlight(flight);
		if (flight.phase === "slot") animateXinshaEquipSlot(flight);
		else animateXinshaEquipDisplay(flight);
	});
}

function animateXinshaEquipSlot(flight) {
	if (flight.done) return;
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || _status.over || !flight.node.isConnected || !flight.player.isConnected) return finishXinshaEquipFlight(flight);
	const target = xinshaEquipSlot(flight);
	if (flight.displayAnimation && flight.slotTarget.x === target.x && flight.slotTarget.y === target.y) return;
	flight.slotTarget = target;
	flight.departed = flight.phaseStarted;
	const stops = [[0, flight.display.scale / flight.start.scale], [2 / 11, 0.78], [4 / 11, 0.57], [8 / 11, 0.35], [1, 0.2]];
	const keyframes = stops.map(([offset, scale]) => {
		const point = xinshaEquipLerp(flight.display, target, offset, scale * flight.start.scale);
		return { offset, transform: `translate(${point.x}px,${point.y}px) scale(${point.scale})` };
	});
	// 入栏前段轻微渐隐，将主要淡出留在原版的最后 100ms，牌缩小后仍能看清轨迹。
	keyframes[0].opacity = 1;
	keyframes[keyframes.length - 1].opacity = 0;
	keyframes.push({ offset: 1 - 100 / flight.duration, opacity: 0.9 });
	keyframes.sort((left, right) => left.offset - right.offset);
	if (flight.displayAnimation) flight.displayAnimation.effect.setKeyframes(keyframes);
	else {
		const animation = flight.node.animate(keyframes, { duration: flight.duration, easing: "linear", fill: "both" });
		flight.displayAnimation = animation;
		animation.startTime = flight.phaseStarted;
		animation.finished.then(() => {
			if (flight.done || flight.displayAnimation !== animation) return;
			writeXinshaEquipTransform(flight.node, { ...flight.slotTarget, scale: flight.start.scale * 0.2 }, 0);
			finishXinshaEquipFlight(flight);
		}, () => {
			if (!flight.done && flight.displayAnimation === animation) finishXinshaEquipFlight(flight);
		});
	}
}

function beginXinshaEquipReturn(flight) {
	if (flight.done || flight.phase !== "stack" || !flight.entryComplete) return;
	// 对应getStackCardPos读取当前位置；画面独立衔接，不停在展示点等待原生通知。
	const current = xinshaEquipTransform(flight.node), animation = flight.displayAnimation;
	const duration = animation.effect.getTiming().duration;
	flight.displayAnimation = null;
	animation?.cancel();
	flight.phaseStarted += duration;
	if (flight.player === game.me) {
		// 0.20 PC84..96是getSeatPos(view)，truthy参数进入父类人物中心分支。
		flight.phase = "seat";
		flight.seatStart = current;
		animateXinshaEquipDisplay(flight);
	} else {
		flight.phase = "slot";
		flight.display = current;
		flight.ready = true;
		animateXinshaEquipSlot(flight);
	}
}

function beginXinshaEquipEntry(flight) {
	if (flight.done || flight.phase !== "pending") return;
	flight.phase = "stack";
	animateXinshaEquipDisplay(flight);
}

function startXinshaEquipUse(node, actor) {
	const use = xinshaEquipUseEvent(actor);
	if (!use || node._xinshaEquipFlight || node.judge) return false;
	const source = use.cards?.find(card => card.clone === node || card.cardid && card.cardid === node.cardid) || (use.cards?.length === 1 ? use.cards[0] : null);
	if (source && source.name !== node.name) return false;
	const player = use.targets?.[0] || actor, subtype = get.subtype(use.card);
	const flight = { node, source, player, use, selfUse: actor === game.me, name: use.card.name, start: xinshaEquipTransform(node), duration: ["equip3", "equip4", "equip6"].includes(subtype) ? 500 : subtype === "equip2" ? 1300 / 3 : 1100 / 3 };
	if (!flight.selfUse) flight.start = xinshaEquipCenter(flight, actor);
	node._xinshaEquipFlight = flight;
	// 在任意待执行的layoutDiscard之前退出处理区队列，避免首帧被挪到处理区。
	node.fixed = true;
	node.style.transition = "none";
	node.classList.add("decade-xinsha-equip-flight");
	// 两种视角均立即提交首段；装备通知只补记结算状态，不能停牌展示或重播。
	node.moveDelete = destination => {
		if (destination !== flight.player || flight.done) return;
		flight.requested = true;
		beginXinshaEquipEntry(flight);
	};
	flight.observer = new MutationObserver(records => {
		syncXinshaEquipFlight(flight);
		// 卡面服务会在冷图就绪前隐藏副本；不可见时停在来源，显露后才开始首段计时。
		queueXinshaEquipEntryStart(flight);
		if (records.length) refreshXinshaEquipDisplay(flight);
	});
	flight.observer.observe(player.node.equips, { childList: true });
	flight.observer.observe(node, { childList: true, attributes: true, attributeFilter: ["class", "style"] });
	xinshaEquipFlights.add(flight);
	syncXinshaEquipFlight(flight);
	// 飞行仅维护副本和实体可见性，不登记结算等待，也不在结束时恢复游戏。
	if (!xinshaEquipCleanupInstalled) {
		xinshaEquipCleanupInstalled = true;
		lib.onover.push(() => { for (const flight of xinshaEquipFlights) finishXinshaEquipFlight(flight); });
	}
	{
		const index = ui.thrown.indexOf(node);
		if (index !== -1) ui.thrown.splice(index, 1);
		writeXinshaEquipTransform(node, flight.start);
		flight.phase = "pending";
		flight.waitTimer = setTimeout(() => { if (!flight.requested || flight.started == null) finishXinshaEquipFlight(flight); }, 3000);
		flight.display = xinshaEquipStackPoint(flight, flight.selfUse);
		flight.resizeObserver = new ResizeObserver(() => refreshXinshaEquipDisplay(flight));
		for (const host of new Set([ui.window || document.body, ui.arena, document.body])) {
			flight.resizeObserver.observe(host);
			flight.observer.observe(host, { attributes: true, attributeFilter: ["class", "style"] });
		}
		beginXinshaEquipEntry(flight);
	}
	return true;
}

function u(card,t){
	_status.connectMode&&(ui.todiscard=[]);
	const n=a();
	let replacementJudgeVisualId=null;
	if(card?.judge&&!card._decadeEarlyJudgeCreating){
		const visualId=n?._judgeVisualByPlayer?.[this.playerid];
		const earlyNode=visualId!=null?n?._judgeVisuals?.[visualId]:null;
		if(earlyNode?.isConnected){
			const sourceId=earlyNode._decadeJudgeSourceCardId;
			const incomingId=card.cardid;
			const judgeEvent=_status.event?.name==="judge"?_status.event:_status.event?.getParent?.("judge");
			const currentJudgeCard=judgeEvent?.player?.judging?.[0]||this.judging?.[0];
			const currentJudgeId=currentJudgeCard?.cardid;
			const sameFace=get.name(earlyNode)===get.name(card)&&get.suit(earlyNode)===get.suit(card)&&get.number(earlyNode)===get.number(card)&&get.nature(earlyNode)===get.nature(card);
			const sameCard=sourceId!=null&&currentJudgeId!=null&&sourceId===currentJudgeId||sourceId!=null&&incomingId!=null&&sourceId===incomingId||sameFace;
			if(sameCard){
				if(!game.online&&_status.event?.name==="judge"){
					_status.event.node=earlyNode;
					_status.event.apcard=earlyNode;
				}
				return earlyNode;
			}
			replacementJudgeVisualId=visualId;
			earlyNode._ap?.stopSpineAll?.();
			earlyNode.remove();
			delete n._judgeVisuals[visualId];
		}
	}
	if(void 0===card.throwordered){
		const e=n.boundsCaches.arena;
		let a,d;
		e.updated||e.update(),this.checkBoundsCache(),t?(a=(e.width-e.cardWidth)/2-.08*e.width,d=(e.height-e.cardHeight)/2):(a=(this.cacheWidth-e.cardWidth)/2+this.cacheLeft,d=(this.cacheHeight-e.cardHeight)/2+this.cacheTop),card.style.transform=`translate(${Math.round(a)}px,${Math.round(d)}px) scale(${e.cardScale})`;
	}else card.throwordered=void 0;
	if(card.classList.add("thrown"),card.fixed)return ui.arena.appendChild(card);
	let d=card.querySelector(".used-info");
	null==d&&(d=card.appendChild(n.element.create("used-info"))),card.$usedtag=d,e(card,this,this===game.me),ui.thrown.push(card),ui.arena.appendChild(card);
	card._decadeEarlyJudgeCreating||n.tryAddPlayerCardUseTag(card,this,_status.event);
	if(replacementJudgeVisualId!=null){
		card._decadeJudgeVisualId=String(replacementJudgeVisualId);
		card._decadeJudgeSourceCardId=card.cardid;
		n._judgeVisuals[String(replacementJudgeVisualId)]=card;
		n._judgeVisualByPlayer[this.playerid]=String(replacementJudgeVisualId);
		if(!game.online&&_status.event?.name==="judge"){
			_status.event.node=card;
			_status.event.apcard=card;
		}
	}
	markXinshaDelayJudgeSource(card,this);
	if(!startXinshaEquipUse(card,this))n.queueNextFrameTick(n.layoutDiscard,n);
	return card
}
function h(card){game.addVideo("phaseJudge",this,get.cardInfo(card));const player=this;if(card[card.cardSymbol]?.cards?.length){const e=card[card.cardSymbol].cards;if(player.$throw(e),lib.config.low_performance&&e[0]&&e[0].clone){const t=get.time();_status.waitingForTransition=t,e[0].clone.listenTransition(function(){_status.waitingForTransition==t&&_status.paused&&game.resume()}),game.pause()}else a().delay(451)}else{const e=game.createCard(card.name,"虚拟","");if(player.$throw(e),lib.config.low_performance&&e&&e.clone){const t=get.time();_status.waitingForTransition=t,e.clone.listenTransition(function(){_status.waitingForTransition==t&&_status.paused&&game.resume()}),game.pause()}else a().delay(451)}}function g(e,t){if(game.online)return;const card=e,n=1!==t.length||t[0].name!==e.name||!card.isCard;let a;a="card"==get.itemtype(card)&&card.isViewAsCard?card:n?game.createCard(card.name,1==t.length?get.suit(t[0]):"none",1==t.length?get.number(t[0]):0):t[0],game.broadcastAll((e,t,n,a,d)=>{if(t.fix(),!t.isViewAsCard){const e=/* @__PURE__ */Symbol("card");t.cardSymbol=e,t[e]=a}if(t.style.transform="",t.classList.remove("drawinghidden"),delete t._transform,n&&!t.isViewAsCard){t.isViewAsCard=!0,t.destroyLog=!1;for(let t of d)t.goto(ui.special),t.destiny=e.node.judges;t.destroyed&&(t._destroyed_Virtua=t.destroyed),t.destroyed=function(e,t,n,event){if(e._destroyed_Virtua)if("function"==typeof e._destroyed_Virtua){if(!0===e._destroyed_Virtua(e,t,n,event))return!0}else{if(lib.skill[e._destroyed_Virtua])return!n||!n.hasSkill(e._destroyed_Virtua)||(delete e._destroyed_Virtua,!1);if("string"==typeof e._destroyed_Virtua)return e._destroyed_Virtua==t;if(!0===e._destroyed_Virtua)return!0}return("ordering"!=t||!["phaseJudge","executeDelayCardEffect"].includes(event.getParent().name))&&("judge"!=t||void 0)}}if(t.classList.add("drawinghidden"),n){t.cards=d||[],t.viewAs=a.name;const e=lib.translate[t.viewAs+"_bg"]||get.translation(t.viewAs)[0];(t.classList.contains("fullskin")||t.classList.contains("fullborder")||t.classList.contains("fullimage"))&&(t.classList.add("fakejudge"),t.classList.contains("fullimage")&&(t.classList.remove("fullimage"),t.classList.add("fullskin"),t.style.backgroundImage=""),window.decadeUI?t.node.judgeMark.node.judge.innerHTML=e:t.node.background.innerHTML=e)}else delete t.viewAs,t.classList.remove("fakejudge"),window.decadeUI&&(t.node.judgeMark.node.judge.innerHTML=lib.translate[t.name+"_bg"]||get.translation(t.name)[0]);e.node.judges.insertBefore(t,e.node.judges.firstChild);if(["bingliang","lebu","shandian","fulei","hongshui","huoshan","caomu","jlsgqs_shuiyanqijun","jydiy_zouhuorumo","jydiy_yungongliaoshang","xwjh_biguanqingxiu","xwjh_wushisanke","xumou_jsrg","dczixi_bingliang","dczixi_lebu","dczixi_shandian"].includes(t.name)){let e=t.name;const n=lib.translate[t.name+"_bg"]||get.translation(t.name)||"";t.node.judgeMark.node.judge.innerText="",t.node.judgeMark.node.judge.style.fontSize="";const a=("on"===lib.config.extension_十周年UI_newDecadeStyle||"othersOff"===lib.config.extension_十周年UI_newDecadeStyle)&&["bingliang","lebu","shandian"].includes(e)?"1.png":".png",d=`${lib.assetURL}extension/十周年UI/image/ui/judge-mark/`,i=new Image;i.onload=function(){t.node.judgeMark.node.judge.style.backgroundImage=`url("${i.src}")`,t.node.judgeMark.node.judge.innerText="",t.node.judgeMark.node.judge.style.fontSize="0px"},i.onerror=function(){t.node.judgeMark.node.judge.style.backgroundImage=`url("${d}tongyong.png")`,t.node.judgeMark.node.judge.innerText=n?n[0]:""},i.src=`${d}${e}${a}`,t.node.judgeMark.node.judge.style.zIndex="99",t.node.judgeMark.node.judge.parentElement.children[0].style.background="none",t.node.judgeMark.node.judge.parentElement.children[0].style.display="none"}else t.node.judgeMark.node.judge.style.backgroundImage=`url("${lib.assetURL}extension/十周年UI/image/ui/judge-mark/tongyong.png")`;ui.updatej(e);game._decadeUIAnimateXinshaDelayJudge?.(e,t,d)},this,a,n,e,t)}export{g as playerAddVirtualJudge,i as playerDirectgain,r as playerDirectgains,s as playerDraw,o as playerGain2,c as playerGive,h as playerPhaseJudge,l as playerThrow,u as playerThrowordered2,d as setBasePlayerDraw};
