// 仅验证实际状态生成函数；不替代真实按钮、共享 Worker 和实机绘制验收。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const baseline = process.argv.includes("--baseline");
const source = baseline
	? execFileSync("git", ["show", "HEAD:ui/skill/skins/xinsha.js"], { cwd: root, encoding: "utf8" })
	: fs.readFileSync(path.join(root, "ui/skill/skins/xinsha.js"), "utf8");
const start = source.indexOf("const watchedSkillEvents =");
const end = source.indexOf("\n\tconst markOfficialSkills =", start);
assert(start >= 0 && end > start, "state function boundaries missing");
const node = id => {
	const classes = new Set();
	return { dataset: { id }, classList: {
		contains: name => classes.has(name),
		add: name => classes.add(name),
		remove: name => classes.delete(name),
		toggle(name, value) { if (value) classes.add(name); else classes.delete(name); },
	} };
};
const active = node("mixed"), passive = node("passive"), global = node("globalActive");
const control = nodes => ({ isConnected: true, querySelectorAll: () => nodes });
const me = {}, remote = {};
const lib = { config: { extension_十周年UI_newDecadeStyle: "othersOff" }, skill: {
	mixed: { enable: "phaseUse" }, mixed_draw: { sourceSkill: "mixed" },
	passive: { trigger: { player: "damageEnd" } }, globalActive: { enable: "chooseToUse" },
} };
const ui = { skillControl: control([active, passive]), gskillControl: control([global]) };
const status = { imchoosing: true, auto: false, over: false };
const context = vm.createContext({
	lib, game: { me }, ui, get: { info: id => lib.skill[id], sourceSkillFor: id => lib.skill[id]?.sourceSkill }, _status: status,
});
const sync = vm.runInContext(`${source.slice(start, end)}; syncSkillEffects;`, context);
ui.skillControlArea = { querySelector: selector => ({ link: selector.match(/"(.*?)"/)[1] }) };
context.app = { mockTouch(item) {
	status.event.skill = item.link;
	// 本体点击会在 backup 后同步 uncheck/check，不得因此丢失本次点击。
	status.imchoosing = false; sync(); status.imchoosing = true; sync();
} };
const baseSource = fs.readFileSync(path.join(root, "ui/skill/skins/base.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
context.base = vm.runInContext(`${baseSource}; createBaseSkillPlugin(lib, game, ui, get, {}, _status, app);`, context);
const clickStart = source.indexOf("\t\tclickSkill(...args)");
const clickEnd = source.indexOf("\n\t\tprecontent()", clickStart);
const click = clickStart >= 0 ? vm.runInContext(`({${source.slice(clickStart, clickEnd)}}).clickSkill`, context) : context.base.clickSkill;
let refreshBeauty = () => {};
if (process.argv.includes("--with-beautifier") || process.argv.includes("--proposed")) {
	const filename = process.argv.includes("--proposed") ? path.join(root, ".codex-tmp/skill-button-effects-proposed.js") : path.resolve(root, "../雷的一将/utils/skillButtonEffects.js");
	const beautySource = fs.readFileSync(filename, "utf8").replace(/^import .*;\r?\n/gm, "").replaceAll("export function", "function");
	const beauty = vm.runInNewContext(`${beautySource}; installSkillButtonEffects();`, {
		lib, game: { me }, ui, get: context.get, _status: status, getConfig: () => true,
		createButtonSpineEffects: ({ enabled }) => ({ refresh() { enabled(); }, dispose() {} }),
	});
	refreshBeauty = () => beauty.refresh();
}
const phase = { name: "phaseUse", player: me, parent: { name: "game", finished: true } };
const event = (name, props = {}) => ({ name, player: me, parent: phase, ...props });
const results = [];
function check(name, current, options = {}, expected = []) {
	const { manual, ...stateOptions } = options;
	Object.assign(status, { event: current, imchoosing: true, auto: false, over: false }, stateOptions);
	for (const n of [active, passive, global]) n.classList.toggle("select", current.skill === n.dataset.id);
	if (manual) {
		const button = [active, global].find(n => n.dataset.id === current.skill);
		button.classList.add("usable"); click.call(button);
	}
	sync();
	refreshBeauty();
	const actual = [active, passive, global].filter(n => n.dataset.skillButtonEffect).map(n => [n.dataset.id, n.dataset.skillButtonEffect]);
	assert.deepEqual(actual, expected, name);
	assert.equal(active.classList.contains("yjcm-skill-resolving"), actual.some(([id]) => id === "mixed"), name);
	results.push(name);
}
const chosen = [["mixed", "active"]];
check("manual chooseToUse", event("chooseToUse", { skill: "mixed" }), { manual: true }, chosen);
check("available but unselected", event("chooseToUse"));
check("manual chooseToRespond", event("chooseToRespond", { skill: "mixed" }), { manual: true }, chosen);
check("same chooseToUse skill without click", event("chooseToUse", { skill: "mixed" }));
check("same chooseToRespond skill without click", event("chooseToRespond", { skill: "mixed" }));
check("passive child event name", event("mixed_draw"), { imchoosing: false });
check("passive child skill", event("trigger", { skill: "mixed_draw" }), { imchoosing: false });
check("passive main skill ID", event("trigger", { skill: "mixed" }), { imchoosing: false });
check("passive sourceSkill", event("trigger", { sourceSkill: "mixed" }), { imchoosing: false });
const child = event("mixed_draw");
check("passive chooseTarget", event("chooseTarget", { parent: child }));
check("passive chooseCard with main ID", event("chooseCard", { parent: child, skill: "mixed" }));
check("pure useSkill settlement", event("useSkill", { skill: "mixed" }), { imchoosing: false });
check("choose event without imchoosing", event("chooseToUse", { skill: "mixed" }), { imchoosing: false });
for (const flag of ["finished", "cancelled", "_cancelled", "_finished"]) {
	check(flag, event("chooseToUse", { skill: "mixed", [flag]: true }));
}
check("finished ancestor", event("chooseToUse", { skill: "mixed", parent: { ...phase, finished: true } }));
check("auto control", event("chooseToUse", { skill: "mixed" }), { auto: true });
check("remote owner", event("chooseToUse", { skill: "mixed", player: remote }));
check("game over", event("chooseToUse", { skill: "mixed" }), { over: true });
const backup = event("chooseToUse", { skill: "mixed", result: { bool: true, skill: "mixed" }, _backup: {} });
check("backup continues with old result", backup, { manual: true }, chosen);
check("backup selects targets", backup, {}, chosen);
check("global active selected", event("chooseToUse", { skill: "globalActive" }), { manual: true }, [["globalActive", "active"]]);
const passiveEvent = event("trigger", { skill: "passive" });
check("passive question retained", event("chooseBool", { parent: passiveEvent }), {}, [["passive", "passive"]]);
check("passive settlement off", passiveEvent, { imchoosing: false });
for (const style of ["onlineUI", "on", "off", "babysha", "codename"]) {
	lib.config.extension_十周年UI_newDecadeStyle = style;
	check(`style isolation ${style}`, event("chooseToUse", { skill: "mixed" }));
}
lib.config.extension_十周年UI_newDecadeStyle = "othersOff";
check("repeat selection", event("chooseToUse", { skill: "mixed" }), { manual: true }, chosen);
check("cancel selection clears", event("chooseToUse"));
const complete = event("chooseToUse", { skill: "mixed", then(onDone) { this.onDone = onDone; } });
check("completion listener selection", complete, { manual: true }, chosen);
complete.finished = true; complete.onDone();
assert.equal(active.dataset.skillButtonEffect, "");
results.push("completion listener clears");
console.log("ACTIVE_SKILL_BUTTON_STATE_OK", JSON.stringify({ baseline, count: results.length, cases: results }));
