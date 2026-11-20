const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
(async()=>{
 Object.assign(seed,{mode:'identity',characters:['standard'],cards:['standard'],extension_十周年UI_newDecadeStyle:'othersOff',touchscreen:false});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1500,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 try{
 await dependencies(page);await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
 await page.locator('#arena > .player').nth(1).waitFor({state:'attached',timeout:45000});
 const initial=await page.evaluate(async()=>{
  const {game,ui,lib,get,_status}=await import('/noname.js');Object.assign(window,{game,ui,lib,get,_status});
  game.pause();game.resume=()=>{};for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
  game.me=game.players[0];game.me.init('sunquan');_status.gameStarted=true;_status.auto=false;_status.over=false;
  lib.config.extension_雷的一将_oneClickSelect=true;lib.arenaReady||=[];
  const mod=await import('/extension/雷的一将/utils/oneClickSelect.js');mod.installOneClickSelect();
  window.cards=Array.from({length:6},(_,i)=>{const c=ui.create.card(ui.handcards1).init(['spade',i+1,'sha']);game.me.node.handcards1.append(c);return c;});
  const e=game.createEvent('chooseToUse',false);e.player=game.me;e.filterCard=()=>true;e.selectCard=[1,1];e.position='h';e.selectTarget=[0,0];e.filterTarget=()=>false;e._skillChoice=[];e.then=()=>{};
  _status.eventManager.setStatusEvent(e,true);e.backup('zhiheng');_status.imchoosing=true;game.check();
  window.read=()=>({selected:ui.selected.cards.length,skill:_status.event.skill,position:_status.event.position,range:get.select(e.selectCard),dragged:_status.dragged,clicked:_status.clicked,selectable:cards.map(c=>c.className),click:ui.click.card.toString().slice(0,400)});
  return read();
 });
 await page.locator('.lyj-one-click-select').click();assert.equal(await page.evaluate(()=>ui.selected.cards.length),6);assert.equal(await page.evaluate(()=>_status.event.skill),'zhiheng');
 await page.locator('.lyj-one-click-select').click();assert.equal(await page.evaluate(()=>ui.selected.cards.length),0);assert.equal(await page.evaluate(()=>_status.event.skill),'zhiheng');
 await require('./skill-button-worker-fixture.cjs').installWorkerFixture(page,'othersOff');
 await page.evaluate(()=>{ui.updateSkillControl(game.me,true);ui.skillControl.update();});
 await page.waitForFunction(()=>document.querySelector('[data-skill-button-spine]')?._skillButtonSpine,{},{timeout:30000});
 const playing=await page.evaluate(()=>[...document.querySelectorAll('[data-skill-button-spine]')].map(n=>({name:n._skillButtonSpine.name,canvas:n._skillButtonSpine.sharedCanvas})));
 assert(playing.every(n=>n.name.includes('雷的一将/animation/')));
 await page.waitForTimeout(1200);await page.screenshot({path:path.join(__dirname,'skill-button-migration-browser.png')});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'skill-button-migration-results.json'),JSON.stringify({initial,selectAll:6,cancelAll:0,skillRetained:true,playing,errors},null,2));console.log('MIGRATION_OK');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
