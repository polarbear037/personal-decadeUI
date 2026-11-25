// 真实进度条/布局函数与本体CSS的浏览器夹具；不代表Electron实局。
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium, assert, script } = require("../../雷的ol/verification/card-beautify-browser.cjs");

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = { geometry: [], isolation: [], errors: [] };
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
		page.on("pageerror", error => results.errors.push(error.message));
		page.on("response", response => { if (response.status() >= 400) results.errors.push(`${response.status()} ${response.url()}`); });
		await page.goto(origin + "/__card_verification__");
		for (const file of ["/layout/default/layout.css", "/extension/十周年UI/src/styles/extension.css", "/extension/十周年UI/src/styles/layout-xinsha.css"]) await page.addStyleTag({ url: origin + file });
		await page.evaluate(origin => {
			document.body.dataset.style = "othersOff";
			document.body.style.cssText = "margin:0;background:#5b5142";
			document.body.innerHTML = '<div id="window" style="position:absolute;inset:0"><div id="arena" style="position:absolute;inset:0"></div></div>';
			window.lib = { assetURL: origin + "/", config: { extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_jindutiaoYangshi: "4", extension_十周年UI_jindutiaoST: "200", extension_十周年UI_jindutiaoSet: "27.5" } };
			window.game = {}; window._status = {}; window.get = {};
			window.ui = { window: document.getElementById("window"), arena: document.getElementById("arena") };
			window.createBaseLbtnPlugin = () => ({});
			window.createXinshaBackgroundSelector = () => ({});
		}, origin);
		await page.addScriptTag({ content: script("extension/十周年UI/src/ui/progress-bar.js", "m();") });
		await page.addScriptTag({ content: script("extension/十周年UI/ui/lbtn/skins/xinsha.js", "window.plugin=createXinshaLbtnPlugin(lib,game,ui,get,{},_status,{});plugin.initOfficialLayout();") });
		await page.evaluate(() => {
			window.makeProbe = (style = "4", isolated = true) => {
				window.probe?.dispose(); document.getElementById("jindutiaopl")?.remove();
				lib.config.extension_十周年UI_jindutiaoYangshi = style;
				const original = window.setInterval;
				window.callbacks = [];
				window.setInterval = (callback, delay) => { callbacks.push(callback); window.delay = delay; return original(() => {}, 2147483647); };
				try { window.probe = game.Jindutiaoplayer(isolated ? { id: "progress-probe", parent: ui.window } : undefined); }
				finally { window.setInterval = original; }
				window.bar = isolated ? probe.bar : document.getElementById("jindutiaopl");
			};
			makeProbe();
		});
		assert.equal(await page.evaluate(() => getComputedStyle(bar.querySelector("img")).filter), "brightness(1.1)", "普通一将条与临时条使用同一处明度修正");
		results.originalStyle = await page.evaluate(async () => {
			const img=bar.firstChild.querySelector('img'); await img.decode();
			const canvas=document.createElement('canvas'); canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
			const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,8,canvas.width,1).data;
			const redShare=percent=>{let total=0,n=0;for(let x=4;x<canvas.width*percent-4;x++){let k=x*4;if(pixels[k+3]){total+=pixels[k]/(pixels[k+1]+pixels[k+2]);n++;}}return total/n;};
			return {height:parseFloat(getComputedStyle(bar).height),unit:parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-unit')),
				background:getComputedStyle(bar.querySelector('[data-yjcm-progress-backdrop]')).borderImageSource,
				gradientFull:redShare(1),gradientLow:redShare(.3),naturalWidth:img.naturalWidth};
		});
		assert.equal(results.originalStyle.naturalWidth,501);
		assert.match(results.originalStyle.background,/new_timebar_bg_scale9\.png/);
		assert.ok(Math.abs(results.originalStyle.height/results.originalStyle.unit-17)<.1);
		assert.ok(results.originalStyle.gradientLow>results.originalStyle.gradientFull,'裁切右侧金色后剩余部分红色占比更高');
		for (const width of [1280, 1920]) for (const zoom of [1, 1.25]) {
			await page.setViewportSize({ width, height: 720 });
			await page.evaluate(zoom => { ui.window.style.zoom = 1 / zoom; plugin.initOfficialLayout(); }, zoom);
			const geometry = await page.evaluate(() => {
				const w = ui.window.clientWidth, h = ui.window.clientHeight, unit = Math.min(w / 1334, h / 750);
				const expected = 582 * Math.max(1334, Math.min(1750, w / unit - 120)) / 1334 * unit;
				const r = bar.getBoundingClientRect(), wr = ui.window.getBoundingClientRect();
				return { expected, actual: parseFloat(getComputedStyle(bar).width), centerError: r.x + r.width / 2 - wr.x - wr.width / 2, fill: parseFloat(getComputedStyle(bar.firstChild).width), image: parseFloat(getComputedStyle(bar.querySelector("img")).width) };
			});
			for (const value of [geometry.actual, geometry.fill, geometry.image]) assert.ok(Math.abs(value - geometry.expected) < 1, JSON.stringify(geometry));
			assert.ok(Math.abs(geometry.centerError) < 1, JSON.stringify(geometry));
			results.geometry.push({ width, zoom, ...geometry });
		}
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.evaluate(() => { ui.window.style.zoom = 1; plugin.initOfficialLayout(); });
		const states = [];
		for (const data of [449, 224, 132, 131]) {
			const state = await page.evaluate(data => {
				bar.firstChild.data = data; callbacks[0]();
				return { data, percent: parseFloat(bar.firstChild.style.width), visibleWidth: bar.firstChild.getBoundingClientRect().width, imageWidth: bar.querySelector("img").getBoundingClientRect().width, barWidth: bar.getBoundingClientRect().width, src: bar.querySelector("img").src, delay };
			}, data);
			await page.waitForFunction(() => bar.querySelector("img").complete && bar.querySelector("img").naturalWidth === 501);
			assert.ok(Math.abs(state.percent - data / 449 * 100) < 0.001);
			assert.ok(Math.abs(state.imageWidth - state.barWidth) < 1);
			assert.ok(Math.abs(state.visibleWidth - state.barWidth * data / 449) < 1, JSON.stringify(state));
			assert.match(state.src, /\/xf_newTimeBar_3\.png$/);
			assert.equal(state.delay, 200);
			await page.locator("#progress-probe").screenshot({ path: path.join(__dirname, `yjcm-progress-${data}.png`) });
			states.push(state);
		}
		results.states = states;
		results.countdown = await page.evaluate(() => {
			makeProbe(); for (let i = 0; i < 448; i++) callbacks[0]();
			const before = bar.isConnected; callbacks[0](); const after = bar.isConnected;
			const moon = bar.dataset.yjcmMoonProgress === "true" && bar.firstChild.style.width === "100%";
			probe.dispose(); makeProbe("4", false); callbacks[0]();
			const normal = { percent: bar.firstChild.style.width, image: !!bar.querySelector("img") };
			clearInterval(window.timer); bar.remove(); return { before, after, moon, normal };
		});
		assert.deepEqual(results.countdown, { before: true, after: true, moon: true, normal: { percent: "100%", image: true } });
		results.moon = [];
		for (const isolated of [true, false]) {
			const state = await page.evaluate(isolated => {
				makeProbe("4", isolated);
				for (let j = 0; j < 449; j++) callbacks[0]();
				const initial = { data: bar.firstChild.data, width: bar.firstChild.style.width, src: bar.firstChild.querySelector("img").src, connected: bar.isConnected };
				for (let j = 0; j < 5; j++) callbacks[0]();
				const afterFive = bar.firstChild.data;
				for (let j = 5; j < 2132; j++) callbacks[0]();
				const beforeStop = bar.firstChild.data;
				callbacks[0]();
				const stopped = { data: bar.firstChild.data, width: bar.firstChild.style.width, connected: bar.isConnected, timer: isolated ? probe.timer : window.timer ?? null };
				for (let j = 0; j < 1000; j++) callbacks[0]();
				const held = bar.firstChild.data === stopped.data && bar.isConnected;
				if (isolated) probe.dispose();
				else { const previous = bar; game.Jindutiaoplayer(); bar = previous; }
				const removed = !bar.isConnected;
				clearInterval(window.timer); document.getElementById("jindutiaopl")?.remove();
				return { isolated, initial, afterFive, beforeStop, stopped, held, removed };
			}, isolated);
			assert.equal(state.initial.data, 449); assert.equal(state.initial.width, "100%");
			assert.equal(state.initial.connected, true); assert.match(state.initial.src, /\/newTimeBar\.png$/);
			assert.equal(state.afterFive, 448, "5次第二段更新仅消耗原来1次的进度");
			assert.ok(state.beforeStop > 449 * .05);
			assert.deepEqual(state.stopped, { data: 449 * .05, width: "5%", connected: true, timer: null });
			assert.equal(state.held, true); assert.equal(state.removed, true);
			results.moon.push(state);
		}
		// 使用真实计时器完整走过第一段，确认第二段会继续递减，dispose不留计时器。
		results.moonRealTimer = await page.evaluate(async () => {
			lib.config.extension_十周年UI_jindutiaoST = "1";
			const handle = game.Jindutiaoplayer({ id: "moon-real", parent: ui.window });
			for (let j = 0; j < 300 && !handle.bar.dataset.yjcmMoonProgress; j++) await new Promise(resolve => setTimeout(resolve, 10));
			const switched = handle.bar.dataset.yjcmMoonProgress === "true";
			const start = handle.bar.firstChild.data;
			await new Promise(resolve => setTimeout(resolve, 50));
			const advanced = handle.bar.firstChild.data < start;
			const data = handle.bar.firstChild.data;
			handle.dispose(); await new Promise(resolve => setTimeout(resolve, 20));
			lib.config.extension_十周年UI_jindutiaoST = "200";
			return { switched, advanced, stopped: handle.bar.firstChild.data === data, removed: !handle.bar.isConnected, timer: handle.timer };
		});
		assert.deepEqual(results.moonRealTimer, { switched: true, advanced: true, stopped: true, removed: true, timer: null });
		results.moonRendering = [];
		for (const remaining of [100, 50, 5]) {
			await page.evaluate(remaining => {
				makeProbe(); for (let j = 0; j < 449; j++) callbacks[0]();
				for (let j = 0; j < Math.ceil(449 * (1 - remaining / 100) * 5); j++) callbacks[0]();
			}, remaining);
			await page.waitForFunction(() => [...bar.querySelectorAll("img")].every(img => img.complete && img.naturalWidth > 0));
			const rendering = await page.evaluate(() => {
				const fill = bar.firstElementChild, image = fill.querySelector("img");
				return { percent: parseFloat(fill.style.width), barWidth: bar.getBoundingClientRect().width, fillWidth: fill.getBoundingClientRect().width, imageWidth: image.getBoundingClientRect().width, naturalWidth: image.naturalWidth, backgroundWidth: bar.lastElementChild.naturalWidth,
					height:parseFloat(getComputedStyle(bar).height)/parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-unit')),normalBackdropHidden:bar.querySelector('[data-yjcm-progress-backdrop]').hidden };
			});
			assert.ok(Math.abs(rendering.percent - remaining) < .05);
			assert.ok(Math.abs(rendering.imageWidth - rendering.barWidth) < 1, "月光贴图保持整幅宽度，仅裁掉已消耗部分");
			assert.ok(Math.abs(rendering.fillWidth - rendering.barWidth * rendering.percent / 100) < 1);
			assert.equal(rendering.naturalWidth, 520); assert.equal(rendering.backgroundWidth, 522);
			assert.ok(Math.abs(rendering.height-26)<.1&&rendering.normalBackdropHidden);
			await page.locator("#progress-probe").screenshot({ path: path.join(__dirname, `yjcm-moon-progress-${remaining}.png`) });
			results.moonRendering.push({ remaining, ...rendering });
		}
		for (const [style, width, tick, duration] of [["1", 620, "620px", 620], ["2", 400, "300px", 300], ["3", 400, "395px", 395], ["5", 568, "568px", 568]]) {
			const state = await page.evaluate(style => { document.body.dataset.style = "onlineUI"; lib.config.extension_十周年UI_newDecadeStyle = "onlineUI"; makeProbe(style); callbacks[0](); return { width: parseFloat(getComputedStyle(bar).width), tick: bar.firstChild.style.width, images: bar.firstChild.querySelectorAll("img").length }; }, style);
			assert.deepEqual(state, { width, tick, images: 0 }); results.isolation.push(style);
			assert.equal(await page.evaluate(duration => { for (let j = 1; j < duration; j++) callbacks[0](); return !bar.isConnected && !bar.dataset.yjcmMoonProgress; }, duration), true);
		}
		results.otherStyle4=await page.evaluate(()=>{makeProbe('4');return {src:bar.firstChild.querySelector('img').getAttribute('src'),height:getComputedStyle(bar).height,normalBackdrop:!!bar.querySelector('[data-yjcm-progress-backdrop]')};});
		assert.match(results.otherStyle4.src,/xf_newTimeBar_2\.png$/);assert.equal(results.otherStyle4.height,'13px');assert.equal(results.otherStyle4.normalBackdrop,false);
		results.timer = await page.evaluate(async () => {
			probe.dispose(); lib.config.extension_十周年UI_jindutiaoYangshi = "4"; lib.config.extension_十周年UI_jindutiaoST = "10";
			const handle = game.Jindutiaoplayer({ id: "real-timer", parent: ui.window });
			await new Promise(resolve => setTimeout(resolve, 65)); const data = handle.bar.firstChild.data;
			handle.dispose(); await new Promise(resolve => setTimeout(resolve, 30));
			return { advanced: data < 449, stopped: handle.bar.firstChild.data === data, removed: !handle.bar.isConnected };
		});
		assert.deepEqual(results.timer, { advanced: true, stopped: true, removed: true });
		assert.deepEqual(results.errors, []);
		fs.writeFileSync(path.join(__dirname, "yjcm-progress-results.json"), JSON.stringify(results, null, 2));
		console.log("YJCM_PROGRESS_BROWSER_OK", JSON.stringify(results));
	} finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
