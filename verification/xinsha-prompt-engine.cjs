const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");

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
		for (const style of ["othersOff", "onlineUI"]) {
			console.log("ENGINE_START", style);
			Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_newDecadeStyle: style, extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : true });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await page.exposeFunction("captureXinshaResponse", name => page.screenshot({ path: path.join(__dirname, `xinsha-prompt-${name}-${style}.png`) }));
			await dependencies(page);
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			console.log("ENGINE_READY", style);
			const result = await page.evaluate(async () => {
				const { game, ui, lib, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { config } = await import("/extension/十周年UI/src/config/index.js");
				const { showDecadeConfigWindow, hideDecadeConfigWindow } = await import("/extension/十周年UI/src/config/config-window.js");
				game.pause();
				game.resume = () => {};
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
				lib.config.show_phaseuse_prompt = true;
				const initial = lib.config.extension_十周年UI_optimizePrompt;
				const phase = game.createEvent("phaseUse", false); phase.player = game.me;
				const sha = game.createCard("sha", "spade", 7);
				game.me.directgain([sha, game.createCard("shan", "heart", 2)]);
				const read = () => {
					const tip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
					const text = tip?.querySelector(".decade-official-main");
					return { text: text?.textContent || "", detail: tip?.querySelector(".decade-official-detail")?.textContent || "", mode: tip?.dataset.optimizedPromptStyle, field: tip?.dataset.officialPromptField, color: tip && getComputedStyle(tip).color, font: tip && getComputedStyle(tip).fontFamily, spans: [...(text?.children || [])].map(node => ({ text: node.textContent, color: getComputedStyle(node).color, font: getComputedStyle(node).fontFamily, stroke: getComputedStyle(node).webkitTextStroke })), rect: tip?.getBoundingClientRect().toJSON(), confirm: document.getElementById("dui-controls")?.getBoundingClientRect().toJSON() };
				};
				const begin = async () => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					prompts.clearOptimizedPrompts();
					_status.clicked = false;
					const event = game.me.chooseToUse({ type: "phase" }); event.parent = phase;
					event._skillChoice = [];
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseToUse[0](event, null, game.me);
					// GameEvent 是 thenable，不能直接从 async 函数返回，否则会启动完整结算。
					return { event };
				};
				let { event } = await begin();
				await document.fonts.ready;
				const phaseTip = read();
				_status.clicked = false;
				ui.click.card.call(sha);
				const selected = read();
				ui.click.cancel();
				({ event } = await begin());
				ui.click.skill("zhiheng");
				await document.fonts.ready;
				const skillTip = read();
				_status.clicked = false; ui.click.card.call(sha);
				const skillSelected = { ...read(), selected: ui.selected.cards.length };
				ui.click.cancel();
				const responseTips = {};
				const openChoice = async choice => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					prompts.clearOptimizedPrompts();
					choice._skillChoice = [];
					_status.eventManager.setStatusEvent(choice, true);
					await Content[choice.name][0](choice, null, game.me);
					await document.fonts.ready;
					return { ...read(), nativePrompt: choice.prompt, nativeDetail: choice.prompt2 || "" };
				};
				const actor = game.players[1];
				const incoming = game.createEvent("useCard", false);
				incoming.player = actor;
				incoming.skill = "luanji";
				incoming.parent = phase;
				const wan = game.createEvent("wanjian", false);
				Object.assign(wan, { player: actor, target: game.me, card: new lib.element.VCard({ name: "wanjian" }), parent: incoming });
				_status.eventManager.setStatusEvent(wan, true);
				// 运行真实万箭齐发内容，在等待本人响应处暂停；不执行伤害结算。
				let response;
				const originalRespond = game.me.chooseToRespond;
				game.me.chooseToRespond = function (...args) {
					response = originalRespond.apply(this, args);
					response.forResult = () => new Promise(() => {});
					return response;
				};
				try { lib.card.wanjian.content(wan, null, actor); }
				finally { game.me.chooseToRespond = originalRespond; }
				if (!response) throw new Error("wanjian did not create chooseToRespond");
				responseTips.luanji = await openChoice(response);
				if (document.body.dataset.style === "othersOff") await window.captureXinshaResponse("luanji");
				const shaChoice = game.me.chooseToUse("请使用一张闪响应杀");
				Object.assign(shaChoice, { type: "respondShan", respondTo: [actor, new lib.element.VCard({ name: "sha" })], parent: incoming, filterCard: card => get.name(card) === "shan" });
				responseTips.sha = await openChoice(shaChoice);
				// _save 本身生成“濒死，是否帮助？”与“当前体力”，防止手写通用标题绕过回归。
				game.me.directgain([game.createCard("tao", "heart", 3)]);
				actor.hp = 0;
				const save = game.createEvent("_save", false);
				Object.assign(save, { player: game.me, parent: incoming });
				_status.eventManager.setStatusEvent(save, true);
				let rescue;
				const originalUse = game.me.chooseToUse;
				game.me.chooseToUse = function (...args) {
					rescue = originalUse.apply(this, args);
					rescue.forResult = () => new Promise(() => {});
					return rescue;
				};
				try { Content._save(save, { player: actor }); }
				finally { game.me.chooseToUse = originalUse; }
				if (!rescue) throw new Error("_save did not create chooseToUse");
				responseTips.dying = await openChoice(rescue);
				if (document.body.dataset.style === "othersOff") await window.captureXinshaResponse("dying");
				actor.hp = -1;
				responseTips.dyingTwo = await openChoice(game.me.chooseToUse({ type: "dying", dying: actor, prompt: `${get.translation(actor)}濒死，是否帮助？`, prompt2: "当前体力：-1" }));
				const customRescue = game.me.chooseToUse({ type: "dying", dying: actor, prompt: '<font color="blue">自定义救援：请选择两张牌</font>', prompt2: "必须保留的额外条件" });
				responseTips.custom = await openChoice(customRescue);
				responseTips.fontLoaded = document.fonts.check('28px "dui-xinsha-prompt-label"');
				actor.hp = actor.maxHp;
				showDecadeConfigWindow();
				const row = [...document.querySelectorAll(".decade-config-dialog tr")].find(row => row.querySelector("td")?.textContent === "优化提示");
				const menu = { options: [...row.querySelectorAll(".decade-config-option")].map(node => node.textContent), selected: row.querySelector(".selected")?.dataset.value };
				row.querySelector('[data-value="off"]').click();
				menu.off = lib.config.extension_十周年UI_optimizePrompt;
				row.querySelector('[data-value="xinsha"]').click();
				menu.xinsha = lib.config.extension_十周年UI_optimizePrompt;
				row.querySelector('[data-value="online"]').click();
				menu.online = lib.config.extension_十周年UI_optimizePrompt;
				hideDecadeConfigWindow();
				config.optimizePrompt.onclick(initial);
				await begin(); ui.click.skill("zhiheng");
				return { initial, bodyStyle: document.body.dataset.style, phaseTip, selected, skillTip, skillSelected, responseTips, menu };
			});
			assert.equal(result.bodyStyle, style);
			assert.deepEqual(result.menu, { options: ["关闭", "一将成名", "online"], selected: style === "othersOff" ? "xinsha" : "online", off: "off", xinsha: "xinsha", online: "online" });
			assert.equal(result.skillSelected.selected, 1);
			if (style === "othersOff") {
				assert.equal(result.phaseTip.text, "出牌阶段，请选择一张卡牌");
				assert.equal(result.selected.text, "选择1名目标角色");
				assert.equal(result.skillTip.text, "请选择你要“制衡”的牌");
				assert.equal(result.skillTip.mode, "xinsha");
				assert.equal(result.skillTip.color, "rgb(254, 240, 201)");
				assert.equal(result.responseTips.luanji.text, "关羽使用了【万箭齐发】，请打出1张【闪】");
				assert.equal(result.responseTips.sha.text, "关羽对你使用了【杀】，请使用一张【闪】");
				assert.equal(result.responseTips.dying.text, "关羽濒死，需要1个【桃】，是否对其使用【桃】？");
				assert.equal(result.responseTips.dying.detail, "");
				assert.equal(result.responseTips.dyingTwo.text, "关羽濒死，需要2个【桃】，是否对其使用【桃】？");
				assert.equal(result.responseTips.dyingTwo.detail, "");
				assert.equal(result.responseTips.custom.text, "自定义救援：请选择两张牌");
				assert.equal(result.responseTips.custom.detail, "必须保留的额外条件");
				assert.ok(result.responseTips.custom.spans.every(span => span.color === "rgb(254, 240, 201)"));
				assert.ok(result.responseTips.fontLoaded);
				assert.equal(result.responseTips.dying.spans.find(span => span.text === "1").color, "rgb(210, 126, 17)");
				for (const key of ["sha", "luanji", "dying"]) {
					const tip = result.responseTips[key];
					assert.match(tip.font, /dui-xinsha-prompt-label/);
					assert.equal(tip.color, "rgb(254, 240, 201)");
					assert.equal(tip.spans.find(span => span.text === "关羽").color, "rgb(255, 225, 0)");
					assert.equal(tip.spans.find(span => /【/.test(span.text)).color, "rgb(255, 217, 121)");
				}
				assert.ok(result.skillTip.rect.bottom <= result.skillTip.confirm.top || result.skillTip.rect.top >= result.skillTip.confirm.bottom,
					`一将提示与确认栏重叠: ${JSON.stringify({ tip: result.skillTip.rect, controls: result.skillTip.confirm })}`);
			} else {
				assert.equal(result.initial, "online");
				assert.equal(result.skillTip.mode, "online");
				assert.match(result.skillTip.font, /dui-official-prompt/);
			}
			await page.screenshot({ path: path.join(__dirname, `xinsha-prompt-engine-${style}.png`) });
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log("XINSHA_PROMPT_ENGINE_OK", style, JSON.stringify({ initial: result.initial, phase: result.phaseTip.text, selected: result.selected.text, skill: result.skillTip.text, errors }));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "xinsha-prompt-engine-results.json"), JSON.stringify(results, null, 2));
	} finally {
		await browser.close();
		server.close();
	}
}

module.exports = { dependencies };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
