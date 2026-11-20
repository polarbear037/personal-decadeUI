// 复现旧CSS覆盖官方宽度；生产场景定位、真实Card、BoundsCache与updateHand共同验收。
const fs = require('node:fs');
const path = require('node:path');
const {bootstrap, server, chromium, assert, script, read} = require('../../雷的ol/verification/card-beautify-browser.cjs');
const base = 'extension/十周年UI/';
const cssPath = base + 'src/styles/layout-xinsha.css';
const css = read(cssPath);
const oldCss = css.replace('body[data-style="othersOff"] #window #arena > :is(.hand-wrap,.hand-back)', 'body[data-style="othersOff"] #arena > :is(.hand-wrap,.hand-back)');
const near = (a,b,label) => assert.ok(Math.abs(a-b)<.8, `${label}: ${a} != ${b}`);
const result = {regression:null, layouts:[], hands:[], isolation:[], errors:[]};
(async () => {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:1333,height:597}});
  page.on('pageerror', error=>result.errors.push(error.message));
  await bootstrap(page,origin,true);
  await page.addStyleTag({url:origin+'/'+base+'ui/styles/lbtn/xinsha-official.css'});
  await page.addStyleTag({content:'html,body{margin:0;width:100%;height:100%}#window{position:absolute;inset:0}#arena{position:absolute;left:22px;right:25px;top:12px;bottom:6px}#arena>div,.hand-cards,.handcards{position:absolute}#samples,#preview{display:none}.card{animation:none}.hand-cards>.handcards>.card{left:0;top:0;border:1px solid #a68}.skill-control .trigger{position:static}.skill-control .enable{position:static}'});
  const override = await page.addStyleTag({content:oldCss});
  await page.addScriptTag({content:script(base+'src/core/layout.js','window.handLayout=e();')});
  if(fs.existsSync(path.join(__dirname,'../.codex-tmp/yjcm-hand-width/layout-before.js')))await page.addScriptTag({content:script(base+'.codex-tmp/yjcm-hand-width/layout-before.js','window.beforeHandLayout=e();')});
  await page.addScriptTag({content:script(base+'src/utils/bounds.js','window.handBounds=e;')});
  await page.addScriptTag({content:script(base+'src/overrides/card/overrides.js','window.handTransform=p;')});
  await page.addScriptTag({content:'window.createBaseLbtnPlugin=()=>({});window.createXinshaBackgroundSelector=()=>({});'});
  await page.addScriptTag({content:script(base+'ui/lbtn/skins/xinsha.js','window.handPlugin=createXinshaLbtnPlugin(lib,game,ui,get,{},_status,{});')});
  await page.evaluate(()=>{
   const root=document.createElement('div');root.id='window';document.body.append(root);root.append(ui.arena);ui.window=root;
   ui.me=document.createElement('div');ui.me.className='hand-wrap';ui.arena.append(ui.me);
   ui.handcards1Container=document.createElement('div');ui.handcards1Container.className='hand-cards';ui.me.append(ui.handcards1Container);
   ui.handcards1=document.createElement('div');ui.handcards1.className='handcards';ui.handcards1Container.append(ui.handcards1);
   ui.arena.insertAdjacentHTML('beforeend','<div class="skill-control"><div class="trigger"></div><div class="enable"></div></div>');
   const active=ui.arena.querySelector('.enable'),passive=ui.arena.querySelector('.trigger');
   for(let i=0;i<4;i++){const button=document.createElement('div');button.className='skillitem usable';button.dataset.id='active'+i;button.textContent=['强袭','武圣','制衡','龙胆'][i];button.style.setProperty('--yjcm-skill-x',i%2*116);button.style.setProperty('--yjcm-skill-y',39+Math.floor(i/2)*50);active.append(button);}
   for(let i=0;i<3;i++){const button=document.createElement('div');button.className='skillitem';button.dataset.id='passive'+i;button.dataset.yjcmPassive='true';button.textContent=['敬天','勤政','励军'][i];button.style.setProperty('--yjcm-skill-x',i*79);button.style.setProperty('--yjcm-skill-y',0);passive.append(button);}
   game.me={};ui.selected={cards:[]};Object.assign(lib.config,{extension_十周年UI_newDecadeStyle:'othersOff',extension_十周年UI_rightLayout:'on',spread_card:true,fold_card:false,extension_十周年UI_handFoldMin:9});
   document.body.dataset.style='othersOff';Object.assign(ui.arena.dataset,{rightLayout:'on',aloneEquip:'off',phonelayout:'on'});
   window.handScale=.95;
   window.decadeUI={config:{newDecadeStyle:'othersOff'},getCardBestScale:()=>handScale,queueNextFrameTick:fn=>requestAnimationFrame(fn),layoutHand:()=>handLayout.updateHand()};
   decadeUI.boundsCaches=handBounds(decadeUI);handPlugin.initOfficialLayout();
   window.buildWidthHand=(count,fold=false,selected=-1)=>{
    ui.selected.cards=[];ui._handcardHover=null;ui.handcards1.innerHTML='';lib.config.fold_card=fold;
    for(let i=0;i<count;i++){const card=ui.create.card(ui.handcards1);card.init(['spade',i%13+1,'sha']);card.updateTransform=handTransform;if(i===selected){card.classList.add('selected');ui.selected.cards.push(card);}}
    decadeUI.boundsCaches.hand.updated=false;handLayout.updateHand();
   };
   window.measureWidthHand=()=>{
    const box=n=>n.getBoundingClientRect().toJSON();
    return {unit:parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-unit')),sceneX:parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-scene-x')),window:box(ui.window),hand:box(ui.me),cards:[...ui.handcards1.children].map(c=>({tx:c.tx,box:box(c)})),skills:[...ui.arena.querySelectorAll('.skill-control .skillitem')].map(box),scroll:ui.handcards1Container.classList.contains('scrollh'),scrollWidth:ui.handcards1Container.scrollWidth,clientWidth:ui.handcards1Container.clientWidth};
   };
   buildWidthHand(20);
  });
  await page.waitForTimeout(100);
  const before = await page.evaluate(()=>measureWidthHand());
  await override.evaluate((node,content)=>{node.textContent=content;},css);
  await page.evaluate(()=>{decadeUI.boundsCaches.hand.updated=false;handLayout.updateHand();});
  await page.waitForTimeout(100);
  const after = await page.evaluate(()=>measureWidthHand());
  assert(before.hand.width-after.hand.width>100,'old equipment-off rule must reproduce wider hand');
  result.regression={before:before.hand,after:after.hand};
  for(const size of [{width:1333,height:597},{width:1280,height:720},{width:1920,height:750}]){
   await page.setViewportSize(size);
   for(const zoom of [1,1.25])for(const side of ['on','off'])for(const alone of ['on','off'])for(const phone of ['on','off']){
    await page.evaluate(({zoom,side,alone,phone})=>{
     document.body.style.zoom=zoom;lib.config.extension_十周年UI_rightLayout=side;ui.window.dataset.yjcmSide=side==='on'?'right':'left';Object.assign(ui.arena.dataset,{rightLayout:side,aloneEquip:alone,phonelayout:phone});
     window.dispatchEvent(new Event('resize'));
    },{zoom,side,alone,phone});
    await page.waitForTimeout(35);
    const row=await page.evaluate(()=>measureWidthHand());
    // 所有测量转回窗口的CSS坐标；与display固定设计宽度及两侧保留量独立比较。
    const actualZoom=await page.evaluate(()=>ui.window.getBoundingClientRect().height/ui.window.clientHeight);
    const windowWidth=row.window.width/actualZoom, u=row.unit;
    const expectedInset=(side==='on'?40:560)*u+row.sceneX;
    near((row.hand.left-row.window.left)/actualZoom,expectedInset,'official origin across layout flags');
    near(row.hand.width/actualZoom,windowWidth-2*row.sceneX-600*u,'official total width');
    result.layouts.push({size,zoom,side,alone,phone,width:row.hand.width/actualZoom});
   }
  }
  await page.setViewportSize({width:1333,height:597});
  await page.evaluate(()=>{document.body.style.zoom='1';lib.config.extension_十周年UI_rightLayout='on';ui.window.dataset.yjcmSide='right';Object.assign(ui.arena.dataset,{rightLayout:'on',aloneEquip:'off',phonelayout:'on'});});
  await page.waitForTimeout(70);
  for(const scale of [.7,.95,1.35])for(const count of [4,12,20,80,120])for(const fold of [false,true])for(const selected of [-1,count-1]){
   await page.evaluate(({count,fold,selected,scale})=>{handScale=scale;buildWidthHand(count,fold,selected);},{count,fold,selected,scale});
   const row=await page.evaluate(()=>measureWidthHand());
   const skillLeft=Math.min(...row.skills.map(box=>box.left));
   if(!row.scroll)assert(Math.max(...row.cards.map(card=>card.box.right))<skillLeft,'dense or expanded hand must clear skills '+JSON.stringify({scale,count,fold,selected,hand:row.hand,right:Math.max(...row.cards.map(card=>card.box.right)),skillLeft}));
   else{
    await page.evaluate(()=>{ui.handcards1Container.scrollLeft=ui.handcards1Container.scrollWidth;});
    const last=await page.evaluate(()=>measureWidthHand());
    assert(last.cards.at(-1).box.right<=last.hand.right+1&&last.cards.at(-1).box.left>=last.hand.left,'last folded card remains fully visible');
   }
   result.hands.push({scale,count,fold,selected,scroll:row.scroll});
  }
  await page.evaluate(()=>{handScale=.95;buildWidthHand(20,false,19);});
  result.selectionReset=await page.evaluate(()=>{
   const steps=()=>[...ui.handcards1.children].slice(1).map((c,i)=>c.tx-ui.handcards1.children[i].tx);
   const expanded=steps();
   ui.handcards1.lastElementChild.classList.remove('selected');ui.selected.cards=[];ui._handcardHover=null;handLayout.updateHand();
   return {expanded,cleared:steps()};
  });
  assert(Math.max(...result.selectionReset.expanded)-Math.min(...result.selectionReset.expanded)>5,'selected tail locally expands');
  assert(Math.max(...result.selectionReset.cleared)-Math.min(...result.selectionReset.cleared)<=1,'same cards return to uniform spacing after clearing selection and hover');
  await page.evaluate(()=>{ui.handcards1.lastElementChild.classList.add('selected');ui.selected.cards=[ui.handcards1.lastElementChild];handLayout.updateHand();});
  await page.screenshot({path:path.join(__dirname,'yjcm-hand-width-browser.png')});
  for(const style of ['onlineUI','on','off','babysha','codename']){
   const pair=[];
   await page.evaluate(style=>{document.body.dataset.style=style;decadeUI.config.newDecadeStyle=style;},style);
   for(const content of [oldCss,css]){
    await override.evaluate((node,content)=>{node.textContent=content;},content);
    pair.push(await page.evaluate(()=>({hand:measureWidthHand().hand,left:getComputedStyle(ui.me).left,right:getComputedStyle(ui.me).right})));
   }
   assert.deepEqual(pair[0],pair[1],style+' CSS isolation');
   if(await page.evaluate(()=>!!window.beforeHandLayout)){
    const layouts=await page.evaluate(()=>{
     buildWidthHand(20);const read=()=>({positions:[...ui.handcards1.children].map(c=>[c.tx,c.ty,c.style.transform]),width:ui.handcards1.style.width,scroll:ui.handcards1Container.classList.contains('scrollh')});
     beforeHandLayout.updateHand();const before=read();handLayout.updateHand();return {before,after:read()};
    });
    assert.deepEqual(layouts.before,layouts.after,style+' JS isolation');
   }
   result.isolation.push(style);
  }
  assert.deepEqual(result.errors,[]);
  fs.writeFileSync(path.join(__dirname,'yjcm-hand-width-results.json'),JSON.stringify(result,null,2)+'\n');
  console.log('YJCM_HAND_WIDTH_BROWSER_OK',JSON.stringify({layouts:result.layouts.length,hands:result.hands.length,isolation:result.isolation}));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
