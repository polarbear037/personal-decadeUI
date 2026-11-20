// 真实 Card + OL卡面 + cardStyles 边框。覆盖上一轮无边框夹具遗漏的 content-box 占位。
const fs = require("node:fs");
const path = require("node:path");
const { bootstrap, server, chromium, assert, script } = require("../../雷的ol/verification/card-beautify-browser.cjs");
const base = "/extension/十周年UI/";
const beforeFile = path.join(__dirname, "../.codex-tmp/yjcm-hand-border/layout-before.js");
const results = [];

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
		const origin = `http://127.0.0.1:${server.address().port}`;
		for (const style of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"]) {
			const page = await browser.newPage({ viewport: { width: 1368, height: 768 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			await bootstrap(page, origin, true);
			const files = await page.evaluate(async ({ style, base }) => {
				for (const link of document.querySelectorAll('link[href*="/extension/"]')) link.remove();
				document.body.dataset.style = style;
				lib.config.extension_十周年UI_newDecadeStyle = style;
				ui.arena.dataset.newDecadeStyle = style;
				const { getStyleFile } = await import(base + "src/styles/style-route.js");
				return ["extension", "decadeLayout", "card", "meihua", "layout"].map(name => base + "src/styles/" + getStyleFile(name, style));
			}, { style, base });
			for (const url of files) await page.addStyleTag({ url: origin + url });
			await page.addStyleTag({ content: "html,body{margin:0}#arena{position:absolute;inset:0}#samples{display:none}.border-hand{position:absolute;left:40px;top:400px;height:300px}.border-hand>.handcards{position:relative;height:300px;width:100%}.border-hand>.handcards>.card{position:absolute;left:0;top:0;margin:0;transition:none!important;animation:none!important}.card>.background{display:none}.border-caption{position:absolute;left:40px;top:15px;color:white;font:20px sans-serif}" });
			await page.addScriptTag({ content: script("extension/十周年UI/src/core/layout.js", "window.borderLayout=e();") });
			if (fs.existsSync(beforeFile)) await page.addScriptTag({ content: script("extension/十周年UI/.codex-tmp/yjcm-hand-border/layout-before.js", "window.borderBefore=e();") });
			await page.addScriptTag({ content: script("extension/十周年UI/src/overrides/card/overrides.js", "window.borderTransform=p;") });
			await page.evaluate(() => {
				game.me = {}; _status.event.player = game.me;
				LAYOUT.CARD_SELECT_OFFSET_DESKTOP = 20;
				window.decadeUI = { config: {}, boundsCaches: {} };
				ui.me = ui.arena;
				ui.handcards1Container = document.createElement("div"); ui.handcards1Container.className = "border-hand";
				ui.handcards1 = document.createElement("div"); ui.handcards1.className = "handcards";
				ui.handcards1Container.append(ui.handcards1); ui.arena.append(ui.handcards1Container);
				window.borderCase = ({ border, scale, count, fold }) => {
					ui.handcards1.replaceChildren();
					lib.config.extension_十周年UI_cardkmh = border; lib.config.fold_card = fold;
					const width = 1100;
					ui.handcards1Container.style.width = width + "px";
					for (let i = 0; i < count; i++) {
						const name = i % 4 < 2 ? "sha" : "shan";
						const card = ui.create.card(ui.handcards1); card.init([i % 2 ? "heart" : "spade", i % 13 + 1, name]);
						card.classList.add("decade-card");
						card.style.backgroundImage = `url('${lib.assetURL}extension/十周年UI/image/card-skins/online/${name}.jpg')`;
						applyCardBorder(card, game.me, true); card.updateTransform = borderTransform;
					}
					const first = ui.handcards1.firstChild;
					const cw = first.offsetWidth, ch = first.offsetHeight, face = first.clientWidth;
					decadeUI.boundsCaches.hand = { width, cardWidth: cw, cardHeight: ch, cardScale: scale, x: 40, check() {} };
					const read = () => ({ transforms: [...ui.handcards1.children].map(c => c.style.transform), x: [...ui.handcards1.children].map(c => c.tx), scroll: ui.handcards1Container.classList.contains("scrollh"), width: ui.handcards1.style.width });
					window.borderBefore?.updateHand(); const before = read();
					borderLayout.updateHand();
					return { border, scale, count, fold, cw, ch, face, available: width, before, after: read() };
				};
			});
			const cases = [];
			for (const border of ["off", "kuang1", "kuang2", "kuang3"]) for (const scale of [1, 1.8]) for (const count of [4, 12, 80]) for (const fold of [false, true]) {
				const row = await page.evaluate(options => borderCase(options), { border, scale, count, fold });
				assert.equal(row.face, 108, "card face remains 108px in all styles");
				assert.equal(row.cw, border === "off" ? 108 : 110, "real CSS border allocation");
				if (style === "othersOff") {
					const desired = Math.min(row.face * scale, (row.available - row.cw * scale / 2) / count);
					const scroll = fold && desired < scale * 9;
					assert.equal(row.after.scroll, scroll);
					const step = scroll ? scale * 9 : desired;
					row.after.x.forEach((x, i) => assert.equal(x, Math.round((row.cw * scale - row.cw) / 2 + row.cw * scale / 2 + i * step), "source step excludes the CSS border"));
				} else if (fs.existsSync(beforeFile)) assert.deepEqual(row.after, row.before, `${style}: border layout unchanged`);
				if (count === 4 && scale === 1.8 && !fold) cases.push(row);
			}
			if (style === "othersOff") {
				await page.evaluate(() => {
					const row = borderCase({ border: "kuang2", scale: 1.8, count: 4, fold: false });
					const previous = ui.handcards1Container.cloneNode(true); previous.style.top = "40px";
					[...previous.firstChild.children].forEach((c, i) => { c.style.transform = row.before.transforms[i]; });
					ui.arena.append(previous);
					for (const [text, top] of [["修改前：边框计入步进", 15], ["修改后：按卡面宽度步进", 375]]) {
						const label = document.createElement("div"); label.className = "border-caption"; label.style.top = top + "px"; label.textContent = text; ui.arena.append(label);
					}
				});
				await page.evaluate(() => Promise.all([...document.querySelectorAll(".card")].map(c => {
					const image = new Image(); image.src = getComputedStyle(c).backgroundImage.slice(5, -2); return image.decode();
				})));
				await page.screenshot({ path: path.join(__dirname, "yjcm-hand-border-browser.png") });
			}
			assert.deepEqual(errors, []);
			results.push({ style, files, layouts: 48, cases });
			console.log(`${style}: PASS (48 real bordered/unbordered hand layouts, card sizes, folding${style === "othersOff" ? ", compact face-width step" : ", before/after isolation"})`);
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "yjcm-hand-border-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
