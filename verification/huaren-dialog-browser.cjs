const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("C:/Users/Thunder/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const appRoot = path.resolve(root, "../..");
const readModule = file => fs.readFileSync(file, "utf8")
	.replace(/^import .*;\r?\n/gm, "")
	.replace(/^export\s+function\s+/gm, "function ")
	.replace(/^export\s*\{[\s\S]*?\};?\r?$/gm, "");

async function main() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
	const pageErrors = [];
	const consoleErrors = [];
	page.on("pageerror", error => pageErrors.push(error.message));
	page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
	await page.route("http://huaren.test/**", async route => {
		const relative = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
		const target = path.resolve(appRoot, relative);
		if (target.startsWith(appRoot + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile()) {
			await route.fulfill({ path: target });
		} else {
			await route.fulfill({ status: 404, body: "Not found" });
		}
	});
	try {
		await page.setContent(`<!doctype html><meta charset="utf-8">
			<div id="arena" class="decadeUI" data-loading-style="onlineUI">
				<div id="huaren-dialog" class="dialog"><div class="buttons"></div></div>
			</div>`);
		for (const file of ["layout/default/layout.css", "extension/十周年UI/ui/styles/lbtn/online.css"]) {
			await page.addStyleTag({ url: `http://huaren.test/${file}` });
		}
		await page.addStyleTag({ content: `
			#arena { position: absolute; inset: 0; }
			#huaren-dialog { position: absolute; left: 20px; top: 20px; }
			#huaren-dialog .button { display: inline-block; width: 80px; height: 80px; }
			#huaren-dialog .control { display: inline-block; width: 70px; height: 30px; }
		` });
		await page.addScriptTag({ content: `
			window.ui = { arena: document.querySelector("#arena"), selected: { buttons: [] }, create: {}, click: {} };
			window.lib = { hooks: { checkEnd: [] }, filter: { buttonIncluded: () => true }, config: {} };
			window._status = {};
			window.game = {};
			window.get = { event: () => _status.event, select: value => value };
			const selected = ui.selected.buttons;
			selected.add = item => { if (!selected.includes(item)) selected.push(item); };
			selected.remove = item => { const index = selected.indexOf(item); if (index >= 0) selected.splice(index, 1); };
		` });
		await page.addScriptTag({ content: `
			${readModule(path.join(root, "src/ui/huaren-dialog-interaction.js"))}
			window.applyHuarenDialogInteraction = applyHuarenDialogInteraction;
		` });
		const result = await page.evaluate(() => {
			const dialog = document.querySelector("#huaren-dialog");
			dialog.close = function () { this.classList.add("removing"); };
			dialog.delete = function () { this.remove(); };
			dialog.open = function () { this.classList.remove("removing"); };
			const button = document.createElement("div");
			button.className = "button selectable";
			button.link = ["equip", "equip_blade"];
			dialog.buttons = [button];
			dialog.querySelector(".buttons").append(button);
			const event = {
				name: "chooseButton",
				dialog,
				skill: "huaren",
				player: {},
				isMine: () => true,
				selectButton: [1, 1],
				filterButton: () => true,
				filterOk: () => ui.selected.buttons.length === 1,
				getParent: () => null,
			};
			_status.event = event;
			let commits = 0;
			let cancelClicks = 0;
			let closeOnCancel = false;
			let reuseConfirm = false;
			ui.click.ok = node => { if (node.link !== "ok") throw new Error("confirm target was not ok"); commits++; dialog.close(); };
			function makeConfirm(kind) {
				if (reuseConfirm && ui.confirm?.node) { ui.confirm.str = kind; return { confirm: ui.confirm }; }
				ui.confirm?.remove();
				const confirm = document.createElement("div");
				confirm.className = "controls";
				confirm.str = kind;
				const ok = document.createElement("button");
				ok.className = "control";
				ok.link = "ok";
				const cancel = document.createElement("button");
				cancel.className = "control";
				cancel.link = "cancel";
				cancel.addEventListener("click", () => { cancelClicks++; if (closeOnCancel) dialog.close(); });
				if (kind === "c") {
					confirm.append(cancel);
					confirm.firstChild = cancel;
				} else {
					confirm.append(ok, cancel);
					confirm.firstChild = ok;
					confirm.node = { ok, cancel };
				}
				ui.confirm = confirm;
				document.querySelector("#arena").append(confirm);
				return { confirm, ok, cancel };
			}
			ui.create.confirm = kind => makeConfirm(kind).confirm;
			applyHuarenDialogInteraction(dialog);
			const cancelOnlyConfirm = ui.create.confirm("c");
			const cancelOnly = { cancel: cancelOnlyConfirm.firstChild };
			const cancelOnlyState = {
				cancelVisible: getComputedStyle(cancelOnly.cancel).display !== "none",
				cancelLink: cancelOnly.cancel.link,
			};
			cancelOnly.cancel.click();
			cancelOnlyState.cancelClicks = cancelClicks;
			const displayProbe = document.createElement("button");
			displayProbe.className = "control";
			const displayProbeParent = document.createElement("div");
			displayProbeParent.className = "controls";
			displayProbeParent.append(displayProbe);
			document.querySelector("#arena").append(displayProbeParent);
			const originalComputedDisplay = getComputedStyle(displayProbe).display;
			displayProbeParent.remove();
			const controlsConfirm = ui.create.confirm("oc");
			const controls = { ok: controlsConfirm.node.ok, cancel: controlsConfirm.node.cancel };
			const hiddenOk = getComputedStyle(controls.ok).display === "none" && controls.ok.hidden;
			const visibleCancel = getComputedStyle(controls.cancel).display !== "none" && !controls.cancel.hidden;
			button.click();
			const selectedOnce = ui.selected.buttons.length === 1;
			const hiddenAfterSelection = getComputedStyle(controlsConfirm).display === "none";
			for (const hook of lib.hooks.checkEnd) hook();
			const hiddenDuringOldEvent = getComputedStyle(controlsConfirm).display === "none";
			_status.event = { name: "chooseButton", dialog, isMine: () => true, skill: "ordinary", getParent: () => null };
			for (const hook of lib.hooks.checkEnd) hook();
			const hiddenAfterEventChange = getComputedStyle(controlsConfirm).display === "none";
			const singleCancel = ui.create.confirm("c");
			const singleCancelHidden = getComputedStyle(singleCancel).display === "none";
			const doubleConfirm = ui.create.confirm("oc");
			const doubleConfirmVisible = getComputedStyle(doubleConfirm).display !== "none" && !doubleConfirm.node.ok.hidden && !doubleConfirm.node.cancel.hidden;
			const restored = {
				display: controls.ok.style.getPropertyValue("display"),
				priority: controls.ok.style.getPropertyPriority("display"),
				hidden: controls.ok.hidden,
				computed: getComputedStyle(doubleConfirm.node.ok).display,
			};
			// Reopen a second Huaren prompt and close through the original cancel listener.
			dialog.open();
			_status.event = event;
			const secondConfirm = ui.create.confirm("oc");
			closeOnCancel = true;
			secondConfirm.node.cancel.click();
			const hiddenAfterCancel = getComputedStyle(secondConfirm).display === "none";
			_status.event = { name: "ordinary", isMine: () => true };
			reuseConfirm = true;
			const cancelDuringGap = ui.create.confirm("c");
			const gapStillHidden = getComputedStyle(cancelDuringGap).display === "none";
			const restoredDouble = ui.create.confirm("co");
			const reusedSameConfirm = restoredDouble === secondConfirm;
			const visibleAfterCancel = getComputedStyle(restoredDouble).display !== "none" && !restoredDouble.node.ok.hidden && !restoredDouble.node.cancel.hidden;
			return { cancelOnlyState, hiddenOk, visibleCancel, commits, selectedOnce, originalComputedDisplay, restored,
				hiddenAfterSelection, hiddenDuringOldEvent, hiddenAfterEventChange, singleCancelHidden, doubleConfirmVisible,
				hiddenAfterCancel, gapStillHidden, visibleAfterCancel, reusedSameConfirm, cancelClicks };
		});
		assert.deepEqual(result.cancelOnlyState, { cancelVisible: true, cancelLink: "cancel", cancelClicks: 1 });
		assert.equal(result.hiddenOk, true, JSON.stringify(result));
		assert.equal(result.visibleCancel, true, JSON.stringify(result));
		assert.equal(result.commits, 1, JSON.stringify(result));
		assert.equal(result.selectedOnce, true, JSON.stringify(result));
		assert.deepEqual(result.restored, { display: "", priority: "", hidden: false, computed: result.originalComputedDisplay });
		for (const key of ["hiddenAfterSelection", "hiddenDuringOldEvent", "hiddenAfterEventChange", "singleCancelHidden", "doubleConfirmVisible", "hiddenAfterCancel", "gapStillHidden", "visibleAfterCancel", "reusedSameConfirm"]) assert.equal(result[key], true, `${key}: ${JSON.stringify(result)}`);
		assert.equal(result.cancelClicks, 2, "both native cancel listeners remain functional");
		// Use the actual OL confirm creator/rewrite: an engine "o" enables OK while
		// retaining both DOM buttons, whereas the former fixture only tested "oc".
		for (const file of ["ui/lbtn/skins/base.js", "ui/lbtn/skins/online.js"]) {
			await page.addScriptTag({ content: readModule(path.join(root, file)) });
		}
		const shenyu = await page.evaluate(() => {
			ui.confirm?.remove();
			ui.confirm = null;
			ui.controls = [];
			ui.controls.remove = item => { const index = ui.controls.indexOf(item); if (index >= 0) ui.controls.splice(index, 1); };
			ui.updatec = () => {};
			ui.create.control = (...labels) => {
				const control = document.createElement("div");
				control.className = "control";
				for (const label of labels) {
					const node = document.createElement("div"); node.link = label; node.innerHTML = label; control.append(node);
				}
				control.close = function () { this.classList.add("closing"); };
				ui.arena.append(control); ui.controls.push(control);
				return control;
			};
			const app = { reWriteFunction(owner, methods) {
				for (const [method, callbacks] of Object.entries(methods)) {
					const original = owner[method];
					owner[method] = function (...args) { callbacks[0]?.apply(this, args); return original.apply(this, args); };
				}
			} };
			const plugin = createOnlineLbtnPlugin(lib, game, ui, get, {}, _status, app);
			plugin.initConfirmRewrite();
			const dialog = document.createElement("div");
			dialog.className = "dialog";
			dialog.close = function () { this.classList.add("removing"); };
			dialog.open = function () { this.classList.remove("removing"); };
			const equipment = document.createElement("div");
			equipment.className = "button selectable";
			dialog.buttons = [equipment]; dialog.append(equipment); ui.arena.append(dialog);
			let shenyuOk = 0, shenyuCancel = 0, huarenOk = 0;
			ui.click.ok = node => {
				if (_status.event.name === "chooseButton") { huarenOk++; node?.parentNode.close(); dialog.close(); }
				else shenyuOk++;
			};
			ui.click.cancel = () => shenyuCancel++;
			ui.selected.buttons = [];
			_status.event = { name: "chooseButton", dialog, skill: "huaren", isMine: () => true, selectButton: [1, 1], filterButton: () => true, getParent: () => null };
			applyHuarenDialogInteraction(dialog);
			ui.create.confirm("c");
			equipment.click();
			const hiddenAfterHuaren = getComputedStyle(ui.confirm).display === "none";
			const parent = { name: "chooseUseTarget", getParent: () => ({ name: "shenyu" }) };
			_status.event = { name: "chooseTarget", isMine: () => true, getParent: () => parent };
			ui.create.confirm("c");
			const beforeTarget = ui.confirm;
			const gapHidden = getComputedStyle(beforeTarget).display === "none";
			// game.check returns "o" once a valid target has been selected.
			ui.selected.targets = [document.createElement("div")];
			ui.create.confirm("o");
			const sameControl = ui.confirm === beforeTarget;
			const rects = node => node.getClientRects().length > 0 && getComputedStyle(node).display !== "none";
			const okVisible = rects(ui.confirm.node.ok);
			const cancelVisible = rects(ui.confirm.node.cancel);
			const okEnabled = !ui.confirm.node.ok.classList.contains("disabled");
			ui.confirm.node.ok.click();
			// Native OL cancel is enabled again when the target is deselected.
			ui.selected.targets = [];
			ui.create.confirm("c");
			ui.confirm.node.cancel.click();
			return { hiddenAfterHuaren, gapHidden, sameControl, okVisible, cancelVisible, okEnabled, huarenOk, shenyuOk, shenyuCancel };
		});
		assert.deepEqual(shenyu, { hiddenAfterHuaren: true, gapHidden: true, sameControl: true, okVisible: true, cancelVisible: true, okEnabled: true, huarenOk: 1, shenyuOk: 1, shenyuCancel: 1 });
		assert.deepEqual(pageErrors, [], `browser page errors: ${pageErrors.join("; ")}`);
		assert.deepEqual(consoleErrors, [], `browser console errors: ${consoleErrors.join("; ")}`);
		console.log("HUAREN_DIALOG_BROWSER_OK", JSON.stringify(result));
		console.log("HUAREN_TO_SHENYU_OL_OK", JSON.stringify(shenyu));
	} finally {
		await browser.close();
	}
}

main().catch(error => { console.error(error); process.exitCode = 1; });
