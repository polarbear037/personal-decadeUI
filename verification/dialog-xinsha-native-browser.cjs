// 执行本体 chooseToMove 和 Dialog，复现潜龙的原生双行移牌弹窗。
const fs = require("node:fs");
const path = require("node:path");
const { bootstrap, server, chromium, assert, script } = require("../../雷的ol/verification/card-beautify-browser.cjs");
const appRoot = path.resolve(__dirname, "../../..");
const contentSource = fs.readFileSync(path.join(appRoot, "noname/library/element/content.js"), "utf8");
const moveSource = contentSource.slice(contentSource.indexOf("  async chooseToMove(event,"), contentSource.indexOf("  async showCharacter(event,"));
const createSource = fs.readFileSync(path.join(appRoot, "noname/ui/create/index.js"), "utf8");
const characterSource = createSource.slice(createSource.indexOf("  #skillCaching"), createSource.indexOf("  dialog() {", createSource.indexOf("  characterDialog() {")));

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	try {
		for (const style of ["othersOff", "onlineUI"]) {
			const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
			await bootstrap(page, origin, true);
			const suffix = style === "onlineUI" ? "online" : "xinsha";
			await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/layout-${suffix}.css` });
			await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/animation-${suffix}.css` });
			await page.addStyleTag({ url: `${origin}/layout/default/pagination.css` });
			await page.addScriptTag({ content: `(function(){${fs.readFileSync(path.join(appRoot, "node_modules/.pnpm/dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"), "utf8").replace("export default dedent;", "window.dedent=dedent;")}\n})();` });
			await page.addScriptTag({ content: script("noname/util/pagination.js", "window.Pagination=Pagination;Pagination.loaded=true;") });
			await page.evaluate(style => {
				document.body.dataset.style = style;
				document.body.innerHTML = '<div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_xinsha"></div></div>';
				ui.arena = document.querySelector("#arena"); ui.window = document.querySelector("#window");
				ui.dialogs = []; ui.controls = []; ui.updates = []; ui.selected = {};
				ui.update = () => {};
				ui.create.caption = (text, parent) => { const node = ui.create.div(".caption", parent); node.innerHTML = text; return node; };
				ui.create.buttons = (cards, type, parent) => cards.map(card => { const node = ui.create.card(parent); node.init(card); node.classList.add("button"); node.link = card; node.copy = null; return node; });
				ui.create.confirm = kind => {
					ui.confirm?.remove(); const control = ui.create.div(".control", ui.arena);
					control.style.cssText = "position:absolute;bottom:8px;left:50%;z-index:102";
					control.close = () => control.remove(); ui.confirm = control;
					const button = document.createElement("button"); button.textContent = kind === "o" ? "确定" : "取消";
					button.onclick = () => _status.event.custom.replace.confirm(kind === "o"); control.append(button);
				};
				ui.click.dialogtouchStart = ui.click.touchScroll = ui.click.dragtouchdialog = () => {};
				get.links = buttons => buttons.map(button => button.link);
				game.pause = game.resume = game.countChoose = () => {};
				game.documentZoom = 1;
				Array.prototype.remove = function (item) { const index = this.indexOf(item); if (index >= 0) this.splice(index, 1); };
			}, style);
			await page.addScriptTag({ content: script("noname/library/element/dialog.js", "window.EngineDialog=Dialog;lib.element.Dialog=Dialog;") });
			await page.addScriptTag({ content: script("extension/十周年UI/src/ui/dialog-ol-layout.js", "Object.assign(window,{prepareDialogOlOpen,updateDialogOlLayout,clearDialogOlLayout,syncDialogOlLayoutMarker,releaseDialogOlLayout});") });
			await page.addScriptTag({ content: script("extension/十周年UI/src/ui/dialog-ol-controls.js", "window.syncDialogOlControls=syncDialogOlControls;") });
			await page.addScriptTag({ content: `window.engineChooseToMove=({${moveSource}}).chooseToMove;` });
			await page.addScriptTag({ content: `window.NativeCharacterFactory=class {${characterSource}};` });
			await page.addScriptTag({ content: script("extension/十周年UI/src/overrides/ui/create.js", "window.createDecadeCharacterDialog=m;") });
			await page.evaluate(() => {
				EngineDialog.prototype.open = function () {
					prepareDialogOlOpen(this, ui.arena); ui.arena.append(this); ui.dialog = this;
					this.classList.add("scroll1", "scroll2"); ui.update(); return this;
				};
				EngineDialog.prototype.close = function () { clearDialogOlLayout(this); this.remove(); };
				EngineDialog.prototype.hide = function () { this.classList.add("hidden"); };
				EngineDialog.prototype.show = function () { this.classList.remove("hidden"); };
				ui.create.dialog = (...args) => new EngineDialog(...args);
				ui.update = () => { if (ui.dialog) { updateDialogOlLayout(ui.dialog, ui.arena); syncDialogOlControls(ui.dialog, ui.arena, ui.window, ui.update); } };
				window.nativeMoveEvent = {
					prompt: "潜龙：获得至多两张牌并将其余牌置于牌堆底（右为底）",
					isMine: () => true, isOnline: () => false, forced: false,
					filterMove: () => true, filterOk: moved => moved[1]?.length > 0,
					list: [["置于牌堆底", [["heart", 12, "tao"], ["heart", 4, "tao"], ["spade", 12, "guohe"]]], ["自己获得", []]],
					custom: { replace: {} },
				};
				_status.event = nativeMoveEvent;
				window.nativeMovePromise = engineChooseToMove(nativeMoveEvent, null, {});
			});
			await page.evaluate(() => document.fonts.ready);
			for (const zoom of [1, 1.5]) {
				await page.evaluate(zoom => { game.documentZoom = zoom; document.body.style.zoom = zoom; nativeMoveEvent.dialog.contentContainer.scrollTop = 0; ui.update(); }, zoom);
				await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
				const geometry = await page.evaluate(() => {
					const dialog = nativeMoveEvent.dialog;
					const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
					const caption = dialog.content.firstElementChild;
					return { box: rect(dialog), title: rect(caption), text: caption.textContent, image: getComputedStyle(caption).backgroundImage, rows: nativeMoveEvent.buttonss.map(rect), footer: rect(dialog.querySelector(".dialog-ol-footer")), footerText: dialog.querySelector(".dialog-ol-footer").textContent, rowTitleImages: [...dialog.querySelectorAll(".choosetomove")].map(node => getComputedStyle(node).backgroundImage) };
				});
				assert.equal(geometry.text, "潜龙");
				assert.ok(geometry.image.includes("dialog_xinsha_title.png"));
				assert.ok(Math.abs(geometry.title.x + geometry.title.width / 2 - geometry.box.x - geometry.box.width / 2) < 1, JSON.stringify(geometry));
				assert.ok(geometry.title.y >= geometry.box.y && geometry.title.bottom < geometry.rows[0].y, JSON.stringify(geometry));
				assert.ok(geometry.footer.bottom <= geometry.box.bottom + 1, JSON.stringify(geometry));
				const lastRow = await page.evaluate(() => {
					const dialog = nativeMoveEvent.dialog, container = dialog.contentContainer;
					container.scrollTop = container.scrollHeight;
					return { bottom: nativeMoveEvent.buttonss[1].getBoundingClientRect().bottom, containerBottom: container.getBoundingClientRect().bottom, footerTop: dialog.querySelector(".dialog-ol-footer").getBoundingClientRect().top, className: dialog.className, promptUnit: getComputedStyle(dialog).getPropertyValue("--dialog-xinsha-prompt-unit"), footerSpace: getComputedStyle(dialog).getPropertyValue("--dialog-ol-footer-space"), frame: dialog.getBoundingClientRect().toJSON(), containerStyle: getComputedStyle(container).bottom };
				});
				assert.ok(lastRow.bottom <= lastRow.containerBottom + 1 && lastRow.bottom <= lastRow.footerTop + 1, JSON.stringify(lastRow));
				await page.evaluate(() => { nativeMoveEvent.dialog.contentContainer.scrollTop = 0; });
				assert.equal(geometry.footerText, "获得至多两张牌并将其余牌置于牌堆底（右为底）");
				assert.ok(geometry.rowTitleImages.every(image => image === "none"));
				const hide = await page.evaluate(() => {
					const button = document.querySelector(".dialog-xinsha-hide"), parent = ui.window;
					const b = button.getBoundingClientRect(), p = parent.getBoundingClientRect();
					const unit = Math.min(parent.clientWidth / 1334, parent.clientHeight / 750), sx = p.width / parent.clientWidth, sy = p.height / parent.clientHeight;
					const usable = Math.max(1334, Math.min(1750, parent.clientWidth / unit - 120)) * unit;
					return { sceneChild: button.parentNode === parent, captionButtons: nativeMoveEvent.dialog.querySelectorAll(".dialog-ol-collapse").length, image: getComputedStyle(button).backgroundImage, leftError: b.left - p.left - ((parent.clientWidth - usable) / 2 + 39 * unit) * sx, bottomError: p.bottom - b.bottom - 258 * unit * sy, widthError: b.width - 86 * unit * sx };
				});
				assert.ok(hide.sceneChild && hide.captionButtons === 0 && hide.image.includes("game_ui_btn_hide.png"), JSON.stringify(hide));
				for (const key of ["leftError", "bottomError", "widthError"]) assert.ok(Math.abs(hide[key]) < 1, JSON.stringify(hide));
				if (style === "othersOff" && zoom === 1) await page.screenshot({ path: path.join(__dirname, "dialog-xinsha-native-browser.png") });
			}
			const hideBox = await page.locator(".dialog-xinsha-hide").boundingBox();
			await page.getByRole("button", { name: "隐藏弹窗", exact: true }).click();
			assert.equal(await page.evaluate(() => nativeMoveEvent.dialog.classList.contains("hidden")), true);
			const showBox = await page.locator(".dialog-xinsha-restore").boundingBox();
			for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(showBox[key] - hideBox[key]) < 1);
			assert.ok(await page.locator(".dialog-xinsha-restore").evaluate(node => getComputedStyle(node).backgroundImage.includes("game_ui_btn_show.png")));
			await page.evaluate(() => { ui.window.style.height = "600px"; ui.update(); });
			const resizedShow = await page.locator(".dialog-xinsha-restore").boundingBox();
			const resizedWidth = await page.evaluate(() => 86 * Math.min(ui.window.clientWidth / 1334, ui.window.clientHeight / 750) * ui.window.getBoundingClientRect().width / ui.window.clientWidth);
			assert.ok(Math.abs(resizedShow.width - resizedWidth) < 1);
			if (style === "othersOff") await page.screenshot({ path: path.join(__dirname, "dialog-xinsha-hidden-browser.png") });
			await page.getByRole("button", { name: "显示弹窗", exact: true }).click();
			assert.equal(await page.evaluate(() => nativeMoveEvent.dialog.classList.contains("hidden")), false);
			await page.evaluate(() => { ui.window.style.height = ""; ui.update(); });
			await page.getByRole("button", { name: "取消", exact: true }).click();
			await page.waitForFunction(() => nativeMoveEvent.result, { timeout: 3000 });
			assert.equal(await page.evaluate(() => nativeMoveEvent.result.bool), false);
			assert.equal(await page.locator(".dialog-xinsha-hide").count(), 0);
			assert.equal(await page.locator(".dialog-xinsha-restore").count(), 0);
			// 实际执行本体 characterDialog 与十周年搜索增强，比较新基板开/关时的筛选及列表布局。
			const free = await page.evaluate(() => {
				ui.dialog = null; document.body.style.zoom = 1; game.documentZoom = 1;
				lib.character = {};
				for (const [name, group] of [["caocao", "wei"], ["simayi", "wei"], ["liubei", "shu"], ["guanyu", "shu"], ["sunquan", "wu"], ["zhouyu", "wu"]]) {
					lib.character[name] = ["male", group, 4, [], []]; lib.character[name].skills = [];
				}
				Object.assign(lib.translate, { caocao: "曹操", simayi: "司马懿", liubei: "刘备", guanyu: "关羽", sunquan: "孙权", zhouyu: "周瑜", wei: "魏", shu: "蜀", wu: "吴" });
				lib.characterFilter = {}; lib.characterPack = {}; lib.characterDialogGroup = {};
				Object.assign(lib.config, { banned: [], all: { characters: [] }, characters: [], showMax_character_number: "3", extension_十周年UI_mx_decade_characterDialog: "extension-OL-system" });
				get.is.phoneLayout = get.is.double = () => false;
				get.itemtype = value => value?.classList?.contains("card") ? "card" : "";
				get.groupnature = () => "water"; get.character = name => lib.character[name];
				game.layout = "long2";
				HTMLDivElement.prototype.css = function (style) { Object.assign(this.style, style); return this; };
				HTMLInputElement.prototype.css = HTMLDivElement.prototype.css;
				ui.create.button = (item, type) => { const button = ui.create.div(type === "tdnodes" ? ".tdnode" : ".button.character"); button.link = item; button.textContent = type === "tdnodes" ? item[1] : get.translation(item); return button; };
				ui.create.buttons = (items, type, parent) => items.map(item => { const button = ui.create.button(item, type); parent.append(button); return button; });
				const factory = new NativeCharacterFactory();
				window.getBaseUiCreateCharacterDialog = () => factory.characterDialog.bind(factory);
				ui.arena.dataset.loadingStyle = "off";
				window.freeDialog = createDecadeCharacterDialog("heightset");
				const updateWithControls = ui.update;
				ui.update = () => { if (ui.dialog) updateDialogOlLayout(ui.dialog, ui.arena); };
				freeDialog.open();
				const measure = () => {
					const r = freeDialog.getBoundingClientRect();
					return { x: r.x, y: r.y, width: r.width, height: r.height, search: freeDialog.querySelector("input").getBoundingClientRect().toJSON(), buttons: freeDialog.buttons.map(button => button.getBoundingClientRect().toJSON()) };
				};
				const before = measure(); ui.update = updateWithControls; ui.arena.dataset.loadingStyle = "dialog_xinsha"; ui.update();
				return { before, after: measure(), marker: freeDialog.classList.contains("dialog-ol-layout"), frame: freeDialog.classList.contains("dialog-xinsha-character-frame"), frameSource: getComputedStyle(freeDialog, "::before").borderImageSource, filterCount: freeDialog.querySelectorAll(".tdnode").length, buttonCount: freeDialog.buttons.length };
			});
			assert.equal(free.marker, false);
			assert.equal(free.frame, true);
			assert.ok(free.frameSource.includes("dialog_xinsha.png"));
			assert.deepEqual(free.after, free.before);
			assert.equal(free.buttonCount, 6);
			assert.ok(free.filterCount >= 3);
			const firstPage = await page.evaluate(() => freeDialog.buttons.filter(button => !button.classList.contains("nodisplay")).map(button => button.link));
			assert.equal(firstPage.length, 3);
			await page.locator(".pagination .page-next").click();
			const secondPage = await page.evaluate(() => freeDialog.buttons.filter(button => !button.classList.contains("nodisplay")).map(button => button.link));
			assert.equal(secondPage.length, 3);
			assert.ok(secondPage.every(name => !firstPage.includes(name)));
			await page.locator(".pagination .page-prev").click();
			assert.deepEqual(await page.evaluate(() => freeDialog.buttons.filter(button => !button.classList.contains("nodisplay")).map(button => button.link)), firstPage);
			for (const zoom of [1, 1.5]) for (const sidebar of ["", "leftbar", "rightbar"]) {
				await page.evaluate(({ zoom, sidebar }) => { document.body.style.zoom = zoom; game.documentZoom = zoom; ui.window.className = sidebar; ui.update(); }, { zoom, sidebar });
				await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
				const paint = await page.evaluate(() => {
					const d = freeDialog.getBoundingClientRect(), v = ui.window.getBoundingClientRect(), css = getComputedStyle(freeDialog, "::before");
					const scale = d.width / freeDialog.offsetWidth;
					return { left: d.left + parseFloat(css.left) * scale - v.left, width: parseFloat(css.width) * scale - v.width };
				});
				assert.ok(Math.abs(paint.left) < 1 && Math.abs(paint.width) < 1, JSON.stringify({ style, zoom, sidebar, paint }));
			}
			await page.evaluate(() => { document.body.style.zoom = 1; game.documentZoom = 1; ui.window.className = ""; ui.update(); });
			await page.evaluate(() => { ui.window.style.width = "1000px"; });
			await page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(freeDialog, "::before").width) - ui.window.clientWidth) < 1);
			await page.evaluate(() => { ui.window.style.width = ""; });
			await page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(freeDialog, "::before").width) - ui.window.clientWidth) < 1);
			await page.locator('input[placeholder="非精确匹配支持正则搜索"]').fill("曹操");
			await page.getByRole("button", { name: "搜索", exact: true }).click();
			assert.deepEqual(await page.evaluate(() => freeDialog.buttons.filter(button => !button.classList.contains("nodisplay")).map(button => button.link)), ["caocao"]);
			if (style === "othersOff") await page.screenshot({ path: path.join(__dirname, "dialog-xinsha-free-character-browser.png") });
			if (style === "othersOff") {
				await page.evaluate(() => { ui.arena.dataset.loadingStyle = "off"; ui.update(); });
				assert.equal(await page.evaluate(() => freeDialog.classList.contains("dialog-xinsha-character-frame")), false);
				// 当前夹具未选择基板时是透明框；先确认清理，再给它原生底色验证通用收起入口。
				await page.waitForFunction(() => getComputedStyle(freeDialog, "::before").content === "none");
				await page.evaluate(() => ui.update());
				assert.equal(await page.locator(".dialog-xinsha-hide").count(), 0, "无底图时移除控件");
				await page.evaluate(() => { freeDialog.style.backgroundColor = "rgba(20,12,6,.8)"; ui.update(); });
				await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => { ui.update(); resolve(); })));
				assert.equal(await page.locator(".dialog-xinsha-hide").count(), 1, "未选择新基板的有底图通用框也使用官方场景控件");
				await page.getByRole("button", { name: "隐藏弹窗", exact: true }).click();
				assert.equal(await page.locator(".dialog-xinsha-restore:visible").count(), 1);
				await page.evaluate(() => freeDialog.close());
				assert.equal(await page.locator(".dialog-xinsha-hide, .dialog-xinsha-restore").count(), 0, "隐藏期间关闭也清理场景控件");
			}
			if (style === "onlineUI") {
				await page.evaluate(() => {
					freeDialog.close(); ui.dialog = null; ui.arena.dataset.loadingStyle = "dialog_ol";
					window.olDialog = ui.create.dialog("OL测试：请选择一张牌", "hidden", "forcebutton");
					const body = ui.create.div("", olDialog.content); body.style.height = "80px";
					olDialog.open();
				});
				assert.equal(await page.evaluate(() => olDialog.querySelector(".caption .dialog-ol-collapse")?.getAttribute("aria-label")), "收起窗口");
				assert.equal(await page.locator(".dialog-xinsha-hide").count(), 0);
				await page.getByRole("button", { name: "收起窗口", exact: true }).click();
				assert.equal(await page.locator(".dialog-xinsha-restore").count(), 0);
				await page.getByRole("button", { name: "显示弹窗", exact: true }).click();
				assert.equal(await page.evaluate(() => olDialog.classList.contains("hidden")), false);
				await page.evaluate(() => olDialog.close());
			}
			assert.deepEqual(errors, []);
			await page.close();
		}
		console.log("DIALOG_XINSHA_NATIVE_OK: Qianlong title/two rows/prompt; official scene hide/show images/coordinates, hidden resize, close cleanup; real characterDialog layout/search; OL hide/show regression; xinsha/online styles at zoom1/1.5; 0 page errors/failed requests");
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
})().catch(error => { console.error(error); process.exitCode = 1; });
