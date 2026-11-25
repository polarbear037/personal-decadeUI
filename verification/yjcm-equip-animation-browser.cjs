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
	 for (const style of ["othersOff", "onlineUI"]) {
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
  if(style==='othersOff'){
   await page.route('**/extension/%E9%9B%B7%E7%9A%84%E4%B8%80%E5%B0%86/image/cards/card_23.png',async route=>{await new Promise(resolve=>setTimeout(resolve,450));await route.continue();});
   await page.evaluate(async()=>{const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');await installCardBeautify();beginEquip(false,'zhuge',0,1000);});
   const visibleHandle=await page.waitForFunction(()=>{const f=currentEquip.node._xinshaEquipFlight;if(f.done)return{phase:f.phase,done:true};if(getComputedStyle(f.node).visibility!=='visible'||!f.node.classList.contains('lei-yijiang-card-ready'))return false;const m=new DOMMatrixReadOnly(getComputedStyle(f.node).transform);return{phase:f.phase,start:f.start,point:{x:m.m41,y:m.m42},elapsed:f.started==null?null:document.timeline.currentTime-f.started};});
   const firstVisible=await visibleHandle.jsonValue();await visibleHandle.dispose();results[style].coldCardFirstVisible=firstVisible;
   assert.equal(firstVisible.phase,'stack','雷的一将卡图晚到时，首个实际可见牌面仍应从脸部起飞');
   assert(Math.hypot(firstVisible.point.x-firstVisible.start.x,firstVisible.point.y-firstVisible.start.y)<10,'不能在卡面不可见时走完首段');
   await page.waitForFunction(()=>currentEquip.node._xinshaEquipFlight.done);
   await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
  }
  if(style==='othersOff')for(const own of [true,false]){
   const firstPaint=await page.evaluate(async own=>{
    beginEquip(own,'zhuge',0,700);
    const until=performance.now()+420;while(performance.now()<until){}
    await new Promise(requestAnimationFrame);
    const f=currentEquip.node._xinshaEquipFlight,m=new DOMMatrixReadOnly(getComputedStyle(f.node).transform);
    const first={phase:f.phase,elapsed:f.started==null?null:document.timeline.currentTime-f.started,start:f.start,target:f.display,point:{x:m.m41,y:m.m42}};
    await new Promise(resolve=>setTimeout(resolve,45));await new Promise(requestAnimationFrame);
    const next=new DOMMatrixReadOnly(getComputedStyle(f.node).transform);
    return{...first,next:{x:next.m41,y:next.m42}};
   },own);
   results[style][own?'busySelfFirstPaint':'busyOtherFirstPaint']=firstPaint;
   assert.equal(firstPaint.phase,'stack','繁忙帧后的首个可见帧仍应从手牌开始首段飞行');
   assert(Math.hypot(firstPaint.point.x-firstPaint.start.x,firstPaint.point.y-firstPaint.start.y)<5,'首个可见帧不能直接跳到展示终点');
   assert(Math.hypot(firstPaint.next.x-firstPaint.start.x,firstPaint.next.y-firstPaint.start.y)>5,'后续可见帧必须从起点实际飞行');
   await page.waitForFunction(()=>currentEquip.node._xinshaEquipFlight.done);
   await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
  }
  for(const own of [true,false])for(const name of ['zhuge','bagua','dilu','chitu','muniu']){
   const begin=await page.evaluate(({own,name})=>beginEquip(own,name),{own,name});
   assert.equal(begin.flight,style==='othersOff',JSON.stringify(begin));
   if(style==='othersOff'){
    assert.equal(begin.phase,'stack','两种视角出牌均须立即进入第一段，不能先等装备通知');assert.equal(begin.animationStarted,true);assert.equal(begin.requested,false,'第一段应在装备通知之前起播');
    assert(Math.hypot(begin.actualOrigin.x-begin.expectedOrigin.x,begin.actualOrigin.y-begin.expectedOrigin.y)<1,'起点须对应真实手牌或武将脸部，不能用展示终点自证');
    if(own&&name==='zhuge'){
     const curveHandle=await page.waitForFunction(()=>{
      const flight=currentEquip.node._xinshaEquipFlight,animation=flight.displayAnimation;
      if(flight.phase!=='seat'||animation?.startTime==null)return false;
      const startTime=animation.startTime;
      animation.pause();
      const frames=[0,50,650/3,1300/3].map(time=>{
       animation.currentTime=time;const style=getComputedStyle(flight.node),matrix=new DOMMatrixReadOnly(style.transform);
       return{time,x:matrix.m41,y:matrix.m42,scale:matrix.a,opacity:Number(style.opacity)};
      });
      animation.play();animation.startTime=startTime;
      return{start:flight.seatStart,display:flight.display,frames,frameQueued:!!flight.frame};
     });
     const curve=await curveHandle.jsonValue();await curveHandle.dispose();
     assert.equal(curve.frameQueued,false,'主视角首段不得安装逐帧控制循环');
     const ratios=[0,1-Math.cos(3*Math.PI/52),1-Math.SQRT1_2,1];
     const scales=[1,1,1,.97],opacities=[1,1,1,1];
     curve.frames.forEach((frame,index)=>{
      for(const key of ['x','y'])assert(Math.abs(frame[key]-(curve.start[key]+(curve.display[key]-curve.start[key])*ratios[index]))<.02,'首段轨迹 '+key+' '+frame.time);
      assert(Math.abs(frame.scale-curve.display.scale*scales[index])<.001,'首段缩放 '+frame.time);
      assert(Math.abs(frame.opacity-opacities[index])<.001,'首段透明度 '+frame.time);
     });
     results[style].displayCurve=curve;
    }
    const fadeHandle=await page.waitForFunction(()=>{
     const f=currentEquip.node._xinshaEquipFlight,animation=f.displayAnimation;
     if(f.phase!=='slot'||!animation)return false;
     const startTime=animation.startTime,currentTime=animation.currentTime;animation.pause();
     const samples=[0,.25,.5,.75,.9,.95,1].map(progress=>{
      animation.currentTime=f.duration*progress;
      const rect=f.node.getBoundingClientRect(),computed=getComputedStyle(f.node);
      return {progress,opacity:Number(computed.opacity),x:rect.x+rect.width/2,y:rect.y+rect.height/2,width:rect.width};
     });
     const rect=f.equipped.getBoundingClientRect();
     if(f.selfUse){animation.play();animation.startTime=startTime;}else animation.currentTime=currentTime;
     return {samples,slot:{x:rect.x+rect.width/2,y:rect.y+rect.height/2}};
    });
    const slotFade=await fadeHandle.jsonValue();await fadeHandle.dispose();
    const [start,quarter,half,threeQuarters,near,almost,end]=slotFade.samples;
    assert(start.opacity===1&&quarter.opacity<1&&quarter.opacity>half.opacity,'入栏衔接保持可见，淡出从末段开始');
    assert(threeQuarters.opacity>.8&&near.opacity>.3&&almost.opacity>.15,'牌面应在接近装备槽时仍清晰可见：'+JSON.stringify(slotFade.samples));
    assert(almost.opacity<near.opacity&&end.opacity===0,'到达装备槽时完成淡出');
    assert(Math.hypot(end.x-slotFade.slot.x,end.y-slotFade.slot.y)<1,'最终一帧必须落在真实装备槽中心');
    for(const sample of slotFade.samples){
     const x=start.x+(slotFade.slot.x-start.x)*sample.progress,y=start.y+(slotFade.slot.y-start.y)*sample.progress;
     assert(Math.hypot(sample.x-x,sample.y-y)<1,'牌面中心须线性移动至装备槽，缩放不能改变落点');
    }
    assert(Math.abs(end.width-start.width*(own ? 0.2 / 0.97 : 0.2))<.1,'末段仍缩至原始牌面的20%');
    await page.waitForFunction(()=>currentEquip.node._xinshaEquipFlight.done);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const result=await page.evaluate(()=>{const {source,node,player,samples,displayStyleWrites}=currentEquip;const matrix=new DOMMatrixReadOnly(node.style.transform);return{segments:node._xinshaEquipFlight.probeSegments,samples,displayStyleWrites,start:node._xinshaEquipFlight.start,returnStart:node._xinshaEquipFlight.display,returnAt:node._xinshaEquipFlight.phaseStarted-node._xinshaEquipFlight.started,finalScale:matrix.a,end:{x:matrix.m41,y:matrix.m42},visible:getComputedStyle(source).visibility,inline:source.style.visibility,wrapper:player.node.equips.style.cssText,hiddenSaved:source._decadeEquipFlightVisibility,parent:source.parentNode===player.node.equips,clones:ui.arena.querySelectorAll('.decade-xinsha-equip-flight').length,identity:source.cardid};});
    results[style][`${own?'self':'other'}-${name}`]=result;
    result.slotFade=slotFade;
    console.log('CASE',own,name,result.visible);assert.equal(result.visible,'visible');assert.equal(result.parent,true);assert.equal(result.clones,0);assert.equal(result.identity,begin.cardid);
    assert.deepEqual(result.segments.map(s=>s.phase),own?['stack','seat','slot']:['stack','slot']);
    assert.equal(result.segments[0].duration,own?300:200,'仅将非主视角首段略放慢到200ms');
    for(let i=1;i<result.segments.length;i++){
     const previous=result.segments[i-1],next=result.segments[i],end=previous.frames.at(-1),start=next.frames[0];
     if(own)assert(Math.abs(next.startTime-previous.startTime-previous.duration)<.01,'本人段间不能插入等待帧');
     const numbers=value=>value.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number),left=numbers(end.transform),right=numbers(start.transform);
     assert(left.length===right.length&&left.every((v,j)=>Math.abs(v-right[j])<.002),'段间位置与缩放连续 '+JSON.stringify({previous:previous.phase,next:next.phase,end:end.transform,start:start.transform}));
     assert(Math.abs(Number(end.opacity)-Number(start.opacity))<.001,'段间透明度连续，不能消失后重现');
    }
    assert(result.samples.some(s=>s.visibility==='hidden'&&s.equipped),'栏内实体应在飞行时隐藏');
    assert(result.samples.some(s=>parseFloat(s.opacity)>0.1&&s.rect.width>20),'飞行牌应真实可见');
    assert(Math.abs(result.finalScale-result.start.scale*.2)<.001,'完成时按源码缩小到0.2');
    assert(result.samples.some(s=>s.phase==='slot'&&s.equipped&&s.rect.width<result.samples[0].rect.width*.6),'末段必须缩小入栏');
    if(own){
     assert(result.displayStyleWrites<=8,`本人飞到统一起点不应逐帧改写style，实际${result.displayStyleWrites}次`);
     const expected=await page.evaluate(()=>{const ar=ui.arena.getBoundingClientRect(),pr=game.me.getBoundingClientRect();return{cw:decadeUI.boundsCaches.arena.cardWidth,ch:decadeUI.boundsCaches.arena.cardHeight,x:(pr.x+pr.width/2-ar.x)/(ar.width/ui.arena.clientWidth),y:(pr.y+pr.height/2-ar.y)/(ar.height/ui.arena.clientHeight)};});
     const show=result.samples.filter(s=>s.phase==='seat'&&s.transform?.startsWith('matrix(')).map(sample=>{const m=sample.transform.slice(7,-1).split(',').map(Number);return{sample,x:m[4]+expected.cw/2,y:m[5]+expected.ch/2,scale:m[0]};});
     assert(Math.abs(result.returnStart.x+expected.cw/2-expected.x)<1&&Math.abs(result.returnStart.y+expected.ch/2-expected.y)<1,'本人缩小入栏的起点必须是武将中心');
     assert(result.samples.filter(s=>s.phase==='seat').every(s=>Number(s.opacity)>.99),'飞向武将不能先淡出再重新淡入');
     const display=result.samples.find(s=>s.phase==='stack').display;
     assert(Math.abs(display.scale-result.start.scale)<.001,'本人先飞到手牌上方展示时不缩小');
     assert(display.y>result.samples[0].rect.height*2,'本人展示点不能用中央处理区');
     assert(show.every(s=>s.scale>=result.start.scale*.969),'飞向武将时只保留原版3%呼吸，不能提前缩入装备栏');
     assert(result.samples.some(s=>s.phase==='slot'&&s.rect.width<result.samples[0].rect.width*.5),'到达武将之后才缩小入栏');
    }else {
     assert(result.samples.every(s=>s.phase!=='seat'),'非主视角不走本人的飞向武将阶段');
     const departed=result.samples.find(s=>s.departed!=null);
     assert(departed&&departed.elapsed-result.returnAt<100,'非主视角在通知到达时折返，不强制完成300ms入场：'+departed?.elapsed);
     assert(Math.hypot(result.returnStart.x-result.start.x,result.returnStart.y-result.start.y)>10,'非主视角包括坐骑必须先向中央移动');
     const stack=result.samples.find(s=>s.phase==='stack').display;
     const route=Math.hypot(stack.x-result.start.x,stack.y-result.start.y),outbound=Math.hypot(result.returnStart.x-result.start.x,result.returnStart.y-result.start.y);
     assert(outbound/route>.59&&outbound/route<.61,'非主视角向中央飞出约60%，须比原40%首段更远');
     const from=result.returnStart,dx=result.end.x-from.x,dy=result.end.y-from.y,lengthSquared=dx*dx+dy*dy;
     for(const sample of result.samples.filter(s=>s.phase==='slot'&&s.transform.startsWith('matrix('))){
      const matrix=sample.transform.slice(7,-1).split(',').map(Number),x=matrix[4],y=matrix[5];
      const ratio=lengthSquared?Math.max(0,Math.min(1,((x-from.x)*dx+(y-from.y)*dy)/lengthSquared)):0;
      assert(Math.hypot(x-from.x-ratio*dx,y-from.y-ratio*dy)<1,'非主视角从通知到达时的位置连续折返入栏');
     }

    }
   }else{
    await page.evaluate(()=>{currentEquip.node.remove();});
   }
   await page.evaluate(()=>{const {player,source}=currentEquip;source.remove();player.$handleEquipChange();});
  }
  if(style==='othersOff'){
   // 非主视角不等通知，直接从武将脸上飞出；晚到通知不能重播或重置。
   await page.evaluate(()=>beginEquip(false,'bagua',0,-1));await page.waitForTimeout(90);
   const waiting=await page.evaluate(()=>{const f=currentEquip.node._xinshaEquipFlight,m=new DOMMatrixReadOnly(getComputedStyle(f.node).transform);return{departed:f.departed??null,start:f.start,point:{x:m.m41,y:m.m42},queued:!!f.frame};});
   assert.equal(waiting.departed,null);assert.equal(waiting.queued,true,'非主视角使用受卡顿保护的绘制时钟');
   assert(Math.hypot(waiting.point.x-waiting.start.x,waiting.point.y-waiting.start.y)>10,'非主视角通知到达前就必须可见地飞向中央');
   await page.evaluate(()=>currentEquip.node.moveDelete(currentEquip.player));
   await page.waitForFunction(()=>currentEquip.node._xinshaEquipFlight.done);
   assert.equal(await page.evaluate(()=>getComputedStyle(currentEquip.source).visibility),'visible');
   await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
   results[style].delayedRemoteRequest=waiting;
   results[style].immediateRemote=[];
   for(const name of ['zhuge','chitu','bagua','dilu']){
    await page.evaluate(name=>beginEquip(false,name,0,0),name);
    await page.waitForFunction(()=>currentEquip.node._xinshaEquipFlight.done);
    const instant=await page.evaluate(()=>{const f=currentEquip.node._xinshaEquipFlight;return{name:f.name,start:f.start,returnStart:f.display,phases:[...new Set(currentEquip.samples.map(s=>s.phase))]};});
    assert(Math.hypot(instant.start.x-instant.returnStart.x,instant.start.y-instant.returnStart.y)>10,'同帧通知也要保留可见首段，和类型及连续次序无关');
    results[style].immediateRemote.push(instant);
    await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
   }
   await page.evaluate(()=>beginEquip(true,'zhuge'));
   await page.waitForFunction(()=>!!currentEquip.node._xinshaEquipFlight.displayAnimation);
   await page.evaluate(()=>currentEquip.node._xinshaEquipFlight.displayAnimation.cancel());
   await page.waitForFunction(()=>!currentEquip.node.isConnected);
   assert.equal(await page.evaluate(()=>getComputedStyle(currentEquip.source).visibility),'visible','首段被取消时仍须恢复实体装备');
   await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
   results[style].displayCancellation=true;
   await page.evaluate(()=>{
    beginEquip(false,'zhuge');
    const f=currentEquip.node._xinshaEquipFlight;
    window.remoteEquipWaitReleased=false;
    f.use.after.find(event=>event.xinshaEquipAnimationDone).xinshaEquipAnimationDone.then(()=>{window.remoteEquipWaitReleased=true;});
    f.displayAnimation.cancel();
   });
   await page.waitForFunction(()=>remoteEquipWaitReleased&&!currentEquip.node.isConnected);
   assert.equal(await page.evaluate(()=>getComputedStyle(currentEquip.source).visibility),'visible','取消非主视角装备动画须释放后续出牌等待并恢复装备');
   await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
   results[style].remoteWaitCancellation=true;
   results[style].layouts=[];
   for(const embedded of [false,true]){
    await page.evaluate(embedded=>{const equips=game.me.node.equips;if(embedded){game.me.append(equips);ui.arena.dataset.aloneEquip='off';lib.config.extension_十周年UI_aloneEquip=false;}else{ui.equipSolts.append(equips);}ui.arena.style.transform='scale(.8)';ui.arena.style.transformOrigin='top left';},embedded);
    await page.evaluate(()=>{beginEquip(true,'zhuge');});
    if(embedded){await page.waitForTimeout(100);await page.evaluate(()=>{ui.arena.style.transform='scale(.9)';});}
    await page.waitForFunction(()=>currentEquip.node._xinshaEquipFlight.done);
    const position=await page.evaluate(()=>{const {node,source}=currentEquip,m=new DOMMatrixReadOnly(node.style.transform),a=ui.arena.getBoundingClientRect(),r=source.getBoundingClientRect();return{actual:[m.m41+decadeUI.boundsCaches.arena.cardWidth/2,m.m42+decadeUI.boundsCaches.arena.cardHeight/2],expected:[(r.x+r.width/2-a.x)/(a.width/ui.arena.clientWidth),(r.y+r.height/2-a.y)/(a.height/ui.arena.clientHeight)]};});
    assert(Math.abs(position.actual[0]-position.expected[0])<1&&Math.abs(position.actual[1]-position.expected[1])<1,JSON.stringify(position));results[style].layouts.push({embedded,...position});
    await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();});
   }
   await page.evaluate(()=>{ui.arena.style.transform='';ui.equipSolts.append(game.me.node.equips);ui.arena.dataset.aloneEquip='on';lib.config.extension_十周年UI_aloneEquip=true;});
   await page.evaluate(()=>{beginEquip(true,'zhuge',500);});
   await page.waitForTimeout(700);
   const before=await page.evaluate(()=>{const {player,source,node}=currentEquip;const clone=source.copy('thrown');ui.arena.appendChild(clone);const visibility=getComputedStyle(clone).visibility;clone.remove();source.goto(ui.special);player.$handleEquipChange();return{visibility};});
   await page.waitForTimeout(100);
   assert.equal(before.visibility,'visible');assert(await page.evaluate(()=>!currentEquip.node.isConnected),'飞行中移走应清理');
   assert.equal(await page.evaluate(()=>currentEquip.source.style.visibility),'');
   results[style].removalAndCopy=before;
   await page.evaluate(()=>{beginEquip(false,'bagua');});await page.waitForTimeout(100);
   await page.screenshot({path:path.join(__dirname,'yjcm-equip-animation-display.png')});
   await page.waitForTimeout(300);await page.screenshot({path:path.join(__dirname,'yjcm-equip-animation-shrink.png')});
   await page.evaluate(()=>{lib.config.extension_十周年UI_newDecadeStyle='onlineUI';});await page.waitForTimeout(100);
   assert(await page.evaluate(()=>!currentEquip.node.isConnected));assert.equal(await page.evaluate(()=>getComputedStyle(currentEquip.source).visibility),'visible');
   await page.evaluate(()=>{currentEquip.source.remove();currentEquip.player.$handleEquipChange();lib.config.extension_十周年UI_newDecadeStyle='othersOff';beginEquip(true,'zhuge',0,-1);lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.equipCleanupProbe='changed';});
   await page.waitForFunction(()=>!currentEquip.node.isConnected);
   assert.equal(await page.evaluate(()=>getComputedStyle(currentEquip.source).visibility),'visible','通知前切换风格同样恢复实体牌并清理副本');
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'yjcm-equip-animation-results.json'),JSON.stringify(results,null,2));
 console.log('YJCM_EQUIP_ANIMATION_OK: 10 self/other equipment cases, delayed insert, removal/copy cleanup and Online isolation');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
