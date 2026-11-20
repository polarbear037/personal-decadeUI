// 使用真实样式加载入口和角色函数；本体接口以最小桩隔离，不替代完整实局。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium } = require('./online-player-tips-browser.cjs');
const base = '/extension/十周年UI/';
function source(file, binding) {
  return `(function(){${fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export .*;\r?\n/gm, '')}\n${binding}})();`;
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const failures = [];
  try {
    for (const style of ['on', 'off', 'othersOff', 'onlineUI', 'babysha', 'codename']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      try {
        await page.route('**/__player-uninitialized__', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/noname-stub.js"}}</script><body><div id="window"><div id="arena" class="decadeUI" data-mode="identity"></div></div></body>' }));
        await page.route('**/noname-stub.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const {lib,ui,get,game,ai,_status}=window;' }));
        await page.route('**/src/utils/version.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export function checkVersionCompatibility(){}' }));
        await page.route('**/src/ui/prefixMark.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const prefixMarkModule={setupShowCharacterHook(){}};' }));
        await page.route('**/src/libs/spine.js?*', route => route.fulfill({ contentType: 'text/javascript', body: '/* 不启动 Spine */' }));
        await page.goto(`http://127.0.0.1:${server.address().port}/__player-uninitialized__`);
        await page.addStyleTag({ url: '/layout/default/layout.css' });
        await page.addStyleTag({ url: '/layout/long2/layout.css' });
        await page.evaluate(({ style, base }) => {
          HTMLElement.prototype.hide = function () { this.style.display = 'none'; return this; };
          const div = (selector = '', parent, click) => {
            if (selector instanceof HTMLElement) { parent = selector; selector = ''; }
            const node = document.createElement('div');
            if (selector) node.className = selector.replace(/^\./, '').replaceAll('.', ' ');
            parent?.appendChild(node);
            if (click) node.addEventListener('click', click);
            return node;
          };
          window.lib = { assetURL: '/', config: { mode: 'identity', extension_十周年UI_newDecadeStyle: style }, element: { Player: { prototype: HTMLElement.prototype } }, character: { liubei: {}, guanyu: {}, caocao: {}, zhangliao: {} }, extensionPack: { 十周年UI: { version: 'probe' } } };
          window.ui = { css: { layout: { href: 'layout/long2/layout.css' } }, arena: document.getElementById('arena'), create: { div }, click: {} };
          window.get = { mode: () => lib.config.mode, is: {} };
          window.game = {};
          window.ai = {};
          window._status = {};
          window.decadeUIPath = base;
          window.decadeUI = { get: { extend(target, additions) { Object.assign(target, additions); } }, config: { dynamicSkin: false }, isMobile: () => false };
          window.installDynamicOutcrop = window.restoreEquipPresentation = window.clearOnlineJudgeLayout = window.closeOnlineHandCards = () => {};
          window.getBasePlayerMethods = () => ({ $uninit() { this.classList.remove('unseen', 'unseen2', 'fullskin2'); } });
          window.baseMethods = { lib: { element: { player: { $init(character, character2) { this.name = character; this.classList.toggle('fullskin2', !!character2); } } } } };
        }, { style, base });
        await page.evaluate(async base => { await (await import(base + 'src/core/decadeModule.js')).initDecadeModule(); }, base);
        await page.addScriptTag({ content: source('src/utils/element.js', 'window.element=n;') });
        await page.addScriptTag({ content: source('src/ui/player-element.js', 'window.createPlayerElement=i;') });
        await page.addScriptTag({ content: source('src/ui/player-init.js', 'window.playerInit=i(baseMethods);') });
        await page.addScriptTag({ content: source('src/overrides/player/state.js', 'window.playerUninit=o;') });
        await page.waitForLoadState('networkidle');
        const result = await page.evaluate(async () => {
          const problems = [];
          let checks = 0;
          function check(player, empty, label) {
            checks++;
            if (player.classList.contains('decade-uninitialized') !== empty) problems.push(`${label}: wrong state`);
            if (empty) {
              const visible = [...player.children].filter(node => getComputedStyle(node).display !== 'none');
              if (visible.length) problems.push(`${label}: visible ${visible.map(node => node.className).join(',')}`);
              const css = getComputedStyle(player);
              if (css.display === 'none' || css.visibility === 'hidden' || css.backgroundImage === 'none') problems.push(`${label}: missing base`);
              if (lib.config.extension_十周年UI_newDecadeStyle === 'off' && !css.backgroundImage.includes(ui.arena.dataset.mode === 'guozhan' ? 'bj2.png' : 'bj1.png')) problems.push(`${label}: missing shousha base image`);
            } else if (getComputedStyle(player.node.hpWrap).display === 'none' || getComputedStyle(player.node.identity).display === 'none') {
              problems.push(`${label}: initialized UI still hidden`);
            }
          }
          for (const mode of ['identity', 'guozhan']) {
            lib.config.mode = mode;
            ui.arena.dataset.mode = mode;
            _status.mode = null;
            for (const position of ['0', '1']) {
              for (const double of [false, true]) {
                const player = createPlayerElement(ui.arena, true);
                player.stopDynamic = player.decadeUI_updateShowCards = player.checkAndAddExperienceSuffix = () => {};
                player.init = playerInit;
                player.uninit = playerUninit;
                player.dataset.position = position;
                if (position === '0') game.me = player;
                const label = `${mode}/${position}/${double ? 'double' : 'single'}`;
                check(player, true, `${label}/created`);
                player.init('liubei', double ? 'guanyu' : undefined);
                check(player, false, `${label}/init`);
                player.classList.add('unseen');
                if (double) player.classList.add('unseen2');
                check(player, false, `${label}/hidden-general`);
                player.uninit();
                check(player, true, `${label}/uninit`);
                const extra = document.createElement('div');
                extra.className = 'extra-extension-node';
                player.appendChild(extra);
                check(player, true, `${label}/late-node`);
                player.init('caocao', double ? 'zhangliao' : undefined);
                check(player, false, `${label}/reinit`);
                player.uninit();
                player.remove();
              }
            }
          }
          return { checks, problems };
        });
        assert.deepEqual(result.problems, [], `${style}: placeholder regression`);
        assert.deepEqual(errors, [], `${style}: page errors`);
        console.log(`${style}: PASS (${result.checks} lifecycle/visibility checks)`);
      } catch (error) {
        failures.push(`${style}: ${error.stack}`);
        console.error(failures.at(-1));
      } finally {
        await page.close();
      }
    }
    assert.equal(failures.length, 0, `${failures.length} styles failed`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
