const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const { dependencies } = require("./xinsha-prompt-engine.cjs");

async function run() {
	const baseline = process.argv.includes("--baseline");
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	const results = {};
	try {
		for (const style of baseline ? ["othersOff"] : ["othersOff", "onlineUI"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_newDecadeStyle: style, extension_十周年UI_loadingStyle: style === "othersOff" ? "dialog_xinsha" : "off", extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : "online", extension_十周年UI_jindutiaoYangshi: "4" });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			await page.evaluate(async () => {
				const { game, ui, lib, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { config } = await import("/extension/十周年UI/src/config/index.js");
				Object.assign(window, { game, ui, lib, get, _status, Content, prompts });
				game.pause(); game.resume = () => {};
				document.querySelector(".decade-welcome-overlay")?.remove();
				ui.arena.classList.remove("choose-character");
				game.me = game.players[0]; game.me.init("sunquan"); game.players[1].init("guanyu");
				_status.currentPhase = game.me; _status.auto = false; _status.over = false;
				lib.config.auto_confirm = false;
				// 使用设置项的真实保存入口验证，不直接写 CSS 变量来代替设置流程。
				window.setPromptHeight = async value => {
					const input = document.createElement("input"); input.value = String(value);
					config.handTipHeight.onblur.call(input);
					await new Promise(requestAnimationFrame);
					return { value: lib.config.extension_十周年UI_handTipHeight, ...readVirtual() };
				};
				const phase = game.createEvent("phaseUse", false); phase.player = game.me;
				window.openVirtual = async (prompt2, prompt = "请选择一名角色") => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					for (const control of [...ui.controls]) control.close();
					prompts.clearOptimizedPrompts();
					const event = game.me.chooseTarget({ prompt, prompt2, selectTarget: [1, 1], _get_card: new lib.element.VCard({ name: "sha" }), filterTarget: (card, player, target) => target !== player });
					event.parent = phase;
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseTarget[0](event, null, game.me);
					await document.fonts.ready;
				};
				window.readVirtual = () => {
					const tip = document.querySelector(".decade-optimized-hand-tip:not(.hidden)");
					const controls = document.getElementById("dui-controls");
					return { main: tip?.querySelector(".decade-official-main")?.textContent, detail: tip?.querySelector(".decade-official-detail")?.textContent || "", tip: tip?.getBoundingClientRect().toJSON(), controls: controls?.getBoundingClientRect().toJSON(), position: tip && getComputedStyle(tip).position, empty: _status.event.dialog?.dataset.decadeOptimizedEmpty, className: _status.event.dialog?.className, layout: _status.event.dialog?.classList.contains("dialog-xinsha-prompt-layout"), field: tip?.dataset.officialPromptField };
				};
				await setPromptHeight(20);
			});
			await page.evaluate(() => openVirtual("视为使用一张【杀】"));
			const exact = await page.evaluate(async () => {
				const frames = [];
				for (let i = 0; i < 40; i++) { await new Promise(requestAnimationFrame); frames.push(readVirtual()); }
				return frames;
			});
			await page.screenshot({ path: path.join(__dirname, `xinsha-virtual-prompt-${baseline ? "before" : style}.png`) });
			await page.evaluate(() => openVirtual("视为使用一张【杀】（无距离限制）", "请选择距离为1的角色"));
			const custom = await page.evaluate(async () => { await new Promise(resolve => setTimeout(resolve, 700)); return readVirtual(); });
			const heightSamples = await page.evaluate(async () => {
				const values = [];
				for (const height of [0, 5, 10, 15, 20, 30, 40]) values.push(await setPromptHeight(height));
				return values;
			});
			const raised = heightSamples.at(-1);
			await page.setViewportSize({ width: 1280, height: 720 });
			const resized = await page.evaluate(async () => { await new Promise(resolve => setTimeout(resolve, 150)); return setPromptHeight(0); });
			if (!baseline && style === "othersOff") {
				assert.ok(exact.every(frame => frame.main === "选择1名目标角色" && frame.detail === ""));
				assert.ok(exact.every(frame => frame.tip.bottom <= frame.controls.top - 1), "视为使用提示遮挡按钮");
				assert.equal(custom.main, "请选择距离为1的角色");
				assert.equal(custom.detail, "视为使用一张【杀】（无距离限制）");
				assert.ok(custom.tip.bottom <= custom.controls.top - 1, "自定义双行提示遮挡按钮");
				assert.ok(raised.tip.bottom < custom.tip.bottom - 50, "上调提示高度失效");
				for (let i = 1; i < heightSamples.length; i++) assert.ok(heightSamples[i - 1].tip.bottom > heightSamples[i].tip.bottom + 1, "提示高度被钳制，低值设置未生效");
				assert.deepEqual(heightSamples.map(sample => sample.value), [0, 5, 10, 15, 20, 30, 40]);
				assert.equal(resized.value, 0);
			} else if (!baseline) {
				assert.ok(exact.every(frame => frame.main === "请选择一名角色" && frame.detail === "视为使用一张【杀】"), "Online 文案路径被改变");
				assert.equal(custom.detail, "视为使用一张【杀】（无距离限制）");
			}
			assert.deepEqual(errors, []);
			results[style] = { exact, custom, heightSamples, raised, resized, errors };
			console.log("VIRTUAL_PROMPT", baseline ? "BASELINE" : style, JSON.stringify({ first: exact[0], last: exact.at(-1), custom }));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, `xinsha-virtual-prompt-${baseline ? "before" : "results"}.json`), JSON.stringify(results, null, 2));
	} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
