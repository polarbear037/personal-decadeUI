const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const moduleCode = (file, expose) => '(function(){' + fs.readFileSync(path.join(root, file), 'utf8').replace(/^import[^;]*;\s*/gm, '').replace(/^export\s*\{[^}]*\};?\s*/gm, '') + '\n' + expose + '})();';

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setContent('<!doctype html><meta charset="utf-8"><body>');
    await page.addStyleTag({ path: path.join(root, 'src/styles/meihua.css') });
    await page.addStyleTag({ content: 'body{margin:0;background:#29251f}.player{position:absolute;top:100px;width:160px;height:220px;background:#705344}.handdisplays{position:absolute;color:white}' });
    await page.evaluate(() => {
      HTMLElement.prototype.hide = function () { this.style.display = 'none'; };
      HTMLElement.prototype.show = function () { this.style.display = ''; };
      window.game = { me: { hasSkillTag: () => false } };
      window.lib = { character: {}, config: {}, translate: { sha: '杀' } };
      window.get = { is: { shownCard: card => !!card.shown } };
      window.ui = {};
      window._status = {};
      window.decadeUI = { config: {}, isMobile: () => false };
      window.base = { lib: { element: { player: { $init() {} } } } };
    });
    await page.addScriptTag({ content: moduleCode('src/utils/element.js', 'window.element = n;') });
    await page.addScriptTag({ content: moduleCode('src/overrides/player/ui.js', 'window.updateShowCards = n;') });
    await page.addScriptTag({ content: moduleCode('src/ui/player-init.js', 'window.initPlayer = i(base);') });
    let passed = 0;
    const assertSide = async (onRight, label) => {
      const metrics = await page.evaluate(() => {
        const playerRect = player.getBoundingClientRect(), panel = player.node.showCards, panelRect = panel.getBoundingClientRect();
        return { left: playerRect.left, right: playerRect.right, panelLeft: panelRect.left, panelRight: panelRect.right, visible: getComputedStyle(panel).display !== 'none', cards: panel.textContent };
      });
      assert(metrics.visible && metrics.cards.includes('杀'), label + ' 队友手牌未显示');
      assert(Math.abs(onRight ? metrics.left - metrics.panelRight - 10 : metrics.panelLeft - metrics.right - 10) < 1, label + ' 手牌面板位置错误 ' + JSON.stringify(metrics));
      passed++;
    };
    for (const style of ['babysha', 'on', 'onlineUI']) {
      await page.evaluate(style => {
        document.body.replaceChildren();
        lib.config.extension_十周年UI_newDecadeStyle = style;
        const player = document.createElement('div'); player.className = 'player'; player.style.left = '900px';
        player.dataset.position = '1'; player.dataset.borderLevel = 'one';
        player.node = { handcards1: document.createElement('div'), handcards2: document.createElement('div') };
        player.append(player.node.handcards1, player.node.handcards2); document.body.append(player);
        player.cards = [{ name: 'sha' }]; player.controlled = true; player.dead = false;
        player.isDead = () => player.dead; player.isUnderControl = () => player.controlled;
        player.getCards = (zone, filter) => player.cards.filter(filter);
        player.decadeUI_updateShowCards = updateShowCards;
        window.player = player; initPlayer.call(player, 'test');
      }, style);
      await page.waitForTimeout(30);
      await assertSide(true, style + ' 右侧');
      await page.evaluate(() => { player.style.left = '100px'; player.dataset.position = '7'; });
      await page.waitForTimeout(30);
      await assertSide(false, style + ' 换到左侧');
      await page.evaluate(() => { player.style.left = '900px'; player.dataset.position = '1'; document.body.style.zoom = '0.8'; });
      await page.waitForTimeout(30);
      const zoomGap = await page.evaluate(() => player.getBoundingClientRect().left - player.node.showCards.getBoundingClientRect().right);
      assert(Math.abs(zoomGap - 8) < 1, '缩放后间距错误'); passed++;
      await page.evaluate(() => { document.body.style.zoom = ''; player.controlled = false; player.decadeUI_updateShowCards(); });
      assert(await page.evaluate(() => getComputedStyle(player.node.showCards).display === 'none'), '对手隐藏手牌被显示'); passed++;
      await page.evaluate(() => { player.controlled = true; player.cards = []; player.node.handcards1.append(document.createElement('div')); });
      await page.waitForTimeout(30);
      assert(await page.evaluate(() => getComputedStyle(player.node.showCards).display === 'none'), '无手牌面板未隐藏'); passed++;
      await page.evaluate(() => { player.cards = [{ name: 'sha' }]; player.node.handcards1.replaceChildren(); });
      await page.waitForTimeout(30);
      await assertSide(true, style + ' 手牌变化后恢复');
      await page.evaluate(() => { player.dead = true; player.decadeUI_updateShowCards(); });
      assert(await page.evaluate(() => getComputedStyle(player.node.showCards).display === 'none'), '死亡玩家手牌未隐藏'); passed++;
    }
    assert.deepEqual(errors, [], 'Browser errors');
    console.log(JSON.stringify({ passed, errors }, null, 2));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
