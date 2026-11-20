// 启动真实本体与一将成名分支，检查新背景、对话框和原生菜单的遮挡及鼠标命中。
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_loadingStyle: "dialog_xinsha", phonelayout: false, touchscreen: false });

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
		page.setDefaultTimeout(12000);
		const errors = [];
		page.on("pageerror", error => errors.push(error.message));
		for (const [request, bundle, globalName] of [
			["crypto-js@4.2.0/node_modules/crypto-js/index.js", "crypto-js@4.2.0/node_modules/crypto-js/crypto-js.js", "CryptoJS"],
			["jszip@2.7.0/node_modules/jszip/lib/index.js", "jszip@2.7.0/node_modules/jszip/dist/jszip.js", "JSZip"],
			["nosleep.js@0.12.0/node_modules/nosleep.js/src/index.js", "nosleep.js@0.12.0/node_modules/nosleep.js/dist/NoSleep.js", "NoSleep"],
			["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core"],
			["stackframe@1.3.4/node_modules/stackframe/stackframe.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "StackFrame"],
			["error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "ErrorStackParser"],
			["stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "StackTraceGPS"],
		]) {
			const source = fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", bundle), "utf8").replaceAll("}(this,", "}(globalThis,").replaceAll(")(this,", ")(globalThis,");
			const prefix = ["ErrorStackParser", "StackTraceGPS"].includes(globalName) ? 'import "/_virtual/stackframe.js";\n' : "";
			await page.route("**/node_modules/.pnpm/" + request, route => route.fulfill({ contentType: "text/javascript", body: prefix + source + `\nexport function __require(){return globalThis.${globalName};}` }));
		}
		for (const [pattern, file] of [["**/pinyin-pro/dist/index.js", "pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.mjs"], ["**/dedent/dist/dedent.js", "dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"]]) {
			await page.route(pattern, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", file), "utf8") }));
		}
		await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
		await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
		await page.evaluate(async () => {
			const { game, ui, lib, _status } = await import("/noname.js");
			Object.assign(window, { game, ui, lib, _status });
			game.pause();
			for (const dialog of [...ui.dialogs]) dialog.close();
			for (const control of [...ui.controls]) control.close();
			document.querySelector(".decade-welcome-overlay")?.remove();
			ui.arena.classList.remove("choose-character");
			game.resume2();
			window.testDialog = ui.create.dialog("菜单层级：请选择一张牌", "hidden", "forcebutton");
			testDialog.add([[game.createCard("sha", "spade", 7)], "card"]);
			testDialog.open();
		});
		await page.evaluate(() => document.fonts.ready);
		assert.equal(await page.locator("body").getAttribute("data-style"), "othersOff");
		const nativeEntry = await page.evaluate(() => {
			ui.config2.setAttribute("data-menu-layer-test", "native-settings");
			const node = ui.config2, box = node.getBoundingClientRect();
			return { systemDisplay: getComputedStyle(ui.system).display, width: box.width, height: box.height, phone: ui.arena.dataset.phonelayout };
		});
		assert.ok(nativeEntry.systemDisplay !== "none" && nativeEntry.width > 0 && nativeEntry.height > 0, JSON.stringify(nativeEntry));
		// 复现用户实际画幅和高层透明输入面：菜单入口也须高于101，不能只验证已打开的面板。
		await page.evaluate(async () => {
			const { createPcRatioFrame } = await import("/extension/雷霆/src/PcRatioFrame.js");
			game.documentZoom = 0.875; ui.updatez(); createPcRatioFrame(2.233);
			const inputSurface = document.createElement("div"); inputSurface.id = "menu-layer-input-probe";
			inputSurface.style.cssText = "position:absolute;inset:0;z-index:101;pointer-events:auto;background:transparent";
			ui.window.append(inputSurface);
		});
		await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
		const entryHit = await page.locator('[data-menu-layer-test="native-settings"]').evaluate(node => {
			const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
			return { hit: node.contains(hit), top: hit?.id || hit?.className, system: Number(getComputedStyle(ui.system).zIndex) };
		});
		assert.ok(entryHit.hit && entryHit.system > 101, JSON.stringify(entryHit));
		await page.locator('[data-menu-layer-test="native-settings"]').click();
		await page.locator(".menu-container:not(.hidden)").waitFor();
		await page.evaluate(() => ui.click.configMenu());
		await page.locator(".yjcm-menu-main").click();
		assert.equal(await page.locator(".yjcm-menu-list").evaluate(node => node.hidden), false);
		await page.evaluate(() => document.querySelector("#menu-layer-input-probe").remove());
		await page.locator(".yjcm-menu-background").click();
		await page.locator(".yjcm-wallpaper-overlay").waitFor();
		await page.evaluate(() => ui.click.configMenu());
		const menu = page.locator(".menu-container:not(.hidden)");
		await menu.locator(".menu-tab").getByText("选项", { exact: true }).click();
		assert.equal(await menu.locator(".menu-tab > .active").innerText(), "选项");
		const layers = await page.evaluate(() => {
			const menu = document.querySelector(".menu-container:not(.hidden)"), wallpaper = document.querySelector(".yjcm-wallpaper-overlay");
			const tab = [...menu.querySelectorAll(".menu-tab > div")].find(node => node.textContent === "选项");
			const rect = tab.getBoundingClientRect();
			return { menu: Number(getComputedStyle(menu).zIndex), wallpaper: Number(getComputedStyle(wallpaper).zIndex), dialog: Number(getComputedStyle(testDialog).zIndex), hide: Number(getComputedStyle(document.querySelector(".dialog-xinsha-hide")).zIndex), hit: menu.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
		});
		assert.ok(layers.hit && layers.menu > layers.wallpaper && layers.menu > layers.dialog && layers.menu > layers.hide, JSON.stringify(layers));
		await menu.locator(".switcher:not(.disabled):visible").first().click();
		const popup = page.locator(".popup-container:not(.hidden)");
		await popup.waitFor();
		const dropdown = await popup.evaluate(node => {
			const item = node.firstElementChild.firstElementChild || node.firstElementChild, r = item.getBoundingClientRect();
			return { z: Number(getComputedStyle(node).zIndex), hit: node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)), parent: node.parentElement.id || node.parentElement.className, inlineStyle: node.getAttribute("style"), html: node.outerHTML.slice(0, 260) };
		});
		assert.ok(dropdown.z > layers.menu && dropdown.hit, JSON.stringify(dropdown));
		await page.screenshot({ path: path.join(__dirname, "xinsha-native-menu-layer-browser.png") });
		await popup.click({ position: { x: 1, y: 1 } });
		await page.evaluate(() => ui.click.configMenu());
		await page.locator('.yjcm-wallpaper-close-tip').click();
		await page.evaluate(() => testDialog.close());
		// 用户实局反馈：system=31、shortcut=131。固定入口为原生31，避免主题132掩盖缺陷。
		await page.evaluate(() => { ui.system.style.zIndex = '31'; ui.click.shortcut(true); });
		// 等待原生按钮展开并确认可接收点击；trial避免触发“重来”。
		await page.locator('#shortcut > [data-position="1"]').click({ trial: true });
		const shortcutHit = await page.locator("#shortcut").evaluate(node => {
			const button = node.querySelector('[data-position="1"]'), r = button.getBoundingClientRect();
			return { z: Number(getComputedStyle(node).zIndex), hit: button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
		});
		assert.ok(shortcutHit.hit, JSON.stringify(shortcutHit));
		// 原生快捷层首个空div会拦截顶部点击；快捷层打开时也必须能点击设置入口。
		const shortcutEntry = await page.locator('[data-menu-layer-test="native-settings"]').evaluate(node => {
			const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
			return { hit: node.contains(hit), blocker: hit?.outerHTML.slice(0, 180), shortcut: Number(getComputedStyle(ui.shortcut).zIndex), system: Number(getComputedStyle(ui.system).zIndex) };
		});
		assert.ok(shortcutEntry.hit && shortcutEntry.system > shortcutEntry.shortcut, JSON.stringify(shortcutEntry));
		assert.equal(shortcutHit.z, 10);
		await page.locator('[data-menu-layer-test="native-settings"]').click();
		await page.locator('.menu-container:not(.hidden)').waitFor();
		await page.evaluate(() => ui.click.configMenu());
		await page.evaluate(() => { ui.click.shortcut(false); ui.system.style.removeProperty('z-index'); });
		await page.evaluate(() => ui.create.iframe("about:blank"));
		const iframeLayer = await page.locator(".poplayer").evaluate(node => ({ z: Number(getComputedStyle(node).zIndex), hit: node.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2)) }));
		assert.ok(iframeLayer.z > layers.menu && iframeLayer.hit, JSON.stringify(iframeLayer));
		await page.evaluate(() => document.querySelector(".poplayer").remove());
		// 按参考图采用原版582宽条，画幅缩放不能改变449步倒计时。
		await page.evaluate(() => {
			window.makeProgressProbe = style => {
				lib.config.extension_十周年UI_jindutiaoYangshi = style;
				lib.config.extension_十周年UI_jindutiaoST = "200";
				lib.config.extension_十周年UI_jindutiaoSet = "27.5";
				const original = window.setInterval;
				window.progressProbeCallbacks = [];
				window.setInterval = (callback, delay) => {
					progressProbeCallbacks.push(callback);
					if (progressProbeCallbacks.length === 1) { window.progressProbeTick = callback; window.progressProbeInterval = delay; }
					return original(() => {}, 2147483647);
				};
				try { window.progressProbe = game.Jindutiaoplayer({ id: "yjcm-progress-width-probe", parent: ui.window }); }
				finally { window.setInterval = original; }
			};
			makeProgressProbe("4");
		});
		let progressCases = 0;
		for (const width of [1280, 1920]) for (const zoom of [1, 1.25]) {
			await page.setViewportSize({ width, height: 720 });
			await page.evaluate(zoom => { game.documentZoom = zoom; ui.updatez(); window.dispatchEvent(new Event("resize")); }, zoom);
			await page.waitForFunction(() => {
				const w = ui.window.clientWidth, h = ui.window.clientHeight, unit = Math.min(w / 1334, h / 750);
				const safe = !lib.device || w / h > 1.86 ? 60 : 0;
				const expected = 582 * Math.max(1334, Math.min(1750, w / unit - 2 * safe)) / 1334 * unit;
				return Math.abs(parseFloat(getComputedStyle(progressProbe.bar).width) - expected) < 1;
			});
			const progress = await page.evaluate(() => {
				const bar = progressProbe.bar, box = bar.getBoundingClientRect(), viewport = ui.window.getBoundingClientRect();
				return { width: box.width, centerError: box.x + box.width / 2 - viewport.x - viewport.width / 2, fill: bar.firstElementChild.getBoundingClientRect().width, data: bar.firstElementChild.data, interval: progressProbeInterval };
			});
			assert.ok(Math.abs(progress.centerError) < 1 && Math.abs(progress.width - progress.fill) < 1, JSON.stringify(progress));
			assert.equal(progress.data, 449); assert.equal(progress.interval, 200); progressCases++;
		}
		const countdown = await page.evaluate(() => {
			progressProbeTick(); progressProbeTick();
			const fill = progressProbe.bar.firstElementChild, percent = parseFloat(fill.style.width);
			for (let step = 2; step < 448; step++) progressProbeTick();
			const beforeLast = progressProbe.bar.isConnected;
			progressProbeTick();
			const afterLast = progressProbe.bar.isConnected;
			progressProbe.dispose();
			return { percent, beforeLast, afterLast };
		});
		assert.ok(Math.abs(countdown.percent - 448 / 449 * 100) < 0.001);
		assert.deepEqual([countdown.beforeLast, countdown.afterLast], [true, false]);
		for (const [style, width, tickWidth] of [["2", 400, "300px"], ["3", 400, "395px"], ["5", 568, "568px"]]) {
			const other = await page.evaluate(style => { makeProgressProbe(style); const width = getComputedStyle(progressProbe.bar).width; progressProbeTick(); const fill = progressProbe.bar.firstElementChild.style.width; progressProbe.dispose(); return { width, fill }; }, style);
			assert.equal(other.width, `${width}px`); assert.equal(other.fill, tickWidth);
		}
		// 关闭新主题作用域后，其他风格的本体菜单恢复原来的8/10层级。
		await page.evaluate(() => { document.body.dataset.style = "onlineUI"; ui.arena.dataset.loadingStyle = "off"; });
		await page.waitForFunction(() => Number(getComputedStyle(ui.menuContainer).zIndex) === 8 && Number(getComputedStyle(document.querySelector(".popup-container")).zIndex) === 10);
		const isolation = await page.evaluate(() => {
			return { menu: Number(getComputedStyle(ui.menuContainer).zIndex), popup: Number(getComputedStyle(document.querySelector(".popup-container")).zIndex) };
		});
		assert.deepEqual(isolation, { menu: 8, popup: 10 });
		assert.deepEqual(errors, []);
		console.log("XINSHA_NATIVE_MENU_LAYER_OK", JSON.stringify({ nativeEntry, entryHit, layers, dropdown, shortcutHit, shortcutEntry, iframeLayer, isolation, progressCases, countdown, pageErrors: errors.length }));
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
