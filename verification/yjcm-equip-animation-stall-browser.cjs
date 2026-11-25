const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});

const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
	 for (const style of ["othersOff"]) {
		console.log('CHECK_STYLE',style);
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
		console.log('LOADED',style);
		await Promise.race([startupFailure, page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 })]).catch(async error => {
			console.log("STARTUP", JSON.stringify({ errors, failed, body: await page.locator("body").innerText() }));
			await page.screenshot({ path: path.join(__dirname, "yjcm-startup.png") });
			throw error;
		});
  await page.evaluate(async()=>{
   const {game,ui,lib,get,_status}=await import('/noname.js');Object.assign(window,{game,ui,lib,get,_status});
   game.pause();game.pause2();for(const d of [...ui.dialogs])d.close();document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
   game.me=game.players[0];game.me.init('liubei');game.players[1].init('caocao');_status.gameStarted=true;_status.over=false;
   ui.arena.classList.remove('selecting');ui.arena.dataset.aloneEquip='on';lib.config.extension_十周年UI_aloneEquip=true;ui.equipSolts.style.visibility='visible';
   const animate=Element.prototype.animate;
   Element.prototype.animate=function(...args){const animation=animate.apply(this,args),flight=this._xinshaEquipFlight;if(flight){const segment={phase:flight.phase,duration:animation.effect.getTiming().duration,frames:animation.effect.getKeyframes()};(flight.probeSegments??=[]).push(segment);animation.ready.then(()=>segment.startTime=animation.startTime,()=>{});const cancel=animation.cancel.bind(animation);animation.cancel=()=>{if(animation.startTime!=null)segment.startTime=animation.startTime;cancel();};const set=animation.effect.setKeyframes.bind(animation.effect);animation.effect.setKeyframes=frames=>{set(frames);segment.frames=animation.effect.getKeyframes();};}return animation;};
   window.beginEquip=(own,name,delay=0,requestDelay=120)=>{
    const player=own?game.me:game.players[1],source=game.createCard(name,'spade',9);player.directgain([source]);decadeUI.layout.updateHand();
    const use=game.createEvent('useCard',false);Object.assign(use,{player,card:source,cards:[source],targets:[player]});_status.eventManager.tempEvent=undefined;_status.eventManager.setStatusEvent(use,true);
    const origin=(own?source:player).getBoundingClientRect(),arena=ui.arena.getBoundingClientRect(),bounds=decadeUI.boundsCaches.arena;
    const expectedOrigin={x:(origin.left+origin.width/2-arena.left)/(arena.width/ui.arena.clientWidth)-bounds.cardWidth/2,y:(origin.top+origin.height/2-arena.top)/(arena.height/ui.arena.clientHeight)-bounds.cardHeight/2};
    const cards=[source];cards.duiMod=true;source.throwWith='h';const node=player.$throw(cards,0,false,false);
    window.currentEquip={player,source,node,samples:[],start:performance.now(),displayStyleWrites:0};
    const motionObserver=new MutationObserver(records=>{
     if(!node._xinshaEquipFlight?.departed)currentEquip.displayStyleWrites+=records.length;
     if(!node.isConnected)motionObserver.disconnect();
    });
    motionObserver.observe(node,{attributes:true,attributeFilter:['style']});
    if(node._xinshaEquipFlight){if(requestDelay>0)setTimeout(()=>node.moveDelete(player),requestDelay);else if(requestDelay===0)node.moveDelete(player);}
    const insert=()=>player.$addVirtualEquip(source,[source]);if(delay)setTimeout(insert,delay);else insert();
    const sample=()=>{const f=node._xinshaEquipFlight,r=node.getBoundingClientRect(),er=source.getBoundingClientRect();currentEquip.samples.push({time:performance.now()-currentEquip.start,elapsed:f?.started?document.timeline.currentTime-f.started:null,phase:f?.phase,phaseElapsed:document.timeline.currentTime-f?.phaseStarted,opacity:getComputedStyle(node).opacity,inline:node.style.transform,ownAtSample:player===game.me,transform:getComputedStyle(node).transform,rect:r.toJSON(),equipRect:er.toJSON(),visibility:getComputedStyle(source).visibility,equipped:source.parentNode===player.node.equips,done:f?.done,departed:f?.departed,display:f?.display});if(node.isConnected)requestAnimationFrame(sample);};sample();
    return {flight:!!node._xinshaEquipFlight,expectedOrigin,actualOrigin:node._xinshaEquipFlight?.start,phase:node._xinshaEquipFlight?.phase,animationStarted:!!node._xinshaEquipFlight?.displayAnimation,requested:!!node._xinshaEquipFlight?.requested,cardid:source.cardid,name:node.name,fixed:node.fixed,judge:typeof node.judge,event:_status.event?.name,same:_status.event===use,samePlayer:use.player===player,eventPlayerSame:_status.event?.player===player,style:lib.config.extension_十周年UI_newDecadeStyle,type:get.type(use.card,null,player)};
   };
  });


  results[style]={};
  for(const name of ['zhuge','bagua','dilu','chitu','muniu'])for(const stallPhase of ['stack','slot']){
   await page.evaluate(name=>beginEquip(false,name,0,0),name);
   await page.waitForFunction(phase=>{const f=currentEquip.node._xinshaEquipFlight;return f.phase===phase&&f.displayAnimation?.currentTime<100;},stallPhase);
   const snapshot=await page.evaluate(async phase=>{
    const f=currentEquip.node._xinshaEquipFlight,before=f.displayAnimation.currentTime;
    await new Promise(resolve=>requestAnimationFrame(()=>{const end=performance.now()+520;while(performance.now()<end){};resolve();}));
    await new Promise(requestAnimationFrame);
    const s=getComputedStyle(f.node),m=new DOMMatrixReadOnly(s.transform);
    return{stallPhase:phase,done:!!f.done,phase:f.phase,point:{x:m.m41,y:m.m42},scale:m.a,start:f.start,display:f.display,opacity:Number(s.opacity),before,clock:f.displayAnimation?.currentTime,realVisibility:getComputedStyle(currentEquip.source).visibility};
   },stallPhase);
   assert.equal(snapshot.done,false,'520ms长任务不能直接清掉装备飞行牌');
   assert.equal(snapshot.phase,stallPhase,'卡顿不能跨过剩余阶段');
   assert(snapshot.clock-snapshot.before<=80.1,'卡顿恢复最多推进两个绘制帧，不按520ms墙钟跳跃');
   assert.equal(snapshot.realVisibility,'hidden','渐隐完成前真实装备须保持隐藏');
   if(stallPhase==='stack'){
    assert(Math.abs(snapshot.scale-snapshot.start.scale)<.001,'飞向中央时不能缩放');
    assert.equal(snapshot.opacity,1,'首段不能提前渐隐');
   }else assert(snapshot.opacity>.8,'入栏前半段卡顿后仍应可见');
   await page.waitForFunction(()=>currentEquip.node._xinshaEquipFlight.done);
   const complete=await page.evaluate(()=>{
    const {node,source,player,samples}=currentEquip,f=node._xinshaEquipFlight,m=new DOMMatrixReadOnly(node.style.transform),rect=source.getBoundingClientRect(),ar=ui.arena.getBoundingClientRect(),b=decadeUI.boundsCaches.arena;
    return{phases:[...new Set(samples.map(s=>s.phase))],terminal:samples.filter(s=>s.phase==='slot'&&!s.done).at(-1),end:{x:m.m41+b.cardWidth/2,y:m.m42+b.cardHeight/2},slot:{x:(rect.left+rect.width/2-ar.left)/(ar.width/ui.arena.clientWidth),y:(rect.top+rect.height/2-ar.top)/(ar.height/ui.arena.clientHeight)},visible:getComputedStyle(source).visibility,frame:f.frame,connected:node.isConnected};
   });
   assert.deepEqual(complete.phases,['stack','slot']);
   assert.equal(Number(complete.terminal.opacity),0,'终点完全渐隐必须实际保留一帧');
   assert.equal(complete.terminal.visibility,'hidden','终点渐隐帧内实体仍须隐藏');
   assert(Math.hypot(complete.end.x-complete.slot.x,complete.end.y-complete.slot.y)<1,'消失点必须对应真实装备槽中心');
   assert.equal(complete.visible,'visible');assert.equal(complete.connected,false);
   results[style][`${name}-${stallPhase}`]={snapshot,complete};
   console.log('STALL_OK',name,stallPhase);
   await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'yjcm-equip-animation-stall-results.json'),JSON.stringify(results,null,2));
 console.log('YJCM_EQUIP_STALL_OK: 10 cases, 520ms stalls in both legs, visible full-size outbound leg and actual slot fade endpoint');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
