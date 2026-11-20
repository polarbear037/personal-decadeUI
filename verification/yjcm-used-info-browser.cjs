const fs = require("node:fs");
const path = require("node:path");
const { bootstrap, server, chromium, assert, script, read } = require("../../雷的ol/verification/card-beautify-browser.cjs");
const root = path.resolve(__dirname, "..");
const base = "/extension/十周年UI/";

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = [];
	try {
		for (const style of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"]) {
			const page = await browser.newPage({ viewport: { width: 1150, height: 620 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			await bootstrap(page, origin, true);
			await page.addStyleTag({ content: "#samples .sample{width:132px;flex:none}#samples .sample>.card.thrown{position:relative!important;left:auto!important;top:auto!important;margin:0!important;transform:none!important}" });
			await page.addScriptTag({ content: script("extension/十周年UI/ui/constants.js", "window.STYLE_TO_SKIN=STYLE_TO_SKIN;window.DEFAULT_SKIN=DEFAULT_SKIN;") });
			await page.addScriptTag({ content: script("extension/十周年UI/src/styles/style-route.js", "window.getStyleFile=getStyleFile;") });
			const file = await page.evaluate(style => getStyleFile("card", style), style);
			await page.addStyleTag({ url: origin + base + "src/styles/" + file });
			const source = read("noname/get/index.js"), start = source.indexOf("  cardsetion(player, sourceEvent) {");
			const nativeTag = source.slice(start, source.indexOf("\n  /**", start));
			const skillStart = source.indexOf("  sourceSkillFor(skill, text) {");
			const nativeSourceSkill = source.slice(skillStart, source.indexOf("\n  /**", skillStart));
			await page.evaluate(({ style, nativeTag, nativeSourceSkill }) => {
				document.body.dataset.style = style;
				lib.config.extension_十周年UI_newDecadeStyle = style;
				ui.arena.dataset.newDecadeStyle = style;
				lib.config.cardtempname = "off";
				Object.assign(lib.translate, { lvdai: "吕岱", caocao: "曹操", zhangfei: "张飞", wusheng: "武圣", tiesuo: "铁索连环", new_qingjian: "清俭" });
				lib.skill.wusheng = {};
				lib.skill.wusheng_backup = { sourceSkill: "wusheng" };
				lib.skill.new_qingjian = {};
				window.people = ["lvdai", "caocao", "zhangfei"].map(name => ({ name, getSeatNum: () => 1 }));
				game.me = people[0]; game.online = false; game.hasPlayer2 = () => false;
				get.slimName = name => lib.translate[name] || name;
				get.bordergroup = () => "wood"; get.groupnature = value => value;
				get.nature = card => card?.nature || ""; get.number = card => card.number; get.suit = card => card.suit;
				get.color = card => ["heart", "diamond"].includes(card.suit) ? "red" : "black";
				get.event = () => _status.event;
				get.sourceSkillFor = new Function("return ({" + nativeSourceSkill + "}).sourceSkillFor")();
				get.skillTranslation = value => lib.translate[value];
				get.cardsetion = new Function("return ({" + nativeTag + "}).cardsetion")();
				const phase = { name: "phase", getParent() { return this; } };
				window.eventFor = (name, fields = {}, parent = phase) => ({ name, ...fields, getParent: () => parent });
				window.duiForTags = { element: { create: cls => { const node = document.createElement("div"); node.className = cls; return node; } }, animation: { cap: { playSpineTo: () => { window.effectCalls = (window.effectCalls || 0) + 1; } } } };
				window.cards = [];
				window.events = [];
				const cases = [
					["jiu", "useCard", { targets: [people[0]] }],
					["sha", "useCard", { targets: [people[1]] }],
					["sha", "useCard", { targets: [people[1], people[2]] }],
					["shan", "respond", {}],
					["shan", "useCard", { skill: "wusheng_backup", virtual: "sha", targets: [people[1]] }],
					["bagua", "useCard", { targets: [people[0]] }],
					["sha", "lose", { type: "discard" }],
					["tiesuo", "recast", {}],
					["sha", "judge", { judgestr: "lebu" }],
					["sha", "showCards", {}],
					["sha", "showCards", { skill: null }],
					["sha", "showCards", { skill: "" }],
					["sha", "showCards", { skill: "new_qingjian" }],
					["sha", "chooseToCompare", {}],
					["sha", "chooseToCompare", { skill: "wusheng_backup" }],
					["sha", "lose", {}, eventFor("showCards", {}, eventFor("new_qingjian"))],
				];
				for (const [name, action, fields, parent] of cases) {
					const card = makeSample(name, "club", 6);
					card.classList.add("thrown"); card.dataset.views = "1";
					card.style.backgroundImage = `url("extension/十周年UI/image/card-skins/online/${name === "tiesuo" ? "sha" : name}.jpg")`;
					card.owner = people[0];
					const event = eventFor(action, { card: { name: fields.virtual || name, cards: [card] }, ...fields }, parent);
					event.addMessageHook = (key, hook) => { event.judgeResultHook = hook; };
					cards.push(card); events.push(event);
				}
			}, { style, nativeTag, nativeSourceSkill });
			await page.addScriptTag({ content: script("extension/十周年UI/src/ui/card-utils.js", "window.applyUseTag=a;") });
			await page.evaluate(() => cards.forEach((card, index) => { _status.event = events[index]; applyUseTag(card, people[0], events[index], duiForTags); }));
			await page.evaluate(async () => { await document.fonts.ready; });
			const measure = () => cards.map(card => {
				const tag = card.querySelector(".used-info"), label = tag.firstElementChild, cs = getComputedStyle(tag), rect = tag.getBoundingClientRect(), cr = card.getBoundingClientRect();
				return { text: tag.textContent, html: tag.innerHTML, color: cs.color, font: cs.fontFamily, size: cs.fontSize, background: cs.backgroundImage, left: (rect.left - cr.left) / card.clientWidth, height: rect.height / card.clientHeight, opacity: cs.opacity, label: label && { color: getComputedStyle(label).color, outline: getComputedStyle(label).webkitTextStrokeColor, font: getComputedStyle(label).fontFamily } };
			});
			const state = await page.evaluate(measure);
			if (style === "othersOff") {
				assert.equal(file, "card-xinsha.css");
				assert.deepEqual(state.map(row => row.text), ["吕岱使用", "吕岱对曹操", "吕岱对曹操、张飞", "吕岱打出", "武圣", "吕岱装备", "吕岱弃置", "吕岱重铸", "乐不思蜀判定牌", "吕岱展示", "吕岱展示", "吕岱展示", "吕岱清俭展示", "吕岱展示", "吕岱武圣展示", "吕岱展示"]);
				for (const row of state) {
					assert.match(row.font, /dui-yjcm-card-tag/); assert.equal(row.color, "rgb(255, 255, 255)");
					assert.equal(row.label.color, "rgb(255, 255, 255)"); assert.equal(row.label.outline, "rgb(63, 51, 24)");
					assert.match(row.background, /card_text_bg\.png/); assert.ok(Math.abs(row.height - 61 / 174) < .001);
					assert.ok(!row.html.includes("<br") && !row.html.includes("data-nature"));
				}
				const lifecycle = await page.evaluate(async () => {
					cards[0].classList.add("movingcard"); await new Promise(resolve => setTimeout(resolve, 600)); const moving = getComputedStyle(cards[0].querySelector(".used-info")).opacity; cards[0].classList.remove("movingcard");
					const judge = events[8]; judge.result = { card: { clone: cards[8] }, suit: "club", number: 6, judge: 1 }; judge.judgeResultHook.call(judge);
					const result = cards[8].querySelector(".used-info").textContent;
					game.online = true; applyUseTag(cards[0], people[0], events[0], duiForTags); const online = cards[0].querySelector(".used-info").textContent; game.online = false;
					applyUseTag(cards[0], people[0], eventFor("lose"), duiForTags); const empty = cards[0].querySelector(".used-info").childNodes.length;
					applyUseTag(cards[0], people[0], events[0], duiForTags);
					return { moving, result, online, empty, effects: effectCalls, fontLoaded: [...document.fonts].some(font => font.family === "dui-yjcm-card-tag" && font.status === "loaded") };
				});
				assert.equal(lifecycle.moving, "0"); assert.equal(lifecycle.result, "乐不思蜀判定牌"); assert.equal(lifecycle.online, "吕岱使用"); assert.equal(lifecycle.empty, 0); assert.ok(lifecycle.effects > 0); assert.ok(lifecycle.fontLoaded);
				await page.screenshot({ path: path.join(__dirname, "yjcm-used-info-browser.png") });
			} else {
				assert.ok(!state[0].html.includes("dui-yjcm-used-text"));
				const css = fs.readFileSync(path.join(root, "src/styles/card-xinsha.css"), "utf8");
				await page.addStyleTag({ content: css.slice(css.indexOf("/* CardUiNew.setCardTextLabel"), css.indexOf("/** 一将成名技能文字条")) });
				assert.deepEqual(await page.evaluate(measure), state, `${style}: CSS isolation`);
			}
			assert.deepEqual(errors, []);
			results.push({ style, file, state });
			console.log(style + ": PASS");
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "yjcm-used-info-results.json"), JSON.stringify(results, null, 2) + "\n");
		console.log("YJCM_USED_INFO_BROWSER_OK");
	} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
