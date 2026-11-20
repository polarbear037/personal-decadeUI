const fs = require('node:fs');
const path = require('node:path');
const { installNativeHarness, server, chromium, assert, script } = require('./optimized-prompt-browser.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await installNativeHarness(page, origin, false);
    await page.addScriptTag({ content: script('extension/十周年UI/ui/constants.js', 'Object.assign(window,{STYLE_TO_SKIN,DEFAULT_SKIN});') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/styles/style-route.js', 'window.getStyleFile=getStyleFile;') });
    await page.evaluate(origin => {
      const link = document.createElement('link');
      link.id = 'popup-animation-style';
      link.rel = 'stylesheet';
      link.href = `${origin}/extension/十周年UI/src/styles/${getStyleFile('animation', 'onlineUI')}`;
      document.head.appendChild(link);
      document.body.dataset.style = lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI';
    }, origin);
    await page.waitForFunction(() => document.querySelector('#popup-animation-style').sheet);
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/officialPlayerPopup.js', 'Object.assign(window,{isOfficialPlayerPopup,syncOfficialPlayerPopups});') });
    const playerSource = fs.readFileSync(path.resolve(__dirname, '../../../noname/library/element/player.js'), 'utf8');
    const popupSource = playerSource.slice(playerSource.indexOf('\n  popup('), playerSource.indexOf('\n  popup_old('));
    await page.addScriptTag({ content: `window.nativePlayerPopup=({${popupSource}}).popup;` });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/player/animations.js', 'window.playerDamagepop=a;') });
    const result = await page.evaluate(() => {
      document.head.insertAdjacentHTML('beforeend', '<style>html,body{margin:0;width:100%;height:100%}#arena{position:absolute;inset:0;background:#302a21}#samples,#preview{display:none}.dialog{z-index:4}.test-cover{position:absolute;inset:0;pointer-events:none}</style>');
      const records = [], broadcasts = [], effects = [];
      game.addVideo = (...args) => records.push(args);
      game.broadcast = (...args) => broadcasts.push(args);
      window.getDui = () => ({ animation: { playSpine: (...args) => effects.push(args) } });
      Object.assign(lib.translate, { wusheng: '武圣', shan: '闪', bagua: '八卦阵' });
      get.translation = text => lib.translate[text] || text;
      const player = ui.create.div('.player', ui.arena);
      player.style.cssText = 'position:absolute;left:400px;top:220px;width:180px;height:250px';
      player.$damagepop = playerDamagepop;
      player.popup = nativePlayerPopup;
      const clear = () => ui.arena.querySelectorAll('.damage.skill-popup').forEach(node => node.remove());
      const pop = text => {
        clear();
        player.popup(text, 'wood');
        const node = ui.arena.querySelector('.damage.skill-popup');
        return { text: node?.textContent || '', layer: node && +getComputedStyle(node).zIndex, inlineLayer: node?.style.zIndex };
      };
      lib.config.extension_十周年UI_optimizePrompt = true;
      const filtered = ['胜', '负', '判定生效', '判定失效', '拼点成功', '拼点失败', '闪', '八卦阵', '自定义系统提示'].map(text => ({ input: text, ...pop(text) }));
      const noAnimation = officialSkillPrompts.find(entry => entry.type === 2 && entry.aniType === 0 && !isOfficialPlayerPopup(entry.name));
      filtered.push({ input: noAnimation.name, ...pop(noAnimation.name) });
      const skill = pop('wusheng');
      const node = ui.arena.querySelector('.damage.skill-popup');
      const trigger = ui.create.div('.test-cover', ui.arena);
      trigger.style.zIndex = '5';
      const full = document.createElement('canvas');
      full.id = 'decadeUI-canvas';
      full.className = 'test-cover';
      document.body.appendChild(full);
      const sample = () => {
        const rect = node.getBoundingClientRect();
        const stack = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { popup: stack.indexOf(node), trigger: stack.indexOf(trigger), full: stack.indexOf(full) };
      };
      // 测量绘制顺序时临时开启命中测试，测完恢复，产品本身仍不拦截点击。
      node.style.setProperty('pointer-events', 'auto', 'important');
      trigger.style.pointerEvents = full.style.pointerEvents = 'auto';
      const layers = { skill: +getComputedStyle(node).zIndex, trigger: +getComputedStyle(trigger).zIndex, full: +getComputedStyle(full).zIndex, order: sample() };
      const dialog = ui.create.div('.dialog.test-cover', ui.arena);
      dialog.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:auto';
      const dialogLayer = +getComputedStyle(dialog).zIndex;
      const rect = node.getBoundingClientRect();
      const dialogOrder = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const coveredByDialog = dialogOrder.indexOf(dialog) >= 0 && dialogOrder.indexOf(node) >= 0 && dialogOrder.indexOf(dialog) < dialogOrder.indexOf(node);
      dialog.classList.add('dialog-ol-layout');
      dialog.style.setProperty('z-index', '101', 'important');
      const framedLayer = +getComputedStyle(dialog).zIndex;
      dialog.remove(); trigger.remove(); full.remove();
      const beforeNumbers = ui.arena.querySelectorAll('.skill-popup').length;
      player.$damagepop(-2, 'fire');
      const numeric = { addedText: ui.arena.querySelectorAll('.skill-popup').length - beforeNumbers, effect: effects.at(-1)?.[0] };
      lib.config.extension_十周年UI_optimizePrompt = false;
      const disabled = pop('胜');
      clear();
      lib.config.extension_十周年UI_optimizePrompt = true;
      player.popup('wusheng', 'water', false);
      const localOnly = broadcasts.length;
      player.popup('武圣', 'water', false);
      const localOnlyPreserved = broadcasts.length === localOnly;
      window.popupTest = { pop, clear, records, broadcasts, player };
      return { filtered, skill, layers, dialogLayer, coveredByDialog, framedLayer, numeric, disabled, records: records.length, broadcasts: broadcasts.length, localOnlyPreserved };
    });
    assert(result.filtered.every(row => row.text === ''), `不属于官方技能名的广播未隐藏: ${JSON.stringify(result.filtered)}`);
    assert.equal(result.skill.text, '武圣');
    assert(result.layers.skill > result.layers.trigger && result.layers.skill < result.layers.full);
    const order = result.layers.order;
    assert(order.full >= 0 && order.popup >= 0 && order.trigger >= 0 && order.full < order.popup && order.popup < order.trigger, JSON.stringify(order));
    assert(result.dialogLayer > result.layers.skill && result.coveredByDialog);
    assert.equal(result.framedLayer, 101);
    assert.equal(result.numeric.addedText, 0);
    assert.deepEqual(result.numeric.effect, { name: 'effect_shoujidonghua', action: 'play4' });
    assert.equal(result.disabled.text, '');
    assert.equal(result.records, 14);
    assert.equal(result.broadcasts, 12);
    assert.equal(result.localOnlyPreserved, true);
    const matrix = [];
    for (const style of ['on', 'off', 'othersOff', 'onlineUI', 'babysha', 'codename']) {
      await page.evaluate(async ({ style, origin }) => {
        document.body.dataset.style = lib.config.extension_十周年UI_newDecadeStyle = style;
        const link = document.querySelector('#popup-animation-style');
        const href = `${origin}/extension/十周年UI/src/styles/${getStyleFile('animation', style)}`;
        if (link.href === new URL(href).href) return;
        await new Promise((resolve, reject) => {
          link.onload = resolve;
          link.onerror = () => reject(new Error(`Cannot load ${link.href}`));
          link.href = href;
        });
      }, { style, origin });
      for (const optimizePrompt of ['off', 'online', 'xinsha', false, true]) {
        const row = await page.evaluate(optimizePrompt => {
          lib.config.extension_十周年UI_optimizePrompt = optimizePrompt;
          const { pop, records, broadcasts, player } = popupTest;
          const before = { records: records.length, broadcasts: broadcasts.length };
          const filtered = ['胜', '负', '判定生效', '判定失效', '拼点成功', '拼点失败', '闪', '八卦阵', '自定义系统提示'].map(pop);
          const skill = pop('wusheng');
          const node = ui.arena.querySelector('.skill-popup');
          const visible = node && getComputedStyle(node).display !== 'none';
          const numericBefore = records.length;
          player.$damagepop(-2, 'fire');
          return {
            style: document.body.dataset.style, optimizePrompt, filtered, skill, visible,
            animationFile: new URL(document.querySelector('#popup-animation-style').href).pathname.split('/').pop(),
            records: numericBefore - before.records, broadcasts: broadcasts.length - before.broadcasts,
            numericText: ui.arena.querySelector('.skill-popup')?.textContent,
          };
        }, optimizePrompt);
        assert(row.filtered.every(item => item.text === ''), JSON.stringify(row));
        assert.equal(row.skill.text, '武圣');
        assert.equal(row.visible, true);
        assert.equal(row.numericText, '武圣');
        assert.equal(row.records, 10);
        assert.equal(row.broadcasts, 10);
        assert.equal(row.animationFile, style === 'onlineUI' ? 'animation-online.css' : style === 'othersOff' ? 'animation-xinsha.css' : 'animation.css');
        matrix.push(row);
      }
    }
    assert.deepEqual(errors, []);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(__dirname, 'player-popup-browser.png') });
    fs.writeFileSync(path.join(__dirname, 'player-popup-browser-results.json'), JSON.stringify({ ...result, matrix, errors }, null, 2));
    console.log('PLAYER_POPUP_OK', JSON.stringify({ cases: matrix.length, ...result, errors }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
