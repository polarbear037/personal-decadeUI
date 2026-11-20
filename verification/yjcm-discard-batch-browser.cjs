const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const baseline = process.argv.includes('--baseline');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const style of ['othersOff', 'onlineUI', 'on']) {
      Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'],
        extension_十周年UI_newDecadeStyle: style, touchscreen: false });
      const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await dependencies(page);
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      const result = await page.evaluate(async () => {
        const { game, ui, lib, _status } = await import('/noname.js');
        const { captureHandCardPosition } = await import('/extension/十周年UI/src/utils/hand-card-position.js');
        const { createContentGain } = await import('/extension/十周年UI/src/overrides/content.js');
        const gain = createContentGain([null, null])[0];
        game.pause();game.resume = () => {};
        game.me = game.players[0];game.me.init('sunquan');game.players[1].init('caocao');
        for (const dialog of [...ui.dialogs]) dialog.close();
        ui.arena.classList.remove('choose-character');_status.video = false;
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const create = n => game.createCard('sha', 'heart', n);
        const number = card => card.number;
        const left = card => card.getBoundingClientRect().left;
        const visualOrder = cards => [...cards].sort((a, b) => left(a) - left(b)).map(number);
        const reset = async () => {
          for (const card of [...ui.thrown, ...ui.arena.querySelectorAll('.gainingcard')]) card.remove();
          ui.thrown = [];
          for (const player of [game.me, game.players[1]]) player.getCards('hs').forEach(card => card.remove());
          await wait(30);
        };
        const frames = async cards => {
          const samples = [];
          await new Promise(resolve => {
            const sample = () => {
              samples.push(cards.map(card => ({ number: number(card), x: left(card) })));
              if (samples.length < 18) requestAnimationFrame(sample);else resolve();
            };
            requestAnimationFrame(sample);
          });
          return samples;
        };
        const discard = [], gains = [];
        for (const zoom of [1, 1.5]) {
          document.body.style.zoom = zoom;decadeUI.layout.resize();
          for (const player of [game.me, game.players[1]]) {
            await reset();
            const base = [1, 2].map(create);
            player.$throw(base, 0, 'nobroadcast');
            ui.thrown = base.map(card => card.clone);decadeUI.layout.updateDiscard();await wait(400);
            const batch = [3, 4, 5].map(create);
            if (player === game.me) {
              player.directgain(batch, false);decadeUI.layout.updateHand();await wait(550);
              batch.forEach(card => { captureHandCardPosition(card, player);card.throwWith = 'h';card.remove(); });
              batch.duiMod = true;
            }
            const returned = player.$throw(batch, 0, 'nobroadcast');
            const flights = batch.map(card => card.clone);
            const motion = await frames(flights);await wait(400);
            const firstBatch = visualOrder(ui.thrown);
            player.$throw([6, 7].map(create), 0, 'nobroadcast');await wait(400);
            const secondBatch = visualOrder(ui.thrown);
            player.$throw(create(8), 0, 'nobroadcast');player.$throw(create(9), 0, 'nobroadcast');await wait(400);
            discard.push({ own: player === game.me, zoom, firstBatch, secondBatch, singles: visualOrder(ui.thrown),
              returnedLast: returned === batch.at(-1).clone, motion });
          }
          for (const player of [game.me, game.players[1]]) for (const engine of (lib.config.extension_十周年UI_newDecadeStyle === 'othersOff' ? [false, true] : [false])) {
            await reset();
            const cards = [6, 7, 8].map(create);
            game.players[1].$throw(cards, 0, 'nobroadcast');
            ui.thrown = cards.map(card => card.clone);decadeUI.layout.updateDiscard();await wait(400);
            const origins = cards.map(card => ({ number: number(card), x: left(card.clone) }));
            // 模拟获得列表与屏幕排列不同，飞行动画仍应按屏幕6、7、8的顺序移动。
            const input = [cards[2], cards[0], cards[1]], before = new Set(ui.arena.children);
            if (engine) {
              ui.ordering.append(...cards);
              const event = game.createEvent('gain', false);
              Object.assign(event, { player, cards: input, gaintag: [], animate: 'gain2', log: false });
              _status.eventManager.setStatusEvent(event, true);
              await gain(event, null, player);
            } else player.$gain2(input, false);
            const flights = [...ui.arena.querySelectorAll('.gainingcard')].filter(card => !before.has(card));
            const initial = flights.map(card => ({ number: number(card), x: left(card) }));
            const motion = await frames(flights);
            gains.push({ own: player === game.me, engine, zoom, origins, initial, motion, input: input.map(number),
              owned: engine ? cards.every(card => player.getCards('h').includes(card)) : null,
              destination: [...flights].sort((a, b) => a.tx - b.tx).map(number) });
          }
        }
        await reset();return { discard, gains };
      });
      results.push({ style, ...result, errors });
      fs.writeFileSync(path.join(__dirname, `yjcm-discard-batch-${baseline ? 'before' : 'results'}.json`), JSON.stringify(results, null, 2) + '\n');
      assert.deepEqual(errors, [], style);
      if (!baseline && style === 'othersOff') {
        for (const row of result.discard) {
          assert.deepEqual(row.firstBatch, [3, 4, 5, 1, 2]);
          assert.deepEqual(row.secondBatch, [6, 7, 3, 4, 5, 1, 2]);
          assert.deepEqual(row.singles, [9, 8, 6, 7, 3, 4, 5, 1, 2]);
          assert.equal(row.returnedLast, true, '$throw 返回值保持不变');
          assert.ok(row.motion.every(frame => frame.every((card, i) => !i || card.x >= frame[i - 1].x - 0.05)), '同批弃牌飞行中不交叉倒序');
        }
        for (const row of result.gains) {
          assert.deepEqual(row.destination, [6, 7, 8], '按展示顺序整体飞入玩家区域');
          assert.deepEqual(row.input, [8, 6, 7], '不改写规则层获得列表');
          if (row.engine) assert.equal(row.owned, true, '生产gain步骤将三张实体牌正常交给目标玩家');
          for (const card of row.initial) assert.ok(Math.abs(card.x - row.origins.find(c => c.number === card.number).x) < 0.1, '得牌首帧保留弃牌堆位置');
          assert.ok(row.motion.every(frame => {
            const cards = [...frame].sort((a, b) => a.number - b.number);
            return cards.every((card, i) => !i || card.x >= cards[i - 1].x - 0.05);
          }), '展示牌获得飞行中不交叉倒序');
        }
      }
      if (!baseline && style !== 'othersOff') {
        for (const row of result.discard) {
          assert.deepEqual(row.firstBatch, [1, 2, 3, 4, 5], '其他样式仍采用原有追加顺序');
          assert.deepEqual(row.singles, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        }
        for (const row of result.gains) {
          assert.deepEqual(row.input, [8, 6, 7]);
          assert.deepEqual(row.initial.map(card => card.number).sort(), [6, 7, 8], '其他样式仍正常创建三张得牌副本');
        }
      }
      console.log(baseline ? 'BASELINE' : 'PASS', style,
        'discard', JSON.stringify(result.discard[0].firstBatch), 'gain', JSON.stringify(result.gains[0].destination));
      await page.close();
    }
  } finally { await browser.close();server.close(); }
})().catch(error => { console.error(error);process.exitCode = 1; });
