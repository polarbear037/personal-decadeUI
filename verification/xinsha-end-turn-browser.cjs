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
		for (const style of ["othersOff", "onlineUI", "on"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], touchscreen: false, phonelayout: true, extension_十周年UI_newDecadeStyle: style });
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
				Object.assign(window, { game, ui, lib, get, _status });
				game.pause(); game.resume = () => {};
				for (const dialog of [...ui.dialogs]) dialog.close();
				for (const control of [...ui.controls]) control.close();
				document.querySelector(".decade-welcome-overlay")?.remove();
				ui.arena.classList.remove("choose-character");
				game.me = game.players[0]; game.me.init("sunquan"); game.players[1].init("guanyu");
				_status.currentPhase = game.me; _status.auto = false; _status.over = false;
				lib.config.auto_confirm = false;
				const phase = game.createEvent("phaseUse", false); phase.player = game.me;
				window.chain = game.createCard("tiesuo", "club", 12);
				game.me.directgain([chain, game.createCard("sha", "spade", 7)]);
				window.begin = async () => {
					game.uncheck();
					const event = game.me.chooseToUse({ type: "phase" }); event.parent = phase;
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseToUse[0](event, null, game.me);
				};
				window.read = () => {
					const rect = n => n.getBoundingClientRect().toJSON();
					const end = _status.event.endButton;
					return { ok: rect(ui.confirm.node.ok), cancel: rect(ui.confirm.node.cancel), window: rect(ui.window),
						cancelLabel: ui.confirm.node.cancel.textContent, cards: ui.selected.cards.length, targets: ui.selected.targets.length,
						endDisplay: getComputedStyle(end).display, endConnected: end.isConnected, marked: end.classList.contains("yjcm-end-turn"),
						bool: _status.event.result?.bool, unit: parseFloat(getComputedStyle(ui.window).getPropertyValue("--yjcm-unit")) };
				};
				// 确认栏先存在，再创建 chooseToUse，复现下一轮出牌时出现第三个按钮。
				ui.create.confirm("oc");
				await begin();
			});
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(600);
			const idle = await page.evaluate(() => read());
			await page.evaluate(() => { _status.clicked = false; ui.click.card.call(chain); _status.clicked = false; ui.click.target.call(game.players[1]); });
			await page.waitForTimeout(600);
			const selected = await page.evaluate(() => read());
			assert.equal(selected.cards, 1); assert.equal(selected.targets, 1);
			assert.equal(selected.cancelLabel, "取消");
			if (style === "othersOff") {
				const near = (a, b, label) => assert(Math.abs(a - b) < .3, `${label}: ${a} != ${b}`);
				const check = state => {
					assert(state.endConnected); assert(state.marked); assert.equal(state.endDisplay, "none");
					near((state.ok.x + state.ok.width / 2 + state.cancel.x + state.cancel.width / 2) / 2, state.window.x + state.window.width / 2, "pair centered");
					near((state.cancel.x - state.ok.x) / state.unit, 280, "official spacing");
					near(state.ok.width / state.unit, 207.9, "official width");
				};
				check(idle); check(selected);
				assert.equal(idle.cancelLabel, "回合结束");
				near(idle.ok.x, selected.ok.x, "selection preserves confirm position");
				await page.screenshot({ path: path.join(__dirname, "xinsha-end-turn-selected.png") });
				// 取消只撤销选择；下一次空闲点击才结束，仍由真实本体处理。
				await page.evaluate(() => ui.confirm.node.cancel.click());
				await page.waitForTimeout(600);
				const cleared = await page.evaluate(() => read());
				check(cleared); assert.equal(cleared.cards, 0); assert.equal(cleared.targets, 0);
				assert.equal(cleared.bool, undefined); assert.equal(cleared.cancelLabel, "回合结束");
				await page.setViewportSize({ width: 2444, height: 1090 });
				await page.waitForTimeout(700);
				const resized = await page.evaluate(() => read()); check(resized);
				await page.evaluate(() => { game.documentZoom = 1.5; ui.updatez(); });
				await page.waitForTimeout(700);
				const zoomed = await page.evaluate(() => read());
				assert.equal(zoomed.endDisplay, "none");
				near((zoomed.ok.x + zoomed.ok.width / 2 + zoomed.cancel.x + zoomed.cancel.width / 2) / 2, zoomed.window.x + zoomed.window.width / 2, "zoom centered");
				await page.evaluate(() => ui.confirm.node.cancel.click());
				assert.deepEqual(await page.evaluate(() => _status.event.result), { confirm: "cancel", bool: false });
				await page.evaluate(async () => { await begin(); _status.clicked = false; ui.click.card.call(chain); _status.clicked = false; ui.click.target.call(game.players[1]); ui.confirm.node.ok.click(); });
				assert.deepEqual(await page.evaluate(() => ({ bool: _status.event.result.bool, name: _status.event.result.card.name, targets: _status.event.result.targets.length })), { bool: true, name: "tiesuo", targets: 1 });
				results[style] = { idle, selected, cleared, resized, zoomed, cancelAndEnd: true, confirmUse: true };
			} else {
				assert.equal(idle.marked, false); assert.notEqual(idle.endDisplay, "none");
				results[style] = { idle, selected, isolated: true };
			}
			assert.deepEqual(errors, []);
			results[style].errors = errors;
			console.log("END_TURN_BROWSER_OK", style);
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "xinsha-end-turn-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally {
		await browser.close(); server.close();
	}
}
run().catch(error => { console.error(error); process.exitCode = 1; });

