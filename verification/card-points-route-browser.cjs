// 真实本体 Card、十周年UI 卡牌初始化与装备拼装，覆盖路由后的花色点数尺寸。
const path = require("node:path");
const { bootstrap, server, chromium, assert, script } = require("../../雷的ol/verification/card-beautify-browser.cjs");
const base = "/extension/十周年UI/";

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
		for (const [index, style] of ["on", "off", "othersOff", "onlineUI", "babysha", "codename"].entries()) {
			const page = await browser.newPage({ viewport: { width: 1368, height: 768 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			await bootstrap(page, origin, true);
			await page.evaluate(({ style }) => {
				for (const link of document.querySelectorAll('link[href*="/extension/"]')) link.remove();
				document.body.dataset.style = style;
				lib.config.extension_十周年UI_newDecadeStyle = style;
				ui.arena.dataset.newDecadeStyle = style;
				window.getStyleFile = null;
			}, { style });
			const files = await page.evaluate(async ({ base, style, index }) => {
				const { getStyleFile } = await import(base + "src/styles/style-route.js");
				return ["extension", "decadeLayout", "card", "meihua", "online-faction-dialog", "online-hand-cards", `player${index + 1}`, "equip", "layout"].map(name => base + "src/styles/" + getStyleFile(name, style));
			}, { base, style, index });
			for (const url of files) await page.addStyleTag({ url: origin + url });
			await page.addStyleTag({ content: `#arena{position:absolute;inset:0}.player{position:absolute!important;left:65px!important;top:45px!important;width:160px!important;height:220px!important}.player>.equips{width:125px!important;left:16px!important;right:auto!important}.equips-wrap{position:absolute!important;width:190px!important;min-width:190px!important;height:200px!important;left:300px!important;top:45px!important;right:auto!important;bottom:auto!important}#samples{position:absolute;left:35px;top:330px;width:1260px}.card{transition:none!important;animation:none!important}` });
			await page.addScriptTag({ content: script("extension/十周年UI/src/ui/equip-layout.js", "Object.assign(window,{refreshEquipLayout,rememberEquipPresentation,restoreEquipPresentation,updateEquipPresentation});") });
			await page.evaluate(() => {
				get.info = card => lib.card[card.name];
				get.suit = card => card.suit;
				get.number = card => card.number;
				get.equipNum = card => Number(get.subtype(card)?.slice(-1));
				for (const [name, slot] of [["zhuge", 1], ["bagua", 2], ["dilu", 3], ["chitu", 4], ["muniu", 5]]) {
					lib.card[name] = { type: "equip", subtype: "equip" + slot, fullskin: true };
					lib.translate[name] = { zhuge: "诸葛连弩", bagua: "八卦阵", dilu: "的卢", chitu: "赤兔", muniu: "木牛流马" }[name];
				}
				window.handSamples = [];
				for (const suit of ["spade", "heart", "club", "diamond"]) {
					for (const number of [1, 10, 13]) handSamples.push(makeSample("sha", suit, number));
				}
				window.equipPlayers = [];
				for (const local of [false, true]) {
					const player = document.createElement("div"); player.className = "player";
					player.dataset.position = local ? "0" : "1";
					player.node = { equips: document.createElement("div") }; player.node.equips.className = "equips";
					player.append(player.node.equips); ui.arena.append(player);
					if (local) { const wrap = document.createElement("div"); wrap.className = "equips-wrap"; wrap.append(player.node.equips); ui.arena.append(wrap); }
					for (const [index, name] of ["zhuge", "bagua", "dilu", "chitu", "muniu"].entries()) {
						const card = makeSample(name, index % 2 ? "heart" : "spade", index + 1);
						player.node.equips.append(card);
					}
					refreshEquipLayout(player); equipPlayers.push(player);
				}
			});
			await page.waitForFunction(() => [...document.querySelectorAll(".card img")].every(img => img.complete && img.naturalWidth > 0));
			const result = await page.evaluate(() => {
				const rect = node => node.getBoundingClientRect().toJSON();
				const visible = node => getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && !!node.getClientRects().length;
				return {
					hand: handSamples.map(card => ({ card: rect(card), number: rect(card.querySelector(".suit-num-img")), suit: rect(card.querySelector(".suit-img")) })),
					equipment: equipPlayers.flatMap(player => [...player.node.equips.children].map(card => ({
						card: rect(card), name: rect(card.node.name2), images: [...card.node.name2.querySelectorAll("img")].filter(visible).map(rect),
						faceVisible: [...card.children].filter(node => node !== card.node.name2 && visible(node)).map(node => node.className),
					}))),
				};
			});
			if (style === "othersOff") await page.screenshot({ path: path.join(__dirname, "card-points-xinsha.png") });
			for (const sample of result.hand) {
				assert.ok(sample.number.width > 0 && sample.number.width <= 20, `${style}: oversized card number ${sample.number.width}`);
				assert.ok(sample.suit.width > 0 && sample.suit.width <= 22, `${style}: oversized card suit ${sample.suit.width}`);
				if (style === "othersOff") {
					// 原版以精灵中心定位，透明图片框可以交叠，不能按外框强制留白。
					const centers = sample.suit.y + sample.suit.height / 2 - sample.number.y - sample.number.height / 2;
					assert.ok(Math.abs(centers - 20 * sample.card.width / 126) < .1, `${style}: official card point centers ${centers}`);
				} else assert.ok(sample.suit.y >= sample.number.y + sample.number.height - 1, `${style}: card points overlap`);
			}
			for (const sample of result.equipment) {
				assert.deepEqual(sample.faceVisible, [], `${style}: card face leaks out of equipment row`);
				for (const image of sample.images) {
				assert.ok(image.width > 0 && image.width <= 24 && image.height <= 24, `${style}: oversized equip icon ${JSON.stringify(image)}`);
				assert.ok(image.x >= sample.card.x - 1 && image.x + image.width <= sample.card.x + sample.card.width + 1, `${style}: equip icon outside row ${JSON.stringify(sample)}`);
				assert.ok(image.y >= sample.card.y - 1 && image.y + image.height <= sample.card.y + sample.card.height + 1, `${style}: equip icon outside row`);
				}
			}
			assert.deepEqual(errors, []);
			console.log(`${style}: PASS (12 real cards, both equipment areas, image dimensions and row bounds)`);
			await page.close();
		}
	} finally {
		await browser?.close();
		server.close();
	}
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
