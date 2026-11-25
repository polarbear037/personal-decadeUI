const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const report = { errors: [] };
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel:'msedge', headless:true, args:['--enable-unsafe-swiftshader'] });
 try {
  Object.assign(seed, { mode:'identity', characters:['standard','extra'], cards:['standard'], hp_style:'round', extension_十周年UI_newDecadeStyle:'othersOff' });
  const page = await browser.newPage({ viewport:{width:1638,height:919} });
  page.on('pageerror', error => report.errors.push(error.stack));
  page.on('dialog', dialog => { report.errors.push(dialog.message()); dialog.accept(); });
  await dependencies(page);
  for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js']) if (/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8'))) await page.unroute('**/node_modules/.pnpm/'+file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
  await page.evaluate(async () => {
   const {game,ui,lib,get,_status}=await import('/noname.js');Object.assign(window,{game,ui,lib,get,_status});
   game.pause();for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();
   ui.arena.classList.remove('choose-character');game.me=game.players[0];game.me.init('sunquan');
   const event=game.createEvent('phaseUse',false);event.player=game.me;_status.eventManager.setStatusEvent(event,true);
   window.plugin=app.pluginsMap.character;
   lib.config.qhly_skinset={skin:{sunquan:'probe.jpg'},djtoggle:{}};game.qhly_getSkin=name=>lib.config.qhly_skinset.skin[name]||null;
   decadeUI.config.dynamicSkin=true;lib.config.extension_十周年UI_dynamicSkinOutcrop=true;
   decadeUI.dynamicSkin.sunquan.probe={...decadeUI.dynamicSkin.dc_shen_huatuo['长夜启明'],hideSlots:['gh_2g_glow']};
   ui.arena.dataset.borderStyle='dragon4';game.me.dataset.borderLevel='five';
   const {installFamousDragonCanvases}=await import('/extension/皮肤切换/js/modules/famous-dragon-canvas.js');
   window.skinSwitch={};installFamousDragonCanvases(lib,ui,skinSwitch);
   plugin.click.playerIntro.call(plugin,null,game.me);
  });
  await page.waitForFunction(()=>document.querySelector('.yjcm-character-preview')?.dynamic?.activePlays.size>0 && [...document.querySelector('.yjcm-character-preview').dynamic.activePlays.values()].every(play=>play?.node),null,{timeout:30000});
  await page.waitForTimeout(700);
  await page.screenshot({path:path.join(__dirname,'player-preview-slots-dynamic.png')});
  report.rendering=await page.evaluate(async()=>{
   const d=document.querySelector('.yjcm-character-preview').dynamic,active=d.activePlays.get(d.primary),node=active.node,r=active.renderer,renderer=r.spine.skeletonRenderer;
   const target='gh_2g_glow',attachment=node.skeleton.findSlot(target).getAttachment().name;
   const rows=[];const original=renderer.draw;
   for(const hide of [[],[target],[attachment]])for(const outcrop of [true,false]){
    const hits=[];node.hideSlots=hide;node.clipSlots=['vx_daiji/vx_dj_guang/vx_dj_guang_1'];d.outcropMask=outcrop;d.update();
    renderer.draw=function(batcher,skeleton,...args){
     if(skeleton!==node.skeleton)return original.call(this,batcher,skeleton,...args);
     const restore=[];
     for(const slot of skeleton.slots){const a=slot.getAttachment();if(!a?.computeWorldVertices)continue;const f=a.computeWorldVertices;restore.push(()=>a.computeWorldVertices=f);a.computeWorldVertices=function(...args){hits.push({slot:slot.data.name,clipped:renderer.clipper.isClipping()});return f.apply(this,args)}}
     try{return original.call(this,batcher,skeleton,...args)}finally{restore.forEach(f=>f())}
    };
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    rows.push({hide,outcrop,hiddenDraws:hits.filter(h=>h.slot===target).length,clipDraws:hits.filter(h=>h.slot==='vx_daiji/vx_dj_guang/vx_dj_guang_1'),total:hits.length});
   }
   renderer.draw=original;node.hideSlots=d.primary.hideSlots;node.clipSlots=d.primary.clipSlots;d.outcropMask=true;d.update();return rows;
  });
  for(const row of report.rendering){assert.ok(row.total>0);assert.equal(row.hiddenDraws===0,row.hide.length>0,'hideSlots supports slot and attachment names');assert.ok(row.clipDraws.length>0);assert.ok(row.clipDraws.every(hit=>hit.clipped===row.outcrop),'clipSlots follows outcrop and slot names');}
  report.slots=await page.evaluate(()=>{
   const p=document.querySelector('.yjcm-character-preview'),d=p.dynamic,active=d.activePlays.get(d.primary),node=active.node,r=active.renderer;
   return {input:{hide:d.primary.hideSlots,clip:d.primary.clipSlots},node:{hide:node.hideSlots,clip:node.clipSlots},renderer:{hide:r.spine.skeletonRenderer.hideSlots,clip:r.spine.skeletonRenderer.clipSlots,outcrop:r.outcropMask},slots:node.skeleton.slots.filter(s=>['gh_2','gh_2g_glow','vx_daiji/vx_dj_guang/vx_dj_guang_1'].includes(s.data.name)||['gh_2','gh_2g_glow','vx_daiji/vx_dj_guang/vx_dj_guang_1'].includes(s.getAttachment()?.name)).map(s=>({slot:s.data.name,attachment:s.getAttachment()?.name})),source:game.me.dynamic?.primary?.name};
  });
  report.frames=[];
  await page.evaluate(()=>{
   window.previewWebgl=0;window.originalPreviewContext=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/.test(type))previewWebgl++;return originalPreviewContext.call(this,type,...args)};
  });
  for(const border of ['dragon2','dragon3','dragon4']){
   await page.evaluate(async border=>{
    decadeUI.config.dynamicSkin=false;
    ui.arena.dataset.borderStyle=border;plugin.playerDialog.hide();plugin.playerDialog.remove();plugin.click.playerIntro.call(plugin,null,game.me);
   },border);
   await page.waitForFunction(()=>document.querySelector('.yjcm-preview-dragon-spine')?.spinePlayback?.frames>0,null,{timeout:15000});
   await page.waitForTimeout(600);
   const row=await page.evaluate(border=>{
    const preview=document.querySelector('.yjcm-character-preview');
    const styles=p=>{const b=p.node.campWrap.querySelector('.camp-border'),s=getComputedStyle(b),a=getComputedStyle(b,'::after');return {camp:[getComputedStyle(p.node.campWrap).width,getComputedStyle(p.node.campWrap).height],border:[s.left,s.top,s.width,s.height,s.backgroundImage],overlay:[a.left,a.top,a.width,a.height,a.backgroundImage,a.content],vars:['--dragon-mask-left','--dragon-mask-top','--dragon-mask-width','--dragon-mask-height'].map(key=>a.getPropertyValue(key))}};
    const source=game.me.node.campWrap.querySelector('.skin-switch-dragon-spine'),target=preview.querySelector('.yjcm-preview-dragon-spine');
    const box=c=>{const r=c.getBoundingClientRect(),p=c.parentElement.getBoundingClientRect();return [(r.x-p.x)/p.width,(r.y-p.y)/p.height,r.width/p.width,r.height/p.height]};
    const canvasState=c=>({box:box(c),sprite:c.spinePlayback.sprite,shared:c.spinePlayback.sharedGroup===source.spinePlayback.sharedGroup,frames:c.spinePlayback.frames});
    window.lastDragon=target;
    return {border,source:styles(game.me),preview:styles(preview),sourceCanvas:canvasState(source),previewCanvas:canvasState(target)};
   },border);
   report.frames.push(row);assert.deepEqual(row.source.border,row.preview.border);assert.equal(row.preview.overlay.at(-1),'none');assert.deepEqual(row.sourceCanvas.sprite,row.previewCanvas.sprite);assert.equal(row.previewCanvas.shared,true);row.sourceCanvas.box.forEach((value,i)=>assert.ok(Math.abs(value-row.previewCanvas.box[i])<.001,'dragon position matches source'));
   await page.screenshot({path:path.join(__dirname,`player-preview-${border}.png`)});
  }
  report.cleanup=await page.evaluate(()=>{const source=game.me.node.campWrap.querySelector('.skin-switch-dragon-spine');plugin.playerDialog.hide();return{disposed:lastDragon.spinePlayback.disposed,connected:lastDragon.isConnected,sourceAlive:source.isConnected&&!source.spinePlayback.disposed}});
  assert.deepEqual(report.cleanup,{disposed:true,connected:false,sourceAlive:true});
  await page.evaluate(()=>{
   const create=skinSwitch.createSpineCanvas;
   skinSwitch.createSpineCanvas=async function(sprite,options){
    if(options.className!=='yjcm-preview-dragon-spine')return create.call(this,sprite,options);
    await new Promise(resolve=>setTimeout(resolve,120));
    window.lateDragon=await create.call(this,sprite,options);return lateDragon;
   };
   plugin.click.playerIntro.call(plugin,null,game.me);plugin.playerDialog.hide();plugin.playerDialog.remove();
  });
  await page.waitForFunction(()=>window.lateDragon?.spinePlayback.disposed);
  report.pending=await page.evaluate(()=>({disposed:lateDragon.spinePlayback.disposed,connected:lateDragon.isConnected,previewCount:document.querySelectorAll('.yjcm-preview-dragon-spine').length,sourceAlive:!!game.me.querySelector('.skin-switch-dragon-spine')?.spinePlayback&&!game.me.querySelector('.skin-switch-dragon-spine').spinePlayback.disposed}));
  assert.deepEqual(report.pending,{disposed:true,connected:false,previewCount:0,sourceAlive:true});
  report.newDragonWebgl=await page.evaluate(()=>{HTMLCanvasElement.prototype.getContext=originalPreviewContext;return previewWebgl});
  assert.equal(report.newDragonWebgl,0,'preview dragon reuses the existing WebGL renderer');
  console.log('PLAYER_PREVIEW_SLOTS_OK: six real rendering cases, three shared dragon layouts and preview cleanup');
  assert.deepEqual(report.errors,[]);
 } finally {
  fs.writeFileSync(path.join(__dirname,'player-preview-slots-results.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1});
