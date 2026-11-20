const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_optimizePrompt: false });

async function dependencies(page) {
	for (const [request, bundle, name] of [
		["crypto-js@4.2.0/node_modules/crypto-js/index.js", "crypto-js@4.2.0/node_modules/crypto-js/crypto-js.js", "CryptoJS"],
		["jszip@2.7.0/node_modules/jszip/lib/index.js", "jszip@2.7.0/node_modules/jszip/dist/jszip.js", "JSZip"],
		["nosleep.js@0.12.0/node_modules/nosleep.js/src/index.js", "nosleep.js@0.12.0/node_modules/nosleep.js/dist/NoSleep.js", "NoSleep"],
		["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core"],
		["stackframe@1.3.4/node_modules/stackframe/stackframe.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "StackFrame"],
		["error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "ErrorStackParser"],
		["stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "StackTraceGPS"],
	]) {
		const source = fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", bundle), "utf8").replaceAll("}(this,", "}(globalThis,").replaceAll(")(this,", ")(globalThis,");
		const prefix = ["ErrorStackParser", "StackTraceGPS"].includes(name) ? 'import "/_virtual/stackframe.js";\n' : "";
		await page.route("**/node_modules/.pnpm/" + request, route => route.fulfill({ contentType: "text/javascript", body: prefix + source + `\nexport function __require(){return globalThis.${name};}` }));
	}
	for (const [pattern, file] of [["**/pinyin-pro/dist/index.js", "pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.mjs"], ["**/dedent/dist/dedent.js", "dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"]]) {
		await page.route(pattern, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", file), "utf8") }));
	}
}

async function run() {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	const results = {};
	try {
		for (const style of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"]) {
			console.log("START_STYLE", style);
			seed.extension_十周年UI_newDecadeStyle = style;
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			console.log("READY_STYLE", style);
			const result = await page.evaluate(async () => {
				const { game, ui, lib, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { config } = await import("/extension/十周年UI/src/config/index.js");
				game.pause();
				// 仅隔离夹具原有的选将事件循环；选择检查、点击、结果及取消均执行真实本体。
				let resumes = 0;
				game.resume = () => { resumes++; };
				for (const dialog of [...ui.dialogs]) dialog.close();
				for (const control of [...ui.controls]) control.close();
				document.querySelector(".decade-welcome-overlay")?.remove();
				ui.arena.classList.remove("choose-character");
				game.me = game.players[0];
				game.me.init("sunquan");
				game.players[1].init("guanyu");
				_status.currentPhase = game.me;
				_status.auto = false;
				_status.over = false;
				lib.config.auto_confirm = false;
				lib.config.extension_十周年UI_optimizePrompt = false;
				delete lib.config.extension_十周年UI_simplifySkillPrompt;
				const phase = game.createEvent("phaseUse", false); phase.player = game.me;
				const material = game.createCard("shan", "heart", 2);
				game.me.directgain([material]);
				const read = event => {
					const tip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
					return { skill: event.skill, result: event.result, resumes, dialog: !!event.skillDialog?.content, text: tip?.textContent || "", selected: ui.selected.cards.length, targets: ui.selected.targets.length, selectableCard: material.classList.contains("selectable"), confirm: ui.confirm?.textContent || "" };
				};
				const begin = async () => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					prompts.clearOptimizedPrompts();
					_status.clicked = false;
					const event = game.me.chooseToUse({ type: "phase" }); event.parent = phase;
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseToUse[0](event, null, game.me);
					return { event };
				};
				const out = { setting: { name: config.simplifySkillPrompt.name, init: config.simplifySkillPrompt.init } };
				let { event } = await begin();
				ui.click.skill("zhiheng"); out.zhiheng = read(event);
				_status.clicked = false; ui.click.card.call(material); out.zhihengSelected = read(event);
				ui.click.cancel(); out.cancelled = read(event);
				({ event } = await begin()); ui.click.skill("kurou"); out.kurou = read(event);
				lib.skill.simplify_direct_test = { enable: "phaseUse", content() {} };
				lib.translate.simplify_direct_test = "直接发动";
				({ event } = await begin()); ui.click.skill("simplify_direct_test"); out.direct = read(event);
				({ event } = await begin()); ui.click.skill("rende"); out.rende = read(event);
				_status.clicked = false; ui.click.card.call(material);
				const target = game.players.find(player => player !== game.me && player.classList.contains("selectable"));
				if (!target) throw new Error("No selectable target for rende");
				_status.clicked = false; ui.click.target.call(target); out.rendeSelected = read(event);
				ui.click.ok(); out.rendeConfirmed = read(event);
				lib.skill.simplify_optional_test = { enable: "phaseUse", filterCard: true, selectCard: [0, 2], content() {} };
				lib.translate.simplify_optional_test = "可选测试";
				({ event } = await begin()); ui.click.skill("simplify_optional_test"); out.optional = read(event);
				lib.skill.simplify_manual_test = { enable: "phaseUse", manualConfirm: true, content() {} };
				lib.translate.simplify_manual_test = "确认测试";
				({ event } = await begin()); ui.click.skill("simplify_manual_test"); out.manual = read(event);
				lib.skill.simplify_prompt_test = { enable: "phaseUse", filterTarget: true, prompt(event, player) { return `请选择一名角色，记录当前${player.hp}点体力`; }, content() {} };
				lib.translate.simplify_prompt_test = "提示测试";
				({ event } = await begin()); ui.click.skill("simplify_prompt_test"); out.customPrompt = read(event);
				// 技能的牌名/选项窗口继续使用真实 chooseButton，按钮不能随说明文字隐藏。
				game.uncheck();
				const dialog = ui.create.dialog("请选择牌名", [["杀", "闪"], "textbutton"]);
				event = game.me.chooseButton(dialog).set("sourceSkill", "zhiheng"); event.parent = phase;
				_status.eventManager.setStatusEvent(event, true);
				await Content.chooseButton[0](event, null, game.me);
				out.buttons = { count: dialog.buttons.length, visible: dialog.buttons.every(button => getComputedStyle(button).display !== "none" && getComputedStyle(button).visibility !== "hidden") };
				_status.clicked = false; ui.click.button.call(dialog.buttons[0]); ui.click.ok();
				out.buttons.result = event.result;
				// 触发技仍须让玩家决定发动与否，不能自动代选。
				event = game.me.chooseBool("是否发动“奸雄”？").set("prompt2", lib.translate.jianxiong_info).set("sourceSkill", "jianxiong");
				event.parent = phase; _status.eventManager.setStatusEvent(event, true);
				void Content.chooseBool(event, null, game.me);
				out.trigger = read(event);
				out.trigger.hiddenDescription = [...event.dialog.querySelectorAll(".decade-optimized-detail")].every(node => getComputedStyle(node).display === "none");
				out.trigger.hiddenDialog = getComputedStyle(event.dialog).visibility === "hidden";
				ui.click.cancel(); out.triggerCancelled = read(event);
				lib.config.extension_十周年UI_simplifySkillPrompt = false;
				({ event } = await begin()); ui.click.skill("zhiheng"); out.disabled = read(event);
				out.disabled.description = event.skillDialog?.textContent;
				lib.config.extension_十周年UI_optimizePrompt = true;
				prompts.refreshOptimizedPrompt(); out.optimizedOnly = read(event);
				lib.config.extension_十周年UI_optimizePrompt = false;
				lib.config.extension_十周年UI_simplifySkillPrompt = true;
				({ event } = await begin()); ui.click.skill("simplify_direct_test"); out.reenabled = read(event);
				const { showDecadeConfigWindow, hideDecadeConfigWindow } = await import("/extension/十周年UI/src/config/config-window.js");
				showDecadeConfigWindow();
				const row = [...document.querySelectorAll(".decade-config-dialog tr")].find(row => row.querySelector("td")?.textContent === "简化技能提示");
				if (!row) throw new Error("Missing simplify skill setting row");
				const toggle = row.querySelector(".decade-config-toggle");
				out.menu = { initial: toggle.classList.contains("on") };
				toggle.click(); out.menu.disabled = lib.config.extension_十周年UI_simplifySkillPrompt === false;
				toggle.click(); out.menu.enabled = lib.config.extension_十周年UI_simplifySkillPrompt === true;
				hideDecadeConfigWindow();
				return out;
			});
			assert.deepEqual(result.setting, { name: "简化技能提示", init: true });
			assert.equal(result.zhiheng.dialog, false);
			assert.equal(result.zhiheng.selectableCard, true);
			assert.equal(result.zhiheng.result, undefined);
			assert.match(result.zhiheng.text, /弃置/);
			assert.equal(result.zhihengSelected.selected, 1);
			assert.equal(result.cancelled.skill, undefined);
			assert.equal(result.cancelled.selected, 0);
			assert.equal(result.cancelled.text, "");
			assert.equal(result.kurou.result, undefined, "保留本机苦肉 manualConfirm 要求");
			assert.equal(result.kurou.dialog, false);
			assert.equal(result.direct.result.bool, true);
			assert.equal(result.direct.result.skill, "simplify_direct_test");
			assert.equal(result.rendeSelected.targets, 1);
			assert.equal(result.rendeConfirmed.result.bool, true);
			assert.equal(result.rendeConfirmed.result.skill, "rende");
			assert.equal(result.optional.result, undefined);
			assert.equal(result.optional.skill, "simplify_optional_test");
			assert.equal(result.manual.result, undefined);
			assert.doesNotMatch(result.manual.text, /请选择.*张牌/);
			assert.match(result.customPrompt.text, /记录当前\d+点体力/);
			assert.equal(result.buttons.count, 2);
			assert.equal(result.buttons.visible, true);
			assert.equal(result.buttons.result.bool, true);
			assert.deepEqual(result.buttons.result.links, ["杀"]);
			assert.equal(result.trigger.result, undefined);
			assert.match(result.trigger.text, /奸雄/);
			assert.equal(result.trigger.hiddenDescription, true);
			assert.equal(result.trigger.hiddenDialog, true);
			assert.equal(result.triggerCancelled.result.bool, false);
			assert.equal(result.disabled.dialog, true);
			assert.match(result.disabled.description, /弃置任意张牌/);
			assert.equal(result.disabled.text, "");
			assert.match(result.optimizedOnly.text, /弃置/);
			assert.equal(result.reenabled.result.skill, "simplify_direct_test");
			assert.deepEqual(result.menu, { initial: true, disabled: true, enabled: true });
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			if (["othersOff", "onlineUI"].includes(style)) {
				await page.evaluate(async () => {
					const { game, ui, _status } = await import("/noname.js");
					const { Content } = await import("/noname/library/element/content.js");
					game.uncheck(); for (const dialog of [...ui.dialogs]) dialog.close();
					const event = game.me.chooseToUse({ type: "phase" });
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseToUse[0](event, null, game.me);
					ui.click.skill("zhiheng");
					await document.fonts.ready;
				});
				await page.screenshot({ path: path.join(__dirname, `simplified-skill-prompt-${style}.png`) });
			}
			console.log("SIMPLIFIED_SKILL_OK", style);
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "simplified-skill-prompt-results.json"), JSON.stringify(results, null, 2));
	} finally {
		await browser.close();
		server.close();
	}
}
run().catch(error => { console.error(error); process.exitCode = 1; });
