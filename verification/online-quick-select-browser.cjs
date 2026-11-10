const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
seed.characters = ['standard'];
seed.cards = ['standard', 'extra'];

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
 const errors = [];
 page.on('pageerror', error => errors.push(error.stack || String(error)));
 page.on('dialog', dialog => dialog.accept());
 try {
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.waitForFunction(async () => {
   const { game, ui } = await import('/noname.js');
   return game.players.length > 1 && window.decadeUI && ui.create.confirm && Array.isArray(ui.dialogs);
  }, null, { timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
   const { game, ui, lib, get, _status } = await import('/noname.js');
   const { Content } = await import('/noname/library/element/content.js');
   const { syncOnlineActionButtons } = await import('/extension/十周年UI/src/ui/online-action-buttons.js');
   Object.assign(window, { game, ui, lib, get, _status, Content, syncOnlineActionButtons });
   game.pause(); game.pause2();
   for (const dialog of [...ui.dialogs]) dialog.close();
   for (const control of [...ui.controls]) control.close();
   document.querySelector('.decade-welcome-overlay')?.remove();
   ui.arena.classList.remove('choose-character');
   game.me = game.players[0]; window.other = game.players[1];
   game.me.init('liubei'); other.init('guanyu');
   Object.assign(_status, { gameStarted: true, over: false, auto: false, currentPhase: game.me });
   lib.config.auto_confirm = false;
   game.me.directgain(['sha', 'shan', 'tao', 'tiesuo'].map((name, i) => game.createCard(name, 'spade', i + 1)));
   window.beginSelection = async (kind, count = 2) => {
    game.uncheck();
    for (const control of [...ui.controls]) { control.close(); control.remove(); }
    ui.confirm = null;
    for (const dialog of [...ui.dialogs]) dialog.close();
    const event = kind === 'give' ? game.me.chooseToGive(other, count) : game.me.chooseToDiscard(count, 'h');
    event.ai = card => 20 - card.number;
    _status.eventManager.setStatusEvent(event, true);
    await Content[kind === 'give' ? 'chooseToGive' : 'chooseToDiscard'][0](event, null, game.me);
    window.selectionEvent = event;
    syncOnlineActionButtons();
    return !!(event.aiChoose || event.promptdiscard);
   };
   window.geometry = () => {
    syncOnlineActionButtons();
    const control = selectionEvent.aiChoose || selectionEvent.promptdiscard;
    const read = node => ({ text: node.textContent, rect: node.getBoundingClientRect().toJSON(), display: getComputedStyle(node).display });
    return { quick: read(control), label: read(control.firstChild), ok: read(ui.confirm.node.ok), cancel: read(ui.confirm.node.cancel),
     scale: ui.confirm.node.ok.getBoundingClientRect().width / 207,
     linked: control.firstChild.link, nativeCallback: typeof control.custom === 'function',
     first: ui.confirm.firstChild === ui.confirm.node.ok, last: ui.confirm.lastChild === ui.confirm.node.cancel };
   };
  });
  const results = [];
  for (const kind of ['give', 'discard']) {
   assert.equal(await page.evaluate(kind => beginSelection(kind), kind), true);
   await page.waitForTimeout(600);
   await page.evaluate(() => document.fonts.ready);
   for (const mobile of [false, true]) {
    await page.evaluate(mobile => ui.arena.classList.toggle('dui-mobile', mobile), mobile);
    const g = await page.evaluate(() => geometry());
    assert.equal(g.quick.text, '一键选择');
    assert.equal(g.linked, 'AI代选');
    assert(g.nativeCallback && g.first && g.last);
    const centerX = r => r.x + r.width / 2;
    const centerY = r => r.y + r.height / 2;
    assert(Math.abs(centerX(g.ok.rect) - centerX(g.quick.rect) - 251 * g.scale) < 1, 'official horizontal position: ' + JSON.stringify({ kind, mobile, geometry: g }));
    assert(Math.abs(centerY(g.cancel.rect) - centerY(g.quick.rect)) < 1, 'official vertical position');
    assert(Math.abs(g.quick.rect.width - 142 * g.scale) < 1, 'official width');
    assert(Math.abs(g.quick.rect.height - 52 * g.scale) < 1, 'official height');
    assert(Math.abs(g.label.rect.x - g.quick.rect.x) < 1, 'label aligned with control');
    assert(Math.abs(g.label.rect.width - g.quick.rect.width) < 1);
    results.push({ kind, mobile, geometry: g });
   }
   await page.evaluate(() => ui.arena.classList.remove('dui-mobile'));
   await page.locator('.online-quick-select').click();
   const selection = await page.evaluate(() => ({ count: ui.selected.cards.length, confirmEnabled: !ui.confirm.node.ok.classList.contains('disabled'), connected: (selectionEvent.aiChoose || selectionEvent.promptdiscard).isConnected }));
   assert.equal(selection.count, 2);
   assert(selection.confirmEnabled && selection.connected, 'selection waits for native confirmation');
   if (kind === 'discard') {
    await page.screenshot({ path: path.join(__dirname, 'online-quick-select.png') });
    await page.evaluate(() => { _status.clicked = false; ui.click.ok(ui.confirm.node.ok); });
    const result = await page.evaluate(() => ({ bool: selectionEvent.result.bool, count: selectionEvent.result.cards.length }));
    assert.deepEqual(result, { bool: true, count: 2 });
   }
  }
  assert.equal(await page.evaluate(() => beginSelection('discard', 1)), false, 'single selection has no quick button');
  const otherStyle = await page.evaluate(() => {
   lib.config.extension_十周年UI_newDecadeStyle = 'on';
   document.body.dataset.style = 'on';
   const control = ui.create.control('AI代选', () => {});
   const value = { text: control.textContent, adapted: control.classList.contains('online-quick-select') };
   control.close();
   return value;
  });
  assert.deepEqual(otherStyle, { text: 'AI代选', adapted: false });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(__dirname, 'online-quick-select-results.json'), JSON.stringify({ results, otherStyle, errors }, null, 2));
  console.log('ONLINE_QUICK_SELECT_OK: native give/discard, mobile class, click/confirm, single-card exclusion, other style');
 } finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
