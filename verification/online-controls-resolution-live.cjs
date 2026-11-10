const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
seed.characters = ['standard']; seed.cards = ['standard', 'extra'];
seed.mode_config = { identity: { player_number: '3' } };
seed.hp_style = 'default';

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
 const errors = [];
 page.on('pageerror', error => errors.push(error.stack || String(error)));
 page.on('dialog', dialog => dialog.accept());
 try {
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.waitForFunction(async () => { const { game, ui } = await import('/noname.js'); return game.players.length > 1 && window.decadeUI && Array.isArray(ui.dialogs); }, null, { timeout: 45000 });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
   const { game, ui, lib, get, _status } = await import('/noname.js');
   window.controlsLive = { game, ui, lib, get, _status, samples: [], stage: 'starting' };
   document.querySelector('.decade-welcome-overlay')?.remove();
   for (const dialog of [...ui.dialogs]) dialog.close();
   lib.config.game_speed = 'vfast'; lib.config.auto_confirm = false;
   lib.announce.subscribe('gameStart', () => {
    game.players.forEach((player, index) => player.init(['liubei', 'guanyu', 'caocao'][index]));
    game.me = game.zhu.previous;
   });
   controlsLive.read = label => {
    const { display } = getComputedStyle(ui.control);
    const sample = { label, display, name: _status.event.name, result: _status.event.result?.bool, text: ui.control.textContent };
    controlsLive.samples.push(sample); return sample;
   };
   lib.skill._verify_controls_settlement = {
    trigger: { global: 'useCard1' }, forced: true, silent: true, charlotte: true,
    filter: event => !controlsLive.settlementStarted && event.card.name === 'wuzhong' && event.player === game.me,
    async content() {
     controlsLive.settlementStarted = true;
     controlsLive.stage = 'settling';
     await game.delay(0.8);
     controlsLive.read('settling');
     controlsLive.stage = 'nested-choice';
     await game.me.chooseBool('结算中的选择');
     controlsLive.stage = 'settling-again';
     await game.delay(0.8);
     controlsLive.read('settling-again');
    },
   };
   lib.skill._verify_controls_driver = {
    trigger: { global: 'phaseUseBegin' }, forced: true, silent: true, charlotte: true, firstDo: true, priority: Infinity,
    filter: () => !controlsLive.started,
    async content() {
     controlsLive.started = true;
     if (_status.auto) ui.click.auto('forced');
     await game.me.discard(game.me.getCards('h'));
     const card = game.createCard('wuzhong', 'heart', 7);
     await game.me.gain(card, 'gain2');
     controlsLive.card = card;
     controlsLive.stage = 'first-choice';
     controlsLive.first = await game.me.chooseToUse({ type: 'phase' }).forResult();
     controlsLive.stage = 'next-choice';
     await game.me.chooseToUse({ type: 'phase' });
     controlsLive.stage = 'done'; game.pause();
    },
   };
   game.addGlobalSkill('_verify_controls_settlement'); game.addGlobalSkill('_verify_controls_driver');
   if (!_status.auto) ui.click.auto('forced');
   game.resume2(); game.resume();
  });
  const waitChoice = stage => page.waitForFunction(stage => controlsLive.stage === stage && controlsLive._status.paused && !!controlsLive.ui.confirm, stage, { timeout: 30000 });
  await waitChoice('first-choice');
  const before = await page.evaluate(() => controlsLive.read('first-choice'));
  assert.notEqual(before.display, 'none');
  await page.evaluate(() => { const { ui, _status } = controlsLive; _status.clicked = false; ui.click.card.call(controlsLive.card); });
  await page.locator('#dui-controls .lbtn-confirm .primary').click();
  await page.waitForFunction(() => controlsLive.stage === 'settling');
  assert.equal(await page.locator('#dui-controls').evaluate(node => getComputedStyle(node).display), 'none');
  await waitChoice('nested-choice');
  const nested = await page.evaluate(() => controlsLive.read('nested-choice'));
  assert.notEqual(nested.display, 'none');
  await page.locator('#dui-controls .lbtn-confirm .primary').click();
  await page.waitForFunction(() => controlsLive.stage === 'settling-again');
  assert.equal(await page.locator('#dui-controls').evaluate(node => getComputedStyle(node).display), 'none');
  await waitChoice('next-choice');
  const after = await page.evaluate(() => controlsLive.read('next-choice'));
  assert.notEqual(after.display, 'none');
  // 选择事件取消后重新选择不应锁住按钮；并回归其他风格、结束和选将状态。
  const scopes = await page.evaluate(() => {
   const { ui, lib, game, _status } = controlsLive;
   const choice = _status.event;
   const resolving = game.createEvent('useCard', false); resolving.player = game.me;
   // 与真实提交后的完整 uncheck 一致，结算事件没有正在进行的本人输入。
   _status.imchoosing = false;
   const activate = event => { _status.eventManager.setStatusEvent(event, true); lib.announce.publish('Noname.Game.Event.Changed', event); };
   const display = () => getComputedStyle(ui.control).display;
   activate(resolving); const hidden = display();
   lib.config.extension_十周年UI_newDecadeStyle = 'on'; activate(resolving); const otherStyle = display();
   lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI'; activate(resolving);
   _status.over = true; activate(resolving); const over = display(); _status.over = false;
   ui.arena.classList.add('choose-character'); activate(resolving); const character = display(); ui.arena.classList.remove('choose-character');
   activate(choice); game.check(); const restored = display();
   return { hidden, otherStyle, over, character, restored };
  });
  assert.equal(scopes.hidden, 'none');
  for (const key of ['otherStyle', 'over', 'character', 'restored']) assert.notEqual(scopes[key], 'none', key);
  const samples = await page.evaluate(() => controlsLive.samples);
  for (const label of ['settling', 'settling-again']) assert.equal(samples.find(sample => sample.label === label)?.display, 'none', label);
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(__dirname, 'online-controls-resolution-live-results.json'), JSON.stringify({ before, nested, after, samples, scopes, errors }, null, 2));
  console.log('ONLINE_CONTROLS_RESOLUTION_LIVE_OK', JSON.stringify({ samples, scopes, errors }));
 } catch (error) {
  console.error('CONTROL_STATE', await page.evaluate(() => {
   const probe = window.controlsLive; if (!probe) return null;
   return { stage: probe.stage, samples: probe.samples, event: probe._status.event.name, result: probe._status.event.result, controls: probe.ui.control.outerHTML };
  }));
  throw error;
 } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
