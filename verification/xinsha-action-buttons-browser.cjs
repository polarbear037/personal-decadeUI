const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");

async function dependencies(page) {
	for (const [request, bundle, name] of [
		["crypto-js@4.2.0/node_modules/crypto-js/index.js", "crypto-js@4.2.0/node_modules/crypto-js/crypto-js.js", "CryptoJS"],
		["jszip@2.7.0/node_modules/jszip/lib/index.js", "jszip@2.7.0/node_modules/jszip/dist/jszip.js", "JSZip"],
		["nosleep.js@0.12.0/node_modules/nosleep.js/src/index.js", "nosleep.js@0.12.0/node_modules/nosleep.js/dist/NoSleep.js", "NoSleep"],
		["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core"],
		["stackframe@1.3.4/node_modules/stackframe/stackframe.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "StackFrame"],
		["error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "ErrorStackParser"],
		["stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "StackTraceGPS"],
	]) {
		const source = fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", bundle), "utf8").replaceAll("}(this,", "}(globalThis,").replaceAll(")(this,", ")(globalThis,");
		const prefix = ["ErrorStackParser", "StackTraceGPS"].includes(name) ? 'import "/_virtual/stackframe.js";\n' : "";
		await page.route("**/node_modules/.pnpm/" + request, route => route.fulfill({ contentType: "text/javascript", body: prefix + source + `\nexport function __require(){return globalThis.${name};}` }));
	}
	for (const [pattern, file] of [["**/pinyin-pro/dist/index.js", "pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.mjs"], ["**/dedent/dist/dedent.js", "dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"]]) {
		await page.route(pattern, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", file), "utf8") }));
	}
}


async function run() {
 await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
 const browser = await chromium.launch({channel:"msedge", headless:true, args:["--enable-unsafe-swiftshader"]});
 const results={};
 try {
  for (const style of ["othersOff","onlineUI","on"]) {
   Object.assign(seed,{mode:"identity",characters:["standard"],cards:["standard","extra"],touchscreen:false,phonelayout:true,extension_十周年UI_newDecadeStyle:style,extension_十周年UI_loadingStyle:style==="othersOff"?"dialog_xinsha":"off",extension_十周年UI_optimizePrompt:style==="othersOff"?"xinsha":"off",extension_十周年UI_jindutiaoYangshi:style==="othersOff"?"4":"0"});
   const page=await browser.newPage({viewport:{width:1500,height:800}});
   const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("dialog",d=>d.accept());
   page.on("response",r=>{if(r.status()>=400 && r.url().includes("/yijiang/"))errors.push(`${r.status()} ${r.url()}`);});
   await dependencies(page);
   await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
   await page.locator("#arena > .player").nth(1).waitFor({state:"attached",timeout:45000});
   await page.evaluate(async()=>{
    const {game,ui,lib,get,_status}=await import("/noname.js");
    const {Content}=await import("/noname/library/element/content.js");
    Object.assign(window,{game,ui,lib,get,_status,Content});
    window.actionButtons=await import("/extension/十周年UI/src/ui/xinsha-action-buttons.js");
    game.pause(); game.resume=()=>{}; game.resume2=()=>{};
    game.me=game.players[0];game.me.init("sunquan");game.players[1].init("guanyu");
    _status.currentPhase=game.me;_status.auto=false;_status.over=false;
    lib.config.auto_confirm=false;
    document.querySelector(".decade-welcome-overlay")?.remove();ui.arena.classList.remove("choose-character");
    window.reset=()=>{
     game.uncheck();for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();
     const event=game.createEvent("phaseUse",false);event.player=game.me;_status.eventManager.setStatusEvent(event,true);
     actionButtons.syncXinshaActionButtons();
    };
    window.measure=()=>{
     const rect=n=>n?.getBoundingClientRect().toJSON();
     const nodes=[...ui.control.querySelectorAll(":scope>.control:not(.closing):not(.removing):not(.stayleft)>div")];
     return {flow:ui.control.dataset.xinshaAction,window:rect(ui.window),dialog:rect(_status.event.dialog),bar:rect(ui.control),tips:[...document.querySelectorAll(".hand-tip,.dialog-ol-footer,.dialog-xinsha-prompt-overlay")].map(n=>({class:n.className,rect:rect(n),text:n.textContent})),unit:parseFloat(getComputedStyle(ui.window).getPropertyValue("--yjcm-unit")),nodes:nodes.map(n=>({link:n.link,text:n.textContent,rect:rect(n),border:getComputedStyle(n).borderImageSource,background:getComputedStyle(n).backgroundImage,color:getComputedStyle(n).color,font:getComputedStyle(n).fontSize,filter:getComputedStyle(n).filter,transform:getComputedStyle(n).transform})),eventResult:_status.event.result};
    };
    window.multi=async labels=>{
     reset();const e=game.me.chooseControl(labels).set("prompt","巧思：请选择一项");
     _status.eventManager.setStatusEvent(e,true);await Content.chooseControl[0](e,null,game.me);return true;
    };
    window.cards=async()=>{
     reset();const e=game.me.chooseButton(["制衡：请选择一张牌",[[game.createCard("sha","spade",7),game.createCard("tao","heart",3)],"card"]]);
     _status.eventManager.setStatusEvent(e,true);await Content.chooseButton[0](e,null,game.me);return true;
    };
   });
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>multi(["摸两张牌","cancel2"]));await page.waitForTimeout(700);
   const two=await page.evaluate(()=>measure());
   if(style==="othersOff"){
    const u=two.unit,near=(a,b,t)=>assert(Math.abs(a-b)<.8,`${t}: ${a} != ${b}`);
    assert.equal(two.flow,"multi");assert.equal(two.nodes.length,2);
    assert.match(two.nodes[0].border,/game_btn_multi_select.png/);assert.match(two.nodes[1].border,/game_btn_multi_cancel.png/);
    near(two.nodes[0].rect.height,51*u,"multi height");near(two.nodes[1].rect.height,49*u,"cancel height");
    near(two.nodes[1].rect.left-two.nodes[0].rect.right,75*u,"two-item gap");
    near(two.bar.left+two.bar.width/2,two.window.left+two.window.width/2,"multi centered");
    await page.screenshot({path:path.join(__dirname,"xinsha-action-buttons-multi.png")});
    const choice=page.locator('#dui-controls>.control:not(.closing):not(.removing)>div').first();
    const choiceBox=await choice.boundingBox();await page.mouse.move(choiceBox.x+choiceBox.width/2,choiceBox.y+choiceBox.height/2);await page.mouse.down();await page.waitForTimeout(130);
    assert.match((await page.evaluate(()=>measure())).nodes[0].transform,/0\.95/);
    await page.mouse.move(10,400);await page.mouse.up();
   }else assert.equal(two.flow,undefined);
   if(style==="othersOff"){
    assert(two.tips[0].rect.top>two.bar.bottom,"multi prompt below buttons");
    await page.evaluate(()=>{lib.config.seperate_control=true;});
    await page.evaluate(()=>multi(["摸一张牌","回复体力","cancel2"]));await page.waitForTimeout(550);
    const separate=await page.evaluate(()=>measure());
    assert.equal(separate.nodes.length,3);assert(separate.nodes.every(n=>n.rect.width>=140*separate.unit-.2));
    assert(Math.abs(separate.nodes[1].rect.left-separate.nodes[0].rect.right-25*separate.unit)<.8);
    await page.evaluate(()=>{lib.config.seperate_control=false;});
    await page.evaluate(()=>multi(["甲","乙","丙","丁","戊","己","cancel2"]));await page.waitForTimeout(550);
    const seven=await page.evaluate(()=>measure());
    assert.equal(seven.nodes.length,7);assert(seven.nodes[6].rect.top>seven.nodes[0].rect.bottom);
   }
   await page.evaluate(()=>multi(["摸一张牌","回复一点体力并获得一张锦囊牌","cancel2"]));await page.waitForTimeout(650);
   const three=await page.evaluate(()=>measure());
   if(style==="othersOff"){
    const gap=three.nodes[1].rect.left-three.nodes[0].rect.right;
    assert(Math.abs(gap-25*three.unit)<.8);assert(three.nodes[1].rect.width>140*three.unit);
   }
   await page.locator('#dui-controls>.control:not(.closing):not(.removing)>div').filter({hasText:"取消"}).click();
   assert.equal(await page.evaluate(()=>_status.event.result.control),"cancel2");
   await page.evaluate(()=>cards());await page.waitForTimeout(850);
   const card=await page.evaluate(()=>measure());
   if(style==="othersOff"){
    assert.equal(card.flow,"window");assert.match(card.nodes[0].background,/cmn_btn_gray_180_54.png/);
    assert.match(card.nodes[1].background,/cmn_btn_brown_180_54.png/);
    assert(Math.abs(card.nodes[1].rect.left-card.nodes[0].rect.right-50*card.unit)<.8);
    assert(Math.abs(card.dialog.bottom-card.nodes[0].rect.bottom-40*card.unit)<.8);
    assert(Math.abs(card.nodes[0].rect.height-54*card.unit)<.8);
    assert.equal(card.nodes[0].color,"rgb(104, 83, 71)");
   }else assert.equal(card.flow,undefined);
   await page.evaluate(()=>ui.confirm.node.ok.click());
   assert.notEqual(await page.evaluate(()=>_status.event.result?.bool),true,"disabled confirm must not submit");
   await page.evaluate(()=>{_status.clicked=false;ui.click.button.call(_status.event.dialog.buttons[0]);});await page.waitForTimeout(150);
   const selected=await page.evaluate(()=>measure());
   if(style==="othersOff"){
    assert.match(selected.nodes[0].background,/cmn_btn_yellow_180_54.png/);
    assert.equal(selected.nodes[0].color,"rgb(106, 60, 34)");
    await page.screenshot({path:path.join(__dirname,"xinsha-action-buttons-window.png")});
    await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(200);
    const resized=await page.evaluate(()=>measure());
    assert(Math.abs(resized.dialog.bottom-resized.nodes[0].rect.bottom-40*resized.unit)<.8);
    await page.setViewportSize({width:1500,height:800});await page.waitForTimeout(150);
    const ok=page.locator(".lbtn-confirm:not(.closing)>.primary");
    const box=await ok.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(150);
    const pressed=await page.evaluate(()=>measure());assert.match(pressed.nodes[0].transform,/0\.95/);
    await page.mouse.up();await page.waitForTimeout(650);
    assert.equal(await page.evaluate(()=>_status.event.result?.bool),true,"native confirm submits selected card");
    assert.equal(await page.evaluate(()=>_status.event.result?.links?.[0]?.name),"sha");
    // loading框关闭：保留旧窗口，按钮仍在正文下方，不盖住牌面。
    await page.evaluate(()=>{ui.arena.dataset.loadingStyle="off";});
    await page.evaluate(()=>cards());await page.waitForTimeout(800);
    const legacy=await page.evaluate(()=>measure());
    assert(legacy.nodes[0].rect.top>=legacy.dialog.bottom+19*legacy.unit);
    await page.evaluate(()=>{ui.arena.dataset.loadingStyle="dialog_xinsha";});
   }
   await page.evaluate(()=>{reset();ui.create.confirm("oc");});await page.waitForTimeout(600);
   const restored=await page.evaluate(()=>measure());
   assert.equal(restored.flow,undefined);
   if(style==="othersOff")assert.match(restored.nodes[0].background,/game_btn_2.png/);
   await page.evaluate(()=>{reset();const e=game.me.chooseBool("是否发动英姿？");_status.eventManager.setStatusEvent(e,true);ui.create.confirm("oc");});
   assert.equal(await page.evaluate(()=>ui.control.dataset.xinshaAction),undefined,"plain skill ask keeps GameButtonBar");
   assert.deepEqual(errors,[]);
   results[style]={two,three,card,selected,restored,errors};console.log("XINSHA_ACTION_BUTTONS_OK",style);
   await page.close();
  }
  fs.writeFileSync(path.join(__dirname,"xinsha-action-buttons-results.json"),JSON.stringify(results,null,2)+"\n");
 }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
