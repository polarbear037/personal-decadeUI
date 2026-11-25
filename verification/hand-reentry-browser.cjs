// 真实本体、十周年UI与雷的一将牌面服务；移牌确认结果为受控输入，不代表当前Electron实局。
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const baseline = process.argv.includes('--baseline');

(async () => {
  Object.assign(seed, { mode: 'identity', characters: ['standard', 'xianding'], cards: ['standard', 'extra'],
    extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_cardPrettify: 'off' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], consoleErrors = [], badResponses = [], results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 850 } });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) badResponses.push({ status: response.status(), path: decodeURIComponent(new URL(response.url()).pathname) }); });
    page.on('dialog', dialog => dialog.accept());
    if (baseline) await page.route('**/src/core/layout.js', route => route.fulfill({ contentType: 'text/javascript',
      body: fs.readFileSync(path.join(__dirname, '../src/core/layout.js'), 'utf8').replace('card.classList.remove("drawinghidden");', '') }));
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 }).catch(async error => {
      console.error(JSON.stringify({ errors, text: (await page.locator('body').innerText()).slice(-2000) })); throw error;
    });
    await page.evaluate(async () => {
      const { game, ui, lib, get, _status } = await import('/noname.js');
      Object.assign(window, { game, ui, lib, get, _status });
      game.pause(); game.resume = () => {};
      game.me = game.players[0]; game.me.init('shen_dengai');
      _status.event.player = game.me; _status.over = false;
      for (const dialog of [...ui.dialogs]) dialog.close();
      ui.arena.classList.remove('choose-character');
      lib.config.extension_雷的一将_cardBeautify = true;
      const cards = await import('/extension/雷的一将/utils/cardBeautify.js');
      await cards.installCardBeautify();
      window.refreshReentryCard = cards.refreshCard;
    });
    for (const style of ['othersOff', 'onlineUI', 'on']) {
      results.push(await page.evaluate(async style => {
        lib.config.extension_十周年UI_newDecadeStyle = style;
        decadeUI.config.newDecadeStyle = style; document.body.dataset.style = style;
        game.me.getCards('hs').forEach(card => card.remove());
        const cards = ['sha', 'tao'].map((name, i) => game.createCard(name, i ? 'heart' : 'spade', i + 7));
        game.me.directgain(cards.slice(), false);
        decadeUI.layout.updateHand();
        await new Promise(resolve => setTimeout(resolve, 400));
        const read = () => cards.map(card => ({ name: card.name, temporary: card.classList.contains('drawinghidden'),
          back: card.classList.contains('lei-yijiang-card-hidden'), face: !!card.querySelector('.lei-yijiang-card-face'),
          faceDisplay: getComputedStyle(card.querySelector('.lei-yijiang-card-face')).display,
          owner: get.owner(card) === game.me }));
        const initial = read();
        // 与拓域结算相同的原牌移出再directgain；同牌序也必须恢复，不能依赖坐标改变。
        for (const card of cards) card.goto(ui.special);
        game.me.directgain(cards.slice(), false); decadeUI.layout.updateHand();
        await new Promise(resolve => setTimeout(resolve, 400));
        const unchanged = read();
        for (const card of cards) card.goto(ui.special);
        game.me.directgain(cards.slice().reverse(), false); decadeUI.layout.updateHand();
        await new Promise(resolve => setTimeout(resolve, 400));
        const reordered = read();
        // 执行本体拓域的完整content；仅以受控选择结果替代人工分配，不改结算。
        const chooseToMove = game.me.chooseToMove_new;
        let tuoyu = null;
        if (style === 'othersOff') {
          game.me.storage.dctuoyu = ['dctuoyu_fengtian', 'dctuoyu_qingqu'];
          game.me.chooseToMove_new = function () {
            return { set(key, value) { this[key] = value; return this; },
              forResult() { return Promise.resolve({ bool: true, moved: [[], [cards[0]], [cards[1]], []] }); } };
          };
          try { await lib.skill.dctuoyu.content({}, {}, game.me); }
          finally { game.me.chooseToMove_new = chooseToMove; }
          decadeUI.layout.updateHand();
          await new Promise(resolve => setTimeout(resolve, 400));
          tuoyu = { cards: read(), tags: cards.map(card => [...card.gaintag]),
            order: game.me.getCards('h').map(card => card.name) };
        }
        cards[0].classList.add('infohidden', 'infoflip');
        cards[1].classList.add('blank'); decadeUI.layout.updateHand();
        await new Promise(resolve => setTimeout(resolve, 50));
        const concealed = read();
        cards[0].classList.remove('infohidden', 'infoflip'); cards[1].classList.remove('blank');
        // 正在移除的牌不参与本次落位，不清除其入场标记。
        cards[0].classList.add('removing', 'drawinghidden'); decadeUI.layout.updateHand();
        const removingPreserved = cards[0].classList.contains('drawinghidden');
        cards[0].classList.remove('removing'); decadeUI.layout.updateHand();
        await new Promise(resolve => setTimeout(resolve, 50));
        const returned = read();
        return { style, initial, unchanged, reordered, tuoyu, concealed, removingPreserved, returned,
          order: game.me.getCards('h').map(card => card.name) };
      }, style));
      if (style === 'othersOff' && !baseline) await page.screenshot({ path: path.join(__dirname, 'hand-reentry-browser.png') });
    }
    const file = path.join(__dirname, baseline ? 'hand-reentry-before-results.json' : 'hand-reentry-results.json');
    fs.writeFileSync(file, JSON.stringify({ baseline, results, errors, consoleErrors, badResponses }, null, 2) + '\n');
    assert.deepEqual(errors, []);
    for (const result of results) {
      for (const stage of ['initial', 'unchanged', 'reordered', 'returned']) {
        for (const card of result[stage]) {
          assert.equal(card.temporary, baseline, `${result.style}/${stage}: drawinghidden cleanup`);
          assert.equal(card.back, baseline, `${result.style}/${stage}: face visibility`);
          assert.equal(card.face, true); assert.equal(card.owner, true);
          assert.equal(card.faceDisplay === 'none', baseline);
        }
      }
      assert.ok(result.concealed.every(card => card.back), 'real concealed cards stay face down');
      if (result.tuoyu) {
        assert.ok(result.tuoyu.cards.every(card => card.temporary === baseline && card.back === baseline && card.owner));
        assert.deepEqual(result.tuoyu.tags, [['dctuoyu_fengtian_tag'], ['dctuoyu_qingqu_tag']]);
        assert.deepEqual(result.tuoyu.order, ['tao', 'sha']);
      }
      assert.equal(result.removingPreserved, true);
      assert.deepEqual(result.order, ['tao', 'sha']);
    }
    console.log(baseline ? 'HAND_REENTRY_BASELINE_REPRODUCED: 3 styles retain drawinghidden and show card backs' :
      'HAND_REENTRY_OK: 3 styles, original cards and order preserved, reentry revealed, concealed/removing cards preserved');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
