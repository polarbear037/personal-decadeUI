const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const baseline = process.argv.includes('--baseline');
const cached = process.argv.includes('--cached');
(async () => {
 await new Promise(resolve => server.listen(35000 + Math.floor(Math.random() * 20000), '127.0.0.1', resolve));
 const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
 const results = { baseline, cached, cases: [], errors: [] };
 try {
  Object.assign(seed, { mode: 'identity', characters: ['standard', 'xianding'], cards: ['standard', 'extra'], hp_style: 'round',
   extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_optimizePrompt: 'online', extension_十周年UI_jindutiaoYangshi: '4', extension_雷的一将_yinpai: true });
  const page = await browser.newPage({ viewport: { width: 2052, height: 919 } });
  page.on('pageerror', e => results.errors.push(e.message)); page.on('dialog', d => d.accept());
  if (baseline || cached) await page.route('**/src/ui/dialog-ol-layout.js', route => route.fulfill({ contentType: 'text/javascript',
   body: fs.readFileSync(path.resolve(__dirname, '../src/ui/dialog-ol-layout.js'), 'utf8').replace('const description = getPrintedSkillDescription(dialog, event);', 'const description = "";'),
  }));
  await dependencies(page);
  for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js', 'stackframe@1.3.4/node_modules/stackframe/stackframe.js', 'error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js', 'stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])
   if (/as __require/.test(fs.readFileSync(path.resolve(__dirname, '../../../node_modules/.pnpm', file), 'utf8'))) await page.unroute('**/node_modules/.pnpm/' + file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.exposeFunction('capturePrintedSkillDescription', () => page.screenshot({ path: path.join(__dirname, 'printed-skill-description.png') }));
  await page.locator('#arena>.player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
  await page.evaluate(async () => {
   const { game, lib, ui, _status } = await import('/noname.js');
   const { installPrintedCards } = await import('/extension/雷的一将/utils/printedCards.js');
   game.pause(); game.resume = () => {}; game.me = game.players[0]; game.me.init('ruanji');
   _status.auto = false; _status.over = false; lib.config.auto_confirm = false;
   ui.arena.classList.remove('choose-character');
   for (const dialog of [...ui.dialogs]) dialog.close(); for (const control of [...ui.controls]) control.close();
   installPrintedCards(); await document.fonts.ready;
  });
  if (cached) await page.evaluate(fs.readFileSync(path.join(__dirname, 'printed-description-live.js'), 'utf8'));
  for (const loading of baseline || cached ? ['othersOff'] : ['othersOff', 'dialog_xinsha']) for (const zoom of baseline ? [1] : cached ? [1.5288461538461537] : [1, 1.5288461538461537]) for (const count of baseline || cached ? [11] : [3, 11, 18]) {
   const result = await page.evaluate(async ({ loading, zoom, count }) => {
    const { game, lib, ui, get, _status } = await import('/noname.js');
    ui.arena.dataset.loadingStyle = loading; game.documentZoom = zoom; document.body.style.zoom = zoom;
    game.uncheck(); for (const control of [...ui.controls]) control.close();
    const parent = new lib.element.GameEvent('chooseToUse', false); parent.player = game.me; parent.skill = 'dczhaowen_backup';
    lib.skill.dczhaowen_backup = { sourceSkill: 'dczhaowen' };
    const names = ['guohe', 'huogong', 'juedou', 'nanman', 'shunshou', 'taoyuan', 'tiesuo', 'wanjian', 'wugu', 'sha', 'shan', 'tao', 'wuzhong', 'wuxie', 'jiedao', 'lebu', 'jiu', 'bingliang'];
    const event = game.me.chooseButton([count === 3 ? '昭文' : '昭文：昭文', [names.slice(0, count).map(name => ['锦囊', '', name]), 'vcard']], false); event.parent = parent;
    _status.eventManager.setStatusEvent(event, true);
    const handle = game.Jindutiaoplayer({ id: 'printed-description-progress', parent: document.body });
    await lib.element.content.chooseButton[0](event, null, game.me);
    const dialog = event.dialog, originalButtons = dialog.buttons.slice();
    await new Promise(resolve => setTimeout(resolve, 320));
    _status.eventManager.setStatusEvent(event, true); ui.update();
    const read = () => {
     const tip = document.querySelector('.dialog-xinsha-prompt-overlay'), grid = dialog.querySelector('.lyj-printed-grid');
     const p = tip?.getBoundingClientRect(), g = grid.getBoundingClientRect(), title = dialog.querySelector('.caption').getBoundingClientRect();
     const root = dialog.getBoundingClientRect(), scale = root.width / dialog.offsetWidth;
     const progress = document.querySelector('#printed-description-progress') || handle?.bar;
     const b = progress?.getBoundingClientRect(), a = ui.control.getBoundingClientRect();
     return { title: dialog.querySelector('.caption').textContent, text: tip?.textContent || '', expected: get.skillInfoTranslation('dczhaowen', game.me),
      height: dialog.offsetHeight, topGap: (g.top - title.bottom) / scale, bottomGap: p ? (p.top - g.bottom) / scale : null,
      promptHeight: p?.height / scale, promptWidth: p?.width / scale, gridHeight: g.height / scale,
      font: tip && getComputedStyle(tip).font, letterSpacing: tip && getComputedStyle(tip).letterSpacing,
      offsets: { rootHeight: root.height / scale, titleBottom: (title.bottom - root.top) / scale, promptTop: p && (p.top - root.top) / scale, promptBottom: p && (p.bottom - root.top) / scale, controlsTop: (a.top - root.top) / scale, gridTop: (g.top - root.top) / scale, contentTop: (dialog.content.getBoundingClientRect().top - root.top) / scale },
      progressGap: p && b ? (b.top - p.bottom) / scale : null, buttonsGap: b ? (a.top - b.bottom) / scale : null,
      copies: document.querySelectorAll('.dialog-xinsha-prompt-overlay').length };
    };
    const before = read();
    if (loading === 'othersOff' && zoom === 1.5288461538461537 && count === 11) await window.capturePrintedSkillDescription();
    dialog.hide(); dialog.open(); await new Promise(r => setTimeout(r, 100));
    _status.eventManager.setStatusEvent(event, true); ui.update(); const reopened = read();
    _status.eventManager.setStatusEvent(event, true); game.check(); _status.clicked = false; ui.click.button.call(originalButtons[0]);
    const selected = ui.selected.buttons.includes(originalButtons[0]);
    const confirmationContext = { current: _status.event?.name, same: _status.event === event, getEvent: get.event()?.name, custom: String(get.event()?.custom?.replace?.confirm) };
    ui.click.ok();
    const confirmed = event.result?.bool && event.result.links[0] === originalButtons[0].link;
    dialog.close(); handle?.dispose(); await new Promise(r => setTimeout(r, 720));
    return { loading, zoom, count, ...before, reopened: reopened.text === before.text, selected, confirmed, confirmationContext,
     originalButtons: originalButtons.every((button, index) => dialog.buttons[index] === button), cleaned: !document.querySelector('.dialog-xinsha-prompt-overlay') };
   }, { loading, zoom, count });
   results.cases.push(result);
   assert.equal(result.title, '昭文');
   if (baseline) { assert.equal(result.text, '昭文'); break; }
   assert.equal(result.text, result.expected); assert(result.topGap >= 0 && result.bottomGap >= 0, JSON.stringify(result));
   assert(Math.abs(result.progressGap - 7) < .2 && result.buttonsGap > 1, JSON.stringify(result));
   for (const key of ['reopened', 'confirmed', 'originalButtons', 'cleaned']) assert.equal(result[key], true, key);
   assert.equal(result.copies, 1);
  }
  if (!baseline) {
   results.resolution = await page.evaluate(async () => {
    const { game, lib } = await import('/noname.js');
    const { getPrintedSkillDescription: text } = await import('/extension/十周年UI/src/ui/printed-skill-prompt.js');
    lib.skill.description_probe = {}; lib.skill.description_probe_child = { sourceSkill: 'description_probe' };
    lib.dynamicTranslate.description_probe = player => `当前还可声明${player.storage.description_probe}种牌。`;
    game.me.storage.description_probe = 3;
    const dialog = { dataset: { lyjTable: 'printed' } }, event = { name: 'chooseButton', player: game.me, parent: { name: 'description_probe_child' } };
    const first = text(dialog, event); game.me.storage.description_probe = 1; const changed = text(dialog, event);
    const ordinary = text({ dataset: {} }, event);
    lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI'; const online = text(dialog, event); lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
    const boundary = text(dialog, { name: 'chooseButton', player: game.me, parent: { name: 'phaseUse', parent: event.parent } });
    const missing = text(dialog, { name: 'chooseButton', player: game.me, parent: { name: 'unknown-description' } });
    return { first, changed, ordinary, online, boundary, missing };
   });
   assert.deepEqual(results.resolution, { first: '当前还可声明3种牌。', changed: '当前还可声明1种牌。', ordinary: '', online: '', boundary: '', missing: '' });
  }
  assert.deepEqual(results.errors, []);
  console.log(baseline ? 'PRINTED_SKILL_DESCRIPTION_BASELINE' : 'PRINTED_SKILL_DESCRIPTION_OK', JSON.stringify({ cases: results.cases.length, resolution: results.resolution, errors: results.errors }));
 } finally {
  fs.writeFileSync(path.join(__dirname, baseline ? 'printed-skill-description-before.json' : cached ? 'printed-skill-description-cached-results.json' : 'printed-skill-description-results.json'), JSON.stringify(results, null, 2));
  await browser.close(); server.close();
 }
})().catch(e => { console.error(e); process.exitCode = 1; });
