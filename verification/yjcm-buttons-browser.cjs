const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
const configKey = "extension_十周年UI_yjcmBackground";
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_rightLayout: "on", phonelayout:true, touchscreen: false });
for (const row of [...require("./yjcm-buttons-source.json").frames, ...require("./yjcm-buttons-source.json").extra, ...require("./yjcm-background-source.json").resources]) {
	assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, row.destination))).digest("hex"), row.sha256, row.destination);
}
const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
		const page = await browser.newPage({ viewport: { width: 1500, height: 750 } });
		page.setDefaultTimeout(12000);
		const errors = [], failed = [];
		let startupReject;
		const startupFailure = new Promise((resolve, reject) => { startupReject = reject; });
		page.on("pageerror", error => { errors.push(error.message); startupReject(error); });
		page.on("dialog", dialog => { console.log("DIALOG", dialog.message()); void dialog.accept(); });
		page.on("console", message => { if (message.type() === "error" && message.text().includes("一将成名动态背景")) errors.push(message.text()); });
		page.on("response", response => { if (response.status() >= 400 && response.url().includes("/yijiang/")) failed.push(response.status() + " " + decodeURIComponent(response.url())); });
		// 本机安装包的依赖目录是原始 CommonJS；仅在夹具里提供与本体包装器一致的出口。
		for (const [request, bundle, globalName] of [
			["crypto-js@4.2.0/node_modules/crypto-js/index.js", "crypto-js@4.2.0/node_modules/crypto-js/crypto-js.js", "CryptoJS"],
			["jszip@2.7.0/node_modules/jszip/lib/index.js", "jszip@2.7.0/node_modules/jszip/dist/jszip.js", "JSZip"],
			["nosleep.js@0.12.0/node_modules/nosleep.js/src/index.js", "nosleep.js@0.12.0/node_modules/nosleep.js/dist/NoSleep.js", "NoSleep"],
			["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core"],
			["stackframe@1.3.4/node_modules/stackframe/stackframe.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "StackFrame"],
			["error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "ErrorStackParser"],
			["stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "StackTraceGPS"],
		]) {
			const source = fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", bundle), "utf8").replaceAll("}(this,", "}(globalThis,").replaceAll(")(this,", ")(globalThis,");
			const prefix = ["ErrorStackParser", "StackTraceGPS"].includes(globalName) ? 'import "/_virtual/stackframe.js";\n' : "";
			await page.route("**/node_modules/.pnpm/" + request, route => route.fulfill({ contentType: "text/javascript", body: prefix + source + `\nexport function __require(){return globalThis.${globalName};}` }));
		}
		for (const [pattern, file] of [["**/pinyin-pro/dist/index.js", "pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.mjs"], ["**/dedent/dist/dedent.js", "dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"]]) {
			await page.route(pattern, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", file), "utf8") }));
		}
		await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
		await Promise.race([startupFailure, page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 })]).catch(async error => {
			console.log("STARTUP", JSON.stringify({ errors, failed, body: await page.locator("body").innerText() }));
			await page.screenshot({ path: path.join(__dirname, "yjcm-startup.png") });
			throw error;
		});
		await page.evaluate(async () => {
			const { game, ui, lib, get, _status } = await import("/noname.js");
			Object.assign(window, { game, ui, lib, get, _status });
			game.pause();
			for (const dialog of [...ui.dialogs]) dialog.close();
			for (const control of [...ui.controls]) control.close();
			document.querySelector(".decade-welcome-overlay")?.remove();
			ui.arena.classList.remove("choose-character");
			game.me = game.players[0]; game.me.init("liubei"); game.players[1].init("guanyu");
			_status.gameStarted = true; _status.over = false;
			const event = game.createEvent("phaseUse", false); event.player = game.me;
			_status.eventManager.setStatusEvent(event, true);
			for (let i = 0; i < 4; i++) game.me.directgain([game.createCard("sha", "spade", i + 1)]);
			ui.updateSkillControl(game.me, true);
			ui.cardRoundTime.updateRoundCard(); ui.handcardNumber.updateCardnumber();
			ui.create.confirm("oc");
			game.resume2();
		});
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(1200);
		assert.equal(await page.locator("body").getAttribute("data-style"),"othersOff");
		assert(await page.locator('link[href*="/lbtn/xinsha.css"]').count()>0);
		assert.equal(await page.locator('link[href*="/lbtn/shizhounian.css"]').count(),0);
		results.hud = await page.evaluate(() => {
			const read = selector => {
				const node = document.querySelector(selector);
				if (!node) throw new Error("Missing HUD element: "+selector);
				const style = getComputedStyle(node);
				return { rect: node.getBoundingClientRect().toJSON(), background: style.backgroundImage, fontSize: style.fontSize, animation: style.animationName, filter: style.filter, color: style.color };
			};
			return { window: ui.window.getBoundingClientRect().toJSON(), menu: read(".yjcm-menu-main"), question: read(".yjcm-question"), pile: read("#window > .cardRoundNumber"), sort: read(".yjcm-sort"), confirm: read(".lbtn-confirm > .primary"), cancel: read(".lbtn-confirm > .primary2"), handcount: read(".handcardNumber"), skill: read(".skill-control [data-id]"), flower: read(".yjcm-flower"), chat: read(".yjcm-chat"), face: read(".yjcm-quick-face") };
		});
		assert.match(results.hud.menu.background, /yijiang\/btn_menu_main.png/);
		assert.match(results.hud.confirm.background, /yijiang\/game_btn_2.png/);
		assert.match(results.hud.cancel.background, /yijiang\/game_btn_2.png/);
		const unit = results.hud.window.height / 750;
		const near = (actual, expected, label, tolerance=.1) => assert(Math.abs(actual - expected) < tolerance, `${label}: ${actual} != ${expected}`);
		for (const [key, width, height] of [["menu",56,51],["question",34.4,34.4],["pile",92,112],["sort",106,38],["confirm",207.9,60.5],["cancel",207.9,60.5],["handcount",88,34],["skill",110,45],["flower",73,72],["face",73,72],["chat",73,72]]) {
			near(results.hud[key].rect.width/unit,width,key+" width"); near(results.hud[key].rect.height/unit,height,key+" height");
		}
		near((results.hud.cancel.rect.x-results.hud.confirm.rect.x)/unit,280,"confirm center spacing");
		near((results.hud.window.bottom-results.hud.confirm.rect.y-results.hud.confirm.rect.height/2)/unit,258,"confirm center from bottom");
		near((results.hud.window.bottom-results.hud.sort.rect.bottom)/unit,31,"sort bottom");
		results.buttonStates = [];
		for (const label of ["确定", "换牌"]) {
			const expectedImage=label==="换牌"?/game_btn_1.png/:/game_btn_2.png/;
			await page.evaluate(label => {
				lib._luckyCard.closeCardDialog();
				if(label==="换牌") lib._luckyCard.showDialog(lib._luckyCard.getPromptText(3,10000));
				ui.create.confirm("oc");
				if(label==="换牌") lib._luckyCard.setupConfirmButton(); else ui.confirm.node.ok.textContent=label;
			},label);
			await page.waitForTimeout(150);
			const readState = () => page.locator(".lbtn-confirm > .primary").evaluate(node => ({label:node.textContent, background:getComputedStyle(node).backgroundImage, filter:getComputedStyle(node).filter, width:node.getBoundingClientRect().width}));
			const enabled = await readState(); assert.match(enabled.background,expectedImage); assert.equal(enabled.filter,"none");
			assert.equal(enabled.label,label);
			const geometry = await page.locator(".lbtn-confirm").evaluate(n => ({flow:n.dataset.yjcmFlow,centers:n.lastChild.getBoundingClientRect().x-n.firstChild.getBoundingClientRect().x,centerY:n.firstChild.getBoundingClientRect().y+n.firstChild.getBoundingClientRect().height/2}));
			near(geometry.centers/unit,label==="换牌"?257:280,label+" center spacing");
			near((results.hud.window.bottom-geometry.centerY)/unit,label==="换牌"?254.5:258,label+" anchor");
			await page.locator(".lbtn-confirm").screenshot({path:path.join(__dirname,label==="换牌"?"yjcm-redraw-button.png":"yjcm-confirm-button.png")});
			const box = await page.locator(".lbtn-confirm > .primary").boundingBox();
			await page.evaluate(() => { ui.confirm.custom=()=>{}; });
			await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down(); await page.waitForTimeout(150);
			const pressed=await readState(); near(pressed.width/enabled.width,.75,label+" pressed scale");
			await page.mouse.up(); await page.mouse.move(640,280);
			await page.evaluate(() => ui.confirm.node.ok.classList.add("disabled"));
			const disabled=await readState(); assert.match(disabled.background,expectedImage); assert.equal(disabled.filter,"grayscale(1)");
			results.buttonStates.push({enabled,pressed,disabled,geometry});
		}
		await page.evaluate(() => { lib._luckyCard.closeCardDialog(); lib._luckyCard.hideTimer(); ui.create.confirm("oc"); ui.confirm.node.ok.textContent="确定"; });
		await page.waitForTimeout(150);
		results.confirmAfterRedraw=await page.locator(".lbtn-confirm > .primary").evaluate(n=>({flow:n.parentElement.dataset.yjcmFlow,background:getComputedStyle(n).backgroundImage,color:getComputedStyle(n).color}));
		assert.equal(results.confirmAfterRedraw.flow,"normal"); assert.match(results.confirmAfterRedraw.background,/game_btn_2.png/);
		assert.equal(results.confirmAfterRedraw.color,"rgb(247, 231, 174)");
		// 同一控件的文字不决定皮肤：普通流程写成“换牌”也不误染黄色。
		await page.evaluate(()=>{ui.confirm.node.ok.textContent="换牌";});
		assert.match(await page.locator(".lbtn-confirm > .primary").evaluate(n=>getComputedStyle(n).backgroundImage),/game_btn_2.png/);
		await page.evaluate(()=>{ui.confirm.node.ok.textContent="确定";});
		assert(results.hud.face.rect.bottom < results.hud.chat.rect.top);
		assert(results.hud.flower.rect.bottom < results.hud.face.rect.top);
		assert.deepEqual(await page.locator(".yjcm-chat-buttons > .yjcm-button").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label"))), ["互动道具", "表情", "聊天"]);
		assert.match(results.hud.flower.background, /yijiang\/game_menu_flower.png/);
		await page.locator(".yjcm-flower").click();
		await page.waitForFunction(() => window.chatBg?.show === true && !!window.xianhua && !!window.jidan);
		results.interactionOpened = true;
		await page.evaluate(() => game.showChatWordBackgroundX());
		await page.waitForTimeout(600);
		for (const selector of [".yjcm-quick-face", ".yjcm-chat"]) {
			await page.locator(selector).click();
			assert(await page.locator(selector).evaluate(node => !!node._uiintro && node._uiintro.isConnected), selector+" popup");
			await page.mouse.click(750,250);
		}
		await page.screenshot({ path: path.join(__dirname, "yjcm-buttons.png") });
		await page.locator(".yjcm-menu-main").click();
		assert.equal(await page.locator(".yjcm-menu-main").getAttribute("aria-expanded"), "true");
		assert.deepEqual(await page.locator(".yjcm-menu-list > div").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label"))), ["设置", "背景", "退出", "托管"]);
		await page.screenshot({ path: path.join(__dirname, "yjcm-menu.png") });
		await page.locator(".yjcm-menu-background").click();
		await page.getByRole("dialog", { name: "更换背景" }).waitFor();
		assert.equal(await page.locator(".yjcm-wallpaper-tile").count(), 21);
		await page.evaluate(() => Promise.all([...document.querySelectorAll(".yjcm-wallpaper-thumb")].slice(0, 8).map(image => image.decode())));
		results.grid = await page.locator(".yjcm-wallpaper-tile").evaluateAll(nodes => nodes.slice(0, 5).map(node => node.getBoundingClientRect().toJSON()));
		assert(Math.abs(results.grid[0].y - results.grid[3].y) < 1);
		assert(results.grid[4].y > results.grid[0].y);
		await page.screenshot({ path: path.join(__dirname, "yjcm-background.png") });
		const tile = id => page.locator(`.yjcm-wallpaper-tile[data-wallpaper="${id}"]`);
		await tile(0).click();
		await page.waitForFunction(() => ui.background.style.backgroundImage.includes("static_bg_0.png"));
		const checkbox = page.getByRole("checkbox", { name: "设为默认背景" });
		await checkbox.uncheck();
		await tile(1).click();
		results.settings = await page.evaluate(key => lib.config[key], configKey);
		assert.equal(results.settings.global.id, 0);
		assert.equal(results.settings.modes.identity.id, 1);
		await page.getByRole("switch", { name: "动态背景" }).click();
		await page.waitForFunction(() => ui.background.querySelector("canvas")?.style.visibility === "visible", null, { timeout: 20000 });
		results.animation = await page.evaluate(async () => {
			const canvas = ui.background.querySelector("canvas");
			const image = document.createElement("canvas"); image.width = 150; image.height = 75;
			const context = image.getContext("2d");
			const frame = () => new Promise(resolve => requestAnimationFrame(() => {
				context.clearRect(0,0,150,75); context.drawImage(canvas,0,0,150,75);
				resolve([...context.getImageData(0,0,150,75).data]);
			}));
			const a = await frame(); await new Promise(resolve => setTimeout(resolve, 500)); const b = await frame();
			return { nonempty: b.some((v,i) => i % 4 === 3 && v > 0), changing: a.some((v,i) => v !== b[i]), buffer: [canvas.width, canvas.height] };
		});
		assert(results.animation.nonempty && results.animation.changing, JSON.stringify(results.animation));
		results.dynamicScenes = [1];
		for (const id of [0, 2, 3, 6, 7, 8, 15, 315]) {
			await tile(id).click();
			await page.waitForFunction(id => ui.background.dataset.yjcmWallpaper === String(id) && ui.background.querySelector("canvas")?.style.visibility === "visible", id, { timeout: 20000 });
			await page.waitForTimeout(350);
			const visible = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
				const canvas = ui.background.querySelector("canvas"), image = document.createElement("canvas"); image.width=80; image.height=40;
				const context = image.getContext("2d"); context.drawImage(canvas,0,0,80,40);
				resolve([...context.getImageData(0,0,80,40).data].some((v,i) => i%4===3 && v>0));
			})));
			assert(visible, `dynamic scene ${id} has no pixels`);
			results.dynamicScenes.push(id);
		}
		await tile(1).click();
		await page.keyboard.press("Escape");
		results.confirmClicks = await page.evaluate(() => {
			const clicks = [];
			ui.create.confirm("oc", link => clicks.push(link));
			ui.confirm.node.ok.click(); ui.confirm.node.cancel.click();
			ui.confirm.node.ok.classList.add("disabled"); ui.confirm.node.ok.click();
			return clicks;
		});
		assert.deepEqual(results.confirmClicks, ["ok","cancel"]);
		await page.evaluate(() => ui.create.confirm("oc"));
		assert.equal(await page.locator(".yjcm-wallpaper-overlay").count(), 0);
		await page.locator(".yjcm-menu-main").click();
		await page.locator(".yjcm-menu-background").click();
		assert.equal(await tile(1).getAttribute("aria-pressed"), "true");
		await tile(22).click();
		await page.waitForFunction(() => !ui.background.querySelector("canvas"));
		assert.equal(await page.getByRole("switch", { name: "动态背景" }).isDisabled(), true);
		await page.keyboard.press("Escape");
		await page.setViewportSize({ width: 1169, height: 528 });
		await page.waitForTimeout(600);
		await page.evaluate(async () => { const image = new Image(); image.src = getComputedStyle(ui.background).backgroundImage.slice(5,-2); await image.decode(); });
		results.resizedMenu = await page.locator(".yjcm-menu-main").boundingBox();
		results.lowerLeft = await page.evaluate(() => document.elementsFromPoint(100,430).slice(0,5).map(n=>({tag:n.tagName,class:n.className,html:n.outerHTML.slice(0,500)})));
		assert(Math.abs(results.resizedMenu.width / results.hud.menu.rect.width - 528 / 750) < .01);
		await page.screenshot({ path: path.join(__dirname, "yjcm-buttons-1169.png") });
		// 与用户提供的官方截图同视口；预期值来自 yjcm-layout-source.json 的代码推导。
		await page.setViewportSize({width:1280,height:576});
		await page.evaluate(() => {
			game.me.init("zhouyu"); ui.updateSkillControl(game.me,true);
			lib.config.extension_十周年UI_cardScale=174*(576/750)/(1280*9/16);
			decadeUI.layout.resize();
			lib._luckyCard.showDialog(lib._luckyCard.getPromptText(3,10000));
			ui.create.confirm("oc"); lib._luckyCard.setupConfirmButton();
		});
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(1200);
		const measureLayout = () => page.evaluate(() => {
			const read = selector => { const n=document.querySelector(selector),s=getComputedStyle(n); return {rect:n.getBoundingClientRect().toJSON(),background:s.backgroundImage,border:s.borderImageSource}; };
			return {style:document.body.dataset.style,window:ui.window.getBoundingClientRect().toJSON(),unit:parseFloat(getComputedStyle(ui.window).getPropertyValue("--yjcm-unit")),menu:read(".yjcm-menu-main"),pile:read(".cardRoundNumber"),flower:read(".yjcm-flower"),face:read(".yjcm-quick-face"),chat:read(".yjcm-chat"),sort:read(".yjcm-sort"),confirm:read(".lbtn-confirm .primary"),cancel:read(".lbtn-confirm .primary2"),handcount:read(".handcardNumber"),hand:read(".hand-wrap"),cards:[...ui.handcards1.children].map(n=>n.getBoundingClientRect().toJSON()),active:read('.skill-control [data-id="fanjian"]'),passive:read('.skill-control [data-id="yingzi"]'),cardScale:lib.config.extension_十周年UI_cardScale};
		});
		results.referenceLayout=await measureLayout();
		const q=results.referenceLayout, u=576/750, inset=60*u;
		assert.equal(q.style,"othersOff");
		near(q.pile.rect.left,inset+17*u,"reference pile left"); near(q.menu.rect.right,1280-inset-14.5*u,"reference menu right");
		near(q.hand.rect.left,inset+40*u,"hand origin"); near(q.hand.rect.right,1280-inset-560*u,"hand width");
		near(q.hand.rect.height,200*u,"hand region height"); near(q.cards[0].bottom,576,"cards bottom aligned",.7);
		near(q.cards[0].left-q.hand.rect.left,q.cards[0].width/2,"hand initial inset",.6);
		near(q.handcount.rect.right,1280-inset-192*u,"handcount right"); near(q.handcount.rect.bottom,576-34*u,"handcount bottom");
		near(q.sort.rect.right,1280-inset-297*u,"sort display slot");
		near(q.active.rect.right,1280-inset-202*u,"active skill right"); near(q.passive.rect.right,1280-inset-202*u,"passive skill right");
		near(q.active.rect.bottom,576-111*u,"active above passive"); near(q.passive.rect.bottom,576-72*u,"passive baseline");
		near(q.active.rect.width,110*u,"active width"); near(q.active.rect.height,45*u,"active height");
		near(q.passive.rect.width,72.5*u,"passive width"); near(q.passive.rect.height,26*u,"passive height");
		assert.match(q.passive.border,/skill_beidong_btn.png/);
		await page.mouse.move(640,280);
		await page.evaluate(() => document.activeElement?.blur());
		await page.screenshot({path:path.join(__dirname,"yjcm-layout-1280.png")});
		results.skillImages = await page.evaluate(() => {
			ui.skills=ui.skills2=ui.skills3=undefined;
			ui.create.skills(["fanjian"]); ui.skillControl.update();
			const item=ui.skillControl.querySelector('[data-id="fanjian"]');
			const enabled=getComputedStyle(item).backgroundImage;
			ui.skills.skills=[]; ui.skillControl.update(); const disabled=getComputedStyle(item).backgroundImage;
			for (const [id,info] of [["_yjcm_layout_limit",{enable:"phaseUse",limited:true}],["_yjcm_layout_convert",{enable:"phaseUse",zhuanhuanji:true}]]) {
				lib.skill[id]=info; lib.translate[id]="校验"; ui.skillControl.add(id,[]);
			}
			ui.skillControl.update();
			const limited=ui.skillControl.querySelector('[data-id="_yjcm_layout_limit"]');
			const conversion=ui.skillControl.querySelector('[data-id="_yjcm_layout_convert"]');
			const limitDisabled=getComputedStyle(limited.querySelector(".xiandingji-mark")).backgroundImage;
			ui.skills.skills=["_yjcm_layout_limit"]; ui.skillControl.update();
			const limitNormal=getComputedStyle(limited.querySelector(".xiandingji-mark")).backgroundImage;
			game.me.awakenedSkills.push("_yjcm_layout_limit"); ui.skillControl.update();
			const limitUsed=getComputedStyle(limited.querySelector(".xiandingji-mark")).backgroundImage;
			const convert=getComputedStyle(conversion.querySelector(".zhuanhuanji-mark")).backgroundImage;
			ui.updateSkillControl(game.me,true);
			return {enabled,disabled,limitDisabled,limitNormal,limitUsed,convert};
		});
		assert.match(results.skillImages.enabled,/btn_skill_item_normal.png/); assert.match(results.skillImages.disabled,/btn_skill_normal_gray.png/);
		assert.match(results.skillImages.limitDisabled,/skill_item_lmt_pic_gray.png/);
		assert.match(results.skillImages.limitNormal,/skill_item_lmt_pic.png/); assert.match(results.skillImages.limitUsed,/skill_item_lmt_pic_gray.png/);
		assert.match(results.skillImages.convert,/skill_item_t_y(ang|ing)_pic_gray.png/);
		await page.evaluate(() => { lib.config.extension_十周年UI_cardScale=.24; decadeUI.layout.resize(); });
		await page.waitForTimeout(100);
		const resizedCards=await measureLayout();
		near(resizedCards.cards[0].height/q.cards[0].height,.24/q.cardScale,"card setting retained");
		near(resizedCards.hand.rect.left,q.hand.rect.left,"card setting keeps hand origin");
		await page.evaluate(() => { _status.event.allowChooseAll=true; _status.event.selectCard=[1,Infinity]; _status.event.isMine=()=>true; });
		await page.locator(".yjcm-select-all").waitFor({state:"visible"});
		near((await page.locator(".yjcm-select-all").boundingBox()).x,1280-inset-(427+106)*u,"second utility slot");
		await page.evaluate(() => { _status.event.allowChooseAll=false; });
		results.foldedHand=await page.evaluate(() => {
			lib.config.fold_card=true; lib.config.extension_十周年UI_handFoldMin=100;
			for(let i=0;i<12;i++) game.me.directgain([game.createCard("sha","spade",i+1)]);
			decadeUI.layout.resize();
			const hand=ui.handcards1.getBoundingClientRect(), last=ui.handcards1.lastElementChild.getBoundingClientRect();
			const result={scrolling:ui.handcards1Container.classList.contains("scrollh"),width:hand.width,lastRight:last.right-hand.left};
			lib.config.fold_card=false; decadeUI.layout.resize();
			return result;
		});
		assert(results.foldedHand.scrolling); assert(results.foldedHand.width+2>=results.foldedHand.lastRight,JSON.stringify(results.foldedHand));
		results.layoutVariants=[];
		for (const scenario of [{zoom:1.5,sidebar:"leftbar",side:"on",width:1280,height:576},{zoom:1.25,sidebar:"rightbar",side:"off",width:1440,height:810}]) {
			await page.evaluate(s => { game.documentZoom=s.zoom; document.body.style.zoom=s.zoom; ui.window.classList.toggle("leftbar",s.sidebar==="leftbar"); ui.window.classList.toggle("rightbar",s.sidebar==="rightbar"); lib.config.extension_十周年UI_rightLayout=s.side; ui.arena.dataset.rightLayout=s.side; decadeUI.layout.resize(); },scenario);
			await page.setViewportSize({width:scenario.width,height:scenario.height});
			await page.waitForTimeout(250);
			const v=await measureLayout(), w=v.window, unit=Math.min(w.width/1334,w.height/750);
			const sx=(w.width-Math.max(1334,Math.min(1750,w.width/unit-120))*unit)/2, sy=(w.height-750*unit)/2;
			near(v.menu.rect.right,w.right-sx-14.5*unit,"zoom menu right",.2);
			near(v.hand.rect.left,w.left+sx+(scenario.side==="on"?40:560)*unit,"zoom hand origin",.2);
			near(v.handcount.rect.bottom,w.bottom-sy-34*unit,"zoom handcount bottom",.2);
			near(v.active.rect.bottom,w.bottom-sy-111*unit,"zoom skill baseline",.2);
			if(scenario.side==="on") near(v.active.rect.right,w.right-sx-202*unit,"zoom skill right",.2);
			else near(v.active.rect.left,w.left+sx+202*unit,"mirrored skill left",.2);
			results.layoutVariants.push({scenario,window:w,hand:v.hand.rect,skill:v.active.rect});
		}
		await page.evaluate(() => { document.body.style.zoom=1; game.documentZoom=1; ui.window.classList.remove("leftbar","rightbar"); lib.config.extension_十周年UI_rightLayout="on"; ui.arena.dataset.rightLayout="on"; decadeUI.layout.resize(); });
		await page.evaluate(() => { lib._luckyCard.closeCardDialog(); lib._luckyCard.hideTimer(); });
		results.modeScope = await page.evaluate(async () => {
			const { createXinshaBackgroundSelector } = await import("/extension/十周年UI/ui/lbtn/skins/xinsha-background-selector.js");
			const selector = createXinshaBackgroundSelector(lib, game, ui, get, _status);
			const originalMode = lib.config.mode;
			lib.config.mode = "doudizhu"; await selector.restore(); const global = ui.background.dataset.yjcmWallpaper;
			lib.config.mode = originalMode; await selector.restore();
			return [global, ui.background.dataset.yjcmWallpaper];
		});
		assert.deepEqual(results.modeScope, ["0", "22"]);
		await page.reload();
		await page.locator("#arena > .player").nth(1).waitFor({state:"attached",timeout:45000});
		await page.waitForTimeout(300);
		const restored = await page.waitForFunction(async () => { const {ui} = await import("/noname.js"); return ui.background?.dataset.yjcmWallpaper || false; }, null, {timeout:45000});
		results.restored = await restored.jsonValue();
		assert.equal(results.restored,"22");
		results.layouts = [];
		for (const phonelayout of [true, false]) {
			seed.phonelayout=phonelayout;
			await page.reload();
			await page.locator(".yjcm-chat-buttons > .yjcm-button").nth(2).waitFor({state:"attached",timeout:45000});
			const actual=await page.evaluate(async () => {
				const {lib,ui}=await import("/noname.js");
				lib._luckyCard.showDialog(lib._luckyCard.getPromptText(3,10000)); ui.create.confirm("oc"); lib._luckyCard.setupConfirmButton();
				return {style:document.body.dataset.style,phonelayout:lib.config.phonelayout,buttons:document.querySelectorAll(".yjcm-chat-buttons > .yjcm-button").length,background:getComputedStyle(ui.confirm.node.ok).backgroundImage};
			});
			assert.equal(actual.style,"othersOff"); assert.equal(actual.phonelayout,phonelayout); assert.equal(actual.buttons,3); assert.match(actual.background,/game_btn_1.png/);
			results.layouts.push(actual);
		}
		results.isolation = [];
		for (const style of ["on", "off", "onlineUI", "babysha", "codename"]) {
			seed.extension_十周年UI_newDecadeStyle = style;
			await page.reload();
			await page.waitForFunction(style => document.body.dataset.style === style && !!document.getElementById("arena"), style, {timeout:45000});
			await page.waitForTimeout(150);
			assert.equal(await page.locator(".yjcm-menu,.yjcm-chat-buttons,.yjcm-wallpaper-overlay").count(),0,style);
			results.isolation.push(style);
		}
		results.errors = errors; results.failed = failed;
		assert.deepEqual(errors, []);
		assert.deepEqual(failed, []);
		fs.writeFileSync(path.join(__dirname, "yjcm-buttons-results.json"), JSON.stringify(results, null, 2));
		console.log("YJCM_BUTTONS_BROWSER_OK", JSON.stringify(results.animation));
	} finally {
		await browser.close(); server.close();
	}
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
