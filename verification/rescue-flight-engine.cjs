const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
(async()=>{
 const results={cases:[],errors:[]};await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  Object.assign(seed,{mode:'identity',characters:['standard','extra','xianding'],cards:['standard','extra'],extension_十周年UI_newDecadeStyle:'othersOff',extension_十周年UI_cardPrettify:'online',game_speed:'vfast',duration:300,hp_style:'round'});
  const page=await browser.newPage({viewport:{width:1638,height:919}});page.on('pageerror',e=>{results.errors.push(e.message);console.log('PAGE_ERROR',e.message)});page.on('dialog',d=>d.accept());
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
    for(const p of game.players){p.init('caocao');p.removeSkills(p.getSkills());}game.players.forEach((p,i,all)=>{p.next=all[(i+1)%all.length];p.previous=all[(i+all.length-1)%all.length]});
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(const beautify of [true]){
     if(beautify){const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');await installCardBeautify();}
     for(const scenario of ['rescue'])for(const self of [false])for(const crowded of [false,true]){
      const name=scenario==='save'?'jiu':scenario==='rescue'?'tao':scenario;
      const actor=game.players[2];actor.init('pangfengyi');actor.removeSkills(actor.getSkills());
      for(const c of ui.thrown)c.remove();ui.thrown.length=0;
      if(crowded){for(const name of ['guohe','tiesuo'])actor.$throw(game.createCard(name,'spade',5),0,false);await wait(400);}
      actor.hp=3;actor.maxHp=4;const victim=game.players[1];victim.init('dc_guansuo');victim.removeSkills(victim.getSkills());const savedAttitude=get.attitude;get.attitude=(from,to,...args)=>from===actor&&to===victim?10:savedAttitude.call(get,from,to,...args);victim.hp=victim.maxHp=100;const card=game.createCard(name,'spade',9);actor.directgain([card]);await wait(500);
      active={name,scenario,beautify,self,crowded,throws:[],nodes:[],animations:[],layouts:[],moves:[]};probe.cases.push(active);
      if(scenario==='rescue'){
       active.pre={actor:actor.name,victim:victim.name,in:actor.isIn(),save:actor.canSave(victim),cards:actor.getCards('h').map(c=>({name:c.name,savable:lib.filter.cardSavable(c,actor,victim)})),attitude:get.attitude(actor,victim),auto:_status.auto,global:lib.skill.global.includes('_save'),saveSkill:String(lib.skill._save?.filter),seats:game.players.map(p=>({name:p.name,next:p.next?.name,previous:p.previous?.name}))};
       for(const p of game.players){p.identity=actor.identity='fan';for(const c of p.getCards('h'))if(c!==card)c.remove();}
       victim.hp=1;await victim.damage(1,'nosource');active.recovered=victim.hp;active.saveHistory=game.players.concat(game.dead).map(p=>({name:p.name,uses:p.getHistory('useCard').map(e=>e.card.name)}));
      }else if(scenario==='save'){
       for(const p of game.players)for(const c of p.getCards('h'))if(c!==card)c.remove();
       actor.hp=1;await actor.damage(1,'nosource');active.recovered=actor.hp;
      }else{const use=actor.useCard(card,name==='sha'?victim:actor);use.directHit=game.players.slice();await use;}
      await wait(1800);get.attitude=savedAttitude;active=null;
     }
    }
    probe.done=true;game.pause();
   }};game.addGlobalSkill('_wine_flight_probe');if(!_status.auto)ui.click.auto('forced');game.resume2();game.resume();
  });
  await page.waitForFunction(()=>wineProbe.done,null,{timeout:120000});results.cases=await page.evaluate(()=>wineProbe.cases);
  results.retirement=await page.evaluate(async()=>{
   const {game,lib,ui,_status}=await import('/noname.js');
   const {cardMoveDelete}=await import('/extension/十周年UI/src/overrides/card/overrides.js');
   const saved={video:_status.video,style:lib.config.extension_十周年UI_newDecadeStyle};const rows=[];let pushed=false;
   try{
    for(const [kind,style,video,type,name,position,expected]of [
     ['basic-effect','othersOff',false,'card','sha','ordering',0],
     ['trick-effect','othersOff',false,'card','wuzhong','ordering',0],
     ['actual-gain','othersOff',false,'gain','sha','ordering',1],
     ['judge-gain','othersOff',false,'judge','sha','ordering',1],
     ['already-gained','othersOff',false,'card','sha','hand',1],
     ['equipment','othersOff',false,'card','zhuge','ordering',1],
     ['delay','othersOff',false,'card','lebu','ordering',1],
     ['replay','othersOff',true,'card','sha','ordering',1],
     ['online-style','onlineUI',false,'card','sha','ordering',1],
     ['decade-style','on',false,'card','sha','ordering',1],
    ]){
     lib.config.extension_十周年UI_newDecadeStyle=style;_status.video=video;
     const source=game.createCard(name,'spade',5);(position==='hand'?game.me.node.handcards1:ui.ordering).append(source);
     const clone=source.copy('thrown');ui.arena.append(clone);ui.thrown.push(clone);
     const effect=Object.assign(new lib.element.GameEvent(kind,false),{type,card:source,cards:[source],player:game.me});
     _status.eventManager.setStatusEvent(effect,true);pushed=true;
     let moves=0;const move=clone.moveTo;clone.moveTo=function(...args){moves++;return move.apply(this,args)};
     cardMoveDelete.call(clone,game.players[1]);rows.push({kind,moves,expected,fixed:!!clone.fixed});
     clone.remove();source.remove();ui.thrown.splice(ui.thrown.indexOf(clone),1);
     _status.eventManager.popStatusEvent();pushed=false;
    }
   }finally{if(pushed)_status.eventManager.popStatusEvent();_status.video=saved.video;lib.config.extension_十周年UI_newDecadeStyle=saved.style;}
   return rows;
  });
  console.log(JSON.stringify(results.cases.map(c=>({name:c.scenario,beautify:c.beautify,self:c.self,crowded:c.crowded,throws:c.throws.length,nodes:c.nodes.length,animations:c.animations.length,layouts:c.layouts.length,moves:c.moves.length,recovered:c.recovered,pre:c.pre,history:c.saveHistory,choices:c.choices})),null,2));
  for(const c of results.cases){if(c.scenario==='save')assert.equal(c.recovered,1,'真实濒死用酒完成自救');assert.equal(c.nodes.length,1,JSON.stringify({scenario:c.scenario,self:c.self,throws:c.throws}));assert.equal(c.moves.length,0,'用牌展示副本到达处理区后不能再飞回角色');assert.equal(c.animations.length,c.crowded?2:1,'只有真实重排才衔接动画');}assert.deepEqual(results.errors,[]);
  for(const row of results.retirement)assert.equal(row.moves,row.expected,row.kind);
  console.log('WINE_FLIGHT_OK',results.cases.length,'native cases;',results.retirement.length,'transfer/style boundaries');
 }finally{fs.writeFileSync(path.join(__dirname,'rescue-flight-before-results.json'),JSON.stringify(results,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
