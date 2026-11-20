// 真正执行本体取牌步骤、Click.ok/cancel、通用Dialog.open和雷的一将取牌布局。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const parser = require(path.join(require('node:os').homedir(), '.codex/tools/rea-6.5.0/node_modules/@babel/parser'));
const source = read('noname/library/element/content.js');
const content = parser.parse(source, { sourceType: 'module' }).program.body.find(node => node.type === 'VariableDeclaration' && node.declarations[0].id.name === 'Content').declarations[0].init;
const steps = Object.fromEntries(content.properties.filter(node => ['chooseButton', 'choosePlayerCard', 'gainPlayerCard', 'discardPlayerCard'].includes(node.key.name)).map(node => [node.key.name, source.slice(node.value.start, node.value.end)]));

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
    for (const file of ['src/styles/layout-xinsha.css', 'ui/styles/fonts-xinsha.css']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/${file}` });
    await page.evaluate(steps => {
      document.body.dataset.style = 'othersOff';
      document.body.innerHTML = '<div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_xinsha"></div></div>';
      ui.window = document.querySelector('#window'); ui.window.style.cssText = 'position:absolute;inset:0';
      ui.arena = document.querySelector('#arena'); ui.arena.style.cssText = 'position:absolute;inset:12px 36px 8px';
      ui.control = ui.create.div('', ui.arena); ui.control.id = 'dui-controls'; ui.control.innerHTML = '<button>确定</button><button>取消</button>';
      ui.dialogs = []; ui.controls = []; ui.updates = [];
      ui.selected = { buttons: [], cards: [], targets: [] };
      Object.assign(lib.config, { extension_十周年UI_newDecadeStyle: 'othersOff', unauto_choose: true });
      lib.element.content = Object.fromEntries(Object.entries(steps).map(([key, value]) => [key, (0, eval)(value)]));
      lib.filter = { all: () => true };
      lib.hooks = { checkEnd: new Set(), uncheckEnd: new Set() }; lib.onover = [];
      game.me = { hasSkillTag: () => false, node: {} }; game.over = game.pause = game.check = () => {};
      game.uncheck = () => { ui.selected.buttons = []; };
      game.resume = () => { const event = _status.event; event.resumed = (event.resumed || 0) + 1; window.settled = event.name === 'chooseButton' ? undefined : lib.element.content[event.name]?.[1]?.(event, null, game.me); if (event.name === 'chooseButton') event.dialog.close(); };
      Object.assign(get, { select: value => value, cnNumber: value => String(value), subtype: card => card.subtype, subtypes: card => [card.subtype], links: buttons => buttons.map(button => button.link), event: () => _status.event });
      const translate = get.translation; get.translation = value => value?.label || translate(value);
      Array.prototype.randomSort = function () { return this; };
      Array.prototype.remove = function (value) { const i = this.indexOf(value); if (i >= 0) this.splice(i, 1); };
      ui.refresh = ui.update = ui.updatec = () => {};
      ui.create.caption = (text, parent) => { const node = ui.create.div('.caption', parent); node.innerHTML = text; return node; };
      ui.create.buttonChooseAll = () => {};
      ui.create.buttons = (cards, type, parent) => cards.map(card => {
        const button = ui.create.card(parent); button.init(['spade', 7, 'sha']); button.link = card;
        button.classList.add('button'); if (type === 'blank') button.classList.add('blank');
        const select = () => { if (!button.classList.contains('selectable')) return; button.classList.toggle('selected'); ui.selected.buttons = button.classList.contains('selected') ? [button] : []; };
        button.onclick = select; button.addEventListener('touchend', select); return button;
      });
      window.decadeUI = { element: { create: (name, parent) => ui.create.div('.' + name, parent) }, get: { bodySize: () => ({ width: ui.window.clientWidth, height: ui.window.clientHeight }) }, isMobile: () => false };
      HTMLDivElement.prototype.show = function () { this.classList.remove('hidden'); return this; };
      HTMLDivElement.prototype.hide = function () { this.classList.add('hidden'); return this; };
      HTMLDivElement.prototype.delete = function () { this.remove(); };
      HTMLDivElement.prototype.refocus = HTMLDivElement.prototype.unfocus = () => {};
      window.prepareOptimizedPrompt = window.refreshOptimizedPrompt = () => {};
      window.skillNameForPrompt = () => '密运';
      window.getOptimizedPromptStyle = () => 'off';
      window.getConfig = () => true;
      window.delay = () => Promise.resolve();
    }, steps);
    for (const [file, expose] of [
      ['noname/library/element/dialog.js', 'window.EngineDialog=Dialog;lib.element.Dialog=Dialog;'],
      ['noname/ui/click/index.js', 'window.engineClick=new Click();ui.click.ok=engineClick.ok;ui.click.cancel=engineClick.cancel;'],
      ['extension/十周年UI/src/ui/xinshaPlayerCardPrompt.js', 'window.getXinshaPlayerCardPrompt=getXinshaPlayerCardPrompt;'],
      ['extension/十周年UI/src/ui/dialog-ol-layout.js', 'Object.assign(window,{prepareDialogOlOpen,syncDialogOlLayoutMarker,updateDialogOlLayout,releaseDialogOlLayout});'],
      ['extension/十周年UI/src/ui/dialog-ol-controls.js', 'window.syncDialogOlControls=syncDialogOlControls;'],
      ['extension/十周年UI/src/ui/dialog-card-animations-xinsha.js', 'window.xinshaDialogCardAnimations=xinshaDialogCardAnimations;decadeUI.dialogCardAnimations=xinshaDialogCardAnimations;'],
      ['extension/十周年UI/src/overrides/dialog.js', 'EngineDialog.prototype.open=s;'],
    ]) await page.addScriptTag({ content: script(file, expose) });
    await page.addScriptTag({ content: script('extension/雷的一将/utils/shunchaiBeautify.js', 'installShunchaiBeautify();').replaceAll('import.meta.url', JSON.stringify(`${origin}/extension/雷的一将/utils/shunchaiBeautify.js`)) });
    await page.evaluate(() => {
      ui.create.dialog = (...args) => new EngineDialog(...args);
      ui.update = () => { updateDialogOlLayout(ui.dialog, ui.arena); syncDialogOlControls(ui.dialog, ui.arena, ui.window, ui.update); };
      window.setupEvent = (name = 'chooseButton') => {
        const event = { name, player: game.me, isMine: () => true, isOnline: () => false, custom: { add: { confirm() { event.confirmed = (event.confirmed || 0) + 1; } } } };
        _status.event = event; ui.selected.buttons = []; return event;
      };
      window.makePlain = () => {
        const event = setupEvent(); const cards = Array.from({ length: 4 }, () => ({ name: 'sha' }));
        const dialog = event.dialog = ui.create.dialog('密运', cards, 'hidden'); dialog.open();
        window.currentDialog = dialog; window.currentEvent = event; return dialog;
      };
      window.makeGain = async (name, touch = false) => {
        lib.config.touchscreen = touch;
        const event = setupEvent(name), hand = Array.from({ length: 4 }, () => ({ name: 'sha' }));
        const target = { label: '测试目标', getCards: () => hand, getGainableCards: (player, zone) => zone === 'h' ? hand : [], getDiscardableCards: (player, zone) => zone === 'h' ? hand : [], isUnderControl: () => false };
        Object.assign(event, { target, position: 'he', visible: true, forced: false, filterButton: lib.filter.all, selectButton: [1, 1], resume() {}, finish() {} });
        await lib.element.content[name][0](event, null, game.me);
        window.currentDialog = event.dialog; window.currentEvent = event; return event.dialog;
      };
      window.entries = () => currentDialog.buttons.flatMap(button => button.getAnimations()).filter(a => Math.abs(a.effect.getTiming().duration - 800 / 3) < 1);
      window.selections = () => currentDialog.buttons.flatMap(button => button.getAnimations()).filter(a => Math.abs(a.effect.getTiming().duration - 20000 / 30) < 1);
      window.finishEntries = async () => { for (const animation of entries()) animation.finish(); await Promise.resolve(); await Promise.resolve(); };
      window.pick = touch => { const card = currentDialog.buttons.find(button => button.closest('.lei-yijiang-sc-h')) || currentDialog.buttons[0]; card.classList.add('selectable'); if (touch) card.dispatchEvent(new Event('touchend', { bubbles: true })); else card.click(); return card; };
    });
    await page.evaluate(() => makePlain());
    await page.waitForFunction(() => entries().length > 0);
    const entry = await page.evaluate(() => {
      const card = currentDialog.buttons[0], animation = entries().find(a => a.effect.target === card);
      animation.pause(); animation.currentTime = 0; const start = card.getBoundingClientRect().toJSON();
      animation.currentTime = animation.effect.getTiming().duration / 2; const middle = card.getBoundingClientRect().toJSON();
      animation.currentTime = animation.effect.getTiming().duration; const end = card.getBoundingClientRect().toJSON();
      return { start, middle, end, overflow: getComputedStyle(card.parentElement).overflowY, identity: card === currentDialog.buttons[0] };
    });
    assert.ok(entry.start.top < entry.middle.top && entry.middle.top < entry.end.top, JSON.stringify(entry));
    assert.ok(entry.start.left > entry.end.left, JSON.stringify(entry));
    assert.equal(entry.overflow, 'visible'); assert.equal(entry.identity, true);
    await page.evaluate(() => { for (const animation of entries()) { animation.pause(); animation.currentTime = animation.effect.getTiming().duration * .5; } });
    await page.screenshot({ path: path.join(__dirname, 'dialog-xinsha-card-entry.png') });
    await page.evaluate(() => finishEntries());
    await page.evaluate(() => { window.chosen = pick(false); window.pendingConfirm = ui.click.ok(); ui.click.ok(); });
    const selection = await page.evaluate(() => {
      const animation = selections()[0]; animation.pause(); animation.currentTime = 0;
      const start = chosen.getBoundingClientRect().toJSON(); animation.currentTime = animation.effect.getTiming().duration / 2;
      const middle = chosen.getBoundingClientRect().toJSON();
      return { start, middle, origin: getComputedStyle(chosen).transformOrigin, connected: currentDialog.isConnected, result: currentEvent.result, opacity: getComputedStyle(chosen).opacity };
    });
    assert.equal(selection.connected, true); assert.equal(selection.result, undefined);
    assert.ok(Math.abs(selection.middle.left - selection.start.left) < .5 && Math.abs(selection.middle.bottom - selection.start.bottom) < .5, JSON.stringify(selection));
    assert.ok(Math.abs(selection.middle.width / selection.start.width - 1.25) < .01, JSON.stringify(selection));
    assert.ok(Math.abs(Number(selection.opacity) - .5) < .01);
    await page.screenshot({ path: path.join(__dirname, 'dialog-xinsha-card-selection.png') });
    await page.evaluate(async () => { selections().forEach(a => a.finish()); await pendingConfirm; await settled; });
    assert.deepEqual(await page.evaluate(() => ({ connected: currentDialog.isConnected, confirmed: currentEvent.confirmed, resumed: currentEvent.resumed, same: currentEvent.result.buttons[0] === chosen })), { connected: false, confirmed: 1, resumed: 1, same: true });
    results.cases.push('new ordinary card dialog: default entry, bottom-left scale, deferred native confirm, no duplicate submission');
    for (const zoom of [1, 1.5]) for (const touch of [false, true]) for (const name of ['choosePlayerCard', 'gainPlayerCard', 'discardPlayerCard']) {
      await page.evaluate(async ({ zoom, touch, name }) => { document.body.style.zoom = zoom; await makeGain(name, touch); }, { zoom, touch, name });
      await page.waitForFunction(() => entries().length > 0);
      assert.equal(await page.evaluate(() => currentDialog.buttons.some(card => card.getAnimations().some(a => a.effect.getTiming().duration === 200))), false, 'legacy entry must not overlap common entry');
      await page.evaluate(() => finishEntries());
      await page.evaluate(touch => { window.chosen = pick(touch); }, touch);
      assert.deepEqual(await page.evaluate(() => ({ connected: currentDialog.isConnected, result: !!currentEvent.result, selections: selections().length, legacy: document.querySelectorAll('.lei-yijiang-sc-selection-effect').length })), { connected: true, result: false, selections: 1, legacy: 0 });
      await page.evaluate(async () => { selections().forEach(a => a.finish()); await new Promise(resolve => setTimeout(resolve, 0)); await settled; });
      assert.equal(await page.evaluate(() => currentDialog.isConnected), false);
      assert.equal(await page.evaluate(() => currentEvent.confirmed), 1);
      assert.equal(await page.evaluate(() => ui.control.classList.contains('lei-yijiang-sc-hidden-controls')), false);
      results.cases.push(`${name}, zoom=${zoom}, touch=${touch}: one shared animation before native close`);
    }
    await page.evaluate(() => { document.body.style.zoom = 1; makePlain(); });
    await page.waitForFunction(() => entries().length > 0);
    await page.evaluate(() => { currentDialog.hide(); currentDialog.show(); });
    assert.equal(await page.evaluate(() => entries().length), 4, 'hide/show must not replay entries');
    await page.evaluate(() => { currentEvent.result = { bool: false }; currentDialog.close(); });
    assert.equal(await page.evaluate(() => currentDialog.isConnected), false, 'cancel closes immediately');
    await page.evaluate(() => makePlain());
    await page.waitForFunction(() => entries().length > 0);
    await page.evaluate(async () => { await finishEntries(); window.chosen = pick(false); currentEvent.result = { bool: true, buttons: [chosen], links: [chosen.link] }; window.closePromise = currentDialog.close(); });
    assert.equal(await page.evaluate(() => currentDialog.isConnected), true, 'custom close also waits');
    await page.evaluate(async () => { selections().forEach(a => a.finish()); await closePromise; });
    assert.equal(await page.evaluate(() => currentDialog.isConnected), false);
    // 不手动结束动画，实际走完一轮确认，验证真实时间顺序。
    await page.evaluate(() => makePlain());
    await page.waitForFunction(() => entries().length > 0);
    await page.evaluate(async () => {
      await finishEntries();pick(false);window.confirmStarted=performance.now();
      // 保留本体延迟删除DOM的行为，确认500ms时就隐藏，而不是再叠一次关窗淡出。
      currentDialog.delete=function(){setTimeout(()=>this.remove(),200);};
      ui.click.ok();
    });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => currentDialog.isConnected && !currentEvent.result), true);
    await page.waitForFunction(() => !!currentEvent.result);
    const elapsed = await page.evaluate(() => performance.now() - confirmStarted);
    assert.ok(elapsed >= 480 && elapsed < 650, String(elapsed));
    assert.equal(await page.evaluate(()=>currentDialog.isConnected&&getComputedStyle(currentDialog).display==='none'),true,'500ms hides delayed-exit DOM immediately');
    await page.waitForFunction(() => !currentDialog.isConnected);
    await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
    assert.notEqual(await page.evaluate(()=>currentDialog.style.display),'none','removed dialog restores its display for reuse');
    results.cases.push(`natural playback: official close at ${Math.round(elapsed)} ms, delayed-exit DOM hidden immediately`);
    await page.evaluate(() => { _status.connectMode = true; makePlain(); });
    await page.waitForFunction(() => entries().length > 0);
    await page.evaluate(async () => { await finishEntries(); pick(false); ui.click.ok(); ui.click.ok(); });
    assert.deepEqual(await page.evaluate(() => ({ accepted: !!currentEvent.result?.bool, connected: currentDialog.isConnected, confirmed: currentEvent.confirmed })), { accepted: true, connected: true, confirmed: 1 }, 'network result is not delayed, visual close still waits');
    await page.evaluate(async () => { selections().forEach(a => a.finish()); await new Promise(resolve => setTimeout(resolve, 0)); _status.connectMode = false; });
    assert.equal(await page.evaluate(() => currentDialog.isConnected), false);
    results.cases.push('connectMode flag: immediate native result, one callback, visual close after animation');
    await page.evaluate(() => makePlain());
    await page.waitForFunction(() => entries().length > 0);
    await page.waitForTimeout(550);
    await page.evaluate(async () => {
      await finishEntries(); window.chosen = currentDialog.buttons[0];
      chosen.style.setProperty('transition', 'none', 'important');
      chosen.style.setProperty('transform', 'scale(.8)', 'important'); chosen.style.scale = '.9';
      window.transformedStart = chosen.getBoundingClientRect().toJSON(); pick(false); window.pendingConfirm = ui.click.ok();
      selections()[0].pause(); selections()[0].currentTime = 0;
    });
    const transformed = await page.evaluate(() => {
      const start = chosen.getBoundingClientRect().toJSON(); selections()[0].currentTime = selections()[0].effect.getTiming().duration / 2;
      return { before: transformedStart, start, middle: chosen.getBoundingClientRect().toJSON() };
    });
    for (const key of ['left', 'bottom', 'width', 'height']) assert.ok(Math.abs(transformed.before[key] - transformed.start[key]) < .5, JSON.stringify(transformed));
    assert.ok(Math.abs(transformed.middle.left - transformed.before.left) < .5 && Math.abs(transformed.middle.bottom - transformed.before.bottom) < .5, JSON.stringify(transformed));
    await page.evaluate(async () => { selections().forEach(a => a.finish()); await pendingConfirm; });
    results.cases.push('pre-existing transform/scale: unchanged first frame and fixed bottom-left origin');
    // 本体 AI 分支在 ui.click.ok() 后直接 event.resume()，不等待动画返回的 Promise。
    await page.evaluate(() => makePlain());
    await page.waitForFunction(() => entries().length > 0);
    const aiSelection = await page.evaluate(async () => {
      await finishEntries();
      const event = currentEvent;
      event.isMine = () => false;
      event.result = 'ai';
      event.resume = () => { window.aiAtResume = { bool: event.result?.bool, selected: ui.selected.buttons.length, connected: currentDialog.isConnected }; };
      window.ai = { basic: { chooseButton() { pick(false); return true; } } };
      await lib.element.content.chooseButton[1](event, null, game.me);
      return { ...aiAtResume, confirmed: event.confirmed, animations: selections().length };
    });
    assert.deepEqual(aiSelection, { bool: true, selected: 0, connected: false, confirmed: 1, animations: 0 }, 'AI must commit and clear selected buttons before chooseButton resumes');
    results.cases.push('native AI chooseButton: synchronous result and cleanup before resume, no stale selection for subsequent dying response');
    await page.evaluate(() => makePlain());
    await page.waitForFunction(() => entries().length > 0);
    const aiClose = await page.evaluate(() => {
      currentEvent.isMine = () => false;
      const card = pick(false);
      currentEvent.result = { bool: true, buttons: [card], links: [card.link] };
      currentDialog.close();
      return { connected: currentDialog.isConnected, animations: selections().length };
    });
    assert.deepEqual(aiClose, { connected: false, animations: 0 }, 'AI custom close must not defer event cleanup');
    for (const style of ['onlineUI', 'on']) {
      await page.evaluate(style => { lib.config.extension_十周年UI_newDecadeStyle = style; document.body.dataset.style = style; makePlain(); }, style);
      assert.equal(await page.evaluate(() => entries().length + selections().length), 0);
      await page.evaluate(() => { pick(false); ui.click.ok(); });
      assert.equal(await page.evaluate(() => !!currentEvent.result), true, 'other styles confirm immediately');
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(__dirname, 'dialog-xinsha-card-animations-results.json'), JSON.stringify(results, null, 2));
    console.log('XINSHA_DIALOG_CARD_ANIMATIONS_OK: generic default + 12 native three-action/touch/zoom cases; slanted hand entry visible beyond clip; lower-left scaling; official 500ms close without extra exit fade; one confirm; cancel; hide/show; custom close; Online/decade isolation; 0 page errors/failed requests');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
