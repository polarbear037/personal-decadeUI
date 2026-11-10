const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
seed.characters = ['standard', 'onlyOL']; seed.cards = ['standard', 'extra'];
seed.mode_config = { identity: { player_number: '3' } }; seed.hp_style = 'default';
const fullLei = process.argv.includes('--full-lei');
if (fullLei) {
 seed.extensions.push('雷的ol'); seed.extension_雷的ol_enable = true;
 seed.extension_雷的ol_yinpai = false;
 seed.extension_雷的ol_shouqika = false;
 seed.extension_雷的ol_equipAnim = false;
}
const source = fs.readFileSync(path.resolve(__dirname, '../../雷的ol/extension.js'), 'utf8');
const revealStart = source.indexOf('function revealPrintedHandCards(');
const revealEnd = source.indexOf('lib.__leiOlRevealPrintedHandCards = revealPrintedHandCards;', revealStart) + 'lib.__leiOlRevealPrintedHandCards = revealPrintedHandCards;'.length;
assert(revealStart >= 0 && revealEnd > revealStart);
const helpers = source.slice(revealStart, revealEnd) + source.slice(source.indexOf('            // OL印牌模板'), source.indexOf('            // 赂存飞鸟'));
const hooks = source.slice(source.indexOf('            // 公共印牌选牌流程'), source.indexOf('            //装备上身特效'));
const native = process.argv.includes('--native');
const skill = process.argv.find(arg => arg.startsWith('--skill='))?.slice(8) || 'oljiaozhao';
const cardName = process.argv.find(arg => arg.startsWith('--card='))?.slice(7) || 'guohe';
const leiSkill = process.argv.includes('--lei-skill');
const overrideStart = source.indexOf('                lib.skill.olsblucun = {');
const overrideEnd = source.indexOf('                lib.__leiOlSblucunOverride', overrideStart);
const skillOverride = leiSkill ? source.slice(overrideStart, overrideEnd) : '';

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
 const errors = [];
 page.on('pageerror', error => { errors.push(error.stack || String(error)); console.error('PAGE_ERROR', String(error)); });
 page.on('dialog', dialog => dialog.accept());
 try {
  if (process.argv.includes('--baseline')) {
   await page.route('**/online-action-buttons.js', route => {
    const text = fs.readFileSync(path.resolve(__dirname, '../src/ui/online-action-buttons.js'), 'utf8');
    return route.fulfill({ contentType: 'text/javascript', body: text.replace('event.isMine?.() && ((event === _status.event && _status.imchoosing) || (/^choose/.test(event.name) && !event.result))', '/^choose/.test(event.name) && event.isMine?.() && (!event.result || (event === _status.event && _status.imchoosing))') });
   });
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.waitForFunction(async () => { const { game, ui, lib } = await import('/noname.js'); return game.players.length > 1 && window.decadeUI && lib.skill.oljiaozhao && Array.isArray(ui.dialogs); }, null, { timeout: 45000 });
  await page.waitForTimeout(1000);
  await page.evaluate(async ({ helpers, hooks, native, skill, skillOverride, cardName }) => {
   const { game, ui, lib, get, _status } = await import('/noname.js');
   window.printedLive = { game, ui, lib, get, _status, skill, cardName, stage: 'starting', samples: [] };
   if (skillOverride) {
    new Function('lib', 'game', 'ui', 'get', '_status', skillOverride)(lib, game, ui, get, _status);
    game.finishSkill(skill);
   }
   // 直接安装相邻扩展现有的印牌布局及选择处理器，完整运行本体选择与技能流程。
   if (!native) {
    new Function('lib', 'game', 'ui', 'get', '_status', 'const config={yinpai:true}; const toBool=Boolean; const id="printed_probe";' + helpers + hooks)(lib, game, ui, get, _status);
    for (const name of ['_printed_probe_skill_replace', '_printed_probe_temp_card']) { game.finishSkill(name); game.addGlobalSkill(name); }
   }
   document.querySelector('.decade-welcome-overlay')?.remove();
   for (const dialog of [...(ui.dialogs ?? [])]) dialog.close();
   lib.config.game_speed = 'vfast'; lib.config.auto_confirm = false; lib.config.unauto_choose = true;
   lib.announce.subscribe('gameStart', () => {
    game.players.forEach((player, index) => player.init(['liubei', 'guanyu', 'caocao'][index]));
    game.swapPlayer(game.zhu.previous);
   });
   printedLive.read = label => {
    const event = _status.event;
    const sample = { label, name: event.name, skill: event.skill, result: event.result?.bool, choosing: !!_status.imchoosing, display: getComputedStyle(ui.control).display, okDisabled: ui.confirm?.node.ok.classList.contains('disabled'), targets: ui.selected.targets.length, card: get.card()?.name };
    printedLive.samples.push(sample); return sample;
   };
   lib.skill._verify_printed_settlement = {
    trigger: { global: 'useCard1' }, forced: true, silent: true, charlotte: true,
    filter: event => !printedLive.settled && event.player === game.me && event.skill === `${printedLive.skill}_backup`,
    async content() {
     printedLive.settled = true; printedLive.stage = 'settling';
     await game.delay(0.8); printedLive.read('settling');
    },
   };
   lib.skill._verify_printed_driver = {
    trigger: { global: 'phaseUseBegin' }, forced: true, silent: true, charlotte: true, firstDo: true, priority: Infinity,
    filter: () => !printedLive.started,
    async content() {
     printedLive.started = true;
     if (_status.auto) ui.click.auto('forced');
     for (const player of game.players) {
      await player.discard(player.getCards('h'));
      await player.gain([game.createCard('sha', 'spade', 8), game.createCard('shan', 'heart', 2)], 'gain2');
     }
     game.me.addSkill(printedLive.skill);
     if (printedLive.skill === 'oljiaozhao') game.me.addMark('oldanxin', 2, false);
     printedLive.stage = 'first-choice';
     printedLive.first = await game.me.chooseToUse({ type: 'phase' }).forResult();
     printedLive.stage = 'next-choice';
     await game.me.chooseToUse({ type: 'phase' });
     printedLive.stage = 'done'; game.pause();
    },
   };
   game.addGlobalSkill('_verify_printed_driver'); game.addGlobalSkill('_verify_printed_settlement');
   if (!_status.auto) ui.click.auto('forced'); game.resume2(); game.resume();
  }, { helpers, hooks, native, skill, skillOverride, cardName });
  await page.waitForFunction(() => printedLive.stage === 'first-choice' && printedLive._status.event.name === 'chooseToUse' && printedLive._status.paused, null, { timeout: 30000 });
  await page.evaluate(() => printedLive.ui.click.skill(printedLive.skill));
  await page.locator('#dui-controls .lbtn-confirm .primary').click();
  await page.waitForFunction(native => printedLive._status.event.name === 'chooseButton' && !!(native ? printedLive._status.event.dialog?.buttons : printedLive._status.event._selectableCards)?.length && printedLive._status.paused, native);
  const names = await page.evaluate(native => {
   const { _status } = printedLive;
   const cards = native ? _status.event.dialog.buttons : _status.event._selectableCards;
   const chosen = cards.find(card => card.link[2] === printedLive.cardName && card.classList.contains('selectable'));
   if (!chosen) throw new Error('No selectable printed guohe');
   chosen.dataset.printedProbePick = 'true';
   return printedLive.read(native ? 'native-names' : 'printed-names');
  }, native);
  assert.notEqual(names.display, 'none');
  await page.evaluate(native => {
   const { ui, _status } = printedLive;
   _status.clicked = false;
   (native ? ui.click.button : ui.click.card).call(document.querySelector('[data-printed-probe-pick="true"]'));
  }, native);
  // 赂存印牌的 PC 原流程会在选择牌名后自动提交；原生 chooseButton 则手动确认。
  if (native || skill !== 'olsblucun') {
   const nameSelected = await page.evaluate(() => printedLive.read('name-selected'));
   assert.notEqual(nameSelected.display, 'none'); assert.equal(nameSelected.okDisabled, false);
   await page.locator('#dui-controls .lbtn-confirm .primary').click();
  }
  await page.waitForFunction(() => printedLive._status.event.name === 'chooseToUse' && printedLive._status.event.skill === `${printedLive.skill}_backup` && printedLive._status.paused);
  const targetChoice = await page.evaluate(() => printedLive.read('virtual-target-choice'));
  assert.notEqual(targetChoice.display, 'none', '选择虚拟牌后，目标选择阶段必须显示确认栏');
  await page.evaluate(() => {
   const { game, ui, _status } = printedLive;
   const target = game.players.find(player => player !== game.me && player.classList.contains('selectable'));
   if (!target) throw new Error('No target for virtual guohe');
   _status.clicked = false; ui.click.target.call(target);
  });
  const selected = await page.evaluate(() => printedLive.read('virtual-target-selected'));
  assert.notEqual(selected.display, 'none'); assert.equal(selected.okDisabled, false);
  await page.locator('#dui-controls .lbtn-confirm .primary').click();
  await page.waitForFunction(() => printedLive.stage === 'settling');
  assert.equal(await page.locator('#dui-controls').evaluate(node => getComputedStyle(node).display), 'none');
  await page.waitForFunction(() => ['gainPlayerCard', 'discardPlayerCard'].includes(printedLive._status.event.name) && printedLive._status.paused && printedLive._status.imchoosing, null, { timeout: 15000 });
  const picker = await page.evaluate(() => printedLive.read('target-card-picker'));
  assert.notEqual(picker.display, 'none', '顺拆结算中的本地选牌必须显示确认栏');
  await page.evaluate(() => {
   const { ui, _status } = printedLive;
   const button = _status.event.dialog.buttons.find(button => button.classList.contains('selectable'));
   printedLive.pickedCard = button.link;
   printedLive.cardOwner = _status.event.target;
   _status.clicked = false; ui.click.button.call(button);
  });
  const picked = await page.evaluate(() => printedLive.read('target-card-selected'));
  assert.notEqual(picked.display, 'none'); assert.equal(picked.okDisabled, false);
  await page.locator('#dui-controls .lbtn-confirm .primary').click();
  await page.waitForFunction(() => printedLive.stage === 'next-choice' && printedLive._status.paused && !!printedLive.ui.confirm, null, { timeout: 30000 });
  const after = await page.evaluate(() => printedLive.read('after-virtual-use'));
  assert.notEqual(after.display, 'none');
  const movement = await page.evaluate(() => {
   const { game, get, cardOwner, pickedCard } = printedLive;
   return { targetLost: !cardOwner.getCards('hej').includes(pickedCard), actorHas: game.me.getCards('h').includes(pickedCard), position: get.position(pickedCard, true) };
  });
  assert.equal(movement.targetLost, true);
  if (cardName === 'shunshou') assert.equal(movement.actorHas, true);
  else assert.equal(movement.position, 'd');
  if (skill === 'olsblucun' && !leiSkill) {
   const history = await page.evaluate(() => {
    const { game, get } = printedLive;
    const mark = game.me.marks.olsblucun_used;
    const dialog = get.nodeintro(mark);
    return { type: mark.dataset.onlineMarkType, cards: [...dialog.content.querySelectorAll('.online-mark-vcard')].map(button => button.link.name) };
   });
   assert.deepEqual(history, { type: 'dialog', cards: [cardName] });
  }
  const samples = await page.evaluate(() => printedLive.samples);
  assert.equal(samples.find(sample => sample.label === 'settling').display, 'none'); assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(__dirname, `online-controls-${native ? 'native' : 'printed'}${skill === 'oljiaozhao' ? '' : '-' + skill}${cardName === 'guohe' ? '' : '-' + cardName}${leiSkill ? '-lei' : ''}-live-results.json`), JSON.stringify({ skill, cardName, native, leiSkill, samples, movement, errors }, null, 2));
  console.log(native ? 'ONLINE_CONTROLS_NATIVE_LIVE_OK' : 'ONLINE_CONTROLS_PRINTED_LIVE_OK', JSON.stringify({ samples, movement, errors }));
 } catch (error) {
  console.error('PROBE_ERROR', error);
  console.error('PRINTED_STATE', await page.evaluate(() => {
   const probe = window.printedLive; if (!probe) return null;
   const event = probe._status.event;
   return { stage: probe.stage, samples: probe.samples, name: event?.name, skill: event?.skill, result: event?.result?.bool, choosing: probe._status.imchoosing, paused: probe._status.paused, printed: document.querySelectorAll('.temp-card').length, dialogs: probe.ui.dialogs?.map(dialog => dialog.textContent), controls: probe.ui.control?.outerHTML };
  })); throw error;
 } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
