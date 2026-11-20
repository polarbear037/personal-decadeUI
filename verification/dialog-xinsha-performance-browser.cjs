// 真实Dialog和布局：稳定状态写入、无关变更隔离、反复替换/关闭后的资源释放。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const result = { cases: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    page.on('pageerror', error => result.errors.push(error.message));
    await bootstrap(page, origin, true);
    for (const name of ['layout', 'dialog', 'animation', 'meihua']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/${name}-xinsha.css` });
    await page.evaluate(() => {
      document.body.dataset.style = 'othersOff';
      document.body.innerHTML = '<div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_xinsha"></div></div>';
      ui.window = document.querySelector('#window'); ui.arena = document.querySelector('#arena');
      ui.window.style.cssText = 'position:absolute;inset:0'; ui.arena.style.cssText = 'position:absolute;inset:12px 36px 8px';
      ui.update = ui.refresh = () => {}; ui.dialogs = []; ui.controls = []; ui.updates = []; game.me = {};
      lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
      ui.create.caption = (text, parent) => { const n = ui.create.div('.caption', parent); n.textContent = text; return n; };
      HTMLDivElement.prototype.show = function () { this.classList.remove('hidden'); return this; };
      HTMLDivElement.prototype.hide = function () { this.classList.add('hidden'); return this; };
      HTMLDivElement.prototype.delete = function () { this.remove(); };
      HTMLDivElement.prototype.refocus = HTMLDivElement.prototype.unfocus = () => {};
      Array.prototype.remove = function (value) { const i = this.indexOf(value); if (i >= 0) this.splice(i, 1); };
      window.observers = { mutations: new Set(), resizes: new Set() };
      const MO = window.MutationObserver, RO = window.ResizeObserver;
      window.MutationObserver = class extends MO {
        observe(...args) { observers.mutations.add(this); return super.observe(...args); }
        disconnect() { observers.mutations.delete(this); return super.disconnect(); }
      };
      window.ResizeObserver = class extends RO {
        observe(...args) { observers.resizes.add(this); return super.observe(...args); }
        disconnect() { observers.resizes.delete(this); return super.disconnect(); }
      };
      window.settle = () => new Promise(resolve => setTimeout(resolve, 150));
    });
    for (const [file, expose] of [
      ['noname/library/element/dialog.js', 'window.EngineDialog=Dialog;lib.element.Dialog=Dialog;'],
      ['extension/十周年UI/src/ui/dialog-ol-layout.js', 'Object.assign(window,{prepareDialogOlOpen,updateDialogOlLayout,syncDialogOlLayoutMarker,releaseDialogOlLayout});'],
      ['extension/十周年UI/src/ui/dialog-ol-controls.js', 'window.syncDialogOlControls=syncDialogOlControls;'],
    ]) await page.addScriptTag({ content: script(file, expose) });
    await page.evaluate(() => {
      EngineDialog.prototype.open = function () {
        prepareDialogOlOpen(this, ui.arena, '测试'); this.classList.remove('hidden'); ui.arena.append(this); ui.dialog = this; ui.update(); return this;
      };
      EngineDialog.prototype.close = function () { this.remove(); ui.dialog = null; syncDialogOlControls(null, ui.arena, ui.window, ui.update); };
      ui.update = () => { updateDialogOlLayout(ui.dialog, ui.arena); syncDialogOlControls(ui.dialog, ui.arena, ui.window, ui.update); };
      window.makeBar = () => {
        document.querySelector('#jindutiaopl')?.remove();
        const bar = document.createElement('div'); bar.id = 'jindutiaopl'; bar.dataset.yjcmProgress = '4';
        bar.innerHTML = '<div style="width:75%"><img src="' + lib.assetURL + 'extension/十周年UI/image/ui/progress/xinsha/xf_newTimeBar_1.png"></div>';
        document.body.append(bar); return bar;
      };
      window.openDialog = () => {
        const dialog = new EngineDialog('测试：请选择一张牌', 'hidden', 'forcebutton');
        const area = ui.create.div('.buttons', dialog.content); area.style.height = '120px';
        dialog.open(); window.currentDialog = dialog; return dialog;
      };
    });
    // 普通框、固定按钮框和缩放下，稳定的重复更新不能重写样式。
    for (const zoom of [1, 1.5]) for (const fixed of [false, true]) {
      await page.evaluate(({ zoom, fixed }) => {
        document.body.style.zoom = zoom; openDialog();
        if (fixed) currentDialog.dataset.xinshaActionButtons = 'window';
        makeBar(); ui.update();
        currentDialog.querySelector('.dialog-ol-footer').innerHTML = '请选择<span data-type="player">界陈宫</span>的一张牌';
      }, { zoom, fixed });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const metrics = await page.evaluate(async () => {
        const layout = currentDialog._dialogOlControls.promptLayout;
        const original = layout.update; let calls = 0, writes = 0; const writeKeys = {};
        layout.update = function (...args) { calls++; return original.apply(this, args); };
        const setProperty = CSSStyleDeclaration.prototype.setProperty;
        CSSStyleDeclaration.prototype.setProperty = function (...args) { writes++; const key = args[0] + ': ' + this.getPropertyValue(args[0]) + ' -> ' + args[1]; writeKeys[key] = (writeKeys[key] || 0) + 1; return setProperty.apply(this, args); };
        try {
          for (let i = 0; i < 60; i++) layout.update();
          const stableWrites = writes, stableKeys = { ...writeKeys };
          calls = 0;
          const unrelated = ui.create.div('', ui.arena);
          await settle(); calls = 0;
          for (let i = 0; i < 100; i++) { unrelated.style.transform = `translateX(${i}px)`; unrelated.className = `unrelated-${i}`; }
          await settle();
          const unrelatedUpdates = calls;
          const footer = currentDialog.querySelector('.dialog-ol-footer');
          footer.textContent = '更新后的提示'; await settle();
          const promptUpdated = [...document.querySelectorAll('.dialog-xinsha-prompt-overlay')].some(n => n.textContent === '更新后的提示');
          unrelated.remove();
          return { stableWrites, stableKeys, unrelatedUpdates, promptUpdated };
        } finally { CSSStyleDeclaration.prototype.setProperty = setProperty; layout.update = original; }
      });
      assert.equal(metrics.stableWrites, 0, JSON.stringify({ zoom, fixed, metrics }));
      assert.equal(metrics.unrelatedUpdates, 0, JSON.stringify({ zoom, fixed, metrics }));
      assert.equal(metrics.promptUpdated, true);
      result.cases.push({ zoom, fixed, ...metrics });
      await page.evaluate(() => currentDialog.close());
    }
    const lifecycle = await page.evaluate(async () => {
      document.body.style.zoom = '1';
      const baseline = { mutations: observers.mutations.size, resizes: observers.resizes.size };
      let maxRetained = 0, cleared = true, removedCleaned = true;
      for (let i = 0; i < 40; i++) {
        openDialog(); makeBar(); ui.update();
        const state = currentDialog._dialogOlControls, layout = state.promptLayout;
        for (let j = 0; j < 8; j++) { makeBar(); layout.update(); maxRetained = Math.max(maxRetained, layout.nodes.size); }
        if (i % 2) currentDialog.close();
        else { currentDialog.remove(); await settle(); removedCleaned &&= state.promptLayout === null; syncDialogOlControls(null, ui.arena, ui.window, ui.update); }
        layout.update(); // 关闭前排队或被外部保存的回调必须失效。
        cleared &&= layout.nodes.size === 0 && layout.copies.size === 0 && layout.frame === 0;
        document.querySelector('#jindutiaopl')?.remove();
      }
      await settle();
      return { cycles: 40, replacements: 320, maxRetained, cleared, removedCleaned, overlays: document.querySelectorAll('.dialog-xinsha-prompt-overlay').length, baseline, remaining: { mutations: observers.mutations.size, resizes: observers.resizes.size } };
    });
    assert.equal(lifecycle.cleared, true); assert.equal(lifecycle.removedCleaned, true);
    assert.equal(lifecycle.overlays, 0); assert.ok(lifecycle.maxRetained <= 6, JSON.stringify(lifecycle));
    assert.deepEqual(lifecycle.remaining, lifecycle.baseline);
    result.lifecycle = lifecycle;
    const resized = await page.evaluate(async () => {
      openDialog(); makeBar(); ui.update(); await settle();
      document.body.style.zoom = '1.25';
      ui.window.style.transformOrigin = '0 0'; ui.window.style.transform = 'translate(17px,11px) scale(.8)';
      await settle();
      const d = currentDialog.getBoundingClientRect(), b = document.querySelector('#jindutiaopl').getBoundingClientRect();
      const layout = currentDialog._dialogOlControls.promptLayout;
      document.body.dataset.style = 'onlineUI'; await settle();
      const released = currentDialog._dialogOlControls.promptLayout === null && layout.nodes.size === 0 && layout.copies.size === 0 && layout.frame === 0;
      currentDialog.close(); document.querySelector('#jindutiaopl').remove();
      return { centerError: b.x + b.width / 2 - d.x - d.width / 2, released, overlays: document.querySelectorAll('.dialog-xinsha-prompt-overlay').length, remaining: { mutations: observers.mutations.size, resizes: observers.resizes.size } };
    });
    assert.ok(Math.abs(resized.centerError) < .1, JSON.stringify(resized));
    assert.equal(resized.released, true); assert.equal(resized.overlays, 0);
    assert.deepEqual(resized.remaining, lifecycle.baseline);
    result.resizeAndStyleExit = resized;
    assert.deepEqual(result.errors, []);
    fs.writeFileSync(path.join(__dirname, 'dialog-xinsha-performance-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log('DIALOG_XINSHA_PERFORMANCE_OK ' + JSON.stringify(result));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
