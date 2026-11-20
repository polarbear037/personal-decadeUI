// 使用真实 Card 初始化、风格路由、手牌布局与选中 transform；不代表 Electron 实局。
const fs = require("node:fs");
const path = require("node:path");
const { bootstrap, server, chromium, assert, script } = require("../../雷的ol/verification/card-beautify-browser.cjs");
const base = "/extension/十周年UI/";
const beforePath = path.join(__dirname, "../.codex-tmp/yjcm-hand-spacing/layout-before.js");
const results = [];
const near = (a, b, label, tolerance = .08) => assert.ok(Math.abs(a - b) <= tolerance, `${label}: ${a} != ${b}`);

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
		for (const style of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"]) {
			const page = await browser.newPage({ viewport: { width: 1368, height: 768 } });
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
			assert.ok(files.includes(base + "src/styles/" + (style === "othersOff" ? "layout-xinsha.css" : style === "onlineUI" ? "layout-online.css" : "layout.css")));
			for (const url of files) await page.addStyleTag({ url: origin + url });
			await page.addStyleTag({ content: "#arena{position:absolute;inset:0}#samples{padding:30px;gap:10px}.sample>label{display:none}.card{transition:none!important;animation:none!important}.spacing-hand{position:absolute;left:40px;top:520px;height:200px}.spacing-hand>.handcards{position:relative;height:200px;width:100%}.spacing-hand>.handcards>.card{position:absolute;left:0;top:0;margin:0;width:108px;height:150px}" });
			await page.addScriptTag({ content: script("extension/十周年UI/src/core/layout.js", "window.spacingLayout=e();") });
			if (fs.existsSync(beforePath)) await page.addScriptTag({ content: script("extension/十周年UI/.codex-tmp/yjcm-hand-spacing/layout-before.js", "window.spacingBefore=e();") });
			await page.addScriptTag({ content: script("extension/十周年UI/src/overrides/card/overrides.js", "window.spacingTransform=p;") });
			await page.evaluate(() => {
				game.me = {};
				_status.event.player = game.me;
				LAYOUT.CARD_SELECT_OFFSET_DESKTOP = 20;
				ui.me = ui.arena;
				window.decadeUI = { config: {}, boundsCaches: {} };
				window.pointCards = [];
				for (const suit of ["spade", "heart", "club", "diamond"]) {
					for (const number of [1, 10, 13]) pointCards.push(makeSample("sha", suit, number));
				}
				ui.handcards1Container = document.createElement("div"); ui.handcards1Container.className = "spacing-hand";
				ui.handcards1 = document.createElement("div"); ui.handcards1.className = "handcards";
				ui.handcards1Container.append(ui.handcards1); ui.arena.append(ui.handcards1Container);
			});
			await page.waitForFunction(() => [...document.querySelectorAll(".card img")].every(img => img.complete && img.naturalWidth));
			const points = await page.evaluate(() => pointCards.map(card => {
				const rect = node => node.getBoundingClientRect().toJSON();
				return { card: rect(card), number: rect(card.querySelector(".suit-num-img")), suit: rect(card.querySelector(".suit-img")) };
			}));
			if (style === "othersOff") for (const p of points) {
				near(p.number.x + p.number.width / 2 - p.card.x, 15 * 108 / 126, "number center x");
				near(p.number.y + p.number.height / 2 - p.card.y, 14 * 108 / 126, "number center y");
				near(p.suit.y + p.suit.height / 2 - p.number.y - p.number.height / 2, 20 * 108 / 126, "suit-number center spacing");
			}
			const cases = [];
			for (const width of [480, 740, 960]) for (const scale of [.7, 1, 1.35]) for (const count of [1, 4, 6, 12, 80]) for (const fold of [false, true]) {
				const row = await page.evaluate(({ width, scale, count, fold }) => {
					lib.config.fold_card = fold;
					ui.handcards1.innerHTML = "";
					ui.handcards1Container.style.width = width + "px";
					decadeUI.boundsCaches.hand = { width, cardWidth: 108, cardHeight: 150, cardScale: scale, x: 40, check() {} };
					for (let i = 0; i < count; i++) {
						const card = ui.create.card(ui.handcards1); card.init(["spade", i % 13 + 1, "sha"]);
						card.updateTransform = spacingTransform;
						if (i === 1) card.classList.add("selected");
					}
					const read = () => ({ cards: [...ui.handcards1.children].map(card => ({ x: card.tx, y: card.ty, transform: card.style.transform })), width: ui.handcards1.style.width, scroll: ui.handcards1Container.classList.contains("scrollh") });
					window.spacingBefore?.updateHand(); const before = read();
					spacingLayout.updateHand();
					return { width, scale, count, fold, before, after: read() };
				}, { width, scale, count, fold });
				if (style !== "othersOff" && fs.existsSync(beforePath)) assert.deepEqual(row.after, row.before, `${style}: layout isolation`);
				if (style === "othersOff") {
					const cw = 108 * scale;
					let step = Math.min(cw, (width - cw / 2) / count);
					const scroll = fold && step < scale * 9;
					if (scroll) step = scale * 9;
					assert.equal(row.after.scroll, scroll, "fold threshold");
					row.after.cards.forEach((card, i) => {
						assert.equal(card.x, Math.round((cw - 108) / 2 + cw / 2 + step * i), "compact face-width card position");
						if (i === 1) assert.ok(card.transform.includes("translateY(-20px)"), "selected card remains raised");
					});
					if (scroll) assert.equal(row.after.width, Math.round((count - 1) * step + cw * 1.5) + "px", "last card reachable in scroll mode");
				}
				if (width === 740 && scale === 1 && count === 12 && !fold) cases.push(row);
			}
			if (style === "othersOff") {
				await page.evaluate(() => {
					lib.config.fold_card = false;
					decadeUI.boundsCaches.hand = { width: 740, cardWidth: 108, cardHeight: 150, cardScale: 1, x: 40, check() {} };
					ui.handcards1Container.style.width = "740px";
					[...ui.handcards1.children].slice(12).forEach(card => card.remove()); spacingLayout.updateHand();
				});
				await page.screenshot({ path: path.join(__dirname, "yjcm-hand-spacing-browser.png") });
			}
			assert.deepEqual(errors, []);
			results.push({ style, files, points, cases, checkedLayouts: 180 });
			console.log(`${style}: PASS (12 real card faces, 180 layouts, selection/folding${style === "othersOff" ? ", official center coordinates" : ", before/after isolation"})`);
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "yjcm-hand-spacing-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally {
		await browser?.close(); server.close();
	}
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
