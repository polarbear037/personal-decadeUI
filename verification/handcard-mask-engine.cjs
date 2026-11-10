const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function verifyHandcardMask(page) {
  await require('./handcard-switch-engine.cjs')(page);
  const results = {};
  const read = async () => {
    await page.waitForTimeout(150);
    return page.evaluate(() => handcardSwitchCase.cards.map(card => ({
      selected: card.classList.contains('selected'),
      selectable: card.classList.contains('selectable'),
      mask: Number(getComputedStyle(card.querySelector('.card-mask')).opacity),
    })));
  };
  await page.evaluate(async () => { await handcardSwitchCase.begin(); });
  results.idle = await read();
  await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[0]));
  results.selected = await read();
  assert.deepEqual(results.idle.map(card => card.mask), [0, 0, 1, 0]);
  assert.deepEqual(results.selected.map(card => card.mask), [0, 0, 1, 0], '选满一张后只能遮罩原本不可用的闪');
  assert.equal(results.selected[1].selectable, false, '遮罩修正不得更改本体选牌上限');
  await page.screenshot({ path: path.join(__dirname, 'handcard-mask-browser.png') });
  results.withTarget = await page.evaluate(async () => {
    const { game, ui, _status } = await import('/noname.js');
    const target = game.players.find(player => player !== game.me && player.classList.contains('selectable'));
    _status.clicked = false;
    ui.click.target.call(target);
    game.check();
    return { cards: ui.selected.cards.map(card => handcardSwitchCase.cards.indexOf(card)), targetRetained: ui.selected.targets[0] === target };
  });
  assert.deepEqual(results.withTarget, { cards: [0], targetRetained: true });
  await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[1]));
  results.switched = await read();
  assert.deepEqual(results.switched.map(card => card.mask), [0, 0, 1, 0]);
  await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[1]));
  results.cancelled = await read();
  assert.deepEqual(results.cancelled.map(card => card.mask), [0, 0, 1, 0]);
  await page.evaluate(async () => {
    const { cards, begin, click } = handcardSwitchCase;
    await begin({}, 'codexSwitchMulti');
    click(cards[0]); click(cards[1]);
  });
  results.multiFull = await read();
  assert.deepEqual(results.multiFull.map(card => card.mask), [0, 0, 0, 0]);
  await page.evaluate(() => handcardSwitchCase.click(handcardSwitchCase.cards[2]));
  assert.deepEqual(await page.evaluate(() => handcardSwitchCase.read().cards), [0, 1]);
  await page.evaluate(async () => {
    const { lib, ui } = await import('/noname.js');
    lib.skill.codexMaskColor = { enable: 'chooseToUse', position: 'h', selectCard: 2,
      filterCard: card => !ui.selected.cards.length || ui.selected.cards[0].suit === card.suit,
      viewAs: { name: 'sha' } };
    await handcardSwitchCase.begin({}, 'codexMaskColor');
    handcardSwitchCase.click(handcardSwitchCase.cards[0]);
  });
  results.dependentFilter = await read();
  assert.deepEqual(results.dependentFilter.map(card => card.mask), [0, 1, 1, 1]);
  await page.evaluate(async () => {
    await handcardSwitchCase.begin({ filterCard: card => card.name === 'shan', selectTarget: [0, 0] });
    handcardSwitchCase.click(handcardSwitchCase.cards[2]);
  });
  results.response = await read();
  assert.deepEqual(results.response.map(card => card.mask), [1, 1, 0, 1]);
  await page.evaluate(async () => {
    const { lib, game } = await import('/noname.js');
    lib.config.extension_十周年UI_newDecadeStyle = 'on';
    document.body.dataset.style = 'on';
    await handcardSwitchCase.begin();
    handcardSwitchCase.click(handcardSwitchCase.cards[0]);
    game.check();
  });
  results.otherStyle = await read();
  assert.deepEqual(results.otherStyle.map(card => card.mask), [0, 1, 1, 1]);
  await page.evaluate(async () => {
    const { lib, game } = await import('/noname.js');
    lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI';
    document.body.dataset.style = 'onlineUI';
    game.uncheck();
  });
  results.finished = await read();
  assert.deepEqual(results.finished.map(card => card.mask), [0, 0, 0, 0]);
  assert.equal(await page.evaluate(() => handcardSwitchCase.cards.some(card => card.classList.contains('dui-handcard-available'))), false);
  fs.writeFileSync(path.join(__dirname, 'handcard-mask-engine-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log('HANDCARD_MASK_ENGINE_OK', JSON.stringify(results));
};

if (require.main === module) {
  const Module = require('node:module');
  const launcher = path.resolve(__dirname, '../.codex-tmp/official-prompt-game.cjs');
  const source = fs.readFileSync(launcher, 'utf8').replace("require('../verification/official-prompt-phase-engine.cjs')", "require('../verification/handcard-mask-engine.cjs')");
  process.argv.push('--decade', '--phase-use');
  const runner = new Module(launcher, module);
  runner.filename = launcher;
  runner.paths = Module._nodeModulePaths(path.dirname(launcher));
  runner._compile(source, launcher);
}
