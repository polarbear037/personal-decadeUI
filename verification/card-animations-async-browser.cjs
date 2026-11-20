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
      lib.hooks = { checkEnd: [], uncheckEnd: [] }; lib.onover = [];
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

    if(process.env.XINSHA_WITH_LEI==='1') {
      await page.addScriptTag({content:script('extension/雷的一将/utils/shunchaiSelection.js','window.installShunchaiSelection=installShunchaiSelection;')});
      await page.addScriptTag({content:script('extension/雷的一将/utils/shunchaiBeautify.js','installShunchaiBeautify();').replaceAll('import.meta.url',JSON.stringify(origin+'/extension/雷的一将/utils/shunchaiBeautify.js'))});
    }
    for (const file of ['ui/styles/lbtn/xinsha-official.css']) await page.addStyleTag({ url: origin + '/extension/十周年UI/' + file });
    await page.evaluate(() => {
      document.body.style.setProperty('--yjcm-unit','1px');
      ui.control.innerHTML='<div class="control lbtn-confirm combo-control"><div id="async-ok">确定</div><div>取消</div></div>';
      const button=document.querySelector('#async-ok');
      button.addEventListener('click',()=>{const before=performance.now();ui.click.ok();window.buttonTiming={elapsed:performance.now()-before,result:!!currentEvent.result?.bool,remaining:button.getAnimations().map(a=>a.playState)};});
    });
    for (const zoom of [1,1.5]) for (const name of ['chooseButton','choosePlayerCard','gainPlayerCard','discardPlayerCard']) {
      await page.evaluate(async ({zoom,name})=>{document.body.style.zoom=zoom;if(name==='chooseButton')makePlain();else await makeGain(name);},{zoom,name});
      await page.waitForFunction(()=>entries().length>0);
      const immediate=await page.evaluate(async()=>{
        await finishEntries();window.chosen=pick(false);const before=performance.now();ui.click.ok();ui.click.ok();
        return {elapsed:performance.now()-before,result:!!currentEvent.result?.bool,confirmed:currentEvent.confirmed,resumed:currentEvent.resumed,selected:ui.selected.buttons.length,connected:currentDialog.isConnected,inert:currentDialog.inert,listCount:ui.dialogs.length,listCopies:ui.dialogs.filter(d=>d===currentDialog).length,listed:ui.dialogs.includes(currentDialog),selections:selections().length,same:currentEvent.result?.buttons?.[0]===chosen};
      });
      assert.equal(immediate.result,true,JSON.stringify(immediate));assert.equal(immediate.confirmed,1);assert.equal(immediate.resumed,1);assert.equal(immediate.selected,0);assert.equal(immediate.same,true);assert.ok(immediate.elapsed<100,JSON.stringify(immediate));
      await page.evaluate(async()=>{await settled;});
      assert.equal(await page.evaluate(()=>currentDialog.isConnected&&currentDialog.inert&&!ui.dialogs.includes(currentDialog)),true,JSON.stringify({name,zoom,immediate,current:await page.evaluate(()=>({connected:currentDialog.isConnected,inert:currentDialog.inert,listed:ui.dialogs.includes(currentDialog),selections:selections().length}))}));
      await page.evaluate(()=>{selections().forEach(a=>a.finish());});
      await page.waitForFunction(()=>!currentDialog.isConnected);
      results.cases.push({name,zoom,immediate});
    }

    for(const flag of ['online','connectMode']){
      await page.evaluate(flag=>{if(flag==='online')game.online=true;else _status.connectMode=true;makePlain();},flag);
      await page.waitForFunction(()=>entries().length>0);
      const submitted=await page.evaluate(async()=>{await finishEntries();pick(false);ui.click.ok();ui.click.ok();return {confirmed:currentEvent.confirmed,resumed:currentEvent.resumed,result:!!currentEvent.result?.bool,inert:currentDialog.inert};});
      assert.deepEqual(submitted,{confirmed:1,resumed:1,result:true,inert:true});
      await page.evaluate(()=>selections().forEach(a=>a.finish()));await page.waitForFunction(()=>!currentDialog.isConnected);
      await page.evaluate(()=>{game.online=false;_status.connectMode=false;});results.cases.push({flag,submitted});
    }
    // 旧窗口动画期间开始并确认新事件，旧计时器不能再次确认或清空新选择。
    await page.evaluate(()=>{document.body.style.zoom=1;makePlain();});await page.waitForFunction(()=>entries().length>0);
    await page.evaluate(async()=>{await finishEntries();pick(false);ui.click.ok();window.oldDialog=currentDialog;window.oldEvent=currentEvent;makePlain();});
    await page.waitForFunction(()=>entries().length>0);
    await page.evaluate(async()=>{await finishEntries();window.chosen=pick(false);});
    await page.waitForTimeout(550);
    assert.deepEqual(await page.evaluate(()=>({oldConnected:oldDialog.isConnected,oldConfirmed:oldEvent.confirmed,newConfirmed:currentEvent.confirmed||0,newSelected:ui.selected.buttons[0]===chosen})),{oldConnected:false,oldConfirmed:1,newConfirmed:0,newSelected:true});
    // 真实鼠标按下验证按钮缩放，原生确认须在同一次click完成。
    const box=await page.locator('#async-ok').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(35);const pressing=await page.locator('#async-ok').evaluate(button=>({transform:getComputedStyle(button).transform,animations:button.getAnimations().map(a=>a.playState),transition:getComputedStyle(button).transition}));await page.mouse.up();
    const timing=await page.evaluate(()=>buttonTiming);assert.equal(timing.result,true);assert.ok(timing.elapsed<100,JSON.stringify(timing));assert.ok(pressing.transform.includes('0.75'),JSON.stringify(pressing));results.cases.push({button:timing,pressing});
    await page.waitForFunction(()=>!currentDialog.isConnected);
    // 同一个dialog在旧动画完成前复用，旧回调不能移除重新打开的窗口。
    await page.evaluate(()=>makePlain());await page.waitForFunction(()=>entries().length>0);
    await page.evaluate(async()=>{await finishEntries();pick(false);ui.click.ok();const dialog=currentDialog;const event=setupEvent();event.dialog=dialog;dialog.open();currentEvent=event;});
    await page.waitForTimeout(550);
    assert.equal(await page.evaluate(()=>currentDialog.isConnected&&!currentDialog.inert&&ui.dialogs.includes(currentDialog)),true);
    await page.evaluate(()=>{currentEvent.result={bool:false};currentDialog.close();});
    assert.equal(await page.evaluate(()=>currentDialog.isConnected),false);
    // clear与取消均不会补发确认，清理退出DOM。
    await page.evaluate(()=>makePlain());await page.waitForFunction(()=>entries().length>0);
    await page.evaluate(async()=>{await finishEntries();pick(false);ui.click.ok();xinshaDialogCardAnimations.clear();});
    assert.equal(await page.evaluate(()=>currentDialog.isConnected),false);
    for(const style of ['onlineUI','on']){
      await page.evaluate(style=>{lib.config.extension_十周年UI_newDecadeStyle=style;document.body.dataset.style=style;makePlain();pick(false);ui.click.ok();},style);
      assert.equal(await page.evaluate(()=>!!currentEvent.result?.bool&&!currentDialog.isConnected),true);
    }
    assert.deepEqual(results.errors,[]);
    console.log('ASYNC_CARD_DIALOG_OK',JSON.stringify(results));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
