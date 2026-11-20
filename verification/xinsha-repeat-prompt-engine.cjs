const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { dependencies } = require("./xinsha-prompt-engine.cjs");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const baseline = process.argv.includes("--baseline");

async function run() {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = {};
	try {
		for (const style of ["othersOff", "onlineUI"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard", "xianding"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_newDecadeStyle: style, extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : "online" });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			if (baseline) await page.route(/\/src\/ui\/xinshaPrompt\.js/, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(__dirname, "../.codex-tmp/repeat-prompt/xinshaPrompt.before.js"), "utf8") }));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async () => {
				const { game, lib, ui, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				game.pause(); game.resume = () => {};
				game.me = game.players[0]; game.me.init("sunquan"); game.players[1].init("guanyu");
				_status.currentPhase = game.me; _status.auto = false; _status.over = false;
				lib.config.auto_confirm = false;
				ui.arena.classList.remove("choose-character");
				document.querySelector(".decade-welcome-overlay")?.remove();
				const clear = () => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					for (const control of [...ui.controls]) control.close();
					prompts.clearOptimizedPrompts();
				};
				const read = choice => {
					const tip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
					return { name: choice.name, native: choice.prompt, nativeDetail: choice.prompt2 || "", main: tip?.querySelector(".decade-official-main")?.textContent, detail: tip?.querySelector(".decade-official-detail")?.textContent || "", cardNature: choice.getParent().card.nature || "", addCount: choice.getParent().addCount, filterUnchanged: choice.filterTarget === choice._probeFilter };
				};
				const runChoice = async (card, repeat = true, extra = "", custom = "") => {
					clear();
					const phase = game.createEvent("phaseUse", false); phase.player = game.me;
					const parent = game.createEvent(repeat ? "dcchanjuan" : "probeUse", false); Object.assign(parent, { player: game.me, parent: phase });
					_status.eventManager.setStatusEvent(parent, true);
					let use;
					const originalUse = game.me.chooseUseTarget;
					game.me.chooseUseTarget = function (...args) { use = originalUse.apply(this, args); use.forResult = () => new Promise(() => {}); return use; };
					try {
						if (repeat) lib.skill.dcchanjuan.content(parent, { card, targets: [game.players[1]] }, game.me);
						else game.me.chooseUseTarget({ card, addCount: false });
					} finally { game.me.chooseUseTarget = originalUse; }
					if (!use) throw new Error("Missing native chooseUseTarget");
					use.parent = parent;
					if (extra) use.prompt2 += extra;
					if (custom) use.prompt2 = custom;
					_status.eventManager.setStatusEvent(use, true);
					let choice;
					const originals = { chooseTarget: game.me.chooseTarget, chooseBool: game.me.chooseBool };
					for (const name of Object.keys(originals)) game.me[name] = function (...args) { choice = originals[name].apply(this, args); choice.forResult = () => new Promise(() => {}); return choice; };
					try { Content.chooseUseTarget[0](use, null, game.me); }
					finally { Object.assign(game.me, originals); }
					if (!choice) throw new Error("Missing native target/bool choice");
					choice.parent = use; choice._probeFilter = choice.filterTarget;
					_status.eventManager.setStatusEvent(choice, true);
					if (Array.isArray(Content[choice.name])) await Content[choice.name][0](choice, null, game.me);
					else {
						const originalPause = game.pause;
						game.pause = () => new Promise(() => {});
						try { Content[choice.name](choice, null, game.me); }
						finally { game.pause = originalPause; }
					}
					prompts.refreshOptimizedPrompt();
					return read(choice);
				};
				return {
					thunder: await runChoice({ name: "sha", nature: "thunder", isCard: true }),
					fire: await runChoice({ name: "sha", nature: "fire", isCard: true }),
					plain: await runChoice({ name: "sha", isCard: true }),
					extra: await runChoice({ name: "sha", nature: "thunder", isCard: true }, true, "（不计次数，且只能选择距离为1的角色）"),
					custom: await runChoice({ name: "sha", nature: "thunder", isCard: true }, true, "", "额外条件：只能使用这一张雷杀【♠7】"),
					defaultBool: await runChoice({ name: "wuzhong", isCard: true }, false),
					repeatBool: await runChoice({ name: "wuzhong", isCard: true }),
				};
			});
			if (!baseline && style === "othersOff") {
				assert.equal(result.thunder.detail, "视为再使用一张【雷杀】");
				assert.equal(result.fire.detail, "视为再使用一张【火杀】");
				assert.equal(result.plain.detail, "视为再使用一张【杀】");
				assert.equal(result.extra.detail, "视为再使用一张【雷杀】（不计次数，且只能选择距离为1的角色）");
				assert.equal(result.custom.detail, "额外条件：只能使用这一张雷杀【♠7】");
				assert.equal(result.defaultBool.name, "chooseBool");
				assert.equal(result.defaultBool.main, "是否对孙权使用【无中生有】？");
				assert.equal(result.repeatBool.detail, "视为再使用一张【无中生有】");
				for (const key of ["thunder", "fire", "plain", "extra", "custom", "repeatBool"]) assert.match(result[key].main, /婵娟/);
			}
			if (style === "onlineUI") for (const key of ["thunder", "fire", "plain", "extra", "custom", "repeatBool"]) assert.equal(result[key].detail, result[key].nativeDetail);
			for (const value of Object.values(result)) { assert.equal(value.addCount, false); assert.ok(value.filterUnchanged); }
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log("REPEAT_PROMPT_OK", baseline ? "before" : style, JSON.stringify({ thunder: result.thunder, defaultBool: result.defaultBool, errors }));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, `xinsha-repeat-prompt-${baseline ? "before" : "results"}.json`), JSON.stringify(results, null, 2));
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
