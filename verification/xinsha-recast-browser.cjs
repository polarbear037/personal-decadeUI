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
			Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_enableRecastInteraction: true, extension_十周年UI_newDecadeStyle: style });
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
				game.pause(); game.resume = () => {};
				for (const dialog of [...ui.dialogs]) dialog.close();
				for (const control of [...ui.controls]) control.close();
				document.querySelector(".decade-welcome-overlay")?.remove();
				ui.arena.classList.remove("choose-character");
				game.me = game.players[0]; game.me.init("sunquan"); game.players[1].init("guanyu");
				_status.currentPhase = game.me; _status.auto = false; _status.over = false;
				lib.config.auto_confirm = false;
				const phase = game.createEvent("phaseUse", false); phase.player = game.me;
				const tiesuo = game.createCard("tiesuo", "club", 12), sha = game.createCard("sha", "spade", 7);
				game.me.directgain([tiesuo, sha]);
				const begin = async () => {
					game.uncheck();
					const event = game.me.chooseToUse({ type: "phase" }); event.parent = phase;
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseToUse[0](event, null, game.me);
					return { event };
				};
				const click = card => { _status.clicked = false; ui.click.card.call(card); };
				const read = event => ({ label: ui.confirm?.firstChild?.textContent, disabled: ui.confirm?.firstChild?.classList.contains("disabled"), cards: ui.selected.cards.map(card => card.name), targets: ui.selected.targets.length, submitted: event.result?.bool === true, recastButton: ui.confirm?.recastButton?.textContent });
				let { event } = await begin(); click(tiesuo);
				const noTargets = read(event);
				_status.clicked = false;
				ui.window.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				const blank = read(event);
				({ event } = await begin()); click(tiesuo);
				_status.clicked = false; ui.click.target.call(game.players[1]);
				const target = read(event);
				ui.confirm.firstChild.click();
				const used = { bool: event.result?.bool, targets: event.result?.targets?.length, name: event.result?.card?.name };
				({ event } = await begin()); click(tiesuo);
				let recast;
				if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI") {
					ui.confirm.firstChild.click();
					const trigger = { name: "useCard", player: game.me, cards: event.result?.cards, card: event.result?.card, targets: event.result?.targets };
					const skill = lib.skill._decadeUI_recastable_recast;
					recast = { bool: event.result?.bool, targets: trigger.targets?.length, name: trigger.card?.name, filter: skill.filter(trigger, game.me) };
				}
				({ event } = await begin()); click(sha);
				const otherCard = read(event);
				return { style: document.body.dataset.style, noTargets, blank, target, used, recast, otherCard };
			});
			assert.equal(result.style, style);
			assert.equal(result.noTargets.submitted, false);
			assert.deepEqual(result.noTargets.cards, ["tiesuo"]);
			assert.equal(result.blank.submitted, false, "点击空白不应提交重铸");
			assert.equal(result.blank.cards.length, 0, "空白点击清除选牌");
			assert.equal(result.target.label, "确定");
			assert.equal(result.target.targets, 1);
			assert.deepEqual(result.used, { bool: true, targets: 1, name: "tiesuo" });
			if (style === "onlineUI") {
				assert.equal(result.noTargets.recastButton, "重铸");
			} else {
				assert.equal(result.noTargets.label, style === "othersOff" ? "确定" : "重铸");
				assert.equal(result.noTargets.disabled, false);
				assert.deepEqual(result.recast, { bool: true, targets: 0, name: "tiesuo", filter: true });
			}
			assert.equal(result.otherCard.submitted, false);
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log("RECAST_BROWSER_OK", style, JSON.stringify(result));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "xinsha-recast-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally {
		await browser.close(); server.close();
	}
}
run().catch(error => { console.error(error); process.exitCode = 1; });
