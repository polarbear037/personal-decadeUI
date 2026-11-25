const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const root = path.resolve(__dirname, '..');
const report = { errors: [], cases: [] };
(async () => {
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 const browser = await chromium.launch({ channel:'msedge', headless:true, args:['--enable-unsafe-swiftshader'] });
 try {
  Object.assign(seed, { mode:'identity', characters:['standard','huicui','xianding'], cards:['standard','extra'], hp_style:'round', extension_十周年UI_newDecadeStyle:'othersOff' });
  const page = await browser.newPage({ viewport:{width:1638,height:919} });
  page.on('pageerror', e => { report.errors.push(e.stack); console.log(e.stack); });
  page.on('dialog', d => { report.errors.push(d.message()); void d.accept(); });
  await dependencies(page);
  for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js']) if (/as __require/.test(fs.readFileSync(path.resolve(root,'../../node_modules/.pnpm',file),'utf8'))) await page.unroute('**/node_modules/.pnpm/'+file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
  await page.evaluate(async () => {
   const {game,ui,lib,get,_status} = await import('/noname.js'); Object.assign(window,{game,ui,lib,get,_status});
   game.pause(); for (const d of [...ui.dialogs]) d.close(); for (const c of [...ui.controls]) c.close();
   document.querySelector('.decade-welcome-overlay')?.remove(); ui.arena.classList.remove('choose-character');
   game.me=game.players[0]; game.me.init('sunquan'); game.players[1].init('guanyu'); _status.gameStarted=true;
   const event=game.createEvent('phaseUse',false); event.player=game.me; _status.eventManager.setStatusEvent(event,true);
   window.plugin=app.pluginsMap.character;
   lib.config.qhly_skinset={skin:{sunquan:'少女回战.jpg',caocao:'少女回战.jpg'},djtoggle:{}};
   decadeUI.config.dynamicSkin=true;lib.config.extension_十周年UI_dynamicSkinOutcrop=true;ui.arena.dataset.dynamicSkinOutcrop='on';
   game.qhly_getSkin=name=>lib.config.qhly_skinset.skin[name]||null;
   window.before={players:game.players.length,dynamic:decadeUI.CUR_DYNAMIC,listeners:decadeUI.bodySensor.events.length};
   plugin.click.playerIntro.call(plugin,null,game.me);
  });
  await page.locator('.yjcm-character-preview').waitFor({state:'visible'});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelector('.yjcm-character-preview').dynamic.activePlays.values()].every(p=>p?.node&&!p.node.completed),null,{timeout:30000});
  await page.waitForTimeout(700);
  report.initial=await page.evaluate(() => {
   const p=document.querySelector('.yjcm-character-preview'), host=p.parentElement, d=host.parentElement;
   const box=n=>Element.prototype.getBoundingClientRect.call(n).toJSON();
   return {name:p.name,double:p.doubleAvatar,layers:[...p.dynamic.activePlays.keys()].map(s=>({layer:s.layer,clip:s.clip})),prototype:p instanceof lib.element.Player,card:box(p),dialog:box(d),avatar:box(p.node.avatar),hp:box(p.node.hpWrap),camp:box(p.node.campWrap),frame:getComputedStyle(d.querySelector('.yjcm-info-frame')).backgroundImage.startsWith('url("data:image/png'),hiddenNodes:['count','equips','judges','marks','identity','seat','gainSkill'].filter(k=>p.node[k]?.isConnected),players:game.players.length,dynamic:decadeUI.CUR_DYNAMIC,listeners:decadeUI.bodySensor.events.length};
  });
  await page.screenshot({path:path.join(__dirname,'info-popup-character.png')});

  // 用不透明色块验证蒙版的真实绘制：背景在上方圆角处应透出底图，露头前景仍须可见。
  const clipProbe=await page.evaluate(()=>{
   const p=document.querySelector('.yjcm-character-preview');
   const probe=document.createElement('canvas');probe.className='animation-player preview-clip-probe';probe.width=1300;probe.height=2000;
   const ctx=probe.getContext('2d');ctx.fillStyle='rgb(255,0,0)';ctx.fillRect(0,200,1300,1800);ctx.fillStyle='rgb(0,255,0)';ctx.fillRect(500,0,300,200);
   probe._wrapZ=p.$dynamicWrap.style.zIndex;p.$dynamicWrap.style.zIndex='999';
   probe.style.zIndex='10';p.$dynamicWrap.append(probe);
   const r=Element.prototype.getBoundingClientRect.call(probe);
   return {clip:getComputedStyle(probe).clipPath,page:location.href,points:{left:[r.x+r.width*.01,r.y+r.height*.105],right:[r.x+r.width*.99,r.y+r.height*.105],body:[r.x+r.width*.5,r.y+r.height*.5],head:[r.x+r.width*.5,r.y+r.height*.05]}};
  });
  const pixels=async buffer=>page.evaluate(async({data,points})=>{
   const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   return Object.fromEntries(Object.entries(points).map(([key,[x,y]])=>[key,[...ctx.getImageData(Math.round(x),Math.round(y),1,1).data]]));
  },{data:buffer.toString('base64'),points:clipProbe.points});
  const clipped=await pixels(await page.screenshot());
  await page.locator('.preview-clip-probe').evaluate(p=>p.style.setProperty('clip-path','none','important'));
  const square=await pixels(await page.screenshot());
  await page.locator('.preview-clip-probe').evaluate(p=>{p.parentElement.style.zIndex=p._wrapZ;p.remove()});
  report.rounded={clip:clipProbe.clip,clipped,square};
  for(const side of ['left','right']){
   assert.deepEqual(square[side],[255,0,0,255]);
   assert.notDeepEqual(clipped[side],square[side],side+' background corner must actually be clipped');
  }
  assert.deepEqual(clipped.body,[255,0,0,255]);assert.deepEqual(clipped.head,[0,255,0,255]);
  const clipUrl=clipProbe.clip.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
  assert.equal(new URL(clipUrl,clipProbe.page).pathname,new URL(clipProbe.page).pathname,'SVG fragment must reference the document, not a stylesheet');

  assert.equal(report.initial.double,false);assert.ok(report.initial.layers.length>=2);assert.ok(report.initial.layers.filter(s=>s.layer===-1).every(s=>s.clip.height[1]===.9));assert.ok(report.initial.prototype); assert.equal(report.initial.name,'sunquan'); assert.ok(report.initial.frame); assert.deepEqual(report.initial.hiddenNodes,[]);
  assert.equal(report.initial.players,await page.evaluate(()=>before.players));
  assert.equal(report.initial.dynamic,await page.evaluate(()=>before.dynamic));
  // 真实判定区节点与本体 nodeintro；不按牌名改规则。
  report.cleanup=await page.evaluate(()=>{
   const p=document.querySelector('.yjcm-character-preview'), d=p.dynamic;
   window.previousDynamic=d; plugin.playerDialog.hide();
   return {destroyed:d.destroyed,connected:d.canvas.isConnected,width:d.canvas.width,height:d.canvas.height,active:d.activePlays.size,listeners:decadeUI.bodySensor.events.length,before:before.listeners,assets:Object.values(d.manager.animations).map(r=>Object.keys(r.spine.assetManager.assets).length),frames:Object.values(d.manager.animations).map(r=>r.requestId??null)};
  });
  assert.equal(report.cleanup.destroyed,true);assert.equal(report.cleanup.connected,false);assert.equal(report.cleanup.width,0);assert.equal(report.cleanup.height,0);assert.equal(report.cleanup.active,0);assert.equal(report.cleanup.listeners,report.cleanup.before);assert.ok(report.cleanup.assets.every(n=>n===0));assert.ok(report.cleanup.frames.every(n=>n===null));
  report.hpReopen=await page.evaluate(async()=>{
   const actor=game.me, saved={hp:actor.hp,maxHp:actor.maxHp};const rows=[];
   const borderStyle=ui.arena.dataset.borderStyle, borderLevel=actor.dataset.borderLevel;
   ui.arena.dataset.borderStyle='dragon4';actor.dataset.borderLevel='five';
   const frame=p=>{const c=getComputedStyle(p.node.hpWrap,'::before');return [c.borderImageSource,c.borderImageSlice,c.height,c.transform]};
   for(const maxHp of [4,7])for(const hp of [maxHp,2,1]){
    actor.maxHp=maxHp;actor.hp=hp;actor.$update();
    for(let i=0;i<3;i++){
     plugin.click.playerIntro.call(plugin,null,actor);
     for(const reopen of [false,true]){
      if(reopen){plugin.playerDialog.hide();plugin.playerDialog.show(actor,true)}
      await new Promise(requestAnimationFrame);
      const p=document.querySelector('.yjcm-character-preview'), source=actor.node.hp, target=p.node.hp;
      rows.push({maxHp,hp,round:i,reopen,condition:target.dataset.condition,sourceCondition:source.dataset.condition,html:target.innerHTML,sourceHtml:source.innerHTML,classes:target.className,sourceClasses:source.className,images:[...target.children].map(n=>getComputedStyle(n).backgroundImage),sourceImages:[...source.children].map(n=>getComputedStyle(n).backgroundImage),frame:frame(p),sourceFrame:frame(actor)});
     }
     plugin.playerDialog.hide();plugin.playerDialog.remove();
    }
   }
   Object.assign(actor,saved);actor.$update();ui.arena.dataset.borderStyle=borderStyle;if(borderLevel)actor.dataset.borderLevel=borderLevel;else delete actor.dataset.borderLevel;plugin.click.playerIntro.call(plugin,null,actor);plugin.playerDialog.hide();return rows;
  });
  for(const row of report.hpReopen){
   assert.equal(row.condition,row.sourceCondition,'HP condition after reopen');assert.equal(row.html,row.sourceHtml,'HP content after reopen');assert.equal(row.classes,row.sourceClasses,'HP mode after reopen');assert.deepEqual(row.images,row.sourceImages,'HP images after reopen');assert.deepEqual(row.frame,row.sourceFrame,'HP frame asset and geometry after reopen');
  }
  report.hpFrames=await page.evaluate(async()=>{
   const actor=game.me,saved={hp:actor.hp,maxHp:actor.maxHp},style=ui.arena.dataset.borderStyle,grade=ui.arena.dataset.borderLevel,own=actor.dataset.borderLevel,dynamic=decadeUI.config.dynamicSkin,rows=[];
   const frame=p=>{const c=getComputedStyle(p.node.hpWrap,'::before');return [c.borderImageSource,c.borderImageSlice,c.height,c.transform]};
   decadeUI.config.dynamicSkin=false;actor.maxHp=4;
   for(const border of ['xinsha','dragon2','dragon3','dragon4'])for(const tier of ['one','two','three','four','five','inherit'])for(const hp of [4,1]){
    ui.arena.dataset.borderStyle=border;ui.arena.dataset.borderLevel=tier==='inherit'?'five':'random';
    if(tier==='inherit')delete actor.dataset.borderLevel;else actor.dataset.borderLevel=tier;
    actor.hp=hp;actor.$update();plugin.click.playerIntro.call(plugin,null,actor);await new Promise(requestAnimationFrame);
    const p=document.querySelector('.yjcm-character-preview');rows.push({border,tier,hp,frame:frame(p),sourceFrame:frame(actor)});
    plugin.playerDialog.hide();plugin.playerDialog.remove();
   }
   Object.assign(actor,saved);actor.$update();ui.arena.dataset.borderStyle=style;ui.arena.dataset.borderLevel=grade;if(own)actor.dataset.borderLevel=own;else delete actor.dataset.borderLevel;decadeUI.config.dynamicSkin=dynamic;plugin.click.playerIntro.call(plugin,null,actor);plugin.playerDialog.hide();return rows;
  });
  for(const row of report.hpFrames)assert.deepEqual(row.frame,row.sourceFrame,`${row.border}/${row.tier}/${row.hp} HP frame`);
  report.judge=await page.evaluate(async()=>{

   const card=game.createCard('lebu','club',6);game.players[1].node.judges.append(card);
   window.intro=get.nodeintro(card,false);intro.classList.add('popped','static');ui.window.append(intro);
   const tips=await import('/extension/十周年UI/src/ui/xinsha-tooltip.js');await tips.prepareXinshaTooltip(intro);tips.positionXinshaTooltip(intro);
   return {kind:intro.dataset.xinshaTooltip,title:intro.querySelector('.xinsha-tooltip-name')?.textContent,body:intro.querySelector('.xinsha-tooltip-description')?.textContent,bg:getComputedStyle(intro.querySelector('.xinsha-card-tooltip'),'::before').backgroundImage.startsWith('url("data:image/png')};
  });
  assert.equal(report.judge.kind,'card');assert.ok(report.judge.bg);assert.match(report.judge.title,/乐不思蜀/);assert.match(report.judge.body,/判定/);
  await page.screenshot({path:path.join(__dirname,'info-popup-judge.png')});
  await page.evaluate(()=>{intro.remove();plugin.playerDialog.show(game.me,true);});
  report.reopen=await page.evaluate(()=>({count:document.querySelectorAll('.yjcm-character-preview').length,name:document.querySelector('.yjcm-character-preview').name}));
  assert.equal(report.reopen.count,1);assert.equal(report.reopen.name,'sunquan');
  report.rank=await page.evaluate(()=>{
   lib.config.extension_十周年UI_borderLevel='random';game.me.dataset.borderLevel='five';
   const values=[];for(let i=0;i<4;i++){plugin.click.playerIntro.call(plugin,null,game.me);const p=document.querySelector('.yjcm-character-preview');values.push(p.dataset.borderLevel);plugin.playerDialog.hide();plugin.playerDialog.remove();}
   game.me.dataset.borderLevel='two';plugin.click.playerIntro.call(plugin,null,game.me);values.push(document.querySelector('.yjcm-character-preview').dataset.borderLevel);plugin.playerDialog.hide();plugin.playerDialog.remove();
   return values;
  });
  assert.deepEqual(report.rank,['five','five','five','five','two']);
  report.variants=await page.evaluate(()=>{
   const results=[];
   for(const pair of [['sunquan','guanyu'],['caocao','sunquan']]){
    game.me.init(...pair);plugin.click.playerIntro.call(plugin,null,game.me);
    const d=document.querySelector('.yjcm-seat-info'), first=d.querySelector('.yjcm-character-preview'), dynamic=first.dynamic;
    d.querySelectorAll('.yjcm-general-switch-button')[1].click();
    const second=d.querySelector('.yjcm-character-preview');
    results.push({name:second.name,removed:!first.isConnected,destroyed:!dynamic||dynamic.destroyed,frameCount:d.querySelectorAll('canvas').length});
    plugin.playerDialog.hide();
   }
   const other=game.players[1];other.init('sunquan','guanyu');other.classList.add('unseen','unseen2');plugin.click.playerIntro.call(plugin,null,other);
   const d=document.querySelector('.yjcm-seat-info');results.push({name:d.querySelector('.yjcm-character-preview').node.name.textContent,canvas:d.querySelectorAll('canvas').length});
   d.querySelectorAll('.yjcm-general-switch-button')[1].click();results.push({name:d.querySelector('.yjcm-character-preview').node.name.textContent,canvas:d.querySelectorAll('canvas').length});
   plugin.playerDialog.hide();plugin.playerDialog.remove();other.classList.remove('unseen','unseen2');
   return results;
  });
  assert.equal(report.variants[0].name,'guanyu');assert.equal(report.variants[1].name,'sunquan');assert.ok(report.variants.slice(0,2).every(r=>r.removed&&r.destroyed));assert.ok(report.variants.slice(2).every(r=>r.name==='未知'&&r.canvas===0));
  // 真实3.6骨骼请求仍在加载时关窗，迟到回调不得重建画布或纹理。
  await page.route('**/assets/animation/effect_bingliangcunduan.*',async route=>{await new Promise(r=>setTimeout(r,300));await route.continue();});
  await page.evaluate(()=>{
   lib.config.qhly_skinset.skin.sunquan='probe.jpg';decadeUI.dynamicSkin.sunquan={probe:{name:'../animation/effect_bingliangcunduan',x:[0,.5],y:[0,.5],scale:1}};
   game.me.init('sunquan');window.pendingBaseline=decadeUI.bodySensor.events.length;plugin.click.playerIntro.call(plugin,null,game.me);window.pendingPreview=document.querySelector('.yjcm-character-preview').dynamic;
   plugin.playerDialog.hide();plugin.playerDialog.remove();
  });
  await page.waitForTimeout(800);
  report.pending=await page.evaluate(()=>({destroyed:pendingPreview.destroyed,connected:pendingPreview.canvas.isConnected,assets:Object.keys(pendingPreview.renderer.spine.assetManager.assets).length,nodes:pendingPreview.renderer.nodes.length,active:pendingPreview.activePlays.size,listeners:decadeUI.bodySensor.events.length,before:pendingBaseline}));
  assert.equal(report.pending.destroyed,true);assert.equal(report.pending.connected,false);assert.equal(report.pending.assets,0);assert.equal(report.pending.nodes,0);assert.equal(report.pending.active,0);assert.equal(report.pending.listeners,report.pending.before);

  report.skinSettings=await page.evaluate(()=>{
   const cases=[];const saved=decadeUI.dynamicSkin.sunquan;
   const read=label=>{plugin.click.playerIntro.call(plugin,null,game.me);const p=document.querySelector('.yjcm-character-preview');cases.push({label,dynamic:!!p.dynamic,skin:p.dynamic?.primary?.name});plugin.playerDialog.hide();plugin.playerDialog.remove();};
   const file='../animation/effect_bingliangcunduan';
   decadeUI.dynamicSkin.sunquan={unrelated:{name:file},chosen:{name:file},'经典形象':{name:file}};
   delete lib.config.qhly_skinset.skin.sunquan;delete decadeUI.dynamicSkin.sunquan['经典形象'];read('original without matching dynamic');
   lib.config.qhly_skinset.skin.sunquan='missing.jpg';read('selected static without matching dynamic');
   lib.config.qhly_skinset.skin.sunquan='chosen.jpg';lib.config.qhly_skinset.djtoggle.sunquan={chosen:true};read('djtoggle name disables');
   lib.config.qhly_skinset.djtoggle.sunquan={'chosen.jpg':true};read('djtoggle filename disables');
   lib.config.qhly_skinset.djtoggle.sunquan={};read('selected matching dynamic');
   decadeUI.config.dynamicSkin=false;read('global dynamic disabled');decadeUI.config.dynamicSkin=true;
   delete lib.config.qhly_skinset.skin.sunquan;decadeUI.dynamicSkin.sunquan['经典形象']={name:file};read('original with explicit classic dynamic');
   decadeUI.dynamicSkin.sunquan=saved;return cases;
  });
  assert.deepEqual(report.skinSettings.map(c=>c.dynamic),[false,false,false,false,true,false,true]);
  assert.equal(await page.locator('.yjcm-character-preview').count(),0);
  report.cases.push('native player preview, judgment tooltip, close/reopen');
  assert.deepEqual(report.errors,[]);
 } finally {
  fs.writeFileSync(path.join(__dirname,'info-popup-lifecycle-results.json'),JSON.stringify(report,null,2));
  await browser.close(); await new Promise(r=>server.close(r));
 }
 console.log('INFO_POPUP_LIFECYCLE_OK');
})().catch(e=>{console.error(e);process.exitCode=1});
