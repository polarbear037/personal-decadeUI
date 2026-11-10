const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 使用已有游戏启动器加载真实本体、扩展和选牌事件，不替换选牌检查。
module.exports = async function verifyHandcardSwitch(page) {
  await page.evaluate(async () => {
    const { game, ui, lib, _status } = await import('/noname.js');
    const { Content } = await import('/noname/library/element/content.js');
    game.uncheck();
    for (const dialog of [...ui.dialogs]) dialog.close();
    lib.config.auto_confirm = false;
    _status.currentPhase = game.me;
    const cards = [
      game.createCard('sha', 'spade', 8),
      game.createCard('guohe', 'club', 12),
      game.createCard('shan', 'heart', 2),
      game.createCard('sha', 'diamond', 7),
    ];
    game.me.directgain(cards);
    const begin = async (props = {}, skill) => {
      game.uncheck();
      for (const dialog of [...ui.dialogs]) dialog.close();
      const event = game.me.chooseToUse({ type: 'phase', ...props });
      event._skillChoice = [];
      _status.eventManager.setStatusEvent(event, true);
      await Content.chooseToUse[0](event, null, game.me);
      if (skill) {
        event.backup(skill);
        event.skill = skill;
        game.check();
      }
    };
    const click = card => { _status.clicked = false; ui.click.card.call(card); };
    const read = () => ({
      cards: ui.selected.cards.map(card => cards.indexOf(card)),
      targets: ui.selected.targets.length,
      raised: cards.map(card => card.classList.contains('selected')),
      tip: [...ui.arena.querySelectorAll('.decade-optimized-hand-tip')].find(tip => !tip.closed)?.textContent || '',
    });
    window.handcardSwitchCase = { cards, begin, click, read };
    await begin();
    click(cards[0]);
  });

  const before = await page.evaluate(() => {
    const { cards, read } = handcardSwitchCase;
    return { ...read(), otherSelectable: cards[1].classList.contains('selectable') };
  });
  assert.deepEqual(before.cards, [0]);
  assert.equal(before.otherSelectable, false, '须覆盖选满后失去 selectable 的手牌');

  // 真实鼠标点击，确认卡牌事件监听链也能直接换牌。
  await page.evaluate(() => { window.probeNoname._status.clicked = false; });
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
  await page.evaluate(() => handcardSwitchCase.cards[1].setAttribute('data-switch-test', 'new'));
  await page.locator('[data-switch-test="new"]').click();
  const switched = await page.evaluate(() => handcardSwitchCase.read());
  assert.deepEqual(switched.cards, [1], '直接点击另一张手牌未切换选择');
  assert.deepEqual(switched.raised, [false, true, false, false]);
  assert.match(switched.tip, /弃置/, '换牌后操作提示未刷新');

  const results = await page.evaluate(async () => {
    const { game, ui, lib, _status } = await import('/noname.js');
    const { cards, begin, click, read } = handcardSwitchCase;
    const results = {};
    // 不可用的闪不能替换合法锦囊，也不能清空已有选择。
    click(cards[2]);
    results.invalid = read();
    click(cards[1]);
    results.cancel = read();

    await begin();
    click(cards[0]);
    const target = game.players.find(player => player !== game.me && player.classList.contains('selectable'));
    if (!target) throw new Error('No selectable target after selecting sha');
    _status.clicked = false;
    ui.click.target.call(target);
    results.beforeTargetSwitch = read();
    click(cards[1]);
    results.targetSwitch = read();

    lib.skill.codexSwitchConvert = { enable: 'chooseToUse', filterCard: true, position: 'h', selectCard: 1, viewAs: { name: 'sha', suit: 'spade', number: 9 } };
    lib.translate.codexSwitchConvert = '测试转化';
    await begin({}, 'codexSwitchConvert');
    click(cards[2]);
    results.convertBefore = { ...read(), tempName: !!cards[2]._tempName, tempSuit: !!cards[2]._tempSuitNum };
    click(cards[1]);
    results.convertAfter = { ...read(), oldTempName: !!cards[2]._tempName, oldTempSuit: !!cards[2]._tempSuitNum, newTempName: !!cards[1]._tempName };

    // 多选未满继续添加，选满不能擅自替换已有牌。
    lib.skill.codexSwitchMulti = { enable: 'chooseToUse', filterCard: true, position: 'h', selectCard: 2, viewAs: { name: 'sha' } };
    await begin({}, 'codexSwitchMulti');
    click(cards[0]);
    click(cards[1]);
    results.multi = read();
    click(cards[2]);
    results.multiFull = read();

    // 禁止使用、响应过滤及自定义点击仍由原规则决定。
    await begin({ filterCard: card => card !== cards[2] });
    click(cards[0]);
    cards[1].classList.add('uncheck');
    click(cards[1]);
    results.uncheck = read();
    cards[1].classList.remove('uncheck');
    const event = _status.event;
    let customCalls = 0;
    event.custom.replace.card = () => customCalls++;
    click(cards[1]);
    results.custom = { ...read(), customCalls };
    delete event.custom.replace.card;

    await begin({ filterCard: card => card.name === 'shan', selectTarget: [0, 0] });
    click(cards[2]);
    click(cards[0]);
    results.responseFilter = read();
    return results;
  });
  assert.deepEqual(results.invalid.cards, [1]);
  assert.deepEqual(results.cancel.cards, []);
  assert.equal(results.beforeTargetSwitch.targets, 1);
  assert.deepEqual(results.targetSwitch.cards, [1]);
  assert.equal(results.targetSwitch.targets, 0, '换牌后遗留了旧目标');
  assert.equal(results.convertBefore.tempName, true);
  assert.equal(results.convertBefore.tempSuit, true);
  assert.deepEqual(results.convertAfter.cards, [1]);
  assert.equal(results.convertAfter.oldTempName, false);
  assert.equal(results.convertAfter.oldTempSuit, false);
  assert.equal(results.convertAfter.newTempName, true);
  assert.deepEqual(results.multi.cards, [0, 1]);
  assert.deepEqual(results.multiFull.cards, [0, 1]);
  assert.deepEqual(results.uncheck.cards, [0]);
  assert.deepEqual(results.custom.cards, [0]);
  assert.equal(results.custom.customCalls, 1);
  assert.deepEqual(results.responseFilter.cards, [2]);
  console.log('HANDCARD_SWITCH_ENGINE_OK', JSON.stringify({ before, switched, ...results }));
};

if (require.main === module) {
  const Module = require('node:module');
  const launcher = path.resolve(__dirname, '../.codex-tmp/official-prompt-game.cjs');
  const source = fs.readFileSync(launcher, 'utf8').replace("require('../verification/official-prompt-phase-engine.cjs')", "require('../verification/handcard-switch-engine.cjs')");
  process.argv.push('--decade', '--phase-use');
  const runner = new Module(launcher, module);
  runner.filename = launcher;
  runner.paths = Module._nodeModulePaths(path.dirname(launcher));
  runner._compile(source, launcher);
}
