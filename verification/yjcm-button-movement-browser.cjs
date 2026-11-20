const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium } = require("./online-player-tips-browser.cjs");
const appRoot = path.resolve(__dirname, "../../..");
const clickSource = fs.readFileSync(path.join(appRoot, "noname/ui/click/index.js"), "utf8");
const controlMethod = clickSource.slice(clickSource.indexOf("  control() {"), clickSource.indexOf("  dialogcontrol() {"));
const initSource = fs.readFileSync(path.join(appRoot, "noname/init/index.js"), "utf8");
const dragFilter = initSource.slice(initSource.indexOf("function createTouchDraggedFilter()"), initSource.indexOf("async function tryLoadCustomStyle"));
const chromeFix = fs.readFileSync(path.join(appRoot, "extension/皮肤切换/js/utils/chrome-fix.js"), "utf8").replace("export function", "function");

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = { cases: [], errors: [] };
	try {
		const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, hasTouch: true });
		page.on("pageerror", error => results.errors.push(error.message));
		await page.route("**/movement-host.js", route => route.fulfill({ contentType: "text/javascript", body:
			"export const lib=window.lib,ui=window.ui,_status=window._status,get={};" }));
		await page.route("**/movement-probe", route => route.fulfill({ contentType: "text/html", body: "<!doctype html>" }));
		await page.goto(`${origin}/movement-probe`);
		await page.setContent(`<!doctype html><meta charset="utf-8">
			<script type="importmap">{"imports":{"noname":"${origin}/movement-host.js"}}</script>
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
			<div id="window"><div id="arena"><div id="dui-controls"><div id="group" class="control lbtn-confirm">
			<div id="button" class="primary"><span>确定</span></div><div id="other" class="primary2">取消</div>
			</div></div></div></div>`);
		await page.evaluate(async ({ origin, controlMethod, dragFilter }) => {
			await Promise.all([...document.querySelectorAll("link")].map(link => link.sheet ? null : new Promise(resolve => link.onload = resolve)));
			document.body.dataset.style = "othersOff";
			window.lib = { config: { extension_十周年UI_newDecadeStyle: "othersOff", touchscreen: true } };
			window._status = { event: {}, dragged: false };
			window.game = { documentZoom: 1 };
			window.ui = { control: document.querySelector("#dui-controls"), click: {} };
			window.count = 0;
			window.mode = "click";
			ui.click.control = Function(`return ({${controlMethod}}).control`)();
			const { controlUpdateLayout } = await import(`${origin}/extension/十周年UI/src/overrides/control.js`);
			const group = document.querySelector("#group");
			for (const node of [...group.childNodes]) if (node.nodeType !== 1) node.remove();
			controlUpdateLayout.call(group);
			group.custom = () => { count++; };
			for (const node of group.children) {
				node.link = node.id;
				for (const type of ["click", "touchend"]) node.addEventListener(type, function (event) {
					if (event.type === mode && !this.classList.contains("disabled")) ui.click.control.call(this);
				});
			}
			// 使用本体实际的body触屏过滤器，避免仅测试一个不会拦拖动的计数监听器。
			Function(`${dragFilter};createTouchDraggedFilter();`)();
			window.installInput = async () => (await import(`${origin}/extension/十周年UI/src/ui/xinsha-button-input.js`)).initXinshaButtonInput();
		}, { origin, controlMethod, dragFilter });
		assert.equal(await page.locator("#button").evaluate(node => node.classList.contains("control")), true);
		const cdp = await page.context().newCDPSession(page);
		const box = id => page.locator(`#${id}`).boundingBox();
		const reset = async mode => {
			await page.evaluate(mode => { window.mode = mode; _status.dragged = false; delete document.querySelector("#group")._doubleclick; }, mode);
		};
		const count = () => page.evaluate(() => window.count);
		const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([x, y, id = 0]) => ({ x, y, id })) });
		// 真实.control子按钮的旧overflow:hidden会裁掉命中层，中心小幅移动到原上沿丢击。
		await reset("click");
		const oldClip = await page.addStyleTag({ content: "#button { overflow:hidden!important; }" });
		let rect = await box("button"), before = await count();
		await page.mouse.move(rect.x + rect.width / 2, rect.y + 8);
		await page.mouse.down();
		await page.mouse.move(rect.x + rect.width / 2 + 3, rect.y + 2);
		await page.mouse.up();
		assert.equal(await count(), before, "old child clipping must reproduce moved mouse miss");
		await oldClip.evaluate(node => node.remove());
		results.reproducedMouseClip = true;

		await reset("touchend");
		rect = await box("button"); before = await count();
		await touch("touchStart", [[rect.x + rect.width / 2, rect.y + rect.height / 2]]);
		await touch("touchMove", [[rect.x + rect.width / 2 + 24, rect.y + rect.height / 2]]);
		await touch("touchEnd", []);
		assert.equal(await count(), before, "body 10px filter must reproduce moved finger miss");
		assert.equal(await page.evaluate(() => _status.dragged), true);
		results.reproducedTouchDrag = true;
		// 加载实际皮切矩形包装器；触摸clientX/Y必须与原生视口矩形比较。
		await page.evaluate(source => { Function(`${source};initChromeFix();`)(); }, chromeFix);
		await page.evaluate(() => window.installInput());
		await page.evaluate(() => window.installInput()); // 重复安装不重复处理。

		for (const zoom of [0.56, 1, 1.5]) for (const action of ["normal", "window", "multi"]) {
			await page.evaluate(({ zoom, action }) => {
				window.documentZoom = zoom;
				document.querySelector("#window").style.zoom = zoom;
				const group = document.querySelector("#group");
				if (action === "normal") delete group.dataset.yjcmAction;
				else group.dataset.yjcmAction = action;
			}, { zoom, action });
			await page.waitForTimeout(150);
			for (const id of ["button", "other"]) {
				await reset("click"); rect = await box(id); before = await count();
				await page.mouse.move(rect.x + rect.width / 2, rect.y + 8);
				await page.mouse.down();
				await page.mouse.move(rect.x + rect.width / 2 + 3, rect.y + 2);
				await page.mouse.up();
				assert.equal(await count(), before + 1, `${zoom}/${action}/${id}: small mouse move`);
				for (const distance of [4, 12, 24]) {
					await reset("touchend"); rect = await box(id); before = await count();
					await touch("touchStart", [[rect.x + rect.width / 2, rect.y + rect.height / 2]]);
					await touch("touchMove", [[rect.x + rect.width / 2 + distance, rect.y + rect.height / 2 + 3]]);
					await touch("touchEnd", []);
					assert.equal(await count(), before + 1, `${zoom}/${action}/${id}: ${distance}px finger movement inside`);
					assert.equal(await page.evaluate(() => _status.dragged), false);
				}
			}
			results.cases.push({ zoom, action, mouse: true, touchDistances: [4, 12, 24] });
		}
		for (const cancel of ["outside", "cancel", "multitouch", "disabled", "event-change"]) {
			await reset("touchend"); rect = await box("button"); before = await count();
			const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
			await touch("touchStart", [[x, y]]);
			if (cancel === "outside") await touch("touchMove", [[rect.x - 20, y]]);
			if (cancel === "multitouch") {
				await touch("touchStart", [[x, y, 0], [x + 30, y, 1]]);
				await touch("touchEnd", [[x, y, 0]]);
			}
			if (cancel === "disabled") await page.locator("#button").evaluate(node => node.classList.add("disabled"));
			if (cancel === "event-change") await page.evaluate(() => { _status.event = {}; });
			await touch(cancel === "cancel" ? "touchCancel" : "touchEnd", []);
			assert.equal(await count(), before, cancel);
			await page.locator("#button").evaluate(node => node.classList.remove("disabled"));
		}
		// 普通滚动与其他风格仍使用本体过滤器，不扩大整个游戏的拖动阈值。
		for (const style of ["othersOff", "onlineUI", "on"]) {
			await reset("touchend");
			await page.evaluate(style => { document.body.dataset.style = style; lib.config.extension_十周年UI_newDecadeStyle = style; }, style);
			rect = await box("button"); before = await count();
			const x = style === "othersOff" ? 30 : rect.x + rect.width / 2, y = style === "othersOff" ? 30 : rect.y + rect.height / 2;
			await touch("touchStart", [[x, y]]);
			await touch("touchMove", [[x + 24, y]]);
			await touch("touchEnd", []);
			assert.equal(await page.evaluate(() => _status.dragged), true, `${style}: native drag outside scope`);
			assert.equal(await count(), before);
		}
		assert.deepEqual(results.errors, []);
		console.log("YJCM_BUTTON_MOVEMENT_OK", JSON.stringify(results));
	} finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
