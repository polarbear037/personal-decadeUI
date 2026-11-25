const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { dependencies } = require("./xinsha-prompt-engine.cjs");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const baseline = process.argv.includes("--baseline");

async function run() {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = {};
	try {
		for (const style of ["othersOff", "onlineUI", "on"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard", "xianding"], cards: ["standard", "extra"], touchscreen: false,
				extension_十周年UI_newDecadeStyle: style, extension_十周年UI_simplifySkillPrompt: true });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			if (baseline) await page.route(/\/src\/ui\/simplifiedSkillPrompt\.js$/, route => route.fulfill({ contentType: "text/javascript",
				body: fs.readFileSync(path.resolve(__dirname, "../src/ui/simplifiedSkillPrompt.js"), "utf8").replace("\tinitXinshaControlConfirmation();", ""),
			}));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async () => {
				const { game, ui, lib, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				game.pause(); game.resume = () => {}; game.resume2 = () => {};
				game.me = game.players[0]; game.me.init("sunquan"); game.me.addSkill("dcliexiang");
				game.players[1].init("guanyu");
				_status.currentPhase = game.me; _status.auto = false; _status.over = false;
				lib.config.auto_confirm = false;
				ui.arena.classList.remove("choose-character"); document.querySelector(".decade-welcome-overlay")?.remove();
				const probe = async (label, simplified = true, needsTarget = false) => {
					game.uncheck(); for (const d of [...ui.dialogs]) d.close(); for (const c of [...ui.controls]) c.close();
					lib.config.extension_十周年UI_simplifySkillPrompt = simplified;
					const event = game.me.chooseToUse({ type: "phase" });
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseToUse[0](event, null, game.me);
					ui.click.skill("dcliexiang");
					if (!event.result?.skill) ui.click.ok();
					const choose = game.me.chooseControl;
					let choice, resolveChoice;
					game.me.chooseControl = function (...args) {
						choice = choose.apply(this, args); choice.forResult = () => new Promise(resolve => { resolveChoice = resolve; }); return choice;
					};
					let pending;
					try { pending = Content.chooseToUse[2](event, null, game.me); }
					finally { game.me.chooseControl = choose; }
					choice.parent = event; _status.eventManager.setStatusEvent(choice, true);
					await Content.chooseControl[0](choice, null, game.me);
					const button = [...ui.controls].flatMap(c => [...c.children]).find(n => n.link === label);
					if (!button) throw Error("Missing option " + label);
					_status.clicked = false; ui.click.control.call(button);
					await Content.chooseControl[1](choice, null, game.me);
					resolveChoice(choice.result); await pending;
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseToUse[3](event, null, game.me, choice.result);
					const out = { chosen: choice.result.control, backup: event.skill, index: lib.skill.dcliexiang_backup.index };
					if (needsTarget) {
						event.filterTarget = lib.filter.notMe; event.selectTarget = 1;
					}
					await Content.chooseToUse[0](event, null, game.me);
					out.submitted = event.result?.skill === "dcliexiang_backup" && event.result.bool === true;
					out.waitingForSkill = event.skill;
					out.dialogs = ui.dialogs.map(d => d.textContent);
					if (out.submitted) {
						// 执行真实 backup 内容至选目标：仅截住后续摸牌/目标事件，不推进夹具牌局。
						const draw = game.me.draw, target = game.me.chooseTarget;
						let drawCount, targetRequested = false;
						game.me.draw = async count => { drawCount = count; };
						game.me.chooseTarget = () => {
							targetRequested = true;
							const waiting = { set() { return waiting; }, then() {} }; return waiting;
						};
						try {
							void lib.skill.dcliexiang_backup.content({ name: "dcliexiang_backup" }, null, game.me);
							await Promise.resolve();
						} finally { game.me.draw = draw; game.me.chooseTarget = target; }
						out.drawCount = drawCount; out.targetRequested = targetRequested;
					}
					return out;
				};
				return { five: await probe("五张"), one: await probe("一张"), cancel: await probe("cancel2"), disabled: await probe("五张", false), needsTarget: await probe("五张", true, true) };
			});
			const skip = style === "othersOff" && !baseline;
			for (const [name, count] of [["five", 5], ["one", 1]]) {
				assert.equal(result[name].submitted, skip, JSON.stringify(result[name]));
				if (skip) { assert.equal(result[name].drawCount, count); assert(result[name].targetRequested); assert.deepEqual(result[name].dialogs, []); }
			}
			assert.equal(result.cancel.submitted, false); assert.equal(result.cancel.backup, undefined);
			assert.equal(result.disabled.submitted, false); assert.equal(result.needsTarget.submitted, false);
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log(baseline ? "LIEXIANG_BASELINE_OK" : "LIEXIANG_CONFIRM_OK", style);
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, baseline ? "xinsha-liexiang-confirm-before.json" : "xinsha-liexiang-confirm-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
