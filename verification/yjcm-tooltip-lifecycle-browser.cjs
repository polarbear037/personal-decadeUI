const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
const configKey = "extension_十周年UI_yjcmBackground";
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_rightLayout: "on", phonelayout:true, touchscreen: false });
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
			await page.screenshot({ path: path.join(__dirname, "yjcm-tooltip-startup.png") });
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
            game.me = game.players[0]; game.me.init("sunquan"); game.players[1].init("guanyu");
            _status.gameStarted = true; _status.over = false;
            const event = game.createEvent("phaseUse", false); event.player = game.me;
            _status.eventManager.setStatusEvent(event, true);
            window.testCard = game.createCard("sha", "spade", 1);
            game.me.directgain([testCard, game.createCard("wuzhong", "heart", 7)]);
            ui.updateSkillControl(game.me, true);
            game.resume2();
            window.tooltips = await import("/extension/十周年UI/src/ui/skillButtonTooltip.js");
            window.xinshaTips = await import("/extension/十周年UI/src/ui/xinsha-tooltip.js");
            tooltips.skillButtonTooltip.showDelay = 0;
            window.showCardIntro = () => {
                window.cardIntro?.remove();
                window.cardIntro = get.nodeintro(testCard, false);
                cardIntro.classList.add("popped", "static");
                ui.window.append(cardIntro);
                lib.placePoppedDialog(cardIntro, { clientX: 700, clientY: 600 });
            };
            showCardIntro();
        });

        await page.waitForTimeout(500);
        await page.evaluate(() => { cardIntro.remove(); });
        const button=page.locator('.skill-control [data-id="zhiheng"]');
        await button.hover();
        await page.waitForFunction(()=>tooltips.skillButtonTooltip.tooltip?.style.opacity==='1');
        results.before=await page.evaluate(()=>({button:tooltips.skillButtonTooltip.currentButton.getBoundingClientRect().toJSON(),tooltip:tooltips.skillButtonTooltip.tooltip.getBoundingClientRect().toJSON()}));
        assert(results.before.tooltip.left>500 && results.before.tooltip.bottom<results.before.button.top);
        await page.evaluate(()=>{ui.updateSkillControl(game.me,true);tooltips.skillButtonTooltip.tooltip.querySelector('.xinsha-tooltip-description').append('重排'.repeat(100));});
        await page.mouse.move(700,300);
        await page.waitForTimeout(400);
        results.after=await page.evaluate(()=>({connected:tooltips.skillButtonTooltip.currentButton?.isConnected,display:tooltips.skillButtonTooltip.tooltip.style.display,rect:tooltips.skillButtonTooltip.tooltip.getBoundingClientRect().toJSON()}));
        console.log(JSON.stringify(results));
        assert.equal(results.after.display,'none','重建技能按钮后必须清理旧提示');

        // 重建后新按钮仍可正常指向，提示重排继续跟随有效按钮。
        await button.hover();
        await page.waitForFunction(()=>tooltips.skillButtonTooltip.tooltip?.style.opacity==='1');
        await page.evaluate(()=>tooltips.skillButtonTooltip.tooltip.querySelector('.xinsha-tooltip-description').append('说明'.repeat(100)));
        await page.waitForTimeout(100);
        results.reflow=await page.evaluate(()=>({source:tooltips.skillButtonTooltip.tooltip._xinshaTooltipSource===tooltips.skillButtonTooltip.currentButton,rect:tooltips.skillButtonTooltip.tooltip.getBoundingClientRect().toJSON()}));
        assert(results.reflow.source && results.reflow.rect.left>500);
        await page.mouse.move(700,300);
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.skill-button-tooltip').evaluate(n=>n.style.display),'none','普通移出隐藏');

        // 鼠标可以从按钮进入长提示滚动，再移出隐藏。
        await page.evaluate(()=>{lib.dynamicTranslate.zhiheng=()=> '长说明'.repeat(500);});
        await button.hover();
        await page.waitForFunction(()=>tooltips.skillButtonTooltip.tooltip?.style.opacity==='1');
        const bounds=await page.locator('.skill-button-tooltip').boundingBox();
        await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height-15);
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.skill-button-tooltip').evaluate(n=>n.style.display),'block','进入提示保留滚动');
        await page.mouse.wheel(0,200);
        await page.waitForTimeout(100);
        assert(await page.locator('.xinsha-tooltip-scroll').evaluate(n=>n.scrollTop)>0);
        await page.mouse.move(700,300);
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.skill-button-tooltip').evaluate(n=>n.style.display),'none','移出提示隐藏');
        await page.evaluate(()=>delete lib.dynamicTranslate.zhiheng);

        // 模拟样式/字体准备尚未完成时移出，恢复异步回调后不能再次显示。
        await page.evaluate(()=>{
            window.originalPrepare=tooltips.skillButtonTooltip.positionTooltip;
            window.positionCalls=0;
            tooltips.skillButtonTooltip.positionTooltip=function(...args){positionCalls++;return originalPrepare.apply(this,args);};
            window.fontReady=Object.getOwnPropertyDescriptor(document.fonts,'ready');
            Object.defineProperty(document.fonts,'ready',{configurable:true,value:new Promise(resolve=>window.releaseFonts=resolve)});
        });
        await button.hover();
        await page.waitForFunction(()=>tooltips.skillButtonTooltip.tooltip?.style.display==='block');
        await page.mouse.move(700,300);
        await page.evaluate(()=>{releaseFonts();if(fontReady)Object.defineProperty(document.fonts,'ready',fontReady);else delete document.fonts.ready;});
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(()=>positionCalls),0,'取消后异步回调不能再次定位显示');
        assert.equal(await page.locator('.skill-button-tooltip').evaluate(n=>n.style.display),'none');
        await page.evaluate(()=>{tooltips.skillButtonTooltip.positionTooltip=originalPrepare;tooltips.skillButtonTooltip.destroy();});
        assert.deepEqual(errors,[]);
        console.log(JSON.stringify({passed:true,checks:['real skillControl rebuild','reflow stays anchored','mouseleave hides','real pointer transfer and wheel','cancel during async preparation'],errors}));
    } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
