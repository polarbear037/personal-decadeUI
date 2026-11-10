const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page, origin, true);
    await page.addStyleTag({ url: `${origin}/extension/十周年UI/ui/styles/lbtn/online.css` });
    await page.evaluate(() => {
      document.body.innerHTML = '<div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_ol"></div></div>';
      ui.window = document.querySelector('#window');
      ui.window.style.cssText = 'position:absolute;inset:0;container-type:size';
      ui.arena = document.querySelector('#arena');
      ui.arena.style.cssText = 'position:absolute;inset:0';
      ui.control = ui.create.div('', ui.arena); ui.control.id = 'dui-controls';
      ui.dialogs = []; ui.controls = []; ui.updates = [];
      lib.announce = { subscribe() {} };
      lib.hooks = { checkEnd: new Set(), uncheckEnd: new Set() };
      lib.onover = [];
      Array.prototype.remove = function (item) { const index = this.indexOf(item); if (index >= 0) this.splice(index, 1); };
      ui.refresh = ui.update = ui.updatec = () => {};
      ui.click.dialogtouchStart = ui.click.touchScroll = ui.click.dragtouchdialog = () => {};
      ui.create.caption = (text, parent) => { const node = ui.create.div('.caption', parent); node.innerHTML = text; return node; };
      window.decadeUI = {
        element: { create(name, parent) { return ui.create.div('.' + name, parent); } },
        get: { bodySize: () => ({ width: ui.window.offsetWidth, height: ui.window.offsetHeight }) },
        isMobile: () => ui.arena.classList.contains('dui-mobile'),
        showHandTip() {
          const tip = ui.create.div('.decade-optimized-hand-tip', ui.arena);
          tip.show = () => {}; tip.strokeText = () => {}; tip.close = () => { tip.remove(); tip.closed = true; };
          return tip;
        },
      };
      window.applyOnlineFactionDialog = window.applyFactionDialogInteraction = window.applyHuarenDialogInteraction = dialog => dialog;
      window.syncOfficialPlayerPopups = () => {};
      game.me = {};
      game.over = () => {};
      _status.event = { name: 'chooseButton', player: game.me, isMine: () => true };
    });
    await page.addScriptTag({ content: script('noname/library/element/dialog.js', 'window.EngineDialog=Dialog;lib.element.Dialog=Dialog;lib.element.dialog=Dialog.prototype;') });
    await page.evaluate(() => {
      EngineDialog.prototype.show = function () { this.classList.remove('hidden'); };
      EngineDialog.prototype.hide = function () { this.classList.add('hidden'); };
      EngineDialog.prototype.refocus = EngineDialog.prototype.unfocus = () => {};
      EngineDialog.prototype.delete = function () { this.remove(); };
    });
    for (const [file, expose] of [
      ['src/ui/dialog-ol-layout.js', 'Object.assign(window,{prepareDialogOlOpen,syncDialogOlLayoutMarker,isDialogOlLayout,clearDialogOlLayout,updateDialogOlLayout,releaseDialogOlLayout});'],
      ['src/ui/dialog-ol-controls.js', 'window.syncDialogOlControls=syncDialogOlControls;'],
      ['src/ui/officialPromptText.js', 'window.officialPromptText=officialPromptText;'],
      ['src/ui/officialSkillPromptData.js', 'window.officialSkillPrompts=officialSkillPrompts;'],
      ['src/ui/officialPromptBridge.js', 'window.getOfficialScenePrompt=getOfficialScenePrompt;'],
      ['src/ui/officialPrompt.js', 'Object.assign(window,{plainPrompt,skillNameForPrompt,buildOfficialPrompt,renderOfficialPrompt});'],
      ['src/ui/optimizedPrompt.js', 'Object.assign(window,{addOptimizedPrompt,addOptimizedPromptText,prepareOptimizedPrompt,refreshOptimizedPrompt,closeOptimizedPrompt,clearOptimizedPrompts});'],
      ['src/utils/safeOverride.js', 'window.wrapAround=r;window.wrapAfter=t;'],
      ['src/overrides/dialog.js', 'EngineDialog.prototype.open=s;t();'],
      ['src/overrides/ui/update.js', 'ui.update=l;'],
      ['src/overrides/ui/create.js', 'ui.create.dialog=s;'],
      ['ui/lbtn/skins/base.js', 'window.createBaseLbtnPlugin=createBaseLbtnPlugin;'],
      ['src/ui/online-action-buttons.js', 'Object.assign(window,{initOnlineActionButtons,attachOnlineRecastButton,syncOnlineActionButtons});'],
      ['ui/lbtn/skins/online.js', 'window.createOnlineLbtnPlugin=createOnlineLbtnPlugin;'],
    ]) await page.addScriptTag({ content: script('extension/十周年UI/' + file, expose) });
    await page.evaluate(() => {
      ui.create.control = (...labels) => {
        const control = ui.create.div('.control', ui.control);
        control.style.opacity = '1';
        for (const label of labels) { const node = ui.create.div('', control); node.innerHTML = label; node.link = label; }
        control.close = () => control.remove(); ui.controls.push(control); return control;
      };
      ui.click.ok = () => { window.confirmClicks = (window.confirmClicks || 0) + 1; };
      createOnlineLbtnPlugin(lib, game, ui, get, {}, _status, {}).initConfirmRewrite();
      window.makeSkillDialog = (text, count = 5) => {
        _status.event = { name: 'chooseButton', player: game.me, isMine: () => true };
        const dialog = ui.create.dialog(text, 'hidden');
        const buttons = ui.create.div('.buttons', dialog.content);
        for (let i = 0; i < count; i++) {
          const button = ui.create.div('.button.character', buttons);
          button.style.cssText = 'position:relative;display:inline-block;width:90px;height:120px;background:#73543c;margin:4px';
          button.textContent = ['曹操', '关羽', '赵云', '黄忠', '郭嘉'][i % 5];
          button.onclick = () => button.classList.toggle('selected'); dialog.buttons.push(button);
        }
        _status.event.dialog = dialog; dialog.open(); ui.create.confirm('oc'); window.testDialog = dialog; return dialog;
      };
      window.readSkillDialog = () => {
        const dialog = testDialog;
        const footer = dialog.querySelector('.dialog-ol-footer');
        const box = dialog.getBoundingClientRect();
        const tip = footer?.getBoundingClientRect();
        const buttons = [...dialog.querySelectorAll('.buttons>.button')];
        const confirm = ui.confirm.getBoundingClientRect();
        return {
          title: dialog.content.firstElementChild.textContent.trim(), tip: footer?.textContent.trim(),
          count: dialog.querySelectorAll('.dialog-ol-footer').length, align: footer && getComputedStyle(footer).textAlign,
          visibleTitle: getComputedStyle(dialog.content.firstElementChild).display !== 'none',
          duplicate: !!document.querySelector('.decade-optimized-hand-tip'),
          centered: tip && Math.abs((tip.left + tip.right) / 2 - (box.left + box.right) / 2) < 1,
          afterCards: tip && Math.max(...buttons.map(button => button.getBoundingClientRect().bottom)) <= tip.top,
          aboveControls: tip && tip.bottom < confirm.top,
          bottomGap: tip && box.bottom - tip.bottom, height: box.height,
        };
      };
    });
    let scenarios = 0;
    for (const zoom of [1, 1.5]) for (const mobile of [false, true]) for (const optimize of [false, true]) {
      await page.evaluate(({ zoom, mobile, optimize }) => {
        document.body.style.zoom = zoom;
        ui.arena.classList.toggle('dui-mobile', mobile);
        lib.config.extension_十周年UI_optimizePrompt = optimize;
        makeSkillDialog('挈挟：选择至多两张武将置入武器栏');
      }, { zoom, mobile, optimize });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const result = await page.evaluate(() => { for (let i = 0; i < 3; i++) ui.update(); refreshOptimizedPrompt(); return readSkillDialog(); });
      assert.equal(result.title, '挈挟', JSON.stringify(result));
      assert.equal(result.tip, '选择至多两张武将置入武器栏');
      assert.equal(result.count, 1);
      for (const key of ['visibleTitle', 'centered', 'afterCards', 'aboveControls']) assert.equal(result[key], true, JSON.stringify({ zoom, mobile, optimize, ...result }));
      assert.equal(result.duplicate, false);
      assert.ok(Math.abs(result.bottomGap - 0.03 * 720) <= 1, JSON.stringify(result));
      if (zoom === 1 && !mobile && !optimize) await page.screenshot({ path: path.join(__dirname, 'dialog-skill-footer.png') });
      await page.locator('.lbtn-confirm>.primary').click();
      assert.equal(await page.evaluate(() => confirmClicks), scenarios + 1);
      await page.locator('.dialog-ol-collapse').click();
      assert.equal(await page.evaluate(() => testDialog.classList.contains('hidden')), true);
      await page.locator('.dialog-ol-restore').click();
      assert.equal(await page.evaluate(() => testDialog.classList.contains('hidden')), false);
      await page.locator('.buttons>.button').first().click();
      assert.equal(await page.locator('.buttons>.button.selected').count(), 1);
      await page.evaluate(() => testDialog.setCaption('<span style="color:rgb(255,216,0)">化身</span>: 请选择<span style="color:rgb(255,0,0)">新的武将</span>'));
      assert.equal((await page.evaluate(() => readSkillDialog())).title, '化身');
      assert.equal((await page.evaluate(() => readSkillDialog())).tip, '请选择新的武将');
      assert.equal(await page.locator('.dialog-ol-footer span').evaluate(node => getComputedStyle(node).color), 'rgb(255, 0, 0)');
      await page.evaluate(() => { testDialog.setCaption('无需拆分'); });
      assert.equal(await page.locator('.dialog-ol-footer').count(), 0);
      await page.evaluate(() => testDialog.close()); scenarios++;
    }
    const exclusions = await page.evaluate(() => {
      lib.config.extension_十周年UI_optimizePrompt = false;
      const results = [];
      for (const text of ['没有冒号', '：没有标题', '没有提示：', '<div class="text popup">选项一：获得一张牌</div>']) {
        const dialog = makeSkillDialog(text); results.push(!dialog.querySelector('.dialog-ol-footer')); dialog.close();
      }
      ui.arena.classList.add('choose-character');
      let dialog = makeSkillDialog('选将：请选择武将'); results.push(!dialog.querySelector('.dialog-ol-footer')); dialog.close();
      ui.arena.classList.remove('choose-character');
      dialog = makeSkillDialog('技能：<span style="background-image:url(http://example.invalid/icon.png)">提示内容：后续冒号保留</span>');
      results.push(dialog.querySelector('.dialog-ol-footer').textContent === '提示内容：后续冒号保留');
      ui.arena.dataset.loadingStyle = 'on'; ui.update();
      results.push(dialog.content.firstElementChild.textContent === '技能：提示内容：后续冒号保留' && !dialog.querySelector('.dialog-ol-footer'));
      dialog.close(); return results;
    });
    assert.ok(exclusions.every(Boolean), JSON.stringify(exclusions));
    const titles = await page.evaluate(() => {
      ui.arena.dataset.loadingStyle = 'dialog_ol';
      const results = [];
      let dialog = makeSkillDialog('张星彩发动了【洛神】');
      results.push(readSkillDialog().title === '洛神' && !dialog.querySelector('.dialog-ol-footer'));
      for (let i = 0; i < 3; i++) ui.update();
      results.push(readSkillDialog().title === '洛神');
      dialog.setCaption('<span>曹操发动了【</span><span style="color:rgb(255,216,0)">奸雄</span>】');
      results.push(readSkillDialog().title === '奸雄' && getComputedStyle(dialog.content.firstElementChild.querySelector('span[style]')).color === 'rgb(255, 216, 0)');
      dialog.setCaption('张星彩发动了【洛神】：请选择一张牌');
      results.push(readSkillDialog().title === '洛神' && readSkillDialog().tip === '请选择一张牌');
      dialog.setCaption('张星彩发动了【洛神】，请选择一项');
      results.push(readSkillDialog().title === '张星彩发动了【洛神】，请选择一项');
      dialog.setCaption('张星彩发动了【洛神】');
      ui.arena.dataset.loadingStyle = 'on'; ui.update();
      results.push(readSkillDialog().title === '张星彩发动了【洛神】');
      dialog.close();
      dialog = makeSkillDialog('曹操发动了【奸雄】');
      results.push(readSkillDialog().title === '曹操发动了【奸雄】');
      dialog.close();
      return results;
    });
    assert.ok(titles.every(Boolean), JSON.stringify(titles));
    assert.deepEqual(errors, []);
    console.log(`DIALOG_SKILL_FOOTER_OK: ${scenarios} zoom/mobile/optimization combinations; activation titles; title updates; rich text; collapse/restore; card clicks; exclusions; 0 browser errors`);
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
