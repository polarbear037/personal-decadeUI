const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", touchscreen: false });
for (const row of require("./yjcm-font-source.json").resources) {
	assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, row.destination))).digest("hex"), row.sha256);
}

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
		const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
		const errors = [], failed = [];
		page.on("pageerror", error => errors.push(error.message));
		page.on("response", response => { if (response.status() >= 400 && /fonts|xinsha/.test(response.url())) failed.push(response.url()); });
		page.on("dialog", dialog => dialog.accept());
		// 复用实局夹具的浏览器依赖适配，不修改游戏依赖。
		for (const [request, bundle, globalName] of [
			["crypto-js@4.2.0/node_modules/crypto-js/index.js", "crypto-js@4.2.0/node_modules/crypto-js/crypto-js.js", "CryptoJS"],
			["jszip@2.7.0/node_modules/jszip/lib/index.js", "jszip@2.7.0/node_modules/jszip/dist/jszip.js", "JSZip"],
			["nosleep.js@0.12.0/node_modules/nosleep.js/src/index.js", "nosleep.js@0.12.0/node_modules/nosleep.js/dist/NoSleep.js", "NoSleep"],
			["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core"],
			["stackframe@1.3.4/node_modules/stackframe/stackframe.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "StackFrame"],
			["error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "ErrorStackParser"],
			["stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "StackTraceGPS"],
		]) {
			const source = fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm", bundle), "utf8").replaceAll("}(this,", "}(globalThis,").replaceAll(")(this,", ")(globalThis,");
			const prefix = ["ErrorStackParser", "StackTraceGPS"].includes(globalName) ? 'import "/_virtual/stackframe.js";\n' : "";
			await page.route("**/node_modules/.pnpm/" + request, route => route.fulfill({ contentType: "text/javascript", body: prefix + source + `\nexport function __require(){return globalThis.${globalName};}` }));
		}
		for (const [pattern, file] of [["**/pinyin-pro/dist/index.js", "pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.mjs"], ["**/dedent/dist/dedent.js", "dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"]]) {
			await page.route(pattern, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm", file), "utf8") }));
		}
		await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
		await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
		await page.evaluate(async () => {
			const { game, ui, lib, _status } = await import("/noname.js");
			Object.assign(window, { game, ui, lib, _status });
			game.pause();
			for (const dialog of [...ui.dialogs]) dialog.close();
			for (const control of [...ui.controls]) control.close();
			game.me = game.players[0]; game.me.init("liubei");
			ui.updateSkillControl(game.me, true);
			ui.create.confirm("oc");
			window.fontDialog = ui.create.dialog("原版字体：请选择一张牌", "hidden", "forcebutton");
			fontDialog.addText("对话框正文：确定、取消、武将技能与设置菜单");
			fontDialog.open();
			const input = document.createElement("input"); input.value = "搜索武将"; input.id = "yjcm-font-input"; fontDialog.content.append(input);
			const nested = document.createElement("span"); nested.id = "yjcm-font-inline"; nested.style.fontFamily = "monospace"; nested.textContent = "嵌套行内字体"; fontDialog.content.append(nested);
		});
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(700);
		assert.equal(await page.locator("body").getAttribute("data-style"), "othersOff");
		assert.equal(await page.locator('link[href*="fonts-xinsha.css"]').count(), 1);
		const selectors = [".dialog .caption", ".dialog .text", "#yjcm-font-input", "#yjcm-font-inline", ".lbtn-confirm > .primary", ".lbtn-confirm > .primary2", ".skill-control [data-id]"];
		const cdp = await page.context().newCDPSession(page);
		await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
		const { root: dom } = await cdp.send("DOM.getDocument");
		const samples = [];
		for (const selector of selectors) {
			const node = page.locator(selector).first();
			assert.ok(await node.count(), selector);
			const family = await node.evaluate(n => getComputedStyle(n).fontFamily);
			assert.match(family, selector.includes("skill-control") ? /dui-yjcm-skill/ : /dui-yjcm-label/, selector);
			const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: dom.nodeId, selector });
			const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
			assert.ok(fonts.some(font => font.isCustomFont && font.glyphCount > 0), JSON.stringify({ selector, fonts }));
			samples.push({ selector, family, fonts });
		}
		await page.screenshot({ path: path.join(__dirname, "yjcm-font-browser.png") });
		await page.evaluate(() => ui.click.configMenu());
		await page.locator(".menu-container:not(.hidden)").waitFor();
		const menuFonts = await page.locator(".menu-container:not(.hidden)").evaluate(menu => [...menu.querySelectorAll("*")].filter(n => [...n.childNodes].some(t => t.nodeType === 3 && /[\u4e00-\u9fff]/.test(t.textContent))).map(n => ({ text: n.textContent.slice(0, 24), family: getComputedStyle(n).fontFamily })));
		assert.ok(menuFonts.length > 5);
		assert.deepEqual(menuFonts.filter(row => !row.family.includes("dui-yjcm-label")), []);
		await page.evaluate(() => ui.click.configMenu());
		// 即使保留字体样式表，其他风格也不命中覆盖规则；移除它前后计算字体一致。
		const isolation = {};
		for (const style of ["on", "off", "onlineUI", "babysha", "codename"]) {
			isolation[style] = await page.evaluate(style => {
				document.body.dataset.style = style;
				const link = document.querySelector('link[href*="fonts-xinsha.css"]');
				const nodes = [...document.querySelectorAll(".dialog .caption, .dialog .text, .lbtn-confirm > div, .skill-control [data-id]")];
				const before = nodes.map(n => getComputedStyle(n).fontFamily);
				link.disabled = true;
				const after = nodes.map(n => getComputedStyle(n).fontFamily);
				link.disabled = false;
				return { before, after };
			}, style);
			assert.deepEqual(isolation[style].before, isolation[style].after, style);
		}
		const decoded = await page.evaluate(async base => {
			const names = ["fzbw.ttf", "FZSHENGSKSJW.ttf", "yjcm-hyxlsj.ttf", "sy.ttf"];
			for (const [i, name] of names.entries()) await new FontFace("font-decode-" + i, `url("${base}${name}")`).load();
			return names;
		}, "/extension/十周年UI/ui/assets/fonts/");
		assert.deepEqual(errors, []); assert.deepEqual(failed, []);
		fs.writeFileSync(path.join(__dirname, "yjcm-font-results.json"), JSON.stringify({ samples, menuFonts, isolation, decoded, errors, failed }, null, 2));
		console.log(`YJCM_FONT_OK: 4 original font hashes/decodes; ${samples.length} native text/font-rendering probes; ${menuFonts.length} settings labels; 5 style isolation checks; 0 page errors/font failures`);
	} finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
