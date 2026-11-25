// 实际 Card、风格路由、手牌布局与点击入口；独立浏览器夹具，不推进真实牌局。
const fs = require('node:fs');
const path = require('node:path');
const {bootstrap, server, chromium, assert, script} = require('../../雷的ol/verification/card-beautify-browser.cjs');
const base = '/extension/十周年UI/';
(async () => {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const results=[];
 try {
  for(const style of ['othersOff','onlineUI','on','off','babysha','codename']) {
   const page=await browser.newPage({viewport:{width:1368,height:768}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await bootstrap(page,origin,true);
   const files=await page.evaluate(async ({base,style})=>{
    for(const link of document.querySelectorAll('link[href*="/extension/"]'))link.remove();
    document.body.dataset.style=style;lib.config.extension_十周年UI_newDecadeStyle=style;
    const {getStyleFile}=await import(base+'src/styles/style-route.js');
    return ['extension','decadeLayout','card','layout'].map(n=>base+'src/styles/'+getStyleFile(n,style));
   },{base,style});
   for(const url of files)await page.addStyleTag({url:origin+url});
   await page.addStyleTag({url:origin+'/extension/雷的一将/css/card-beautify.css'});
   await page.addStyleTag({content:'#samples,#preview{display:none}#arena{position:absolute;inset:0}#name-hand{position:absolute;left:30px;top:270px;width:1250px;height:220px}.hand-cards{position:relative;width:100%;height:100%}.handcards{position:relative;height:100%}.handcards>.card{left:0;top:0;width:108px;height:150px;margin:0;animation:none;transition:transform .266666667s}.handcards>.card>.background{display:none}'});
   await page.addScriptTag({content:script('extension/十周年UI/src/ui/cardAlternateName-xinsha.js','window.updateXinshaCardName=updateXinshaCardName;window.clearXinshaCardName=clearXinshaCardName;')});
   await page.addScriptTag({content:script('extension/十周年UI/src/ui/cardAlternateName.js','window.initCardAlternateNameVisible=initCardAlternateNameVisible;')});
   await page.addScriptTag({content:script('extension/十周年UI/src/ui/handcard-motion-xinsha.js','Object.assign(window,{withXinshaHandLayout,updateXinshaHandMotion,finishXinshaHandMotion,clearXinshaHandMotion,restoreXinshaHandMotionCopy});')});
   await page.addScriptTag({content:script('extension/十周年UI/src/utils/hand-card-position.js','window.preserveConfirmedHandCard=preserveConfirmedHandCard;')});
   await page.addScriptTag({content:script('extension/十周年UI/src/core/layout.js','window.nameLayout=e();')});
   await page.addScriptTag({content:script('extension/十周年UI/src/overrides/card/overrides.js','window.nameTransform=p;')});
   await page.addScriptTag({content:script('extension/十周年UI/src/overrides/ui/click.js','window.nameCardClick=t;')});
   await page.addScriptTag({content:script('extension/十周年UI/src/config/handlers/card-handlers.js','window.toggleNames=U;')});
   await page.evaluate(({style})=>{
    lib.config.extension_十周年UI_cardAlternateName=true;
    lib.config.fold_card=false;lib.config.spread_card=false;lib.config.touchscreen=false;
    game.saveConfig=(key,value)=>lib.config[key]=value;
    ui.selected={cards:[]};ui.window=ui.arena;
    Array.prototype.remove=function(item){const i=this.indexOf(item);if(i>=0)this.splice(i,1);return this;};
    Object.assign(lib.translate,{sha:'杀',shan:'闪',tao:'桃',jiu:'酒',wuzhong:'无中生有',guohe:'过河拆桥',bagua:'八卦阵',lebu:'乐不思蜀',fire:'火',thunder:'雷',custom:'扩展自定义牌名'});
    ui.me=document.createElement('div');ui.me.id='name-hand';ui.arena.append(ui.me);
    ui.handcards1Container=document.createElement('div');ui.handcards1Container.className='hand-cards';ui.me.append(ui.handcards1Container);
    ui.handcards1=document.createElement('div');ui.handcards1.className='handcards';ui.handcards1Container.append(ui.handcards1);
    ui.handcards2=document.createElement('div');ui.handcards2.className='handcards';ui.handcards2.style.display='none';ui.me.append(ui.handcards2);
    game.me={node:{handcards1:ui.handcards1,handcards2:ui.handcards2}};
    window.decadeUI={config:{newDecadeStyle:style},layout:nameLayout,boundsCaches:{hand:{width:1200,cardWidth:108,cardHeight:150,cardScale:1,x:0,check(){}}}};
    decadeUI.layout.invalidateHand=()=>nameLayout.updateHand();
    get.info=()=>undefined;game.check=()=>{nameLayout.updateHand();return false;};
    _status.event={isMine:()=>true,custom:{replace:{},add:{}},player:game.me};
    ui.click.card=function(e){_status.clicked=false;nameCardClick.call(this,e);};
    window.buildNames=(count,companion=true)=>{
     ui.handcards1.replaceChildren();ui.handcards2.replaceChildren();ui.selected.cards=[];
     const names=['sha','shan','tao','jiu','wuzhong','guohe','bagua','lebu','sha','sha','custom'];
     for(let i=0;i<count;i++){
      const card=createDecadeCard(ui.handcards1,undefined,true);card.init(['spade',i%13+1,names[i%names.length],i%names.length===8?'fire':i%names.length===9?'thunder':undefined]);card.updateTransform=nameTransform;card.classList.add('selectable');
      if(companion){card.classList.add('lei-yijiang-card','lei-yijiang-card-ready');const face=document.createElement('div');face.className='lei-yijiang-card-face';face.style.background=`url("/extension/雷的一将/image/cards/card_${[1,2,3,33,7,5,16,15,42,43,1][i%11]}.png") center/100% 100%`;card.append(face);}
     }
     nameLayout.updateHand();
    };
    window.nameState=()=>({visible:ui.handcards1.dataset.cardAlternateNameVisible,tags:ui.handcards1.querySelectorAll('.dui-xinsha-card-name').length,marker:ui.handcards1.dataset.cardAlternateNameStyle||null});
    initCardAlternateNameVisible();
   },{style});
   const row={style,files,thresholds:[]};
   for(const count of [0,7,14,15,30,80]){
    await page.evaluate(n=>buildNames(n),count);
    const state=await page.evaluate(()=>nameState());
    assert.equal(state.visible,count>=15?'on':'off');
    assert.equal(state.tags,style==='othersOff'&&count>=15?count:0);
    row.thresholds.push({count,...state});
   }
   await page.evaluate(()=>buildNames(15));
   if(style==='othersOff') {
    await page.evaluate(()=>document.fonts.ready);
    const normal=await page.evaluate(()=>{const t=ui.handcards1.firstChild.querySelector('.dui-xinsha-card-name');const s=getComputedStyle(t);const text=getComputedStyle(t.firstChild);return {display:s.display,color:s.color,bg:s.borderImageSource,bottom:parseFloat(s.bottom),height:parseFloat(s.height),font:parseFloat(text.fontSize),nameHidden:getComputedStyle(ui.handcards1.firstChild.node.name).visibility,texts:[...ui.handcards1.querySelectorAll('.dui-xinsha-card-name')].map(n=>n.textContent)};});
    assert.equal(normal.display,'block');assert.equal(normal.color,'rgb(193, 174, 142)');assert.ok(normal.bg.includes('game_ui_cards_tag_normal.png'));assert.ok(Math.abs(normal.height-30*150/174)<.02);assert.ok(Math.abs(normal.bottom-5*150/174)<.02);assert.ok(Math.abs(normal.font-22*108/126)<.02);assert.equal(normal.nameHidden,'hidden');
    assert.deepEqual(normal.texts.slice(4,11),['无中','过河','八卦','乐','火杀','雷杀','扩展自定义牌名']);
    await page.evaluate(()=>ui.handcards1.children[5].click());
    const selected=await page.evaluate(()=>{const c=ui.handcards1.children[5],s=getComputedStyle(c.querySelector('.dui-xinsha-card-name'));return {selected:c.classList.contains('selected'),color:s.color,bg:s.borderImageSource};});
    assert.equal(selected.selected,true);assert.equal(selected.color,'rgb(255, 233, 129)');assert.ok(selected.bg.includes('game_ui_cards_tag_select.png'));
    await page.waitForTimeout(350);
    await page.screenshot({path:path.join(__dirname,'yjcm-card-name-browser.png')});
    await page.evaluate(()=>ui.handcards1.children[5].click());
    assert.equal(await page.evaluate(()=>getComputedStyle(ui.handcards1.children[5].querySelector('.dui-xinsha-card-name')).color),'rgb(193, 174, 142)');
    const stable=await page.evaluate(async()=>{let writes=0;const observer=new MutationObserver(rows=>writes+=rows.length);observer.observe(ui.handcards1,{subtree:true,attributes:true,characterData:true,childList:true});for(let i=0;i<60;i++)decadeUI.cardAlternateName.updateVisibility();await Promise.resolve();observer.disconnect();return writes;});assert.equal(stable,0);
    for(const zoom of [1,1.5])for(const scale of [.7,1.4]){
     const geometry=await page.evaluate(({zoom,scale})=>{document.body.style.zoom=zoom;decadeUI.boundsCaches.hand.cardScale=scale;nameLayout.updateHand();for(const card of ui.handcards1.children)for(const a of card.getAnimations())if(a.transitionProperty==='transform')a.finish();const card=ui.handcards1.firstChild,t=card.querySelector('.dui-xinsha-card-name');const c=card.getBoundingClientRect(),r=t.getBoundingClientRect();return {heightRatio:r.height/c.height,bottomRatio:(c.bottom-r.bottom)/c.height};},{zoom,scale});
     assert.ok(Math.abs(geometry.heightRatio-30/150*150/174)<.001);assert.ok(Math.abs(geometry.bottomRatio-5/174)<.001);
    }
    await page.evaluate(()=>{document.body.style.zoom='1';decadeUI.boundsCaches.hand.cardScale=1;nameLayout.updateHand();});
    const copy=await page.evaluate(()=>{const clone=ui.handcards1.children[0].copy();ui.arena.append(clone);const result=getComputedStyle(clone.querySelector('.dui-xinsha-card-name')).display;clone.remove();return result;});assert.equal(copy,'none');
    await page.evaluate(()=>{ui.handcards1.children[0].classList.add('infohidden');});assert.equal(await page.evaluate(()=>getComputedStyle(ui.handcards1.firstChild.querySelector('.dui-xinsha-card-name')).display),'none');
    await page.evaluate(()=>{ui.handcards1.firstChild.classList.remove('infohidden');ui.handcards1.lastChild.remove();});await page.waitForTimeout(20);assert.deepEqual(await page.evaluate(()=>nameState()),{visible:'off',tags:0,marker:'xinsha'});
    await page.evaluate(()=>{buildNames(15);toggleNames(false);});assert.equal((await page.evaluate(()=>nameState())).tags,0);assert.equal((await page.evaluate(()=>nameState())).visible,'off');
    await page.evaluate(()=>toggleNames(true));assert.equal((await page.evaluate(()=>nameState())).tags,15);
    await page.evaluate(()=>{ui.handcards1.firstChild.classList.add('removing');nameLayout.updateHand();});assert.equal((await page.evaluate(()=>nameState())).tags,0);
    await page.evaluate(()=>{buildNames(15);for(let i=0;i<5;i++)ui.handcards2.append(ui.handcards1.lastChild);});await page.waitForTimeout(20);assert.equal((await page.evaluate(()=>nameState())).tags,0);assert.equal((await page.evaluate(()=>nameState())).visible,'off');
    // 观察者随视角重绑，旧手牌不再保留标签或触发更新。
    const rebind=await page.evaluate(()=>{buildNames(15);const old=ui.handcards1;const next=document.createElement('div');next.className='handcards';ui.handcards1Container.append(next);game.me={node:{handcards1:next}};ui.handcards1=next;nameLayout.updateHand();return {oldTags:old.querySelectorAll('.dui-xinsha-card-name').length,oldMarker:old.dataset.cardAlternateNameStyle||null,newVisible:next.dataset.cardAlternateNameVisible};});assert.deepEqual(rebind,{oldTags:0,oldMarker:null,newVisible:'off'});
    row.normal=normal;row.selected=selected;row.stableWrites=stable;row.copyOutside=copy;row.rebind=rebind;
   } else {
    const fallback=await page.evaluate(()=>{const c=ui.handcards1.firstChild;return {display:getComputedStyle(c.node.name).display,background:getComputedStyle(c.node.name).backgroundColor};});assert.equal(fallback.display,'block');
    row.fallback=fallback;
   }
   assert.deepEqual(errors,[]);results.push(row);await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'yjcm-card-name-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify({passed:results.length,styles:results.map(r=>r.style),checks:'0/7/14/15/30/80; native click; official colors/geometry/font; companion face; copy privacy; disable/enable; removing; split zones; rebind; 60 stable updates; fallback isolation'}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
