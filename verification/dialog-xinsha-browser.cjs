const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require(path.join(require("node:os").homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
const root = path.resolve(__dirname, "../../..");
const base = "/extension/十周年UI/";
const server = http.createServer((req, res) => {
	if (req.url === "/") {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		return res.end('<!doctype html><meta charset="utf-8"><body><div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_xinsha"><div class="dialog"><div class="content-container"><div class="content"><div class="caption">测试技能：请选择一张牌</div><div class="probe" style="height:160px">对话框内容</div></div></div></div></div></div>');
	}
	const file = path.resolve(root, "." + decodeURIComponent(new URL(req.url, "http://local").pathname));
	if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
	fs.readFile(file, (error, data) => {
		if (error) return res.writeHead(404).end();
		res.setHeader("Content-Type", { ".css": "text/css", ".js": "text/javascript", ".png": "image/png" }[path.extname(file)] || "application/octet-stream");
		res.end(data);
	});
});

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	try {
		let cases = 0;
		for (const style of ["on", "off", "othersOff", "onlineUI", "babysha", "codename"]) {
			const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
			await page.goto(`http://127.0.0.1:${server.address().port}/`);
			await page.addStyleTag({ url: "/layout/default/layout.css" });
			await page.addStyleTag({ url: "/layout/default/menu.css" });
			await page.addStyleTag({ url: base + "ui/styles/base.css" });
			await page.evaluate(async ({ base, style }) => {
				const { getStyleFile } = await import(base + "src/styles/style-route.js");
				for (const name of ["layout", "animation"]) {
					const link = document.createElement("link"); link.rel = "stylesheet";
					link.href = base + "src/styles/" + getStyleFile(name, style);
					document.head.appendChild(link);
					await new Promise((resolve, reject) => { link.onload = resolve; link.onerror = reject; });
				}
				window.frameLayout = await import(base + "src/ui/dialog-ol-layout.js");
				window.arena = document.querySelector("#arena");
				window.dialog = document.querySelector(".dialog");
				dialog.forcebutton = true;
				dialog.content = dialog.querySelector(".content");
				window.refresh = () => frameLayout.updateDialogOlLayout(dialog, arena);
				refresh();
				const image = new Image(); image.src = base + "image/ui/dialog/dialog_xinsha.png";
				await image.decode();
				if (image.naturalWidth !== 1696 || image.naturalHeight !== 392) throw Error("Wrong source image dimensions");
				image.src = base + "image/ui/dialog/dialog_xinsha_title.png";
				await image.decode();
				if (image.naturalWidth !== 295 || image.naturalHeight !== 37) throw Error("Wrong title image dimensions");
			}, { base, style });
			await page.evaluate(() => document.fonts.ready);
			for (const zoom of [1, 1.5]) for (const sidebar of ["", "leftbar", "rightbar"]) {
				await page.evaluate(({ zoom, sidebar }) => {
					document.body.style.zoom = zoom;
					document.querySelector("#window").className = sidebar;
					refresh();
				}, { zoom, sidebar });
				await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
				const result = await page.evaluate(() => {
					const box = dialog.getBoundingClientRect(), viewport = arena.parentElement.getBoundingClientRect();
					const frame = getComputedStyle(dialog, "::before");
					const caption = dialog.querySelector(".caption"), titleBox = caption.getBoundingClientRect();
					return { x: box.x - viewport.x, width: box.width - viewport.width, height: box.height, source: frame.borderImageSource, title: caption.textContent, titleImage: getComputedStyle(caption).backgroundImage, centered: Math.abs(titleBox.left + titleBox.width / 2 - (box.left + box.width / 2)) < 1, footer: dialog.querySelector(".dialog-ol-footer")?.textContent };
				});
				assert.ok(Math.abs(result.x) < 1 && Math.abs(result.width) < 1 && result.height > 100, JSON.stringify({ style, zoom, sidebar, result }));
				assert.ok(result.source.endsWith('/image/ui/dialog/dialog_xinsha.png")'));
				assert.equal(result.title, "测试技能");
				assert.equal(result.footer, "请选择一张牌");
				assert.ok(result.titleImage.includes("dialog_xinsha_title.png") && result.centered, JSON.stringify(result));
				cases++;
			}
			if (style === "othersOff") {
				await page.evaluate(() => { document.body.style.zoom = 1; arena.parentElement.className = ""; refresh(); });
				await page.screenshot({ path: path.join(__dirname, "dialog-xinsha-browser.png") });
			}
			await page.evaluate(() => { dialog.querySelector(".probe").style.height = "1600px"; refresh(); });
			await page.waitForFunction(() => {
				const container = dialog.querySelector(".content-container");
				return container.scrollHeight > container.clientHeight && Math.abs(dialog.getBoundingClientRect().top - arena.parentElement.getBoundingClientRect().top) < 1;
			});
			for (const excluded of ["dclieqiong", "online-faction-dialog", "bosscharacter", "noupdate"]) {
				assert.equal(await page.evaluate(excluded => { dialog.classList.add(excluded); const matched = refresh(); dialog.classList.remove(excluded); refresh(); return matched; }, excluded), false);
			}
			if (style === "onlineUI") {
				const ol = await page.evaluate(() => {
					arena.dataset.loadingStyle = "dialog_ol"; refresh();
					return { title: dialog.querySelector(".caption").textContent, footer: dialog.querySelector(".dialog-ol-footer")?.textContent, source: getComputedStyle(dialog, "::before").borderImageSource };
				});
				assert.equal(ol.title, "测试技能");
				assert.equal(ol.footer, "请选择一张牌");
				assert.ok(ol.source.includes("dialog_ol.png"));
				await page.evaluate(() => { arena.dataset.loadingStyle = "dialog_xinsha"; refresh(); });
				assert.equal(await page.evaluate(() => dialog.querySelector(".caption").textContent), "测试技能");
				assert.equal(await page.evaluate(() => dialog.querySelector(".dialog-ol-footer").textContent), "请选择一张牌");
			}
			await page.evaluate(() => { arena.dataset.loadingStyle = "off"; refresh(); });
			assert.equal(await page.evaluate(() => dialog.classList.contains("dialog-ol-layout")), false);
			assert.deepEqual(errors, []);
			await page.close();
		}
		console.log(`DIALOG_XINSHA_OK: ${cases} width/zoom/sidebar cases, 6 style routes, tall content scroll, native title, exclusions, OL title/footer regression and theme cleanup; 0 page errors/failed requests`);
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
})().catch(error => { console.error(error); process.exitCode = 1; });
