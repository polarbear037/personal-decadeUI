const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');

(async () => {
  Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'],
    extension_十周年UI_newDecadeStyle: 'othersOff', game_speed: 'vfast', duration: 300 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await dependencies(page);
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
    await page.evaluate(async () => {
      const { game, ui, lib, _status } = await import('/noname.js');
      const { installCardBeautify } = await import('/extension/雷的一将/utils/cardBeautify.js');
      await installCardBeautify();
      const probe = window.useMotionProbe = { operations: [], flights: [], done: false };
      const original = lib.element.Player.prototype.$throwordered2;
      lib.element.Player.prototype.$throwordered2 = function (card, ...args) {
        const clone = original.call(this, card, ...args);
        if (!probe.activeId || clone?.name !== 'wuzhong') return clone;
        const record = { id: probe.activeId, own: this === game.me, frames: [] };
        probe.flights.push(record);
        queueMicrotask(() => {
          record.registered = clone.getAnimations().some(a => a.id === 'xinsha-discard-motion');
        });
        const sample = () => {
          const a = clone.getAnimations().find(a => a.id === 'xinsha-discard-motion');
          const matrix = new DOMMatrix(getComputedStyle(clone).transform);
          record.frames.push({ x: matrix.e, y: matrix.f, scale: matrix.a, time: a?.currentTime,
            visible: getComputedStyle(clone).visibility, face: !!clone.querySelector('.lei-yijiang-card-face') });
          if (record.frames.length < 26) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
        return clone;
      };
      lib.skill._xinsha_use_motion_probe = {
        trigger: { global: 'phaseUseBegin' }, forced: true, silent: true, charlotte: true, firstDo: true, priority: Infinity,
        filter: () => !probe.started,
        async content() {
          probe.started = true;
          for (const [index, player] of game.players.entries()) if (!lib.character[player.name]) player.init(index ? 'caocao' : 'liubei');
          for (const player of [game.me, game.players.find(p => p !== game.me)]) {
            const card = game.createCard('wuzhong', 'heart', 3);
            player.directgain([card]);
            await new Promise(resolve => setTimeout(resolve, 550));
            probe.operations.push({ id: card.cardid, own: player === game.me });
            probe.activeId = card.cardid;
            await player.useCard(card, player);
            await new Promise(resolve => setTimeout(resolve, 650));
            probe.activeId = null;
          }
          probe.done = true;
          game.pause();
        },
      };
      game.addGlobalSkill('_xinsha_use_motion_probe');
      if (!_status.auto) ui.click.auto('forced');
      game.resume2();
      game.resume();
    });
    await page.waitForFunction(() => useMotionProbe.done, {}, { timeout: 45000 });
    const lifecycle = await page.evaluate(async () => {
      const { game, ui, lib } = await import('/noname.js');
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      const read = card => { const m = new DOMMatrix(getComputedStyle(card).transform); return { x: m.e, y: m.f, scale: m.a }; };
      const add = name => {
        const card = game.createCard(name, 'heart', 3);
        card.throwordered = true;
        card.style.transform = 'translate(100px,500px) scale(1.2)';
        game.me.$throwordered2(card);
        return card;
      };
      const first = add('sha');
      await new Promise(resolve => setTimeout(resolve, 90));
      const before = read(first);
      const second = add('shan');
      await Promise.resolve();
      const after = read(first);
      const copy = first.copy();
      const copyClean = !copy.getAnimations().length && copy.style.getPropertyPriority('transition-property') !== 'important';
      decadeUI.layout.resize();
      const resize = ui.thrown.every(card => !card.getAnimations().some(a => a.id === 'xinsha-discard-motion') && Math.abs(read(card).x - new DOMMatrix(card.style.transform).e) < .002);
      const removed = add('tao');
      await Promise.resolve();
      removed.remove();
      await frame(); await frame();
      const removal = !removed.getAnimations().some(a => a.id === 'xinsha-discard-motion');
      second.style.transform = 'translate(200px,500px) scale(1)';
      decadeUI.layout.updateDiscard();
      lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI';
      decadeUI.layout.updateDiscard();
      const styleExit = ui.thrown.every(card => !card.getAnimations().some(a => a.id === 'xinsha-discard-motion'));
      lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
      return { before, after, copyClean, resize, removal, styleExit };
    });
    const result = await page.evaluate(() => useMotionProbe);
    fs.writeFileSync(path.join(__dirname, 'yjcm-use-card-motion-engine-results.json'), JSON.stringify({ result, lifecycle, errors }, null, 2) + '\n');
    assert.equal(result.operations.length, 2);
    for (const op of result.operations) {
      const flight = result.flights.find(f => f.id === op.id);
      assert(flight?.registered, '真实useCard/lose当次应建立飞行');
      assert(flight.frames.length >= 20);
      const start = flight.frames[0], end = flight.frames.at(-1);
      assert(flight.frames.slice(1, 4).some(f => Math.hypot(f.x - start.x, f.y - start.y) > 2), '真实用牌首几帧必须开始位移');
      assert(flight.frames.some(f => f.time > 15 && f.time < 290 && f.face && f.visible === 'visible'), '实际美化牌面飞行途中可见');
      assert(Math.hypot(end.x - start.x, end.y - start.y) > 10);
    }
    for (const key of ['x', 'y', 'scale']) assert(Math.abs(lifecycle.before[key] - lifecycle.after[key]) < .002, '连续出牌重排应从当前绘制位置衔接');
    for (const key of ['copyClean', 'resize', 'removal', 'styleExit']) assert(lifecycle[key], key);
    assert.deepEqual(errors, []);
    console.log('YJCM_USE_CARD_MOTION_ENGINE_OK: native useCard/lose, self/remote, actual card faces and immediate movement');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
