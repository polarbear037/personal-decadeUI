// 真实本体三种选牌入口 + 雷的一将分区布局，只读关联扩展。
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = { cases: [], errors: [] };
  try {
    for (const loading of ['othersOff', 'dialog_xinsha']) {
      Object.assign(seed, { mode: 'identity', characters: ['standard', 'xianding'], cards: ['standard', 'extra'], touchscreen: false,
        extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_loadingStyle: loading,
        extension_十周年UI_optimizePrompt: 'online', choose_all_button: true, unauto_choose: true });
      const page = await browser.newPage({ viewport: { width: 2052, height: 919 } });
      page.on('pageerror', e => results.errors.push(e.message));
      page.on('dialog', d => d.accept());
      await dependencies(page);
      for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js', 'stackframe@1.3.4/node_modules/stackframe/stackframe.js',
        'error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js', 'stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js']) {
        if (/as __require/.test(fs.readFileSync(path.resolve(__dirname, '../../../node_modules/.pnpm', file), 'utf8'))) await page.unroute('**/node_modules/.pnpm/' + file);
      }
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      await page.evaluate(async () => {
        const { game, lib, ui, _status } = await import('/noname.js');
        const { installShunchaiBeautify } = await import('/extension/雷的一将/utils/shunchaiBeautify.js');
        game.pause(); game.resume = () => {};
        game.me = game.players[0]; game.me.init('sunquan'); game.players[1].init('caocao');
        _status.auto = false; _status.over = false; lib.config.auto_confirm = false;
        document.querySelector('.decade-welcome-overlay')?.remove(); ui.arena.classList.remove('choose-character');
        for (const d of [...ui.dialogs]) d.close(); for (const c of [...ui.controls]) c.close();
        installShunchaiBeautify();
        const target = game.players[1];
        for (const area of [target.node.handcards1, target.node.handcards2, target.node.equips, target.node.judges]) area.replaceChildren();
        for (const name of ['sha', 'shan', 'tao', 'wuxie']) target.node.handcards1.append(game.createCard(name));
        target.node.equips.append(game.createCard('bagua')); target.node.judges.append(game.createCard('lebu'));
        await document.fonts.ready;
      });
      for (const zoom of [1, 1.5288461538461537]) for (const [name, position, range] of [
        ['choosePlayerCard', 'h', [1, 2]], ['choosePlayerCard', 'ej', [1, 2]], ['choosePlayerCard', 'hej', [1, 2]],
        ['choosePlayerCard', 'hej', [1, 1]], ['gainPlayerCard', 'hej', [1, 1]], ['discardPlayerCard', 'hej', [1, 2]],
      ]) {
        const result = await page.evaluate(async ({ zoom, name, position, range }) => {
          const { game, lib, ui, _status } = await import('/noname.js');
          const { Content } = await import('/noname/library/element/content.js');
          game.documentZoom = zoom; document.body.style.zoom = zoom;
          await new Promise(r => setTimeout(r, 180));
          game.uncheck(); for (const c of [...ui.controls]) c.close();
          const skill = position === 'ej' ? 'zhiheng' : 'dcluochong';
          const parent = game.createEvent(skill, false); parent.player = game.me;
          const event = game.me[name](game.players[1], position, true, range);
          event.parent = parent; event.allowChooseAll = true; event.complexSelect = false; event.visible = true;
          event.prompt = '请选择目标区域内的牌';
          _status.eventManager.setStatusEvent(event, true);
          const bar = document.createElement('div'); bar.dataset.yjcmProgress = '4';
          bar.innerHTML = '<div style="width:73%;height:100%"><img src="/extension/十周年UI/image/ui/progress/xinsha/xf_newTimeBar_2.png"></div>';
          document.body.append(bar);
          await Content[name][0](event, null, game.me);
          const dialog = event.dialog, originalButtons = [...dialog.buttons];
          const frames = [], start = performance.now();
          do {
            const caption = dialog.querySelector('.caption');
            const tip = [...document.querySelectorAll('.dialog-xinsha-prompt-overlay')].find(n => n.textContent.trim());
            const root = dialog.getBoundingClientRect(), scale = root.width / 1696;
            const title = caption.getBoundingClientRect(), text = tip.getBoundingClientRect(), progress = bar.getBoundingClientRect();
            const actions = [...dialog.querySelectorAll('.lei-yijiang-sc-choice-controls > button')].filter(n => !n.hidden && n.getBoundingClientRect().height > 0);
            const native = getComputedStyle(ui.control).visibility !== 'hidden' && ui.control.children.length;
            const actionTop = actions.length ? Math.min(...actions.map(n => n.getBoundingClientRect().top)) : native ? ui.control.getBoundingClientRect().top : root.bottom;
            frames.push({ time: performance.now() - start, titleFirst: caption === dialog.content.firstElementChild,
              title: caption.textContent, titleCenter: (title.top + title.height / 2 - root.top) / scale,
              fontSize: getComputedStyle(caption).fontSize, gap: (progress.top - text.bottom) / scale,
              actionGap: (actionTop - progress.bottom) / scale, tipY: text.top, barY: progress.top,
              cardsBottom: Math.max(...[...dialog.querySelectorAll('.lei-yijiang-sc-cards')].map(n => n.getBoundingClientRect().bottom - parseFloat(getComputedStyle(n).paddingBottom) * scale)),
              chooseAll: !!event.buttonChooseAll });
            await new Promise(requestAnimationFrame);
          } while (performance.now() - start < 420);
          const chooseAll = event.buttonChooseAll, caption = dialog.querySelector('.caption');
          if (chooseAll) {
            // 再插入辅助控件，覆盖已显示窗口的检查与收起恢复。
            dialog.content.insertBefore(chooseAll, caption); game.check();
          }
          const repaired = dialog.content.firstElementChild === caption;
          dialog.hide(); dialog.open(); await new Promise(r => setTimeout(r, 80));
          const restored = !!document.querySelector('.dialog-xinsha-prompt-overlay') && caption.textContent === lib.translate[skill];
          _status.clicked = false; ui.click.button.call(dialog.buttons[0]);
          const selected = ui.selected.buttons.includes(dialog.buttons[0]);
          ui.click.ok();
          const confirmed = event.result?.bool && event.result.links?.[0] === originalButtons[0].link;
          const sameButtons = originalButtons.every((b, i) => b === dialog.buttons[i]);
          dialog.close(); bar.remove(); await new Promise(r => setTimeout(r, 720));
          return { loading: ui.arena.dataset.loadingStyle, zoom, name, position, range, skill, frames, repaired, restored, selected, confirmed, sameButtons,
            cleaned: !document.querySelector('.dialog-xinsha-prompt-overlay') };
        }, { zoom, name, position, range });
        const diagnostic = JSON.stringify({ ...result, frames: [result.frames[0], result.frames.at(-1)] });
        assert.ok(result.frames.every(f => f.titleFirst && f.fontSize === '32px' && Math.abs(f.titleCenter - 20) < .1), diagnostic);
        assert.ok(result.frames.every(f => Math.abs(f.gap - 7) < .1 && f.actionGap > 1 && f.tipY >= f.cardsBottom - 1), diagnostic);
        if (range[1] > 1) assert.ok(result.frames.every(f => f.chooseAll), diagnostic);
        for (const key of ['tipY', 'barY']) assert.ok(Math.max(...result.frames.map(f => f[key])) - Math.min(...result.frames.map(f => f[key])) < .2, diagnostic);
        assert.ok(result.repaired && result.restored && result.selected && result.confirmed && result.sameButtons && result.cleaned, diagnostic);
        results.cases.push(result);
      }
      await page.close();
    }
    assert.deepEqual(results.errors, []);
    fs.writeFileSync(path.join(__dirname, 'player-card-dialog-layout-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(`PLAYER_CARD_DIALOG_LAYOUT_OK ${results.cases.length} native scenes; title, real choose-all, visible actions, prompt/progress gap, restore, confirmation and cleanup`);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });
