import { lib } from "noname";

const settlementContexts = new WeakMap();
const taskBudget = 8;
let lastYield = 0;

function isCardSettlement(event) {
	if (event.name === "useCard" || event.name === "respond") return true;
	const existing = settlementContexts.get(event);
	if (existing && existing.parent === event.parent && existing.name === event.name) return existing.active;
	const path = [], seen = new Set();
	let active = false;
	for (let current = event; current && !seen.has(current); current = current.parent) {
		seen.add(current);
		if (current.name === "useCard" || current.name === "respond") { active = true; break; }
		const cached = settlementContexts.get(current);
		if (cached && cached.parent === current.parent && cached.name === current.name) { active = cached.active; break; }
		path.push(current);
	}
	for (const current of path) settlementContexts.set(current, { parent: current.parent, name: current.name, active });
	return active;
}

export function installXinshaCardSettlementYield() {
	const prototype = lib.element.GameEvent?.prototype;
	const original = prototype?.waitNext;
	if (typeof original !== "function" || original._xinshaCardSettlementYield) return false;
	const wrapped = function (...args) {
		if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || document.hidden ||
			performance.now() - lastYield < taskBudget || !isCardSettlement(this)) return original.apply(this, args);
		// waitNext 本身就是原生事件边界。让出当前任务供绘制/输入执行后，
		// 仍由原函数按顺序执行子事件；不暂停游戏，不等移牌或动皮动画结束。
		const pending = typeof globalThis.scheduler?.yield === "function"
			? globalThis.scheduler.yield()
			: new Promise(resolve => setTimeout(resolve, 0));
		return pending.then(() => {
			lastYield = performance.now();
			return original.apply(this, args);
		});
	};
	wrapped._xinshaCardSettlementYield = true;
	prototype.waitNext = wrapped;
	return true;
}
