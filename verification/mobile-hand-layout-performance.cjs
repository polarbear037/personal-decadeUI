const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const baseline = process.argv.includes('--baseline');

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const reports = [];
 try {
  for (const style of ['othersOff', 'onlineUI', 'on']) {
   Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'], touchscreen: true,
    extension_十周年UI_newDecadeStyle: style, extension_十周年UI_cardMovementDiagnostics: false });
   const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
   const errors = [];
   page.on('pageerror', error => errors.push(error.message));
   page.on('dialog', dialog => dialog.accept());
   await dependencies(page);
   await page.route('**/node_modules/.pnpm/**', async route => {
    const file = path.resolve(__dirname, '../../..', '.' + decodeURIComponent(new URL(route.request().url()).pathname));
    if (fs.existsSync(file)) {
     const source = fs.readFileSync(file, 'utf8');
     if (/export\s*\{[^}]*__require/.test(source)) return route.fulfill({ contentType: 'text/javascript', body: source });
    }
    return route.fallback();
   });
   if (baseline) await page.route('**/src/core/layout.js', route => route.fulfill({ contentType: 'text/javascript',
    body: fs.readFileSync(path.join(__dirname, '../src/core/layout.js'), 'utf8')
     .replace('if (card.classList.contains("drawinghidden")) card.classList.remove("drawinghidden");', 'card.classList.remove("drawinghidden");')
     .replace('container.classList.toggle("scrollh", f);', 'f ? container.classList.add("scrollh") : container.classList.remove("scrollh");') }));
   await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
   await page.locator('#arena>.player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
   const rows = await page.evaluate(async () => {
    const { game, lib, ui, _status } = await import('/noname.js');
    game.pause(); game.resume = () => {};
    game.me = game.players[0]; game.me.init('sunquan');
    ui.arena.classList.remove('choose-character');
    const event = game.createEvent('chooseToUse', false); event.player = game.me;
    _status.eventManager.setStatusEvent(event, true);
    lib.config.spread_card = false; lib.config.fold_card = false;
    const rows = [];
    for (const count of [4, 15, 40, 80]) {
     ui.selected.cards = [];
     game.me.getCards('h').forEach(card => card.remove());
     const cards = Array.from({ length: count }, (_, i) => game.createCard('sha', 'heart', i % 13 + 1));
     game.me.directgain(cards); decadeUI.layout.updateHand();
     await new Promise(resolve => setTimeout(resolve, 600));
     const before = cards.map(card => card.style.transform);
     const observer = new MutationObserver(() => {});
     observer.observe(ui.handcards1Container, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
     const start = performance.now();
     for (let i = 0; i < 5; i++) decadeUI.layout.updateHand();
     const ms = performance.now() - start, mutations = observer.takeRecords();
     observer.disconnect();
     rows.push({ count, ms, writes: mutations.length, stable: cards.every((card, i) => card.style.transform === before[i]),
      eventUnchanged: _status.event === event, selected: ui.selected.cards.length });
     cards[0].classList.add('drawinghidden'); decadeUI.layout.updateHand();
     if (cards[0].classList.contains('drawinghidden')) throw Error('Hand reentry stayed hidden');
    }
    lib.config.fold_card = true; lib.config.extension_十周年UI_handFoldMin = 200;
    decadeUI.layout.updateHand();
    if (!ui.handcards1Container.classList.contains('scrollh')) throw Error('Folded hand did not scroll');
    lib.config.fold_card = false; decadeUI.layout.updateHand();
    if (ui.handcards1Container.classList.contains('scrollh')) throw Error('Expanded hand kept scrolling');
    return rows;
   });
   assert.deepEqual(errors, []);
   for (const row of rows) {
    assert(row.stable && row.eventUnchanged && row.selected === 0);
    assert.equal(row.writes, baseline ? (row.count + 1) * 5 : 0);
   }
   reports.push({ style, rows });
   await page.close();
  }
  fs.writeFileSync(path.join(__dirname, `mobile-hand-layout-${baseline ? 'before' : 'after'}-results.json`), JSON.stringify(reports, null, 2) + '\n');
  console.log(JSON.stringify(reports));
  console.log(baseline ? 'MOBILE_HAND_REDUNDANT_WRITES_REPRODUCED' : 'MOBILE_HAND_LAYOUT_OK');
 } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
