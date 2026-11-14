// 真实皮切 API / Spine 4.0 Worker：原出牌副本移除后不得把结果动画拖到(0,0)。
const path = require('node:path');
const { PNG } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const mobile = process.argv.includes('--mobile');
const zoom = Number(process.argv.find(arg => arg.startsWith('--zoom='))?.slice(7)) || (mobile ? 0.65 : 1);
const cssZoom = process.argv.includes('--css-zoom');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: mobile ? { width: 920, height: 540 } : { width: 1280, height: 720 }, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page, origin, true);
    await page.addStyleTag({ url: origin + '/layout/long2/layout.css' });
    await page.addStyleTag({ url: origin + '/extension/十周年UI/src/styles/player4.css' });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/online-judge-layout.js', 'window.syncOnlineJudgeLayout=syncOnlineJudgeLayout;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/ui/update.js', 'ui.updatej=s;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/player/card-movement-online.js', 'window.playerAddVirtualJudge=playerAddVirtualJudge;') });
    await page.addScriptTag({ content: script('extension/皮肤切换/js/modules/chukuang-worker-api.js', 'window.createChukuangWorkerApi=createChukuangWorkerApi;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/card-utils.js', 'window.playTrickJudgeResult=playTrickJudgeResult;') });
    await page.evaluate(({ origin, mobile, zoom, cssZoom }) => {
      document.head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width, initial-scale=1">');
      document.body.dataset.style = 'onlineUI';
      document.body.style.cssText = 'margin:0;width:1280px;height:720px;overflow:hidden';
      ui.arena.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:720px';
      document.querySelector('#samples').style.display = 'none';
      if (cssZoom) document.body.style.zoom = zoom;
      else document.body.style.transform = `scale(${zoom})`;
      window.documentZoom = zoom;
      game.documentZoom = zoom;
      lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI';
      window.decadeUI = {
        get: { bodySize: () => ({ width: document.body.clientWidth, height: document.body.clientHeight }) },
        layout: { invalidateDiscard() {} },
      };
      window.skinSwitch = { url: `${origin}/extension/皮肤切换/`, configKey: {}, isMobile: () => mobile };
      Object.assign(skinSwitch, createChukuangWorkerApi(lib, ui, game, _status));
      skinSwitch.chukuangWorkerOnMessage.init = () => {};
      skinSwitch.chukuangWorkerOnMessage2.init = () => {};
      skinSwitch.chukuangWorkerInit2();
      for (const id of ['chukuang-canvas-wraper2', 'chukuang-canvas2']) {
        document.getElementById(id).style.setProperty('z-index', '-1', 'important');
      }
      window.starts = [];
      window.bounds = [];
      window.plays = [];
      const api = skinSwitch.chukuangWorkerApi;
      const originalPost = api._postPlayEffect;
      api._postPlayEffect = function(worker, message, sprite, position, onStart) {
        if (!worker.__boundsRecorded) {
          worker.__boundsRecorded = true;
          worker.onerror = error => { window.workerError = error.message; };
          const postMessage = worker.postMessage.bind(worker);
          worker.postMessage = data => {
            if (data.message === 'UPDATE_ELEMENT_BOUNDS') bounds.push({ id: data.elementId, rect: data.boundRect, attached: window.source?.isConnected });
            return postMessage(data);
          };
        }
        const isJudge = sprite.name.endsWith('/panding');
        if (isJudge) plays.push({ ...sprite, message, firstWorker: worker === skinSwitch.chukuangWorker });
        return originalPost.call(this, worker, message, sprite, position, started => { if (isJudge) starts.push(started); onStart?.(started); });
      };
      window.target = ui.create.div('.player', ui.arena);
      target.dataset.position = '1';
      target.style.cssText = 'position:absolute;left:1000px;top:140px';
      target.node = { judges: ui.create.div('.judges', target) };
      game.broadcastAll = (fn, ...args) => fn(...args);
      window.prepareSource = () => {
        const card = makeSample('lebu');
        card.isCard = true;
        card.fix = () => card;
        const clone = card.copy('thrown');
        clone.name = card.name;
        clone.style.cssText = 'position:absolute;left:480px;top:240px;width:108px;height:150px;transition:none!important';
        ui.arena.append(clone);
        card.clone = clone;
        window.source = clone;
        window.physical = card;
        ui.thrown = [clone];
        bounds.length = 0;
      };
    }, { origin, mobile, zoom, cssZoom });
    const results = [];
    for (const success of [true, false]) {
      await page.evaluate(success => { prepareSource(); playTrickJudgeResult(source, success, decadeUI); }, success);
      await page.waitForFunction(count => starts.length >= count, results.length + 1);
      assert.equal(await page.evaluate(() => starts.at(-1)), true, '真实 Spine 必须加载并开始播放');
      assert.deepEqual(await page.evaluate(() => ({
        message: plays.at(-1).message,
        firstWorker: plays.at(-1).firstWorker,
        secondLayer: ['chukuang-canvas-wraper2', 'chukuang-canvas2'].map(id => {
          const style = document.getElementById(id).style;
          return [style.getPropertyValue('z-index'), style.getPropertyPriority('z-index')];
        }),
      })), { message: 'PLAY_EFFECT', firstWorker: true, secondLayer: [['-1', 'important'], ['-1', 'important']] }, '判定必须走第一画布，不能抬升七星所在第二画布');
      // 存在时继续跟随；随后经过正式贴牌入口的100ms等待及副本移除。
      await page.evaluate(() => { source.style.left = '520px'; });
      await page.waitForFunction(() => bounds.some(item => Math.abs(item.rect.left - 520) < 1));
      if (success) await page.evaluate(() => playerAddVirtualJudge.call(target, physical, [physical]));
      else await page.evaluate(() => source.remove());
      await page.waitForFunction(() => !source.isConnected);
      await page.waitForTimeout(100);
      const state = await page.evaluate(() => ({
        samples: bounds.length,
        zero: bounds.filter(item => !item.rect.width || !item.rect.height),
        afterRemoval: bounds.filter(item => item.attached === false).map(item => item.rect),
        action: plays.at(-1).action,
      }));
      const frame = await page.screenshot({ scale: 'css', path: path.join(__dirname, `judge-effect-${success ? 'attached' : 'removed'}${mobile ? '-mobile' : ''}.png`) });
      assert.equal(state.zero.length, 0, `动画跟随了已移除的零尺寸DOM: ${JSON.stringify(state)}`);
      assert.ok(state.afterRemoval.length > 0);
      assert.ok(state.afterRemoval.every(rect => Math.abs(rect.left - 520) < 1 && Math.abs(rect.top - 240) < 1 && Math.abs(rect.width - 108) < 1));
      await page.waitForFunction(() => skinSwitch.chukuangWorkerApi._followUpdateMap.size === 0);
      assert.equal(await page.evaluate(() => document.getElementById('chukuang-canvas-wraper2').style.zIndex), '-1');
      const before = PNG.sync.read(frame), after = PNG.sync.read(await page.screenshot({ scale: 'css' }));
      const changed = (left, top, width, height) => {
        let count = 0;
        for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) {
          const i = (y * before.width + x) * 4;
          if ([0, 1, 2].reduce((sum, c) => sum + Math.abs(before.data[i + c] - after.data[i + c]), 0) > 30) count++;
        }
        return count;
      };
      const effectPixels = changed(Math.round(450 * zoom), Math.round(180 * zoom), Math.round(250 * zoom), Math.round(300 * zoom)), cornerPixels = changed(0, 0, 150, 150);
      assert.ok(effectPixels > 100, `原位置没有可见动画: ${effectPixels}`);
      assert.equal(cornerPixels, 0, '左上角出现动画像素');
      results.push({ success, samples: state.samples, action: state.action, zeroBounds: state.zero.length, effectPixels, cornerPixels });
    }
    const detached = await page.evaluate(() => { const count = plays.length; const result = playTrickJudgeResult(source, true, decadeUI); return { result, added: plays.length - count }; });
    assert.deepEqual(detached, { result: false, added: 0 });
    await page.evaluate(() => {
      lib.config.extension_雷的ol_olmouzhuge = true;
      lib.skill = { olsbzhijue: { subSkill: { effect: { async content() {} } } } };
      lib.onover = [];
      window.mouPlayer = { countMark: () => 2 };
      game.playAudio = () => {};
    });
    await page.addScriptTag({ content: script('extension/雷的ol/extension/olmouzhuge.js', 'olmouzhuge();') });
    await page.evaluate(() => lib.skill.olsbzhijue.subSkill.phuse.content({}, {}, mouPlayer));
    const secondWorker = page.workers()[0];
    let starsReady = false;
    for (let attempt = 0; attempt < 100 && !starsReady; attempt++) {
      starsReady = await secondWorker.evaluate(() => playerAnimation.getAnni(null, '4.0').nodes.some(node => !node.completed && node.name.includes('skyBDX')));
      if (!starsReady) await page.waitForTimeout(80);
    }
    assert.ok(starsReady, '第二 Worker 必须实际播出七星循环');
    await page.evaluate(() => { prepareSource(); playTrickJudgeResult(source, true, decadeUI); });
    await page.waitForFunction(() => starts.length === 3);
    assert.equal(await page.evaluate(() => plays.at(-1).firstWorker), true);
    assert.deepEqual(await page.evaluate(() => ['chukuang-canvas-wraper2', 'chukuang-canvas2'].map(id => document.getElementById(id).style.zIndex)), ['-1', '-1']);
    assert.ok(await secondWorker.evaluate(() => playerAnimation.getAnni(null, '4.0').nodes.some(node => !node.completed && node.name.includes('skyBDX'))), '判定播放期间第二 Worker 的真实七星仍在低层播放');
    await page.waitForFunction(() => skinSwitch.chukuangWorkerApi._followUpdateMap.size === 0);
    await page.evaluate(() => lib.onover.forEach(callback => callback()));
    const otherStyle = await page.evaluate(() => {
      lib.config.extension_十周年UI_newDecadeStyle = 'on';
      const effects = [];
      const runtime = { animation: { cap: { playSpineTo(card, effect) { effects.push(effect); } } } };
      playTrickJudgeResult(target, true, runtime);
      playTrickJudgeResult(target, false, runtime);
      return effects;
    });
    assert.deepEqual(otherStyle, [{ name: 'effect_panding', action: 'play4' }, { name: 'effect_panding', action: 'play5' }]);
    assert.equal(await page.evaluate(() => window.workerError), undefined);
    assert.deepEqual(errors, []);
    console.log(mobile ? 'JUDGE_EFFECT_LIFECYCLE_MOBILE_OK' : 'JUDGE_EFFECT_LIFECYCLE_OK', JSON.stringify({ results, detached, otherStyle, zoom, cssZoom, dpr: mobile ? 3 : 1, realSevenStarsConcurrent: true, errors }));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
