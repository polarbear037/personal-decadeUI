// 真实 Card.addGaintag/removeGaintag/copy + 实际风格路由；不是 Electron 实局。
const fs = require("node:fs");
const path = require("node:path");
const { bootstrap, server, chromium, assert } = require("../../雷的ol/verification/card-beautify-browser.cjs");
const base = "/extension/十周年UI/";
const xinsha = fs.readFileSync(path.join(__dirname, "../src/styles/card-xinsha.css"), "utf8");
const tagRules = xinsha.slice(xinsha.indexOf("/** 一将成名技能文字条"), xinsha.indexOf("/** 卡名显示 */"));

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	let browser;
	const results = [];
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
		for (const style of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"]) {
			const page = await browser.newPage({ viewport: { width: 1100, height: 430 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			await bootstrap(page, origin, true);
			const files = await page.evaluate(async ({ base, style }) => {
				for (const link of document.querySelectorAll('link[href*="/extension/"]')) link.remove();
				document.body.dataset.style = style;
				lib.config.extension_十周年UI_newDecadeStyle = style;
				ui.arena.dataset.newDecadeStyle = style;
				const { getStyleFile } = await import(base + "src/styles/style-route.js");
				return ["extension", "decadeLayout", "card", "meihua", "layout"].map(name => base + "src/styles/" + getStyleFile(name, style));
			}, { base, style });
			assert.ok(files.some(file => file.endsWith(style === "othersOff" ? "card-xinsha.css" : style === "onlineUI" ? "card-online.css" : "card.css")));
			for (const url of files) await page.addStyleTag({ url: origin + url });
			await page.addStyleTag({ content: "#arena{position:absolute;inset:0}#samples{top:40px}.sample>label{color:#ead8b6}.card{animation:none!important;transition:none!important}" });
			await page.evaluate(() => {
				Array.prototype.remove = function (item) { const index = this.indexOf(item); if (index >= 0) this.splice(index, 1); return this; };
				Object.assign(lib.translate, { tag1: "安", tag2: "追慕", tag3: "此牌不计入手牌上限", invisibleTag: "invisible" });
				window.samples = [];
				for (const [caption, tags, cls] of [["单标签", ["tag1"], ""], ["多标签", ["tag1", "tag2"], ""], ["长标签", ["tag3"], ""], ["低位牌", ["tag1"], "low"], ["对话框牌", ["tag2"], "button"], ["空标签", [], ""]]) {
					const card = makeSample("jiu", "diamond", 9);
					// 与 skin-applier 相同，使用项目现有卡面；不改动卡牌或标签布局来配图。
					card.classList.add("decade-card");
					card.style.backgroundImage = `url("${lib.assetURL}extension/十周年UI/image/card-skins/decade/jiu.png")`;
					card.parentElement.querySelector("label").textContent = caption;
					if (cls === "low") card.dataset.low = "1";
					else if (cls) card.classList.add(cls);
					card.addGaintag(tags); samples.push(card);
				}
				window.measure = () => samples.map(card => {
					const tag = card.node.gaintag, s = getComputedStyle(tag), text = tag.querySelector(".dui-yjcm-card-tag-text");
					const c = card.getBoundingClientRect(), t = tag.getBoundingClientRect();
					const r = text?.getBoundingClientRect();
					return { text: tag.textContent, display: s.display, font: s.fontFamily, fontSize: s.fontSize, color: s.color, shadow: s.textShadow, stroke: s.webkitTextStrokeWidth, background: s.backgroundImage, x: (t.x - c.x) / c.width, top: (t.y - c.y) / c.height, width: t.width / c.width, height: t.height / c.height, fittedWidth: r?.width, fittedHeight: r?.height, scale: text?.style.getPropertyValue("--dui-yjcm-card-tag-scale"), ownMethod: Object.hasOwn(card, "addGaintag") };
				});
			});
			await page.evaluate(() => document.fonts.ready);
			const state = await page.evaluate(() => measure());
			assert.equal(state[5].display, "none");
			if (style === "othersOff") {
				for (const tag of state.slice(0, 5)) {
					assert.match(tag.background, /card\/xinsha\/card_turn_text_bg_2\.png/);
					assert.match(tag.font, /dui-yjcm-card-tag/);
					for (const [key, value] of Object.entries({ x: 3 / 126, top: 80 / 174, width: 120 / 126, height: 40 / 174 })) assert.ok(Math.abs(tag[key] - value) < 0.001, `${key}: ${JSON.stringify(tag)}`);
					assert.ok(Math.abs(parseFloat(tag.fontSize) - 24 * 108 / 126) < 0.001);
					assert.equal(tag.color, "rgb(255, 240, 213)");
					assert.equal(tag.stroke, "0px");
					assert.match(tag.shadow, /rgb\(99, 35, 26\)/);
					assert.equal(tag.ownMethod, true);
					assert.ok(tag.fittedWidth <= 108 * 116 / 126 + 1, "one-line text must fit");
				}
				assert.ok(Number(state[2].scale) < 1, "long tag shrinks instead of wrapping");
				assert.equal(state[0].scale, "1", "single 安 retains original font size");
				const assets = await page.evaluate(async ({ base }) => {
					const image = new Image(); image.src = base + "image/ui/card/xinsha/card_turn_text_bg_2.png"; await image.decode();
					return { size: [image.naturalWidth, image.naturalHeight], font: [...document.fonts].some(face => face.family === "dui-yjcm-card-tag" && face.status === "loaded") };
				}, { base });
				assert.deepEqual(assets, { size: [120, 40], font: true });
				await page.evaluate(async ({ base }) => { const image = new Image(); image.src = base + "image/card-skins/decade/jiu.png"; await image.decode(); }, { base });
				await page.screenshot({ path: path.join(__dirname, "yjcm-card-tag-browser.png") });
				await page.locator(".sample > .card").first().screenshot({ path: path.join(__dirname, "yjcm-card-tag-single.png") });
				const scaled = await page.evaluate(() => { samples[0].style.transform = "scale(1.4)"; return measure()[0]; });
				for (const key of ["x", "top", "width", "height"]) assert.ok(Math.abs(scaled[key] - state[0][key]) < 0.001, `cardScale: ${key}`);
				await page.evaluate(() => { samples[0].style.transform = ""; });
			} else {
				if (style === "onlineUI") assert.match(state[0].background, /card_tag_bg\.png/);
				assert.ok(state.every(tag => !tag.ownMethod), `${style} retains native method and DOM`);
				// 即使同时装入新增规则，其他风格的所有标签计算样式也保持不变。
				await page.addStyleTag({ content: tagRules });
				assert.deepEqual(await page.evaluate(() => measure()), state);
			}
			const lifecycle = await page.evaluate(() => {
				const card = samples[0];
				card.addGaintag("tag2"); const added = card.node.gaintag.textContent;
				card.removeGaintag("tag1"); const removed = card.node.gaintag.textContent;
				const clone = card.copy(); card.parentElement.append(clone);
				const copyEmpty = clone.node.gaintag.textContent === "" && getComputedStyle(clone.node.gaintag).display === "none";
				clone.remove();
				card.classList.add("infohidden"); const hidden = getComputedStyle(card.node.gaintag).display;
				card.classList.remove("infohidden");
				card.removeGaintag(true); const cleared = getComputedStyle(card.node.gaintag).display;
				card.addGaintag("invisibleTag"); const invisible = getComputedStyle(card.node.gaintag).display;
				return { added, removed, copyEmpty, hidden, cleared, invisible };
			});
			assert.deepEqual(lifecycle, { added: "安 追慕", removed: "追慕", copyEmpty: true, hidden: "none", cleared: "none", invisible: "none" });
			if (style === "othersOff") {
				const detached = await page.evaluate(async () => {
					const card = ui.create.card(); card.init(["diamond", 9, "jiu"]);
					card.addGaintag("tag3"); samples[0].parentElement.append(card);
					await document.fonts.ready; await Promise.resolve();
					const text = card.node.gaintag.firstElementChild;
					const fitted = text.getBoundingClientRect().width <= card.offsetWidth * 116 / 126 + 1;
					card.removeGaintag(true); await Promise.resolve();
					const empty = card.node.gaintag.childNodes.length === 0;
					card.remove(); return { fitted, empty };
				});
				assert.deepEqual(detached, { fitted: true, empty: true });
			}
			assert.deepEqual(errors, []);
			results.push({ style, files, state, lifecycle });
			console.log(`${style}: PASS (official geometry, native gaintag lifecycle, isolation)`);
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "yjcm-card-tag-results.json"), JSON.stringify(results, null, 2) + "\n");
		console.log("YJCM_CARD_TAG_BROWSER_OK");
	} finally {
		await browser?.close(); server.close();
	}
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
