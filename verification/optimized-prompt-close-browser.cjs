const fs = require('node:fs');
const path = require('node:path');
const { installNativeHarness, server, chromium, assert } = require('./optimized-prompt-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    await installNativeHarness(page, origin, false);
    await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/dialogOK.css` });
    // 使用本体真实的延迟删除，不能以立即 remove() 代替退出动画。
    const polyfill = fs.readFileSync(path.resolve(__dirname, '../../../noname/init/polyfill.js'), 'utf8');
    await page.addScriptTag({ content: polyfill.slice(polyfill.indexOf('HTMLDivElement.prototype.delete ='), polyfill.indexOf('HTMLDivElement.prototype.goto =')) });
    await page.evaluate(() => {
      window.beginPrompt = () => {
        clearOptimizedPrompts();
        _status.event = { name: 'chooseBool', skill: 'test_skill', prompt: '是否发动测试技能？', prompt2: '原生技能说明', player: game.me, isMine: () => true };
        const dialog = ui.create.dialog(_status.event.prompt);
        dialog.classList.add('prompt');
        _status.event.dialog = dialog;
        dialog.addText(_status.event.prompt2);
        window.closingDialog = dialog;
        window.nativeNodes = [...dialog.content.children];
        return dialog;
      };
      window.nativeVisible = () => nativeNodes.some(node => node.isConnected && node.getClientRects().length && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden');
      window.nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    });

    const closed = await page.evaluate(async () => {
      const dialog = beginPrompt();
      dialog.close();
      const beforeFrame = { mounted: dialog.isConnected, removing: dialog.classList.contains('removing'), nativeVisible: nativeVisible() };
      await nextFrame();
      const nextFrameVisible = nativeVisible();
      _status.event = { name: 'ordinary_event' };
      refreshOptimizedPrompt();
      const frames = [];
      while (dialog.isConnected) {
        frames.push(nativeVisible());
        await nextFrame();
      }
      return { ...beforeFrame, nextFrameVisible, frames: frames.length, flashedDuringRemoval: frames.some(Boolean) };
    });
    assert.equal(closed.mounted, true, '没有走本体延迟删除');
    assert.equal(closed.removing, true);
    assert.equal(closed.nativeVisible, false, 'dialog.close() 后原生提示在退出动画中闪现');
    assert.equal(closed.nextFrameVisible, false, 'dialog.close() 下一帧原生提示闪现');
    assert(closed.frames > 1, '没有逐帧观察退出期间的显示状态');
    assert.equal(closed.flashedDuringRemoval, false, '切换事件后、退出动画结束前原生提示闪现');
    await page.waitForFunction(() => !closingDialog.isConnected);

    const finished = await page.evaluate(async () => {
      const dialog = beginPrompt();
      _status.event.finished = true;
      refreshOptimizedPrompt();
      await nextFrame();
      const visible = nativeVisible();
      dialog.close();
      return visible;
    });
    assert.equal(finished, false, '事件结束后、弹窗关闭前恢复了原生提示');
    await page.waitForFunction(() => !closingDialog.isConnected);

    const reused = await page.evaluate(async () => {
      const dialog = beginPrompt();
      dialog.close();
      // 本体 fix() 取消尚未结束的删除，用同一个 dialog 重新打开。
      clearTimeout(dialog.timeout);
      delete dialog.timeout;
      dialog.classList.remove('removing');
      lib.config.extension_十周年UI_optimizePrompt = false;
      dialog.open();
      const restored = nativeVisible();
      lib.config.extension_十周年UI_optimizePrompt = true;
      refreshOptimizedPrompt();
      const optimized = !nativeVisible();
      dialog.close();
      clearOptimizedPrompts();
      await nextFrame();
      return { restored, optimized, clearedClosingVisible: nativeVisible(), className: dialog.className, data: { ...dialog.dataset }, nodeStyles: nativeNodes.map(node => ({ display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility })) };
    });
    assert.equal(reused.restored, true, '复用弹窗并关闭优化后原生提示没有恢复');
    assert.equal(reused.optimized, true, '复用弹窗后无法重新接管提示');
    assert.equal(reused.clearedClosingVisible, false, `清理模块使正在退出的弹窗闪现: ${JSON.stringify(reused)}`);
    await page.waitForFunction(() => !closingDialog.isConnected);
    assert.deepEqual(errors, []);
    console.log('OPTIMIZED_PROMPT_CLOSE_OK', JSON.stringify({ delayedClose: closed, finishedHidden: !finished, reused, errors }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
