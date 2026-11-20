// 复现本体 chooseControl 在 open 后逐项 add(caption) 的流程。
const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1938, height: 865 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await bootstrap(page, origin, true);
    await page.evaluate(() => {
      const windowElement = document.createElement('div');
      windowElement.id = 'window';
      windowElement.style.cssText = 'position:absolute;inset:0;container-type:size';
      document.body.append(windowElement);
      windowElement.append(ui.arena);
      ui.window = windowElement;
      ui.arena.style.cssText = 'position:absolute;inset:0';
      ui.arena.dataset.loadingStyle = 'dialog_ol';
      ui.dialogs = [];
      ui.dialogs.remove = function (dialog) { const i = this.indexOf(dialog); if (i >= 0) this.splice(i, 1); };
      ui.control = document.createElement('div');
      ui.updates = [];
      ui.refresh = ui.update = () => {};
      ui.click.dialogtouchStart = ui.click.touchScroll = ui.click.dragtouchdialog = () => {};
      // 与本体 ui.create.caption 一致，不增加 .text 或限制高度。
      ui.create.caption = (str, parent) => { const caption = ui.create.div('.caption', parent); caption.innerHTML = str; return caption; };
      window.decadeUI = {
        element: { create(className, parent) { const node = document.createElement('div'); node.className = className; parent?.append(node); return node; } },
        get: { bodySize: () => ({ width: ui.window.offsetWidth, height: ui.window.offsetHeight }) },
        isMobile: () => false,
      };
      window.applyOnlineFactionDialog = window.applyFactionDialogInteraction = window.applyHuarenDialogInteraction = dialog => dialog;
      window.syncOfficialPlayerPopups = () => {};
      window.get.mode = () => 'identity';
    });
    await page.addStyleTag({ content: '*,*::before{animation:none!important;transition:none!important}' });
    await page.addScriptTag({ content: script('noname/library/element/dialog.js', 'window.EngineDialog=Dialog;lib.element.Dialog=Dialog;') });
    await page.evaluate(() => {
      EngineDialog.prototype.show = function () { this.classList.remove('hidden'); };
      EngineDialog.prototype.hide = function () { this.classList.add('hidden'); };
      EngineDialog.prototype.refocus = EngineDialog.prototype.unfocus = () => {};
      EngineDialog.prototype.delete = function () { this.remove(); };
    });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/dialog-ol-layout.js', 'Object.assign(window,{prepareDialogOlOpen,syncDialogOlLayoutMarker,isDialogOlLayout,clearDialogOlLayout,updateDialogOlLayout,releaseDialogOlLayout});') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/dialog-ol-controls.js', 'window.syncDialogOlControls=syncDialogOlControls;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPromptText.js', 'window.officialPromptText=officialPromptText;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialSkillPromptData.js', 'window.officialSkillPrompts=officialSkillPrompts;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPromptBridge.js', 'Object.assign(window,{getOfficialScenePrompt});') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPrompt.js', 'Object.assign(window,{buildOfficialPrompt,renderOfficialPrompt});') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/optimizedPrompt.js', 'Object.assign(window,{prepareOptimizedPrompt,refreshOptimizedPrompt});') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/dialog-card-animations-xinsha.js', 'window.xinshaDialogCardAnimations=xinshaDialogCardAnimations;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/dialog.js', 'EngineDialog.prototype.open=s;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/ui/update.js', 'ui.update=l;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/ui/create.js', 'ui.create.dialog=s;') });
    const results = [];
    for (const zoom of [1, 1.5]) {
      await page.evaluate(zoom => { document.body.style.zoom = zoom; }, zoom);
      for (const count of [0, 2, 4, 14]) {
        const result = await page.evaluate(async count => {
          const dialog = ui.create.dialog('选择一项', 'hidden');
          dialog.forcebutton = true;
          dialog.open();
          const initialHeight = dialog.offsetHeight;
          for (let i = 0; i < count; i++) dialog.add(`<div class="popup text" style="width:calc(100% - 10px);display:inline-block">选项${i + 1}：${i === 0 ? '令杀【◇】不计入次数' : '获得一张牌'}</div>`);
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const probe = document.createElement('div');
          probe.style.cssText = 'position:absolute;height:var(--dialog-ol-edge-bottom);width:0';
          dialog.append(probe);
          const edge = parseFloat(getComputedStyle(probe).height);
          probe.remove();
          const contentHeight = dialog.content.scrollHeight;
          const scale = ui.arena.getBoundingClientRect().height / ui.arena.offsetHeight;
          const available = (dialog.getBoundingClientRect().bottom - ui.window.getBoundingClientRect().top) / scale;
          const expected = Math.min(contentHeight + (count ? edge : 0), available);
          const data = { count, height: dialog.offsetHeight, initialHeight, contentHeight, expected, edge, available, captions: dialog.content.children.length };
          if (count === 14) {
            dialog.contentContainer.scrollTop = dialog.contentContainer.scrollHeight;
            const last = dialog.content.lastElementChild.getBoundingClientRect();
            const container = dialog.contentContainer.getBoundingClientRect();
            data.lastOptionVisible = last.top >= container.top - 1 && last.bottom <= container.bottom + 1;
          }
          window.captionDialog = dialog;
          return data;
        }, count);
        assert.ok(Math.abs(result.height - result.expected) <= 1, 'the dialog fits the content and bottom edge within the game window: ' + JSON.stringify({ zoom, ...result }));
        assert.equal(result.captions, count + 1);
        if (count === 14) assert.equal(result.lastOptionVisible, true, 'long lists can scroll to the last option');
        if (count) assert.ok(result.height > result.initialHeight + result.edge, 'options must grow the dialog');
        if (count === 2 && zoom === 1) await page.screenshot({ path: path.join(__dirname, 'dialog-caption-height.png') });
        results.push({ zoom, ...result });
        await page.evaluate(() => captionDialog.close());
      }
    }
    // 内容在打开后异步变化时，不依赖另一次 ui.update。
    await page.evaluate(() => {
      document.body.style.zoom = 1;
      window.captionDialog = ui.create.dialog('选择一项', 'hidden');
      captionDialog.forcebutton = true;
      captionDialog.open();
      captionDialog.add('选项一：获得一张牌');
      window.oldCaptionHeight = captionDialog.offsetHeight;
      captionDialog.content.lastElementChild.innerHTML += '<br>第二行<br>第三行<br>第四行';
    });
    await page.waitForFunction(() => captionDialog.offsetHeight > oldCaptionHeight + 45);
    await page.evaluate(() => captionDialog.close());
    assert.deepEqual(errors, []);
    console.log('DIALOG_CAPTION_HEIGHT_OK', JSON.stringify(results));
  } finally {
    await browser.close();
    server.close();
  }
}
run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
