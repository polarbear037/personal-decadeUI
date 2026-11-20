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
            window.checkTooltipControlLayer = host => {
                const controls = ui.arena.querySelector('#dui-controls');
                const panel = host.querySelector('.xinsha-tooltip'), r = Element.prototype.getBoundingClientRect.call(panel), c = Element.prototype.getBoundingClientRect.call(controls);
                const x = r.left + r.width / 2, y = r.top + r.height / 2, sx = c.width / controls.offsetWidth || 1, sy = c.height / controls.offsetHeight || 1;
                const cover = document.createElement('div');cover.dataset.tooltipLayerCover = '';
                Object.assign(cover.style, {position:'absolute',left:((x-c.left)/sx-20)+'px',top:((y-c.top)/sy-20)+'px',width:'40px',height:'40px',pointerEvents:'auto',background:'#ff0000',zIndex:'1'});
                controls.append(cover);
                try {const rect=Element.prototype.getBoundingClientRect.call(cover), top=document.elementFromPoint(x,y);return {tooltipZ:Number(getComputedStyle(host).zIndex),controlsZ:Number(getComputedStyle(controls).zIndex),overlaps:x>rect.left&&x<rect.right&&y>rect.top&&y<rect.bottom,tooltipOnTop:host.contains(top)};}
                finally {cover.remove();}
            };
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
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("body").getAttribute("data-style"), "othersOff");
        const read = () => page.evaluate(() => {
            const panel = cardIntro.querySelector(".xinsha-tooltip"), title = panel.querySelector(".xinsha-tooltip-title"), body = panel.querySelector(".xinsha-tooltip-description");
            const box = node => node.getBoundingClientRect().toJSON();
            return { host: box(cardIntro), panel: box(panel), title: box(title), body: box(body), text: panel.textContent, color: getComputedStyle(title).color, bodyFont: getComputedStyle(body).fontSize, frame: getComputedStyle(panel,"::before").borderImageSource, unit: parseFloat(getComputedStyle(ui.window).getPropertyValue("--yjcm-unit")), source: testCard.parentElement.className, font: getComputedStyle(title).fontFamily };
        });
        results.card = await read();
        results.cardLayer=await page.evaluate(()=>checkTooltipControlLayer(cardIntro));
        assert.ok(results.cardLayer.overlaps&&results.cardLayer.tooltipOnTop&&results.cardLayer.tooltipZ>results.cardLayer.controlsZ,'卡牌说明须实际覆盖dui-controls');
        assert.match(results.card.frame, /xinsha\/item_tips_bg.png/);
        assert.equal(results.card.color, "rgb(85, 207, 48)");
        assert.ok(Math.abs(parseFloat(results.card.bodyFont)-24)<0.01);
        assert.match(results.card.text,/杀/);
        assert.match(results.card.text,/出牌阶段/);
        const near = (value, target, label) => assert.ok(Math.abs(value - target) < 1, `${label}: ${value} != ${target}`);
        near(results.card.panel.width / results.card.unit, 518, "card design width");
        near((results.card.title.x-results.card.panel.x)/results.card.unit,19,"card title x");
        near((results.card.title.y-results.card.panel.y)/results.card.unit,11,"card title y");
        await page.locator('.skill-control [data-id="zhiheng"]').hover();
        await page.waitForFunction(() => document.querySelector('.skill-button-tooltip.xinsha-tooltip-host')?.style.opacity === "1");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);
        results.skill = await page.locator('.skill-button-tooltip').evaluate(host => {
            const panel=host.firstElementChild, name=panel.querySelector('.xinsha-tooltip-name'), badge=panel.querySelector('.xinsha-tooltip-badge'), body=panel.querySelector('.xinsha-tooltip-description');
            return {rect:panel.getBoundingClientRect().toJSON(),title:panel.querySelector('.xinsha-tooltip-title').getBoundingClientRect().toJSON(),badge:badge.getBoundingClientRect().toJSON(),name:name.textContent,active:badge.dataset.active,body:body.textContent,font:getComputedStyle(name).fontFamily,size:getComputedStyle(name).fontSize,bodySize:getComputedStyle(body).fontSize,bodyRect:body.getBoundingClientRect().toJSON(),frame:getComputedStyle(panel,'::before').borderImageSource,unit:parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-unit'))};
        });
        assert.equal(results.skill.name,"制衡"); assert.equal(results.skill.active,"true");
        assert.match(results.skill.font,/dui-yjcm-skill/); assert.ok(Math.abs(parseFloat(results.skill.size)-34)<0.01); assert.ok(Math.abs(parseFloat(results.skill.bodySize)-22)<0.01);
        assert.match(results.skill.frame,/xinsha\/new_skill_bg.png/);
        results.skillLayer=await page.evaluate(()=>checkTooltipControlLayer(tooltips.skillButtonTooltip.tooltip));
        assert.ok(results.skillLayer.overlaps&&results.skillLayer.tooltipOnTop&&results.skillLayer.tooltipZ>results.skillLayer.controlsZ,'技能按钮说明须实际覆盖dui-controls');
        near(results.skill.rect.width/results.skill.unit,400,"skill design width");
        near((results.skill.title.x-results.skill.rect.x)/results.skill.unit,21,"skill title x");
        near((results.skill.title.y-results.skill.rect.y)/results.skill.unit,16,"skill title y");
        near((results.skill.bodyRect.y-results.skill.rect.y)/results.skill.unit,69,"skill body y");
        near((results.skill.badge.x-results.skill.rect.x)/results.skill.unit,121,"skill badge x");
        await page.screenshot({path:path.join(__dirname,"yjcm-tooltip-browser.png")});

        results.userCard = await page.evaluate(async () => {
            tooltips.skillButtonTooltip.destroy();
            window.testCard=game.createCard('wuzhong','heart',11);game.me.directgain([testCard]);
            await new Promise(resolve=>setTimeout(resolve,200));showCardIntro();
            await xinshaTips.prepareXinshaTooltip(cardIntro);xinshaTips.positionXinshaTooltip(cardIntro);
            const title=cardIntro.querySelector('.xinsha-tooltip-name'), body=cardIntro.querySelector('.xinsha-tooltip-description');
            return {title:title.textContent, visibleText:body.innerText, size:cardIntro.getBoundingClientRect().toJSON(), types:[...body.querySelectorAll('.text.center')].map(n=>({text:n.textContent,display:getComputedStyle(n).display})), body:body.getBoundingClientRect().toJSON()};
        });
        assert.equal(results.userCard.title,'无中生有');
        assert(!results.userCard.visibleText.includes('锦囊牌'));
        near(results.userCard.size.height,92+results.userCard.body.height,'card height from TextTips sum(label heights)+58');
        await page.locator('.xinsha-tooltip-host[data-xinsha-tooltip="card"]').screenshot({path:path.join(__dirname,'yjcm-tooltip-wuzhong.png')});
        // 以下测量由程序显示；先移开真实鼠标，避免旧节点移除后的 mouseleave 取消新请求。
        await page.mouse.move(700,300);
        await page.waitForTimeout(250);
        results.appearanceFrames = await page.evaluate(async () => {
            const originalUnit=ui.window.style.getPropertyValue('--yjcm-unit');ui.window.style.setProperty('--yjcm-unit','0.65px');
            const button=document.querySelector('.skill-control [data-id="zhiheng"]');
            tooltips.skillButtonTooltip.show(button,'zhiheng',game.me);
            const frames=[];
            for(let i=0;i<35;i++) {
                await new Promise(requestAnimationFrame);
                const host=tooltips.skillButtonTooltip.tooltip;
                if(host?.style.opacity==='1') {
                    const panel=host.firstElementChild;
                    frames.push({width:panel.getBoundingClientRect().width,height:panel.getBoundingClientRect().height,transition:getComputedStyle(panel).transitionDuration,animations:panel.getAnimations({subtree:true}).length});
                }
            }
            ui.window.style.setProperty('--yjcm-unit',originalUnit);
            return frames;
        });
        assert(results.appearanceFrames.length>15);
        for(const frame of results.appearanceFrames) { near(frame.width,260,'visible first-frame width');assert.equal(frame.transition,'0s');assert.equal(frame.animations,0);near(frame.height,results.appearanceFrames[0].height,'stable appearance height'); }

        // 长说明可从按钮进入提示内滚动，移出后隐藏；保留动态翻译。
        await page.evaluate(() => tooltips.skillButtonTooltip.hide(true));
        await page.locator('.skill-control [data-id="zhiheng"]').hover();
        await page.evaluate(() => {
            cardIntro.remove();
            lib.dynamicTranslate.zhiheng = () => "动态说明：" + "出牌阶段，你可以弃置任意张牌，然后摸等量的牌。".repeat(75);
            tooltips.skillButtonTooltip.show(document.querySelector('.skill-control [data-id="zhiheng"]'),"zhiheng",game.me);
        });
        await page.waitForTimeout(150);
        results.long = await page.locator('.skill-button-tooltip').evaluate(host => {
            const scroll=host.querySelector('.xinsha-tooltip-scroll');scroll.scrollTop=100;
            return {height:host.getBoundingClientRect().height,view:ui.window.clientHeight,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight,scrollTop:scroll.scrollTop,dynamic:scroll.textContent.includes("动态说明")};
        });
        assert(results.long.dynamic && results.long.scrollHeight>results.long.clientHeight && results.long.scrollTop>0);
        assert(results.long.height<results.long.view);
        await page.evaluate(() => { tooltips.skillButtonTooltip.hide();tooltips.skillButtonTooltip.tooltip.dispatchEvent(new MouseEvent('mouseenter')); });
        await page.waitForTimeout(250);
        assert.equal(await page.locator('.skill-button-tooltip').evaluate(n=>n.style.display),"block");
        await page.mouse.move(30,50);
        await page.waitForTimeout(250);
        assert.equal(await page.locator('.skill-button-tooltip').evaluate(n=>n.style.display),"none");
        await page.evaluate(() => {delete lib.dynamicTranslate.zhiheng;tooltips.skillButtonTooltip.destroy();});
        // 无信息泄漏：暗牌不换肤，装备/标记/弃牌堆不落入手牌专用分支。
        results.exclusions = await page.evaluate(() => {
            const out={};
            for (const cls of ['infohidden','infoflip','blank']) {
                testCard.classList.add(cls);const d=get.nodeintro(testCard,false);out[cls]=!d?.dataset.xinshaTooltip;d?.remove();testCard.classList.remove(cls);
            }
            const card=game.createCard('bagua','club',2);ui.arena.append(card);const d=get.nodeintro(card,false);out.outsideHand=!d.dataset.xinshaTooltip;d.remove();card.remove();return out;
        });
        assert(Object.values(results.exclusions).every(Boolean));
        results.scaling=[];
        for (const [width,height,zoom] of [[1280,720,1],[1500,750,1.25]]) {
            await page.setViewportSize({width,height});
            await page.evaluate(zoom=>{document.body.style.zoom=zoom;showCardIntro();},zoom);
            await page.waitForTimeout(150);
            results.scaling.push(await read());
            const box=await page.evaluate(()=>({window:ui.window.getBoundingClientRect().toJSON(),host:cardIntro.getBoundingClientRect().toJSON()}));
            assert(box.host.left>=box.window.left-1 && box.host.right<=box.window.right+1);
            assert(box.host.top>=box.window.top-1 && box.host.bottom<=box.window.bottom+1);
        }
        await page.evaluate(()=>{document.body.style.zoom='';cardIntro.remove();});
        results.isolation=[];
        for (const style of ['onlineUI','on','off','babysha','codename']) {
            const state=await page.evaluate(async style=>{
                document.body.dataset.style=style;lib.config.extension_十周年UI_newDecadeStyle=style;
                const d=get.nodeintro(testCard,false);ui.window.append(d);lib.placePoppedDialog(d,{clientX:700,clientY:500});
                const button=document.querySelector('.skill-control [data-id="zhiheng"]');
                tooltips.skillButtonTooltip.show(button,'zhiheng',game.me);
                return {style,xinsha:!!d.dataset.xinshaTooltip,online:!!d.dataset.decadeTooltip,text:d.textContent};
            },style);
            await page.waitForTimeout(150);
            state.skill=await page.locator('.skill-button-tooltip').evaluate(n=>({xinsha:!!n.dataset.xinshaTooltip,online:!!n.dataset.decadeTooltip,background:getComputedStyle(n).backgroundImage}));
            assert.equal(state.xinsha,false);assert.equal(state.skill.xinsha,false);
            assert.equal(state.online,style==='onlineUI'); assert.equal(state.skill.online,style==='onlineUI');
            results.isolation.push(state);
            await page.evaluate(()=>{document.querySelectorAll('#window>.dialog.popped').forEach(n=>n.remove());tooltips.skillButtonTooltip.destroy();});
        }
        assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
        results.errors=errors;results.failed=failed;
        fs.writeFileSync(path.join(__dirname,'yjcm-tooltip-results.json'),JSON.stringify(results,null,2));
        console.log(JSON.stringify({passed:true,checks:['native get.nodeintro / lib.placePoppedDialog','actual skill hover','official asset and geometry','dynamic long description scroll and hide','hidden card and outside hand exclusions','window and documentZoom','five other styles isolation'],errors,failed}));
    } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
