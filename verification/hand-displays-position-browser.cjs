const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium } = require('./online-player-tips-browser.cjs');

if (process.argv.includes('--geometry-only')) {
 const vm = require('node:vm');
 const source = fs.readFileSync(path.join(__dirname, '../src/ui/hand-displays.js'), 'utf8')
  .replace('import { ui } from "noname";', '').replace('export function', 'function');
 let cases = 0, oldFailures = 0;
 for (const divisor of [0.75, 1, 1.5, 2]) for (const hostLeft of [0, 100]) {
  const ui = { window: { getBoundingClientRect: () => ({ left: hostLeft / divisor, width: 1440 / divisor }) } };
  const context = vm.createContext({ ui }); vm.runInContext(source, context);
  const panel = { style: { top: '90px', bottom: '', width: '35px' } };
  for (const [x, onRight] of [[1000, true], [100, false], [1000, true]]) {
   const player = { node: { showCards: panel }, getBoundingClientRect: () => ({ left: (hostLeft + x) / divisor, width: 130 / divisor }) };
   context.positionHandDisplays(player);
   assert.equal(panel.style[onRight ? 'left' : 'right'], 'auto');
   assert.equal(panel.style[onRight ? 'right' : 'left'], 'calc(100% + var(--handdisplays-gap, 10px))');
   assert.equal(panel.style.top, '90px'); assert.equal(panel.style.bottom, ''); assert.equal(panel.style.width, '35px');
   const bounds = player.getBoundingClientRect();
   if ((bounds.left + bounds.width / 2 >= 1440 / 2) !== onRight) oldFailures++;
   cases++;
  }
 }
 assert(oldFailures > 0, 'must reproduce the previous mixed-coordinate failure');
 console.log('HAND_DISPLAYS_GEOMETRY_OK', JSON.stringify({ cases, reproducedOldFailures: oldFailures }));
 process.exit(0);
}

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const report = { cases: [], errors: [] };
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.waitForFunction(async () => {
   const { game, ui } = await import('/noname.js');
   return game.players.length > 1 && window.decadeUI && ui.arena && Array.isArray(ui.dialogs);
  }, null, { timeout: 45000 });
  await page.evaluate(async () => {
   const { game, ui, lib, get, _status } = await import('/noname.js');
   Object.assign(window, { game, ui, lib, get, _status });
   game.pause();
   for (const dialog of [...ui.dialogs]) dialog.close();
   document.querySelector('.decade-welcome-overlay')?.remove();
   ui.arena.classList.remove('choose-character');
   game.me = game.players[0];
   window.mate = game.players[1];
   game.me.init('liubei'); mate.init('guanyu');
   game.me.side = mate.side = true;
   lib.skill.hand_position_probe = { charlotte: true, ai: { viewHandcard: true } };
   game.me.addSkill('hand_position_probe');
   _status.over = false; _status.gameStarted = true;
   mate.node.handcards1.replaceChildren(game.createCard('sha', 'spade', 7));
   mate.node.handcards2.replaceChildren();
   mate.classList.add('hand-position-probe');
   const css = document.createElement('style');
   css.textContent = '#window{inset:0!important;width:100%!important;height:100%!important}#arena{inset:0!important;width:100%!important;height:100%!important}#arena>.hand-position-probe{left:var(--probe-left)!important;right:auto!important;top:150px!important;bottom:auto!important;width:130px!important;height:180px!important;transform:none!important;transition:none!important}.hand-position-probe>.handdisplays{transition:none!important}';
   document.head.append(css);
   window.nativeRect = HTMLElement.prototype.getBoundingClientRect;
   window.chromeFix = await import('/extension/皮肤切换/js/utils/chrome-fix.js');
  });
  for (const style of ['othersOff', 'onlineUI', 'on', 'off', 'babysha', 'codename']) {
   await page.evaluate(async style => {
    const { getStyleFile } = await import('/extension/十周年UI/src/styles/style-route.js');
    lib.config.extension_十周年UI_newDecadeStyle = style;
    document.body.dataset.style = style;
    document.querySelectorAll('link[data-hand-position-style]').forEach(link => link.remove());
    for (const name of ['meihua', 'online-hand-cards']) {
     await new Promise((resolve, reject) => {
      const link = document.createElement('link'); link.rel = 'stylesheet';
      link.dataset.handPositionStyle = 'true';
      link.href = '/extension/十周年UI/src/styles/' + getStyleFile(name, style);
      link.onload = resolve; link.onerror = reject; document.head.append(link);
     });
    }
   }, style);
   for (const fixed of [false, true]) for (const zoom of [1, 1.5, 0.75]) {
    await page.evaluate(({ fixed, zoom }) => {
     HTMLElement.prototype.getBoundingClientRect = nativeRect;
     window.documentZoom = game.documentZoom = zoom; document.body.style.zoom = zoom;
     if (fixed) chromeFix.initChromeFix();
    }, { fixed, zoom });
    for (const side of ['right', 'left', 'right']) {
     const result = await page.evaluate(async side => {
      mate.style.setProperty('--probe-left', side === 'right' ? '75%' : '10%');
      mate.decadeUI_updateShowCards();
      await new Promise(requestAnimationFrame);
      const panel = mate.node.showCards;
      // 读原生屏幕边界，验证真实左右关系，不用实现自身的判断公式作断言。
      const p = nativeRect.call(mate), r = nativeRect.call(panel), css = getComputedStyle(panel);
      return { side, player: { left: p.left, right: p.right }, panel: { left: r.left, right: r.right },
       width: panel.offsetWidth, height: panel.offsetHeight, visible: css.display !== 'none',
       labels: panel.querySelectorAll('.handcard').length, online: panel.classList.contains('online-handdisplays'),
       gap: (side === 'right' ? p.left - r.right : r.left - p.right) / documentZoom };
     }, side);
     assert(result.visible, JSON.stringify(result));
     assert(side === 'right' ? result.panel.right < result.player.left : result.panel.left > result.player.right, JSON.stringify({ style, fixed, zoom, ...result }));
     assert(Math.abs(result.gap - (style === 'onlineUI' ? 5 : 10)) < 0.1);
     assert.equal(result.online, style === 'onlineUI');
     assert.equal(result.labels, style === 'onlineUI' ? 1 : 5);
     assert.equal(result.width, style === 'onlineUI' ? 34 : 35);
     assert.equal(result.height, style === 'onlineUI' ? 78 : 90);
     report.cases.push({ style, fixed, zoom, ...result });
    }
   }
   const empty = await page.evaluate(() => {
    const card = mate.node.handcards1.firstChild; card.remove(); mate.decadeUI_updateShowCards();
    const hidden = getComputedStyle(mate.node.showCards).display === 'none';
    mate.node.handcards1.append(card); mate.decadeUI_updateShowCards(); return hidden;
   });
   assert(empty, style + ': empty hand must hide');
  }
  await page.evaluate(() => { HTMLElement.prototype.getBoundingClientRect = nativeRect; });
  assert.deepEqual(report.errors, []);
  fs.writeFileSync(path.join(__dirname, 'hand-displays-position-results.json'), JSON.stringify(report, null, 2));
  console.log('HAND_DISPLAYS_POSITION_OK', JSON.stringify({ cases: report.cases.length, styles: 6, errors: report.errors }));
 } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
