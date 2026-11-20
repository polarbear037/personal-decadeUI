// 加载真实手牌排布、木牛美化与左下按钮样式，检查两扩展的布局边界。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const base = 'extension/十周年UI/';
const css = read(base + 'src/styles/layout-xinsha.css');
const result = { regression: null, layouts: [], isolation: [], errors: [] };
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const origin = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 573 } });
  page.on('pageerror', error => result.errors.push(error.message));
  await bootstrap(page, origin, true);
  const sheet = await page.addStyleTag({ content: css });
  await page.addStyleTag({ url: origin + '/' + base + 'ui/styles/lbtn/xinsha-official.css' });
  await page.addStyleTag({ content: 'html,body{margin:0;width:100%;height:100%}#window{position:absolute;inset:0}#samples,#preview{display:none}.hand-cards,.handcards{position:absolute}.hand-cards>.handcards>.card{left:0;top:0;border:1px solid #987}' });
  await page.addScriptTag({ content: script(base + 'src/core/layout.js', 'window.handLayout=e();') });
  await page.addScriptTag({ content: script(base + 'src/utils/bounds.js', 'window.handBounds=e;') });
  await page.addScriptTag({ content: 'window.createBaseLbtnPlugin=()=>({});window.createXinshaBackgroundSelector=()=>({});' });
  await page.addScriptTag({ content: script(base + 'ui/lbtn/skins/xinsha.js', 'window.handPlugin=createXinshaLbtnPlugin(lib,game,ui,get,{},_status,{});') });
  await page.evaluate(() => {
   ui.window = document.createElement('div'); ui.window.id = 'window'; document.body.append(ui.window); ui.window.append(ui.arena);
   ui.me = document.createElement('div'); ui.me.className = 'hand-wrap'; ui.arena.append(ui.me);
   ui.handcards1Container = ui.create.div('.hand-cards', ui.me);
   ui.handcards1 = ui.create.div('.handcards', ui.handcards1Container);
   Object.assign(lib.config, { extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_rightLayout: 'on', spread_card: true, fold_card: false });
   document.body.dataset.style = 'othersOff'; ui.arena.dataset.rightLayout = 'on';
   ui.selected = { cards: [] }; window.handScale = .8;
   game.me = { node: { handcards1: ui.handcards1 }, getVCards: () => [] };
   window.decadeUI = { config: { newDecadeStyle: 'othersOff' }, layout: handLayout, getCardBestScale: () => handScale, queueNextFrameTick: fn => requestAnimationFrame(fn), layoutHand: () => handLayout.updateHand() };
   decadeUI.boundsCaches = handBounds(decadeUI);
   ui.updatehl = () => handLayout.updateHand();
   handPlugin.initOfficialLayout();
   const buttons = ui.create.div('.yjcm-chat-buttons', ui.window);
   for (const name of ['yjcm-flower', 'yjcm-quick-face', 'yjcm-chat']) handPlugin.createOfficialButton(name, name, () => {}, buttons);
   window.buildHand = count => {
    ui.selected.cards = []; ui._handcardHover = null; ui.handcards1.innerHTML = '';
    for (let i = 0; i < count + 14; i++) {
     const card = ui.create.card(ui.handcards1); card.init(['spade', i % 13 + 1, 'sha']);
     if (i < count) { card.classList.add('glows'); card.gaintag = ['muniu']; }
    }
    decadeUI.boundsCaches.hand.updated = false; ui.updatehl();
   };
   window.measure = () => {
    const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
    const hand = ui.handcards1, panel = getComputedStyle(hand, '::before'), label = getComputedStyle(hand, '::after');
    const zoom = ui.window.getBoundingClientRect().height / ui.window.clientHeight;
    const cards = [...hand.children];
    return { hand: rect(ui.me), cacheWidth: decadeUI.boundsCaches.hand.width, buttons: rect(document.querySelector('.yjcm-chat-buttons')), panelLeft: hand.getBoundingClientRect().left + parseFloat(panel.left) * zoom, labelLeft: hand.getBoundingClientRect().left + parseFloat(label.left) * zoom, cards: cards.map(rect), stored: cards.filter(c => c.classList.contains('lyj-muniu-card')).map(rect), zoom };
   };
  });
  await page.addScriptTag({ content: script('extension/雷的一将/utils/muniuBeautify.js', 'window.muniuController=installMuniuBeautify();') });
  const oldCss = css.replace(/\/\* 雷的一将木牛底框[\s\S]*?\n}\n/, '');
  await sheet.evaluate((node, value) => node.textContent = value, oldCss);
  await page.evaluate(() => buildHand(1)); await page.waitForTimeout(150);
  result.regression = await page.evaluate(() => measure());
  assert(result.regression.labelLeft < result.regression.buttons.right, 'old layout reproduces covered label');
  await sheet.evaluate((node, value) => node.textContent = value, css);
  for (const size of [{ width: 1280, height: 573 }, { width: 1333, height: 750 }, { width: 1920, height: 1080 }]) {
   await page.setViewportSize(size);
   for (const zoom of [1, 1.5]) for (const scale of [.55, .8, 1.2]) for (const count of [1, 3, 5]) {
    await page.evaluate(({ zoom, scale, count }) => { document.body.style.zoom = zoom; handScale = scale; buildHand(count); }, { zoom, scale, count });
    await page.waitForTimeout(65);
    const row = await page.evaluate(() => measure());
    assert(row.panelLeft > row.buttons.right && row.labelLeft > row.buttons.right, 'panel and label clear buttons');
    assert(Math.abs(row.hand.width / row.zoom - row.cacheWidth) < 1, 'bounds reflect reduced hand width');
    if (!await page.evaluate(() => ui.handcards1Container.classList.contains('scrollh'))) assert(Math.max(...row.cards.map(c => c.right)) <= row.hand.right + 2, 'ordinary cards fit reduced region');
    result.layouts.push({ size, zoom, scale, count, gap: row.panelLeft - row.buttons.right });
   }
  }
  await page.setViewportSize({ width: 1280, height: 573 });
  await page.evaluate(() => { document.body.style.zoom = 1; handScale = .8; buildHand(1); });
  await page.waitForTimeout(100);
  const selection = await page.evaluate(() => { const c = ui.handcards1.firstElementChild; const y = c.getBoundingClientRect().top; c.classList.add('selected'); ui.selected.cards = [c]; c.updateTransform(true); return { y, owner: c.parentNode === game.me.node.handcards1 }; });
  await page.waitForTimeout(100);
  assert(await page.evaluate(y => ui.handcards1.firstElementChild.getBoundingClientRect().top < y, selection.y), 'stored card still lifts on selection');
  assert(selection.owner, 'native stored card parent preserved');
  await page.screenshot({ path: path.join(__dirname, 'yjcm-muniu-safe-area-browser.png') });
  await page.evaluate(() => buildHand(0)); await page.waitForTimeout(100);
  const reset = await page.evaluate(() => ({ active: ui.handcards1.classList.contains('lyj-muniu-hand'), left: ui.me.getBoundingClientRect().left }));
  assert(!reset.active && reset.left < result.regression.hand.left + 1, 'empty storage restores original origin');
  for (const style of ['onlineUI', 'on', 'off', 'babysha', 'codename', 'othersOff']) {
   await page.evaluate(style => { document.body.dataset.style = style; decadeUI.config.newDecadeStyle = style; lib.config.extension_十周年UI_rightLayout = style === 'othersOff' ? 'off' : 'on'; ui.window.dataset.yjcmSide = style === 'othersOff' ? 'left' : 'right'; buildHand(1); }, style);
   const pair = [];
   for (const content of [oldCss, css]) { await sheet.evaluate((node, value) => node.textContent = value, content); await page.waitForTimeout(40); pair.push(await page.evaluate(() => ({ left: getComputedStyle(ui.me).left, right: getComputedStyle(ui.me).right }))); }
   assert.deepEqual(pair[0], pair[1], style + ' isolation'); result.isolation.push(style);
  }
  assert.deepEqual(result.errors, []);
  fs.writeFileSync(path.join(__dirname, 'yjcm-muniu-safe-area-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: true, layouts: result.layouts.length, isolation: result.isolation, errors: result.errors }));
 } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
