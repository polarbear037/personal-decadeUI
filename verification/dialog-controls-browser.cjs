const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("C:/Users/Thunder/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const moduleFiles = new Map([
	["/src/ui/dialog-ol-controls.js", fs.readFileSync(path.join(root, "src/ui/dialog-ol-controls.js"))],
	["/src/ui/dialog-ol-layout.js", fs.readFileSync(path.join(root, "src/ui/dialog-ol-layout.js"))],
	["/src/styles/dialog.css", fs.readFileSync(path.join(root, "src/styles/dialog.css"))],
	["/layout/default/layout.css", fs.readFileSync(path.resolve(root, "../../layout/default/layout.css"))],
]);
const html = `<!doctype html>
<meta charset="utf-8">
<link rel="stylesheet" href="/layout/default/layout.css">
<link rel="stylesheet" href="/src/styles/dialog.css">
<style>
	html, body { margin: 0; width: 100%; height: 100%; background: #211a16; color: #fff; }
	#window { position: relative; width: 100%; height: 100%; }
	#arena { position: absolute; inset: 0; overflow: hidden; }
	#arena > .dialog { position: absolute; inset: 100px auto auto 100px; width: 500px; height: 250px; overflow: visible; background: #382d25; }
	#arena > .dialog.no-background { background: none !important; }
	#arena > .dialog.no-background::before, #arena > .dialog.before-hidden::before { display: none !important; }
	#arena > .dialog.before-content-none::before { content: none !important; }
	#arena > .dialog.before-border-none::before { border-image: none !important; }
	.dialog.hidden { opacity: 0; pointer-events: none; }
	.card { width: 96px; height: 135px; background: #9a795a; }
	.dialog-ol-restore { width: 120px; height: 40px; top: 20px; left: 20px; }
	.dialog.dialog-ol-controls-no-caption > .dialog-ol-collapse { width: 32px; height: 32px; }
</style>
<div id="window"><div id="arena"></div></div>
<script type="module">
import { syncDialogOlControls } from "/src/ui/dialog-ol-controls.js";
import { updateDialogOlLayout } from "/src/ui/dialog-ol-layout.js";
window.syncDialogOlControls = syncDialogOlControls;
window.updateDialogOlLayout = (dialog, bodyHeight = 600, mobile = false) => updateDialogOlLayout(dialog, document.querySelector("#arena"), bodyHeight, mobile);
window.controlsReady = true;
window.setTheme = theme => {
	const arena = document.querySelector("#arena");
	arena.className = theme === "default" ? "" : "decadeUI";
	if (theme === "default") arena.removeAttribute("data-loading-style");
	else arena.setAttribute("data-loading-style", theme);
};
window.makeDialog = ({ id, caption = "nested", addNewRow = false, withButtons = true, withUpdate = true, height = 250, extraClass = "" }) => {
	const arena = document.querySelector("#arena");
	const dialog = document.createElement("div");
	dialog.id = id;
	dialog.className = "dialog" + (addNewRow ? " addNewRow" : "") + (extraClass ? " " + extraClass : "");
	dialog.style.setProperty("--dialog-ol-height", height + "px");
	if (extraClass.includes("native-color")) dialog.style.setProperty("background-color", "rgb(40, 30, 20)", "important");
	if (extraClass.includes("native-gradient")) dialog.style.setProperty("background-image", "linear-gradient(rgb(40, 30, 20), rgb(40, 30, 20))", "important");
	if (caption === "nested") {
		dialog.innerHTML = '<div class="content-container"><div class="content"><div class="caption">测试标题</div><div class="body-probe">内容</div></div></div>';
	} else if (caption === "nested-long") {
		dialog.innerHTML = '<div class="content-container"><div class="content"><div class="caption">标题第一行<br>标题第二行<br>标题第三行<br>标题第四行</div><div class="body-probe">内容</div></div></div>';
	} else if (caption === "direct-long") {
		dialog.innerHTML = '<div class="caption">直接标题第一行<br>直接标题第二行<br>直接标题第三行<br>直接标题第四行</div><div class="content"><div class="body-probe">内容</div></div>';
	} else if (caption === "nested-only") {
		dialog.innerHTML = '<div class="content-container"><div class="content"><div class="caption">测试标题</div></div></div>';
	} else if (caption === "direct") {
		dialog.innerHTML = '<div class="caption">直接标题</div><div class="content"><div class="body-probe">内容</div></div>';
	} else if (caption === "direct-only") {
		dialog.innerHTML = '<div class="caption">直接标题</div>' + (withButtons ? '<div class="content"></div>' : "");
	} else {
		dialog.innerHTML = '<div class="content"><div class="body-probe">无标题内容</div></div>';
	}
	let card;
	if (withButtons) {
		card = document.createElement("div");
		card.className = "card selected";
		card.dataset.preserved = "true";
		const content = dialog.querySelector(".content") || dialog;
		const buttons = document.createElement("div");
		buttons.className = "buttons";
		buttons.appendChild(card);
		content.appendChild(buttons);
	}
	dialog.buttons = withButtons && addNewRow ? [card] : [];
	dialog.show = function () { this.classList.remove("hidden"); this.dataset.visible = "true"; };
	dialog.hide = function () { this.classList.add("hidden"); this.dataset.visible = "false"; };
	dialog.open = function () { this.show(); };
	dialog.close = function () { this.remove(); };
	dialog.delete = function () { this.remove(); };
	arena.appendChild(dialog);
	const update = withUpdate ? () => syncDialogOlControls(dialog, arena, document.querySelector("#window")) : undefined;
	syncDialogOlControls(dialog, arena, document.querySelector("#window"), update);
	window.activeDialog = dialog;
	window.preservedCard = card;
	return dialog;
};
window.resyncActiveDialog = () => syncDialogOlControls(window.activeDialog, document.querySelector("#arena"), document.querySelector("#window"));
window.addEventListener("resize", window.resyncActiveDialog);
</script>`;

const transparentPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p5sAAAAASUVORK5CYII=", "base64");
const server = http.createServer((request, response) => {
	const pathname = new URL(request.url, "http://127.0.0.1").pathname;
	if (pathname === "/") {
		response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
		response.end(html);
		return;
	}
	const module = moduleFiles.get(pathname);
	if (module) {
		response.writeHead(200, { "content-type": pathname.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8" });
		response.end(module);
		return;
	}
	if (pathname.endsWith(".png")) {
		response.writeHead(200, { "content-type": "image/png" });
		response.end(transparentPng);
		return;
	}
	response.writeHead(404);
	response.end();
});

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
		const pageErrors = [];
		page.on("pageerror", error => pageErrors.push(error.message));
		await page.goto(`http://127.0.0.1:${server.address().port}/`);
		await page.waitForFunction(() => window.controlsReady);

		const create = async options => {
			await page.evaluate(options => window.makeDialog(options), options);
			return page.locator(`#${options.id}`);
		};
		const assertCollapsed = async dialog => {
			assert.equal(await dialog.evaluate(node => node.dataset.visible), "false");
			assert.equal(await dialog.evaluate(node => node.classList.contains("hidden")), true, "fixture uses the engine hidden class");
			assert.equal(await dialog.locator(".dialog-ol-collapse").isHidden(), true);
			assert.equal(await page.locator(".dialog-ol-restore").isVisible(), true);
			assert.equal(await page.locator(".dialog-ol-restore").innerText(), "显示弹窗");
		};
		const assertRestored = async dialog => {
			assert.equal(await dialog.evaluate(node => node.dataset.visible), "true");
			assert.equal(await dialog.locator(".dialog-ol-collapse").isVisible(), true);
			assert.equal(await page.locator(".dialog-ol-restore").isVisible(), false);
		};
		const assertCaptionAnchored = async (dialog, label) => {
			const geometry = await dialog.evaluate(node => {
				const dialogRect = node.getBoundingClientRect();
				const caption = node.querySelector(":scope > .content-container > .content > .caption, :scope > .content > .caption, :scope > .caption");
				const captionRect = caption.getBoundingClientRect();
				const captionStyle = getComputedStyle(caption);
				const body = node.querySelector(".body-probe");
				const buttons = node.querySelector(":scope > .content-container > .content > .buttons, :scope > .content > .buttons");
				return {
					captionTop: captionRect.top - dialogRect.top,
					captionBottom: captionRect.bottom - dialogRect.top,
					captionHeight: captionRect.height,
					captionMarginTop: parseFloat(captionStyle.marginTop),
					captionPaddingBottom: captionStyle.paddingBottom,
					contentDivMarginTop: captionStyle.getPropertyValue("--contentdiv-margin-top").trim(),
					onlyChild: caption.matches(":only-child"),
					inContent: !!caption.closest(".content"),
					bodyTop: body ? body.getBoundingClientRect().top - dialogRect.top : null,
					buttonsTop: buttons ? buttons.getBoundingClientRect().top - dialogRect.top : null,
					position: getComputedStyle(caption).position,
				};
			});
			assert.equal(geometry.position, "relative", label + ": caption remains in normal document flow");
			assert.ok(Math.abs(geometry.captionTop - geometry.captionMarginTop) <= 0.1, label + ": caption follows the current theme top spacing " + JSON.stringify(geometry));
			if (geometry.inContent) assert.equal(geometry.contentDivMarginTop, "8px", label + ": real base layout margin variable remains readable");
			if (geometry.onlyChild) assert.equal(geometry.captionPaddingBottom, "8px", label + ": real only-child caption padding remains active");
			if (geometry.bodyTop !== null) assert.ok(geometry.bodyTop >= geometry.captionBottom - 0.5, label + ": body stays below caption " + JSON.stringify(geometry));
			if (geometry.buttonsTop !== null) assert.ok(geometry.buttonsTop >= geometry.captionBottom - 0.5, label + ": buttons stay below caption " + JSON.stringify(geometry));
			if (label.includes("long")) assert.ok(geometry.captionHeight >= 80, label + ": multiline caption grows naturally " + JSON.stringify(geometry));
		};

		await page.evaluate(() => window.setTheme("dialog_ol"));
		const olDialog = await create({ id: "ol-dialog", addNewRow: true, caption: "nested" });
		assert.equal(await olDialog.evaluate(node => node.classList.contains("dialog-ol-layout")), true);
		await olDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(olDialog);
		assert.equal(await olDialog.locator(".card.selected").count(), 1, "OL collapse retains selected DOM");
		assert.equal(await olDialog.evaluate(node => node.querySelector(".card.selected") === window.preservedCard), true);
		await page.evaluate(() => window.resyncActiveDialog());
		await page.setViewportSize({ width: 1180, height: 680 });
		await assertCollapsed(olDialog);
		assert.equal(await olDialog.locator(".card.selected").count(), 1);
		await page.locator(".dialog-ol-restore").click();
		await assertRestored(olDialog);
		await assertCaptionAnchored(olDialog, "nested caption at 250px");
		await olDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(olDialog);
		await olDialog.evaluate(node => node.show());
		await assertRestored(olDialog);
		await olDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(olDialog);
		await olDialog.evaluate(node => node.open());
		await assertRestored(olDialog);

		for (const height of [100, 240, 450]) {
			for (const caption of ["nested", "direct", "nested-only", "direct-only", "nested-long", "direct-long"]) {
				for (const withButtons of [false, true]) {
					const id = `caption-${height}-${caption}-${withButtons}`;
					const dialog = await create({ id, caption, height, addNewRow: true, withButtons });
					await assertCaptionAnchored(dialog, id);
					await dialog.evaluate(node => node.delete());
				}
			}
		}

		const measuredDialog = await create({ id: "measured-frame-dialog", caption: "nested-long", addNewRow: true, height: 120 });
		const measureFrameLayout = async dialog => dialog.evaluate(node => {
			const content = node.querySelector(":scope > .content-container > .content");
			const caption = content.querySelector(":scope > .caption");
			const body = content.querySelector(":scope > .body-probe");
			const buttons = content.querySelector(":scope > .buttons");
			const dialogRect = node.getBoundingClientRect();
			const frameStyle = getComputedStyle(node, "::before");
			const contentRect = content.getBoundingClientRect();
			const captionRect = caption.getBoundingClientRect();
			const bodyRect = body?.getBoundingClientRect();
			const buttonsRect = buttons?.getBoundingClientRect();
			const edgeProbe = document.createElement("div");
			edgeProbe.style.cssText = "position:absolute;visibility:hidden;width:0;height:var(--dialog-ol-edge-bottom, 0px);";
			node.appendChild(edgeProbe);
			const configuredEdgeY = parseFloat(getComputedStyle(edgeProbe).height) || 0;
			edgeProbe.remove();
			const hasBodyOrButtons = Array.from(content.children).some(child => !child.classList.contains("caption"));
			const hasVisibleFrame = frameStyle.content !== "none" && frameStyle.display !== "none" && frameStyle.visibility !== "hidden" && frameStyle.borderImageSource !== "none";
			const edgeY = hasBodyOrButtons && hasVisibleFrame ? configuredEdgeY : 0;
			return {
				height: dialogRect.height,
				contentHeight: content.scrollHeight,
				contentTop: contentRect.top - dialogRect.top,
				captionTop: captionRect.top - dialogRect.top,
				captionMarginTop: parseFloat(getComputedStyle(caption).marginTop),
				captionBottom: captionRect.bottom - dialogRect.top,
				bodyTop: bodyRect ? bodyRect.top - dialogRect.top : null,
				bodyBottom: bodyRect ? bodyRect.bottom - dialogRect.top : null,
				buttonsTop: buttonsRect ? buttonsRect.top - dialogRect.top : null,
				buttonsBottom: buttonsRect ? buttonsRect.bottom - dialogRect.top : null,
				edgeY,
				frameDisplay: frameStyle.display,
				frameContent: frameStyle.content,
				frameBorderImageSource: frameStyle.borderImageSource,
				position: getComputedStyle(caption).position,
			};
		});
		const beforeMeasure = await measureFrameLayout(measuredDialog);
		assert.equal(await measuredDialog.evaluate(node => window.updateDialogOlLayout(node)), true, "real OL layout update measures the framed dialog");
		const afterMeasure = await measureFrameLayout(measuredDialog);
		assert.ok(afterMeasure.edgeY > 0, "theme frame edge resolves from --dialog-ol-edge-bottom");
		assert.ok(afterMeasure.height > beforeMeasure.height, "measured height preserves frame padding after content-container starts at zero");
		assert.ok(Math.abs(afterMeasure.height - Math.min(afterMeasure.contentHeight, 270) - afterMeasure.edgeY) <= 1, "measured dialog adds only the bottom frame edge to the content height " + JSON.stringify(afterMeasure));
		assert.equal(afterMeasure.position, "relative");
		assert.ok(Math.abs(afterMeasure.captionTop - afterMeasure.captionMarginTop) <= 0.1, "layout measurement keeps current theme caption spacing");
		assert.ok(afterMeasure.bodyTop >= afterMeasure.captionBottom, "long caption naturally pushes body down after measurement");
		assert.ok(afterMeasure.buttonsTop >= afterMeasure.captionBottom, "long caption naturally pushes buttons down after measurement");
		assert.ok(afterMeasure.bodyBottom <= afterMeasure.height - afterMeasure.edgeY + 1, "body remains inside the dialog content area");
		const buttonsReachable = await measuredDialog.evaluate(node => {
			const container = node.querySelector(".content-container");
			container.scrollTop = container.scrollHeight;
			return node.querySelector(".buttons").getBoundingClientRect().bottom <= container.getBoundingClientRect().bottom + 1;
		});
		assert.ok(buttonsReachable, "buttons remain reachable at the end of the scroll area");
		await measuredDialog.evaluate(node => node.delete());

		const noFrameMeasureDialog = await create({ id: "measured-no-frame-dialog", caption: "nested-long", addNewRow: true, withButtons: true, height: 120, extraClass: "before-hidden" });
		assert.equal(await noFrameMeasureDialog.evaluate(node => window.updateDialogOlLayout(node)), true);
		const noFrameGeometry = await measureFrameLayout(noFrameMeasureDialog);
		assert.equal(noFrameGeometry.edgeY, 0, "hidden frame does not add decorative edge space " + JSON.stringify(noFrameGeometry));
		assert.ok(noFrameGeometry.height <= Math.min(noFrameGeometry.contentHeight, 270) + 1, "no-frame layout does not add exaggerated edge padding");
		await noFrameMeasureDialog.evaluate(node => node.delete());

		const titleOnlyMeasureDialog = await create({ id: "measured-title-only-dialog", caption: "nested-only", addNewRow: true, withButtons: false, height: 120 });
		assert.equal(await titleOnlyMeasureDialog.evaluate(node => window.updateDialogOlLayout(node)), true);
		const titleOnlyGeometry = await measureFrameLayout(titleOnlyMeasureDialog);
		assert.equal(titleOnlyGeometry.edgeY, 0, "caption-only content does not reserve decorative frame padding");
		assert.ok(titleOnlyGeometry.height <= 100, "caption-only dialog avoids exaggerated empty space");
		assert.ok(Math.abs(titleOnlyGeometry.captionTop - titleOnlyGeometry.captionMarginTop) <= 0.1);
		await titleOnlyMeasureDialog.evaluate(node => node.delete());

		for (const [index, extraClass] of ["no-background", "before-hidden", "before-content-none", "before-border-none", "prompt"].entries()) {
			const id = `no-ol-background-${index}`;
			const dialog = await create({ id, caption: "nested", addNewRow: true, extraClass });
			assert.equal(await dialog.locator(".dialog-ol-collapse").count(), 0, extraClass + ": no collapse control without a rendered frame");
			assert.equal(await page.locator(".dialog-ol-restore").count(), 0, extraClass + ": no orphan restore control");
			await assertCaptionAnchored(dialog, extraClass + " caption remains positioned without an arrow");
			await dialog.evaluate(node => node.delete());
		}
		for (const [index, extraClass, description] of [["color", "native-color", "visible element color"], ["image", "native-gradient", "visible element background image"]]) {
			const dialog = await create({ id: `native-background-${index}`, caption: "nested", addNewRow: true, extraClass: extraClass + " before-hidden" });
			assert.equal(await dialog.locator(".dialog-ol-collapse").count(), 1, description + " is a valid OL dialog background");
			await dialog.locator(".dialog-ol-collapse").click();
			await assertCollapsed(dialog);
			await page.evaluate(() => window.resyncActiveDialog());
			await assertCollapsed(dialog);
			await page.locator(".dialog-ol-restore").click();
			await assertRestored(dialog);
			await dialog.locator(".dialog-ol-collapse").click();
			await assertCollapsed(dialog);
			await dialog.evaluate(node => {
				node.classList.remove("native-color", "native-gradient");
				node.style.removeProperty("background-color");
				node.style.removeProperty("background-image");
			});
			await page.evaluate(() => window.resyncActiveDialog());
			assert.equal(await dialog.evaluate(node => node.dataset.visible), "true", description + " removal restores hidden dialog");
			assert.equal(await dialog.locator(".dialog-ol-collapse").count(), 0, description + " removal clears arrow");
			assert.equal(await page.locator(".dialog-ol-restore").count(), 0, description + " removal clears restore control");
			await dialog.evaluate(node => node.delete());
		}

		const disappearingFrameDialog = await create({ id: "disappearing-frame", caption: "nested", addNewRow: true });
		await disappearingFrameDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(disappearingFrameDialog);
		await disappearingFrameDialog.evaluate(node => node.classList.add("before-hidden"));
		await page.evaluate(() => window.resyncActiveDialog());
		assert.equal(await disappearingFrameDialog.evaluate(node => node.dataset.visible), "true", "losing the frame restores a collapsed dialog");
		assert.equal(await disappearingFrameDialog.locator(".dialog-ol-collapse").count(), 0, "losing the frame removes the arrow");
		assert.equal(await page.locator(".dialog-ol-restore").count(), 0, "losing the frame removes the restore control");

		await page.evaluate(() => window.setTheme("onlineUI"));
		const onlineDialog = await create({ id: "online-dialog", caption: "direct", addNewRow: false });
		assert.equal(await onlineDialog.evaluate(node => node.classList.contains("dialog-ol-layout")), false);
		assert.equal(await onlineDialog.locator(":scope > .caption .dialog-ol-collapse").count(), 1, "direct caption gets the collapse button");
		assert.equal(await onlineDialog.locator(".dialog-ol-collapse").evaluate(node => getComputedStyle(node).pointerEvents), "auto");
		await onlineDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(onlineDialog);
		await page.locator(".dialog-ol-restore").click();
		await assertRestored(onlineDialog);

		await page.evaluate(() => window.setTheme("default"));
		const fallbackDialog = await create({ id: "fallback-dialog", caption: "none", addNewRow: false, withUpdate: false });
		assert.equal(await fallbackDialog.evaluate(node => node.classList.contains("dialog-ol-controls-no-caption")), true);
		assert.equal(await fallbackDialog.locator(":scope > .dialog-ol-collapse").count(), 1, "caption-less dialog gets a direct fallback button");
		assert.equal(await fallbackDialog.locator(".dialog-ol-collapse").evaluate(node => getComputedStyle(node).position), "absolute");
		assert.equal(await fallbackDialog.locator(".dialog-ol-collapse").evaluate(node => getComputedStyle(node).pointerEvents), "auto");
		await fallbackDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(fallbackDialog);
		await page.locator(".dialog-ol-restore").click();
		await assertRestored(fallbackDialog);
		await fallbackDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(fallbackDialog);
		await fallbackDialog.evaluate(node => node.close());
		assert.equal(await page.locator(".dialog-ol-restore").count(), 0, "close removes the restore button");
		assert.equal(await fallbackDialog.count(), 0, "close removes the dialog");

		const deleteDialog = await create({ id: "delete-dialog", caption: "direct", addNewRow: false });
		await deleteDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(deleteDialog);
		await deleteDialog.evaluate(node => node.delete());
		assert.equal(await page.locator(".dialog-ol-restore").count(), 0, "delete removes the restore button");

		const oldDialog = await create({ id: "old-dialog", caption: "nested", addNewRow: false });
		await oldDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(oldDialog);
		const newDialog = await create({ id: "new-dialog", caption: "nested", addNewRow: false });
		assert.equal(await page.locator(".dialog-ol-restore").count(), 0, "dialog switch clears the old restore button");
		assert.equal(await oldDialog.locator(".dialog-ol-collapse").count(), 0, "dialog switch removes the previous arrow");
		await newDialog.locator(".dialog-ol-collapse").click();
		await assertCollapsed(newDialog);
		await page.locator(".dialog-ol-restore").click();
		await assertRestored(newDialog);

		assert.deepEqual(pageErrors, []);
		console.log("dialog-controls-browser.cjs: OL frame-edge measurement, normal-flow caption position and natural multiline layout at 100/240/450px, no-frame/title-only sizing, onlineUI/default controls, collapse/restore, sync/resize, show/open, close/delete/switch cleanup, and DOM retention passed (0 page errors)");
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
})().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
