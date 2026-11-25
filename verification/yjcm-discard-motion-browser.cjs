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
        extension_十周年UI_newDecadeStyle: style, extension_十周年UI_cardScale: .19, extension_十周年UI_discardScale: .16 });
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
        game.pause();
        game.resume = () => {};
        game.me = game.players[0];
        game.me.init('sunquan');
        ui.arena.classList.remove('choose-character');
        const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
        const read = card => {
          const r = card.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height,
            scale: new DOMMatrix(getComputedStyle(card).transform).a };
        };
        const rows = [];
        for (const [handSize, discardSize] of [[.19, .16], [.16, .19], [.19, .19]]) {
          lib.config.extension_十周年UI_cardScale = handSize;
          lib.config.extension_十周年UI_discardScale = discardSize;
          decadeUI.boundsCaches.hand.updated = false;
          ui.thrown.forEach(card => card.remove());
          ui.thrown.length = 0;
          game.me.getCards('h').forEach(card => card.remove());
          for (const name of ['sha', 'shan', 'tao']) {
            const card = game.createCard(name, 'heart', 3);
            game.me.directgain([card]);
            decadeUI.layout.updateHand();
            await wait(550);
            const source = read(card);
            captureHandCardPosition(card, game.me);
            card.throwWith = 'h';
            card.remove();
            const cards = [card];
            cards.duiMod = true;
            const clone = game.me.$throw(cards, 0, 'nobroadcast');
            const first = read(clone), frames = [];
            await Promise.resolve();
            let curve;
            if (lib.config.extension_十周年UI_newDecadeStyle === 'othersOff') {
              curve = inspectImmediateFlight(clone);
              if (name === 'sha' && handSize === .19 && discardSize === .16) {
                const end = performance.now() + 420;
                while (performance.now() < end) {} // 用牌同帧长任务不能吃掉尚未绘制的飞行。
              }
            }
            await new Promise(resolve => {
              const sample = () => {
                frames.push(read(clone));
                if (frames.length < 35) requestAnimationFrame(sample);
                else resolve();
              };
              requestAnimationFrame(sample);
            });
            await wait(550);
            rows.push({ handSize, discardSize, name, source, first, frames, final: read(clone),
              curve,
              used: !!clone.querySelector('.used-info'),
              expectedScale: decadeUI.getCardBestScale({ height: decadeUI.boundsCaches.arena.cardHeight }, discardSize),
              order: ui.thrown.map(card => ({ name: card.name, x: read(card).x })) });
          }
        }
        // 普通摸牌/得牌/给牌使用原生动画入口，副本不建立处理区的来源说明。
        const transferCard = game.createCard('sha', 'heart', 2);
        game.me.directgain([transferCard]);
        game.me.$draw([transferCard], false);
        game.me.$gain2([transferCard]);
        game.me.$give([transferCard], game.players[1], false, false);
        const transfers = [...ui.arena.querySelectorAll('.drawingcard,.gainingcard')]
          .map(card => ({ classes: card.className, used: !!card.querySelector('.used-info') }));
        return { rows, transfers };
        function inspectImmediateFlight(card) {
          const motion = card.getAnimations().find(animation => animation.id === 'xinsha-discard-motion');
          if (!motion || motion.effect.getTiming().duration !== 300) throw new Error('用牌当次未登记官方300ms飞行，仍在等待后续帧/计时器');
          const from = new DOMMatrix(getComputedStyle(card).transform), to = new DOMMatrix(card.style.transform);
          const points = [0, 75, 150, 225, 300].map(time => {
            motion.currentTime = time;
            const matrix = new DOMMatrix(getComputedStyle(card).transform);
            return { time, x: matrix.e, y: matrix.f, scale: matrix.a };
          });
          motion.currentTime = 0;
          return { from: { x: from.e, y: from.f, scale: from.a }, to: { x: to.e, y: to.f, scale: to.a }, points };
        }
      });
      for (const row of result.rows) {
        assert.ok(row.used, 'processing-area arrival card keeps source label during flight');
        assert.ok(Math.abs(row.first.width - row.source.width) < .1, 'first frame keeps hand size');
        assert.ok(Math.abs(row.final.scale - row.expectedScale) < .001, 'ends at configured discard size');
        assert.ok(row.frames.some(frame => Math.abs(frame.y - row.first.y) > 10), 'card moves during flight');
        if (style === 'othersOff') {
          assert.ok(Math.abs(row.frames[2].y - row.first.y) > 1, 'first visible frames must start flying without a hold');
          const sine = [0, .3826834323650898, .7071067811865476, .9238795325112867, 1];
          row.curve.points.forEach((point, index) => {
            for (const key of ['x', 'y']) assert.ok(Math.abs(point[key] - (row.curve.from[key] + (row.curve.to[key] - row.curve.from[key]) * sine[index])) < .002, `official EaseSineOut at ${point.time}ms/${key}`);
            assert.ok(Math.abs(point.scale - (row.curve.from.scale + (row.curve.to.scale - row.curve.from.scale) * index / 4)) < .00001, `official linear scale at ${point.time}ms`);
          });
        }
        if (row.handSize !== row.discardSize) {
          assert.ok(row.frames.some(frame => frame.scale > Math.min(row.first.scale, row.final.scale) + .005 &&
            frame.scale < Math.max(row.first.scale, row.final.scale) - .005), 'intermediate scale during flight');
        }
        const order = [...row.order].sort((a, b) => a.x - b.x).map(card => card.name);
        const names = ['sha', 'shan', 'tao'].slice(0, row.order.length);
        assert.deepEqual(order, style === 'othersOff' ? names.reverse() : names, `${style}: processing order`);
      }
      assert.ok(result.transfers.length >= 3);
      assert.ok(result.transfers.every(card => !card.used));
      assert.deepEqual(errors, []);
      results.push({ style, ...result, errors });
      console.log('YJCM_DISCARD_MOTION_OK', style);
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'yjcm-discard-motion-results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
