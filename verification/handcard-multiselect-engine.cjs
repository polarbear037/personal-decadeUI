const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function verifyMultiselect(page) {
  await page.evaluate(async () => {
    const { game, ui, lib, _status } = await import('/noname.js');
    game.uncheck();
    for (const dialog of [...ui.dialogs]) dialog.close();
    lib.config.auto_confirm = false;
    lib.config.spread_card = false;
    const cards = Array.from({ length: 4 }, (_, index) => game.createCard('sha', 'spade', index + 1));
    game.me.directgain(cards);
    // 扩展包装函数可能在更新位置前同步测量卡牌，不能把临时落下状态交给浏览器。
    for (const card of cards) {
      const updateTransform = card.updateTransform;
      card.updateTransform = function (...args) {
        this.getBoundingClientRect();
        return updateTransform.apply(this, args);
      };
    }
    const event = game.me.chooseToUse({
      filterCard: () => true, selectCard: [1, 4], position: 'h',
      selectTarget: [0, 0], filterTarget: () => false,
    });
    event._skillChoice = [];
    _status.eventManager.setStatusEvent(event, true);
    game.check();
    decadeUI.layout.updateHand();
    window.multiselectCase = { cards, click(index) {
      _status.clicked = false;
      ui.click.card.call(cards[index]);
    } };
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => multiselectCase.click(0));
  await page.waitForTimeout(600);

  const results = [];
  for (const index of [1, 2, 1]) {
    const result = await page.evaluate(async index => {
      const { cards, click } = multiselectCase;
      const fixed = cards.filter((card, i) => i !== index && card.classList.contains('selected'));
      const clickedTop = cards[index].getBoundingClientRect().top;
      const wasSelected = cards[index].classList.contains('selected');
      const tops = fixed.map(card => card.getBoundingClientRect().top);
      const deviations = fixed.map(() => 0);
      const transitions = [];
      const onTransition = event => {
        if (event.propertyName === 'transform' && fixed.includes(event.target)) transitions.push(cards.indexOf(event.target));
      };
      document.addEventListener('transitionrun', onTransition);
      click(index);
      const start = performance.now();
      await new Promise(resolve => {
        const sample = () => {
          fixed.forEach((card, i) => {
            deviations[i] = Math.max(deviations[i], Math.abs(card.getBoundingClientRect().top - tops[i]));
          });
          if (performance.now() - start < 650) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      document.removeEventListener('transitionrun', onTransition);
      return { index, deviations, transitions, clickedDelta: cards[index].getBoundingClientRect().top - clickedTop,
        wasSelected, selected: cards.map(card => card.classList.contains('selected')) };
    }, index);
    results.push(result);
  }
  console.log('MULTISELECT_MOTION', JSON.stringify(results));
  for (const result of results) {
    assert(result.deviations.every(value => value < 0.1), '此前选中的卡牌在继续多选/取消时发生位移');
    assert.deepEqual(result.transitions, [], '此前选中的卡牌重复启动 transform 过渡');
    assert(result.wasSelected ? result.clickedDelta > 1 : result.clickedDelta < -1, '新选牌应抬起，取消选择的牌应落下');
  }
  assert.deepEqual(results[0].selected, [true, true, false, false]);
  assert.deepEqual(results[1].selected, [true, true, true, false]);
  assert.deepEqual(results[2].selected, [true, false, true, false]);
  console.log('HANDCARD_MULTISELECT_ENGINE_OK');
};

if (require.main === module) {
  const Module = require('node:module');
  const launcher = path.resolve(__dirname, '../.codex-tmp/official-prompt-game.cjs');
  const source = fs.readFileSync(launcher, 'utf8').replace("require('../verification/official-prompt-phase-engine.cjs')", "require('../verification/handcard-multiselect-engine.cjs')");
  process.argv.push('--decade', '--phase-use');
  const runner = new Module(launcher, module);
  runner.filename = launcher;
  runner.paths = Module._nodeModulePaths(path.dirname(launcher));
  runner._compile(source, launcher);
}
