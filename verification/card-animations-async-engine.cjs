const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});

seed.mode_config={identity:{player_number:"2"}};
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
		page.on('console',message=>{if(message.text().startsWith('USE_PROBE'))console.log(message.text());});
		page.on("dialog", dialog => { console.log("DIALOG", dialog.message()); if(dialog.message().includes('错误信息'))errors.push(dialog.message()); void dialog.accept(); });
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
    const {game,ui,lib,get,_status}=await import('/noname.js');
    window.handUseProbe={game,ui,lib,get,_status,rows:[]};

    const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
    lib.config.game_speed='vfast';lib.config.duration=300;
    lib.skill._hand_use_probe={trigger:{global:'phaseUseBegin'},forced:true,silent:true,charlotte:true,firstDo:true,priority:Infinity,
      filter:()=>!handUseProbe.started,
      async content(){
        handUseProbe.started=true;
        game.me.init('liubei');game.players.find(p=>p!==game.me).init('guanyu');
        for(const actor of [game.me,game.players.find(p=>p!==game.me)])for(const [index,name] of ['wuzhong','zhuge','wuzhong'].entries()){
          const card=game.createCard(name,'spade',9);actor.directgain([card]);
          await game.delay(0,600);
          const row={own:actor===game.me,name,afterEquip:index===2,activeEquipAtStart:!!document.querySelector('.decade-xinsha-equip-flight'),starts:[],frames:[]};handUseProbe.rows.push(row);console.log('USE_PROBE',row.own,name);
          const baseLose=actor.lose,baseThrow=actor.$throw;
          actor.lose=function(){
            const loss=baseLose.apply(this,arguments);
            if(loss.cards?.includes(card))loss.pushHandler((evt,state)=>{
              if(state.state==='begin'&&card.parentNode===actor.node.handcards1)row.expected=rect(card);
            });
            return loss;
          };
          actor.$throw=function(...args){
            const result=baseThrow.apply(this,args);
            if(result?.name===name){
              row.starts.push(rect(result));
              let count=0;
              const sample=()=>{if(!result.isConnected||count++>=90)return;row.frames.push({rect:rect(result),time:performance.now()});requestAnimationFrame(sample);};
              requestAnimationFrame(sample);
            }
            return result;
          };
          const baseDelayx=game.delayx;row.displayWaits=0;game.delayx=function(...args){row.displayWaits++;return baseDelayx.apply(this,args);};
          try{const began=performance.now();const use=actor.useCard(card,name==='sha'?game.players.find(p=>p!==actor):actor);row.delayx=use.delayx;await use;row.resolvedAfter=performance.now()-began;row.activeFlights=[...document.querySelectorAll('.decade-xinsha-equip-flight')].map(n=>({done:n._xinshaEquipFlight?.done,phase:n._xinshaEquipFlight?.phase,waitToken:n._xinshaEquipFlight?.waitToken}));if(name!=='zhuge')await game.delay(0,1800);}
          finally{actor.lose=baseLose;actor.$throw=baseThrow;game.delayx=baseDelayx;}
          row.finalPosition=get.position(card);
        }
        handUseProbe.done=true;game.pause();
      }};
    game.addGlobalSkill('_hand_use_probe');
    if(!_status.auto)ui.click.auto('forced');game.resume2();game.resume();
  });
  await page.waitForFunction(()=>handUseProbe.done,null,{timeout:60000}).catch(async error=>{console.log('LIVE_STATE',await page.evaluate(()=>({rows:handUseProbe.rows.map(r=>({own:r.own,name:r.name,expected:r.expected,starts:r.starts.length,frames:r.frames.length})),started:handUseProbe.started,event:handUseProbe._status.event?.name,step:handUseProbe._status.event?.step,paused:handUseProbe._status.paused,paused2:handUseProbe._status.paused2,auto:handUseProbe._status.auto,players:handUseProbe.game.players.map(p=>({name:p.name,hp:p.hp}))})));throw error;});

  const movementChecks=await page.evaluate(async()=>{
    const {game,ui,lib,get,_status}=handUseProbe;
    const {createContentGain,createContentLose}=await import('/extension/十周年UI/src/overrides/content.js');
    const {playerPhaseJudge}=await import('/extension/十周年UI/src/overrides/player/card-route.js');
    const {Content}=await import('/noname/library/element/content.js');
    const original={pause:game.pause,resume:game.resume,delay:decadeUI.delay,delayx:game.delayx,low:lib.config.low_performance};const calls=[];
    game.pause=()=>{calls.push('pause');};game.resume=()=>{calls.push('resume');};decadeUI.delay=()=>{calls.push('delay');};game.delayx=async()=>{calls.push('delayx');};
    const cases=[];const gained=[];const gain=createContentGain([null,null])[0];
    try{
      for(const actor of [game.me,game.players.find(p=>p!==game.me)])for(const animation of ['draw','gain','gain2','draw2','give','giveAuto','custom','none']){
        const card=game.createCard('sha','heart',8);ui.special.append(card);let customCalled=false;
        const event={cards:[card],gaintag:[],log:false,losing_map:{},animate:animation==='custom'?()=>{customCalled=true;return 100;}:animation==='none'?false:animation};
        const before=calls.length;
        await gain(event,null,actor);
        const row={type:'gain',own:actor===game.me,animation,inHandImmediately:card.parentNode===actor.node.handcards1,customCalled,pauseRequested:calls.slice(before).includes('pause')};
        cases.push(row);gained.push({row,card,actor});
      }
      // 等待得牌恢复回调完成，避免测试替身恢复后误推进已暂停的夹具牌局。
      await new Promise(resolve=>setTimeout(resolve,650));
      for(const {row,card,actor} of gained)row.inHand=card.parentNode===actor.node.handcards1;
      const gainResumes=calls.filter(c=>c==='resume').length;
      for(const low of [false,true])for(const material of [false,true]){
        lib.config.low_performance=low;const card=game.createCard('lebu','club',6);if(material){card.cardSymbol=Symbol();card[card.cardSymbol]={cards:[game.createCard('sha','club',6)]};}
        const before=calls.length;
        playerPhaseJudge.call(game.me,card);cases.push({type:'phaseJudge',low,material,calls:calls.slice(before)});
      }
      for(const type of ['discard','loseToDiscardpile'])for(const parentDelay of [undefined,false]){
        const parent={name:type,delay:parentDelay};const event={type,getParent:()=>parent};const steps=createContentLose(Content.lose);const before=calls.length;
        await steps[0](event,null,game.me);await steps.at(-1)(event,null,game.me);cases.push({type,parentDelay,delay:event.delay,calls:calls.slice(before)});
      }
      return {cases,calls,gainResumes};
    }finally{game.pause=original.pause;game.resume=original.resume;game.delayx=original.delayx;decadeUI.delay=original.delay;lib.config.low_performance=original.low;}
  });
  const gains=movementChecks.cases.filter(c=>c.type==='gain');
  assert.equal(movementChecks.gainResumes,14,'每个有动画的得牌事件应完成自己的等待并恢复');
  assert.ok(gains.every(c=>c.inHand),'所有得牌分支最终应完成归属转移');
  assert.ok(gains.every(c=>c.pauseRequested===(c.animation!=='none')),'有动画得牌须恢复等待，无动画得牌立即继续');
  assert.ok(gains.filter(c=>c.animation==='custom').every(c=>c.customCalled&&!c.inHandImmediately),'自定义得牌须遵守其返回的展示时长');
  for(const c of movementChecks.cases.filter(c=>c.type==='phaseJudge'))assert.deepEqual(c.calls,[c.low?'pause':'delay'],'判定移牌恢复各风格原等待');
  for(const c of movementChecks.cases.filter(c=>['discard','loseToDiscardpile'].includes(c.type))){
    assert.equal(c.delay,c.parentDelay,'弃牌等待须保留父事件显式配置');
    assert.deepEqual(c.calls,c.parentDelay===false?[]:['delayx'],'默认弃牌等待，显式不等待仍保留');
  }
  const result=await page.evaluate(()=>({style:handUseProbe.lib.config.extension_十周年UI_newDecadeStyle,rows:handUseProbe.rows,yieldInstalled:!!handUseProbe.lib.element.GameEvent.prototype.waitNext._xinshaCardSettlementYield}));
  assert.equal(result.yieldInstalled,style==='othersOff','settlement scheduling must be installed only for xinsha');
  results[style]={result,errors,movementChecks};
  for(const row of result.rows){
    assert(row.starts.length,`${style}/${row.own}/${row.name}: no flight`);
    assert(row.frames.length>3,`${style}/${row.own}/${row.name}: no frames`);
    assert(row.frames.some(f=>Math.abs(f.rect.y-row.starts[0].y)>10||Math.abs(f.rect.x-row.starts[0].x)>10),`${style}/${row.own}/${row.name}: no movement`);
    if(row.own){
      assert(row.expected,`${style}/${row.name}: no pre-lose sample`);
      for(const key of ['x','y','width','height'])assert(Math.abs(row.starts[0][key]-row.expected[key])<1,`${style}/${row.name}/${key}: origin mismatch`);
    }
    assert.equal(row.finalPosition,row.name==='zhuge'?'e':'d');
    if(style==='othersOff'&&row.afterEquip)assert.equal(row.activeEquipAtStart,row.own,'本人装备飞行期间已开始下一张普通牌，其他座位须等飞行结束');
    if(row.own&&row.name==='zhuge')assert.equal(row.delayx,false,'仅主视角装备跳过用牌展示等待');
    else {assert.notEqual(row.delayx,false,'普通牌与其他座位恢复原生等待');assert(row.displayWaits>0,'真实结算必须执行用牌展示等待');}
    if(style==='othersOff'&&row.name==='zhuge'){
      assert.equal(row.activeFlights.some(f=>!f.done),row.own,'本人可继续出牌，其他座位须完成装备飞行');
      assert.ok(row.activeFlights.every(f=>f.waitToken==null),'装备飞行不接管全局暂停状态');
    }
  }
  assert.deepEqual(errors,[]);console.log('CARD_ANIMATION_WAIT_ENGINE_OK',style);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'card-animations-async-engine-results.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(__dirname,'card-animations-async-engine-results.json'),JSON.stringify(results,null,2));server.close();process.exitCode=1;});
