const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function verifyHandcardMask(page) {
  await require('./handcard-switch-engine.cjs')(page);
  const allResults = {};
  for (const style of ['onlineUI', 'on', 'othersOff', 'off', 'babysha', 'codename']) {
    // 使用实际样式路由加载布局，避免只切换 body 标记却仍验证 Online CSS。
    const layoutFile = await page.evaluate(async style => {
      const { lib } = await import('/noname.js');
      const { getStyleFile } = await import('/extension/十周年UI/src/styles/style-route.js');
      lib.config.extension_十周年UI_newDecadeStyle = style;
      document.body.dataset.style = style;
      const layoutFile = getStyleFile('layout', style);
      const link = document.querySelector('link[href*="/十周年UI/src/styles/layout"], link[href*="/%E5%8D%81%E5%91%A8%E5%B9%B4UI/src/styles/layout"]');
      if (!link) throw new Error('Handcard layout stylesheet not found');
      const href = new URL('/extension/十周年UI/src/styles/' + layoutFile, location.href).href;
      if (link.href !== href) await new Promise((resolve, reject) => {
        link.onload = resolve;
        link.onerror = () => reject(new Error('Failed to load ' + layoutFile));
        link.href = href;
      });
      return layoutFile;
    }, style);
    assert.equal(layoutFile, style === 'onlineUI' ? 'layout-online.css' : style === 'othersOff' ? 'layout-xinsha.css' : 'layout.css');
    const results = {};
    const read = async () => {
      await page.waitForTimeout(150);
      return page.evaluate(() => handcardSwitchCase.cards.map(card => ({
        selected: card.classList.contains('selected'),
        selectable: card.classList.contains('selectable'),
        mask: Number(getComputedStyle(card.querySelector('.card-mask')).opacity),
      })));
    };
    await page.evaluate(async () => { await handcardSwitchCase.begin(); });
    results.idle = await read();
    await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[0]));
    results.selected = await read();
    assert.deepEqual(results.idle.map(card => card.mask), [0, 0, 1, 0]);
    assert.deepEqual(results.selected.map(card => card.mask), [0, 0, 1, 0], '选满一张后只能遮罩原本不可用的闪');
    assert.equal(results.selected[1].selectable, false, '遮罩修正不得更改本体选牌上限');
    if (style === 'onlineUI') await page.screenshot({ path: path.join(__dirname, 'handcard-mask-browser.png') });
    results.withTarget = await page.evaluate(async () => {
      const { game, ui, _status } = await import('/noname.js');
      const target = game.players.find(player => player !== game.me && player.classList.contains('selectable'));
      _status.clicked = false;
      ui.click.target.call(target);
      game.check();
      return { cards: ui.selected.cards.map(card => handcardSwitchCase.cards.indexOf(card)), targetRetained: ui.selected.targets[0] === target };
    });
    assert.deepEqual(results.withTarget, { cards: [0], targetRetained: true });
    await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[1]));
    results.switched = await read();
    assert.deepEqual(results.switched.map(card => card.mask), [0, 0, 1, 0]);
    await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[1]));
    results.cancelled = await read();
    assert.deepEqual(results.cancelled.map(card => card.mask), [0, 0, 1, 0]);
    await page.evaluate(async () => {
      const { cards, begin, click } = handcardSwitchCase;
      await begin({}, 'codexSwitchMulti');
      click(cards[0]); click(cards[1]);
    });
    results.multiFull = await read();
    assert.deepEqual(results.multiFull.map(card => card.mask), [0, 0, 0, 0]);
    await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[2]));
    assert.deepEqual(await page.evaluate(() => handcardSwitchCase.read().cards), [0, 1]);
    await page.evaluate(async () => {
      const { lib, ui } = await import('/noname.js');
      lib.skill.codexMaskColor = { enable: 'chooseToUse', position: 'h', selectCard: 2,
        filterCard: card => !ui.selected.cards.length || ui.selected.cards[0].suit === card.suit,
        viewAs: { name: 'sha' } };
      await handcardSwitchCase.begin({}, 'codexMaskColor');
      handcardSwitchCase.click(handcardSwitchCase.cards[0]);
    });
    results.dependentFilter = await read();
    assert.deepEqual(results.dependentFilter.map(card => card.mask), [0, 1, 1, 1]);
    await page.evaluate(async () => {
      await handcardSwitchCase.begin({ filterCard: card => card.name === 'shan', selectTarget: [0, 0] });
      handcardSwitchCase.click(handcardSwitchCase.cards[2]);
    });
    results.response = await read();
    assert.deepEqual(results.response.map(card => card.mask), [1, 1, 0, 1]);
    await page.evaluate(async () => {
      const { game } = await import('/noname.js');
      game.uncheck();
    });
    results.finished = await read();
    assert.deepEqual(results.finished.map(card => card.mask), [0, 0, 0, 0]);
    assert.equal(await page.evaluate(() => handcardSwitchCase.cards.some(card => card.classList.contains('dui-handcard-available'))), false);
    allResults[style] = { layoutFile, ...results };
    console.log('HANDCARD_MASK_STYLE_OK', style);
  }
  fs.writeFileSync(path.join(__dirname, 'handcard-mask-engine-results.json'), JSON.stringify(allResults, null, 2) + '\n');
  console.log('HANDCARD_MASK_ENGINE_OK', Object.keys(allResults).join(', '));
};

if (require.main === module) {
  const { dependencies } = require('./xinsha-prompt-engine.cjs');
  const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
  (async () => {
    Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'], touchscreen: false, extension_十周年UI_optimizePrompt: 'online' });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await dependencies(page);
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      await page.evaluate(async () => {
        const { game, ui, lib, _status } = await import('/noname.js');
        window.probeNoname = { game, ui, lib, _status };
        game.pause(); game.resume = () => {};
        for (const control of [...ui.controls]) control.close();
        document.querySelector('.decade-welcome-overlay')?.remove();
        ui.arena.classList.remove('choose-character');
        game.me = game.players[0]; game.me.init('liubei'); game.players[1].init('guanyu');
        _status.auto = false; _status.over = false; _status.gameStarted = true;
      });
      await module.exports(page);
      assert.deepEqual(errors, []);
      console.log('HANDCARD_MASK_SCRIPT_ERRORS', JSON.stringify(errors));
    } finally { await browser.close(); server.close(); }
  })().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
}
