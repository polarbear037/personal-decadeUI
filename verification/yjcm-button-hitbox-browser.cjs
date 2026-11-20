const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium } = require("./online-player-tips-browser.cjs");

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = { cases: [], errors: [] };
	try {
		const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, hasTouch: true });
		page.on("pageerror", error => results.errors.push(error.message));
		await page.setContent(`<!doctype html><meta charset="utf-8">
			<link rel="stylesheet" href="${origin}/layout/default/layout.css">
			<link rel="stylesheet" href="${origin}/extension/十周年UI/src/styles/layout-xinsha.css">
			<link rel="stylesheet" href="${origin}/extension/十周年UI/ui/styles/base.css">
			<link rel="stylesheet" href="${origin}/extension/十周年UI/ui/styles/lbtn/xinsha.css">
			<style>
			body { --yjcm-unit:1px; --yjcm-action-unit:1px; }
			#window,#arena { position:absolute; inset:0; width:100%; height:100%; }
			#arena > #dui-controls { left:250px!important; top:250px!important; bottom:auto!important;
				right:auto!important; transform:none!important; width:max-content!important; }
			#arena > #dui-controls > .control { opacity:1; margin:0; }
			</style>
			<div id="window"><div id="arena"><div id="dui-controls"><div class="control lbtn-confirm">
			<div id="button" class="primary"><span>确定</span></div><div id="other" class="primary2">取消</div>
			</div></div></div></div>`);
		await page.evaluate(async () => {
			await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map(link =>
				link.sheet ? Promise.resolve() : new Promise(resolve => link.onload = resolve)));
			document.body.dataset.style = "othersOff";
			window.count = 0;
			window.inputType = "click";
			for (const node of document.querySelectorAll("#button,#other")) for (const type of ["click", "touchend"]) node.addEventListener(type, event => {
				if (event.type === inputType && !event.currentTarget.classList.contains("disabled")) count++;
			});
		});
		const button = page.locator("#button");
		const hit = (x, y) => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("#button")?.id === "button", { x, y });
		const readCount = () => page.evaluate(() => count);
		// 先禁用新增命中层，真实鼠标在左边缘按下，复现旧版缩小后的丢击。
		const oldRule = await page.addStyleTag({ content: '#button::after { content:none!important; }' });
		await page.waitForTimeout(150);
		let box = await button.boundingBox();
		await page.mouse.move(box.x + 1, box.y + box.height / 2);
		await page.mouse.down();
		await page.waitForTimeout(150);
		assert.equal(await hit(box.x + 1, box.y + box.height / 2), false);
		await page.mouse.up();
		assert.equal(await readCount(), 0, "old edge press must reproduce missed click");
		results.reproducedOldMiss = true;
		await oldRule.evaluate(node => node.remove());
		await page.waitForTimeout(150);
		// 旧补偿层未继承确认栏 transition:none!important：按钮瞬间缩小，命中层却需100ms。
		const delayedHitLayer = await page.addStyleTag({ content: '#button::after { transition:transform .1s!important; }' });
		box = await button.boundingBox();
		await page.mouse.move(box.x + 1, box.y + box.height / 2);
		await page.mouse.down();
		assert.equal(await hit(box.x + 1, box.y + box.height / 2), false, "old compensation lags behind instant button shrink");
		await page.mouse.up();
		assert.equal(await readCount(), 0);
		results.reproducedTransitionMismatch = true;
		await delayedHitLayer.evaluate(node => node.remove());
		await page.waitForTimeout(150);

		for (const zoom of [1, 1.5]) for (const action of ["normal", "window", "multi"]) {
			await page.evaluate(({ zoom, action }) => {
				document.querySelector("#window").style.zoom = zoom;
				const control = document.querySelector(".control");
				if (action === "normal") delete control.dataset.yjcmAction;
				else control.dataset.yjcmAction = action;
			}, { zoom, action });
			await page.waitForTimeout(600);
			box = await button.boundingBox();
			const points = [
				[box.x + 1, box.y + box.height / 2], [box.x + box.width - 1, box.y + box.height / 2],
				[box.x + box.width / 2, box.y + 1], [box.x + box.width / 2, box.y + box.height - 1],
				[box.x + 1, box.y + 1], [box.x + box.width - 1, box.y + box.height - 1],
			];
			for (const [x, y] of points) {
				const before = await readCount();
				await page.mouse.move(x, y);
				await page.mouse.down();
				// 逐帧检查过渡途中与稳定态，不能只检查最终几何。
				const frames = await page.evaluate(async ({ x, y }) => {
					const samples = [];
					for (let i = 0; i < 10; i++) {
						await new Promise(requestAnimationFrame);
						samples.push(document.elementFromPoint(x, y)?.closest("#button")?.id);
					}
					return samples;
				}, { x, y });
				assert(frames.every(id => id === "button"), `${action}/${zoom}: edge lost during press ${frames}`);
				const pressed = await button.boundingBox();
				assert(Math.abs(pressed.width / box.width - (action === "normal" ? .75 : .95)) < .001);
				await page.mouse.up();
				assert.equal(await readCount(), before + 1, `${action}/${zoom}: exactly one native click`);
				// 恢复途中立即再按一次，原边缘也必须保持可点。
				await page.mouse.down();
				await page.waitForTimeout(120);
				await page.mouse.up();
				assert.equal(await readCount(), before + 2, `${action}/${zoom}: quick second edge click`);
				await page.waitForTimeout(120);
			}
			// 原区域内移动仍可触发；真正移出原区域则取消，不捕获/伪造 click。
			let before = await readCount();
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 1, box.y + 1);
			await page.waitForTimeout(130);
			await page.mouse.up();
			assert.equal(await readCount(), before + 1);
			await page.waitForTimeout(130);
			before = await readCount();
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x - 20, box.y - 20);
			await page.waitForTimeout(130);
			await page.mouse.up();
			assert.equal(await readCount(), before, "moving outside must cancel");
			await page.waitForTimeout(130);
			assert.equal(await hit(box.x - 2, box.y + box.height / 2), false, "no permanent enlarged hit area");
			results.cases.push({ zoom, action, edgeClicks: points.length * 2, moveInside: true, moveOutsideCancelled: true });
		}

		// 取消(primary2)同样立即缩放；普通独立控件则保留100ms过渡，命中层均须同步。
		for (const standalone of [false, true]) {
			await page.evaluate(standalone => {
				const control = document.querySelector(".control");
				control.classList.toggle("lbtn-confirm", !standalone);
				delete control.dataset.yjcmAction;
			}, standalone);
			await page.waitForTimeout(150);
			const cancel = page.locator("#other");
			const rect = await cancel.boundingBox();
			const before = await readCount();
			await page.mouse.move(rect.x + 1, rect.y + 1);
			await page.mouse.down();
			const frames = await cancel.evaluate(async node => {
				const samples = [];
				for (let i = 0; i < 10; i++) {
					const css = getComputedStyle(node), layer = getComputedStyle(node, "::after");
					samples.push({ buttonDuration: css.transitionDuration, layerDuration: layer.transitionDuration });
					await new Promise(requestAnimationFrame);
				}
				return samples;
			});
			assert(frames.every(frame => frame.buttonDuration === frame.layerDuration));
			assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, { x: rect.x + 1, y: rect.y + 1 }), "other");
			await page.mouse.up();
			assert.equal(await readCount(), before + 1);
			results.cases.push({ standalone, cancelEdge: true, synchronizedTransition: true });
		}
		await page.evaluate(() => document.querySelector(".control").classList.add("lbtn-confirm"));
		await page.waitForTimeout(150);
		for (const id of ["button", "other"]) for (const hold of [0, 20]) {
			const rect = await page.locator(`#${id}`).boundingBox();
			const before = await readCount();
			await page.mouse.move(rect.x + 1, rect.y + 1);
			await page.mouse.down();
			if (hold) await page.waitForTimeout(hold);
			await page.mouse.up();
			assert.equal(await readCount(), before + 1, `${id}: fast ${hold}ms edge click`);
		}
		results.fastConfirmationClicks = 4;

		// 触屏走 touchend 原生入口，同时确认兼容 click 不会重复处理。
		const cdp = await page.context().newCDPSession(page);
		await page.evaluate(() => { inputType = "touchend"; });
		box = await button.boundingBox();
		let before = await readCount();
		await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 1, y: box.y + 1 }] });
		await page.waitForTimeout(150);
		assert.equal(await hit(box.x + 1, box.y + 1), true);
		await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
		assert.equal(await readCount(), before + 1);
		await page.waitForTimeout(150);
		await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 1, y: box.y + 1 }] });
		await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
		assert.equal(await readCount(), before + 1);
		results.touch = { edge: true, cancel: true };

		await page.evaluate(() => { inputType = "click"; document.querySelector("#button").classList.add("disabled"); });
		await page.waitForTimeout(150);
		before = await readCount();
		await button.click();
		assert.equal(await readCount(), before);
		results.disabled = true;
		for (const style of ["onlineUI", "on"]) {
			await page.evaluate(style => { document.body.dataset.style = style; document.querySelector("#button").classList.remove("disabled"); }, style);
			assert.equal(await button.evaluate(node => getComputedStyle(node, "::after").content), "none");
			results.cases.push({ style, noHitLayer: true });
		}
		assert.deepEqual(results.errors, []);
		fs.writeFileSync(path.join(__dirname, "yjcm-button-hitbox-results.json"), JSON.stringify(results, null, 2));
		console.log("YJCM_BUTTON_HITBOX_OK", JSON.stringify(results));
	} finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
