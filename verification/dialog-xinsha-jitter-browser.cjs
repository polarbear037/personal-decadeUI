// 真实 Dialog/open、卡牌动画和本体 CSS：从首帧到稳定帧验证布局，开窗缩放仍保留。
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
      for (const file of ['layout', 'animation', 'dialog', 'meihua']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/${file}${suffix}.css` });
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
          const dialog = ui.create.dialog(window.jitterFooter ? '测试：请选择一张牌' : '测试', [['spade', 7, 'sha'], ['heart', 2, 'shan']], 'hidden');
          if (prompt) dialog.classList.add('prompt');
          _status.event.dialog = dialog; window.currentDialog = dialog; dialog.open(); return dialog;
        };
      });

      await page.evaluate(() => document.fonts.ready);
      for (const width of [1280, 1920]) for (const zoom of [1, 1.5]) for (const footer of style === 'othersOff' ? [false, true] : [false]) {
        await page.setViewportSize({width, height:900});
        const frames = await page.evaluate(async ({zoom, footer}) => {
          window.currentDialog?.close(); document.body.style.zoom=zoom; window.jitterFooter=footer;
          const dialog=makeDialog(), frames=[], start=performance.now();
          do {
            ui.update();
            const box=dialog.getBoundingClientRect(), css=getComputedStyle(dialog);
            const ratio=box.width/parseFloat(css.width);
            const caption=dialog.content.firstElementChild.getBoundingClientRect();
            const content=dialog.content.getBoundingClientRect();
            const textRange=document.createRange(); textRange.selectNodeContents(dialog.content.firstElementChild);
            const text=textRange.getBoundingClientRect();
            frames.push({time:performance.now()-start, height:parseFloat(css.height), contentHeight:dialog.content.offsetHeight,
              titleY:(caption.top-box.bottom)/ratio, contentY:(content.top-box.bottom)/ratio,
              titleWidth:caption.width/ratio, textY:(text.top-box.bottom)/ratio, textX:(text.left+text.width/2-box.left-box.width/2)/ratio,
              scale:css.scale==='none'?1:parseFloat(css.scale), overflow:getComputedStyle(dialog.content).overflow,
              cardAnimations:dialog.querySelector('.button').getAnimations().length, transitions:dialog.getAnimations({subtree:true}).filter(a=>a.transitionProperty).map(a=>({target:a.effect.target.className,property:a.transitionProperty})), captionHeight:dialog.content.firstElementChild.offsetHeight});
            await new Promise(requestAnimationFrame);
          } while(performance.now()-start<650);
          return frames;
        }, {zoom,footer});
        const range=key=>Math.max(...frames.map(f=>f[key]))-Math.min(...frames.map(f=>f[key]));
        const drift=Object.fromEntries(['height','contentHeight','titleY','contentY','titleWidth','textY','textX'].map(key=>[key,range(key)]));
        if(style==='othersOff') {
          assert.ok(Object.values(drift).every(v=>v<.2), JSON.stringify({width,zoom,footer,drift,frames:frames.filter((f,i)=>i===0||f.contentHeight!==frames[i-1].contentHeight)}));
          assert.ok(frames.some(f=>f.scale>1.03),'opening bounce must remain');
          assert.ok(frames.some(f=>f.cardAnimations>0),'card entry must remain');
          assert.ok(frames.some(f=>f.overflow==='visible'),'entry still releases clipping');
          assert.equal(frames.at(-1).scale,1);
          const restored=await page.evaluate(()=>{
            ui.window.querySelector('.dialog-ol-collapse').click(); const hidden=currentDialog.classList.contains('hidden');
            ui.window.querySelector('.dialog-ol-restore').click();
            return {hidden, shown:!currentDialog.classList.contains('hidden'), footerCopies:document.querySelectorAll('.dialog-xinsha-prompt-overlay').length};
          });
          assert.equal(restored.hidden,true); assert.equal(restored.shown,true);
          assert.equal(restored.footerCopies,footer?1:0);
        } else {
          assert.equal(await page.locator('.dialog-xinsha-prompt-layout').count(),0);
          assert.equal(await page.locator('.dialog-xinsha-prompt-overlay').count(),0);
          assert.equal(await page.evaluate(()=>getComputedStyle(currentDialog.content).display),'block');
        }
        results.cases.push({style,width,zoom,footer,drift,frames});
        await page.evaluate(()=>{currentDialog.close();xinshaDialogCardAnimations.clear();});
        assert.equal(await page.locator('.dialog-xinsha-prompt-overlay').count(),0);
      }
      await page.close();
    }
    assert.deepEqual(results.errors,[]);
    fs.writeFileSync(path.join(__dirname,'dialog-xinsha-jitter-results.json'),JSON.stringify(results,null,2)+'\n');
    console.log('dialog-xinsha-jitter-browser: PASS '+results.cases.length+' scenes; title/content/frame drift <0.2px throughout opening, card entry, clipping restore; hide/restore, close cleanup and style isolation');
    console.log(JSON.stringify(results.cases.filter(c=>c.style==='othersOff').map(({frames,...result})=>result)));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
