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
const iconCss = fs.readFileSync(path.join(root, "ui/styles/lbtn/xinsha-official.css"), "utf8").replaceAll('\r\n', '\n');
const disabledSelector = 'body[data-style="othersOff"] #arena :is(.skill-control,.skill-controlzuoshou,.gskill-control) :not(.usable):not(.select) > .xiandingji-mark,\n';
const oldCss = iconCss.replace(disabledSelector, "");
assert.notEqual(oldCss, iconCss);
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	const inlineCss = content => content.replaceAll('../../assets/', `http://127.0.0.1:${server.address().port}/extension/十周年UI/ui/assets/`);
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
		await page.route("**/ui/styles/lbtn/xinsha-official.css*", route => route.fulfill({contentType:"text/css",body:oldCss}));
		await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
		await Promise.race([startupFailure, page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 })]).catch(async error => {
			console.log("STARTUP", JSON.stringify({ errors, failed, body: await page.locator("body").innerText() }));
			await page.screenshot({ path: path.join(__dirname, "yjcm-skill-icon-startup.png") });
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

        // 真实技能控件更新器驱动 usable/select/used 与阴阳状态，旧CSS先复现。
        await page.evaluate(() => {
            const specs = { icon_limit: {enable:'phaseUse', limited:true}, icon_convert: {enable:'phaseUse', zhuanhuanji:true} };
            for(const [id,info] of Object.entries(specs)){lib.skill[id]=info;lib.translate[id]=id==='icon_limit'?'雄乱':'转换';ui.skillControl.add(id,[]);}
            window.readIcons = () => {
                const read = id => {const node=ui.skillControl.querySelector(`[data-id="${id}"]`);return {classes:node.className,button:getComputedStyle(node).backgroundImage,mark:getComputedStyle(node.querySelector('.xiandingji-mark,.zhuanhuanji-mark')).backgroundImage};};
                return {limited:read('icon_limit'),conversion:read('icon_convert')};
            };
            window.setIconState = (enabled=false,selected=false,used=false,yin=false) => {
                game.me.awakenedSkills=game.me.awakenedSkills.filter(id=>id!=='icon_limit');
                if(used)game.me.awakenedSkills.push('icon_limit');
                game.me.storage.icon_convert=yin;
                ui.skills={skills:enabled?['icon_limit','icon_convert']:[]};ui.skills2=ui.skills3=undefined;
                _status.event.skill=selected?'icon_limit':undefined;
                ui.skillControl.update();
                return readIcons();
            };
        });
        results.before=await page.evaluate(()=>setIconState());
        assert.match(results.before.limited.button,/btn_skill_normal_gray.png/);
        assert.match(results.before.limited.mark,/skill_item_lmt_pic.png/);
        assert.match(results.before.conversion.mark,/skill_item_t_yang_pic_gray.png/);
        await page.addStyleTag({content:inlineCss(iconCss)});
        results.states=[];
        for(const phone of [true,false])for(const side of ['on','off']) {
            await page.evaluate(({phone,side})=>{lib.config.phonelayout=phone;lib.config.extension_十周年UI_rightLayout=side;ui.window.dataset.yjcmSide=side==='on'?'right':'left';ui.arena.dataset.rightLayout=side;},{phone,side});
            for(const [name,args,limitGray,convertGray,yin] of [
                ['disabled',[false,false,false,false],true,true,false],
                ['enabled',[true,false,false,false],false,false,false],
                ['selected',[false,true,false,false],false,true,false],
                ['used',[false,false,true,false],true,true,false],
                ['yin-disabled',[false,false,false,true],true,true,true],
                ['yin-enabled',[true,false,false,true],false,false,true],
                ['disabled-again',[false,false,false,false],true,true,false],
            ]){
                const state=await page.evaluate(args=>setIconState(...args),args);
                assert(state.limited.mark.endsWith(`/skill_item_lmt_pic${limitGray?'_gray':''}.png")`),name+' limited');
                assert(state.conversion.mark.endsWith(`/skill_item_t_y${yin?'ing':'ang'}_pic${convertGray?'_gray':''}.png")`),name+' conversion');
                results.states.push({phone,side,name,...state});
            }
        }
        // 全局技能与左手控件采用同一组作用域；其他风格对比新旧CSS计算结果。
        results.isolation=[];
        const override=await page.addStyleTag({content:'/* isolation */'});
        for(const style of ['onlineUI','on','off','babysha','codename']){
            await page.evaluate(style=>{document.body.dataset.style=style;setIconState();},style);
            const values=[];
            for(const content of [oldCss,iconCss]){await override.evaluate((node,content)=>node.textContent=content,inlineCss(content));await page.waitForTimeout(650);values.push(await page.evaluate(()=>readIcons()));}
            assert.deepEqual(values[0],values[1],style+' isolation');results.isolation.push(style);
        }
        await page.evaluate(()=>{document.body.dataset.style='othersOff';setIconState();});
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForTimeout(1600);
        // 官方技能根节点为零尺寸锚点，截图取实际页面以包含其溢出的按钮。
        await page.screenshot({path:path.join(__dirname,'yjcm-skill-icon-browser.png')});
        results.errors=errors;results.failed=failed;assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
        fs.writeFileSync(path.join(__dirname,'yjcm-skill-icon-results.json'),JSON.stringify(results,null,2));
        console.log('YJCM_SKILL_ICON_OK',JSON.stringify({states:results.states.length,isolation:results.isolation,errors,failed}));
    } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
