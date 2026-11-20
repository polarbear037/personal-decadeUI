const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { dependencies } = require("./xinsha-prompt-engine.cjs");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");

async function run() {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = {};
	try {
		for (const style of ["othersOff", "onlineUI"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard", "sp2"], cards: ["standard"], touchscreen: false, extension_十周年UI_newDecadeStyle: style, extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : "online" });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async () => {
				const { game, ui, lib, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { buildXinshaPrompt } = await import("/extension/十周年UI/src/ui/xinshaPrompt.js");
				game.pause(); game.resume = () => {};
				game.me = game.players[0]; game.me.init("sunquan");
				game.players[1].init("guanyu");
				ui.arena.classList.remove("choose-character");
				document.querySelector(".decade-welcome-overlay")?.remove();
				_status.auto = false; _status.over = false;
				const cases = [];
				for (const missingHp of [1, 2, 3]) {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					for (const control of [...ui.controls]) control.close();
					prompts.clearOptimizedPrompts();
					game.me.maxHp = 4; game.me.hp = 4 - missingHp;
					const trigger = game.createEvent("damage", false); Object.assign(trigger, { player: game.players[1], source: game.me, num: 1 });
					const cost = game.createEvent("spjiedao_cost", false); Object.assign(cost, { skill: "spjiedao", player: game.me, _trigger: trigger });
					_status.eventManager.setStatusEvent(cost, true);
					let choice;
					const original = game.me.chooseControl;
					game.me.chooseControl = function (...args) { choice = original.apply(this, args); choice.forResult = () => new Promise(() => {}); return choice; };
					try { lib.skill.spjiedao.cost(cost, trigger, game.me); }
					finally { game.me.chooseControl = original; }
					if (!choice) throw new Error("spjiedao cost did not create chooseControl");
					choice.parent = cost;
					_status.eventManager.setStatusEvent(choice, true);
					await Content.chooseControl[0](choice, null, game.me);
					prompts.refreshOptimizedPrompt();
					const tip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
					const main = tip?.querySelector(".decade-official-main")?.textContent;
					const custom = buildXinshaPrompt(choice, "截刀：只能选择指定的数值", "spjiedao", "必须保留的条件");
					cases.push({ missingHp, main, field: tip?.dataset.officialPromptField, controls: choice.controls.slice(), links: [...ui.control.querySelectorAll(".control>div")].map(node => node.link).filter(link => choice.controls.includes(link)), custom, damageUnchanged: trigger.num === 1, resultUnchanged: !cost.result });
				}
				return cases;
			});
			for (const value of result) {
				assert.deepEqual(value.controls, ["一", "二", "三"].slice(0, value.missingHp).concat("cancel2"));
				assert.deepEqual([...value.links].sort(), [...value.controls].sort());
				assert.equal(value.custom.main, "截刀：只能选择指定的数值");
				assert.equal(value.custom.detail, "必须保留的条件");
				assert.ok(value.damageUnchanged && value.resultUnchanged);
				if (style === "othersOff") { assert.equal(value.main, "发动“截刀”，请选择增加的伤害值"); assert.equal(value.field, "ActiveTip"); }
				else assert.match(value.main, /是否对.*发动【截刀】/);
			}
			assert.deepEqual(errors, []);
			results[style] = { cases: result, errors };
			console.log("JIEDAO_PROMPT_OK", style, JSON.stringify({ prompts: result.map(value => value.main), controls: result.map(value => value.controls), errors }));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "xinsha-jiedao-prompt-results.json"), JSON.stringify(results, null, 2));
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
