const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function installNativeHarness(page, origin, cardPrompt = true) {
  await bootstrap(page, origin, false);
  await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/dialog-online.css` });
  await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/skill-prompt.css` });
  await page.evaluate(() => {
    if (!Array.prototype.remove) Array.prototype.remove = function (item) { const index = this.indexOf(item); if (index >= 0) this.splice(index, 1); return item; };
    HTMLDivElement.prototype.show = function () { this.style.display = ''; this.classList.remove('hidden'); return this; };
    HTMLDivElement.prototype.hide = function () { this.classList.add('hidden'); return this; };
    HTMLDivElement.prototype.refocus = function () { return this; };
    HTMLDivElement.prototype.delete = function () { this.remove(); return this; };
    ui.dialogs = [];
    ui.dialog = null;
    ui.update = () => {};
    ui.refresh = () => {};
    ui.create.div = (selector, parent) => {
      const node = document.createElement('div');
      node.className = (selector || '').replace(/^\./, '').replaceAll('.', ' ');
      parent?.appendChild(node);
      return node;
    };
    ui.create.caption = (text, parent) => {
      const node = ui.create.div('.caption', parent);
      node.innerHTML = text;
      return node;
    };
    lib.config.extension_十周年UI_optimizePrompt = true;
    lib.config.extension_十周年UI_simplifySkillPrompt = false;
    lib.skill = { test_skill: {}, named_skill: {} };
    game.me = { id: 'local' };
    window.decadeUI = { statics: { handTips: [] }, element: { create: (name, parent) => ui.create.div(name, parent) } };
    window.getBaseUiCreateDialog = () => null;
    window.getBaseUiCreateCharacterDialog = () => null;
    window.getBaseUiCreatePause = () => null;
    window.getBaseUiCreateArena = () => null;
    window.getBaseUiCreateButton = () => null;
    window.applyOnlineFactionDialog = value => value;
    window.applyXinshaFactionDialog = value => value;
    window.applyFactionDialogInteraction = value => value;
    window.applyHuarenDialogInteraction = value => value;
    window.prepareDialogOlOpen = () => null;
    window.syncDialogOlControls = () => {};
    window.wrapAround = (object, name, callback) => {
      const original = object[name];
      object[name] = function (...args) { return callback.call(this, original, ...args); };
      return () => { object[name] = original; };
    };
    window.wrapBefore = (object, name, callback) => {
      const original = object[name];
      object[name] = function (...args) { callback.call(this, ...args); return original.apply(this, args); };
      return () => { object[name] = original; };
    };
    window.wrapAfter = (object, name, callback) => {
      const original = object[name];
      object[name] = function (...args) { const result = original.apply(this, args); callback.call(this, result, ...args); return result; };
      return () => { object[name] = original; };
    };
  });
  await page.addScriptTag({ content: script('noname/library/element/dialog.js', 'window.NativeDialog=Dialog;lib.element.Dialog=Dialog;lib.element.dialog=Dialog.prototype;') });
  await page.addScriptTag({ content: script('noname/library/element/content.js', 'window.NativeContent=Content;') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/handtip.js', 'window.showHandTip=t;') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPromptText.js', 'window.officialPromptText=officialPromptText;') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialSkillPromptData.js', 'window.officialSkillPrompts=officialSkillPrompts;') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/promptStyle.js', 'Object.assign(window,{optimizePromptKey,normalizePromptStyle,getOptimizedPromptStyle,migrateOptimizedPromptConfig});') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/xinshaPlayerCardPrompt.js', 'window.getXinshaPlayerCardPrompt=getXinshaPlayerCardPrompt;') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPlayerPopup.js', 'Object.assign(window,{isOfficialPlayerPopup,syncOfficialPlayerPopups});') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPromptBridge.js', 'Object.assign(window,{getOfficialScenePrompt,findOfficialPromptEntry,formatOfficialTemplate});') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPrompt.js', 'window.officialPrompt={officialColors,officialText,plainPrompt,skillNameForPrompt,selectionRange,cardForPrompt,targetRangeForPrompt,buildOfficialPrompt,renderOfficialPrompt};') });
  await page.evaluate(() => Object.assign(window, officialPrompt));
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/xinshaPromptData.js', 'Object.assign(window,{xinshaPromptEntries,xinshaPhasePrompt});') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/xinshaPrompt.js', 'Object.assign(window,{xinshaPromptColors,findXinshaPromptEntry,buildXinshaPrompt,renderXinshaPrompt});') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/simplifiedSkillPrompt.js', 'Object.assign(window,{isSkillPromptSimplified,getSimplifiedSkillPrompt});') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/dialog-ol-layout.js', 'Object.assign(window,{syncDialogOlLayoutMarker});') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/optimizedPrompt.js', 'window.optimizedPrompt={configKey,addOptimizedPrompt,addOptimizedPromptText,prepareOptimizedPrompt,refreshOptimizedPrompt,closeOptimizedPrompt,clearOptimizedPrompts,initOptimizedPromptHooks};') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/ui/create.js', 'window.uiCreateDialog=s;') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/dialog-card-animations-xinsha.js', 'window.xinshaDialogCardAnimations=xinshaDialogCardAnimations;') });
  await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/dialog.js', 'window.applyDialogOverrides=t;window.dialogOpen=s;') });
  await page.evaluate(cardPrompt => {
    const makeHook = () => ({ handlers: [], add(handler) { this.handlers.push(handler); } });
    lib.hooks = { checkBegin: makeHook(), checkButton: makeHook(), checkEnd: makeHook(), uncheckEnd: makeHook() };
    game.over = function () {};
    lib.config.extension_十周年UI_cardPrompt = cardPrompt;
  }, cardPrompt);
  await page.addScriptTag({ content: script('extension/十周年UI/src/ui/cardPrompt.js', 'window.initCardPrompt=T;') });
  await page.evaluate(() => {
    Object.assign(window, window.optimizedPrompt);
    decadeUI.showHandTip = text => showHandTip(text, decadeUI);
    ui.create.dialog = window.uiCreateDialog;
    lib.element.dialog.open = window.dialogOpen;
    window.restoreDialog = window.applyDialogOverrides();
    window.initCardPrompt({ game, ui });
  });
}

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await installNativeHarness(page, origin);
    const baseStyle = await page.evaluate(() => {
      _status.event = { skill: 'test_skill', prompt: '基础样式提示', prompt2: '基础详情', player: game.me, isMine: () => true };
      const dialog = ui.create.dialog('基础样式提示');
      _status.event.dialog = dialog;
      dialog.addText('基础详情');
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      const result = { tipDisplay: tip ? getComputedStyle(tip).display : 'none' };
      dialog.close();
      return result;
    });
    assert.notEqual(baseStyle.tipDisplay, 'none', '基础 dialog.css 未显示优化 hand-tip');
    await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/dialogOK.css` });
    const fallbackPrompts = await page.evaluate(() => {
      lib.skill.qiaoshi = {};
      lib.translate.qiaoshi = '樵拾';
      get.skillTranslation = name => lib.translate[name] || name;
      const parent = { name: 'createTrigger', skill: 'qiaoshi' };
      _status.event = { name: 'chooseBool', prompt2: '双方各摸一张牌', player: game.me, isMine: () => true, getParent: () => parent };
      const dialog = ui.create.dialog();
      _status.event.dialog = dialog;
      dialog.addText(_status.event.prompt2);
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      const result = { text: tip?.textContent || '', visible: !!tip && getComputedStyle(tip).display !== 'none' && !tip.classList.contains('hidden') };
      dialog.close();
      return result;
    });
    assert.match(fallbackPrompts.text, /是否发动.*樵拾/, '仅有技能详情时缺少发动确认兜底');
    assert.equal(fallbackPrompts.visible, true, '技能发动兜底不可见');

    const hiddenPrompt = await page.evaluate(() => {
      _status.event = { name: 'ordinary_event' };
      const old = ui.create.dialog('旧普通弹窗');
      old.classList.add('prompt');
      _status.event = { name: 'chooseBool', skill: 'test_skill', prompt: '是否发动测试技能？', player: game.me, isMine: () => true };
      const dialog = ui.create.dialog(_status.event.prompt);
      dialog.classList.add('prompt');
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      const visible = !!tip && getComputedStyle(tip).display !== 'none';
      dialog.close();
      old.close();
      return visible;
    });
    assert.equal(hiddenPrompt, true, '隐藏的旧 prompt 弹窗遮蔽当前优化提示');

    const wuxieFallback = await page.evaluate(async () => {
      // 联机/包装后的选择事件可能没有直接父事件的 _info_map。
      const event = { name: 'chooseToUse', type: 'wuxie', prompt: '诸葛恪使用的无中生有即将生效。', player: game.me, isMine: () => true, getParent: () => ({ name: 'remote' }) };
      _status.event = event;
      const dialog = ui.create.dialog(event.prompt);
      dialog.classList.add('prompt');
      event.dialog = dialog;
      lib.hooks.checkEnd.handlers[0](event);
      await new Promise(resolve => setTimeout(resolve, 20));
      const tips = [...ui.arena.querySelectorAll('.hand-tip')].filter(tip => !tip.closed && !tip.classList.contains('hidden') && getComputedStyle(tip).display !== 'none');
      const text = tips.map(tip => tip.textContent).join('');
      dialog.close();
      return text;
    });
    assert.match(wuxieFallback, /是否使用.*无懈可击/, '无懈可击缺少使用确认提示');

    const nativeBool = await page.evaluate(async () => {
      let resume;
      const saved = { pause: game.pause, resume: game.resume, countChoose: game.countChoose, confirm: ui.create.confirm };
      game.pause = () => new Promise(resolve => { resume = resolve; });
      game.resume = () => {};
      game.countChoose = () => {};
      ui.create.confirm = () => {};
      const event = { name: 'chooseBool', prompt: '是否发动【樵拾】？', prompt2: '双方各摸一张牌', player: game.me, isMine: () => true, getParent: () => ({ skill: 'qiaoshi' }) };
      _status.event = event;
      const pending = NativeContent.chooseBool(event, null, game.me);
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      const during = { text: tip?.textContent || '', visible: !!tip && !tip.closed && !tip.classList.contains('hidden') && getComputedStyle(tip).display !== 'none' };
      event.result = { bool: false };
      resume();
      await pending;
      const closed = tip.closed;
      Object.assign(game, { pause: saved.pause, resume: saved.resume, countChoose: saved.countChoose });
      ui.create.confirm = saved.confirm;
      return { ...during, closed };
    });
    assert.match(nativeBool.text, /是否发动.*樵拾/);
    assert.equal(nativeBool.visible, true, '本体 chooseBool 等待确认时提示不可见');
    assert.equal(nativeBool.closed, true, '本体 chooseBool 取消后提示未清理');

    const noReplacement = await page.evaluate(() => {
      const savedTranslation = get.skillTranslation;
      get.skillTranslation = () => '';
      _status.event = { name: 'chooseBool', skill: 'untranslated_skill', prompt2: '必须保留的说明', player: game.me, isMine: () => true };
      const dialog = ui.create.dialog();
      dialog.addText(_status.event.prompt2);
      const detail = dialog.querySelector('.decade-optimized-detail');
      const visible = getComputedStyle(detail).display !== 'none';
      dialog.close();
      get.skillTranslation = savedTranslation;
      return visible;
    });
    assert.equal(noReplacement, true, '无法生成替代提示时仍然隐藏原说明');

    const rawWuxie = await page.evaluate(async () => {
      lib.config.extension_十周年UI_optimizePrompt = false;
      get.slimNameHorizontal = name => name;
      const translate = get.translation;
      get.translation = value => Array.isArray(value) ? value.map(translate).join('、') : translate(value);
      lib.translate.wuxie = '无懈可击';
      const results = [];
      for (const info of [null, { state: -1, isJudge: true, target: game.me, card: { name: 'lebu' } }, { state: 1, player: { name: '诸葛恪' }, multitarget: true, targets: ['甲', '乙'], card: { name: 'wuzhong' } }]) {
        const event = { name: 'chooseToUse', type: 'wuxie', info_map: info, player: game.me, getParent: () => ({}) };
        _status.event = event;
        lib.hooks.checkEnd.handlers[0](event);
        await new Promise(resolve => setTimeout(resolve, 20));
        results.push(ui.cardDialog?.textContent || '');
        ui.cardDialog?.close();
        delete ui.cardDialog;
      }
      lib.config.extension_十周年UI_optimizePrompt = true;
      return results;
    });
    rawWuxie.forEach(text => assert.match(text, /是否使用.*无懈可击/, `普通出牌提示缺少无懈可击兜底: ${JSON.stringify({ rawWuxie, errors })}`));
    assert.match(rawWuxie[1], /乐不思蜀即将失效/, '本体 info_map 的判定无懈信息未保留');
    assert.match(rawWuxie[2], /甲.*乙/, '多目标无懈提示丢失目标');


    const local = await page.evaluate(() => {
      _status.event = { skill: 'test_skill', prompt: '主提示', prompt2: '技能详情', player: game.me, isMine: () => true };
      const dialog = ui.create.dialog('主提示');
      _status.event.dialog = dialog;
      dialog.addText('技能详情');
      const main = dialog.querySelector('.decade-optimized-main');
      const detail = dialog.querySelector('.decade-optimized-detail');
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      return { promptNode: !!main, detailHidden: !!detail && getComputedStyle(detail).display === 'none', tipText: tip?.textContent || '', tipDisplay: tip ? getComputedStyle(tip).display : 'none', empty: dialog.dataset.decadeOptimizedEmpty, dialogVisibility: getComputedStyle(dialog).visibility };
    });
    assert.equal(local.promptNode, true, '主 prompt 未标记隐藏节点');
    assert.equal(local.detailHidden, true, '技能 prompt2 未隐藏');
    assert.match(local.tipText, /主提示/);
    assert.notEqual(local.tipDisplay, 'none', `打开的本地 skill hand-tip 不可见: ${JSON.stringify(local)}`);
    assert.equal(local.empty, 'true', `纯提示 dialog 未标记 empty: ${JSON.stringify(local)}`);
    assert.equal(local.dialogVisibility, 'hidden', `纯提示 dialog 未隐藏: ${JSON.stringify(local)}`);

    const prebuilt = await page.evaluate(() => {
      _status.event = { name: 'ordinary_event', player: game.me, isMine: () => true };
      const dialog = ui.create.dialog('###预制主提示###预制详情', 'hidden');
      _status.event = { name: 'chooseButton', skill: 'test_skill', player: game.me, isMine: () => true };
      dialog.open();
      const main = dialog.querySelector('.decade-optimized-main');
      const detail = dialog.querySelector('.decade-optimized-detail');
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      return { root: dialog.dataset.decadeOptimizedPrompt || '', main: !!main, detailHidden: !!detail && getComputedStyle(detail).display === 'none', tip: tip?.textContent || '' };
    });
    assert.equal(prebuilt.root, 'skill', '预制 hidden dialog 交给 chooseButton 后未识别优化提示');
    assert.equal(prebuilt.main, true, '预制 hidden dialog 主提示未标记');
    assert.equal(prebuilt.detailHidden, true, '预制 hidden dialog 详情未隐藏');
    assert.match(prebuilt.tip, /预制主提示/, '预制 hidden dialog 未显示 hand-tip');

    const captionUpdated = await page.evaluate(() => {
      const event = { skill: 'test_skill', prompt: '更新前提示', prompt2: '更新详情', player: game.me, isMine: () => true };
      _status.event = event;
      const dialog = ui.create.dialog('更新前提示');
      event.dialog = dialog;
      dialog.addText('更新详情');
      dialog.setCaption('更新后提示');
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      return tip?.textContent || '';
    });
    assert.match(captionUpdated, /更新后提示/, 'setCaption 后 hand-tip 未同步主提示');

    const hiddenAndFunction = await page.evaluate(() => {
      const hiddenEvent = { skill: 'test_skill', prompt: '隐藏后提示', prompt2: '隐藏后详情', player: game.me, isMine: () => true };
      _status.event = hiddenEvent;
      const hiddenDialog = ui.create.dialog('hidden', '隐藏后提示');
      hiddenEvent.dialog = hiddenDialog;
      hiddenDialog.addText('隐藏后详情');
      const beforeOpen = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].some(node => node.textContent.includes('隐藏后提示'));
      hiddenDialog.open();
      const afterOpen = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].some(node => node.textContent.includes('隐藏后提示'));
      const functionEvent = { skill: 'test_skill', prompt: () => '函数主提示', prompt2: '函数详情', player: game.me, isMine: () => true };
      _status.event = functionEvent;
      const functionDialog = ui.create.dialog('函数主提示');
      functionEvent.dialog = functionDialog;
      functionDialog.addText('函数详情');
      const functionTip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].some(node => node.textContent.includes('函数主提示'));
      return { beforeOpen, afterOpen, functionTip };
    });
    assert.equal(hiddenAndFunction.beforeOpen, false, 'hidden dialog 在 open 前显示 hand-tip');
    assert.equal(hiddenAndFunction.afterOpen, true, 'hidden dialog open 后未显示 hand-tip');
    assert.equal(hiddenAndFunction.functionTip, true, '函数 prompt 未显示到 hand-tip');

    const embedded = await page.evaluate(() => {
      const event = { skill: 'test_skill', prompt: '###内嵌主提示###内嵌详情', player: game.me, isMine: () => true };
      _status.event = event;
      const dialog = ui.create.dialog('###内嵌主提示###内嵌详情');
      event.dialog = dialog;
      const main = dialog.querySelector('.decade-optimized-main');
      const detail = dialog.querySelector('.decade-optimized-detail');
      const functionEvent = { skill: 'test_skill', prompt: () => '###函数主提示###函数详情', player: game.me, isMine: () => true };
      _status.event = functionEvent;
      const functionDialog = ui.create.dialog('###函数主提示###函数详情');
      functionEvent.dialog = functionDialog;
      return { main: !!main, detail: !!detail && getComputedStyle(detail).display === 'none', functionMain: !!functionDialog.querySelector('.decade-optimized-main'), functionDetail: !!functionDialog.querySelector('.decade-optimized-detail') };
    });
    assert.equal(embedded.main, true, '###主提示###详情 未识别主 prompt');
    assert.equal(embedded.detail, true, '###主提示###详情 未隐藏详情');
    assert.equal(embedded.functionMain, true, '函数返回 ### 主 prompt 未识别');
    assert.equal(embedded.functionDetail, true, '函数返回 ### 详情未隐藏');

    const automatic = await page.evaluate(() => {
      const event = { name: 'chooseTarget', skill: 'test_skill', player: game.me, isMine: () => true };
      _status.event = event;
      const dialog = ui.create.dialog('自动目标提示');
      event.dialog = dialog;
      return !!dialog.dataset.decadeOptimizedPrompt;
    });
    assert.equal(automatic, true, '无 event.prompt 的 chooseTarget 自动提示未识别');

    const cyclicNormal = await page.evaluate(() => {
      const event = { name: 'ordinary_event', prompt: '环普通提示', player: game.me, isMine: () => true };
      event.getParent = () => event;
      _status.event = event;
      const dialog = ui.create.dialog('环普通提示');
      return !!dialog.dataset.decadeOptimizedPrompt;
    });
    assert.equal(cyclicNormal, false, '非技能父环被误判为技能');

    const interactive = await page.evaluate(() => {
      _status.event = { skill: 'test_skill', prompt: '按钮提示', prompt2: '按钮详情', player: game.me, isMine: () => true };
      const dialog = ui.create.dialog('按钮提示');
      _status.event.dialog = dialog;
      dialog.addText('按钮详情');
      const buttons = ui.create.div('.buttons', dialog.content);
      buttons.appendChild(document.createElement('button'));
      dialog.buttons = [buttons.firstChild];
      dialog.open();
      return { dialogDisplay: getComputedStyle(dialog).display, dialogVisibility: getComputedStyle(dialog).visibility, buttons: dialog.buttons.length, empty: dialog.dataset.decadeOptimizedEmpty };
    });
    assert.notEqual(interactive.dialogDisplay, 'none', '含交互按钮的 dialog 被当成纯提示隐藏');
    assert.notEqual(interactive.dialogVisibility, 'hidden', '含交互按钮的 dialog 被当成纯提示隐藏');
    assert.equal(interactive.buttons, 1);

    const nested = await page.evaluate(() => {
      const firstEvent = { skill: 'test_skill', prompt: '第一层提示', prompt2: '第一层详情', player: game.me, isMine: () => true };
      _status.event = firstEvent;
      const first = ui.create.dialog('第一层提示');
      firstEvent.dialog = first;
      first.addText('第一层详情');
      const secondEvent = { skill: 'test_skill', prompt: '第二层提示', prompt2: '第二层详情', player: game.me, isMine: () => true };
      _status.event = secondEvent;
      const second = ui.create.dialog('第二层提示');
      secondEvent.dialog = second;
      second.addText('第二层详情');
      const secondShown = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].some(node => node.textContent.includes('第二层提示') && getComputedStyle(node).display !== 'none');
      second.close();
      const firstShown = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].some(node => node.textContent.includes('第一层提示') && getComputedStyle(node).display !== 'none');
      return { secondShown, firstShown };
    });
    assert.equal(nested.secondShown, true, '嵌套 dialog 未显示顶层 hand-tip');
    assert.equal(nested.firstShown, true, '关闭嵌套 dialog 后未恢复上一层 hand-tip');

    const toggled = await page.evaluate(() => {
      const event = { skill: 'test_skill', prompt: '切换主提示', prompt2: '切换详情', player: game.me, isMine: () => true };
      _status.event = event;
      const dialog = ui.create.dialog('切换主提示');
      event.dialog = dialog;
      dialog.addText('切换详情');
      lib.config.extension_十周年UI_optimizePrompt = false;
      refreshOptimizedPrompt();
      const restored = [...dialog.querySelectorAll('.decade-optimized-main,.decade-optimized-detail')].every(node => getComputedStyle(node).display !== 'none');
      return { restored, root: dialog.dataset.decadeOptimizedPrompt || '' };
    });
    assert.equal(toggled.restored, true, '关闭优化提示后原节点未恢复');
    assert.equal(toggled.root, '', '关闭优化提示后 dialog 标记未清理');
    await page.evaluate(() => { lib.config.extension_十周年UI_optimizePrompt = true; });

    const cardPromptGuard = await page.evaluate(async () => {
      const event = { skill: 'test_skill', prompt: '卡牌守卫提示', prompt2: '卡牌守卫详情', player: game.me, isMine: () => true };
      _status.event = event;
      const dialog = ui.create.dialog('卡牌守卫提示');
      event.dialog = dialog;
      dialog.addText('卡牌守卫详情');
      const cardDialog = decadeUI.showHandTip('旧卡牌提示');
      cardDialog._isLuckyCardTip = false;
      ui.cardDialog = cardDialog;
      const checkEnd = lib.hooks.checkEnd.handlers[0];
      checkEnd?.({ player: game.me, name: 'chooseToUse' });
      await new Promise(resolve => setTimeout(resolve, 20));
      return { closed: cardDialog.closed, removed: !ui.cardDialog, className: cardDialog.className };
    });
    assert.equal(cardPromptGuard.closed, true, '优化提示启用时 cardPrompt 未关闭旧 hand-tip');
    assert.equal(cardPromptGuard.removed, true, '优化提示启用时 cardPrompt 未清理 ui.cardDialog');

    const cardPromptNormal = await page.evaluate(async () => {
      lib.config.extension_十周年UI_optimizePrompt = false;
      get.skillTranslation = name => name;
      get.select = () => [1, 1];
      ui.selected = { cards: [] };
      const event = { player: game.me, name: 'chooseToUse', respondTo: [game.me, { name: 'sha' }], getParent: () => ({ skill: 'test_skill' }) };
      _status.event = event;
      lib.hooks.checkEnd.handlers[0]?.(event);
      await new Promise(resolve => setTimeout(resolve, 20));
      const tip = ui.cardDialog;
      const result = { created: !!tip, optimizedClass: !!tip?.classList?.contains('decade-optimized-hand-tip') };
      tip?.close?.();
      delete ui.cardDialog;
      lib.config.extension_十周年UI_optimizePrompt = true;
      return result;
    });
    assert.equal(cardPromptNormal.created, true, '关闭优化提示后 cardPrompt 未恢复');
    assert.equal(cardPromptNormal.optimizedClass, false, '普通 cardPrompt 错误复用优化 hand-tip');

    const remote = await page.evaluate(() => {
      _status.event = { skill: 'test_skill', prompt: '远端提示', prompt2: '远端详情', player: { id: 'remote' }, isMine: () => false };
      const dialog = ui.create.dialog('远端提示');
      _status.event.dialog = dialog;
      dialog.addText('远端详情');
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      return { tipText: tip?.textContent || '', tipDisplay: tip ? getComputedStyle(tip).display : 'none' };
    });
    assert.doesNotMatch(remote.tipText, /远端提示/);

    const normal = await page.evaluate(() => {
      lib.config.extension_十周年UI_optimizePrompt = false;
      _status.event = { prompt: '普通提示', prompt2: '普通详情' };
      const dialog = ui.create.dialog('普通提示');
      _status.event.dialog = dialog;
      dialog.addText('普通详情');
      const text = dialog.textContent;
      lib.config.extension_十周年UI_optimizePrompt = true;
      return text;
    });
    assert.match(normal, /普通提示/);
    assert.match(normal, /普通详情/);

    const offThenOn = await page.evaluate(() => {
      lib.config.extension_十周年UI_optimizePrompt = false;
      const event = { skill: 'test_skill', prompt: '切换后主提示', prompt2: '切换后详情', player: game.me, isMine: () => true };
      _status.event = event;
      const dialog = ui.create.dialog('切换后主提示');
      event.dialog = dialog;
      dialog.addText('切换后详情');
      const offRoot = !!dialog.dataset.decadeOptimizedPrompt;
      lib.config.extension_十周年UI_optimizePrompt = true;
      refreshOptimizedPrompt();
      return { offRoot, onRoot: dialog.dataset.decadeOptimizedPrompt || '', tip: [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].some(node => node.textContent.includes('切换后主提示')) };
    });
    assert.equal(offThenOn.offRoot, false, '关闭时创建 dialog 错误显示优化标记');
    assert.equal(offThenOn.onRoot, 'skill', '重新开启后未恢复优化标记');
    assert.equal(offThenOn.tip, true, '重新开启后未恢复 hand-tip');

    const named = await page.evaluate(() => {
      const parent = { name: 'named_skill', prompt2: '命名技能详情', getParent() { return this; } };
      _status.event = { prompt: '命名主提示', prompt2: '命名技能详情', player: game.me, isMine: () => true, getParent: () => parent };
      const dialog = ui.create.dialog('命名主提示');
      _status.event.dialog = dialog;
      dialog.addText('命名技能详情');
      return !!dialog.dataset.decadeOptimizedPrompt;
    });
    assert.equal(named, true);
    assert.match(fs.readFileSync(path.resolve(__dirname, '../src/ui/cardPrompt.js'), 'utf8'), /refreshOptimizedPrompt|clearOptimizedPrompts/);
    const gameOverCleanup = await page.evaluate(() => {
      const event = { skill: 'test_skill', prompt: '结束清理提示', prompt2: '结束清理详情', player: game.me, isMine: () => true };
      _status.event = event;
      const dialog = ui.create.dialog('结束清理提示');
      event.dialog = dialog;
      dialog.addText('结束清理详情');
      const tip = [...ui.arena.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].at(-1);
      game.over();
      return { closed: !!tip?.closed, root: dialog.dataset.decadeOptimizedPrompt || '' };
    });
    assert.equal(gameOverCleanup.closed, true, 'game.over 未关闭优化 hand-tip');
    assert.equal(gameOverCleanup.root, '', 'game.over 未清理 dialog 优化标记');

    await page.evaluate(() => {
      for (const dialog of [...ui.dialogs]) dialog.close();
      document.head.insertAdjacentHTML('beforeend', '<style>html,body,#arena{width:100%;height:100%;margin:0}#arena{position:relative;background:#30291f}.hand-tip{position:absolute!important;bottom:30%!important;font-family:sans-serif!important}</style>');
      get.skillTranslation = name => lib.translate[name] || name;
      _status.event = { name: 'chooseBool', prompt2: '双方各摸一张牌', player: game.me, isMine: () => true, getParent: () => ({ skill: 'qiaoshi' }) };
      const dialog = ui.create.dialog();
      dialog.addText(_status.event.prompt2);
    });
    await page.screenshot({ path: path.resolve(__dirname, '../.codex-tmp/optimized-prompt-fallback.png') });
    assert.deepEqual(errors, []);
    console.log('OPTIMIZED_PROMPT_OK', JSON.stringify({ nativeDialog: true, nativeChooseBool: true, skillFallback: true, hiddenDialog: true, wuxieFallback: true, wuxieInfoMap: true, interactivePreserved: true, remoteHidden: true, ordinaryRestored: true, errors }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

module.exports = { installNativeHarness, server, chromium, assert, script };
if (require.main === module) run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
