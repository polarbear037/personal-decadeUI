const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
const configKey = "extension_十周年UI_yjcmBackground";
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_rightLayout: "on", phonelayout:false, touchscreen: false });
for (const row of [...require("./yjcm-buttons-source.json").frames, ...require("./yjcm-buttons-source.json").extra, ...require("./yjcm-background-source.json").resources]) {
	assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, row.destination))).digest("hex"), row.sha256, row.destination);
}
const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
		const page = await browser.newPage({ hasTouch: true, viewport: { width: 1500, height: 750 } });
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

        const url = `http://127.0.0.1:${server.address().port}/player-tips-probe`;
        async function setup(reload = false) {
            await (reload ? page.reload() : page.goto(url));
            await page.locator("#arena > .player").nth(1).waitFor({state:"attached",timeout:45000});
            await page.evaluate(async () => {
                const {game,ui,lib,get,_status}=await import("/noname.js");
                Object.assign(window,{game,ui,lib,get,_status});
                game.pause();
                for(const dialog of [...ui.dialogs]) dialog.close();
                for(const control of [...ui.controls]) control.close();
                delete ui.tempnowuxie;
                document.querySelector(".decade-welcome-overlay")?.remove();
                ui.arena.classList.remove("choose-character");
                game.me=game.players[0]; game.me.init("liubei"); game.players[1].init("guanyu");
                _status.gameStarted=true; _status.over=false;
                const event=game.createEvent("chooseToUse",false);
                event.player=game.me; event.type="wuxie"; event.isMine=()=>true;
                event.getTrigger=()=>({parent:{id:"group-trick"},targets:game.players,num:0});
                _status.eventManager.setStatusEvent(event,true);
                _status.imchoosing=true;
                ui.create.confirm("oc");
                game.resume2();
            });
            await page.evaluate(()=>document.fonts.ready);
            await page.waitForTimeout(400);
        }
        async function addIgnore() {
            return page.evaluate(()=>{
                const before=ui.confirm.node.ok.getBoundingClientRect().toJSON();
                ui.tempnowuxie=ui.create.control("不无懈南蛮",ui.click.tempnowuxie,"stayleft");
                ui.tempnowuxie._origin="group-trick";
                ui.updatec();
                return before;
            });
        }
        async function measure() {
            return page.evaluate(()=>{
                const node=ui.tempnowuxie, style=getComputedStyle(node), child=getComputedStyle(node.firstChild);
                const w=ui.window.getBoundingClientRect();
                return {window:w.toJSON(),rect:node.getBoundingClientRect().toJSON(),ok:ui.confirm.node.ok.getBoundingClientRect().toJSON(),
                    text:node.firstChild.textContent,link:node.firstChild.link,callback:node.custom===ui.click.tempnowuxie,
                    origin:node._origin,position:style.position,background:child.backgroundImage,font:child.fontFamily,
                    mobile:ui.arena.classList.contains("dui-mobile"),style:document.body.dataset.style,
                    source:!!document.querySelector('link[href*="/lbtn/xinsha.css"]'),
                    desktopCss:!!document.querySelector('link[href*="/lbtn/window/xinsha.css"]'),
                    hit:node.contains(document.elementFromPoint(node.getBoundingClientRect().x+node.offsetWidth*w.width/ui.window.clientWidth/2,node.getBoundingClientRect().y+node.offsetHeight*w.height/ui.window.clientHeight/2))};
            });
        }
        const near=(a,b,label)=>assert(Math.abs(a-b)<.3,`${label}: ${a} != ${b}`);
        function check(q) {
            assert.equal(q.text,"本轮不出"); assert.equal(q.link,"不无懈南蛮"); assert(q.callback);
            assert.equal(q.origin,"group-trick"); assert.equal(q.position,"absolute");
            assert.equal(q.style,"othersOff"); assert(q.source); assert(q.hit);
            assert.match(q.background,/yijiang\/game_btn_2.png/); assert.match(q.font,/dui-yjcm-label/);
            const unit=Math.min(q.window.width/1334,q.window.height/750);
            const scene=Math.max(1334,Math.min(1750,q.window.width/unit-120));
            near(q.rect.x+q.rect.width/2,q.window.x+(q.window.width-scene*unit)/2+200*unit,"ignore centerX");
            near(q.rect.y+q.rect.height/2,q.window.bottom-(q.window.height-750*unit)/2-259*unit,"ignore centerY");
            near(q.rect.width,207.9*unit,"width"); near(q.rect.height,60.5*unit,"height");
            near(q.rect.y,q.ok.y-unit,"same baseline");
            assert(q.rect.right<q.ok.left,"ignore overlaps confirm");
        }
        results.layouts=[];
        for (const phone of [false,true]) {
            seed.phonelayout=phone; seed.touchscreen=phone;
            await setup(results.layouts.length>0);
            if(phone) await page.evaluate(()=>ui.arena.classList.add("dui-mobile"));
            const before=await addIgnore();
            await page.waitForTimeout(120);
            const q=await measure(); check(q); assert.equal(q.desktopCss,!phone);
            near(q.ok.x,before.x,"confirm unchanged by ignore");
            results.layouts.push({phone,...q});
            await page.screenshot({path:path.join(__dirname,`yjcm-tempnowuxie-${phone?"mobile":"desktop"}.png`)});
            await page.evaluate(()=>{
                window.savedCancel=ui.click.cancel; window.cancelCalls=0;
                ui.click.cancel=()=>{window.cancelCalls++;};
                _status.dragged=false; _status.clicked=false;
            });
            const x=q.rect.x+q.rect.width/2,y=q.rect.y+q.rect.height/2;
            if(phone) await page.touchscreen.tap(x,y); else await page.mouse.click(x,y);
            const clicked=await page.evaluate(()=>{
                const result={glow:ui.tempnowuxie.classList.contains("glow"),cancelCalls:window.cancelCalls,origin:ui.tempnowuxie._origin};
                ui.click.cancel=window.savedCancel; delete window.savedCancel;
                return result;
            });
            assert.deepEqual(clicked,{glow:true,cancelCalls:1,origin:"group-trick"});
            results.layouts.at(-1).clicked=clicked;
            await page.evaluate(()=>{ui.tempnowuxie.close();delete ui.tempnowuxie;});
            await page.locator(".yjcm-tempnowuxie").waitFor({state:"detached"});
            await addIgnore();
            for(const variant of [{width:1280,height:576,zoom:1,sidebar:""},{width:1440,height:810,zoom:1.5,sidebar:"leftbar"}]) {
                await page.evaluate(v=>{game.documentZoom=v.zoom;document.body.style.zoom=v.zoom;ui.window.classList.toggle("leftbar",v.sidebar==="leftbar");decadeUI.layout.resize();},variant);
                await page.setViewportSize({width:variant.width,height:variant.height});
                await page.waitForTimeout(250);
                const v=await measure(); check(v); results.layouts.push({phone,variant,...v});
            }
            await page.evaluate(()=>{document.body.style.zoom=1;game.documentZoom=1;ui.window.classList.remove("leftbar");});
            await page.setViewportSize({width:1500,height:750});
        }
        results.isolation=[];
        for(const style of ["onlineUI","on"]) {
            seed.extension_十周年UI_newDecadeStyle=style; seed.phonelayout=false; seed.touchscreen=false;
            await setup(true); await addIgnore();
            const result=await page.evaluate(()=>({style:document.body.dataset.style,text:ui.tempnowuxie.firstChild.textContent,xinsha:ui.tempnowuxie.classList.contains("yjcm-tempnowuxie")}));
            assert.equal(result.style,style); assert.equal(result.xinsha,false);
            assert.equal(result.text,style==="onlineUI"?"本次不无懈":"不无懈南蛮");
            results.isolation.push(result);
        }
        results.errors=errors; results.failed=failed;
        assert.deepEqual(errors,[]); assert.deepEqual(failed,[]);
        fs.writeFileSync(path.join(__dirname,"yjcm-tempnowuxie-results.json"),JSON.stringify(results,null,2));
        console.log("YJCM_TEMPNOWUXIE_BROWSER_OK",JSON.stringify({layouts:results.layouts.length,isolation:results.isolation,errors,failed}));
    } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
