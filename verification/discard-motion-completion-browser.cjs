const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium}=require('./online-player-tips-browser.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});const result={cases:[],errors:[]};
 try{
  const page=await browser.newPage();page.on('pageerror',e=>result.errors.push(e.message));
  await page.route('**/__discard_completion_probe__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/__motion_lib__.js"}}</script>'}));
  await page.route('**/__motion_lib__.js',r=>r.fulfill({contentType:'text/javascript',body:'export const lib={config:{extension_十周年UI_newDecadeStyle:"othersOff"}};'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/__discard_completion_probe__`);
  for(const count of [0,1,3]){
   const row=await page.evaluate(async count=>{
    const m=await import('/extension/十周年UI/src/ui/discard-motion-xinsha.js');const card=document.createElement('div');card.style.cssText='position:absolute;width:10px;height:10px;transform:translate(0px,0px);transition:none';document.body.append(card);
    const events=[],samples=[];card.addEventListener('webkitTransitionEnd',()=>events.push(performance.now()));const wait=ms=>new Promise(r=>setTimeout(r,ms));
    m.updateXinshaDiscardMotion([{card,transform:'translate(100px,100px) scale(.8)'}]);
    for(let i=0;i<count;i++){await wait(70);await new Promise(requestAnimationFrame);const previous=card.getAnimations()[0],remaining=previous.effect.getTiming().duration-Math.max(0,previous.currentTime);const before=new DOMMatrix(getComputedStyle(card).transform);m.updateXinshaDiscardMotion([{card,transform:`translate(${150+50*i}px,100px) scale(.8)`}]);const next=card.getAnimations()[0];const after=new DOMMatrix(getComputedStyle(card).transform);samples.push({events:events.length,jump:Math.hypot(before.e-after.e,before.f-after.f),remaining,duration:next.effect.getTiming().duration});}
    await wait(450);const countAtFinish=events.length,remaining=card.getAnimations().length;const pose=getComputedStyle(card).transform;
    m.updateXinshaDiscardMotion([{card,transform:count?`translate(${150+50*(count-1)}px,100px) scale(.8)`:'translate(100px,100px) scale(.8)'}]);const unchanged=card.getAnimations().length;
    m.finishXinshaDiscardMotion(card);m.finishXinshaDiscardMotion(card);card.remove();return{count,samples,countAtFinish,remaining,pose,unchanged,finalCount:events.length};
   },count);result.cases.push(row);assert.ok(row.samples.every(s=>s.events===0&&s.jump<3&&Math.abs(s.remaining-s.duration)<6),JSON.stringify(row));assert.equal(row.countAtFinish,1);assert.equal(row.remaining,0);assert.equal(row.unchanged,0);assert.equal(row.finalCount,1);
  }
  result.cleanup=await page.evaluate(async()=>{const m=await import('/extension/十周年UI/src/ui/discard-motion-xinsha.js');const card=document.createElement('div');document.body.append(card);let events=0;card.addEventListener('webkitTransitionEnd',()=>events++);m.updateXinshaDiscardMotion([{card,transform:'translate(100px,100px)'}]);m.finishXinshaDiscardMotion(card);m.finishXinshaDiscardMotion(card);const left=card.getAnimations().length;card.remove();return{events,left};});assert.deepEqual(result.cleanup,{events:1,left:0});assert.deepEqual(result.errors,[]);
  result.exhausted=await page.evaluate(async()=>{const m=await import('/extension/十周年UI/src/ui/discard-motion-xinsha.js');const card=document.createElement('div');document.body.append(card);let events=0;card.addEventListener('webkitTransitionEnd',()=>events++);m.updateXinshaDiscardMotion([{card,transform:'translate(100px,100px)'}]);card.getAnimations()[0].currentTime=300;m.updateXinshaDiscardMotion([{card,transform:'translate(200px,100px)'}]);const early=events;await new Promise(r=>setTimeout(r,150));const row={early,events,left:card.getAnimations().length,x:new DOMMatrix(getComputedStyle(card).transform).e};card.remove();return row;});assert.deepEqual(result.exhausted,{early:0,events:1,left:0,x:200});
  console.log('DISCARD_COMPLETION_OK: retarget stays continuous and silent; final completion/cleanup once; unchanged placement stays idle');
 }finally{fs.writeFileSync(path.join(__dirname,'discard-motion-completion-results.json'),JSON.stringify(result,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
