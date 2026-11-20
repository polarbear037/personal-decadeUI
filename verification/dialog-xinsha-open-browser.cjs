// 真实 Dialog/open 与正式样式：核对开窗轨迹、定位、收起恢复及风格隔离。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = { cases: [], errors: [] };
  try {
    for (const style of ['othersOff', 'onlineUI', 'on']) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
      page.on('pageerror', error => results.errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) results.errors.push(`${response.status()} ${response.url()}`); });
      await bootstrap(page, origin, true);
      const suffix = style === 'othersOff' ? '-xinsha' : style === 'onlineUI' ? '-online' : '';
      for (const file of ['layout', 'animation', 'dialog']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/${file}${suffix}.css` });
      await page.evaluate(style => {
        document.body.dataset.style = style;
        document.body.innerHTML = '<div id="window"><div id="arena" class="decadeUI"></div></div>';
        ui.window = document.querySelector('#window'); ui.arena = document.querySelector('#arena');
        ui.window.style.cssText = 'position:absolute;inset:0'; ui.arena.style.cssText = 'position:absolute;inset:12px 36px 8px';
        ui.arena.dataset.loadingStyle = style === 'othersOff' ? 'dialog_xinsha' : style === 'onlineUI' ? 'dialog_ol' : 'on';
        lib.config.extension_十周年UI_newDecadeStyle = style;
        ui.dialogs = []; ui.controls = []; ui.updates = []; ui.selected = { buttons: [], cards: [], targets: [] };
        ui.create.caption = (text, parent) => { const node = ui.create.div('.caption', parent); node.innerHTML = text; return node; };
        ui.create.buttons = (cards, type, parent) => cards.map(card => {
          const node = ui.create.card(parent); node.init(card); node.link = card; node.classList.add('button'); return node;
        });
        ui.click.dialogtouchStart = ui.click.touchScroll = ui.click.dragtouchdialog = () => {};
        ui.refresh = ui.update = () => {}; game.me = {}; game.documentZoom = 1;
        Array.prototype.remove = function (value) { const index = this.indexOf(value); if (index >= 0) this.splice(index, 1); };
        HTMLDivElement.prototype.show = function () { this.classList.remove('hidden'); return this; };
        HTMLDivElement.prototype.hide = function () { this.classList.add('hidden'); return this; };
        HTMLDivElement.prototype.delete = function () { this.remove(); };
        HTMLDivElement.prototype.refocus = HTMLDivElement.prototype.unfocus = () => {};
        window.decadeUI = { get: { bodySize: () => ({ width: ui.window.clientWidth, height: ui.window.clientHeight }) } };
        window.prepareOptimizedPrompt = window.refreshOptimizedPrompt = () => {};
        window.skillNameForPrompt = () => '';
      }, style);
      for (const [file, expose] of [
        ['noname/library/element/dialog.js', 'window.EngineDialog=Dialog;lib.element.Dialog=Dialog;'],
        ['extension/十周年UI/src/ui/xinshaPlayerCardPrompt.js', 'window.getXinshaPlayerCardPrompt=getXinshaPlayerCardPrompt;'],
        ['extension/十周年UI/src/ui/dialog-ol-layout.js', 'Object.assign(window,{prepareDialogOlOpen,syncDialogOlLayoutMarker,updateDialogOlLayout,releaseDialogOlLayout});'],
        ['extension/十周年UI/src/ui/dialog-ol-controls.js', 'window.syncDialogOlControls=syncDialogOlControls;'],
        ['extension/十周年UI/src/ui/dialog-card-animations-xinsha.js', 'window.xinshaDialogCardAnimations=xinshaDialogCardAnimations;'],
        ['extension/十周年UI/src/overrides/dialog.js', 'EngineDialog.prototype.open=s;'],
      ]) await page.addScriptTag({ content: script(file, expose) });
      await page.evaluate(() => {
        ui.create.dialog = (...args) => new EngineDialog(...args);
        ui.update = () => { updateDialogOlLayout(ui.dialog, ui.arena); syncDialogOlControls(ui.dialog, ui.arena, ui.window, ui.update); };
        window.makeDialog = (prompt = false) => {
          _status.event = { name: 'chooseButton', player: game.me, isMine: () => true, isOnline: () => false };
          const dialog = ui.create.dialog('测试', [['spade', 7, 'sha'], ['heart', 2, 'shan']], 'hidden');
          if (prompt) dialog.classList.add('prompt');
          _status.event.dialog = dialog; window.currentDialog = dialog; dialog.open(); return dialog;
        };
      });
      for (const zoom of [1, 1.5]) {
        const trajectory = await page.evaluate(async zoom => {
          window.currentDialog?.close(); document.body.style.zoom = zoom;
          const dialog = makeDialog();
          const animation = dialog.getAnimations().find(a => a.effect.target === dialog);
          animation.pause();
          const timing = animation.effect.getTiming(), samples = [];
          for (const time of [0, 50, 100, 150, 200]) {
            animation.currentTime = styleName() === 'othersOff' ? time : time / 200 * timing.duration;
            const box = dialog.getBoundingClientRect(), css = getComputedStyle(dialog);
            samples.push({ time, width: box.width, center: box.x + box.width / 2, opacity: Number(css.opacity), scale: css.scale, transform: css.transform });
          }
          animation.finish(); await animation.finished;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const settled = dialog.getBoundingClientRect();
          const entries = dialog.querySelector('.button')?.getAnimations().map(a => a.effect.getTiming().duration);
          return { name: animation.animationName, duration: timing.duration, easing: getComputedStyle(dialog).animationTimingFunction, samples, settled: settled.toJSON(), entries };
          function styleName() { return lib.config.extension_十周年UI_newDecadeStyle; }
        }, zoom);
        if (style === 'othersOff') {
          assert.equal(trajectory.name, 'open-dialog-xinsha'); assert.equal(trajectory.duration, 200); assert.equal(trajectory.easing, 'linear');
          for (const [index, scale] of [1, 1.05, 1.1, 1.05, 1].entries()) {
            const sample = trajectory.samples[index];
            assert.ok(Math.abs(sample.width / trajectory.samples[0].width - scale) < .001, JSON.stringify(trajectory));
            assert.equal(sample.opacity, 1);
            assert.ok(Math.abs(sample.center - trajectory.samples[0].center) < .5, JSON.stringify(trajectory));
          }
          assert.ok(trajectory.entries.some(duration => Math.abs(duration - 800 / 3) < .01), 'card entry remains independent');
          const restore = await page.evaluate(() => {
            const animation = currentDialog.getAnimations().find(a => a.effect.target === currentDialog);
            ui.window.querySelector('.dialog-ol-collapse').click();
            const hidden = currentDialog.classList.contains('hidden');
            ui.window.querySelector('.dialog-ol-restore').click();
            const same = currentDialog.getAnimations().find(a => a.effect.target === currentDialog) === animation;
            const reopened = currentDialog.open() === currentDialog;
            return { hidden, shown: !currentDialog.classList.contains('hidden'), same, reopened };
          });
          assert.deepEqual(restore, { hidden: true, shown: true, same: true, reopened: true });
          const natural = await page.evaluate(async () => {
            currentDialog.close(); const dialog = makeDialog(), frames = [];
            const start = performance.now();
            do {
              await new Promise(requestAnimationFrame);
              const box = dialog.getBoundingClientRect(), css = getComputedStyle(dialog);
              frames.push({ elapsed: performance.now() - start, width: box.width, center: box.x + box.width / 2, scale: css.scale === 'none' ? 1 : Number(css.scale), opacity: Number(css.opacity) });
            } while (performance.now() - start < 300);
            return frames;
          });
          assert.ok(natural.some(frame => frame.scale > 1.07), JSON.stringify(natural));
          assert.ok(natural.every(frame => frame.scale >= 1 && frame.scale <= 1.1001 && frame.opacity === 1));
          assert.ok(natural.every(frame => Math.abs(frame.center - natural[0].center) < .5), JSON.stringify(natural));
          assert.equal(natural.at(-1).scale, 1);
          trajectory.naturalFrames = natural;
        } else {
          assert.equal(trajectory.name, style === 'onlineUI' ? 'open-dialog-ol' : 'open-dialog'); assert.equal(trajectory.duration, 500); assert.equal(trajectory.easing, 'ease');
        }
        results.cases.push({ style, zoom, trajectory });
      }
      assert.equal(await page.evaluate(() => { currentDialog.close(); const dialog = makeDialog(true); return dialog.style.animation; }), '', 'prompt remains excluded');
      await page.evaluate(() => { currentDialog.close(); xinshaDialogCardAnimations.clear(); });
      await page.close();
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(__dirname, 'dialog-xinsha-open-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log('dialog-xinsha-open-browser: PASS 6 style/zoom scenes; 1→1.1→1 in 200ms, opacity, center, card entry, hide/restore/reopen, prompt isolation');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
