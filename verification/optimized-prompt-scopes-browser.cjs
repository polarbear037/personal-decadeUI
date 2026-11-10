const fs = require('node:fs');
const path = require('node:path');
const { installNativeHarness, server, chromium, assert } = require('./optimized-prompt-browser.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await installNativeHarness(page, `http://127.0.0.1:${server.address().port}`, false);
    const result = await page.evaluate(() => {
      lib.skill.game = {};
      lib.skill.phaseUse = {};
      lib.skill.danshou = {};
      lib.skill.huashen = {};
      Object.assign(lib.translate, { game: 'game', phaseUse: '出牌阶段', danshou: '胆守', huashen: '化身' });
      get.skillTranslation = skill => lib.translate[skill] || skill;
      const root = { name: 'game' };
      const characterParent = { name: 'chooseCharacter', getParent: () => root };
      const begin = props => {
        for (const dialog of [...ui.dialogs]) dialog.close();
        clearOptimizedPrompts();
        ui.selected = { cards: [], targets: [], buttons: [] };
        _status.event = { player: game.me, isMine: () => true, getParent: () => root, ...props };
        return _status.event;
      };
      const tip = () => [...ui.arena.querySelectorAll('.decade-optimized-hand-tip')].find(node => !node.closed && !node.classList.contains('hidden'));
      const chooseCharacter = (free, arenaFlag) => {
        ui.arena.classList.toggle('choose-character', arenaFlag);
        const event = begin({ name: 'chooseButton', selectButton: [1, 1], getParent: () => arenaFlag ? root : characterParent });
        const dialog = ui.create.dialog(free ? '自由选将' : '选择角色');
        event.dialog = dialog;
        const buttons = ui.create.div('.buttons', dialog.content);
        const button = document.createElement('button');
        button.className = 'character';
        button.textContent = '刘备';
        buttons.appendChild(button);
        dialog.buttons = [button];
        lib.hooks.checkEnd.handlers.forEach(handler => handler(event));
        const result = { tip: tip()?.textContent || '', nativeCaption: getComputedStyle(dialog.content.firstElementChild).display, marked: !!dialog.dataset.decadeOptimizedPrompt, active: !!ui.arena.dataset.decadeOptimizedActive };
        return result;
      };
      const regular = chooseCharacter(false, false);
      const free = chooseCharacter(true, false);
      const arenaOnly = chooseCharacter(true, true);
      ui.arena.classList.remove('choose-character');
      const ordinary = begin({ name: 'chooseBool', prompt2: '系统说明' });
      const dialog = ui.create.dialog();
      ordinary.dialog = dialog;
      dialog.addText(ordinary.prompt2);
      refreshOptimizedPrompt();
      const engineFallback = tip()?.textContent || '';
      const phaseTexts = [];
      for (const prompt of [undefined, false]) {
        const event = begin({ name: 'chooseToUse', type: 'phase', prompt });
        lib.hooks.checkEnd.handlers.forEach(handler => handler(event));
        phaseTexts.push(tip()?.textContent || '');
      }
      begin({ name: 'chooseButton', selectButton: [1, 1], prompt: '胆守：请选择一种类型', getParent: () => ({ name: 'danshou', getParent: () => root }) });
      const skillDialog = ui.create.dialog(_status.event.prompt);
      _status.event.dialog = skillDialog;
      refreshOptimizedPrompt();
      const skill = tip()?.textContent || '';
      const characterSkillEvent = begin({ name: 'chooseButton', selectButton: [1, 1], prompt: '请选择一名化身武将', getParent: () => ({ name: 'huashen', getParent: () => root }) });
      const characterSkillDialog = ui.create.dialog(characterSkillEvent.prompt);
      characterSkillEvent.dialog = characterSkillDialog;
      const characterButtons = ui.create.div('.buttons', characterSkillDialog.content);
      const character = ui.create.div('.button.character', characterButtons);
      character.textContent = '刘备';
      characterSkillDialog.buttons = [character];
      refreshOptimizedPrompt();
      const characterSkill = tip()?.textContent || '';
      return { regular, free, arenaOnly, engineFallback, phaseTexts, skill, characterSkill };
    });
    for (const [name, value] of Object.entries({ regular: result.regular, free: result.free, arenaOnly: result.arenaOnly })) {
      assert.equal(value.tip, '', `${name}: 选将界面显示了战斗提示`);
      assert.equal(value.marked, false, `${name}: 接管了选将标题`);
      assert.equal(value.active, false, `${name}: 战斗提示标记未清除`);
      assert.notEqual(value.nativeCaption, 'none', `${name}: 原生选将标题被隐藏`);
    }
    assert.equal(result.engineFallback, '', 'game 被误识别成发动技能');
    assert.match(result.phaseTexts[0], /出牌阶段.*请选择一张卡牌/, '本体开关开启时缺少出牌提示');
    assert.equal(result.phaseTexts[1], '', '未保留本体出牌阶段提示开关');
    assert.match(result.skill, /胆守.*请选择一种类型/, '战斗中的真实技能提示丢失');
    assert.match(result.characterSkill, /请选择一名化身武将/, '战斗中的技能选将被错误排除');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(__dirname, 'optimized-prompt-scopes-results.json'), JSON.stringify({ ...result, errors }, null, 2));
    console.log('OPTIMIZED_PROMPT_SCOPES_OK', JSON.stringify({ ...result, errors }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
