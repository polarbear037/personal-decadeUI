const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_rightLayout: "on", phonelayout:true, touchscreen: false });
for (const row of [...require("./yjcm-buttons-source.json").frames, ...require("./yjcm-buttons-source.json").extra, ...require("./yjcm-background-source.json").resources]) {
	assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, row.destination))).digest("hex"), row.sha256, row.destination);
}
const results = { scenarios: [] };
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
            document.querySelector(".decade-welcome-overlay")?.remove();
            ui.arena.classList.remove("choose-character");
            game.me = game.players[0]; game.me.init("liubei");
            _status.gameStarted = true; _status.over = false;
            const event = game.createEvent("chooseToUse", false); event.player = game.me;
            event.isMine = () => true; event.allowChooseAll = true; event.selectCard = [1, Infinity];
            _status.eventManager.setStatusEvent(event, true);
            for (let i = 0; i < 5; i++) game.me.directgain([game.createCard("sha", "spade", i + 1)]);
            ui.updateSkillControl(game.me, true);
            // 整理按钮保留真实回调；技能点击只记录命中，避免触发牌局结算。
            window.utilityHits = { sort: 0, skill: 0 };
            document.querySelector(".yjcm-sort").addEventListener("click", () => { utilityHits.sort++; });
            for (const node of ui.skillControl.querySelectorAll("[data-id]")) {
                node.addEventListener("click", e => { utilityHits.skill++; e.stopImmediatePropagation(); }, true);
            }
            game.resume2();
        });
        await page.evaluate(() => document.fonts.ready);
        await page.locator(".yjcm-sort").waitFor({state:"visible"});
        await page.locator(".yjcm-select-all").waitFor({state:"visible"});
        assert.equal(await page.locator("body").getAttribute("data-style"), "othersOff");
        assert(await page.locator('link[href*="/lbtn/xinsha.css"]').count() > 0);
        const cssPath = path.join(root, "ui/styles/lbtn/xinsha-official.css");
        const cssText = fs.readFileSync(cssPath,"utf8").replaceAll('url("../../assets/', 'url("/extension/十周年UI/ui/assets/');
        const beforeCss = cssText.replace("+ 12 * var(--yjcm-unit)", "+ 31 * var(--yjcm-unit)");
        // 用相同真实DOM对比修改前后，而不是拿本次坐标公式自证。
        await page.addStyleTag({content:beforeCss});
        const read = () => page.evaluate(() => {
            const rect = n => n.getBoundingClientRect().toJSON();
            const style = getComputedStyle(ui.window), zoom = ui.window.getBoundingClientRect().height / ui.window.clientHeight;
            return { window:rect(ui.window), unit:parseFloat(style.getPropertyValue("--yjcm-unit"))*zoom,
                sceneY:parseFloat(style.getPropertyValue("--yjcm-scene-y"))*zoom,
                sort:rect(document.querySelector(".yjcm-sort")), all:rect(document.querySelector(".yjcm-select-all")),
                skills:[...ui.skillControl.querySelectorAll("[data-id]")].map(n => ({id:n.dataset.id,rect:rect(n)})) };
        });
        for (const s of [
            {width:1500,height:750,zoom:1,side:"on",sidebar:""},
            {width:1280,height:720,zoom:1.5,side:"on",sidebar:"leftbar"},
            {width:1440,height:810,zoom:1.25,side:"off",sidebar:"rightbar"},
        ]) {
            await page.setViewportSize({width:s.width,height:s.height});
            await page.evaluate(s => {
                document.body.style.zoom=s.zoom; game.documentZoom=s.zoom;
                lib.config.extension_十周年UI_rightLayout=s.side; ui.arena.dataset.rightLayout=s.side;
                ui.window.classList.toggle("leftbar",s.sidebar==="leftbar");
                ui.window.classList.toggle("rightbar",s.sidebar==="rightbar");
                decadeUI.layout.resize();
            }, s);
            await page.waitForTimeout(550);
            const before = await read();
            const afterStyle = await page.addStyleTag({content:cssText});
            await page.waitForTimeout(150);
            const after = await read();
            assert.deepEqual(after.skills, before.skills, "skill geometry unchanged");
            for (const key of ["sort","all"]) {
                assert(Math.abs(after[key].top-before[key].top-19*after.unit)<.2, "utility row moves down19 units");
                assert.equal(after[key].left,before[key].left);
                assert.equal(after[key].width,before[key].width);
                assert.equal(after[key].height,before[key].height);
                assert(Math.abs(after.window.bottom-after[key].bottom-after.sceneY-12*after.unit)<.2);
            }
            const gap = (after.sort.top - Math.max(...after.skills.map(n=>n.rect.bottom))) / after.unit;
            assert(gap >= 21.8, "skill-to-utility gap >=22 units");
            const skill = after.skills[0].rect;
            await page.mouse.click(skill.x+skill.width/2,skill.bottom-2);
            assert.equal(await page.evaluate(()=>utilityHits.skill),results.scenarios.length+1);
            assert.equal(await page.evaluate(()=>utilityHits.sort),results.scenarios.length);
            const emptyHit = await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest(".yjcm-sort,.yjcm-select-all,[data-id]")?.className || null,
                {x:after.sort.x+after.sort.width/2,y:after.sort.top-5*after.unit});
            assert.equal(emptyHit,null,"gap does not trigger adjacent buttons");
            await page.mouse.click(after.sort.x+after.sort.width/2,after.sort.y+after.sort.height/2);
            assert.equal(await page.evaluate(()=>utilityHits.sort),results.scenarios.length+1,"native sort click preserved");
            assert.deepEqual(await page.evaluate(()=>[...game.me.node.handcards1.children].map(n=>n.number)),[1,2,3,4,5],"native sort order");
            results.scenarios.push({scenario:s,before,after,gap,emptyHit});
            if(results.scenarios.length===1) await page.screenshot({path:path.join(__dirname,"xinsha-utility-spacing-browser.png")});
            await afterStyle.evaluate(n=>n.remove());
        }
        // 比较同一DOM在Online宿主下应用修改前后的结果，检查作用域隔离。
        await page.evaluate(()=>{document.body.dataset.style="onlineUI";lib.config.extension_十周年UI_newDecadeStyle="onlineUI";});
        const onlineBefore=await read();
        await page.addStyleTag({content:cssText});
        const onlineAfter=await read();
        assert.deepEqual(onlineAfter,onlineBefore);
        results.onlineIsolation=true;
        assert.deepEqual(errors,[]); assert.deepEqual(failed,[]);
        results.errors=errors; results.failed=failed;
        fs.writeFileSync(path.join(__dirname,"xinsha-utility-spacing-results.json"),JSON.stringify(results,null,2)+"\n");
        console.log("UTILITY_SPACING_OK:3 layout/zoom variants; skill geometry unchanged;22-unit gap; real mouse hits;Online CSS isolation");
    } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
