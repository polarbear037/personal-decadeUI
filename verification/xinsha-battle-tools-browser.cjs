const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const results={geometry:[],errors:[],requests:[]};
 try{
  Object.assign(seed,{mode:'identity',characters:['standard','xianding'],cards:['standard','extra'],extension_十周年UI_newDecadeStyle:'othersOff',extension_十周年UI_loadingStyle:'othersOff',extension_十周年UI_cardPrettify:'online',background_audio:true});
  const page=await browser.newPage({viewport:{width:1638,height:919}});
  page.on('pageerror',e=>results.errors.push(e.message));page.on('dialog',d=>d.accept());
  page.on('request',r=>{if(/xinsha-battle|extension\/(?:%E9%9B%B7%E9%9C%86|雷霆)\//i.test(r.url()))results.requests.push(decodeURIComponent(r.url()));});
  await dependencies(page);
  for(const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])
   if(/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8')))await page.unroute('**/node_modules/.pnpm/'+file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
  results.start=await page.evaluate(async()=>{
   const {lib,game,ui,get,_status}=await import('/noname.js');Object.assign(window,{lib,game,ui,get,_status});
   game.pause();game.resume=()=>{};game.me=game.players[0];game.me.init('dc_liuye');game.players[1].init('puyuan');
   for(const d of [...ui.dialogs])d.close();ui.arena.classList.remove('choose-character');document.querySelector('.decade-welcome-overlay')?.remove();
   _status.over=false;_status.gameStarted=true;game.roundNumber=1;
   const mod=await import('/extension/十周年UI/src/ui/xinsha-battle-tools.js');window.battleModule=mod;
   const registered=!!lib.skill.decadeUI_xinshaBattleTools;
   window.manager=mod.installXinshaBattleTools({lib,game,ui,get,status:_status});await manager.refresh(true);
   window.tools=__decadeUIXinshaBattleTools;
   return{registered,old:!!window.__tlFamousBattleTools,count:document.querySelectorAll('.xinsha-battle-tools').length,roster:tools.roster.map(x=>({names:x.names,cards:x.cards})),helper:typeof decadeUI.create.playerAvatar};
  });
  assert.equal(results.start.registered,true,'从实际 initHooks 自动安装');assert.equal(results.start.old,false);assert.equal(results.start.count,1);assert.equal(results.start.helper,'function');
  assert.ok(results.start.roster.some(r=>r.cards.includes('pilitoushiche')));
  for(const size of [[1638,919],[2052,919],[1280,720]])for(const zoom of [1,1.221153846153846,1.5288461538461537])for(const wrapped of [false,true]){
   await page.setViewportSize({width:size[0],height:size[1]});
   const row=await page.evaluate(async({zoom,wrapped})=>{
    game.documentZoom=zoom;window.documentZoom=zoom;document.body.style.zoom=zoom;
    const saved=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'getBoundingClientRect');
    if(wrapped)Object.defineProperty(HTMLElement.prototype,'getBoundingClientRect',{configurable:true,value:function(){const r=Element.prototype.getBoundingClientRect.call(this);return new DOMRect(r.x/zoom,r.y/zoom,r.width/zoom,r.height/zoom)}});
    try{
     await new Promise(r=>setTimeout(r,80));tools.openCards(game.me);await new Promise(requestAnimationFrame);
     const rect=n=>Element.prototype.getBoundingClientRect.call(n),b=rect(tools.cardButton),p=rect(tools.panel),list=rect(tools.panel.querySelector('.xinsha-battle-special-list')),scale=p.width/715;
     return{zoom,wrapped,width:innerWidth,dx:p.right-b.left,dy:p.top-b.top,panel:p.toJSON(),listX:(list.left-p.left)/scale,listY:(list.top-p.top)/scale,listW:list.width/scale,scale,cardCount:tools.panel.querySelectorAll('.card').length,avatarBackground:getComputedStyle(tools.panel.querySelector('.xinsha-player-avatar')).backgroundImage};
    }finally{if(wrapped){if(saved)Object.defineProperty(HTMLElement.prototype,'getBoundingClientRect',saved);else delete HTMLElement.prototype.getBoundingClientRect;}}
   },{zoom,wrapped});
   results.geometry.push(row);assert.ok(Math.abs(row.dx)<.08&&Math.abs(row.dy)<.08,JSON.stringify(row));assert.ok(Math.abs(row.listX-119)<.08&&Math.abs(row.listY-23)<.08);assert.ok(Math.abs(row.listW-564)<.08);assert.ok(row.cardCount>0);
  }
  await page.setViewportSize({width:1638,height:919});
  await page.evaluate(async()=>{game.documentZoom=window.documentZoom=1.221153846153846;document.body.style.zoom=game.documentZoom;await new Promise(r=>setTimeout(r,100));tools.openCards(game.me);await document.fonts.ready;});
  results.cardImage=await page.evaluate(async()=>{const card=tools.panel.querySelector('.card');for(let i=0;i<30&&!card.style.backgroundImage;i++)await new Promise(r=>setTimeout(r,20));const src=getComputedStyle(card).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(!src)return{src:null};const image=new Image();image.src=src;await image.decode();return{src,width:image.naturalWidth,height:image.naturalHeight};});
  assert.ok(results.cardImage.width>0,'原生卡牌皮肤实际解码');
  await page.screenshot({path:path.join(__dirname,'xinsha-battle-tools-browser.png')});
  results.interaction=await page.evaluate(async()=>{
   tools.openCards(game.players[1]);const many=tools.panel.querySelectorAll('.card').length,scroll=tools.panel.querySelector('.xinsha-battle-special-list');scroll.scrollTop=10000;
   const scrolled=scroll.scrollTop>0;
   const current=_status.event,cards=game.me.getCards('h').slice(),selected=ui.selected.targets.slice();
   tools.signalButton.click();const targets=tools.targets.length,panelClosed=!tools.panel;
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const cancelled=!tools.selected&&!tools.targets.length;
   const receive=tools.receiveSignal;let calls=0,playerClicks=0;tools.receiveSignal=()=>calls++;
   const target=game.players[1],native=()=>playerClicks++;target.addEventListener('click',native);
   tools.signalButton.click();tools.targets.find(t=>t._xinshaTarget===target).click();
   target.removeEventListener('click',native);tools.receiveSignal=receive;
   game.roundNumber=2;tools.refresh();const hidden=tools.cardButton.hidden&&!tools.panel;game.roundNumber=1;tools.refresh();
   return{many,scrolled,targets,panelClosed,cancelled,calls,playerClicks,hidden,eventUnchanged:current===_status.event,cardsUnchanged:cards.length===game.me.getCards('h').length&&cards.every((c,i)=>c===game.me.getCards('h')[i]),targetsUnchanged:selected.length===ui.selected.targets.length};
  });
  assert.ok(results.interaction.many>=5&&results.interaction.scrolled);assert.ok(results.interaction.targets>=1);for(const key of ['panelClosed','cancelled','hidden','eventUnchanged','cardsUnchanged','targetsUnchanged'])assert.equal(results.interaction[key],true,key);assert.equal(results.interaction.calls,1);assert.equal(results.interaction.playerClicks,0);
  results.effect=await page.evaluate(async()=>{
   const canvasCount=document.querySelectorAll('canvas').length,animation=decadeUI.animation,target=game.players[1];
   game.me.side=false;target.side=true;
   await tools.receiveSignal(target,game.me);const enemyIgnored=tools.effects.size===0;
   await tools.receiveSignal(game.me,target);
   const effect=[...tools.effects][0],sprite=effect?.sprite;
   await new Promise(r=>setTimeout(r,180));
   const state={canvasCount,afterCanvasCount:document.querySelectorAll('canvas').length,enemyIgnored,loaded:animation.hasSpine('xinsha-battle/sgs_paiju_zhanshuxinhao'),active:tools.effects.size,name:sprite?.name,time:sprite?.skeleton.state.getCurrent(0)?.trackTime,scale:sprite?.renderScale,referWidth:sprite?.referBounds?.width,action:sprite?.skeleton.state.getCurrent(0)?.animation.name,audio:[...document.querySelectorAll('audio')].filter(a=>a.src.includes('xinsha-battle/gongji')).map(a=>({src:a.src,ready:a.readyState,duration:a.duration,paused:a.paused}))};
   let pixels=0;const gl=animation.gl;const rgba=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
   // 在真实渲染帧尾读取当前缓冲，验证实际绘制而非只检查加载标记。
   await new Promise(resolve=>requestAnimationFrame(()=>{animation.render(performance.now());gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,rgba);for(let i=3;i<rgba.length;i+=4)if(rgba[i])pixels++;resolve();}));state.pixels=pixels;
   tools.destroy();state.cleaned=tools.effects.size===0&&(!sprite||sprite.completed)&&!document.querySelector('.xinsha-battle-tools');state.canvasPreserved=animation.canvas.isConnected&&document.querySelectorAll('canvas').length===canvasCount;
   return state;
  });
  assert.equal(results.effect.canvasCount,results.effect.afterCanvasCount);assert.equal(results.effect.enemyIgnored,true);assert.equal(results.effect.loaded,true);assert.equal(results.effect.action,'play');assert.ok(results.effect.time>0);assert.ok(results.effect.pixels>0);assert.ok(results.effect.audio.some(a=>a.ready>=2&&a.duration>0&&!a.paused),'原生音效实际解码并播放');assert.equal(results.effect.cleaned,true);assert.equal(results.effect.canvasPreserved,true);
  results.lifecycle=await page.evaluate(async()=>{
   const out=[];
   for(const style of ['onlineUI','on','othersOff']){lib.config.extension_十周年UI_newDecadeStyle=style;document.body.dataset.style=style;await manager.refresh(true);await new Promise(r=>setTimeout(r,30));out.push({style,count:document.querySelectorAll('.xinsha-battle-tools').length});}
   // 等待中的骨骼加载在销毁后不得播放或发声。
   let ready,played=0,audio=0;const delayed={gl:{},hasSpine:()=>false,loadSpine:(n,t,done)=>ready=done,playSpine:()=>played++,stopSpine:()=>{}};
   const late=new battleModule.XinshaBattleTools({lib,game:{...game,playAudio:()=>audio++},ui,get,status:_status,animation:()=>delayed}).mount();
   const loading=late.receiveSignal(game.me,game.players[1]);late.destroy();ready();await loading;
   const hidden=battleModule.collectSpecialCardSeats([{name:'dc_liuye',isUnseen:()=>true,getSkills:()=>[]}],lib,get).length;
   lib.onover.forEach(fn=>fn());const overCount=document.querySelectorAll('.xinsha-battle-tools').length;
   manager.dispose();return{out,played,audio,hidden,overCount,skillRemoved:!lib.skill.decadeUI_xinshaBattleTools};
  });
  assert.deepEqual(results.lifecycle.out.map(r=>r.count),[0,0,1]);assert.equal(results.lifecycle.played,0);assert.equal(results.lifecycle.audio,0);assert.equal(results.lifecycle.hidden,0);assert.equal(results.lifecycle.overCount,0);assert.equal(results.lifecycle.skillRemoved,true);
  assert.equal(results.requests.some(u=>u.includes('/extension/雷霆/')),false,'独立运行不能请求雷霆资源');assert.deepEqual(results.errors,[]);
  console.log('XINSHA_BATTLE_TOOLS_ENGINE_OK',results.geometry.length,'geometry cases; native Spine, lifecycle and standalone verified');
 }finally{fs.writeFileSync(path.join(__dirname,'xinsha-battle-tools-results.json'),JSON.stringify(results,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
