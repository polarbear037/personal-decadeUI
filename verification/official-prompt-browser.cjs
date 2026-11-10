const fs = require('node:fs');
const path = require('node:path');
const { installNativeHarness, server, chromium, assert } = require('./optimized-prompt-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await installNativeHarness(page, origin, false);
    for (const file of ['dialogOK.css', 'meihua.css']) await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/${file}` });
    await page.evaluate(() => {
      lib.config.extension_十周年UI_cardPrompt = false;
      const old = get.select;
      get.select = value => typeof value === 'number' ? [value, value] : Array.isArray(value) ? value : typeof value === 'function' ? value() : old(value);
      Object.assign(lib.translate, { rende: '仁德', wusheng: '武圣', wuxie: '无懈可击', juedou: '决斗', liubei: '刘备', guanyu: '关羽', shan: '闪' });
      get.skillTranslation = skill => lib.translate[skill] || skill;
      game.me.name = 'liubei';
      game.players = [game.me, { name: 'guanyu' }];
      window.readTip = () => {
        const tip = [...ui.arena.querySelectorAll('.decade-optimized-hand-tip')].find(node => !node.closed && !node.classList.contains('hidden'));
        const style = tip && getComputedStyle(tip);
        return tip ? { text: tip.textContent, main: tip.querySelector('.decade-official-main')?.textContent, progress: tip.querySelector('.decade-official-progress')?.textContent || '', officialId: tip.dataset.officialSkillId, officialField: tip.dataset.officialPromptField, font: style.fontFamily, size: style.fontSize, color: style.color, lineHeight: style.lineHeight, display: style.display, tokens: [...tip.querySelectorAll('[data-type]')].map(node => ({ text: node.textContent, type: node.dataset.type, color: getComputedStyle(node).color, font: getComputedStyle(node).fontFamily, size: getComputedStyle(node).fontSize, stroke: getComputedStyle(node).webkitTextStroke })) } : null;
      };
      window.beginChoice = props => {
        for (const dialog of [...ui.dialogs]) dialog.close();
        clearOptimizedPrompts();
        ui.selected = { cards: [], targets: [], buttons: [] };
        const event = { player: game.me, isMine: () => true, getParent: () => ({}), ...props };
        _status.event = event;
        for (const handler of lib.hooks.checkBegin.handlers) handler(event);
        for (const handler of lib.hooks.checkEnd.handlers) handler(event);
        return readTip();
      };
      document.head.insertAdjacentHTML('beforeend', '<style>html,body{width:100%;height:100%;margin:0}#arena{position:relative;width:100%;height:100%;background:radial-gradient(ellipse at center,#544633,#1e1a16)}.dialog{z-index:1}</style>');
    });

    const phase = await page.evaluate(() => beginChoice({ name: 'chooseToUse', type: 'phase' }));
    assert.equal(phase.main, '出牌阶段，请选择一张卡牌');
    assert.equal(phase.size, '20px');
    assert.equal(phase.color, 'rgb(249, 236, 206)');
    assert.match(phase.font, /dui-official-prompt/);
    assert(phase.tokens.every(token => token.size === '20px' && Math.abs(parseFloat(token.stroke) - 8 / 3) < 0.001 && token.stroke.includes('rgb(83, 61, 33)')));

    const card = await page.evaluate(() => {
      lib.card.sha.selectTarget = [1, 1];
      ui.selected.cards = [{ name: 'sha' }];
      refreshOptimizedPrompt();
      return readTip();
    });
    assert.equal(card.main, '请选择1名角色，作为杀的目标');
    assert.equal(card.officialId, '1');
    assert.equal(card.progress, '', '官方提示不额外追加选人计数行');
    assert(card.tokens.some(token => token.type === 'card' && token.color === 'rgb(255, 216, 0)'));

    const skillStages = await page.evaluate(() => {
      lib.skill.wusheng = { selectCard: [1, 1], selectTarget: [1, 1], viewAs: { name: 'sha' } };
      beginChoice({ name: 'chooseToUse', type: 'phase', skill: 'wusheng', selectCard: [1, 1], selectTarget: [1, 1] });
      const before = readTip();
      ui.selected.cards.push({ name: 'tao' });
      refreshOptimizedPrompt();
      const target = readTip();
      ui.selected.targets.push(game.players[1]);
      refreshOptimizedPrompt();
      return { before, target, after: readTip() };
    });
    assert.equal(skillStages.before.main, '选择一张红色的手牌或者装备');
    assert.equal(skillStages.target.main, '请选择要杀的目标');
    assert.equal(skillStages.target.officialId, '33');
    assert.equal(skillStages.after.progress, '', '选中目标后不得出现额外计数行');
    assert(skillStages.after.tokens.some(token => token.type === 'card' && token.color === 'rgb(255, 216, 0)'));

    const range = await page.evaluate(() => beginChoice({ name: 'chooseCardTarget', selectCard: [1, 3], selectTarget: [1, 2] }));
    assert.match(range.main, /1至3张牌和1至2名角色/);
    const discard = await page.evaluate(() => beginChoice({ name: 'chooseToDiscard', selectCard: [2, 2], position: 'h', forced: true }));
    assert.match(discard.main, /您需要弃置 2张卡牌，请选牌/);
    assert(discard.tokens.some(token => token.type === 'discard' && token.color === 'rgb(255, 80, 80)'));
    assert(discard.tokens.some(token => token.type === 'number' && token.color === 'rgb(255, 224, 115)'));
    const cards = await page.evaluate(() => beginChoice({ name: 'chooseCard', selectCard: [2, 2], position: 'h' }));
    assert.match(cards.main, /2张手牌/);
    const response = await page.evaluate(() => beginChoice({ name: 'chooseToRespond', prompt: '请打出1张【闪】响应【杀】', selectCard: [1, 1], respondTo: [game.players[1], { name: 'sha' }] }));
    assert.match(response.main, /【闪】响应【杀】/);
    const dying = await page.evaluate(() => beginChoice({ name: 'chooseToUse', type: 'dying', dying: { name: 'guanyu', hp: -1 } }));
    assert.equal(dying.main, '关羽濒死，需要2个桃，是否对他出桃？');
    assert(dying.tokens.some(token => token.type === 'player' && token.color === 'rgb(255, 206, 120)'));

    const wuxie = await page.evaluate(() => beginChoice({ name: 'chooseToUse', type: 'wuxie', info_map: { state: -1, isJudge: true, target: game.me, card: { name: 'lebu' } } }));
    assert.equal(wuxie.main, '抵消无懈可击，令乐不思蜀对你生效');
    const control = await page.evaluate(() => beginChoice({ name: 'chooseControl' }));
    assert.equal(control.main, '请选择您要进行的操作');
    const button = await page.evaluate(() => beginChoice({ name: 'chooseButton', selectButton: [1, 2] }));
    assert.equal(button.progress, '', '不额外生成选择进度行');
    const targetSelection = await page.evaluate(() => {
      beginChoice({ name: 'chooseTarget', selectTarget: [1, 2], prompt: '选择至多两名角色，将其共计至多两张牌置于你的武将牌上' });
      const results = [readTip()];
      for (const target of game.players) { ui.selected.targets.push(target); refreshOptimizedPrompt(); results.push(readTip()); }
      return results;
    });
    for (const tip of targetSelection) {
      assert.equal(tip.progress, '');
      assert.equal(tip.text, '选择至多两名角色，将其共计至多两张牌置于你的武将牌上');
    }
    const comparison = await page.evaluate(() => beginChoice({ name: 'chooseToCompare', skill: 'rende' }));
    assert.match(comparison.main, /刘备发动仁德,要求拼点，请出一张牌/);

    const recovered = await page.evaluate(() => {
      Object.assign(lib.translate, { jianxiong: '奸雄', rejianxiong: '奸雄', mimic: '奸雄', guicai: '鬼才', tiesuo: '铁索连环' });
      lib.translate.rejianxiong_info = '当你受到伤害后，你可以摸一张牌，并获得造成此伤害的牌。';
      lib.translate.mimic_info = '出牌阶段，你可以将三张黑色牌当作杀使用。';
      lib.card.tiesuo = { type: 'trick', selectTarget: [0, 2] };
      const original = beginChoice({ name: 'chooseBool', skill: 'jianxiong', prompt: '是否发动【奸雄】？' });
      const revised = beginChoice({ name: 'chooseBool', skill: 'rejianxiong', prompt: '是否发动【奸雄】？' });
      const custom = beginChoice({ name: 'chooseBool', skill: 'mimic', prompt: '是否发动【奸雄】？' });
      const unresolved = beginChoice({ name: 'chooseCard', skill: 'guicai', selectCard: [1, 1] });
      beginChoice({ name: 'chooseToUse', type: 'phase', selectTarget: [1, 3] });
      ui.selected.cards = [{ name: 'sha' }];
      refreshOptimizedPrompt();
      const multiple = readTip();
      beginChoice({ name: 'chooseToUse', type: 'phase', selectTarget: [0, 2] });
      ui.selected.cards = [{ name: 'tiesuo' }];
      refreshOptimizedPrompt();
      const recast = readTip();
      const response = beginChoice({ name: 'chooseToRespond', respondTo: [game.players[1], { name: 'sha' }], selectCard: [1, 1] });
      const safeTemplate = formatOfficialTemplate('{Source}取得{Card}', { Source: '孙&策', Card: '<img src=x onerror=alert(1)>' });
      return { total: officialSkillPrompts.length, original, revised, custom, unresolved, multiple, recast, response, safeTemplate };
    });
    assert.equal(recovered.total, 3129);
    assert.equal(recovered.original.officialId, '42');
    assert.equal(recovered.original.main, '是否发动奸雄获得伤害牌');
    assert.equal(recovered.revised.officialId, '717', '界奸雄错误套用了旧版提示');
    assert.equal(recovered.revised.main, '是否发动奸雄获得伤害牌并摸1张牌');
    assert.equal(recovered.custom.officialId, undefined, '同名自定义技能被错误套用官方技能');
    assert.equal(recovered.custom.main, '是否发动【奸雄】？');
    assert.equal(recovered.unresolved.officialId, undefined);
    assert(!/\{\w+\}/.test(recovered.unresolved.text), '出现未替换的模板参数');
    assert.equal(recovered.multiple.main, '可选择最多3名角色，作为杀的目标');
    assert.equal(recovered.recast.main, '直接重铸，或选择一至两名角色作为铁索连环的目标');
    assert.equal(recovered.response.main, '关羽对你使用了杀，请使用一张闪');
    assert.match(recovered.safeTemplate, /孙&amp;策取得&lt;img/);

    const shortOnly = await page.evaluate(() => {
      lib.translate.jianxiong_info = '当你受到伤害后，你可以获得造成此伤害的牌。';
      return beginChoice({ name: 'chooseBool', skill: 'jianxiong', prompt: '是否发动【奸雄】？', prompt2: lib.translate.jianxiong_info });
    });
    assert.equal(shortOnly.main, '是否发动奸雄获得伤害牌');
    assert(!shortOnly.text.includes('当你受到伤害后'), '完整技能说明覆盖了短提示牌区');

    const preserved = await page.evaluate(() => {
      beginChoice({ name: 'chooseTarget', skill: 'rende', selectTarget: [1, 2], prompt: '<font color="#81E05F">令关羽获得2张牌</font>', prompt2: '可以选择至多两名角色' });
      const dialog = ui.create.dialog(_status.event.prompt);
      _status.event.dialog = dialog;
      dialog.addText(_status.event.prompt2);
      const safeTip = readTip();
      const actions = dialog.add('<span class="text">查看<a href="#">详情</a></span>');
      actions.querySelector('a').onclick = event => event.preventDefault();
      dialog.open();
      return { safeTip, actions: getComputedStyle(actions).display, dialog: getComputedStyle(dialog).visibility };
    });
    assert(preserved.safeTip.tokens.some(token => token.color === 'rgb(129, 224, 95)'));
    assert.match(preserved.safeTip.text, /可以选择至多两名角色/);
    assert.notEqual(preserved.actions, 'none');
    assert.notEqual(preserved.dialog, 'hidden');

    const cleanup = await page.evaluate(() => {
      beginChoice({ name: 'chooseToUse', type: 'phase' });
      lib.hooks.uncheckEnd.handlers.forEach(handler => handler(_status.event, ['button', 'card', 'target']));
      const unchecked = readTip();
      beginChoice({ name: 'chooseTarget', selectTarget: [1, 1] });
      _status.event = { name: 'chooseTarget', player: game.players[1], isMine: () => false };
      refreshOptimizedPrompt();
      const remote = readTip();
      beginChoice({ name: 'chooseCard', selectCard: [1, 1] });
      lib.config.extension_十周年UI_optimizePrompt = false;
      refreshOptimizedPrompt();
      const disabled = readTip();
      lib.config.extension_十周年UI_optimizePrompt = true;
      beginChoice({ name: 'chooseCard', selectCard: [1, 1] });
      game.over();
      return { unchecked, remote, disabled, over: readTip() };
    });
    assert.deepEqual(cleanup, { unchecked: null, remote: null, disabled: null, over: null });

    await page.evaluate(() => {
      beginChoice({ name: 'chooseTarget', skill: 'rende', selectTarget: [1, 2], prompt: '仁德：请选择1至2名角色，令其获得2张牌', prompt2: '选择目标后点击确定' });
      ui.selected.targets = [game.players[1]];
      refreshOptimizedPrompt();
    });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.fonts.check('20px dui-official-prompt')), true);
    const screenshot = path.resolve(__dirname, 'official-prompt-browser.png');
    await page.screenshot({ path: screenshot });
    assert.deepEqual(errors, []);
    const result = { scenes: ['phase', 'useCard', 'skillCard', 'skillTarget', 'chooseCardTarget', 'discard', 'chooseCard', 'respond', 'dying', 'wuxie', 'control', 'button', 'compare'], recoveredCatalog: { records: recovered.total, oldSkillId: recovered.original.officialId, revisedSkillId: recovered.revised.officialId, versionSeparated: true, customSkillPreserved: true, unresolvedParametersHidden: true, multipleTargets: true, recast: true }, cardPromptDisabled: true, nativeDialog: true, fontLoaded: true, semanticColors: true, nativeRichColor: true, interactivePreserved: true, cleanup, errors };
    fs.writeFileSync(path.resolve(__dirname, 'official-prompt-browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log('OFFICIAL_PROMPT_OK', JSON.stringify(result));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
