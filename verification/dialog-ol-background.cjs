const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const runtime = "C:/Users/Thunder/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/";
const { chromium } = require(runtime + "playwright");
const { PNG } = require(runtime + "pngjs");
const root = path.resolve(__dirname, "..");
const appRoot = path.resolve(root, "../..");
const server = http.createServer((request, response) => {
	const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
	const file = path.resolve(appRoot, "." + pathname);
	if (pathname !== "/" && file.startsWith(appRoot + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
		const type = file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "image/png";
		response.writeHead(200, { "content-type": type });
		response.end(fs.readFileSync(file));
		return;
	}
	if (pathname !== "/") { response.writeHead(404); response.end(); return; }
	response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
	response.end(`<!doctype html><meta charset="utf-8">
		<link rel="stylesheet" href="/layout/default/layout.css">
		<link rel="stylesheet" href="/extension/十周年UI/src/styles/layout.css">
		<style>html,body{background:rgb(255,0,255)}
		*,*::before{animation:none!important;transition:none!important}
		#frame{position:fixed;left:0;top:0;container-type:size;transform:translateZ(0);overflow:hidden}
		.body-probe{height:80px}</style>
		<div id="frame"><div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_ol">
		<div class="dialog dialog-ol-layout"><div class="content-container"><div class="content"><div class="body-probe"></div></div></div></div>
		</div></div></div>
		<script type="module">
		import { updateDialogOlLayout } from '/extension/十周年UI/src/ui/dialog-ol-layout.js';
		window.updateFrame = (mobile = false) => {
			const dialog = document.querySelector('.dialog'); dialog.forcebutton = true;
			updateDialogOlLayout(dialog, document.querySelector('#arena'), document.querySelector('#window').offsetHeight, mobile);
		};
		window.ready = true;
		</script>`);
});

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	try {
		const page = await browser.newPage();
		const errors = [];
		page.on("pageerror", error => errors.push(error.message));
		let scenarios = 0;
		for (const width of [1280, 1920]) {
			await page.setViewportSize({ width, height: 1080 });
			await page.goto(`http://127.0.0.1:${server.address().port}/`);
			await page.waitForFunction(() => window.ready);
			await page.evaluate(async () => {
				const image = new Image();
				image.src = "/extension/十周年UI/image/ui/dialog/dialog_ol.png";
				await image.decode();
			});
			for (const zoom of [1, 1.65]) for (const sidebar of ["", "leftbar", "rightbar"]) for (const inset of [0, 80]) for (const arenaContainer of [false, true]) {
				await page.evaluate(({ width, zoom, sidebar, inset, arenaContainer }) => {
					document.body.style.zoom = zoom;
					const frame = document.querySelector('#frame');
					frame.style.width = (width - inset * 2) / zoom + 'px';
					frame.style.height = 1080 / zoom + 'px';
					frame.style.left = inset / zoom + 'px';
					document.querySelector('#window').className = sidebar;
					document.querySelector('#arena').style.containerType = arenaContainer ? 'size' : 'normal';
					window.updateFrame();
				}, { width, zoom, sidebar, inset, arenaContainer });
				await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
				const box = await page.locator(".dialog").boundingBox();
				const viewport = await page.locator("#window").boundingBox();
				assert.ok(Math.abs(box.x - viewport.x) < 1, JSON.stringify({ width, zoom, sidebar, inset, arenaContainer, box, viewport }));
				assert.ok(Math.abs(box.width - viewport.width) < 1, "frame width must match game viewport");
				const screenshot = await page.screenshot();
				const png = PNG.sync.read(screenshot);
				// The opaque middle of the real frame must paint the entire horizontal span.
				const y = Math.floor(box.y + box.height / 2);
				let gaps = 0;
				for (let x = Math.ceil(viewport.x) + 1; x < Math.floor(viewport.x + viewport.width) - 1; x++) {
					const offset = (y * png.width + x) * 4;
					if (png.data[offset] === 255 && png.data[offset + 1] === 0 && png.data[offset + 2] === 255) gaps++;
				}
				assert.equal(gaps, 0, `background leaves horizontal gaps: ${JSON.stringify({ width, zoom, sidebar, inset, gaps })}`);
				scenarios++;
				if (width === 1920 && zoom === 1.65 && sidebar === "leftbar" && inset === 0) fs.writeFileSync(path.join(__dirname, "dialog-ol-background.png"), screenshot);
			}
			// Resize the real game viewport without calling ui.update: ResizeObserver must refresh geometry.
			await page.locator('#frame').evaluate(node => { node.style.width = '700px'; node.style.left = '100px'; });
			await page.waitForFunction(() => {
				const box = document.querySelector('.dialog').getBoundingClientRect();
				const viewport = document.querySelector('#window').getBoundingClientRect();
				return Math.abs(box.x - viewport.x) < 1 && Math.abs(box.width - viewport.width) < 1;
			});
			// An overflowing dialog must stay inside the window and scroll to its last row.
			await page.evaluate(() => {
				const arena = document.querySelector('#arena');
				arena.classList.add('dui-mobile');
				const dialog = arena.querySelector('.dialog');
				dialog.querySelector('.body-probe').style.height = '1600px';
				dialog.querySelector('.content').insertAdjacentHTML('beforeend', '<div class="caption">最后一项</div>');
				updateFrame(true);
			});
			const tall = await page.evaluate(async () => {
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
				const dialog = document.querySelector('.dialog');
				const container = dialog.querySelector('.content-container');
				const last = dialog.querySelector('.caption');
				container.scrollTop = container.scrollHeight;
				return {
					top: dialog.getBoundingClientRect().top - document.querySelector('#window').getBoundingClientRect().top,
					scrollTop: container.scrollTop,
					lastVisible: last.getBoundingClientRect().bottom <= container.getBoundingClientRect().bottom + 1,
				};
			});
			assert.ok(Math.abs(tall.top) < 1, 'tall dialog must stop at the game window top: ' + JSON.stringify(tall));
			assert.ok(tall.scrollTop > 0 && tall.lastVisible, 'last option remains reachable: ' + JSON.stringify(tall));
			await page.locator('#frame').evaluate(node => { node.style.height = '500px'; node.style.top = '30px'; });
			await page.waitForFunction(() => {
				const dialog = document.querySelector('.dialog').getBoundingClientRect();
				const viewport = document.querySelector('#window').getBoundingClientRect();
				return Math.abs(dialog.top - viewport.top) < 1;
			});
		}
		assert.deepEqual(errors, []);
		console.log(`DIALOG_OL_BACKGROUND_OK: ${scenarios} real-layout cases (arena margins, zoom, sidebars, inset frame), viewport resize, top limit and scroll; 0 page errors`);
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
})().catch(error => { console.error(error); process.exitCode = 1; });
