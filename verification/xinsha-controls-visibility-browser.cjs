const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const baseline = process.argv.includes('--baseline');
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
 const results = { baseline, samples: [], errors: [] };
 try {
  Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'], hp_style: 'round', extension_十周年UI_newDecadeStyle: 'othersOff' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', error => results.errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  if (baseline) await page.route('**/src/ui/xinsha-action-buttons.js', route => route.fulfill({
   contentType: 'text/javascript', body: fs.readFileSync(path.resolve(__dirname, '../src/ui/xinsha-action-buttons.js'), 'utf8')
    .replace('export function syncXinshaControlVisibility() {', 'export function syncXinshaControlVisibility() { return;'),
  }));
  await dependencies(page);
  for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js', 'stackframe@1.3.4/node_modules/stackframe/stackframe.js', 'error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js', 'stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])
   if (/as __require/.test(fs.readFileSync(path.resolve(__dirname, '../../../node_modules/.pnpm', file), 'utf8'))) await page.unroute('**/node_modules/.pnpm/' + file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.locator('#arena>.player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
  results.samples = await page.evaluate(async baseline => {
   const { game, lib, ui, _status } = await import('/noname.js');
   const { syncXinshaActionButtons } = await import('/extension/十周年UI/src/ui/xinsha-action-buttons.js');
   game.pause(); game.resume = () => {}; _status.auto = false; _status.over = false; _status.gameStarted = true;
   ui.arena.classList.remove('choose-character');
   game.me = game.players[0]; game.me.init('liubei'); game.players[1].init('caocao');
   const phase = new lib.element.GameEvent('phaseUse', false); phase.player = game.me;
   const samples = [];
   const event = (name, player = game.me, parent = phase) => {
    const value = new lib.element.GameEvent(name, false); value.player = player; value.parent = parent; return value;
   };
   const activate = (value, choosing, label) => {
    _status.imchoosing = choosing; _status.eventManager.setStatusEvent(value, true);
    lib.announce.publish('Noname.Game.Event.Changed', value); syncXinshaActionButtons();
    const row = { label, event: value.name, choosing, display: getComputedStyle(ui.control).display, hiddenClass: ui.control.classList.contains('xinsha-controls-resolving'), sameConfirm: ui.confirm === fixedConfirm, connected: ui.confirm?.isConnected };
    samples.push(row); return row;
   };
   const local = event('chooseToUse'); local.type = 'phase'; _status.eventManager.setStatusEvent(local, true); _status.imchoosing = true;
   ui.create.confirm('oc'); const fixedConfirm = ui.confirm;
   activate(local, true, 'local-choice');
   const remote = event('useCard', game.players[1]);
   _status.paused2 = true; ui.arena.classList.add('menupaused');
   activate(remote, false, 'remote-menu-paused');
   if (baseline) return samples;
   _status.paused2 = false; ui.arena.classList.remove('menupaused');
   for (const name of ['useCard', 'respond', 'useSkill']) activate(event(name), false, name + '-settlement');
   const ended = event('chooseToUse'); ended.type = 'phase'; ended.result = { bool: false, confirm: 'cancel' };
   activate(ended, false, 'turn-ended');
   const backup = event('chooseToUse'); backup.result = { bool: true }; backup.type = 'phase'; backup.skill = 'test_backup';
   activate(backup, true, 'backup-old-result');
   activate(backup, false, 'backup-submitted');
   for (const name of ['gainPlayerCard', 'discardPlayerCard']) {
    activate(event(name, game.me, remote), true, name + '-local');
    activate(event(name, game.players[1], remote), false, name + '-remote');
   }
   for (const name of ['chooseControl', 'chooseBool', 'chooseButton']) activate(event(name, game.me, remote), false, name + '-nested');
   activate(local, true, 'cancel-selection');
   activate(local, true, 'partial-uncheck'); game.uncheck('card'); syncXinshaActionButtons();
   samples.push({ label: 'after-partial-uncheck', display: getComputedStyle(ui.control).display, choosing: _status.imchoosing });
   const draw = event('gameDraw'); ui.cardDialog = { _isLuckyCardTip: true }; activate(draw, true, 'redraw'); delete ui.cardDialog;
   activate(remote, false, 'before-over'); _status.over = true; syncXinshaActionButtons();
   samples.push({ label: 'game-over', display: getComputedStyle(ui.control).display }); _status.over = false;
   ui.arena.classList.add('choose-character'); activate(remote, false, 'character-selection'); ui.arena.classList.remove('choose-character');
   lib.config.extension_十周年UI_newDecadeStyle = 'on'; activate(remote, false, 'other-style');
   lib.config.extension_十周年UI_newDecadeStyle = 'othersOff'; activate(local, true, 'restored-local');
   return samples;
  }, baseline);
  const hidden = new Set(['remote-menu-paused', 'useCard-settlement', 'respond-settlement', 'useSkill-settlement', 'turn-ended', 'backup-submitted', 'gainPlayerCard-remote', 'discardPlayerCard-remote', 'before-over']);
  for (const row of results.samples) {
   if (baseline && row.label === 'remote-menu-paused') { assert.notEqual(row.display, 'none'); continue; }
   assert.equal(row.display === 'none', hidden.has(row.label), row.label);
   if ('sameConfirm' in row) { assert(row.sameConfirm, row.label); assert(row.connected, row.label); }
  }
  assert.deepEqual(results.errors, []);
  console.log(baseline ? 'XINSHA_CONTROLS_STALE_REPRODUCED' : 'XINSHA_CONTROLS_VISIBILITY_OK', JSON.stringify(results));
 } finally {
  fs.writeFileSync(path.join(__dirname, baseline ? 'xinsha-controls-visibility-before.json' : 'xinsha-controls-visibility-results.json'), JSON.stringify(results, null, 2));
  await browser.close(); server.close();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
