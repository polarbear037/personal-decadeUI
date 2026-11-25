const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');

const baseline = process.argv.includes('--baseline');
(async () => {
  Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'],
    extension_十周年UI_newDecadeStyle: 'othersOff', game_speed: 'vfast', duration: 300,
    // 夹具只启用十周年UI，没有皮肤切换；排除依赖 skinSwitch 的玻璃勾玉播放器。
    hp_style: 'round', sync_speed: true, mode_config: { identity: { player_number: '2' } } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { if (d.message().includes('错误信息')) errors.push(d.message()); void d.accept(); });
    page.on('console', m => { if (m.text().startsWith('EFFECT_WAIT')) console.log(m.text()); });
    await dependencies(page);
    if (baseline) await page.route('**/src/ui/discard-motion-xinsha.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: fs.readFileSync(path.join(__dirname, '../src/ui/discard-motion-xinsha.js'), 'utf8').replace('card.dispatchEvent(new Event("webkitTransitionEnd"));', ''),
    }));
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
    await page.evaluate(async () => {
      const { game, ui, lib, _status } = await import('/noname.js');
      const probe = window.cardEffectWaitProbe = { rows: [] };
      lib.config.sync_speed = true; lib.config.game_speed = 'vfast'; lib.config.duration = 300;
      lib.config.animation = true; lib.config.low_performance = false;
      const { installCardBeautify } = await import('/extension/雷的一将/utils/cardBeautify.js');
      await installCardBeautify();
      lib.skill._card_effect_wait_probe = {
        trigger: { global: 'phaseUseBegin' }, forced: true, silent: true, charlotte: true, firstDo: true, priority: Infinity,
        filter: () => !probe.started,
        async content() {
          probe.started = true;
          const other = game.players.find(p => p !== game.me);
          game.me.init('liubei'); other.init('caocao');
          for (const actor of [game.me, other]) for (const name of ['tao', 'wuzhong', 'sha']) {
            const target = name === 'sha' ? game.players.find(p => p !== actor) : actor;
            actor.hp = 3; actor.maxHp = 4; target.hp = 3; target.maxHp = 4;
            actor.update(); target.update();
            const card = game.createCard(name, 'heart', 3);
            actor.directgain([card]);
            await game.delay(0, 550);
            const row = { own: actor === game.me, name, listeners: [], hpBefore: target.hp };
            probe.rows.push(row);
            console.log('EFFECT_WAIT', row.own, name);
            const began = performance.now();
            const originalThrow = actor.$throw;
            const originalRecover = target.$recover;
            target.$recover = function(...args) {
              row.recoverEffectAt = performance.now() - began;
              return originalRecover.apply(this, args);
            };
            actor.$throw = function(...args) {
              const clone = originalThrow.apply(this, args);
              if (clone?.name === name && row.thrownAt == null) {
                row.thrownAt = performance.now() - began;
                const listen = clone.listenTransition;
                clone.listenTransition = function(callback, timeout) {
                  return listen.call(this, function() {
                    row.listeners.push(performance.now() - began);
                    callback.call(this);
                  }, timeout);
                };
                const sample = () => {
                  const motion = clone.getAnimations().find(a => a.id === 'xinsha-discard-motion');
                  if (motion) {
                    motion.finished.then(() => { row.motionEndedAt = performance.now() - began; }, () => {
                      // 旧弃牌离区会重排并替换当前动画，须跟踪替换后的真实完成时刻。
                      if (performance.now() - began < 1500) requestAnimationFrame(sample);
                    });
                  } else if (clone.isConnected && performance.now() - began < 1500) requestAnimationFrame(sample);
                };
                requestAnimationFrame(sample);
              }
              return clone;
            };
            try {
              const use = actor.useCard(card, target);
              use.directHit = [target];
              row.delayx = use.delayx;
              use.pushHandler((event, state) => {
                if (state.state === 'begin' && event.step === 11 && row.effectAt == null) row.effectAt = performance.now() - began;
              });
              await use;
              row.returnedAt = performance.now() - began;
              row.hpAfter = target.hp;
            } finally { actor.$throw = originalThrow; target.$recover = originalRecover; }
            row.gapAfterMotion = row.effectAt - row.motionEndedAt;
          }
          probe.done = true; game.pause();
        },
      };
      game.addGlobalSkill('_card_effect_wait_probe');
      if (!_status.auto) ui.click.auto('forced');
      game.resume2(); game.resume();
    });
    await page.waitForFunction(() => cardEffectWaitProbe.done, {}, { timeout: 60000 }).catch(async e => {
      console.log('EFFECT_WAIT_TIMEOUT', JSON.stringify(await page.evaluate(async () => {
        const { _status } = await import('/noname.js');
        return { probe: window.cardEffectWaitProbe, event: _status.event?.name, step: _status.event?.step, paused: _status.paused };
      })), errors);
      throw e;
    });
    const result = await page.evaluate(() => cardEffectWaitProbe);
    fs.writeFileSync(path.join(__dirname, `yjcm-card-effect-wait-${baseline ? 'before' : 'after'}-results.json`), JSON.stringify({ result, errors }, null, 2) + '\n');
    assert.equal(result.rows.length, 6);
    for (const row of result.rows) {
      assert.notEqual(row.delayx, false, '普通牌仍须等待飞行，不能取消AI出牌间隔');
      assert(Number.isFinite(row.motionEndedAt) && row.listeners.length, '须经过真实WAAPI与原生过渡等待');
      if (baseline) assert(row.gapAfterMotion > 450, '复现飞行结束后仍等待约1秒超时');
      else {
        assert(row.effectAt >= row.motionEndedAt - 35, '效果不能抢在出牌飞行之前结算');
        assert(row.gapAfterMotion < 180, '飞行结束后应立即进入牌效果，不再等待CSS超时');
      }
      if (row.name === 'tao') {
        assert.equal(row.hpAfter, row.hpBefore + 1, '真实桃回血');
        assert(Number.isFinite(row.recoverEffectAt), '须调用真实回血动画入口');
        if (!baseline) assert(row.recoverEffectAt - row.motionEndedAt < 180, '回血特效入口不再等额外超时');
      }
      if (row.name === 'sha') assert.equal(row.hpAfter, row.hpBefore - 1, '真实杀扣血');
    }
    assert.deepEqual(errors, []);
    console.log(baseline ? 'CARD_EFFECT_WAIT_TIMEOUT_REPRODUCED' : 'CARD_EFFECT_WAIT_ENGINE_OK', JSON.stringify(result.rows.map(r => ({ own: r.own, name: r.name, motion: r.motionEndedAt, effect: r.effectAt, gap: r.gapAfterMotion }))));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
