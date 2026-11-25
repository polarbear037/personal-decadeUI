const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const baseline = process.argv.includes('--baseline');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard'], hp_style: 'round', extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_optimizePrompt: 'xinsha' });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = { baseline, cases: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 2052, height: 919 } });
    page.on('pageerror', error => report.errors.push(error.stack));
    page.on('dialog', dialog => { report.errors.push(dialog.message()); dialog.accept(); });
    await dependencies(page);
    if (baseline) {
      await page.route('**/src/styles/xinsha-faction-dialog.css*', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.resolve(__dirname, '../src/styles/xinsha-faction-dialog.css'), 'utf8').replace('body[data-style="othersOff"] #arena.decadeUI > .dialog.xinsha-faction-dialog .caption,', 'body[data-style="othersOff"] .xinsha-faction-dialog .xinsha-faction-native-caption,').replace('calc(85 *', 'calc(100 *') }));
      await page.route('**/src/ui/optimizedPrompt.js*', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.resolve(__dirname, '../src/ui/optimizedPrompt.js'), 'utf8').replace(' || topDialog?.classList.contains("xinsha-faction-dialog")', '') }));
    }
    for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js', 'stackframe@1.3.4/node_modules/stackframe/stackframe.js', 'error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js', 'stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js']) {
      if (/as __require/.test(fs.readFileSync(path.resolve(__dirname, '../../../node_modules/.pnpm', file), 'utf8'))) await page.unroute('**/node_modules/.pnpm/' + file);
    }
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.waitForFunction(() => window.decadeUI && window.game?.players?.length > 1 && !document.querySelector('.loading-screen'), null, { timeout: 45000 });
    for (const optimize of [false, true, 'xinsha']) {
    await page.evaluate(async optimize => {
      const { game, ui, lib, _status } = await import('/noname.js');
      const { Content } = await import('/noname/library/element/content.js');
      game.pause();
      for (const dialog of [...ui.dialogs]) dialog.close();
      ui.arena.classList.remove('choose-character');
      lib.config.extension_十周年UI_optimizePrompt = optimize;
      const event = game.me.chooseButton(['请选择你的势力', [['wei', 'shu', 'wu', 'qun', 'jin'].map(group => ['', '', `group_${group}`]), 'vcard']], true);
      _status.eventManager.setStatusEvent(event, true);
      window.factionProbe = event;
      await Content.chooseButton[0](event, null, game.me);
      event.dialog.add('请选择你的势力');
      await document.fonts.ready;
    }, optimize);
    await page.waitForTimeout(350);
    const result = await page.evaluate(() => {
      const dialog = factionProbe.dialog;
      const label = dialog.querySelector('.xinsha-faction-label');
      return { captions: [...dialog.querySelectorAll('.caption')].map(node => ({ text: node.textContent, display: getComputedStyle(node).display })), optimizedTips: [...document.querySelectorAll('.hand-tip.decade-optimized-hand-tip')].filter(node => getComputedStyle(node).display !== 'none').map(node => node.textContent), labelDesignSize: parseFloat(getComputedStyle(label).fontSize) / parseFloat(dialog.style.getPropertyValue('--xinsha-faction-card-unit')), titleCount: dialog.querySelectorAll('.xinsha-faction-title').length, footerCount: dialog.querySelectorAll('.xinsha-faction-prompt').length };
    });
    report.cases.push({ optimize, ...result });
    assert.equal(result.captions.filter(node => node.display !== 'none').length, baseline ? 1 : 0);
    assert.ok(Math.abs(result.labelDesignSize - (baseline ? 100 : 85)) < .01);
    assert.equal(result.titleCount, 1);
    assert.equal(result.footerCount, 1);
    if (!baseline) assert.deepEqual(result.optimizedTips, []);
    }
    assert.deepEqual(report.errors, []);
    await page.screenshot({ path: path.join(__dirname, 'faction-caption-engine.png') });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    fs.writeFileSync(path.join(__dirname, `faction-caption-engine${baseline ? '-baseline' : ''}-results.json`), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
