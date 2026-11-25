// 临时实局采样；不出牌、不修改规则、配置或卡牌位置。再次调用先清理旧探针。
(() => {
	window.__cardFlightProbe?.dispose();
	const probe = window.__cardFlightProbe = { rows: [], cards: [] };
	const cardProto=lib.element.Card.prototype,originalCopy=cardProto.copy;
	const proto = lib.element.Player.prototype, originalThrow = proto.$throw, originalOrdered = proto.$throwordered2;
	const originalAnimate = Element.prototype.animate, ids = new WeakMap();
	let seq = 0;
	const id = card => { if (!ids.has(card)) ids.set(card, ++seq); return ids.get(card); };
	const context = () => ({ event: _status.event?.name, type: _status.event?.type, parent: _status.event?.parent?.name });
	const add = row => { probe.rows.push({ at: performance.now(), ...context(), ...row }); if (probe.rows.length > 600) probe.rows.shift(); };
	const pose = card => { const m = new DOMMatrix(getComputedStyle(card).transform); return { x: m.e, y: m.f, scale: m.a }; };
	const throwWrapper = function (cards, ...args) {
		add({ kind: 'throw', player: this.name, names: Array.isArray(cards) ? cards.map(c => c.name) : cards?.name, stack: new Error().stack });
		return originalThrow.call(this, cards, ...args);
	};
	const orderedWrapper = function (card, ...args) {
		add({ kind: 'ordered', id: id(card), name: card.name, player: this.name, from: pose(card), stack: new Error().stack });
		const result = originalOrdered.call(this, card, ...args);
		if (probe.cards.some(row => row.card === card)) return result;
		const record = { card, move: card.moveTo, moveDelete: card.moveDelete, frames: [], name: card.name, id: id(card) };
		probe.cards.push(record);
		card.moveTo = record.moveWrapper = function (...args) { add({ kind: 'moveTo', id: id(this), player: args[0]?.name, before: pose(this), stack: new Error().stack }); return record.move.apply(this, args); };
		card.moveDelete = record.deleteWrapper = function (...args) { add({ kind: 'moveDelete', id: id(this), player: args[0]?.name, before: pose(this), stack: new Error().stack }); return record.moveDelete.apply(this, args); };
		const end = performance.now() + 4500;
		const sample = () => {
			record.frames.push({ at: performance.now(), ...pose(card), inline:card.style.transform, classes:card.className, fixed:!!card.fixed, connected: card.isConnected,
				effects: card.getAnimations().filter(a => a.effect?.target === card).map(a => ({ id: a.id, kind: a.constructor.name, property: a.transitionProperty, time: a.currentTime })) });
			if (card.isConnected && performance.now() < end) record.frame = requestAnimationFrame(sample);
		};
		record.frame = requestAnimationFrame(sample);
		return result;
	};
	const animateWrapper = function (...args) {
		if (this.classList?.contains('thrown')) add({ kind: 'animate', id: id(this), name: this.name, from: args[0]?.[0], to: args[0]?.at?.(-1), timing: args[1], stack: new Error().stack });
		return originalAnimate.apply(this, args);
	};
	const copyWrapper=function(...args){const clone=originalCopy.apply(this,args);add({kind:'copy',source:id(this),id:id(clone),name:this.name,args:args.map(a=>typeof a==='string'?a:typeof a),stack:new Error().stack});return clone;};
	cardProto.copy=copyWrapper;
	const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.classList?.contains('card'))add({kind:'append',id:id(node),name:node.name,cls:node.className,pose:pose(node)});});observer.observe(ui.arena,{childList:true});
	proto.$throw = throwWrapper;
	proto.$throwordered2 = orderedWrapper;
	Element.prototype.animate = animateWrapper;
	probe.dispose = () => {
		clearTimeout(probe.timer);observer.disconnect();if(cardProto.copy===copyWrapper)cardProto.copy=originalCopy;
		if (proto.$throw === throwWrapper) proto.$throw = originalThrow;
		if (proto.$throwordered2 === orderedWrapper) proto.$throwordered2 = originalOrdered;
		if (Element.prototype.animate === animateWrapper) Element.prototype.animate = originalAnimate;
		for (const row of probe.cards) {
			cancelAnimationFrame(row.frame);
			if (row.card.moveTo === row.moveWrapper) row.card.moveTo = row.move;
			if (row.card.moveDelete === row.deleteWrapper) row.card.moveDelete = row.moveDelete;
		}
	};
	probe.snapshot = () => ({ rows: probe.rows, cards: probe.cards.map(({ id, name, frames }) => ({ id, name, frames })) });
	probe.timer = setTimeout(probe.dispose, 900000);
	return { installed: true };
})();
