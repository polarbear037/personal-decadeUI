const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

// 执行实际一将$throw入口；仅替换DOM落点、广播与录像宿主，不模拟完整牌局。
const filename = path.join(__dirname, "../src/overrides/player/card-movement-xinsha.js");
const source = fs.readFileSync(filename, "utf8")
	.replace(/import\s*[\s\S]*?\s*from\s*["'][^"']+["'];/g, "")
	.replace(/export\{[^}]+\};/g, "");

function fixture({ baseline = false, style = "othersOff", video = false } = {}) {
	const counts = { copies: 0, flights: 0, broadcasts: 0, videos: 0 };
	const status = { video, event: null };
	const game = { broadcast() { counts.broadcasts++; }, addVideo() { counts.videos++; } };
	const dui = { boundsCaches: { arena: {} }, config: {}, element: { create: () => ({}) } };
	const get = { itemtype: value => Array.isArray(value) && value.length ? "cards" : value?.copy ? "card" : undefined, cardsInfo: cards => cards.map(card => card.cardid) };
	const lib = { config: { extension_十周年UI_newDecadeStyle: style }, element: { card: {} } };
	const code = baseline ? source.replace("use = xinshaUseThrowCards(player)", "use = null") : source;
	const ui = { create: { card: () => ({ dataset: {}, node: { suitnum: { style: {} } }, init() {
		this.copy = () => { counts.copies++; return {}; };
		return this;
	} }) } };
	const throwCard = new Function("game", "get", "_status", "ui", "lib", "window", "decadeUI", "applyHandCardPosition", code + "\nreturn l;")(game, get, status, ui, lib, { decadeUI: dui }, dui, () => {});
	const player = { $throwordered2() { counts.flights++; } };
	const card = id => ({ cardid: id, name: "wuxie", copy() {
		counts.copies++;
		return this.clone = { cardid: id, name: this.name };
	} });
	const run = (event, cards, actor = player, broadcast) => {
		status.event = event;
		return throwCard.call(actor, cards, 0, broadcast);
	};
	return { counts, player, card, run, status };
}

function doubleEntry(baseline) {
	const test = fixture({ baseline });
	const card = test.card("wuxie-1");
	const event = { name: "useCard", cards: [card], card: { name: "wuxie" }, player: test.player };
	const first = test.run(event, [card]);
	const second = test.run({ name: "lose", blameEvent: event }, [card], test.player, "nobroadcast");
	assert.equal(test.counts.flights, baseline ? 2 : 1);
	assert.equal(test.counts.copies, baseline ? 2 : 1);
	assert.equal(test.counts.videos, baseline ? 2 : 1);
	assert.equal(test.counts.broadcasts, 1);
	assert.equal(first === second, !baseline);
	assert.equal(card.clone, second);
	return { ...test.counts, reusedClone: first === second };
}

const result = { baseline: doubleEntry(true), fixed: doubleEntry(false), checks: [] };
const check = (name, fn) => { fn(); result.checks.push(name); };

check("移牌先到、loseAsync父链、持续重复通知", () => {
	const t = fixture(), card = t.card("a"), event = { name: "respond", cards: [card] };
	const asyncLose = { name: "loseAsync", relatedEvent: event };
	t.run({ name: "lose", getParent: () => asyncLose }, [card]);
	for (let i = 0; i < 20; i++) t.run(event, [card]);
	assert.equal(t.counts.flights, 1);
});
check("连续反无懈、嵌套事件和同牌再次使用各自起播", () => {
	const t = fixture(), first = t.card("a"), next = t.card("b");
	const event = { name: "useCard", cards: [first] }, counter = { name: "useCard", cards: [next], parent: event };
	t.run(event, [first]); t.run(counter, [next]); t.run(event, [first]);
	t.run({ name: "useCard", cards: [first] }, [first]);
	assert.equal(t.counts.flights, 3);
});
check("批量材料仅跳过已展示牌、保留输入数组", () => {
	const t = fixture(), first = t.card("a"), next = t.card("b"), cards = [first, next];
	const event = { name: "useCard", cards };
	t.run(event, [first]); t.run({ name: "lose", blameEvent: event }, cards);
	assert.equal(t.counts.flights, 2);
	assert.deepEqual(cards, [first, next]);
});
check("技能弃牌、判定牌与非材料牌不与用牌合并", () => {
	const t = fixture(), card = t.card("a"), judge = t.card("lebu"), event = { name: "useCard", cards: [card] };
	t.run(event, [card]);
	for (let i = 0; i < 2; i++) {
		t.run({ name: "lose", parent: { name: "discard", parent: event } }, [card]);
		t.run({ name: "phaseJudge", parent: event }, [judge]);
		t.run(event, [judge]);
	}
	assert.equal(t.counts.flights, 7);
});
check("同事件不同失牌者独立展示、false不写录像或广播", () => {
	const t = fixture(), card = t.card("a"), event = { name: "useCard", cards: [card] };
	t.run(event, [card], t.player, false);
	t.run(event, [card], { $throwordered2: t.player.$throwordered2 }, false);
	assert.deepEqual(t.counts, { copies: 2, flights: 2, broadcasts: 0, videos: 0 });
});
check("空材料虚拟牌及数值暗牌保留原路径", () => {
	const t = fixture();
	const event = { name: "useCard", cards: [], card: { name: "wuxie", suit: "none" } };
	t.run(event, event.cards);
	assert.equal(t.counts.flights, 1);
	t.run({ name: "discard" }, 3);
	assert.equal(t.counts.flights, 4);
});
check("Online、十周年与录像回放不进入一将去重", () => {
	for (const options of [{ style: "onlineUI" }, { style: "on" }, { video: true }]) {
		const t = fixture(options), card = t.card("a"), event = { name: "useCard", cards: [card] };
		t.run(event, [card]); t.run({ name: "lose", blameEvent: event }, [card]);
		assert.equal(t.counts.flights, 2);
	}
});

result.scope = "实际$throw入口的受控调用；非浏览器绘制、手机实机或完整无懈结算";
fs.writeFileSync(path.join(__dirname, "wuxie-throw-once-results.json"), JSON.stringify(result, null, 2) + "\n");
console.log("WUXIE_THROW_ONCE_OK", JSON.stringify(result));
