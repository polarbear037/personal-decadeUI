const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 Object.assign(seed,{mode:'identity',characters:['standard'],cards:['standard','extra'],touchscreen:true,extension_十周年UI_newDecadeStyle:'othersOff',extension_十周年UI_optimizePrompt:'xinsha'});
 const page=await browser.newPage({viewport:{width:1500,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await dependencies(page);
 await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);await page.locator('#arena > .player').nth(1).waitFor({state:'attached',timeout:45000});
 const results=await page.evaluate(async()=>{
 const {game,ui,lib,get,_status}=await import('/noname.js');const {Content}=await import('/noname/library/element/content.js');
 const {playXinshaCardEffect}=await import('/extension/十周年UI/src/ui/card-effects-xinsha.js');
 game.pause();game.resume=()=>{};game.me=game.players[0];game.me.init('sunquan');const dying=game.players[1];dying.init('guanyu');dying.hp=0;
 for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();ui.arena.classList.remove('choose-character');lib.config.auto_confirm=false;_status.auto=false;_status.over=false;
 game.me.getCards('h').forEach(c=>c.remove());
 const cards=['sha','tao','shan','jiu','wuzhong'].map(n=>game.createCard(n,'heart',3));game.me.directgain(cards);
 // 使用本体 _save 生成救援事件，保留真实 cardSavable（非救援牌返回 undefined）。
 const save=game.createEvent('_save',false);save.player=game.me;const choose=game.me.chooseToUse;let rescue;
 game.me.chooseToUse=function(...args){rescue=choose.apply(this,args);rescue.forResult=()=>new Promise(()=>{});return rescue;};
 try{Content._save(save,{player:dying});}finally{game.me.chooseToUse=choose;}
 rescue._skillChoice=[];_status.eventManager.setStatusEvent(rescue,true);await Content.chooseToUse[0](rescue,null,game.me);
 await new Promise(r=>setTimeout(r,400));const masks=[];for(let i=0;i<4;i++){game.check();await new Promise(r=>setTimeout(r,150));masks.push(cards.map(c=>Number(getComputedStyle(c.querySelector('.card-mask')).opacity)));}
 _status.clicked=false;ui.click.card.call(cards[1]);await new Promise(r=>setTimeout(r,320));const selectedMask=cards.map(c=>Number(getComputedStyle(c.querySelector('.card-mask')).opacity));
 game.uncheck();const clear=cards.map(c=>c.classList.contains('dui-handcard-available'));
 rescue.dialog?.close();dying.hp=dying.maxHp;
 const phase=game.me.chooseToUse({type:'phase'});phase._skillChoice=[];_status.currentPhase=game.me;_status.eventManager.setStatusEvent(phase,true);await Content.chooseToUse[0](phase,null,game.me);
 decadeUI.layout.updateHand();await new Promise(r=>setTimeout(r,550));
 const card=cards[0],start=getComputedStyle(card).transform;
 _status.clicked=false;ui.click.card.call(card);const pendingCopy=card.copy('thrown').style.transitionProperty;
 // 强制同一任务阻塞，旧 CSS 时间轴会在首帧直接结束。
 const until=performance.now()+420;while(performance.now()<until){}
 const first=getComputedStyle(card).transform;const frames=[];
 await new Promise(resolve=>{const sample=t=>{frames.push({t,y:new DOMMatrix(getComputedStyle(card).transform).m42});if(frames.length<24)requestAnimationFrame(sample);else resolve();};requestAnimationFrame(sample);});
 const clone=card.copy('thrown');const copyTransition=clone.style.transitionProperty;
 _status.clicked=false;ui.click.card.call(card);await new Promise(r=>setTimeout(r,350));const after=card.style.transitionProperty;_status.clicked=false;ui.click.card.call(card);decadeUI.layout.resize();const resized={animations:card.getAnimations().length,actual:getComputedStyle(card).transform,expected:new DOMMatrix(card.style.transform).toString()};
 const calls=[],visual=document.createElement('div');ui.arena.append(visual);const cap={playSpineTo(...args){calls.push(args);return 42;}};
 playXinshaCardEffect(visual,'effect_tao',undefined,cap);const synchronous=calls.length;await new Promise(r=>setTimeout(r,80));const deferred=calls.length;
 playXinshaCardEffect(visual,'old',undefined,cap);playXinshaCardEffect(visual,'new',undefined,cap);await new Promise(r=>setTimeout(r,80));const latest=calls.at(-1)[1];
 const beforeRemove=calls.length;playXinshaCardEffect(visual,'removed',undefined,cap);visual.remove();await new Promise(r=>setTimeout(r,80));const removed=calls.length===beforeRemove;
 lib.config.extension_十周年UI_newDecadeStyle='onlineUI';const onlineReturn=playXinshaCardEffect(visual,'online',undefined,cap);lib.config.extension_十周年UI_newDecadeStyle='othersOff';
 return {masks,selectedMask,clear,motion:{start,first,frames,copyTransition,after,pendingCopy,resized},effects:{synchronous,deferred,latest,removed,onlineReturn}};
 });
 fs.writeFileSync('.codex-tmp/hand-response/motion-debug.json',JSON.stringify(results,null,2));
 assert.deepEqual(results.masks,Array.from({length:4},()=>[1,0,1,1,1]));assert.deepEqual(results.selectedMask,[1,0,1,1,1]);assert.ok(results.clear.every(v=>!v));
 assert.equal(results.motion.first,results.motion.start,'阻塞结束仍保持动画起点');const ys=results.motion.frames.map(f=>f.y);assert.ok(new Set(ys.map(v=>v.toFixed(2))).size>4,'存在多个真实抬升中间帧');assert.ok(ys.at(-1)<ys[0]-5);assert.notEqual(results.motion.copyTransition,'opacity, left, top');assert.notEqual(results.motion.after,'opacity, left, top');assert.notEqual(results.motion.pendingCopy,'opacity, left, top');assert.equal(results.motion.resized.animations,0);const numeric=s=>s.match(/-?\d+(?:\.\d+)?/g).map(Number);numeric(results.motion.resized.actual).forEach((v,i)=>assert.ok(Math.abs(v-numeric(results.motion.resized.expected)[i])<.001));
 assert.deepEqual(results.effects,{synchronous:0,deferred:1,latest:'new',removed:true,onlineReturn:42});assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'handcard-response-motion-results.json'),JSON.stringify({...results,errors},null,2)+'\n');console.log('HANDCARD_RESPONSE_MOTION_OK: native rescue, repeated filters, blocked first paint, cleanup, deferred effects, Online isolation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
