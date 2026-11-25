const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const { dependencies } = require("./xinsha-prompt-engine.cjs");

(async () => {
	const baseline = process.argv.includes("--baseline");
	Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], phonelayout: true, touchscreen: false, extension_十周年UI_cardMovementDiagnostics: false });
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	const results = [];
	try {
		for (const style of ["othersOff", "onlineUI", "on"]) {
			seed.extension_十周年UI_newDecadeStyle = style;
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			console.log("POPUP_START", style);
			page.on("pageerror", error => errors.push(error.message));
			page.on("console", message => { if (message.type() === "error") console.error(message.text()); });
			page.on("dialog", dialog => { errors.push(dialog.message()); return dialog.accept(); });
			await dependencies(page);
			for (const file of ["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js"]) {
				if (/as __require/.test(fs.readFileSync(path.resolve(__dirname, "../../../node_modules/.pnpm", file), "utf8"))) await page.unroute("**/node_modules/.pnpm/" + file);
			}
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			try { await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 }); }
			catch (error) { console.error(JSON.stringify({ errors, body: await page.locator("body").innerText() })); throw error; }
			await page.locator(".loading-screen").waitFor({ state: "hidden", timeout: 15000 });
			const rows = await page.evaluate(async () => {
				const { game, ui, lib, _status } = await import("/noname.js");
				game.pause(); game.resume = () => {};
				for (const dialog of [...ui.dialogs]) dialog.close();
				ui.arena.classList.remove("choose-character");
				game.me = game.players[0]; game.me.init("caocao");
				const actor = game.players[1]; actor.init("zhugeliang");
				_status.gameStarted = true; _status.over = false;
				lib.skill.popup_probe_skill = {};
				lib.translate.popup_probe_skill = "回归扩展技能";
				lib.translate.popup_probe_skill_info = "专项回归用技能";
				const calls = [], records = [], broadcasts = [];
				// 只替换绘制出口，保留本体 trySkillAnimate、popup 和扩展注册的动画回调。
				decadeUI.animation.playSpine = (...args) => { calls.push(args); };
				game.addVideo = (...args) => records.push(args);
				game.broadcast = (...args) => broadcasts.push(args);
				const run = async (label, invoke) => {
					ui.arena.querySelectorAll(".damage.skill-popup").forEach(node => node.remove());
					calls.length = records.length = broadcasts.length = 0;
					invoke();
					const activity = { effects: calls.length, records: records.map(args => args[0]), broadcasts: broadcasts.length };
					await new Promise(resolve => setTimeout(resolve, 450));
					const nodes = [...ui.arena.querySelectorAll(".damage.skill-popup")];
					return { label, texts: nodes.map(node => node.textContent), visible: nodes.every(node => {
						const css = getComputedStyle(node), span = node.firstElementChild;
						return css.display !== "none" && +css.opacity > 0 && span && +getComputedStyle(span).opacity > 0;
					}), ...activity };
				};
				const rows = [];
				for (const optimize of [false, true]) {
					lib.config.extension_十周年UI_optimizePrompt = optimize;
					for (const target of [actor, game.me]) {
						for (const [label, skill, popname] of [["spine", "bazhen_bagua", "bazhen"], ["equipment", "bagua_skill", "bagua_skill"], ["extension", "popup_probe_skill", "popup_probe_skill"], ["ordinary", "jianxiong", "jianxiong"]]) {
							rows.push({ optimize, self: target === game.me, ...await run(label, () => target.trySkillAnimate(skill, popname)) });
						}
					}
				}
				rows.push(await run("system", () => actor.popup("判定生效", "wood", false)));
				// 模拟联机接收的本地播放入口：没有再次调用 trySkillAnimate 或广播弹字。
				rows.push(await run("received", () => lib.animate.skill.bazhen_bagua.call(actor, "bazhen_bagua", "bazhen")));
				// delete() 另有本体退场延时，连同1.5秒弹字生命周期一起观察。
				await new Promise(resolve => setTimeout(resolve, 1800));
				rows.push({ label: "cleanup", remaining: ui.arena.querySelectorAll(".damage.skill-popup").length });
				return rows;
			});
			results.push({ style, rows, errors });
			fs.writeFileSync(path.join(__dirname, `skill-trigger-popup-${baseline ? "before" : "results"}.json`), JSON.stringify(results, null, 2));
			assert.deepEqual(errors, []);
			for (const row of rows) {
				if (row.label === "cleanup") { assert.equal(row.remaining, 0); continue; }
				if (row.label === "system") { assert.deepEqual(row.texts, []); continue; }
				const missing = baseline && ["spine", "equipment", "extension", "received"].includes(row.label);
				const text = { spine: "八阵", equipment: "八卦阵", extension: "回归扩展技能", ordinary: "奸雄", received: "八阵" }[row.label];
				assert.deepEqual(row.texts, missing ? [] : [text], JSON.stringify({ style, row }));
				assert(row.visible);
				const animated = ["spine", "equipment", "received"].includes(row.label);
				assert.equal(row.effects, animated ? 1 : 0);
				assert.equal(row.broadcasts, row.label === "received" ? 0 : 1);
				assert.equal(row.records.length, missing && animated ? 0 : 1);
			}
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, `skill-trigger-popup-${baseline ? "before" : "results"}.json`), JSON.stringify(results, null, 2));
		console.log(baseline ? "SKILL_TRIGGER_POPUP_REPRODUCED" : "SKILL_TRIGGER_POPUP_OK", JSON.stringify({ styles: results.map(row => row.style), cases: results.reduce((sum, row) => sum + row.rows.length, 0) }));
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
