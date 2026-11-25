const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium } = require('./online-player-tips-browser.cjs');
const root = path.resolve(__dirname, '..');
const key = 'extension_十周年UI_yjcmBackground';

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 750 } });
    const errors = [], failures = [], reports = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) failures.push(response.status() + ' ' + response.url()); });
    await page.route('**/wallpaper-probe', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"data:text/javascript,export{}"}}</script><style>html,body{margin:0;width:100%;height:100%}#background,#window{position:absolute;inset:0}#background{background-size:cover}#window{pointer-events:none}.yjcm-wallpaper-overlay{pointer-events:auto}</style><body data-style="othersOff"><div id="background"></div><div id="window"></div>` }));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin + '/wallpaper-probe');
    await page.addStyleTag({ url: origin + '/extension/十周年UI/ui/styles/lbtn/xinsha-official.css' });
    await page.addScriptTag({ url: origin + '/extension/十周年UI/src/libs/spine.js' });
    await page.evaluate(async key => {
      window.wallpaperContexts = new Set();
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        const context = getContext.call(this, type, ...args);
        if (type.includes('webgl') && context) wallpaperContexts.add(context);
        return context;
      };
      window.documentZoom = 1;
      window.lib = { assetURL: '/', config: { extension_十周年UI_newDecadeStyle: 'othersOff' } };
      window.ui = { background: document.querySelector('#background'), window: document.querySelector('#window') };
      window._status = {};
      window.game = {
        saveConfig: (key, value) => { lib.config[key] = value; },
        pause2() {}, resume2() {},
        updateBackground() {
          const background = document.createElement('div'); background.id = 'background';
          background.style.backgroundImage = `url("/extension/${_status.tempBackground.slice(4)}")`;
          ui.background.replaceWith(background); ui.background = background;
        },
      };
      window.mode = 'identity';
      const { createXinshaBackgroundSelector } = await import('/extension/十周年UI/ui/lbtn/skins/xinsha-background-selector.js');
      const { xinshaBackgrounds } = await import('/extension/十周年UI/ui/lbtn/skins/xinsha-backgrounds.js');
      window.entries = xinshaBackgrounds;
      window.selector = createXinshaBackgroundSelector(lib, game, ui, { mode: () => mode }, _status);
      // 旧版持久化的 dynamic:false 不再使所有后续选择都停在静态版。
      lib.config[key] = { allModes: true, global: { id: 22, dynamic: false } };
      selector.open();
    }, key);
    const tile = id => page.locator(`.yjcm-wallpaper-tile[data-wallpaper="${id}"]`);
    const toggle = page.getByRole('switch', { name: '动态背景' });
    const entries = await page.evaluate(() => entries);
    assert.equal(await page.locator('.yjcm-wallpaper-tile').count(), entries.length);
    for (const entry of entries) {
      assert.equal(await tile(entry.id).locator('.yjcm-wallpaper-animated').count(), entry.animations.length ? 1 : 0, entry.name);
      if (!entry.animations.length) continue;
      for (const animation of entry.animations) for (const suffix of ['.skel', '.atlas', '.png']) {
        assert(fs.existsSync(path.join(root, 'ui/assets/lbtn/yijiang', animation.path + suffix)), animation.path + suffix);
      }
      await tile(entry.id).click();
      await page.waitForFunction(() => {
        const canvas = ui.background.querySelector('canvas');
        return canvas && getComputedStyle(canvas).visibility === 'visible';
      }, null, { timeout: 15000 });
      assert.equal(await toggle.getAttribute('aria-checked'), 'true');
      const pixels = await page.evaluate(async () => {
        const canvas = ui.background.querySelector('canvas');
        const output = document.createElement('canvas'); output.width = 240; output.height = 120;
        const ctx = output.getContext('2d');
        const sample = () => new Promise(resolve => requestAnimationFrame(() => {
          ctx.clearRect(0, 0, 240, 120); ctx.drawImage(canvas, 0, 0, 240, 120);
          resolve(Array.from(ctx.getImageData(0, 0, 240, 120).data));
        }));
        const before = await sample(); await new Promise(resolve => setTimeout(resolve, 650)); const after = await sample();
        return { opaque: after.filter((value, i) => i % 4 === 3 && value > 0).length, changed: after.filter((value, i) => value !== before[i]).length };
      });
      assert(pixels.opaque > 0, entry.name + ': empty canvas; ' + errors.join(' | '));
      assert(pixels.changed > 0, entry.name + ': animation did not change pixels');
      reports.push({ id: entry.id, name: entry.name, ...pixels });
      assert.equal(await page.evaluate(() => [...wallpaperContexts].filter(gl => !gl.isContextLost()).length), 1, 'old background context must be released');
    }
    // 静态 -> 动态不会关掉偏好；手动关闭仍跨背景、恢复和模式保存。
    await tile(22).click(); assert.equal(await page.locator('#background canvas').count(), 0);
    assert(await toggle.isDisabled());
    await tile(1).click(); await page.waitForFunction(() => ui.background.querySelector('canvas')?.style.visibility === 'visible');
    await toggle.click(); assert.equal(await page.locator('#background canvas').count(), 0);
    await tile(22).click(); await tile(2).click();
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    assert.equal(await page.locator('#background canvas').count(), 0);
    await page.evaluate(() => selector.restore()); assert.equal(await page.locator('#background canvas').count(), 0);
    await toggle.click(); await page.waitForFunction(() => ui.background.querySelector('canvas')?.style.visibility === 'visible');
    for (const viewport of [{width: 1280, height: 720}, {width: 1500, height: 750}]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(() => {
        const canvas = ui.background.querySelector('canvas');
        return canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight;
      });
    }
    await page.getByRole('checkbox').uncheck(); await tile(22).click();
    await page.evaluate(async () => { mode = 'doudizhu'; await selector.restore(); });
    await page.waitForFunction(() => ui.background.querySelector('canvas')?.style.visibility === 'visible');
    await page.evaluate(async () => { mode = 'identity'; await selector.restore(); });
    assert.equal(await page.locator('#background canvas').count(), 0);
    // 异步加载期间换回静态，旧回调不能复活画布。
    await page.evaluate(() => {
      document.querySelector('[data-wallpaper="0"]').click();
      document.querySelector('[data-wallpaper="22"]').click();
    });
    await page.waitForTimeout(800); assert.equal(await page.locator('#background canvas').count(), 0);
    assert.equal(await page.evaluate(() => [...wallpaperContexts].filter(gl => !gl.isContextLost()).length), 0);
    assert.equal(await page.locator('.yjcm-wallpaper-clouds').count(), 0);
    await tile(3).click();
    await page.waitForFunction(() => ui.background.querySelector('canvas')?.dataset.playing === 'true');
    const performance = await page.evaluate(async () => {
      const canvas = ui.background.querySelector('canvas'), gl = canvas.getContext('webgl');
      const clear = gl.clear;
      let draws = 0;
      gl.clear = function (...args) { draws++; return clear.apply(this, args); };
      await new Promise(resolve => setTimeout(resolve, 100));
      const observer = new MutationObserver(() => {});
      observer.observe(canvas, { attributes: true });
      const before = draws;
      await new Promise(resolve => setTimeout(resolve, 200));
      const steadyDraws = draws - before, writes = observer.takeRecords().length;
      observer.disconnect();
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      const hiddenStart = draws;
      await new Promise(resolve => setTimeout(resolve, 100));
      const hiddenDraws = draws - hiddenStart;
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 200));
      const resumedDraws = draws - hiddenStart;
      gl.clear = clear;
      return { steadyDraws, writes, hiddenDraws, resumedDraws };
    });
    assert(performance.steadyDraws > 0);
    assert.equal(performance.writes, 0, 'stable wallpaper must not write DOM attributes each frame');
    assert.equal(performance.hiddenDraws, 0, 'hidden wallpaper must stop drawing');
    assert(performance.resumedDraws > 0, 'visible wallpaper must resume drawing');
    await tile(22).click();
    await page.evaluate(async () => {
      document.querySelector('.yjcm-wallpaper-overlay').remove();
      lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI';
      const before = ui.background;
      selector.open(); await selector.restore();
      if (before !== ui.background) throw new Error('Online background changed');
    });
    assert.equal(await page.locator('.yjcm-wallpaper-overlay').count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(failures, []);
    fs.writeFileSync(path.join(__dirname, 'xinsha-background-results.json'), JSON.stringify({ scope: 'Isolated Edge browser, real selector and Spine resources; not Electron gameplay', reports, performance, errors, failures }, null, 2));
    console.log('PASS ' + reports.length + ' animated backgrounds: visible changing pixels; static badges, switch persistence, restore, mode scope, stale callback and Online isolation');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
