// 真实 MutationObserver、设置回调及雷的ol目标钩子；播放接口记录调用，不替代游戏内像素验证。
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const prefix = 'extension/十周年UI/';
const results = [];
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1368, height: 760 }, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile });
      for (const style of ['on', 'off', 'othersOff', 'onlineUI', 'babysha', 'codename']) {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/__card_verification__`);
        await page.evaluate(style => {
          document.body.dataset.style = style;
          document.body.innerHTML = '<div id="arena"><div id="first" class="player"></div><div id="second" class="player"></div></div>';
          window.lib = { config: { extensions: [], extension_十周年UI_newDecadeStyle: style, extension_十周年UI_chupaizhishi: 'jiangjun', extension_雷的ol_targetEffect: 'default' }, element: { player: {} }, animate: { card: {}, skill: {} }, card: {}, hooks: { checkTarget: [], uncheckTarget: [] } };
          window.game = { players: [...document.querySelectorAll('.player')], hasExtension: name => lib.config.extensions.includes(name) && lib.config[`extension_${name}_enable`] !== false };
          window.ui = { arena: document.querySelector('#arena') };
          window._status = { event: { name: 'chooseTarget', isMine: () => true, filterTarget() {} } };
          window.decadeUI = { config: { chupaizhishi: 'jiangjun' } };
          window.first = game.players[0]; window.second = game.players[1];
          window.cardTriggers = {};
          window.active = new Map(); window.leiActive = new Map(); window.pendingLoads = [];
          window.cold = false; window.starts = 0;
          decadeUI.animation = {
            hasSpine: () => !cold,
            loadSpine(name, type, success) { pendingLoads.push(success); },
            playSpine(sprite, position) { const node = { id: ++starts, ...sprite, ...position }; active.set(node.id, node); return node; },
            stopSpine(node) { active.delete(node.id); },
          };
          window.skinSwitch = { chukuangWorkerApi: {
            playEffect(sprite, position, onStart) { leiActive.set(sprite.id, { sprite, position }); onStart(true); },
            stopEffect(sprite) { leiActive.delete(sprite.id); }, supportsEffectStartCallback: true,
          } };
          window.check = () => { for (const player of game.players) for (const hook of lib.hooks.checkTarget) hook(player, _status.event); };
        }, style);
        await page.addScriptTag({ content: script(prefix + 'src/animation/configs/skillAnimations.js', 'window.chupaiAnimations=e;window.cardDefines=n;window.skillDefines=a;') });
        await page.addScriptTag({ content: script(prefix + 'src/animation/initAnimations.js', 'window.initSkillAnimations=t;') });
        await page.addScriptTag({ content: script(prefix + 'src/config/handlers/card-handlers.js', 'window.updateIndicator=I;') });
        await page.addScriptTag({ content: script('extension/雷的ol/utils/targetEffects.js', 'window.installTargetEffects=installTargetEffects;') });
        await page.evaluate(async () => {
          initSkillAnimations(decadeUI.animation);
          for (const player of game.players) await lib.element.player.inits[0](player);
          installTargetEffects({ lib, game, ui, _status, document });
          first.classList.add('selectable'); second.classList.add('selectable'); check();
        });
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => active.size + leiActive.size), 0, '可选目标没有Spine');
        await page.evaluate(() => { updateIndicator(); first.classList.add('selected'); check(); });
        await page.waitForTimeout(350);
        assert.deepEqual(await page.evaluate(() => [...active.values()].map(node => node.parent.id)), ['first']);
        await page.evaluate(() => { first.classList.add('irrelevant'); check(); });
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => active.size), 1, '其他class变化不重复播放');
        await page.evaluate(() => { second.classList.add('selected'); check(); });
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => active.size), 2, '多目标各播放一次');
        await page.evaluate(() => { first.classList.remove('selected'); second.classList.remove('selected'); check(); });
        await page.waitForTimeout(30);
        assert.equal(await page.evaluate(() => active.size), 0, '取消后停止');
        await page.evaluate(() => first.classList.add('selected'));
        await page.waitForTimeout(60);
        await page.evaluate(() => first.classList.remove('selected'));
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => active.size), 0, '300ms内取消不补播');
        await page.evaluate(() => { cold = true; first.classList.add('selected'); });
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => pendingLoads.length), 1);
        await page.evaluate(() => first.classList.remove('selected'));
        await page.waitForTimeout(30);
        await page.evaluate(() => { cold = false; pendingLoads.splice(0).forEach(done => done()); });
        assert.equal(await page.evaluate(() => active.size), 0, '冷加载取消后不补播');
        await page.evaluate(() => { first.classList.add('selected'); updateIndicator(); });
        assert.equal(await page.evaluate(() => active.size), 1, '设置刷新沿用已选中状态');
        await page.evaluate(() => { lib.config.extension_十周年UI_chupaizhishi = 'off'; updateIndicator(); });
        assert.equal(await page.evaluate(() => active.size), 0, '关闭设置立即停止');
        await page.evaluate(() => {
          lib.config.extension_十周年UI_chupaizhishi = 'jiangjun';
          lib.config.extensions.push('雷的ol'); lib.config.extension_雷的ol_enable = true;
          updateIndicator(); check();
        });
        await page.waitForTimeout(350);
        assert.deepEqual(await page.evaluate(() => [active.size, leiActive.size]), [0, 1], '并用时只播雷的ol');
        await page.evaluate(() => { first.classList.remove('selected'); check(); });
        await page.waitForTimeout(30);
        assert.deepEqual(await page.evaluate(() => [active.size, leiActive.size]), [0, 0]);
        await page.evaluate(() => { lib.config.extension_雷的ol_targetEffect = 'off'; first.classList.add('selected'); check(); });
        await page.waitForTimeout(350);
        assert.deepEqual(await page.evaluate(() => [active.size, leiActive.size]), [1, 0], '雷的ol关闭后保留十周年UI特效');
        await page.evaluate(() => { first.classList.remove('selected'); check(); });
        await page.waitForTimeout(30);
        await page.evaluate(() => { lib.config.extension_雷的ol_targetEffect = 'default'; lib.config.extension_雷的ol_enable = false; first.classList.add('selected'); });
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => active.size), 1, '扩展禁用不误屏蔽十周年UI');
        await page.evaluate(() => { first.classList.remove('selected'); });
        await page.waitForTimeout(30);
        assert.equal(await page.evaluate(() => active.size), 0);
        assert.deepEqual(errors, []);
        results.push({ mobile, dpr: mobile ? 3 : 1, style, pass: true, playback: 'recording stubs; real DOM observer and both extension modules' });
        console.log(`${mobile ? 'mobile simulation' : 'desktop'}/${style}: PASS`);
        await page.close();
      }
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname, 'target-indicator-selection-results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
