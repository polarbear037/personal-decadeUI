import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const filename = new URL("../src/overrides/faction-character-init.js", import.meta.url);
const source = (await fs.readFile(filename, "utf8"))
	.replace(/^import .*;\r?\n/gm, "")
	.replace(/export \{[^}]+\};?\s*$/gm, "");

function createHarness(style = "onlineUI", mode = "identity") {
	const calls = { nativeFirst: 0, nativeSecond: 0, chooseButton: [] };
	const lib = {
		config: { extension_十周年UI_newDecadeStyle: style, mode },
		group: ["wei", "shu", "wu", "qun", "jin"],
		element: { content: { chooseControl: [
			async function nativeFirst(event) { calls.nativeFirst++; event.result = { control: event.controls[0] }; },
			async function nativeSecond() { calls.nativeSecond++; },
		] } },
	};
	const context = vm.createContext({
		lib, get: { links: values => values.map(value => `link:${value}`) },
		game: {}, _status: {},
		wrapAround() { return () => {}; },
	});
	vm.runInContext(`${source}\nglobalThis.installFactionControl = applyFactionControlChoice;`, context);
	const originalFirst = lib.element.content.chooseControl[0];
	const restores = context.installFactionControl();
	function makePlayer(result) {
		return {
			chooseButton(...args) {
				calls.chooseButton.push({ args });
				const choice = {
					set(name, value) { calls.chooseButton.at(-1)[name] = value; return this; },
					async forResult() { return result; },
				};
				return choice;
			},
		};
	}
	return { lib, calls, restores, makePlayer, installFactionControl: context.installFactionControl, originalFirst };
}

function makeEvent({ controls = ["wei", "shu", "cancel2"], prompt = "", parent = null, mine = true, extra = {} } = {}) {
	return {
		controls: [...controls], prompt,
		parent,
		getParent() { return this.parent; },
		isMine() { return mine; },
		finishCount: 0,
		finish() { this.finishCount++; },
		...extra,
	};
}

{
	const harness = createHarness("onlineUI", "doudizhu");
	const parent = { name: "_shengroup_choice" };
	const event = makeEvent({ parent });
	const player = harness.makePlayer({ bool: true, links: [["", "", "group_shu"]] });
	await harness.lib.element.content.chooseControl[0](event, {}, player);
	assert.equal(harness.calls.chooseButton.length, 1, "斗地主_shengroup_choice转为图片式chooseButton");
	assert.equal(JSON.stringify(harness.calls.chooseButton[0].args[0][1][0].map(link => link[2])), JSON.stringify(["group_wei", "group_shu"]));
	assert.equal(harness.calls.chooseButton[0].args[1], false, "允许cancel2时不强制选取");
	assert.equal(harness.calls.chooseButton[0].direct, true);
	assert.equal(event.result.control, "shu");
	assert.equal(event.result.index, 1);
	assert.equal(JSON.stringify(event.result.links), JSON.stringify([]));
	assert.equal(event.finishCount, 1, "自定义第0步完成后跳过原生第1步");
	assert.equal(harness.calls.nativeFirst, 0);
	assert.equal(harness.calls.nativeSecond, 0);
}

{
	const harness = createHarness();
	const event = makeEvent({ prompt: "请决定神武将的所属势力（本局内不可更改）", controls: ["wei", "shu"] });
	await harness.lib.element.content.chooseControl[0](event, {}, harness.makePlayer({ bool: true, links: [["", "", "group_wei"]] }));
	assert.equal(harness.calls.chooseButton.length, 1, "明确提示词可识别无特定父技能事件");
	assert.equal(harness.calls.chooseButton[0].args[1], true, "无取消项时使用强制选择");
	assert.equal(event.result.control, "wei");
}

{
	const harness = createHarness("onlineUI", "doudizhu");
	const event = makeEvent({ prompt: "请选择神武将的势力", controls: ["wei", "shu"] });
	await harness.lib.element.content.chooseControl[0](event, {}, harness.makePlayer({ bool: true, links: [["", "", "group_wei"]] }));
	assert.equal(harness.calls.chooseButton.length, 1, "斗地主明确提示词也能识别势力选择");
	assert.equal(event.result.control, "wei");
}

{
	const harness = createHarness();
	const event = makeEvent({ parent: { skill: "_doublegroup_choice" }, controls: ["wei", "cancel2"] });
	await harness.lib.element.content.chooseControl[0](event, {}, harness.makePlayer({ bool: false, links: [] }));
	assert.equal(event.result.control, "cancel2", "取消映射为cancel2");
	assert.equal(event.result.bool, false);
	assert.equal(event.result.index, 1);
}

for (const style of ["othersOff"]) {
	for (const result of [{ bool: true, links: [["", "", "group_shu"]] }, { bool: false, links: [] }]) {
		const harness = createHarness(style, "doudizhu");
		const event = makeEvent({ parent: { name: "_shengroup_choice" } });
		await harness.lib.element.content.chooseControl[0](event, {}, harness.makePlayer(result));
		assert.equal(harness.calls.chooseButton.length, 1, "一将成名接入势力选择");
		assert.equal(event.result.control, result.bool ? "shu" : "cancel2");
		assert.equal(event.result.index, result.bool ? 1 : 2);
		assert.equal(event.finishCount, 1);
	}
}

for (const testCase of [
	{ name: "非onlineUI样式", style: "on", parent: { skill: "_shengroup_choice" } },
	{ name: "AI或联机来源", style: "onlineUI", mine: false, parent: { skill: "_shengroup_choice" } },
	{ name: "普通技能势力控件", style: "onlineUI", parent: { skill: "some_other_skill" } },
	{ name: "非势力控件", style: "onlineUI", parent: { skill: "_shengroup_choice" }, controls: ["yes", "no"] },
	{ name: "choiceList事件", style: "onlineUI", parent: { skill: "_shengroup_choice" }, extra: { choiceList: ["甲", "乙"] } },
	{ name: "sortcard事件", style: "onlineUI", parent: { skill: "_shengroup_choice" }, extra: { sortcard: [{}] } },
	{ name: "一将AI或联机来源", style: "othersOff", mine: false, parent: { skill: "_shengroup_choice" } },
	{ name: "一将普通技能势力控件", style: "othersOff", parent: { skill: "some_other_skill" } },
]) {
	const harness = createHarness(testCase.style, testCase.mode || "identity");
	const event = makeEvent(testCase);
	await harness.lib.element.content.chooseControl[0](event, {}, harness.makePlayer({ bool: true, links: [["", "", "group_wei"]] }));
	assert.equal(harness.calls.chooseButton.length, 0, `${testCase.name}保留原生chooseControl`);
	assert.equal(harness.calls.nativeFirst, 1);
}

{
	const harness = createHarness();
	const installedFirst = harness.lib.element.content.chooseControl[0];
	const secondRestore = harness.installFactionControl();
	assert.equal(typeof installedFirst, "function");
	assert.equal(secondRestore.length, 0, "重复安装为幂等空操作");
	const event = makeEvent({ prompt: "请选择神武将的势力" });
	await installedFirst(event, {}, harness.makePlayer({ bool: true, links: [["", "", "group_wei"]] }));
	assert.equal(harness.calls.chooseButton.length, 1, "重复安装不会套叠处理器");
	harness.restores.forEach(restore => restore());
	assert.equal(harness.lib.element.content.chooseControl[0], harness.originalFirst, "restore还原原生第0步");
}

console.log("FACTION_CONTROL_CHOICE_OK");
