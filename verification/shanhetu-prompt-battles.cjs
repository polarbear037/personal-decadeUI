const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const origin = process.env.SHANHETU_TEST_ORIGIN || 'http://127.0.0.1:8176';
const beforeFix = process.argv.includes('--before');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1915, height: 871 } });
  const report = { fixture: '隔离浏览器真实本体/十周年UI/皮肤切换/山河图；测试输入启动三场战斗，原生 die 胜利，跳过奖励选择返回地图；不写用户 Electron 存档。', battles: [], errors: [], extensionFailures: [], hostFailures: [] };
  page.on('pageerror', error => report.errors.push(error.stack || error.message));
  page.on('response', response => {
    if (response.status() < 400) return;
    const entry = { status: response.status(), url: decodeURI(response.url()) };
    (/\/extension\/(山河图|十周年UI)\//.test(entry.url) ? report.extensionFailures : report.hostFailures).push(entry);
  });
  page.on('dialog', dialog => dialog.dismiss());
  try {
    if (beforeFix) await page.route('**/src/ui/handtip.js', route => {
      const source = fs.readFileSync(path.join(__dirname, '../src/ui/handtip.js'), 'utf8');
      const original = source.replace(/\t+\/\/ 连续战斗清场会移除 DOM[^\n]*\n[\s\S]*?(?=\t+\(this\.classList\.remove\("hidden"\))/, '');
      assert.notEqual(original, source, '修复前对照未移除挂载修正');
      return route.fulfill({ contentType: 'text/javascript', body: original });
    });
    await page.addInitScript(() => {
      sessionStorage.setItem('isJITReloaded', 'true');
      sessionStorage.setItem('canUseTs', 'true');
      localStorage.setItem('gplv3_noname_alerted', 'true');
    });
    await page.goto(origin + '/extension/山河图/preview.html');
    await page.evaluate(async () => {
      const { createOfficialRun } = await import('./core.js');
      const run = createOfficialRun('caocao', 0, 20261105, 6);
      run.mapGuideSeen = run.shopGuideSeen = true;
      const { version } = await fetch('../十周年UI/info.json').then(response => response.json());
      const config = { mode: 'shanhetu', extensions: ['十周年UI', '皮肤切换', '山河图'], extension_十周年UI_enable: true, extension_十周年UI_welcomeVersion: version, extension_皮肤切换_enable: true, extension_山河图_enable: true, extension_十周年UI_newDecadeStyle: 'onlineUI', extension_十周年UI_optimizePrompt: true, extension_十周年UI_cardPrompt: false, extension_十周年UI_dynamicSkin: false, dynamicSkin: false, extension_auto_import: false, show_splash: 'off', characters: ['standard'], cards: ['standard', 'extra'], plays: [], background_music: 'music_off', confirm_exit: false, compatible: false, debug: true, extension_山河图_run: run, extension_山河图_theme_ui: { version: 1, introSeen: { 5: true }, tutorialDone: true }, mode_config: { global: { change_card: 'disabled' }, identity: { change_card: 'disabled' } } };
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('noname_0.9_data', 4);
        request.onupgradeneeded = () => { for (const name of ['video', 'image', 'audio', 'config', 'data']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name); };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, tx = db.transaction('config', 'readwrite'); for (const [key, value] of Object.entries(config)) tx.objectStore('config').put(value, key); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
      });
      localStorage.setItem('noname_directstart', 'true');
      localStorage.setItem('noname_0.9_directstart', 'true');
    });
    await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '继续征程', exact: true }).waitFor({ timeout: 45000 });
    await page.evaluate(async () => {
      window.promptHost = await import('./noname.js');
      promptHost.lib.config.auto_confirm = false;
      promptHost.lib.config.extension_十周年UI_autoSelect = false;
      document.querySelector('.decade-welcome-overlay')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      window.readBattlePrompt = () => {
        const { ui } = promptHost;
        const tip = [...ui.arena.querySelectorAll('.decade-optimized-hand-tip')].find(node => !node.closed && !node.classList.contains('hidden'));
        const rect = tip?.getBoundingClientRect();
        return { text: tip?.querySelector('.decade-official-main')?.textContent || '', visible: !!tip && getComputedStyle(tip).display !== 'none' && getComputedStyle(tip).visibility !== 'hidden' && rect.width > 0 && rect.height > 0, poolSize: decadeUI.statics.handTips.length, detached: decadeUI.statics.handTips.filter(tip => !tip.isConnected).length };
      };
    });
    await page.getByRole('button', { name: '继续征程', exact: true }).click();
    for (let index = 0; index < 3; index++) {
      await page.waitForFunction(() => game.shanhetuApp?.resolver && document.querySelector('[data-screen="smallmap"]'));
      await page.evaluate(async index => {
        const app = game.shanhetuApp, run = app.state;
        const { createOfficialBattle } = await import('./extension/山河图/official-combat.js');
        run.status = 'battle'; run.position = index; run.pending = createOfficialBattle(run, run.nodes[index], 22473);
        run.nodes[index].encounter = run.pending;
        await app.save(); app.choose('prompt-test-battle');
      }, index);
      await page.waitForFunction(() => {
        const { _status, game } = promptHost;
        return _status.event?.name === 'chooseToUse' && _status.event.type === 'phase' && _status.event.player === game.me && _status.paused;
      }, null, { timeout: 45000 });
      await page.evaluate(() => {
        window.promptSha = game.createCard('sha', 'spade', 8);
        game.me.directgain([promptSha]);
      });
      await page.waitForFunction(() => game.me.getCards('h').includes(promptSha), null, { timeout: 5000 });
      const row = await page.evaluate(() => {
        const { game, ui, _status } = promptHost;
        const phase = readBattlePrompt();
        const sha = promptSha;
        delete _status.event._cardChoice;
        game.check();
        _status.clicked = false; ui.click.card.call(sha);
        const selected = readBattlePrompt();
        const target = game.players.find(player => player !== game.me && player.classList.contains('selectable'));
        if (!target) throw new Error('No selectable target after selecting sha: ' + JSON.stringify({ phase, selected, shaClass: sha.className, shaParent: sha.parentNode?.className, selectedCards: ui.selected.cards.map(card => card.name), choosing: _status.imchoosing, event: _status.event.name, players: game.players.map(player => ({ name: player.name, hp: player.hp, classes: player.className })), dialogs: ui.dialogs.map(dialog => dialog.textContent) }));
        _status.clicked = false; ui.click.target.call(target);
        const targeted = { ...readBattlePrompt(), targets: ui.selected.targets.length };
        _status.clicked = false; ui.click.target.call(target);
        _status.clicked = false; ui.click.card.call(sha);
        return { phase, selected, targeted, deselected: readBattlePrompt() };
      });
      report.battles.push(row);
      assert.equal(row.phase.visible, true, `第${index + 1}场出牌提示不可见`);
      assert.match(row.phase.text, /出牌阶段/);
      assert.equal(row.selected.visible, true);
      assert.match(row.selected.text, /杀.*目标/);
      assert.equal(row.targeted.targets, 1);
      assert.equal(row.deselected.text, row.phase.text);
      if (index === 2) await page.screenshot({ path: path.join(__dirname, 'shanhetu-prompt-third-battle.png') });
      await page.evaluate(() => { for (const enemy of game.shanhetuBattle.enemies) enemy.die(); game.resume(); });
      await page.waitForSelector('.sht-game-result[data-result="win"]', { timeout: 30000 });
      await page.evaluate(() => { const app = game.shanhetuApp; app.state.status = 'map'; app.state.pending = null; app.official.result.close(); });
      console.log('BATTLE_PROMPT_OK', index + 1, JSON.stringify(row));
    }
    await page.waitForFunction(() => game.shanhetuApp?.resolver && document.querySelector('[data-screen="smallmap"]'));
    assert.deepEqual(report.errors, []);
    report.promptFailures = report.extensionFailures.filter(entry => /\.(?:js|css|ttf|woff2?)(?:\?|$)/.test(entry.url));
    assert.deepEqual(report.promptFailures, [], '提示脚本、样式或字体加载失败');
    console.log('SHANHETU_PROMPT_BATTLES_OK', JSON.stringify({ battles: report.battles.length, errors: report.errors.length, extensionFailures: report.extensionFailures.length, hostFailures: report.hostFailures.length }));
  } finally {
    fs.writeFileSync(path.join(__dirname, `shanhetu-prompt-battles-${beforeFix ? 'before' : 'results'}.json`), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
