const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});
for(const row of [require("./yjcm-player-tips-source.json").asset]) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root,row.destination))).digest("hex"),row.sha256);
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
   game.pause();game.pause2(); for(const d of [...ui.dialogs]) d.close();for(const c of [...ui.controls])c.close();
   document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
   game.me=game.players[0];game.me.init('liubei');game.players[1].init('guanyu');_status.currentPhase=game.me;_status.gameStarted=true;_status.over=false;
   game.players.forEach((p,index)=>{if(!p.playerid)p.playerid='tip-seat-'+index;});
   window.phaseModule=await import('/extension/十周年UI/src/ui/phase-tips.js');
   window.read=()=>{const n=_status.as_showImage;if(!n)return null;const b=n.firstElementChild,s=getComputedStyle(n);return {className:n.className,phase:n.dataset.phase,label:n.getAttribute('aria-label'),text:n.textContent,bg:b&&getComputedStyle(b).backgroundImage,rect:n.getBoundingClientRect().toJSON(),host:ui.window.getBoundingClientRect().toJSON(),height:ui.window.clientHeight,unit:parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-unit')),transition:s.transitionProperty,zIndex:s.zIndex,opacity:b&&getComputedStyle(b).opacity,transform:b&&getComputedStyle(b).transform}};
  });
  await page.evaluate(async()=>{
   window.tips=await import('/extension/十周年UI/src/ui/xinsha-player-tips.js');
   window.onlineTips=await import('/extension/十周年UI/src/ui/online-player-tips.js');
   window.actor=game.players[1];window.other=game.players[2];if(other)other.init('caocao');
   window.activate=event=>{_status.eventManager.setStatusEvent(event,true);tips.refreshXinshaPlayerTips();onlineTips.refreshOnlinePlayerTips();};
   window.phase=game.createEvent('phaseUse',false);phase.player=actor;_status.currentPhase=actor;
   window.choose=(props)=>{const event=actor[props.name]();Object.assign(event,props);event.parent=props.parent||phase;activate(event);return event;};
   window.readTip=(p=actor)=>{const node=p.querySelector('.decade-xinsha-player-tip'),span=node?.querySelector('span'),text=node?.firstElementChild,s=node&&getComputedStyle(node),bar=p.querySelector('.timePhase,.timeai');return {text:node?.textContent||'',subject:span?.textContent,color:s?.color,subjectColor:span&&getComputedStyle(span).color,fontSize:text&&getComputedStyle(text).fontSize,font:s?.fontFamily,bg:s?.backgroundImage,rect:node?.getBoundingClientRect().toJSON(),playerRect:p.getBoundingClientRect().toJSON(),playerWidth:p.offsetWidth,bar:bar?.getBoundingClientRect().toJSON(),barClass:bar?.className,count:p.querySelectorAll('.tipshow').length};};
  });
  assert.equal(await page.locator('body').getAttribute('data-style'),style);
  results[style] = {};
  console.log('READY',style);
  let native = await page.evaluate(async()=>{
   const {Content}=await import('/noname/library/element/content.js');
   const event=choose({name:'chooseToUse',type:'phase'});
   await Content.chooseToUse[0](event,null,actor);tips.refreshXinshaPlayerTips();onlineTips.refreshOnlinePlayerTips();
   return {result:event.result,tip:readTip(),online:actor.querySelector('.decade-online-player-tip')?.textContent};
  });
  if(style==='othersOff'){
   await page.waitForFunction(()=>actor.querySelector('.timePhase,.timeai')&&actor.querySelector('.decade-xinsha-player-tip'));
   native.tip=await page.evaluate(()=>readTip());
  }
  results[style].native=native;
  console.log('NATIVE',style,native.tip.text);
  assert.equal(native.tip.text,style==='othersOff'?'出牌阶段':'');
  if(style==='onlineUI') assert.equal(native.online,'思考 出牌');
  const cases=[
   ['wuxie',{name:'chooseToUse',type:'wuxie'},'无懈可击思考中'],
   ['shan',{name:'chooseToRespond',filterCard:{name:'shan'},respondToCard:'sha'},'闪思考中'],
   ['sha',{name:'chooseToRespond',filterCard:{name:'sha'},respondToCard:'nanman'},'杀思考中'],
   ['tao',{name:'chooseToUse',type:'dying'},'桃思考中'],
   ['skill',{name:'chooseToUse',skill:'wusheng'},'武圣思考中'],
   ['longCard',{name:'useCard',card:{name:'wuzhong'}},'无中生有思考中'],
   ['resolvedChoice',{name:'respond',card:{name:'shan'},resolved:true},'闪思考中'],
  ];
  for(const [name,props,expected] of cases){
   let value=await page.evaluate(({props})=>{
    const {name,respondToCard,resolved,...extra}=props;let event;
    if(name==='useCard'||name==='respond'){event=game.createEvent(name,false);event.player=actor;Object.assign(event,extra);event.parent=phase;if(resolved){const choice=actor.chooseToRespond();choice.result={bool:true,card:extra.card};choice.parent=phase;event.parent=choice;}activate(event);}
    else{event=choose({name,...extra});if(respondToCard)event.respondTo=[game.me,{name:respondToCard}];tips.refreshXinshaPlayerTips();}
    return {tip:readTip(),other:other&&readTip(other)};
   },{props});
   if(style==='othersOff'&&name==='wuxie'){
    await page.waitForFunction(()=>!other||other.querySelector('.timePhase,.timeai')&&other.querySelector('.decade-xinsha-player-tip'));
    value=await page.evaluate(()=>({tip:readTip(),other:other&&readTip(other)}));
   }
   results[style][name]=value;
   assert.equal(value.tip.text,style==='othersOff'?expected:'');
   if(style==='othersOff'){
    assert.equal(value.tip.count,1);assert.equal(value.tip.color,'rgb(247, 226, 201)');assert.equal(value.tip.subjectColor,'rgb(245, 222, 67)');assert.match(value.tip.bg,/xinsha\/gamestatus_bar\.png/);
    if(name==='wuxie'&&value.other)assert.equal(value.other.text,expected);
   }
  }
  if(style==='othersOff'){
   const rows=[];
   for(const [name,expected] of [['phaseZhunbei','回合开始'],['phaseJudge','判定阶段'],['phaseDraw','摸牌阶段'],['phaseUse','出牌阶段'],['phaseDiscard','弃牌阶段'],['phaseJieshu','结束阶段']]){
    const value=await page.evaluate(name=>{const e=game.createEvent(name,false);e.player=actor;activate(e);return readTip();},name);
    assert.equal(value.text,expected);rows.push(value);
   }
   results[style].phases=rows;
   await page.evaluate(()=>{choose({name:'chooseToUse',type:'wuxie'});});
   await page.waitForTimeout(250);await page.evaluate(()=>document.fonts.ready);
   const value=await page.evaluate(()=>readTip());results[style].geometry=value;
   assert.equal(value.count,1);
   const scale=value.playerRect.width/value.playerWidth;
   for(const [actual,expected] of [[value.rect.width,value.playerRect.width*152/190],[value.rect.height,value.playerRect.width*32/190],[value.rect.x+value.rect.width/2,value.playerRect.x+value.playerRect.width*94/190],[value.rect.y,value.playerRect.bottom+14*scale+value.playerRect.width*6/190],[parseFloat(value.fontSize)*scale,value.playerRect.width*16/190]]) assert(Math.abs(actual-expected)<.3,JSON.stringify({actual,expected,value}));
   // 加高底图不放大文字；文字上下各保留约半个字号的区域。
   assert(Math.abs(value.rect.height/(parseFloat(value.fontSize)*scale)-2)<.03);
   // 使用 progress-bar.js 实际创建的两类计时条，检查整体提示底图而非仅文字中心。
   results[style].progressSeparation=[];
   for(const viewport of [1500,1280])for(const zoom of [1,1.25]){
    await page.setViewportSize({width:viewport,height:750});
    await page.evaluate(zoom=>{document.body.style.zoom=String(zoom);_status.paused=true;_status.imchoosing=true;},zoom);
    await page.waitForTimeout(250);
    const pair=await page.evaluate(()=>[readTip(),other&&readTip(other)].filter(Boolean));
    for(const tip of pair){assert(tip.bar,'应存在真实角色进度条');assert(tip.rect.top>tip.bar.bottom+1,JSON.stringify(tip));}
    results[style].progressSeparation.push({viewport,zoom,pair});
   }
   await page.evaluate(()=>{document.body.style.zoom='';});await page.setViewportSize({width:1500,height:750});await page.waitForTimeout(100);
   await page.screenshot({path:path.join(__dirname,'yjcm-player-tips-browser.png')});
   // 以真实创建/清理入口逐帧检查，不把“事件切换后手动刷新”当作显隐同步验证。
   const lifecycle=await page.evaluate(async()=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),samples=[];
    _status.eventManager.tempEvent=undefined;choose({name:'chooseToUse',type:'wuxie'});
    let running=true;
    const read=()=>[actor,other].filter(Boolean).map(p=>({bar:!!p.querySelector(':scope>.timeai,:scope>.timePhase'),tip:!!p.querySelector(':scope>.decade-xinsha-player-tip'),seat:p.querySelector('.seat')&&getComputedStyle(p.querySelector('.seat')).display}));
    const sample=()=>{samples.push(read());if(running)requestAnimationFrame(sample);};sample();
    _status.paused=false;_status.imchoosing=false;
    await wait(240);const afterExit=read();
    // 捕获本地150ms倒计时回调，直接推进到120步截止，保留未结束的无懈询问。
    const nativeInterval=window.setInterval,callbacks=[];
    window.setInterval=(fn,ms,...args)=>{if(ms===150)callbacks.push(fn);return nativeInterval(fn,ms,...args);};
    _status.paused=true;_status.imchoosing=true;
    await wait(240);window.setInterval=nativeInterval;
    const afterEnter=read();
    for(let tick=0;tick<120;tick++)for(const callback of callbacks)callback();
    const onTimeout=read();await wait(240);const later=read();
    running=false;return{samples,afterExit,afterEnter,onTimeout,later,callbacks:callbacks.length,event:_status.event?.name,type:_status.event?.type,paused:_status.paused,imchoosing:_status.imchoosing};
   });
   results[style].lifecycle=lifecycle;
   console.log('LIFECYCLE',JSON.stringify({...lifecycle,samples:lifecycle.samples.length}));
   assert(lifecycle.callbacks>=1,'应截获真实角色倒计时');
   for(const sample of lifecycle.samples)for(const seat of sample)assert.equal(seat.tip,seat.bar,'绘制帧中提示和进度条必须同在同退');
   assert(lifecycle.afterEnter.some(seat=>seat.bar),'应实际重建角色进度条');
   for(const seat of lifecycle.afterEnter)assert.equal(seat.tip,seat.bar,'创建进度条时同步创建提示');
   for(const list of [lifecycle.afterExit,lifecycle.onTimeout,lifecycle.later])for(const seat of list){assert(!seat.bar&&!seat.tip,'进度条结束后不能因旧事件而复活提示');if(seat.seat!=null)assert.notEqual(seat.seat,'none');}
   const cleanup=await page.evaluate(()=>{
    const e=game.createEvent('chooseCharacter',false);e.player=actor;activate(e);const character=readTip().text;
    choose({name:'chooseToUse',type:'wuxie'});lib.config.extension_十周年UI_newDecadeStyle='onlineUI';tips.refreshXinshaPlayerTips();const switched=readTip().text;
    lib.config.extension_十周年UI_newDecadeStyle='othersOff';tips.refreshXinshaPlayerTips();_status.over=true;tips.refreshXinshaPlayerTips();const over=readTip().text;return{character,switched,over};
   });results[style].cleanup=cleanup;assert.deepEqual(cleanup,{character:'',switched:'',over:''});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'yjcm-player-tips-results.json'),JSON.stringify(results,null,2));
 console.log('YJCM_PLAYER_TIPS_OK: native choice, 7 response/action scenes, 6 phases, geometry, cleanup and Online isolation');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
