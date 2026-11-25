const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const style of ['othersOff', 'onlineUI', 'on']) {
      Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'],
        touchscreen: false, auto_confirm: false, extension_十周年UI_newDecadeStyle: style });
      const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await dependencies(page);
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      const rows = await page.evaluate(async () => {
        const { game, ui, lib, _status } = await import('/noname.js');
        const { captureHandCardPosition } = await import('/extension/十周年UI/src/utils/hand-card-position.js');
        const { Content } = await import('/noname/library/element/content.js');
        game.pause();
        game.resume = () => {};
        game.me = game.players[0];
        game.me.init('sunquan');
        for (const dialog of [...ui.dialogs]) dialog.close();
        ui.arena.classList.remove('choose-character');
        lib.config.auto_confirm = false;
        _status.auto = false;
        _status.over = false;
        const rect = node => {
          const r = node.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
        const rows = [];
        for (const [delay, skill, cancel] of [[20, null, false], [350, null, false], [350, 'zhiheng', false], [350, null, true]]) {
          game.me.getCards('h').forEach(card => card.remove());
          const card = game.createCard('wuzhong', 'heart', 3);
          game.me.directgain([card]);
          const event = game.me.chooseToUse({ type: 'phase' });
          event._skillChoice = [];
          _status.currentPhase = game.me;
          _status.eventManager.setStatusEvent(event, true);
          await Content.chooseToUse[0](event, null, game.me);
          decadeUI.layout.updateHand();
          await wait(550);
          const base = rect(card);
          _status.clicked = false;
          ui.click.card.call(card);
          await wait(delay);
          const before = rect(card);
          if (skill) event.skill = skill;
          // 原生确认负责设置 result 并立即 uncheck；技能材料分支没有 result.card。
          if (cancel) ui.click.cancel();
          else ui.click.ok();
          await wait(cancel ? 550 : 80);
          const confirmed = rect(card);
          if (cancel) {
            rows.push({ delay, skill, cancel, base, before, confirmed });
          } else {
            // 与 lose 的顺序相同：先保存几何，再缩小移走，最后建立出牌副本。
            captureHandCardPosition(card, game.me);
            card.throwWith = 'h';
            card.style.transform += ' scale(0.2)';
            card.remove();
            const cards = [card];
            cards.duiMod = true;
            const clone = game.me.$throw(cards, 0, 'nobroadcast');
            rows.push({ delay, skill, cancel, before, confirmed, start: rect(clone) });
            clone.remove();
          }
          event.dialog?.close();
        }
        return rows;
      });
      for (const row of rows) {
        for (const key of ['x', 'y', 'width', 'height']) {
          const expected = row.cancel ? row.base : row.before;
          assert.ok(Math.abs(row.confirmed[key] - expected[key]) < 0.1, `${style}/${row.delay}/${row.skill}/${key}: confirmation moved card`);
          if (!row.cancel) assert.ok(Math.abs(row.start[key] - row.before[key]) < 0.1, `${style}/${key}: flight origin mismatch`);
        }
      }
      assert.deepEqual(errors, []);
      results.push({ style, rows, errors });
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'handcard-flight-origin-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log('HANDCARD_FLIGHT_ORIGIN_OK: three styles, quick confirmation, skill materials, cancellation, clone geometry');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
