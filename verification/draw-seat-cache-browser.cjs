const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true}),report={rows:[],errors:[]};
 try{
  for(const style of ['othersOff','onlineUI','on']){
   Object.assign(seed,{mode:'identity',characters:['standard'],cards:['standard','extra'],extension_十周年UI_newDecadeStyle:style});
   const page=await browser.newPage({viewport:{width:1500,height:800}});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.dismiss());
   await page.exposeFunction('captureDrawSeat',()=>page.screenshot({path:path.join(__dirname,'draw-seat-destination-'+style+'.png')}));
   await dependencies(page);
   for(const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])
    if(/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8')))await page.unroute('**/node_modules/.pnpm/'+file);
   await page.goto('http://127.0.0.1:'+server.address().port+'/player-tips-probe');
   await page.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
   const row=await page.evaluate(async style=>{
    const {game,ui,lib}=await import('/noname.js');game.pause();game.resume=()=>{};
    document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
    for(const dialog of [...ui.dialogs])dialog.close();
    const actor=game.players[1];actor.init('guanyu');
    const read=()=>({left:actor.offsetLeft,top:actor.offsetTop,width:actor.offsetWidth,height:actor.offsetHeight,cacheLeft:actor.cacheLeft,cacheTop:actor.cacheTop,cacheWidth:actor.cacheWidth,cacheHeight:actor.cacheHeight});
    const wait=()=>new Promise(resolve=>setTimeout(resolve,650));
    ui.arena.dataset.number='2';await wait();actor.checkBoundsCache(true);const initial=read();
    ui.arena.dataset.number='4';await wait();actor.checkBoundsCache();const changed=read();
    const remove=decadeUI.delayRemoveCards;decadeUI.delayRemoveCards=()=>{};
    actor.$draw(1,false);await wait();
    const card=ui.arena.querySelector('.drawingcard');if(!card)throw Error('Draw animation clone missing');
    const rect=n=>{const r=Element.prototype.getBoundingClientRect.call(n);return {x:r.left+r.width/2,y:r.top+r.height/2,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
    const destination={card:rect(card),actor:rect(actor)};await window.captureDrawSeat();card.remove();decadeUI.delayRemoveCards=remove;
    return {style,initial,changed,destination};
   },style);report.rows.push(row);
   if(process.env.DRAW_SEAT_OBSERVE!=='1'){
    assert.equal(row.changed.cacheLeft,row.changed.left,'seat count change must invalidate cached X');assert.equal(row.changed.cacheTop,row.changed.top,'seat count change must invalidate cached Y');
    const {card,actor}=row.destination;
    assert.ok(card.x>=actor.left&&card.x<=actor.right,'draw must end inside the actor card horizontally');assert.ok(card.y>=actor.top&&card.y<=actor.bottom,'draw must end inside the actor card vertically');
   }
   await page.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=process.env.DRAW_SEAT_OBSERVE!=='1';console.log(report.passed?'PASS draw-seat-cache':'OBSERVED draw-seat-cache');
 }catch(error){report.error=error.stack;console.error(error);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(__dirname,process.env.DRAW_SEAT_OBSERVE==='1'?'draw-seat-cache-before.json':'draw-seat-cache-results.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
})();
