const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 由真实游戏入口启动，不替换 get.card、game.check、chooseToUse 或点击处理。
module.exports = async function verifyPhasePrompt(page) {
  const beforeCancel = await page.evaluate(async () => {
    const { game, ui, lib, get, _status } = await import('/noname.js');
    const { Content } = await import('/noname/library/element/content.js');
    const { clearOptimizedPrompts, refreshOptimizedPrompt } = await import('/extension/十周年UI/src/ui/optimizedPrompt.js');
    game.uncheck();
    for (const dialog of [...ui.dialogs]) dialog.close();
    clearOptimizedPrompts();
    lib.config.auto_confirm = false;
    lib.config.extension_十周年UI_optimizePrompt = true;
    _status.currentPhase = game.me;
    const sha = game.createCard('sha', 'spade', 8);
    const guohe = game.createCard('guohe', 'spade', 12);
    game.me.directgain([sha, guohe]);
    const event = game.me.chooseToUse({ type: 'phase' });
    event._skillChoice = [];
    _status.eventManager.setStatusEvent(event, true);
    // 执行本体阶段入口，让本体自己生成默认弹窗文案。
    await Content.chooseToUse[0](event, null, game.me);
    const read = () => {
      const tip = [...ui.arena.querySelectorAll('.decade-optimized-hand-tip')].find(tip => !tip.closed && !tip.classList.contains('hidden'));
      return {
        main: tip?.querySelector('.decade-official-main')?.textContent || '',
        progress: tip?.querySelector('.decade-official-progress')?.textContent || '',
        card: get.card()?.name || null,
        selected: ui.selected.cards.map(card => card.name),
        targets: ui.selected.targets.length,
        officialId: tip?.dataset.officialSkillId || null,
        cardColors: [...(tip?.querySelectorAll('[data-type="card"]') || [])].map(node => ({ text: node.textContent, color: getComputedStyle(node).color })),
        visible: !!tip && getComputedStyle(tip).display !== 'none',
      };
    };
    const nativeCaption = event.dialog?.content?.firstElementChild?.textContent;
    const before = read();
    _status.clicked = false;
    ui.click.card.call(sha);
    const selectedSha = read();
    const target = game.players.find(player => player !== game.me && player.classList.contains('selectable'));
    if (!target) throw new Error('No selectable target after selecting sha');
    _status.clicked = false;
    ui.click.target.call(target);
    const selectedTarget = read();
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(resolve));
    window.phasePromptCase = { event, sha, guohe, target, read };
    return { nativeCaption, before, selectedSha, selectedTarget };
  });
  await page.screenshot({ path: path.resolve(__dirname, '../.codex-tmp/official-prompt-phase-target.png') });
  const afterCancel = await page.evaluate(async () => {
    const { ui, _status } = await import('/noname.js');
    const { refreshOptimizedPrompt } = await import('/extension/十周年UI/src/ui/optimizedPrompt.js');
    const { event, sha, guohe, target, read } = window.phasePromptCase;
    _status.clicked = false;
    ui.click.target.call(target);
    _status.clicked = false;
    ui.click.card.call(sha);
    const deselected = read();
    _status.clicked = false;
    ui.click.card.call(guohe);
    const selectedTrick = read();
    _status.clicked = false;
    ui.click.card.call(guohe);
    const afterSwitch = read();
    ui.click.cancel();
    event.finish();
    event.dialog?.close();
    refreshOptimizedPrompt();
    const canceled = read();
    delete window.phasePromptCase;
    return { deselected, selectedTrick, afterSwitch, canceled, cancelResult: event.result };
  });
  const result = { ...beforeCancel, ...afterCancel };
  fs.writeFileSync(path.resolve(__dirname, 'official-prompt-phase-engine-results.json'), JSON.stringify(result, null, 2));
  assert.equal(result.nativeCaption, '请选择要使用的牌', '未覆盖本体真实生成的默认弹窗');
  assert.equal(result.before.main, '出牌阶段，请选择一张卡牌', '出牌阶段没有替换原生默认文案');
  assert.equal(result.selectedSha.main, '请选择1名角色，作为杀的目标', '选杀后没有切换为官方 ActiveTip');
  assert.equal(result.selectedSha.officialId, '1');
  assert(result.selectedSha.cardColors.some(token => token.text === '杀' && token.color === 'rgb(255, 216, 0)'), '杀未使用官方 #FFD800 颜色');
  assert.equal(result.selectedTarget.main, result.selectedSha.main);
  assert.equal(result.selectedTarget.targets, 1);
  assert.equal(result.selectedTarget.progress, '', '真实选中目标后不应出现额外计数行');
  assert.equal(result.deselected.main, result.before.main, '取消选杀后没有恢复出牌阶段文案');
  assert.equal(result.deselected.progress, '');
  assert.equal(result.selectedTrick.main, '请选择一名角色，弃置其一张牌', '换选锦囊后仍显示旧提示');
  assert.equal(result.selectedTrick.officialId, '5');
  assert.equal(result.afterSwitch.main, result.before.main);
  assert.equal(result.canceled.visible, false, '结束选择后优化提示未消失');
  assert.equal(result.cancelResult.bool, false);
  console.log('OFFICIAL_PHASE_ENGINE_OK', JSON.stringify(result));
};

if (require.main === module) {
  const child = require('node:child_process').spawnSync(process.execPath, [
    path.resolve(__dirname, '../.codex-tmp/official-prompt-game.cjs'), '--decade', '--phase-use', ...process.argv.slice(2),
  ], { stdio: 'inherit' });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
}
