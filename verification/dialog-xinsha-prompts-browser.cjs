// 执行本体取牌第一步、雷的一将实际取牌布局、十周年的控件与进度条；不代表 Electron 实局。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const source = read('noname/library/element/content.js');
const gain = source.slice(source.indexOf('  gainPlayerCard: ['), source.indexOf('  async showHandcards('));
const createSource = read('noname/ui/create/index.js');
const jingzao = read('character/xianding.js').split('  dcjingzao: {')[1];
const openJingzao = jingzao.slice(jingzao.indexOf('(player2, target2, id, cards3) => {'), jingzao.indexOf('\n        player,' )).trim().replace(/,$/, '');
const updateJingzao = jingzao.slice(jingzao.indexOf('const update = ') + 15, jingzao.indexOf('\n      if (target === game.me)'));

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = { cases: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    page.on('pageerror', error => results.errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) results.errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page, origin, true);
    for (const file of ['src/styles/layout-xinsha.css', 'src/styles/meihua-xinsha.css', 'ui/styles/fonts-xinsha.css']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/${file}` });
    await page.evaluate(() => {
      document.body.dataset.style = 'othersOff';
      document.body.innerHTML = '<div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_xinsha"></div></div>';
      ui.window = document.querySelector('#window'); ui.window.style.cssText = 'position:absolute;inset:0';
      ui.arena = document.querySelector('#arena'); ui.arena.style.cssText = 'position:absolute;inset:12px 36px 8px';
      ui.control = ui.create.div('', ui.arena); ui.control.id = 'dui-controls';
      ui.control.innerHTML = '<button>确定</button><button>取消</button>';
      ui.dialogs = []; ui.updates = [];
      ui.refresh = () => {}; ui.update = () => {};
      ui.create.caption = (text, parent) => { const node = ui.create.div('.caption', parent); node.innerHTML = text; return node; };
      ui.create.buttons = (cards, type, parent) => cards.map(card => {
        const button = ui.create.div('.button.card', parent); button.link = card;
        button.textContent = type === 'blank' ? '' : '杀';
        button.onclick = () => button.classList.toggle('selected'); return button;
      });
      ui.create.buttonChooseAll = () => {};
      game.check = game.pause = () => {};
      game.me = { hasSkillTag: () => false, node: {} };
      lib.filter = { all: () => true };
      Object.assign(lib.config, { extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_jindutiaoYangshi: '4', extension_十周年UI_jindutiaoSet: '27.5', extension_十周年UI_jindutiaoST: '200' });
      Object.assign(get, { select: value => value, cnNumber: () => '一', subtype: card => card.subtype, subtypes: card => [card.subtype] });
      const translation = get.translation; get.translation = value => value?.label || translation(value);
      Array.prototype.randomSort = function () { return this; };
      Array.prototype.remove = function (value) { const index = this.indexOf(value); if (index >= 0) this.splice(index, 1); };
      HTMLDivElement.prototype.show = function () { this.classList.remove('hidden'); return this; };
      HTMLDivElement.prototype.hide = function () { this.classList.add('hidden'); return this; };
      HTMLDivElement.prototype.refocus = HTMLDivElement.prototype.unfocus = () => {};
      window.decadeUI = { element: { create: (name, parent) => ui.create.div('.' + name, parent) }, statics: {} };
      window.createBaseLbtnPlugin = window.createXinshaBackgroundSelector = () => ({});
      window.getConfig = () => true;
      window.ticks = [];
      window.setInterval = callback => { ticks.push(callback); return ticks.length; };
      window.clearInterval = () => {};
    });
    for (const [file, expose] of [
      ['noname/library/element/dialog.js', 'window.EngineDialog=Dialog;lib.element.Dialog=Dialog;'],
      ['extension/十周年UI/src/ui/dialog-ol-layout.js', 'Object.assign(window,{prepareDialogOlOpen,updateDialogOlLayout,syncDialogOlLayoutMarker,releaseDialogOlLayout});'],
      ['extension/十周年UI/src/ui/dialog-ol-controls.js', 'window.syncDialogOlControls=syncDialogOlControls;'],
      ['extension/十周年UI/src/ui/handtip.js', 'window.showHandTip=t;'],
      ['extension/十周年UI/src/ui/progress-bar.js', 'm();'],
      ['extension/十周年UI/ui/lbtn/skins/xinsha.js', 'window.plugin=createXinshaLbtnPlugin(lib,game,ui,get,{},_status,{});plugin.initOfficialLayout();'],
    ]) await page.addScriptTag({ content: script(file, expose) });
    await page.addScriptTag({ content: `lib.element.content={gainPlayerCard:({${gain}}).gainPlayerCard};` });
    await page.addScriptTag({ content: `ui.create.div=({${createSource.slice(createSource.indexOf('  div() {'), createSource.indexOf('  filediv() {'))}}).div;window.openJingzao=${openJingzao};window.updateJingzao=${updateJingzao}` });
    await page.addScriptTag({ content: script('extension/雷的一将/utils/choosePlayerSelection.js', 'window.installChoosePlayerSelection=installChoosePlayerSelection;') });
    await page.addScriptTag({ content: script('extension/雷的一将/utils/shunchaiBeautify.js', 'installShunchaiBeautify();').replaceAll('import.meta.url', JSON.stringify(`${origin}/extension/雷的一将/utils/shunchaiBeautify.js`)) });
    await page.evaluate(() => {
      EngineDialog.prototype.open = function () {
        prepareDialogOlOpen(this, ui.arena, window.openingSkill ?? '密运');
        ui.arena.append(this); ui.dialog = this; ui.update(); return this;
      };
      EngineDialog.prototype.close = function () { this.remove(); ui.dialog = null; syncDialogOlControls(null, ui.arena, ui.window, ui.update); };
      ui.create.dialog = (...args) => new EngineDialog(...args);
      ui.update = () => { updateDialogOlLayout(ui.dialog, ui.arena); syncDialogOlControls(ui.dialog, ui.arena, ui.window, ui.update); };
      window.makeBar = () => {
        document.querySelector('#jindutiaopl')?.remove(); game.Jindutiaoplayer();
        window.bar = document.querySelector('#jindutiaopl'); return bar;
      };
      window.styleSnapshot = node => Object.fromEntries([...node.style].sort().map(key => [key, [node.style.getPropertyValue(key), node.style.getPropertyPriority(key)]]));
      window.prepare = () => {
        makeBar(); window.tip = showHandTip('请选择目标的一张牌', decadeUI);
        window.before = { bar: styleSnapshot(bar), fill: styleSnapshot(bar.firstElementChild), image: styleSnapshot(bar.querySelector('img')), tip: styleSnapshot(tip) };
      };
      window.openGain = async (multiple = false) => {
        const cards = Array.from({ length: 4 }, () => ({ name: 'sha' }));
        const target = { label: '界陈宫', getCards: () => cards, getGainableCards: (player, zone) => zone === 'h' ? cards : [], isUnderControl: () => false };
        const event = { name: 'gainPlayerCard', player: game.me, target, position: 'he', prompt: '密运：请选择界陈宫的一张牌', selectButton: [1, multiple ? 2 : 1], forced: false, visible: true, filterButton: lib.filter.all, isMine: () => true, isOnline: () => false };
        _status.event = event; await lib.element.content.gainPlayerCard[0](event, null, game.me);
        window.dialog = event.dialog;
      };
      window.measure = () => {
        const d = dialog.getBoundingClientRect(), b = bar.getBoundingClientRect(), footer = dialog.querySelector('.dialog-ol-footer'), f = footer.getBoundingClientRect();
        const scale = d.width / 1696;
        const button = document.querySelector('.dialog-xinsha-hide');
        const r = button?.getBoundingClientRect(), v = ui.window.getBoundingClientRect();
        const unit = parseFloat(ui.window.style.getPropertyValue('--yjcm-unit')), inset = parseFloat(ui.window.style.getPropertyValue('--yjcm-scene-x'));
        const zoom = v.width / ui.window.clientWidth;
        const copy = [...document.querySelectorAll('.dialog-xinsha-prompt-overlay')].find(node => node.textContent === footer.textContent);
        return { scale, width: b.width / scale, height: b.height / scale, barY: (d.bottom - b.bottom) / scale, promptY: (d.bottom - f.bottom) / scale, fontSize: parseFloat(getComputedStyle(footer).fontSize), center: b.x + b.width / 2 - d.x - d.width / 2, fillData: bar.firstElementChild.data, fillWidth: bar.firstElementChild.style.width, image: getComputedStyle(bar.querySelector('img')).content, filter: getComputedStyle(bar.querySelector('img')).filter, promptAboveBar: copy?.parentNode === bar.parentNode && Number(getComputedStyle(copy).zIndex) > Number(getComputedStyle(bar).zIndex), hiddenTip: getComputedStyle(tip).display, buttonXError: r && r.left - v.left - (inset + 39 * unit) * zoom, buttonYError: r && v.bottom - r.bottom - 258 * unit * zoom };
      };
    });
    for (const width of [1280, 1920]) for (const zoom of [1, 1.5]) for (const multiple of [false, true]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(({ zoom }) => { document.body.style.zoom = zoom; plugin.initOfficialLayout(); prepare(); }, { zoom });
      await page.evaluate(multiple => openGain(multiple), multiple);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const geometry = await page.evaluate(() => measure());
      assert.ok(Math.abs(geometry.width - 560) < .1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.height - 17) < .1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.barY - (multiple ? 108 : 73)) < .1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.promptY - (multiple ? 120 : 80)) < .1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.center) < 1 && Math.abs(geometry.buttonXError) < 1 && Math.abs(geometry.buttonYError) < 1, JSON.stringify(geometry));
      assert.equal(geometry.fillData, 449);
      assert.equal(geometry.hiddenTip, 'none');
      assert.equal(geometry.promptAboveBar, true);
      assert.equal(geometry.filter, 'brightness(1.1)');
      assert.ok(geometry.image.includes('xf_newTimeBar_1.png'));
      await page.locator('.lei-yijiang-sc-h .button').first().click();
      assert.equal(await page.locator('.lei-yijiang-sc-h .button.selected').count(), 1);
      await page.getByRole('button', { name: '隐藏弹窗', exact: true }).click();
      const restored = await page.evaluate(() => ({ bar: styleSnapshot(bar), fill: styleSnapshot(bar.firstElementChild), image: styleSnapshot(bar.querySelector('img')), tip: styleSnapshot(tip) }));
      assert.deepEqual(restored, await page.evaluate(() => before));
      await page.evaluate(() => { makeBar(); before.bar = styleSnapshot(bar); before.fill = styleSnapshot(bar.firstElementChild); before.image = styleSnapshot(bar.querySelector('img')); });
      await page.getByRole('button', { name: '显示弹窗', exact: true }).click();
      await page.waitForTimeout(100);
      assert.ok(Math.abs((await page.evaluate(() => measure())).width - 560) < .1);
      await page.evaluate(() => { bar.firstElementChild.data = 131; ticks.at(-1)(); });
      await page.waitForTimeout(50);
      assert.ok((await page.evaluate(() => measure())).image.includes('xf_newTimeBar_red_1.png'));
      const rebuilt = await page.evaluate(() => {
        makeBar(); before.bar = styleSnapshot(bar); before.fill = styleSnapshot(bar.firstElementChild); before.image = styleSnapshot(bar.querySelector('img'));
        return bar.firstElementChild.data;
      });
      assert.equal(rebuilt, 449);
      await page.waitForFunction(() => Math.abs(measure().width - 560) < .1);
      if (width === 1920 && zoom === 1 && !multiple) await page.screenshot({ path: path.join(__dirname, 'dialog-xinsha-prompts-browser.png') });
      await page.evaluate(() => dialog.close());
      assert.equal(await page.locator('.dialog-xinsha-prompt-overlay').count(), 0);
      assert.deepEqual(await page.evaluate(() => ({ bar: styleSnapshot(bar), fill: styleSnapshot(bar.firstElementChild), image: styleSnapshot(bar.querySelector('img')), tip: styleSnapshot(tip) })), await page.evaluate(() => before));
      results.cases.push({ width, zoom, multiple, geometry });
    }
    // 弹窗不能把耗尽后接续的月光宝盒贴图重新覆盖成普通金/红条。
    results.moon = [];
    for (const zoom of [1, 1.5]) {
      await page.evaluate(zoom => { document.body.style.zoom = zoom; plugin.initOfficialLayout(); prepare(); }, zoom);
      await page.evaluate(() => openGain(false));
      await page.waitForTimeout(150);
      await page.evaluate(() => { bar.firstElementChild.data = 1; ticks.at(-1)(); for (let j = 0; j < 2133; j++) ticks.at(-1)(); });
      await page.waitForFunction(() => getComputedStyle(bar.firstElementChild.querySelector('img')).content === 'normal');
      const moon = await page.evaluate(() => {
        const fill = bar.firstElementChild, image = fill.querySelector('img'), b = bar.getBoundingClientRect();
        return { src: image.src, width: fill.style.width, content: getComputedStyle(image).content, clippedRatio: fill.getBoundingClientRect().width / b.width, fullRatio: image.getBoundingClientRect().width / b.width, bg: bar.lastElementChild.src, barWidth: b.width };
      });
      assert.match(moon.src, /\/newTimeBar\.png$/); assert.match(moon.bg, /\/newTimeBarBg\.png$/);
      assert.equal(moon.width, '5%'); assert.ok(Math.abs(moon.clippedRatio - .05) < .001); assert.ok(Math.abs(moon.fullRatio - 1) < .001);
      if (zoom === 1) await page.screenshot({ path: path.join(__dirname, 'dialog-xinsha-moon-progress.png') });
      await page.getByRole('button', { name: '隐藏弹窗', exact: true }).click();
      assert.equal(await page.evaluate(() => bar.isConnected && bar.firstElementChild.style.width === '5%' && bar.firstElementChild.querySelector('img').src.endsWith('/newTimeBar.png')), true);
      await page.getByRole('button', { name: '显示弹窗', exact: true }).click();
      await page.waitForFunction(() => getComputedStyle(bar.firstElementChild.querySelector('img')).content === 'normal');
      await page.evaluate(() => dialog.close());
      assert.equal(await page.evaluate(() => bar.isConnected && bar.firstElementChild.style.width === '5%' && getComputedStyle(bar.firstElementChild.querySelector('img')).content === 'normal'), true);
      results.moon.push({ zoom, ...moon });
    }
    // 普通技能框按文字实际高度留白，不能继续将进度条抬到牌面中央。
    await page.evaluate(() => {
      prepare();
      window.dialog = ui.create.dialog('密运', 'hidden', 'forcebutton');
      const cards = ui.create.div('.buttons', dialog.content); cards.style.height = '120px';
      tip.setInfomation('保留额外说明'); window.infoBefore = styleSnapshot(tip.$info);
      dialog.open();
    });
    await page.waitForTimeout(150);
    const nativeTip = await page.evaluate(() => {
      const d = dialog.getBoundingClientRect(), t = tip.getBoundingClientRect(), b = bar.getBoundingClientRect(), v = ui.window.getBoundingClientRect();
      const unit = Math.min(v.width / 1334, v.height / 750);
      return { width: b.width / unit, gapTop:t.top-dialog.querySelector('.buttons').getBoundingClientRect().bottom, gapBottom:d.bottom-t.bottom, tipY: (d.bottom - t.bottom) / unit, spanFont: getComputedStyle(tip.firstElementChild).fontSize, font: getComputedStyle(tip).fontSize, text: tip.textContent, extraAbove: tip.$info.getBoundingClientRect().bottom < t.top, barAboveText: b.bottom < tip.$info.getBoundingClientRect().top, afterContent: b.top >= dialog.content.getBoundingClientRect().bottom };
    });
    assert.ok(Math.abs(nativeTip.width-560)<.2&&Math.abs(nativeTip.gapTop-nativeTip.gapBottom)<.2, JSON.stringify(nativeTip));
    assert.equal(nativeTip.spanFont, nativeTip.font);
    assert.equal(nativeTip.text, '请选择目标的一张牌');
    assert.equal(nativeTip.extraAbove, true);
    assert.equal(nativeTip.barAboveText, true);
    assert.equal(nativeTip.afterContent, true);
    await page.evaluate(() => dialog.close());
    assert.deepEqual(await page.evaluate(() => styleSnapshot(tip)), await page.evaluate(() => before.tip));
    assert.deepEqual(await page.evaluate(() => styleSnapshot(tip.$info)), await page.evaluate(() => infoBefore));
    // 执行经造真实的广播建框与延迟插入说明，覆盖不同牌数、缩放、换行和显隐。
    for (const width of [1280, 1920]) for (const zoom of [1, 1.5]) for (const count of [3, 9]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(({ zoom, count }) => {
        document.body.style.zoom = zoom; plugin.initOfficialLayout(); prepare();
        window.openingSkill = '';
        const cards = Array.from({ length: count }, () => ({ name: 'sha' }));
        const createDialog = ui.create.dialog;
        ui.create.dialog = (...args) => { const d = createDialog(...args); d.open(); return d; };
        openJingzao({ label: '程秉' }, game.me, 123, cards);
        ui.create.dialog = createDialog;
        window.dialog = ui.dialog;
        get.idDialog = id => dialog.videoId === id ? dialog : null;
        updateJingzao(123, { label: '程秉' });
        window.descriptionNode = dialog.querySelector('.dialog-xinsha-description');
      }, { zoom, count });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      const geometry = await page.evaluate(() => {
        const d = dialog.getBoundingClientRect(), b = bar.getBoundingClientRect();
        const footer = dialog.querySelector('.dialog-ol-footer'), f = footer.getBoundingClientRect();
        const copy = document.querySelector('.dialog-xinsha-prompt-overlay');
        const cards = [...dialog.querySelectorAll('.button.card')].map(n => n.getBoundingClientRect());
        const container = dialog.contentContainer.getBoundingClientRect();
        return { promptGapTop: f.top-Math.min(Math.max(...cards.map(c=>c.bottom)),container.bottom), promptGapBottom:d.bottom-f.bottom, title: dialog.content.firstElementChild.textContent, prompt: footer.textContent, sameNode: descriptionNode === footer.firstElementChild, footerCount: dialog.querySelectorAll('.dialog-ol-footer').length, afterCards: Math.min(...cards.map(c => c.top), container.bottom) < b.top && Math.min(Math.max(...cards.map(c => c.bottom)), container.bottom) <= b.top, textBelowBar: f.top > b.bottom, textInsideFrame: f.bottom <= d.bottom && f.top >= d.top, overlayMatches: copy?.textContent === footer.textContent, scrollable: dialog.contentContainer.scrollHeight > dialog.contentContainer.clientHeight };
      });
      assert.equal(geometry.title, '经造', JSON.stringify(geometry));
      for (const key of ['sameNode', 'afterCards', 'textBelowBar', 'textInsideFrame', 'overlayMatches']) assert.equal(geometry[key], true, JSON.stringify(geometry));
      assert.equal(geometry.footerCount, 1);
      assert.ok(Math.abs(geometry.promptGapTop-geometry.promptGapBottom)<.5,JSON.stringify(geometry));
      assert.ok(geometry.prompt.startsWith('弃置一张满足条件的牌'));
      await page.evaluate(() => { for (let i = 0; i < 5; i++) ui.update(); });
      assert.equal(await page.locator('.dialog-xinsha-description').count(), 2); // 原节点和无交互绘制副本
      const drift = await page.evaluate(async () => {
        const samples = [];
        for (let i = 0; i < 30; i++) {
          ui.update(); await new Promise(requestAnimationFrame);
          samples.push([bar.getBoundingClientRect().top, dialog.querySelector('.dialog-ol-footer').getBoundingClientRect().top]);
        }
        return [0, 1].map(axis => Math.max(...samples.map(s => s[axis])) - Math.min(...samples.map(s => s[axis])));
      });
      assert.ok(drift.every(value => value < .05), JSON.stringify({ width, zoom, count, drift }));
      await page.getByRole('button', { name: '隐藏弹窗', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => styleSnapshot(bar)), await page.evaluate(() => before.bar));
      await page.getByRole('button', { name: '显示弹窗', exact: true }).click();
      await page.waitForTimeout(100);
      if (width === 1920 && zoom === 1 && count === 3) await page.screenshot({ path: path.join(__dirname, 'dialog-xinsha-generic-browser.png') });
      await page.evaluate(() => dialog.close());
      assert.deepEqual(await page.evaluate(() => styleSnapshot(bar)), await page.evaluate(() => before.bar));
      results.cases.push({ width, zoom, count, generic: geometry, drift });
    }
    const titles = await page.evaluate(() => {
      const results = [];
      for (const text of ['程秉对你发动【经造】', '程秉对周喜发动了〖经造〗', '程秉对你发动[经造]', '<span>程秉对你发动了【</span><span style="color:rgb(255,216,0)">经造</span>】']) {
        // 显式标题的技能优先于外层事件的技能名。
        window.openingSkill = '其他技能';
        const d = ui.create.dialog(text, 'hidden', 'forcebutton'); d.open();
        const title = d.content.firstElementChild;
        results.push(title.textContent.trim() === '经造' && !d.querySelector('.dialog-ol-footer'));
        if (text.includes('span')) results.push(getComputedStyle(title.querySelector('span[style]')).color === 'rgb(255, 216, 0)');
        d.close();
      }
      return results;
    });
    assert.ok(titles.every(Boolean), JSON.stringify(titles));
    await page.evaluate(() => { window.openingSkill = undefined; });
    await page.evaluate(async () => {
      document.body.dataset.style = 'onlineUI'; lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI'; ui.arena.dataset.loadingStyle = 'dialog_ol'; prepare(); await openGain();
    });
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => styleSnapshot(bar)), await page.evaluate(() => before.bar));
    await page.evaluate(() => dialog.close());
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(__dirname, 'dialog-xinsha-prompts-results.json'), JSON.stringify(results, null, 2));
    console.log('DIALOG_XINSHA_PROMPTS_OK: 8 gainPlayerCard/shunchai + 8 native jingzao cases; skill titles; cards/bar/footer order; multiline prompt; zoom; hide/show; recreated bars; countdown restoration; Online isolation; 0 page errors/failed requests');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
