const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {server, chromium, seed} = require('./online-player-tips-browser.cjs');
(async()=>{
 Object.assign(seed,{mode:'identity',characters:['standard','refresh'],cards:['standard','extra'],extension_十周年UI_newDecadeStyle:'othersOff',game_speed:'vfast',duration:300});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const baseline=process.argv.includes('--baseline'),cached=process.argv.includes('--cached');
  const page=await browser.newPage({viewport:{width:1500,height:800}}), errors=[], consoleErrors=[], missingResources=[];
  if(baseline)await page.route('**/discard-motion-xinsha.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'../src/ui/discard-motion-xinsha.js'),'utf8').replace('return !target || target.transform !== transform || target.applied !== card.style.transform;','return card.style.transform !== transform;')}));
  if(cached)await page.route('**/discard-motion-xinsha.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'../src/ui/discard-motion-xinsha.js'),'utf8').replace('\t\tsyncXinshaDiscardAnimationTime(animation);','')}));
  page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);}); page.on('dialog',d=>{console.log('DIALOG',d.message());d.accept();});
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)missingResources.push({status:r.status(),path:decodeURIComponent(new URL(r.url()).pathname)});});
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.locator('#arena > .player').nth(2).waitFor({state:'attached',timeout:20000}).catch(async e=>{console.log('BOOT',await page.locator('body').innerText());throw e;});
  if(cached)await page.evaluate(async()=>{const m=await import('/extension/十周年UI/verification/discard-motion-clock-live.js');const installed=await m.installDiscardMotionClockFix();if(!installed.installed)throw Error('Cached motion fix missing');});
  await page.evaluate(async()=>{
   const {game,lib,ui,_status}=await import('/noname.js');
   const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');
   await installCardBeautify();
   const probe=window.jiedaoProbe={throws:[],nodes:[],animations:[],done:false};
   let repeatedLayouts=false;
   const ids=new WeakMap();let sequence=0;
   const id=n=>{if(!ids.has(n))ids.set(n,++sequence);return ids.get(n);};
   const proto=lib.element.Player.prototype, original=proto.$throw, ordered=proto.$throwordered2, animate=Element.prototype.animate;
   proto.$throw=function(cards,...args){if(probe.active)probe.throws.push({event:_status.event?.name,actor:this.name,cards:cards.map(c=>({id:c.cardid,name:c.name})),stack:new Error().stack});return original.call(this,cards,...args);};
   proto.$throwordered2=function(card,...args){const result=ordered.call(this,card,...args);if(probe.active&&card.name==='jiedao')probe.nodes.push({node:id(card),event:_status.event?.name});return result;};
   Element.prototype.animate=function(...args){const result=animate.apply(this,args);if(probe.active&&this.name==='jiedao'){
    probe.animations.push({node:id(this),event:_status.event?.name,from:args[0][0],to:args[0].at(-1),stack:new Error().stack});
    // 处理区的延迟更新不应把同一落点当成一次新的飞牌。
    if(!repeatedLayouts){repeatedLayouts=true;setTimeout(()=>decadeUI.layoutDiscard(),100);setTimeout(()=>decadeUI.layoutDiscard(),450);}
   }return result;};
   lib.skill._jiedao_flight_probe={trigger:{global:'phaseUseBegin'},forced:true,silent:true,charlotte:true,firstDo:true,priority:Infinity,filter:()=>!probe.started,async content(){
    probe.started=true;
    const [self,actor,target,victim]=game.players;
    for(const p of game.players){p.init('caocao');p.removeSkills(p.getSkills());}
    actor.init('re_xinxianying');actor.removeSkills(actor.getSkills());
    await target.equip(game.createCard('qinggang','spade',6));
    await new Promise(r=>setTimeout(r,800));
    const card=game.createCard('jiedao','club',12);actor.directgain([card]);
    await new Promise(r=>setTimeout(r,500));
    probe.active=true;
    const use=actor.useCard(card,[target,victim]);
    use.directHit=game.players.slice();
    await use;
    await new Promise(r=>setTimeout(r,800));
    probe.active=false;probe.done=true;game.pause();
   }};
   game.addGlobalSkill('_jiedao_flight_probe');if(!_status.auto)ui.click.auto('forced');game.resume2();game.resume();
  });
  await page.waitForFunction(()=>jiedaoProbe.done,null,{timeout:45000});
  const result=await page.evaluate(()=>jiedaoProbe);
  const repeat=await page.evaluate(async baseline=>{
   const {verifyDiscardMotionRepeat}=await import('/extension/十周年UI/verification/discard-motion-repeat-live.js');
   const result=await verifyDiscardMotionRepeat({baseline});
   const {samples,...summary}=result;return summary;
  },baseline);
  fs.writeFileSync(path.join(__dirname,`jiedao-flight-engine-${baseline?'before':cached?'cached':'after'}-results.json`),JSON.stringify({result,repeat,errors,consoleErrors,missingResources},null,2)+'\n');
  console.log(JSON.stringify({baseline,cached,throwNotifications:result.throws.length,nodes:result.nodes.length,animations:result.animations.length,repeat,errors,missingResources},null,2));
  assert.equal(result.nodes.length,1,'借刀只创建一次飞牌副本');
  if(baseline)assert(result.animations.length>1,'旧代码须复现同一副本重新起播');
  else assert.equal(result.animations.length,1,'借刀只起播一次飞牌动画');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
