const fs = require('node:fs');
const path = require('node:path');
const { installNativeHarness, server, chromium, assert, script } = require('./optimized-prompt-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await installNativeHarness(page, origin, false);
    for (const file of ['src/styles/dialog.css', 'src/styles/dialogOK.css', 'src/styles/meihua.css', 'ui/styles/lbtn/online.css']) {
      await page.addStyleTag({ url: `${origin}/extension/十周年UI/${file}` });
    }
    await page.addScriptTag({ content: script('noname/library/element/control.js', 'lib.element.Control=Control;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/ui/create.js', 'window.createNativeControl=c;') });
    await page.addScriptTag({ content: script('extension/十周年UI/ui/lbtn/skins/base.js', 'window.createBaseLbtnPlugin=createBaseLbtnPlugin;') });
    await page.addScriptTag({ content: script('extension/十周年UI/ui/lbtn/skins/online.js', 'window.createOnlineLbtnPlugin=createOnlineLbtnPlugin;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/config/handlers/card-handlers.js', 'window.setHandTipHeight=o;') });
    await page.evaluate(() => {
      document.head.insertAdjacentHTML('beforeend', '<style>html,body{width:100%;height:100%;margin:0}#arena{position:absolute;inset:0;background:#302a21;container-type:size}#samples,#preview{display:none}</style>');
      ui.control = ui.create.div('', ui.arena);
      ui.control.id = 'dui-controls';
      ui.controls = [];
      ui.updatec = () => {};
      ui.click.control = ui.click.control2 = () => {};
      HTMLDivElement.prototype.addTempClass = function () { return this; };
      ui.create.control = window.createNativeControl;
      get.select = value => typeof value === 'function' ? get.select(value()) : typeof value === 'number' ? [value, value] : Array.isArray(value) ? value : [1, 1];
      game.saveConfig = (key, value) => { lib.config[key] = value; };
      Object.assign(lib.translate, { cancel: '取消', shan: '闪', sha: '杀', convert: '转化' });
      lib.card.shan = { type: 'basic', notarget: true };
      lib.card.sha = { type: 'basic', selectTarget: 1 };
      lib.skill.convert = { viewAs: { name: 'sha' }, selectCard: [1, 1], selectTarget: [1, 1] };
      get.skillTranslation = skill => lib.translate[skill] || skill;
      window.beginChoice = props => {
        for (const dialog of [...ui.dialogs]) dialog.close();
        clearOptimizedPrompts();
        ui.selected = { cards: [], targets: [], buttons: [] };
        _status.event = { player: game.me, isMine: () => true, getParent: () => ({}), ...props };
        lib.hooks.checkEnd.handlers.forEach(handler => handler(_status.event));
      };
      window.readTip = () => {
        const tip = [...ui.arena.querySelectorAll('.decade-optimized-hand-tip')].find(tip => !tip.closed);
        return { text: tip?.textContent || '', main: tip?.querySelector('.decade-official-main')?.textContent || '', progress: tip?.querySelector('.decade-official-progress')?.textContent || '' };
      };
    });

    const ranges = await page.evaluate(() => {
      beginChoice({ name: 'chooseToUse', type: 'phase', selectTarget: () => undefined });
      const empty = readTip();
      beginChoice({ name: 'chooseToUse', selectTarget: [1, 1], prompt: '请使用一张闪响应杀' });
      ui.selected.cards = [{ name: 'shan' }];
      refreshOptimizedPrompt();
      const shan = readTip();
      beginChoice({ name: 'chooseToRespond', selectTarget: [1, 1], prompt: '请打出一张闪' });
      ui.selected.cards = [{ name: 'shan' }];
      refreshOptimizedPrompt();
      const response = readTip();
      beginChoice({ name: 'chooseToUse', type: 'phase', skill: 'convert', selectCard: [1, 1], selectTarget: [1, 1] });
      ui.selected.cards = [{ name: 'shan' }];
      refreshOptimizedPrompt();
      return { empty, shan, response, converted: readTip() };
    });
    assert.equal(ranges.empty.progress, '', '尚未选牌时默认 [1,1] 被误当成目标要求');
    assert.equal(ranges.shan.main, '请使用一张闪响应杀');
    assert.equal(ranges.shan.progress, '', '无目标牌闪错误要求选角色');
    assert.equal(ranges.response.progress, '', '响应事件错误要求选角色');
    assert.equal(ranges.converted.progress, '', '转化技能不额外追加人数计数行');
    assert.match(ranges.converted.main, /请选择1名角色/, '移除计数行后仍须保留真实目标要求');

    const takeover = await page.evaluate(() => {
      beginChoice({ name: 'chooseTarget', selectTarget: [1, 1], prompt: '请选择一名角色', prompt2: '选择后点击确定' });
      const dialog = ui.create.dialog(_status.event.prompt);
      _status.event.dialog = dialog;
      dialog.classList.add('prompt');
      dialog.addText(_status.event.prompt2);
      _status.event.promptbar = dialog.add('0/1');
      refreshOptimizedPrompt();
      const progress = _status.event.promptbar;
      const hidden = getComputedStyle(progress).display;
      const original = decadeUI.showHandTip('原有出牌提示');
      original.setInfomation('原有详情');
      refreshOptimizedPrompt();
      const legacy = getComputedStyle(original).display;
      const info = getComputedStyle(original.$info).display;
      const buttons = ui.create.div('.buttons', dialog.content);
      const button = document.createElement('button');
      button.textContent = '真实选项';
      buttons.append(button);
      dialog.buttons = [button];
      refreshOptimizedPrompt();
      const interactive = getComputedStyle(dialog).visibility;
      lib.config.extension_十周年UI_optimizePrompt = false;
      refreshOptimizedPrompt();
      const restored = getComputedStyle(progress).display !== 'none' && !dialog.dataset.decadeOptimizedPrompt && !ui.arena.dataset.decadeOptimizedActive;
      lib.config.extension_十周年UI_optimizePrompt = true;
      beginChoice({ name: 'chooseTarget', selectTarget: [1, 1] });
      const counterOnlyDialog = ui.create.dialog('0/1');
      _status.event.dialog = counterOnlyDialog;
      _status.event.promptbar = counterOnlyDialog.content.firstElementChild;
      const optionArea = ui.create.div('.buttons', counterOnlyDialog.content);
      optionArea.appendChild(document.createElement('button'));
      refreshOptimizedPrompt();
      const counterOnly = { hidden: getComputedStyle(_status.event.promptbar).display, main: readTip().main };
      return { hidden, legacy, info, interactive, restored, counterOnly };
    });
    assert.equal(takeover.hidden, 'none', '本体 promptbar 与优化提示重复显示');
    assert.equal(takeover.legacy, 'none', '旧 hand-tip 与优化提示同时显示');
    assert.equal(takeover.info, 'none', '旧 hand-tip-info 与优化提示同时显示');
    assert.equal(takeover.interactive, 'visible', '交互选项被连带隐藏');
    assert.equal(takeover.restored, true, '关闭优化提示后原生提示未恢复');
    assert.equal(takeover.counterOnly.hidden, 'none', '只有计数的交互弹窗仍显示原生计数');
    assert.equal(takeover.counterOnly.main, '请选择1名角色', '原生计数被错误当成操作文案');

    await page.evaluate(() => {
      beginChoice({ name: 'chooseToUse', prompt: '请使用一张闪响应杀', selectTarget: [1, 1] });
      ui.selected.cards = [{ name: 'shan' }];
      refreshOptimizedPrompt();
      window.onlinePlugin = createOnlineLbtnPlugin(lib, game, ui, get, {}, _status, {});
      onlinePlugin.initConfirmRewrite();
      ui.create.confirm('oc');
      ui.click.ok = () => { window.confirmClicks = (window.confirmClicks || 0) + 1; };
      ui.click.cancel = () => {};
      window.setHeight = value => { const input = document.createElement('input'); input.value = value; setHandTipHeight.call(input); };
      const skin = document.createElement('div');
      skin.style.cssText = 'position:absolute;inset:0;z-index:100;pointer-events:none;background:rgba(0,0,0,.05)';
      ui.arena.prepend(skin);
      const frame = document.createElement('div');
      frame.className = 'dialog dialog-ol-layout';
      frame.style.cssText = 'position:absolute;inset:0;z-index:101;pointer-events:none';
      const area = ui.create.div('.buttons', frame);
      area.appendChild(document.createElement('button'));
      ui.arena.prepend(frame);
      window.layout = () => {
        const tip = [...ui.arena.querySelectorAll('.decade-optimized-hand-tip')].find(tip => !tip.closed);
        const rect = tip.getBoundingClientRect();
        const buttons = [ui.confirm.node.ok, ui.confirm.node.cancel].map(node => node.getBoundingClientRect());
        return { top: rect.top, bottom: rect.bottom, buttonBottom: Math.max(...buttons.map(rect => rect.bottom)), layer: +getComputedStyle(tip).zIndex, frameLayer: +getComputedStyle(frame).zIndex, controlsLayer: +getComputedStyle(ui.control).zIndex, heightSetting: lib.config.extension_十周年UI_handTipHeight, lines: tip.children.length };
      };
    });
    await page.evaluate(() => document.fonts.ready);
    const layouts = [];
    for (const value of [25, 20, 18, 15, 12]) {
      await page.evaluate(value => setHeight(value), value);
      layouts.push(await page.evaluate(() => layout()));
    }
    const multilineLayouts = await page.evaluate(() => {
      const results = [];
      for (const lines of [1, 2]) {
        beginChoice({ name: 'chooseCardTarget', prompt: '请选择一张牌和一名角色', selectCard: [1, 1], selectTarget: [1, 1], ...(lines === 2 ? { prompt2: '选择后点击确定' } : {}) });
        for (const value of [25, 20, 18, 15, 12]) { setHeight(value); results.push(layout()); }
      }
      return results;
    });
    const usable = layouts.find(layout => [layout, ...multilineLayouts.filter(other => other.heightSetting === layout.heightSetting)].every(other => other.top >= other.buttonBottom + 2));
    assert(usable, `现有高度设置无法避开确认栏: ${JSON.stringify(layouts)}`);
    assert(usable.layer > usable.frameLayer && usable.layer === usable.controlsLayer, '提示没有处于确认栏所在层级');
    await page.evaluate(value => {
      beginChoice({ name: 'chooseCardTarget', prompt: '请选择一张牌和一名角色', prompt2: '选择后点击确定', selectCard: [1, 1], selectTarget: [1, 1] });
      setHeight(value);
    }, usable.heightSetting);
    await page.locator('.lbtn-confirm>.primary').click();
    assert.equal(await page.evaluate(() => confirmClicks), 1, '提示阻断了确认按钮点击');
    await page.screenshot({ path: path.resolve(__dirname, 'optimized-prompt-selection-browser.png') });
    assert.deepEqual(errors, []);
    const result = { ranges, takeover, layouts, multilineLayouts, testedSetting: usable.heightSetting, confirmClickable: true, errors };
    fs.writeFileSync(path.resolve(__dirname, 'optimized-prompt-selection-results.json'), JSON.stringify(result, null, 2));
    console.log('OPTIMIZED_PROMPT_SELECTION_OK', JSON.stringify(result));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
