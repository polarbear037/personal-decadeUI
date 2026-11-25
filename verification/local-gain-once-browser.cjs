const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const baseline = process.argv.includes('--baseline');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.NONAME_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const report = { baseline, cases: [], errors: [] };
  try {
    for (const style of ['othersOff', 'onlineUI', 'on']) {
      Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'], extension_十周年UI_newDecadeStyle: style });
      const page = await browser.newPage({ viewport: { width: 1500, height: 850 } });
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('dialog', dialog => dialog.dismiss());
      if (baseline) await page.route('**/src/overrides/content.js', route => route.fulfill({ contentType: 'text/javascript',
        body: fs.readFileSync(path.join(__dirname, '../src/overrides/content.js'), 'utf8').replace('cards._duiHandDraws = true;', 'cards._duiHandDraws = false;') }));
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena>.player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      const cases = await page.evaluate(async style => {
        const { game, ui, _status } = await import('/noname.js');
        const { createContentGain } = await import('/extension/十周年UI/src/overrides/content.js');
        game.pause(); game.resume = () => {};
        game.me = game.players[0]; game.me.init('sunquan'); game.players[1].init('caocao');
        _status.over = false; ui.arena.classList.remove('choose-character');
        for (const dialog of [...ui.dialogs]) dialog.close();
        const gain = createContentGain([null, null])[0], wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const rect = card => { const r = card.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; };
        await wait(750);
        const result = [];
        for (const scenario of ['gain2', 'draw2', 'draw', 'source', 'returning', 'remote', 'standalone']) {
          game.me.getCards('hs').forEach(card => card.remove());
          const cards = [game.createCard('sha', 'spade', 7), game.createCard('shan', 'heart', 8)];
          if (scenario === 'returning') {
            game.me.directgain(cards, false); decadeUI.layout.updateHand(); await wait(500);
            cards.forEach(card => card.goto(ui.special));
          }
          const player = scenario === 'remote' ? game.players[1] : game.me;
          const before = new Set(ui.arena.children);
          const event = { name: 'gain', player, cards, gaintag: [], animate: scenario === 'draw' || scenario === 'draw2' ? scenario : 'gain2', log: false };
          if (scenario === 'source') event.source = game.players[1];
          _status.event = event;
          if (scenario === 'standalone') player.$gain2(cards);
          else await gain(event, null, player);
          const clones = [...ui.arena.children].filter(card => !before.has(card) && card.classList.contains('gainingcard'));
          await wait(600);
          const landing = cards.map(rect);
          const cloneLanding = clones.map(rect);
          await wait(200);
          const stable = cards.map(rect);
          result.push({ style, scenario, clones: clones.length, owned: cards.every(card => card.parentNode === player.node.handcards1),
            stable: JSON.stringify(landing) === JSON.stringify(stable), landing, cloneLanding });
          cards.forEach(card => card.remove()); clones.forEach(card => card.remove());
        }
        return result;
      }, style);
      report.cases.push(...cases); await page.close();
    }
    assert.deepEqual(report.errors, []);
    for (const row of report.cases.filter(row => row.style === 'othersOff')) {
      const expected = ['remote', 'standalone'].includes(row.scenario) || baseline && ['gain2', 'draw2', 'returning'].includes(row.scenario) ? 2 : 0;
      assert.equal(row.clones, expected, row.scenario + ': one local arrival presentation');
      if (row.scenario !== 'standalone') assert.equal(row.owned, true, row.scenario);
      if (!baseline && !['remote', 'standalone'].includes(row.scenario)) assert.equal(row.stable, true, row.scenario + ': stable final position');
    }
    report.passed = true;
    console.log(baseline ? 'LOCAL_GAIN_DUPLICATE_REPRODUCED' : 'LOCAL_GAIN_ONCE_OK', JSON.stringify(report.cases.map(({ style, scenario, clones }) => ({ style, scenario, clones }))));
  } finally {
    fs.writeFileSync(path.join(__dirname, baseline ? 'local-gain-once-before.json' : 'local-gain-once-results.json'), JSON.stringify(report, null, 2));
    await browser.close(); server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
