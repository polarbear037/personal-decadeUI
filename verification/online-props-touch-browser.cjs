const { server, chromium, assert } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function check(browser, origin, legacy) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  try {
    await page.goto(origin + '/__card_verification__');
    await page.evaluate(legacy => {
      document.head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width,initial-scale=1">');
      const map = document.createElement('script'); map.type = 'importmap';
      map.textContent = JSON.stringify({ imports: { noname: '/noname.js', vue: '/node_modules/vue/dist/vue.esm-browser.js' } }); document.head.append(map);
      if (legacy) {
        window.PointerEvent = undefined;
        const add = window.addEventListener;
        window.addEventListener = function(type, ...args) { if (!type.startsWith('pointer')) return add.call(this, type, ...args); };
      }
    }, legacy);
    await page.addStyleTag({ url: origin + '/extension/十周年UI/ui/styles/lbtn/online.css' });
    await page.evaluate(async origin => {
      const runtime = await import('/noname.js'); await import('/noname/init/polyfill.js');
      Object.assign(window, runtime);
      lib.config = { extension_十周年UI_newDecadeStyle: 'onlineUI', touchscreen: true };
      lib.assetURL = origin + '/'; _status.touchconfirmed = true;
      document.body.dataset.style = 'onlineUI';
      document.head.insertAdjacentHTML('beforeend', '<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#window{position:absolute;inset:0}.player{position:absolute;width:130px;height:175px;top:80px}.avatar{position:absolute;inset:0}.anniubutton{position:relative;width:50px;height:50px}.rightbuttons{position:absolute;right:10px;bottom:20px}</style>');
      ui.window = document.createElement('div'); ui.window.id = 'window'; document.body.append(ui.window);
      ui.create.div = (selector, parent) => { const node = document.createElement('div'); node.className = selector.replace(/^\./, '').replaceAll('.', ' '); parent?.append(node); return node; };
      window.throws = []; window.nativeInputs = []; window.nativeThrow = 0;
      lib.element.Player.prototype.$throwEmotion = () => { nativeThrow++; };
      game.players = [120, 760, 980].map((x, index) => {
        const player = document.createElement('div'); player.className = 'player'; player.style.left = x + 'px';
        player.innerHTML = '<div class="avatar"></div>'; player.node = { avatar: player.firstChild }; player.dataset.position = String(index);
        player.isIn = () => true; player.isDead = () => false;
        player.throwEmotion = (target, emotion) => throws.push({ target: target.dataset.position, emotion });
        ui.window.append(player); return player;
      });
      game.me = game.players[0]; game.dead = [];
      game.send = (type, target, emotion) => throws.push({ type, target: target.dataset.position, emotion });
      // 先安装头像/拍一拍输入，确认道具打开期间 window 捕获能阻断它们。
      for (const type of ['click', 'touchstart', 'touchend', 'dblclick', 'contextmenu']) document.addEventListener(type, event => {
        if (event.target.closest('.player')) nativeInputs.push(type);
      }, true);
      const { createOnlineLbtnPlugin } = await import('/extension/十周年UI/ui/lbtn/skins/online.js');
      createOnlineLbtnPlugin(lib, game, ui, get, ai, _status, {}).createBottomButtons();
      window.controller = game.decadeOnlineProps;
    }, origin);
    await page.locator('[data-online-prop-button]').tap();
    assert.equal(await page.locator('.online-prop-item').count(), 4, '触摸入口打开道具窗口');
    await page.locator('[data-emotion="egg"]').tap();
    assert.equal(await page.evaluate(() => controller.selected?.emotion), 'egg', '触摸选中鸡蛋');
    const target = page.locator('.player').nth(1).locator('.avatar');
    await target.tap();
    assert.deepEqual(await page.evaluate(() => throws), [{ target: '1', emotion: 'egg' }], `${legacy ? 'touch-only' : 'pointer+touch'} 轻点应投掷一次`);
    await page.waitForTimeout(120); await target.dispatchEvent('click');
    assert.equal(await page.evaluate(() => throws.length), 1, '延迟到来的兼容 click 不重复投掷');
    await target.tap();
    assert.equal(await page.evaluate(() => throws.length), 2, '连续轻点不被重复 click 防护吞掉');

    const cdp = await context.newCDPSession(page);
    const box = await target.boundingBox(); const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await page.waitForTimeout(120);
    const beforeHold = await page.evaluate(() => throws.length);
    await touch('touchStart', [{ x, y, id: 1 }]); await page.waitForTimeout(660); await touch('touchEnd', []);
    const holdCount = await page.evaluate(before => throws.length - before, beforeHold);
    assert(holdCount >= 3 && holdCount <= 4, `触摸长按 200ms 连投: ${holdCount}`);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => throws.length), beforeHold + holdCount, '松手立即停止连投');
    const beforeCancel = await page.evaluate(() => throws.length);
    await touch('touchStart', [{ x, y, id: 1 }]); await touch('touchCancel', []); await page.waitForTimeout(260);
    assert.equal(await page.evaluate(() => throws.length), beforeCancel, 'touchcancel 不投掷且停止定时器');
    await touch('touchStart', [{ x, y, id: 1 }]); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(260); await touch('touchEnd', []);
    assert.equal(await page.evaluate(() => throws.length), beforeCancel, '失焦停止长按，恢复后的松手不投掷');
    await touch('touchStart', [{ x, y, id: 1 }]); await touch('touchMove', [{ x: x - 180, y, id: 1 }]); await touch('touchEnd', []);
    await page.waitForTimeout(260);
    assert.equal(await page.evaluate(() => throws.length), beforeCancel, '滑出目标取消投掷');
    await touch('touchStart', [{ x, y, id: 1 }]); await touch('touchStart', [{ x, y, id: 1 }, { x: x + 50, y, id: 2 }]);
    await page.waitForTimeout(260); await touch('touchEnd', []);
    assert.equal(await page.evaluate(() => throws.length), beforeCancel, '多指触摸取消长按');
    assert.deepEqual(await page.evaluate(() => nativeInputs), [], '选目标期间不触发头像入口');

    await page.evaluate(() => { game.online = true; });
    for (const emotion of ['flower', 'wine', 'shoe', 'egg']) {
      await page.locator(`[data-emotion="${emotion}"]`).tap(); await page.waitForTimeout(120); await target.tap();
      assert.deepEqual(await page.evaluate(() => throws.at(-1)), { type: 'throwEmotion', target: '1', emotion });
    }
    await touch('touchStart', [{ x, y, id: 1 }]);
    await page.evaluate(() => controller.hide()); await touch('touchEnd', []);
    const afterClose = await page.evaluate(() => throws.length); await page.waitForTimeout(260);
    assert.equal(await page.evaluate(() => throws.length), afterClose, '关闭窗口停止长按');
    await target.tap(); assert((await page.evaluate(() => nativeInputs.length)) > 0, '关闭后恢复头像触摸');
    await page.locator('[data-online-prop-button]').tap(); assert.equal(await page.locator('.online-prop-panel').count(), 1);
    await page.locator('[data-online-prop-button]').tap(); assert.equal(await page.locator('.online-prop-panel').count(), 0, '触摸入口再次点击关闭，不被兼容 click 二次切换');
    await page.evaluate(() => { lib.config.extension_十周年UI_newDecadeStyle = 'on'; controller.show(); lib.element.Player.prototype.$throwEmotion(); });
    assert.equal(await page.locator('.online-prop-panel').count(), 0); assert.equal(await page.evaluate(() => nativeThrow), 1);
    assert.deepEqual(errors, []);
    console.log(`ONLINE_PROPS_TOUCH_OK ${legacy ? 'touch-only WebView fallback' : 'pointer+touch'}: tap/hold/cancel/move/multitouch/four props/send/close/style; browser errors: 0`);
  } finally { await context.close(); }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try { for (const legacy of [true, false]) await check(browser, `http://127.0.0.1:${server.address().port}`, legacy); }
  finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
