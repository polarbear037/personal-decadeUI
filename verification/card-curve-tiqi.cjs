const assert = require("node:assert/strict");
const fs = require("node:fs");

const extensionRoot = require("node:path").resolve(__dirname, "..");
const appRoot = require("node:path").resolve(extensionRoot, "../..");
const movementSource = fs.readFileSync(require("node:path").join(extensionRoot, "src/overrides/player/card-movement-online.js"), "utf8");
const xiandingSource = fs.readFileSync(require("node:path").join(appRoot, "character/xianding.js"), "utf8");

function extractBetween(source, start, end, offset = 0) {
	const startIndex = source.indexOf(start, offset);
	assert.notEqual(startIndex, -1, `Missing source anchor: ${start}`);
	const endIndex = source.indexOf(end, startIndex + start.length);
	assert.notEqual(endIndex, -1, `Missing source anchor: ${end}`);
	return source.slice(startIndex, endIndex);
}

const movementFunction = extractBetween(movementSource, "function getOfficialBezierControlPoint(", "\n}\n\nfunction nowTime()") + "\n}";
const arena = { width: 1400, cardWidth: 96, check() {} };
const getControlPoint = new Function("getDui", `${movementFunction}; return getOfficialBezierControlPoint;`)(() => ({ boundsCaches: { arena } }));

function sampleBezier(start, control, end, progress) {
	const inverse = 1 - progress;
	return {
		x: inverse ** 2 * start.x + 2 * inverse * progress * control.x + progress ** 2 * end.x,
		y: inverse ** 2 * start.y + 2 * inverse * progress * control.y + progress ** 2 * end.y,
	};
}

function assertCurve(start, end, expectedControl) {
	const control = getControlPoint(start, end, true);
	assert.deepEqual(control, expectedControl);
	const samples = Array.from({ length: 101 }, (_, index) => sampleBezier(start, control, end, index / 100));
	assert.deepEqual(samples[0], start);
	assert.deepEqual(samples.at(-1), end);
	for (const point of samples) {
		assert.ok(point.x >= Math.min(start.x, end.x) - 1e-9 && point.x <= Math.max(start.x, end.x) + 1e-9, "curve exceeded x bounds");
		assert.ok(point.y >= Math.min(start.y, end.y) - 1e-9 && point.y <= Math.max(start.y, end.y) + 1e-9, "curve exceeded y bounds");
	}
	for (const axis of ["x", "y"]) {
		const delta = end[axis] - start[axis];
		for (let index = 1; index < samples.length; index++) {
			const step = samples[index][axis] - samples[index - 1][axis];
			assert.ok(delta === 0 ? Math.abs(step) < 1e-9 : Math.sign(step) === Math.sign(delta), `${axis} was not monotone`);
		}
	}
}

(async function main() {
	assertCurve({ x: 235, y: 320 }, { x: 1080, y: 780 }, { x: 235, y: 780 });
	assertCurve({ x: 1080, y: 780 }, { x: 235, y: 320 }, { x: 235, y: 780 });
	assertCurve({ x: 1165, y: 320 }, { x: 320, y: 780 }, { x: 1165, y: 780 });
	assertCurve({ x: 320, y: 780 }, { x: 1165, y: 320 }, { x: 1165, y: 780 });
	assertCurve({ x: 200, y: 400 }, { x: 1200, y: 400 }, { x: 700, y: 400 });
	assertCurve({ x: 700, y: 200 }, { x: 700, y: 1000 }, { x: 700, y: 600 });
	assertCurve({ x: 500, y: 500 }, { x: 500, y: 500 }, { x: 500, y: 500 });
	assert.deepEqual(getControlPoint({ x: 1, y: 2 }, { x: 20, y: 30 }, false), { x: 20, y: 30 + arena.cardWidth });
	
	const tiqiStart = xiandingSource.indexOf("  tiqi: {");
	assert.notEqual(tiqiStart, -1, "Missing tiqi skill");
	const filterSource = extractBetween(xiandingSource, "    filter(event, player) {", "\n    },\n    frequent:", tiqiStart) + "\n    }";
	const contentSource = extractBetween(xiandingSource, "    async content(event, trigger, player) {", "\n    subSkill:", tiqiStart).replace(/,\s*$/, "");
	const tiqi = new Function(`return ({ ${filterSource}, ${contentSource} })`)();
	
	function makePhaseEvent(total, self = false, split = total === 0 ? [] : [total]) {
		const event = {};
		const target = {
			isIn() { return false; },
			getHistory(type, predicate) {
				assert.equal(type, "gain");
				return split.map(count => ({
					cards: Array.from({ length: count }),
					getParent(name) { return name === "phaseDraw" ? event : { name: "draw" }; },
				})).filter(predicate);
			},
		};
		event.player = target;
		return { event, target, player: self ? target : {}, };
	}
	
	for (const [total, expected] of [[0, true], [1, true], [2, false], [3, true], [4, true]]) {
		const { event, player } = makePhaseEvent(total);
		assert.equal(tiqi.filter(event, player), expected, `unexpected filter result for total ${total}`);
	}
	{
		const { event, player } = makePhaseEvent(2, true);
		assert.equal(tiqi.filter(event, player), false, "own draw event should be ignored");
	}
	{
		const { event } = makePhaseEvent(0);
		const drawn = [];
		await tiqi.content({}, event, { async draw(count) { drawn.push(count); } });
		assert.deepEqual(drawn, [2], "empty gain history should draw two cards without reduce error");
	}
	{
		const { event } = makePhaseEvent(3, false, [1, 2]);
		const drawn = [];
		await tiqi.content({}, event, { async draw(count) { drawn.push(count); } });
		assert.deepEqual(drawn, [1], "multiple gain events should be summed before calculating draw count");
	}
	
	console.log("card-curve-tiqi: PASS");
})().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
