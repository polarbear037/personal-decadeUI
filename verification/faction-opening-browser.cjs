const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
const baseline=process.argv.includes('--baseline');
const report={baseline,cases:[],errors:[]};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 Object.assign(seed,{mode:'identity',characters:['standard'],cards:['standard'],hp_style:'round',extension_十周年UI_newDecadeStyle:'othersOff',extension_十周年UI_optimizePrompt:'xinsha'});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:2052,height:919}});
  page.on('pageerror',e=>report.errors.push(e.stack));page.on('dialog',d=>{report.errors.push(d.message());d.accept()});
  await dependencies(page);
  if(baseline){
   await page.route('**/src/styles/xinsha-faction-dialog.css*',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(path.resolve(__dirname,'../src/styles/xinsha-faction-dialog.css'),'utf8').replace('\toverflow: visible !important;\n\ttransition: none !important;','\toverflow: visible !important;').replace('\tzoom: 1 !important;\n\ttransition: none !important;','')}));
   await page.route('**/src/overrides/ui/create.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.resolve(__dirname,'../src/overrides/ui/create.js'),'utf8').replace('\tapplyFactionDialogInteraction(applyXinshaFactionDialog(applyOnlineFactionDialog(dialog)));','').replace('return applyHuarenDialogInteraction(dialog);','return applyHuarenDialogInteraction(applyFactionDialogInteraction(applyXinshaFactionDialog(applyOnlineFactionDialog(dialog))));')}));
  }
  for(const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])if(/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8')))await page.unroute('**/node_modules/.pnpm/'+file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.waitForFunction(()=>window.decadeUI&&window.game?.players?.length>1&&!document.querySelector('.loading-screen'),null,{timeout:45000});
  for(const native of [true,false])for(const selecting of [false,true]){
   const frames=await page.evaluate(async({native,selecting})=>{
    const {game,ui,lib,_status}=await import('/noname.js');const {Content}=await import('/noname/library/element/content.js');
    game.pause();for(const d of [...ui.dialogs])d.close();ui.arena.classList.toggle('choose-character',selecting);
    const frames=[];let dialog;
    const sample=tag=>{
     const d=dialog||ui.dialog,b=d?.buttons?.[0];if(!b)return;
     const rect=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {width:r.width,height:r.height,x:r.x,y:r.y,transform:s.transform,zoom:s.zoom,animation:s.animationName,transition:s.transition,cls:n.className}};
     frames.push({tag,time:performance.now(),button:rect(b),row:rect(b.parentElement),content:rect(d.content),dialog:rect(d),unit:d.style.getPropertyValue('--xinsha-faction-card-unit')});
    };
    const spec=['请选择你的势力',[['wei','shu','wu','qun','jin'].map(g=>['','',`group_${g}`]),'vcard']];
    if(native){const event=game.me.chooseButton(spec,true);_status.eventManager.setStatusEvent(event,true);await Content.chooseButton[0](event,null,game.me);dialog=event.dialog;}
    else dialog=ui.create.dialog(...spec);
    sample('synchronous');
    for(let i=0;i<35;i++){await new Promise(requestAnimationFrame);if(i===2)ui.arena.classList.remove('choose-character');sample(i)}
    dialog.close();return frames;
   },{native,selecting});
   report.cases.push({native,selecting,frames});
   const final=frames.at(-1);
   if(!baseline)for(const frame of frames){
    assert.equal(frame.row.zoom,'1','faction row must not inherit card zoom');
    for(const key of ['width','height','x','y'])assert.ok(Math.abs(frame.button[key]-final.button[key])<.1,`first-frame ${key} must match final geometry`);
    assert.ok(Math.abs(frame.button.width-151*parseFloat(frame.unit))<.1,'faction size uses the scene unit exactly once');
   }
   console.log(`${baseline?'FACTION_OPENING_BASELINE':'FACTION_OPENING_OK'}: native=${native}, choose-character=${selecting}, width change=${Math.max(...frames.map(f=>f.button.width))-Math.min(...frames.map(f=>f.button.width))}, ${frames.length} samples`);
  }
  if(baseline)assert.ok(report.cases.some(c=>c.frames.some(f=>Math.abs(f.button.width-c.frames.at(-1).button.width)>1)),'old code reproduces the opening size change');
  assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync(path.join(__dirname,`faction-opening${baseline?'-baseline':''}-results.json`),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
