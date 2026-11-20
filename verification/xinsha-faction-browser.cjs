// 真实 Dialog、十周年创建/open、势力交互及本体 chooseButton 步骤；其余宿主由夹具隔离。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const root = path.resolve(__dirname, '..');
for (const item of JSON.parse(fs.readFileSync(path.join(__dirname, 'xinsha-faction-source.json'), 'utf8')).assets) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, item.destination))).digest('hex'), item.sha256);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = { cases: [], errors: [] };
  try {
    for (const style of ['othersOff', 'onlineUI', 'on']) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
      await bootstrap(page, origin, true);
      const suffix = style === 'othersOff' ? '-xinsha' : style === 'onlineUI' ? '-online' : '';
      for (const file of ['layout', 'dialog', 'animation']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/${file}${suffix}.css` });
      for (const file of ['src/styles/online-faction-dialog.css', 'src/styles/xinsha-faction-dialog.css', 'ui/styles/fonts-xinsha.css']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/${file}` });
      await page.evaluate(style => {
        document.body.dataset.style = style;
        document.body.innerHTML = '<div id="window"><div id="arena" class="decadeUI"><div id="dui-controls"></div></div></div>';
        ui.window = document.querySelector('#window'); ui.arena = document.querySelector('#arena');
        ui.window.style.cssText = 'position:absolute;inset:0';
        ui.arena.style.cssText = 'position:absolute;inset:20px 36px 8px';
        ui.arena.dataset.loadingStyle = style === 'othersOff' ? 'dialog_xinsha' : style === 'onlineUI' ? 'dialog_ol' : 'on';
        lib.config.extension_十周年UI_newDecadeStyle = style;
        lib.config.extension_十周年UI_jindutiaoYangshi = '0';
        Object.assign(lib.translate, { wei: '魏', shu: '蜀', wu: '吴', qun: '群', jin: '晋', custom: '自定义' });
        ui.dialogs = []; ui.controls = []; ui.updates = []; ui.selected = { buttons: [], cards: [], targets: [] };
        ui.create.caption = (text, parent) => { const node = ui.create.div('.caption', parent); node.innerHTML = text; return node; };
        ui.create.buttons = (links, type, parent) => links.map(link => {
          const node = ui.create.card(parent); node.init(['spade', 7, 'sha']);
          node.link = link; node.classList.add('button', 'selectable'); return node;
        });
        ui.click.dialogtouchStart = ui.click.touchScroll = ui.click.dragtouchdialog = () => {};
        ui.refresh = ui.update = () => {}; game.me = {}; game.documentZoom = 1;
        get.event = () => _status.event;
        get.select = value => Array.isArray(value) ? value : [value, value];
        get.itemtype = value => value?.classList?.contains('card') ? 'card' : Array.isArray(value) && value.length && value.every(item => item?.classList?.contains('card')) ? 'cards' : '';
        (lib.filter ||= {}).buttonIncluded = () => true;
        Array.prototype.remove = function (value) { const index = this.indexOf(value); if (index >= 0) this.splice(index, 1); };
        Array.prototype.add = function (value) { if (!this.includes(value)) this.push(value); };
        HTMLDivElement.prototype.show = function () { this.classList.remove('hidden'); return this; };
        HTMLDivElement.prototype.hide = function () { this.classList.add('hidden'); return this; };
        HTMLDivElement.prototype.delete = function () { this.remove(); };
        HTMLDivElement.prototype.refocus = HTMLDivElement.prototype.unfocus = () => {};
        window.decadeUI = { get: { bodySize: () => ({ width: ui.window.clientWidth, height: ui.window.clientHeight }) }, element: { create(name, parent) { const node = document.createElement('div'); node.className = name; parent?.append(node); return node; } } };
        window.prepareOptimizedPrompt = window.refreshOptimizedPrompt = () => {};
        window.skillNameForPrompt = () => '';
        window.applyHuarenDialogInteraction = dialog => dialog;
        ui.click.button = function () {};
        ui.click.ok = () => { const event = _status.event; event.result = { bool: true, links: ui.selected.buttons.map(button => button.link) }; event.dialog.close(); ui.selected.buttons.length = 0; };
      }, style);
      for (const [file, expose] of [
        ['noname/library/element/dialog.js', 'window.EngineDialog=Dialog;lib.element.Dialog=Dialog;'],
        ['extension/十周年UI/src/ui/xinshaPlayerCardPrompt.js', 'window.getXinshaPlayerCardPrompt=getXinshaPlayerCardPrompt;'],
        ['extension/十周年UI/src/ui/dialog-ol-layout.js', 'Object.assign(window,{prepareDialogOlOpen,syncDialogOlLayoutMarker,updateDialogOlLayout,releaseDialogOlLayout});'],
        ['extension/十周年UI/src/ui/dialog-ol-controls.js', 'window.syncDialogOlControls=syncDialogOlControls;'],
        ['extension/十周年UI/src/ui/dialog-card-animations-xinsha.js', 'window.xinshaDialogCardAnimations=xinshaDialogCardAnimations;'],
        ['extension/十周年UI/src/ui/online-faction-dialog.js', 'window.applyOnlineFactionDialog=applyOnlineFactionDialog;'],
        ['extension/十周年UI/src/ui/xinsha-faction-dialog.js', 'window.applyXinshaFactionDialog=applyXinshaFactionDialog;'],
        ['extension/十周年UI/src/ui/faction-dialog-interaction.js', 'window.applyFactionDialogInteraction=applyFactionDialogInteraction;'],
        ['extension/十周年UI/src/overrides/dialog.js', 'EngineDialog.prototype.open=s;'],
        ['extension/十周年UI/src/overrides/ui/create.js', 'window.createDecadeDialog=s;'],
      ]) await page.addScriptTag({ content: script(file, expose) });
      await page.evaluate(() => {
        ui.create.dialog = createDecadeDialog;
        ui.update = () => { updateDialogOlLayout(ui.dialog, ui.arena); syncDialogOlControls(ui.dialog, ui.arena, ui.window, ui.update); };
        window.makeFaction = (groups = ['wei', 'shu', 'wu', 'qun'], forced = true) => {
          window.currentDialog?.close();
          _status.event = { name: 'chooseButton', player: game.me, isMine: () => true, selectButton: [1, 1], filterButton: button => !button.classList.contains('unselectable'), forced };
          const dialog = ui.create.dialog('请选择你的势力', [groups.map(group => ['', '', `group_${group}`]), 'vcard'], 'hidden');
          _status.event.dialog = dialog; window.currentDialog = dialog; dialog.open(); return dialog;
        };
      });
      for (const zoom of [.7, 1, 1.2]) {
        const geometry = await page.evaluate(async zoom => {
          document.body.style.zoom = zoom; game.documentZoom = zoom;
          const dialog = makeFaction();
          await document.fonts.ready;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const rect = node => node.getBoundingClientRect().toJSON();
          return { window: rect(ui.window), dialog: rect(dialog), buttons: dialog.buttons.map(rect), xinsha: dialog.classList.contains('xinsha-faction-dialog'), online: dialog.classList.contains('online-faction-dialog'), frame: getComputedStyle(dialog, '::before').backgroundImage, image: getComputedStyle(dialog.buttons[0], '::before').backgroundImage, title: dialog.querySelector('.xinsha-faction-title')?.textContent, animated: dialog.buttons.some(button => button.getAnimations().length) };
        }, zoom);
        if (style === 'othersOff') {
          assert.equal(geometry.xinsha, true); assert.equal(geometry.online, false); assert.equal(geometry.title, '选择势力'); assert.equal(geometry.animated, false);
          const unit = Math.min(geometry.window.width / 1334, geometry.window.height / 750);
          assert.ok(Math.abs(geometry.dialog.x - geometry.window.x) < 1);
          assert.ok(Math.abs(geometry.dialog.width - geometry.window.width) < 1);
          assert.ok(Math.abs(geometry.dialog.y + geometry.dialog.height / 2 - (geometry.window.y + geometry.window.height / 2)) < 1);
          assert.ok(Math.abs(geometry.dialog.height - 392 * unit) < 1);
          assert.ok(Math.abs(geometry.buttons[0].width - 151 * unit) < 1);
          assert.ok(Math.abs(geometry.buttons[0].height - 182 * unit) < 1);
          assert.ok(Math.abs(geometry.buttons[1].x - geometry.buttons[0].right - 50 * unit) < 1);
          assert.ok(Math.abs(geometry.buttons[0].y - geometry.dialog.y - 65 * unit) < 1);
          assert.match(geometry.frame, /dialog_xinsha\.png/); assert.match(geometry.image, /skill_window_select_country_1/);
          const hidden = await page.evaluate(() => {
            const original = currentDialog;
            document.querySelector('.dialog-xinsha-hide').click();
            const hidden = currentDialog.classList.contains('hidden');
            document.querySelector('.dialog-ol-restore').click();
            return { hidden, same: currentDialog === original, visible: !currentDialog.classList.contains('hidden') };
          });
          assert.deepEqual(hidden, { hidden: true, same: true, visible: true });
        } else assert.equal(geometry.xinsha, false);
        report.cases.push({ style, zoom, geometry });
      }
      if (style === 'othersOff') {
        await page.evaluate(() => makeFaction(['wei', 'shu'], false));
        assert.notEqual(await page.locator('#dui-controls').evaluate(node => getComputedStyle(node).display), 'none', '可取消窗口保留原生取消入口');
        await page.evaluate(() => makeFaction());
        assert.equal(await page.locator('#dui-controls').evaluate(node => getComputedStyle(node).display), 'none', '强制单选直接点势力');
        await page.screenshot({ path: path.join(__dirname, 'xinsha-faction-standard.png') });
        await page.evaluate(() => { document.body.style.zoom = 1; makeFaction(['wei', 'shu', 'wu', 'qun', 'jin']); });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(__dirname, 'xinsha-faction-five.png') });
        await page.evaluate(() => { document.body.style.zoom = 1; makeFaction(['shu', 'wei', 'wu', 'qun', 'jin', 'custom']); });
        await page.waitForTimeout(100);
        const labels = await page.locator('.xinsha-faction-label').allTextContents();
        assert.deepEqual(labels, ['晋', '自定义']);
        assert.match(await page.locator('.xinsha-faction-jin > span').evaluate(node => getComputedStyle(node).fontFamily), /dui-yjcm-label/);
        assert.match(await page.locator('.xinsha-faction-jin').evaluate(node => getComputedStyle(node, '::before').backgroundImage), /select_country_jin_bg/);
        await page.screenshot({ path: path.join(__dirname, 'xinsha-faction-browser.png') });
        await page.evaluate(() => { currentDialog.buttons[0].classList.add('unselectable'); });
        await page.locator('.xinsha-faction-button').first().click();
        assert.equal(await page.evaluate(() => !!_status.event.result), false, '禁用项不确认');
        await page.locator('.xinsha-faction-button').nth(1).press('Enter');
        assert.equal(await page.evaluate(() => _status.event.result.links[0][2]), 'group_wei');
        assert.equal(await page.locator('.xinsha-faction-dialog').count(), 0);
        assert.equal(await page.locator('.dialog-xinsha-hide,.dialog-ol-restore,.dialog-xinsha-prompt-overlay').count(), 0, '关闭清理');
        await page.evaluate(() => { makeFaction(); applyXinshaFactionDialog(currentDialog); });
        assert.equal(await page.locator('.xinsha-faction-title').count(), 1, '重复装饰幂等');
        await page.locator('.xinsha-faction-button').nth(2).dispatchEvent('touchend');
        assert.equal(await page.evaluate(() => _status.event.result.links[0][2]), 'group_wu');
        await page.evaluate(() => { const d = ui.create.dialog('普通选牌', [[['spade', 7, 'sha']], 'vcard'], 'hidden'); window.ordinary = d; d.open(); });
        assert.equal(await page.evaluate(() => ordinary.classList.contains('xinsha-faction-dialog')), false);
        await page.evaluate(() => ordinary.close());
      }
      await page.close();
    }
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(path.join(root, 'verification/xinsha-faction-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('XINSHA_FACTION_BROWSER_OK: real Dialog/create/open, three styles, zoom .7/1/1.2, original geometry, custom factions, mouse/touch/keyboard, disabled, hide/restore, close/reopen and isolation');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
