// 复现 precontent 早于 decadeUI 创建，以及早期手牌容器被替换的启动顺序。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const results = [];
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const origin = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1368, height: 768 } });
  const errors = [];page.on('pageerror', e => errors.push(e.message));
  await bootstrap(page, origin, true);
  await page.addScriptTag({content:script('extension/十周年UI/src/ui/cardAlternateName-xinsha.js','window.updateXinshaCardName=updateXinshaCardName;window.clearXinshaCardName=clearXinshaCardName;')});
  await page.addScriptTag({content:script('extension/十周年UI/src/ui/cardAlternateName.js','window.initCardAlternateNameVisible=initCardAlternateNameVisible;')});
  await page.addStyleTag({url:origin+'/extension/十周年UI/src/styles/card-xinsha.css'});
  const early = await page.evaluate(() => {
   window.buildZone = count => {
    const zone = document.createElement('div');zone.className='handcards';document.body.append(zone);
    for(let i=0;i<count;i++){const card=document.createElement('div');card.className='card';card.name='sha';zone.append(card)}
    return zone;
   };
   window.originalDecadeUI=window.decadeUI;delete window.decadeUI;
   document.body.dataset.style='othersOff';lib.config.extension_十周年UI_newDecadeStyle='othersOff';lib.config.extension_十周年UI_cardAlternateName=true;
   ui.window=ui.arena;window.earlyZone=buildZone(0);game.me={node:{handcards1:earlyZone}};
   initCardAlternateNameVisible();
   return {waiting:window._cardAlternateNameVisibleTimer!==null,updater:typeof window.decadeUI?.cardAlternateName?.updateVisibility};
  });
  assert.equal(early.waiting,true,'precontent找到早期手牌区时不能在decadeUI创建前停止等待');
  await page.evaluate(() => {
   window.decadeUI={...originalDecadeUI,config:{newDecadeStyle:'othersOff'}};delete decadeUI.cardAlternateName;
   ui.handcards1=buildZone(29);game.me.node.handcards1=ui.handcards1;
  });
  await page.waitForFunction(()=>typeof decadeUI.cardAlternateName?.updateVisibility==='function'&&ui.handcards1.dataset.cardAlternateNameVisible==='on');
  const attached=await page.evaluate(()=>({tags:ui.handcards1.querySelectorAll('.dui-xinsha-card-name').length,timer:window._cardAlternateNameVisibleTimer,oldMarker:earlyZone.dataset.cardAlternateNameVisible||null,display:getComputedStyle(ui.handcards1.querySelector('.dui-xinsha-card-name')).display}));
  assert.deepEqual(attached,{tags:29,timer:null,oldMarker:null,display:'block'});results.push({startupWithEarlyZone:{early,attached}});
  // 完整UI已创建但手牌尚未创建时，接口先可用，继续等待真实手牌区。
  const noHand=await page.evaluate(()=>{game.me={node:{}};initCardAlternateNameVisible();return {waiting:window._cardAlternateNameVisibleTimer!==null,updater:typeof decadeUI.cardAlternateName.updateVisibility}});
  assert.deepEqual(noHand,{waiting:true,updater:'function'});
  await page.evaluate(()=>{ui.handcards1=buildZone(15);game.me.node.handcards1=ui.handcards1});
  await page.waitForFunction(()=>ui.handcards1.querySelectorAll('.dui-xinsha-card-name').length===15&&window._cardAlternateNameVisibleTimer===null);
  results.push({startupWithoutHand:noHand});
  // 视角切换后由现有布局刷新入口重绑；旧手牌观察器必须释放。
  const rebound=await page.evaluate(()=>{const old=ui.handcards1;ui.handcards1=buildZone(29);game.me.node.handcards1=ui.handcards1;decadeUI.cardAlternateName.updateVisibility();return {oldTags:old.querySelectorAll('.dui-xinsha-card-name').length,oldMarker:old.dataset.cardAlternateNameVisible||null,tags:ui.handcards1.querySelectorAll('.dui-xinsha-card-name').length}});
  assert.deepEqual(rebound,{oldTags:0,oldMarker:null,tags:29});results.push({rebound});
  const off=await page.evaluate(()=>{lib.config.extension_十周年UI_cardAlternateName=false;decadeUI.cardAlternateName.updateVisibility();return {visible:ui.handcards1.dataset.cardAlternateNameVisible,tags:ui.handcards1.querySelectorAll('.dui-xinsha-card-name').length}});
  assert.deepEqual(off,{visible:'off',tags:0});results.push({off});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(__dirname,'card-name-startup-results.json'),JSON.stringify({status:'PASS',scope:'真实牌名模块与CSS，受控重现启动顺序；不推进当前牌局。',results,errors},null,2)+'\n');
  console.log(`PASS ${results.length} startup/lifecycle cases; page errors: ${errors.length}`);
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
