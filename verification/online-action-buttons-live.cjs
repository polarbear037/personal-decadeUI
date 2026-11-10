const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
seed.characters = ['standard']; seed.cards = ['standard', 'extra'];
seed.mode_config = { identity: { player_number: '3' } };
seed.extension_十周年UI_enableRecastInteraction = true;
// 仅检查按钮与结算，使用本体血条，避开 glass 血条对外部 skinSwitch 的依赖。
seed.hp_style = 'default';

(async () => {
 await new Promise(resolve => server.listen(39322, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
 const errors = [];
 page.on('pageerror', error => { errors.push(error.stack || String(error)); console.error(error.stack); });
 page.on('dialog', async dialog => { console.error('DIALOG', dialog.message().slice(0, 300)); await dialog.accept(); });
 try {
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.waitForFunction(async () => { const { game, ui } = await import('/noname.js'); return game.players.length > 1 && window.decadeUI && Array.isArray(ui.dialogs); });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
   const { game, ui, lib, get, _status } = await import('/noname.js');
   window.actionLive = { game, ui, lib, get, _status, step: 'starting', prompts: [] };
   document.querySelector('.decade-welcome-overlay')?.remove();
   for (const dialog of [...ui.dialogs]) dialog.close();
   lib.config.game_speed = 'vfast'; lib.config.auto_confirm = false; lib.config.duration = 100;
   lib.announce.subscribe('gameStart', () => {
    game.players.forEach((player, index) => player.init(['liubei', 'guanyu', 'caocao'][index % 3]));
    game.me = game.zhu.previous;
   });
   lib.skill._verify_online_action_buttons = {
    trigger: { global: 'phaseUseBegin' }, forced: true, silent: true, charlotte: true, firstDo: true, priority: Infinity,
    filter: () => !actionLive.started,
    async content(event, trigger) {
     actionLive.started = true;
     if (_status.auto) ui.click.auto('forced');
     // 固定输入牌；实际选牌、技能、移牌、摸牌和无懈轮询均由本体事件循环执行。
     await game.me.discard(game.me.getCards('h'));
     const tiesuo = game.createCard('tiesuo', 'club', 12), wuxie = game.createCard('wuxie', 'spade', 11);
     await game.me.gain([tiesuo, wuxie], 'gain2');
     actionLive.tiesuo = tiesuo;
     const before = game.me.countCards('h');
     actionLive.step = 'recast';
     const result = await game.me.chooseToUse({ type: 'phase' }).forResult();
     actionLive.recastResult = { skill: result.skill, cards: result.cards?.map(card => card.name), bool: result.bool };
     actionLive.recast = { before, after: game.me.countCards('h'), discarded: !game.me.getCards('h').includes(tiesuo), history: game.me.getHistory('lose').some(evt => evt.cards?.includes(tiesuo)) };
     const source = trigger.player;
     const nanman = game.createCard('nanman', 'spade', 13);
     await source.gain(nanman, 'gain2');
     actionLive.step = 'nanman';
     await source.useCard(nanman, game.players.filter(player => player !== source));
     actionLive.step = 'done';
     game.pause();
    },
   };
   game.addGlobalSkill('_verify_online_action_buttons');
   lib.announce.subscribe('Noname.Game.Event.Changed', () => {
    const event = _status.event;
    if (event?.type === 'wuxie' && event.player === game.me && actionLive.prompts.length < 100) {
     actionLive.prompts.push({ target: event.info_map?.target?.playerid, self: event.info_map?.target === game.me, state: event.state });
    }
   });
   if (!_status.auto) ui.click.auto('forced');
   game.resume2(); game.resume();
  });
  await page.waitForFunction(() => actionLive.step === 'recast' && actionLive._status.event.type === 'phase' && !!actionLive.ui.confirm, null, { timeout: 20000 });
  await page.evaluate(() => { const { ui, _status } = actionLive; _status.clicked = false; ui.click.card.call(actionLive.tiesuo); });
  await page.locator('.online-recast-button').click();
  await page.waitForFunction(() => {
   const { ui, game, _status } = actionLive, event = _status.event;
   return actionLive.step === 'nanman' && event.type === 'wuxie' && event.player === game.me && event.info_map?.target !== game.me && ui.tempnowuxie && ui.confirm && _status.paused;
  }, null, { timeout: 20000 });
  const first = await page.evaluate(() => ({ target: actionLive._status.event.info_map.target.playerid, origin: actionLive.ui.tempnowuxie._origin }));
  await page.locator('.online-tempnowuxie').click();
  assert.equal(await page.locator('.online-tempnowuxie').isVisible(), false, '点击本次不无懈后应立即隐藏');
  await page.waitForFunction(() => {
   const { ui, game, _status } = actionLive, event = _status.event;
   return event.type === 'wuxie' && event.player === game.me && event.info_map?.target === game.me && ui.confirm && _status.paused;
  }, null, { timeout: 20000 });
  const self = await page.evaluate(() => {
   const { ui, lib, _status } = actionLive;
   return { glow: ui.tempnowuxie?.classList.contains('glow'), skip: lib.filter.wuxieSwap(_status.event), prompt: _status.event.dialog?.textContent, canUse: ui.selected.cards.length > 0 || actionLive.game.me.getCards('h').some(card => card.name === 'wuxie' && card.classList.contains('selectable')) };
  });
  await page.screenshot({ path: path.join(__dirname, 'online-action-self-live.png') });
  await page.evaluate(() => {
   const { ui, game, _status } = actionLive;
   ui.click.cancel(ui.confirm.node.cancel);
   if (!_status.auto) ui.click.auto('forced');
   game.resume();
  });
  await page.waitForFunction(() => actionLive.step === 'done', null, { timeout: 20000 });
  const result = await page.evaluate(() => ({ recastResult: actionLive.recastResult, recast: actionLive.recast, prompts: actionLive.prompts, final: actionLive.step }));
  fs.writeFileSync(path.join(__dirname, 'online-action-buttons-live-results.json'), JSON.stringify({ first, self, result, errors }, null, 2));
  assert.equal(result.recastResult.skill, '_recasting'); assert.deepEqual(result.recastResult.cards, ['tiesuo']);
  assert(result.recast.discarded && result.recast.history); assert.equal(result.recast.after, result.recast.before);
  assert.equal(self.glow, true); assert.equal(self.skip, false); assert.equal(self.canUse, true);
  assert.deepEqual(errors, []);
  console.log('ONLINE_ACTION_BUTTONS_LIVE_OK', JSON.stringify({ first, self, result, errors }));
 } catch (error) {
  console.error('LIVE_STATE', await page.evaluate(() => {
   const { game, ui, _status } = actionLive; const chain = []; let event = _status.event;
   for (let i = 0; event && i < 10; i++, event = event.parent) chain.push({ name: event.name, type: event.type, player: event.player?.name, target: event.info_map?.target?.name, step: event.step, skill: event.skill });
   return { step: actionLive.step, recast: actionLive.recast, result: actionLive.recastResult, chain, auto: _status.auto, paused: [_status.paused, _status.paused2], hand: game.me.getCards('h').map(card => card.name), players: game.players.map(player => player.name), controls: ui.control.textContent };
  }));
  throw error;
 } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
