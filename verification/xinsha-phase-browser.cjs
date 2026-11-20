const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});
for(const row of require("./xinsha-phase-source.json").frames) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root,row.destination))).digest("hex"),row.sha256);
const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
	 for (const style of ["othersOff", "onlineUI"]) {
		seed.extension_十周年UI_newDecadeStyle = style;
		const page = await browser.newPage({ viewport: { width: 1500, height: 750 } });
		page.setDefaultTimeout(12000);
		const errors = [], failed = [];
		let startupReject;
		const startupFailure = new Promise((resolve, reject) => { startupReject = reject; });
		page.on("pageerror", error => { errors.push(error.message); startupReject(error); });
		page.on("dialog", dialog => { console.log("DIALOG", dialog.message()); void dialog.accept(); });
		page.on("console", message => { if (message.type() === "error" && message.text().includes("一将成名动态背景")) errors.push(message.text()); });
		page.on("response", response => { if (response.status() >= 400 && /\/(yijiang|phase)\//.test(response.url())) failed.push(response.status() + " " + decodeURIComponent(response.url())); });
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
  await page.evaluate(async()=>{
   const {game,ui,lib,get,_status}=await import('/noname.js');Object.assign(window,{game,ui,lib,get,_status});
   game.pause(); for(const d of [...ui.dialogs]) d.close();for(const c of [...ui.controls])c.close();
   document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
   game.me=game.players[0];game.me.init('liubei');game.players[1].init('guanyu');_status.currentPhase=game.me;_status.gameStarted=true;_status.over=false;
   window.phaseModule=await import('/extension/十周年UI/src/ui/phase-tips.js');
   window.read=()=>{const n=_status.as_showImage;if(!n)return null;const b=n.firstElementChild,s=getComputedStyle(n);return {className:n.className,phase:n.dataset.phase,label:n.getAttribute('aria-label'),text:n.textContent,bg:b&&getComputedStyle(b).backgroundImage,rect:n.getBoundingClientRect().toJSON(),host:ui.window.getBoundingClientRect().toJSON(),height:ui.window.clientHeight,unit:parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-unit')),transition:s.transitionProperty,zIndex:s.zIndex,opacity:b&&getComputedStyle(b).opacity,transform:b&&getComputedStyle(b).transform}};
  });
  assert.equal(await page.locator('body').getAttribute('data-style'),style);
  const stages=[['phaseBegin',1],['phaseZhunbeiBefore',1],['phaseJudgeBefore',2],['phaseDrawBefore',3],['phaseUseBefore',4],['phaseDiscardBefore',5],['phaseJieshuBefore',6],['phaseEnd',6]];
  const rows=[];
  for(const [name,frame] of stages){
   await page.evaluate(async name=>{const skill=lib.skill['_jdts_'+name];if(!skill.filter({},game.me))throw Error('filter rejected '+name);await skill.content();},name);
   await page.waitForTimeout(230);const r=await page.evaluate(()=>read());rows.push(r);
   if(style==='othersOff'){
    assert.equal(r.className,'decade-xinsha-phase-tip');assert.equal(r.text,'');assert.match(r.bg,new RegExp('xinsha/phase'+frame+'\\.png'));
    const u=r.unit,zoom=r.host.height/r.height;
    for(const [a,b] of [[r.rect.width,116*u*zoom],[r.rect.height,35*u*zoom],[r.rect.x+r.rect.width/2,r.host.x+r.host.width/2-450*u*zoom],[r.host.bottom-r.rect.y-r.rect.height/2,227*u*zoom]]) assert(Math.abs(a-b)<.2,JSON.stringify({a,b,r}));
   }else{assert.equal(r.className,'decade-online-phase-tip');assert(r.text);assert.equal(r.label,null);}
  }
  results[style]={stages:rows};
  if(style==='othersOff'){
   results[style].phaseOption2=await page.evaluate(async()=>{
    lib.config.extension_十周年UI_JDTSYangshi='2';game.updateJDTsStyle();
    await lib.skill._jdts_phaseZhunbeiBefore.content();await new Promise(r=>setTimeout(r,230));const prepare=read();
    lib.config.extension_十周年UI_JDTSYangshi='3';game.updateJDTsStyle();return prepare;
   });assert.equal(results[style].phaseOption2.phase,'zbjd');assert.match(results[style].phaseOption2.bg,/xinsha\/phase1\.png/);
   const samples=await page.evaluate(async()=>{
    game.showJDTsImage('cpjd',true);const n=_status.as_showImage,b=n.firstElementChild,a=b.getAnimations()[0];a.pause();
    const sample=t=>{a.currentTime=t;const s=getComputedStyle(b);return {t,opacity:+s.opacity,x:new DOMMatrix(s.transform).m41}};
    return [sample(0),sample(50),sample(100)];
   });
   assert.deepEqual(samples.map(s=>s.opacity),[1,.5,0]);assert(Math.abs(samples[2].x+20*rows[0].unit)<.1);
   await page.waitForTimeout(115);
   const incoming=await page.evaluate(()=>{const b=_status.as_showImage.firstElementChild,a=b.getAnimations()[0];a.pause();return [0,50,100].map(t=>{a.currentTime=t;const s=getComputedStyle(b);return {t,opacity:+s.opacity,x:new DOMMatrix(s.transform).m41}})});
   assert.deepEqual(incoming.map(s=>s.opacity),[0,.5,1]);results[style].animation={samples,incoming};
   await page.evaluate(()=>_status.as_showImage.firstElementChild.getAnimations().forEach(a=>a.finish()));
   await page.screenshot({path:path.join(__dirname,'xinsha-phase-final.png')});
   const lifecycle=await page.evaluate(async()=>{
    const sleep=t=>new Promise(r=>setTimeout(r,t));
    await lib.skill._jdts_phaseUseBefore.content();await sleep(230);
    const trigger={};await lib.skill._jdts_ddxy_respond.content(null,trigger);await sleep(230);const response=read();
    if(!lib.skill._jdts_ddxy_end.filter(trigger,game.me))throw Error('response restoration filter rejected');
    await lib.skill._jdts_ddxy_end.content();await sleep(230);const restored=read();
    await lib.skill._jdts_phaseUseAfter.content();const phaseAfter=read();
    game.showJDTsImage('hhks',true);await sleep(230);const banner=_status.as_showImage.firstElementChild,animation=banner.getAnimations()[0];
    game.showJDTsImage('zbjd',true);const aliasReused=banner.getAnimations()[0]===animation;
    for(const phase of ['ddxy','dfsk']){game.showJDTsImage(phase,true);await sleep(220);const r=read();if(!r.bg.endsWith('/phase'+(phase==='ddxy'?99:100)+'.png")'))throw Error(r.bg);}
    game.showJDTsImage('mpjd',.04);game.showJDTsImage('cpjd',true);await sleep(240);const race=read();
    for(let i=0;i<12;i++)game.showJDTsImage(i%2?'cpjd':'mpjd',true);await sleep(240);const nodes=document.querySelectorAll('.decade-xinsha-phase-tip').length;
    const n=_status.as_showImage;game.showJDTsImage(n.dataset.phase,true);const repeated=n===_status.as_showImage;
    game.showJDTsImage('ddxy',.04);await sleep(160);const expired=read();
    game.showJDTsImage('cpjd',true);lib.config.extension_十周年UI_JDTSYangshi='0';game.updateJDTsStyle();await sleep(180);const disabled=read(),offNodes=document.querySelectorAll('.decade-xinsha-phase-tip').length;
    lib.config.extension_十周年UI_JDTSYangshi='3';game.updateJDTsStyle();game.showJDTsImage('cpjd',true);lib.onover.forEach(f=>f());await sleep(180);const overNodes=document.querySelectorAll('.decade-xinsha-phase-tip').length;
    return {response,restored,phaseAfter,aliasReused,race,nodes,repeated,expired,disabled,offNodes,overNodes,onlineNodes:document.querySelectorAll('.decade-online-phase-tip').length};
   });
   assert.match(lifecycle.response.bg,/phase99\.png/);assert.equal(lifecycle.restored.phase,'cpjd');assert.equal(lifecycle.phaseAfter,null);assert(lifecycle.aliasReused);
   assert.equal(lifecycle.race.phase,'cpjd');assert.equal(lifecycle.nodes,1);assert(lifecycle.repeated);assert.equal(lifecycle.expired,null);assert.equal(lifecycle.disabled,null);assert.equal(lifecycle.offNodes,0);assert.equal(lifecycle.overNodes,0);assert.equal(lifecycle.onlineNodes,0);results[style].lifecycle=lifecycle;
   for(const [width,height] of [[1280,576],[1500,750]]){await page.setViewportSize({width,height});await page.waitForTimeout(80);const r=await page.evaluate(async()=>{game.showJDTsImage('cpjd',true);await new Promise(r=>setTimeout(r,230));return read()});assert(Math.abs(r.rect.width-116*r.unit)<.2);}
  }else{
   assert.equal(await page.locator('.decade-xinsha-phase-tip').count(),0);
   const isolation=await page.evaluate(async()=>{
    const before=read(),{showXinshaPhaseTip}=await import('/extension/十周年UI/src/ui/xinsha-phase-tips.js');const rejected=showXinshaPhaseTip('cpjd');const after=read();return {before,after,rejected};
   });assert.equal(isolation.rejected,false);assert.deepEqual(isolation.before.rect,isolation.after.rect);assert.equal(isolation.after.className,'decade-online-phase-tip');results[style].isolation=isolation;
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);results[style].pageErrors=errors;results[style].failedRequests=failed;
  await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'xinsha-phase-results.json'),JSON.stringify(results,null,2));console.log('PASS xinsha/online native engine phase hooks, geometry, animation, lifecycle and isolation');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
