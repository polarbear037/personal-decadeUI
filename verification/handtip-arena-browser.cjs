const fs = require('node:fs');
const path = require('node:path');
const { installNativeHarness, server, chromium, assert } = require('./optimized-prompt-browser.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await installNativeHarness(page, `http://127.0.0.1:${server.address().port}`, false);
    const result = await page.evaluate(() => {
      const first = decadeUI.showHandTip('第一场提示');
      first.setInfomation('附加说明');
      first.close();
      first.remove();
      first.$info.remove();
      const reused = decadeUI.showHandTip('第二场提示');
      reused.setInfomation('第二场说明');
      reused.show();
      const afterClear = { same: reused === first, connected: reused.isConnected, infoConnected: reused.$info.isConnected };
      const oldArena = ui.arena;
      ui.arena = oldArena.cloneNode(false);
      oldArena.replaceWith(ui.arena);
      reused.show();
      const afterReplace = { parent: reused.parentNode === ui.arena, infoParent: reused.$info.parentNode === ui.arena };
      reused.close();
      _status.event = { name: 'chooseBool', prompt: '是否发动技能？', player: game.me, isMine: () => true };
      const dialog = ui.create.dialog(_status.event.prompt);
      _status.event.dialog = dialog;
      refreshOptimizedPrompt();
      const active = decadeUI.statics.handTips.find(tip => tip.classList.contains('decade-optimized-hand-tip'));
      active.remove();
      refreshOptimizedPrompt();
      const activeRecovered = active.parentNode === ui.arena && !active.closed && !active.classList.contains('hidden');
      return { afterClear, afterReplace, activeRecovered, poolSize: decadeUI.statics.handTips.length };
    });
    assert.equal(result.afterClear.same, true, '应复用缓存提示');
    assert.equal(result.afterClear.connected, true, '清场后缓存提示未挂回场景');
    assert.equal(result.afterClear.infoConnected, true, '附加说明未挂回场景');
    assert.deepEqual(result.afterReplace, { parent: true, infoParent: true });
    assert.equal(result.activeRecovered, true, '活跃提示脱离 DOM 后未恢复');
    assert.equal(result.poolSize, 1, '恢复不应新增缓存提示');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(__dirname, 'handtip-arena-results.json'), JSON.stringify({ ...result, errors }, null, 2));
    console.log('HANDTIP_ARENA_OK', JSON.stringify(result));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
