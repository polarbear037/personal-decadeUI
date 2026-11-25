const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
(async function(){
const actualSeed=JSON.parse(fs.readFileSync(path.join(__dirname,'shunshou-flight-config.json'),'utf8'));
 Object.assign(seed,Object.fromEntries(Object.entries(actualSeed).filter(([key])=>/^(?:extension_(?:皮肤切换|十周年UI|标记补充|雷的一将)_|(?:animation|low_performance|sync_speed|duration|game_speed|card_animation_info|ui_zoom|layout)$)/.test(key))));seed.extension_auto_import=false;seed.show_splash='off';seed.new_tutorial=true; seed.extensions=['皮肤切换','十周年UI','标记补充','雷的一将'];seed.plays=[];for(const key of Object.keys(seed))if(/^extension_.+_enable$/.test(key))seed[key]=seed.extensions.includes(key.slice(10,-7)); const results={cases:[],errors:[]};await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  Object.assign(seed,{mode:'identity',characters:['standard','extra','xianding'],cards:['standard','extra'],extension_十周年UI_newDecadeStyle:'othersOff',extension_十周年UI_cardPrettify:'online',game_speed:'mid',duration:500,low_performance:true,sync_speed:true,card_animation_info:false,extension_十周年UI_cardGhostEffect:false,hp_style:'round'});
  const page=await browser.newPage({viewport:{width:2052,height:919}});page.on('pageerror',e=>{results.errors.push(e.message);console.log('PAGE_ERROR',e.stack)});page.on('dialog',d=>d.accept());
  await dependencies(page);
  for(const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])if(/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8')))await page.unroute('**/node_modules/.pnpm/'+file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);await page.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
  await page.evaluate(async()=>{
   const {game,lib,ui,get,_status}=await import('/noname.js');
   const probe=window.wineProbe={cases:[],done:false};let active;const ids=new WeakMap();let seq=0;const id=c=>{if(!ids.has(c))ids.set(c,++seq);return ids.get(c)};
   const p=lib.element.Player.prototype,throwFn=p.$throw,ordered=p.$throwordered2,animate=Element.prototype.animate,layout=decadeUI.layoutDiscard;
   const choose=p.chooseToUse;p.chooseToUse=function(...args){const event=choose.apply(this,args);if(args[0]?.type==='dying'){event.ai2=()=>1;if(active)(active.choices??=[]).push({player:this.name,canSave:this.canSave(args[0].dying),cards:this.getCards('h').map(c=>c.name)});}return event};
   const cardProto=lib.element.Card.prototype,move=cardProto.moveTo;cardProto.moveTo=function(...args){const row=active&&this.name===active?.name?{id:id(this),at:performance.now(),event:_status.event?.name,before:getComputedStyle(this).transform,effects:this.getAnimations().map(a=>({id:a.id,type:a.constructor.name,time:a.currentTime})),stack:new Error().stack}:null;const value=move.apply(this,args);if(row){row.after=getComputedStyle(this).transform;row.target=this.style.transform;active.moves.push(row);}return value;};
   p.$throw=function(cards,...args){if(active)active.throws.push({event:_status.event?.name,parent:_status.event?.parent?.name,cards:Array.isArray(cards)?cards.map(c=>({name:c.name,id:c.cardid})):String(cards),stack:new Error().stack});return throwFn.call(this,cards,...args)};
   p.$throwordered2=function(card,...args){const result=ordered.call(this,card,...args);if(active&&card.name===active.name)active.nodes.push({id:id(card),event:_status.event?.name});return result};
   Element.prototype.animate=function(...args){const result=animate.apply(this,args);if(active&&this.name===active?.name&&this.classList.contains('thrown')&&!this.classList.contains('gainingcard')&&!this.classList.contains('drawingcard')){
    const record={id:id(this),event:_status.event?.name,at:performance.now(),duration:args[1]?.duration,from:args[0][0],to:args[0].at(-1),stack:new Error().stack,frames:[]};active.animations.push(record);
    if(active.crowded&&!active.retargeted){active.retargeted=true;const old=ui.thrown.filter(c=>c!==this);setTimeout(()=>{old.forEach(c=>c.remove());decadeUI.layoutDiscard();},600);}
    const node=this,end=performance.now()+1600;const read=()=>{const m=new DOMMatrix(getComputedStyle(node).transform);record.frames.push({at:performance.now(),x:m.e,y:m.f,scale:m.a,connected:node.isConnected,time:result.currentTime});if(performance.now()<end&&node.isConnected)requestAnimationFrame(read)};requestAnimationFrame(read);
   }return result};
   decadeUI.layoutDiscard=function(...args){if(active)active.layouts.push({at:performance.now(),event:_status.event?.name,stack:new Error().stack});return layout.apply(this,args)};
   lib.skill._wine_flight_probe={trigger:{global:'phaseUseBegin'},forced:true,silent:true,charlotte:true,firstDo:true,priority:Infinity,filter:()=>!probe.started,async content(){
    probe.started=true;
    for(const p of game.players.slice(4)){game.players.splice(game.players.indexOf(p),1);p.remove();}for(const p of game.players){p.init('caocao');p.removeSkills(p.getSkills());}game.players.forEach((p,i,all)=>{p.next=all[(i+1)%all.length];p.previous=all[(i+all.length-1)%all.length]});
    const wait=ms=>new Promise(r=>setTimeout(r,ms));let rescueVictim;lib.skill._rescue_after_use_probe={trigger:{global:'useCardAfter'},forced:true,silent:true,charlotte:true,filter:e=>e.card.name==='sha'&&!!rescueVictim,async content(){const target=rescueVictim;rescueVictim=null;await target.damage(1,'nosource');}};game.addGlobalSkill('_rescue_after_use_probe');
    for(const beautify of [true]){
     if(beautify){const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');await installCardBeautify();}
     for(const scenario of ['shunshou'])for(const self of [true])for(const crowded of [false]){
      const name=scenario==='save'?'jiu':scenario==='rescue'?'tao':scenario;
      const actor=game.players[self?0:2];actor.init('zhangjinyun');
      for(const c of ui.thrown)c.remove();ui.thrown.length=0;
      if(crowded){for(const name of ['guohe','tiesuo'])actor.$throw(game.createCard(name,'spade',5),0,false);await wait(400);}
      actor.hp=3;actor.maxHp=4;const victim=game.players[1];victim.init('dc_guansuo');victim.removeSkills(victim.getSkills());const savedAttitude=get.attitude;get.attitude=(from,to,...args)=>from===actor&&to===victim?10:savedAttitude.call(get,from,to,...args);victim.hp=victim.maxHp=100;const card=game.createCard(name,'spade',9);actor.directgain([card]);await wait(500);
      active={zoom:game.documentZoom,players:game.players.length,name,scenario,beautify,self,crowded,throws:[],nodes:[],animations:[],layouts:[],moves:[]};probe.cases.push(active);
      for(const p of game.players){p.removeSkills(p.getSkills());for(const c of p.getCards('h'))if(c!==card)c.remove();}
      victim.directgain([game.createCard('shan','heart',2),game.createCard('sha','club',4)]);
      if(_status.auto)ui.click.auto('forced');lib.config.auto_confirm=false;lib.config.unauto_choose=true;
      Object.defineProperty(probe,"card",{value:card});Object.defineProperty(probe,"target",{value:victim});probe.stage='choosing';const chosen=await actor.chooseToUse({type:'phase'});active.choiceResult=chosen.result;
      await wait(1800);get.attitude=savedAttitude;active=null;
     }
    }
    probe.done=true;game.pause();
   }};game.addGlobalSkill('_wine_flight_probe');if(!_status.auto)ui.click.auto('forced');ui.updatez();game.documentZoom=1.5288461538461537;ui.window.style.zoom=game.documentZoom;decadeUI.boundsCaches.arena.updated=false;game.resume2();game.resume();
  });
  await page.waitForFunction(()=>window.wineProbe?.stage==='choosing'&&window._status?.imchoosing,null,{timeout:45000});
  await page.evaluate(async()=>{const {ui,game,_status}=await import('/noname.js');if(!ui.selected.cards.includes(wineProbe.card))wineProbe.card.click();game.check();if(!ui.selected.targets.includes(wineProbe.target))wineProbe.target.click();game.check();wineProbe.selection={clicked:_status.clicked,owner:_status.event.player?.name,me:game.me.name,targetClass:wineProbe.target.className,event:_status.event.name,card:ui.selected.cards.map(c=>c.name),targets:ui.selected.targets.map(p=>p.name),okDisabled:ui.confirm.node.ok.classList.contains('disabled')};ui.confirm.node.ok.click();});
  await page.waitForTimeout(1800);
  await page.evaluate(async()=>{const {ui,_status}=await import('/noname.js');if(!_status.auto)ui.click.auto('forced');});
  await page.waitForFunction(()=>wineProbe.done,null,{timeout:120000});results.cases=await page.evaluate(()=>wineProbe.cases);results.selection=await page.evaluate(()=>wineProbe.selection);console.log('SELECTION',results.selection);
  console.log(JSON.stringify(results.cases.map(c=>({self:c.self,crowded:c.crowded,choice:c.choiceResult,nodes:c.nodes.length,animations:c.animations.map(a=>({from:a.from,to:a.to,duration:a.duration})),throws:c.throws.length,moves:c.moves})),null,2));
 }finally{fs.writeFileSync(path.join(__dirname,'shunshou-flight-manual-results.json'),JSON.stringify(results,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
