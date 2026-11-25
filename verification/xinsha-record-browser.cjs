const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const result = { errors: [], dialogs: [], consoleErrors: [], failed: [], geometry: [] };
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  Object.assign(seed, { hp_style: 'round', mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'], touchscreen: false,
   extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_loadingStyle: 'othersOff', log_highlight: true });
  const page = await browser.newPage({ viewport: { width: 1290, height: 577 }, hasTouch: true });
  page.on('pageerror', e => { result.errors.push(e.message); console.log('PAGE_ERROR',e.stack); }); page.on('dialog', d => {result.dialogs.push(d.message());console.log('DIALOG',d.message());return d.accept();});
  page.on('console',message=>{if(message.type()==='error'&&/ReferenceError|TypeError|SyntaxError|xinsha-record/.test(message.text()))result.consoleErrors.push(message.text());});
  page.on('response', r => { if (r.status() >= 400 && /xinsha-record/.test(r.url())) result.failed.push(`${r.status()} ${r.url()}`); });
  await dependencies(page);
  for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])
   if (/as __require/.test(fs.readFileSync(path.resolve(__dirname, '../../../node_modules/.pnpm', file), 'utf8'))) await page.unroute('**/node_modules/.pnpm/' + file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.locator('#arena>.player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
  await page.locator('.loading-screen').waitFor({ state: 'hidden', timeout: 15000 });
  result.start = await page.evaluate(async () => {
   const { game, ui, lib, get, _status } = await import('/noname.js');
   Object.assign(window, { game, ui, lib, get, _status });
   game.pause(); game.resume = () => {};
   if(!ui.dialogs)throw Error('Boot incomplete: '+JSON.stringify({url:location.href,body:document.body.innerText.slice(0,2000),players:game.players?.length}));
   for (const dialog of [...ui.dialogs]) dialog.close();
   document.querySelector('.decade-welcome-overlay')?.remove(); ui.arena.classList.remove('choose-character');
   _status.gameStarted = true; _status.pausing = false; _status.paused2 = false; _status.over = false; _status.clicked = false;
   game.me = game.players[0]; game.players[0].init('liubei'); game.players[1].init('guanyu');
   game.players[2].init('caocao'); game.players[3].init('liubei');
   ui.pause.show(); lib.config.test_game = false; ui.sidebar.replaceChildren();
   const { installXinshaRecord } = await import('/extension/十周年UI/src/ui/xinsha-record.js');
   window.record = installXinshaRecord({ lib, game, ui, get, status: _status });
   game.log(game.players[0], '使用了', { name: 'sha' }, '，目标是', game.players[1]);
   game.log(game.players[1], '打出了', { name: 'shan' });
   game.log(game.players[2], '使用了', { name: 'wuzhong' });
   game.log(game.players[3], '使用了', { name: 'tao' });
   const old = document.createElement('div'); old.innerHTML = '<span class="bluetext">关羽</span>发动了【武圣】'; ui.sidebar.prepend(old);
   window.originalRows = [...ui.sidebar.children]; window.originalHTML = ui.sidebar.innerHTML;
   window.readRows = () => [...record.panel.querySelectorAll('.xinsha-record-row')].map(n => n.textContent);
   window.beforeEvent = _status.event; window.beforeCards = ui.selected.cards.slice();
   ui.click.pause();
   return { style: document.body.dataset.style, opened: !!record.panel, paused: _status.paused2, originalParent: ui.sidebar.parentElement?.id,
    rows: readRows(), tabs: record.panel?.querySelectorAll('.xinsha-player-tab').length, players: game.players.length + game.dead.length };
  });
  assert.equal(result.start.style, 'othersOff'); assert.equal(result.start.opened, true); assert.equal(result.start.paused, true);
  assert.equal(result.start.tabs, result.start.players + 1); assert.match(result.start.rows[0], /杀/); assert.match(result.start.rows[4], /武圣/);
  await page.evaluate(() => document.fonts.ready);
  for (const viewport of [{ width: 1290, height: 577 }, { width: 1638, height: 919 }, { width: 2052, height: 919 }]) for (const zoom of [1, 1.5]) {
   await page.setViewportSize(viewport);
   const geometry = await page.evaluate(async zoom => {
    document.body.style.zoom = zoom; game.documentZoom = zoom; window.documentZoom = zoom;
    await new Promise(r => setTimeout(r, 80));
    const rect = n => Element.prototype.getBoundingClientRect.call(n), p = record.panel, scene = rect(p.firstElementChild), tabs = rect(p.querySelector('nav')), title = rect(p.querySelector('h2')), list = rect(p.querySelector('.xinsha-record-list'));
    const scale = scene.height / 750;
    return { zoom, viewport: [innerWidth, innerHeight], scale, tabsX: (tabs.left-scene.left)/scale, tabsY:(tabs.top-scene.top)/scale,
     title: [(title.left-scene.left)/scale,(title.top-scene.top)/scale,title.width/scale,title.height/scale], list:[list.width/scale,list.height/scale],
     background: getComputedStyle(p.firstElementChild,'::before').backgroundImage,
     font: getComputedStyle(p.querySelector('.xinsha-record-row')).fontSize, arenaPaused: ui.arena.classList.contains('paused') };
   }, zoom);
   result.geometry.push(geometry); assert.ok(Math.abs(geometry.tabsX-559)<.03); assert.ok(Math.abs(geometry.tabsY-33)<.03);
   assert.deepEqual(geometry.title.map(Math.round), [150,51,278,45]); assert.deepEqual(geometry.list.map(Math.round),[500,574]); assert.equal(geometry.arenaPaused,false);
  }
  await page.setViewportSize({width:1290,height:577}); await page.evaluate(()=>{document.body.style.zoom=1; game.documentZoom=1; window.documentZoom=1;});
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(__dirname,'xinsha-record-browser.png') });
  await page.locator('.xinsha-record-tabs button').nth(1).click();
  result.first = await page.evaluate(()=>({rows:readRows(),open:!!record.panel,selected:record.panel.querySelectorAll('[aria-pressed="true"]').length}));
  assert.equal(result.first.open,true); assert.equal(result.first.selected,1); assert.equal(result.first.rows.length,1); assert.match(result.first.rows[0],/杀/);
  await page.locator('.xinsha-record-tabs button').nth(2).click();
  result.second = await page.evaluate(()=>readRows()); assert.equal(result.second.length,3); assert.ok(result.second.some(s=>s.includes('闪'))); assert.ok(result.second.some(s=>s.includes('武圣')));
  await page.locator('.xinsha-record-tabs button').nth(4).click();
  result.sameName = await page.evaluate(()=>readRows()); assert.equal(result.sameName.length,1); assert.match(result.sameName[0],/桃/);
  await page.locator('.xinsha-record-tabs button').nth(0).click();
  result.live = await page.evaluate(async()=>{
   game.log(game.players[2],'弃置了',{name:'jiu'}); await new Promise(requestAnimationFrame);
   const rows=readRows(); const unchanged=ui.sidebar.innerHTML.startsWith('<div>')&&originalRows.every(n=>ui.sidebar.contains(n));
   for(let i=0;i<35;i++)game.log(game.players[1],`记录${i}`);
   await new Promise(requestAnimationFrame);
   const list=record.panel.querySelector('.xinsha-record-list');list.scrollTop=0;
   return{last:rows.at(-1),unchanged,scrollable:list.scrollHeight>list.clientHeight,atTop:list.scrollTop===0};
  });
  assert.match(result.live.last,/酒/); assert.equal(result.live.unchanged,true); assert.equal(result.live.scrollable,true); assert.equal(result.live.atTop,true);
  await page.keyboard.press('Escape');
  result.close = await page.evaluate(()=>({removed:!record.panel,paused:_status.paused2,event:beforeEvent===_status.event,selection:beforeCards.length===ui.selected.cards.length,original:originalRows.every(n=>ui.sidebar.contains(n))}));
  assert.deepEqual(result.close,{removed:true,paused:false,event:true,selection:true,original:true});
  result.extra=await page.evaluate(async()=>{
   // 真正的原生快捷菜单“记录”节点持有的回调也须接入新面板。
   const entry=ui.shortcut.querySelector('[data-position="4"]'); entry.click();
   const shortcut=!!record.panel;if(!shortcut)throw Error('Shortcut entry failed');record.close();await new Promise(requestAnimationFrame);
   const dead=game.players.pop();game.dead.push(dead);record.open();
   const deadIncluded=[...record.panel.querySelectorAll('button')].some(n=>n._recordPlayer===dead);record.close();await new Promise(requestAnimationFrame);game.dead.pop();game.players.push(dead);
   const player=game.players[2];player.classList.add('unseen','unseen2');record.open();
   const tab=[...record.panel.querySelectorAll('button')].find(n=>n._recordPlayer===player);
   const hidden={title:tab.title,image:getComputedStyle(tab.querySelector('.xinsha-player-avatar')).backgroundImage};
   record.close();await new Promise(requestAnimationFrame);player.classList.remove('unseen','unseen2');
   game.log('关羽使用了杀');record.open();
   [...record.panel.querySelectorAll('button')].find(n=>n._recordPlayer===game.players[1]).click();
   const plainFallback=readRows().some(text=>text==='关羽使用了杀');record.close();await new Promise(requestAnimationFrame);
   const onpause=game.onpause,onresume=game.onresume;let pauses=0,resumes=0;game.onpause=()=>pauses++;game.onresume=()=>resumes++;
   for(let i=0;i<10;i++){record.open();record.open();record.close();record.close();await new Promise(requestAnimationFrame);}
   game.onpause=onpause;game.onresume=onresume;
   return{shortcut,deadIncluded,hidden,plainFallback,pauses,resumes,rootCount:document.querySelectorAll('.xinsha-record-overlay').length};
  });
  assert.equal(result.extra.shortcut,true);assert.equal(result.extra.deadIncluded,true);assert.ok(result.extra.hidden.title.includes('未知武将'));assert.ok(result.extra.hidden.image.startsWith('linear-gradient'));
  assert.equal(result.extra.plainFallback,true);assert.equal(result.extra.pauses,10);assert.equal(result.extra.resumes,10);assert.equal(result.extra.rootCount,0);
  await page.evaluate(()=>{lib.config.touchscreen=true;record.open();});
  await page.locator('.xinsha-record-tabs button').nth(2).tap();
  result.touch=await page.evaluate(()=>({open:!!record.panel,selected:record.panel.querySelector('button[aria-pressed="true"]')._recordPlayer===game.players[1],event:beforeEvent===_status.event}));
  assert.deepEqual(result.touch,{open:true,selected:true,event:true});
  await page.touchscreen.tap(1250,350);
  assert.equal(await page.evaluate(()=>!!record.panel),false);
  await page.evaluate(()=>{lib.config.touchscreen=false;});
  result.cleanup=await page.evaluate(async()=>{
   record.open(); const all=readRows().length;record.panel.remove();await new Promise(requestAnimationFrame);
   const detachedClean=!record.panel&&!_status.paused2;
   record.open();lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.style='onlineUI';await new Promise(requestAnimationFrame);
   const styleClean=!record.panel&&!_status.paused2;
   const original=ui.click.pause;let fallback=0;record.dispose();ui.click.pause=()=>fallback++;
   const {installXinshaRecord}=await import('/extension/十周年UI/src/ui/xinsha-record.js');
   for(const style of ['onlineUI','on']){
    lib.config.extension_十周年UI_newDecadeStyle=style;document.body.dataset.style=style;
    const test=installXinshaRecord({lib,game,ui,get,status:_status});ui.click.pause();test.open();if(test.panel)throw Error('Other style record intercepted');test.dispose();
   }
   ui.click.pause=original;
   return{all,detachedClean,styleClean,fallback,links:document.querySelectorAll('link[href*="xinsha-record.css"]').length};
  });
  assert.equal(result.cleanup.detachedClean,true);assert.equal(result.cleanup.styleClean,true);assert.equal(result.cleanup.fallback,2);assert.equal(result.cleanup.links,0);
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.dialogs,[]);assert.deepEqual(result.consoleErrors,[]);assert.deepEqual(result.failed,[]);
  result.isolation=[];
  for(const style of ['onlineUI','on']){
   Object.assign(seed,{extension_十周年UI_newDecadeStyle:style});
   const other=await browser.newPage({viewport:{width:1500,height:800}});
   other.on('pageerror',e=>result.errors.push(e.message));other.on('dialog',d=>{result.dialogs.push(d.message());return d.accept();});
   const requests=[];other.on('request',r=>{if(/xinsha-record/.test(r.url()))requests.push(r.url());});
   await dependencies(other);
   for(const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])
    if(/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8')))await other.unroute('**/node_modules/.pnpm/'+file);
   await other.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
   await other.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
   await other.locator('.loading-screen').waitFor({state:'hidden',timeout:15000});
   const state=await other.evaluate(async()=>{
    const {game,ui,_status}=await import('/noname.js');game.pause();game.resume=()=>{};
    for(const dialog of [...ui.dialogs])dialog.close();ui.arena.classList.remove('choose-character');
    _status.gameStarted=true;_status.pausing=false;_status.paused2=false;ui.pause.show();ui.click.pause();
    return{style:document.body.dataset.style,custom:document.querySelectorAll('.xinsha-record-overlay').length,native:!!document.querySelector('.pausedbg'),online:!!document.querySelector('.historybg')};
   });
   state.requests=requests;result.isolation.push(state);assert.equal(state.style,style);assert.equal(state.custom,0);assert.equal(state.native,true);assert.equal(state.online,style==='onlineUI');assert.deepEqual(requests,[]);
   await other.close();
  }
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.dialogs,[]);
  result.ok=true;console.log('XINSHA_RECORD_BROWSER_OK',JSON.stringify({geometry:result.geometry.length,filtering:true,cleanup:result.cleanup,isolation:result.isolation,errors:result.errors}));
 } finally { fs.writeFileSync(path.join(__dirname,'xinsha-record-results.json'),JSON.stringify(result,null,2));await browser.close();server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
