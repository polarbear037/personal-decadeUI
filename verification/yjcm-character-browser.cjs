const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
const configKey = "extension_十周年UI_yjcmBackground";
Object.assign(seed, { mode: "identity", characters: ["standard", "huicui", "xianding"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_rightLayout: "on", phonelayout:true, touchscreen: false });
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
		page.on("response", response => { if (response.status() >= 400 && /character\/xinsha\/official|yjcm-character|tooltip\/xinsha/.test(response.url())) failed.push(response.status() + " " + decodeURIComponent(response.url())); });
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
			await page.screenshot({ path: path.join(__dirname, "yjcm-character-startup.png") });
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
            game.me = game.players[0]; game.me.init("zhoushan"); game.players[1].init("guanyu");
            _status.gameStarted = true; _status.over = false;
            const event = game.createEvent("phaseUse", false); event.player = game.me;
            _status.eventManager.setStatusEvent(event, true);
            lib.config.right_info = true;
            lib.config.connect_nickname = "雷";
            delete lib.config.tl_versus_miniChange;
            window.miniCalls = [];
            delete window.__tlMiniChangePanel;
            window.characterPlugin = app.pluginsMap.character;
            if (characterPlugin.skinName !== "xinsha") throw Error("Incorrect character skin route");
            lib.setIntro(game.me);
        });
        await page.locator('#arena > .player').first().dispatchEvent('contextmenu', { bubbles: true, cancelable: true });
        await page.locator('.yjcm-seat-info').waitFor({ state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        assert.equal(await page.locator('body').getAttribute('data-style'), 'othersOff');
        const read = () => page.evaluate(() => {
            const d = document.querySelector('.yjcm-seat-info'), right = d.querySelector('.right');
            const box = n => n.getBoundingClientRect().toJSON();
            const relative = n => {
                const r = n.getBoundingClientRect(), b = d.getBoundingClientRect(), scale = b.width / 1031;
                return { x: (r.x - b.x) / scale, y: (r.y - b.y) / scale, w: r.width / scale, h: r.height / scale };
            };
            const label = d.querySelector('.xskill > [data-color]'), text = d.querySelector('.xskill > div:not([data-color])');
            return { window: box(d), close: relative(d.querySelector('.diaozhui')), mini: relative(d.querySelector('.miniChange')), pane: relative(right), card: relative(d.querySelector('.yjcm-general-card')), tab: relative(d.querySelector('.skillx')), text: right.textContent, skillCount: d.querySelectorAll('.xskill').length, titleFont: getComputedStyle(label).fontSize, textFont: getComputedStyle(text).fontSize, skillBg: getComputedStyle(label).backgroundImage, scrollHeight: right.firstChild.scrollHeight, clientHeight: right.firstChild.clientHeight, paused: _status.paused2 };
        });
        results.initial = await read();
        // 接口和配置均未加载时也有入口；同一个按钮在接口稍后到位后直接可用。
        const miniButton = page.locator('.yjcm-seat-info .miniChange');
        await miniButton.click();
        assert.deepEqual(await page.evaluate(() => miniCalls), []);
        results.miniAvailability = await page.evaluate(() => {
            const button = document.querySelector('.yjcm-seat-info .miniChange');
            const open = player => miniCalls.push(player === game.me ? 'self' : 'other');
            window.__tlMiniChangePanel = { open };
            for (const value of [undefined, false, '关闭']) {
                lib.config.tl_versus_miniChange = value;
                button.click();
            }
            if (miniCalls.length) throw Error('Disabled mini chooser must be skipped');
            lib.config.tl_versus_miniChange = true;
            delete window.__tlMiniChangePanel;
            button.click();
            window.__tlMiniChangePanel = { open: false };
            button.click();
            window.__tlMiniChangePanel = { open };
            for (const value of [true, '开启']) {
                lib.config.tl_versus_miniChange = value;
                button.click();
            }
            const calls = [...miniCalls];
            miniCalls.length = 0;
            return { sameButton: button === document.querySelector('.yjcm-seat-info .miniChange'), calls };
        });
        assert.equal(results.miniAvailability.sameButton, true);
        assert.deepEqual(results.miniAvailability.calls, ['self', 'self']);
        assert.equal(results.initial.skillCount, 2);
        assert.match(results.initial.text, /密运/);
        assert.match(results.initial.text, /胆迎/);
        assert.equal(results.initial.titleFont, '32px');
        assert.equal(results.initial.textFont, '24px');
        assert.match(results.initial.skillBg, /tooltip\/xinsha\/game_playinfo_skillbg.png/);
        assert.equal(results.initial.paused, true);
        assert.equal(await page.evaluate(() => {
            const d = document.querySelector('.yjcm-seat-info');
            return Number(getComputedStyle(d.querySelector('.right')).zIndex) > Number(getComputedStyle(d.querySelector('.yjcm-info-frame')).zIndex);
        }), true, 'opaque frame must stay below skill text');
        for (const [name, expected] of Object.entries({ close:[969.5,0,53,53], mini:[78,391,48,48], pane:[387,21,559,378], tab:[965,53,52,126], card:[82.5,44.4,209,277.2] })) {
            const values = Object.values(results.initial[name]);
            values.forEach((v,i) => assert.ok(Math.abs(v-expected[i]) < .1, `${name}: ${values} expected ${expected}`));
        }
        await page.screenshot({ path: path.join(__dirname, 'yjcm-character-browser.png') });
        results.cardDetails = await page.evaluate(() => {
            const d = document.querySelector('.yjcm-seat-info'), portrait=d.querySelector('.yjcm-general-portrait');
            const hp=d.querySelector('.yjcm-general-hp'), bg=d.querySelector('.yjcm-general-hp-bg');
            const scroller=d.querySelector('.right > div');
            return { portrait:[portrait.offsetLeft,portrait.offsetTop,portrait.offsetWidth,portrait.offsetHeight],mask:getComputedStyle(portrait).maskImage,hp:[hp.offsetLeft,hp.offsetTop,hp.offsetWidth,hp.offsetHeight],background:getComputedStyle(bg).borderImageSource,backgroundHeight:bg.offsetHeight,gutter:scroller.offsetWidth-scroller.clientWidth,scrollbar:getComputedStyle(scroller).scrollbarWidth,webkitScrollbar:getComputedStyle(scroller,'::-webkit-scrollbar').display,miniParent:d.querySelector('.miniChange').parentElement.className };
        });
        assert.deepEqual(results.cardDetails.portrait,[10,-3,180,245]);
        assert.deepEqual(results.cardDetails.hp,[146,139,36,105]);
        assert.match(results.cardDetails.mask,/skin_clip.png/);
        assert.match(results.cardDetails.background,/yjcm_general_hp_bg.png/);
        assert.equal(results.cardDetails.backgroundHeight,216);
        assert.equal(results.cardDetails.gutter,0);
        assert.equal(results.cardDetails.scrollbar,'none');
        assert.equal(results.cardDetails.webkitScrollbar,'none');
        assert.equal(results.cardDetails.miniParent,'yjcm-info-footer');
        await page.locator('.yjcm-general-hp').screenshot({path:path.join(root,'.codex-tmp/yjcm-character-hp-on.png')});
        await page.locator('.yjcm-general-hp-bg').evaluate(n=>{n.style.display='none'});
        await page.locator('.yjcm-general-hp').screenshot({path:path.join(root,'.codex-tmp/yjcm-character-hp-off.png')});
        await page.locator('.yjcm-general-hp-bg').evaluate(n=>{n.style.display=''});
        assert.notDeepEqual(fs.readFileSync(path.join(root,'.codex-tmp/yjcm-character-hp-on.png')),fs.readFileSync(path.join(root,'.codex-tmp/yjcm-character-hp-off.png')),'HP background must actually paint');
        await page.evaluate(()=>{game.me.init('caojinyu');characterPlugin.click.playerIntro.call(characterPlugin,null,game.me)});
        await page.evaluate(()=>document.fonts.ready);
        assert.equal(await page.locator('.yjcm-seat-info .xskill').count(),3);
        const caoScroller=page.locator('.yjcm-seat-info .right > div');
        assert.equal(await caoScroller.evaluate(n=>getComputedStyle(n).scrollbarWidth),'none');
        results.dragScroll = [];
        const touchSession = await page.context().newCDPSession(page);
        await touchSession.send('Emulation.setTouchEmulationEnabled', {enabled:true,maxTouchPoints:1});
        for (const zoom of [1,1.5]) {
            await page.evaluate(zoom=>{document.body.style.zoom=zoom;document.querySelector('.yjcm-seat-info .right > div').scrollTop=0;},zoom);
            await page.waitForTimeout(100);
            let rect=await caoScroller.boundingBox();
            const x=rect.x+rect.width*.75, y=rect.y+rect.height*.75, delta=Math.min(100,rect.height*.4);
            const metrics=await caoScroller.evaluate(n=>({scale:Element.prototype.getBoundingClientRect.call(n).height/n.clientHeight,max:n.scrollHeight-n.clientHeight}));
            await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-delta,{steps:12});await page.mouse.up();
            const mouse=await caoScroller.evaluate(n=>n.scrollTop);
            assert.ok(Math.abs(mouse-Math.min(metrics.max,delta/metrics.scale))<2,`mouse drag zoom=${zoom}: ${mouse}`);
            await page.mouse.move(x,y-delta);await page.mouse.down();await page.mouse.move(x,y,{steps:12});await page.mouse.up();
            assert.ok(await caoScroller.evaluate(n=>n.scrollTop)<2,'mouse reverse drag returns to top');
            await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
            for(let step=1;step<=12;step++)await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-delta*step/12}]});
            await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
            const touch=await caoScroller.evaluate(n=>n.scrollTop);
            assert.ok(Math.abs(touch-Math.min(metrics.max,delta/metrics.scale))<2,`touch drag zoom=${zoom}: ${touch}`);
            assert.equal(await page.locator('.yjcm-seat-info').locator('..').evaluate(n=>n.classList.contains('hidden')),false,'drag does not close dialog');
            results.dragScroll.push({zoom,mouse,touch,metrics});
        }
        await page.evaluate(()=>{document.body.style.zoom=1;document.querySelector('.yjcm-seat-info .right > div').scrollTop=0;});
        await page.waitForTimeout(100);
        // 保留技能描述内链接的点按，不把点击误判为拖动。
        await caoScroller.evaluate(n=>{const a=document.createElement('a');a.textContent='测试技能链接';a.href='#';a.id='yjcm-drag-link';a.style.cssText='position:relative;display:block;';a.onclick=e=>{e.preventDefault();window.infoLinkClicks=(window.infoLinkClicks||0)+1;};n.prepend(a);});
        await page.locator('#yjcm-drag-link').click();
        assert.equal(await page.evaluate(()=>infoLinkClicks),1);
        await page.locator('#yjcm-drag-link').evaluate(n=>n.remove());
        // 关闭中断拖动时释放捕获，重新打开后仍能滚动。
        const cancelRect=await caoScroller.boundingBox();
        await page.mouse.move(cancelRect.x+cancelRect.width*.7,cancelRect.y+cancelRect.height*.7);await page.mouse.down();
        await page.mouse.move(cancelRect.x+cancelRect.width*.7,cancelRect.y+cancelRect.height*.4,{steps:5});
        await page.evaluate(()=>characterPlugin.playerDialog.hide());await page.mouse.up();
        assert.equal(await page.evaluate(()=>_status.paused2),false);
        await page.evaluate(()=>characterPlugin.playerDialog.show(game.me,true));
        assert.equal(await caoScroller.evaluate(n=>n.hasPointerCapture(1)),false);
        await page.screenshot({path:path.join(__dirname,'yjcm-character-caojinyu.png')});
        await caoScroller.hover();await page.mouse.wheel(0,650);await page.waitForTimeout(150);
        results.caojinyu=await caoScroller.evaluate(n=>({text:n.textContent,scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,gutter:n.offsetWidth-n.clientWidth}));
        assert.ok(results.caojinyu.scrollTop>0);
        assert.equal(results.caojinyu.gutter,0);
        assert.match(results.caojinyu.text,/隅泣/);assert.match(results.caojinyu.text,/善身/);assert.match(results.caojinyu.text,/娴静/);
        await page.screenshot({path:path.join(__dirname,'yjcm-character-caojinyu-scrolled.png')});
        await page.evaluate(()=>{game.me.init('zhoushan');characterPlugin.click.playerIntro.call(characterPlugin,null,game.me)});
        await page.locator('.yjcm-seat-info .miniChange').click();
        assert.deepEqual(await page.evaluate(() => miniCalls), ['self']);
        await page.evaluate(() => { lib.config.tl_versus_miniChange = false; });
        await page.locator('.yjcm-seat-info .miniChange').click();
        assert.deepEqual(await page.evaluate(() => miniCalls), ['self']);
        await page.evaluate(() => { lib.config.tl_versus_miniChange = true; });
        await page.locator('.yjcm-seat-info .miniChange').focus();
        await page.keyboard.press('Enter');
        assert.deepEqual(await page.evaluate(() => miniCalls), ['self','self']);
        await page.locator('.yjcm-seat-info .right > div').hover();
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(150);
        assert.ok(await page.locator('.yjcm-seat-info .right > div').evaluate(n => n.scrollTop > 0), 'long skills must scroll');
        await page.locator('.yjcm-seat-info .equip').click();
        assert.equal(await page.locator('.yjcm-seat-info .equip').getAttribute('aria-selected'), 'true');
        assert.match(await page.locator('.yjcm-seat-info .right').innerText(), /当前未穿戴装备/);
        await page.locator('.yjcm-seat-info .skillx').click();
        assert.equal((await read()).skillCount, 2, 'switching must not duplicate skills');
        await page.evaluate(() => { game.me.directequip([game.createCard('zhuge', 'club', 1)]); });
        await page.locator('.yjcm-seat-info .equip').click();
        assert.match(await page.locator('.yjcm-seat-info .right').innerText(), /诸葛连弩/);
        await page.locator('.yjcm-seat-info .skillx').click();
        results.scales = [];
        for (const [width,height,zoom] of [[1690,810,1],[1280,720,1],[1600,900,1.5]]) {
            await page.setViewportSize({ width, height });
            await page.evaluate(zoom => { document.body.style.zoom = zoom; }, zoom);
            await page.waitForTimeout(100);
            const size = await page.locator('.yjcm-seat-info').boundingBox();
            assert.ok(Math.abs(size.width/size.height-1031/460)<.001);
            assert.ok(size.x >= 0 && size.x+size.width <= width+1 && size.y>=0 && size.y+size.height <= height+1);
            results.scales.push({ width,height,zoom,size });
        }
        await page.evaluate(() => { document.body.style.zoom = 1; });
        await page.setViewportSize({ width:1500,height:750 });
        await page.locator('.yjcm-seat-info .diaozhui').click();
        assert.equal(await page.evaluate(() => _status.paused2), false);
        results.doubleGeneral = await page.evaluate(() => {
            game.me.init('sunquan', 'guanyu');
            game.me.classList.add('unseen2');
            characterPlugin.click.playerIntro.call(characterPlugin, null, game.me);
            const d = document.querySelector('.yjcm-seat-info');
            d.querySelectorAll('.yjcm-general-switch-button')[1].click();
            return { general:d.dataset.general,name:d.querySelector('.yjcm-general-name').textContent };
        });
        assert.equal(results.doubleGeneral.general, 'secondary');
        assert.equal(results.doubleGeneral.name, '关羽');
        assert.ok(Math.abs((await page.locator('.yjcm-general-card').boundingBox()).width-190*.95)<.1);
        results.jin = await page.evaluate(() => {
            game.me.init('jin_simayi');
            // 测试包未启用晋包时，使用临时测试角色，仍走真实人物窗创建路径。
            if (!lib.character.jin_simayi) {
                lib.character.yjcm_jin_probe = { sex:'male',group:'jin',hp:3,maxHp:3,skills:[] };
                game.me.init('yjcm_jin_probe');
            }
            characterPlugin.click.playerIntro.call(characterPlugin, null, game.me);
            return document.querySelector('.yjcm-general-country').style.backgroundImage;
        });
        assert.match(results.jin, /gradation_bg_20.png/);
        results.opponent = await page.evaluate(() => {
            const player = game.players[1]; player.init('sunquan','guanyu'); player.classList.add('unseen','unseen2');
            characterPlugin.click.playerIntro.call(characterPlugin, null, player);
            const d = document.querySelector('.yjcm-seat-info');
            const mainName = d.querySelector('.yjcm-general-name').textContent;
            d.querySelectorAll('.yjcm-general-switch-button')[1].click();
            d.querySelector('.miniChange').click();
            return { mainName,secondary:d.querySelector('.yjcm-general-name').textContent,calls:miniCalls };
        });
        assert.equal(results.opponent.mainName, '未知');
        assert.equal(results.opponent.secondary, '未知');
        assert.equal(results.opponent.calls.at(-1), 'other');
        results.disabled = await page.evaluate(() => {
            lib.config.tl_versus_miniChange = false;
            characterPlugin.click.playerIntro.call(characterPlugin, null, game.me);
            const button = document.querySelector('.yjcm-seat-info .miniChange');
            const count = miniCalls.length;
            button.click();
            return !!button && miniCalls.length === count;
        });
        assert.equal(results.disabled, true);
        await page.locator('.yjcm-seat-info .diaozhui').click();
        await page.evaluate(() => { characterPlugin.click.playerIntro.call(characterPlugin, null, game.me); });
        await page.locator('.yjcm-seat-info').locator('..').click({ position:{x:10,y:10} });
        assert.equal(await page.evaluate(() => _status.paused2), false);
        results.otherStyles = await page.evaluate(async () => {
            characterPlugin.playerDialog.hide(); characterPlugin.playerDialog.remove();
            const original = lib.config.extension_十周年UI_newDecadeStyle;
            const states=[];
            for (const style of ['onlineUI','on','off','babysha','codename']) {
                lib.config.extension_十周年UI_newDecadeStyle=style;
                characterPlugin.click.playerIntro.call(characterPlugin,null,game.me);
                states.push({style,created:!!document.querySelector('.yjcm-seat-info')});
            }
            lib.config.extension_十周年UI_newDecadeStyle=original;
            return states;
        });
        assert.ok(results.otherStyles.every(s => !s.created));
        assert.deepEqual(errors, []);
        assert.deepEqual(failed, []);
        results.errors=errors; results.failed=failed;
        results.limitations=['Mini skin open() is a spy; actual external skin chooser is not loaded in this browser fixture.','No fresh Electron game or official client runtime visual comparison.'];
        fs.writeFileSync(path.join(__dirname,'yjcm-character-results.json'),JSON.stringify(results,null,2));
        console.log('YJCM_CHARACTER_OK',JSON.stringify({skills:results.initial.skillCount,scales:results.scales.length,otherStyles:results.otherStyles.length,mini:'self/opponent, toggle, keyboard',errors,failed}));
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
