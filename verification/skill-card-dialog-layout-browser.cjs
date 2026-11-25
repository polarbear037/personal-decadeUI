// 真实 chooseButton 创建、选牌和确认；覆盖旧底图、新底图及其他风格隔离。
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const opening = process.argv.includes('--opening');
const baseline = process.argv.includes('--baseline');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = { cases: [], transitions: [], errors: [] };
  try {
    for (const [style, loading] of [['othersOff', 'othersOff'], ['othersOff', 'dialog_xinsha'], ['onlineUI', 'dialog_ol'], ['on', 'othersOff']]) {
      console.log('START', style, loading);
      Object.assign(seed, { mode: 'identity', characters: ['standard', 'xianding'], cards: ['standard', 'extra'], touchscreen: false,
        extension_十周年UI_newDecadeStyle: style, extension_十周年UI_loadingStyle: loading, extension_十周年UI_optimizePrompt: 'online' });
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
      page.on('pageerror', error => { results.errors.push(error.message); console.error('PAGEERROR', error.message); });
      page.on('dialog', dialog => dialog.accept());
      await dependencies(page);
      // 本机这四份已是带 __require 出口的 ESM，保留原文件，避免夹具重复包装。
      for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js', 'stackframe@1.3.4/node_modules/stackframe/stackframe.js',
        'error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js', 'stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js']) {
        const source = fs.readFileSync(path.resolve(__dirname, '../../../node_modules/.pnpm', file), 'utf8');
        if (/as __require/.test(source)) await page.unroute('**/node_modules/.pnpm/' + file);
      }
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 }).catch(async error => {
        console.error('STARTUP', await page.locator('body').innerText()); throw error;
      });
      await page.evaluate(async opening => {
        const { game, lib, ui, _status } = await import('/noname.js');
        game.pause(); game.resume = () => {};
        game.me = game.players[0]; game.me.init('sunquan');
        _status.auto = false; _status.over = false;
        lib.config.auto_confirm = false;
        document.querySelector('.decade-welcome-overlay')?.remove();
        ui.arena.classList.remove('choose-character');
        window.verifyOpening = opening;
        for (const dialog of [...ui.dialogs]) dialog.close();
      }, opening);
      for (const zoom of [1, 1.5]) for (const [skill, prompt, expected] of [
        ['dcxialei', '霞泪：获得其中的一张牌', '霞泪'],
        ['zhiheng', '请选择一张牌', '制衡'],
      ]) {
        const out = await page.evaluate(async ({ zoom, skill, prompt, expected }) => {
          const { game, lib, ui, _status } = await import('/noname.js');
          const { Content } = await import('/noname/library/element/content.js');
          game.uncheck();
          for (const dialog of [...ui.dialogs]) dialog.close();
          for (const control of [...ui.controls]) control.close();
          game.documentZoom = zoom; document.body.style.zoom = zoom;
          // 缩放设置自身会异步重算全局牌面 zoom；本用例测弹窗打开，而非设置切换。
          await new Promise(resolve => setTimeout(resolve, 180));
          const parent = game.createEvent(skill, false); parent.player = game.me;
          const cards = [game.createCard('sha', 'spade', 7), game.createCard('shan', 'heart', 2), game.createCard('tao', 'diamond', 3)];
          const event = game.me.chooseButton([prompt, cards], true);
          event.parent = parent; _status.eventManager.setStatusEvent(event, true);
          let bar;
          if (lib.config.extension_十周年UI_newDecadeStyle === 'othersOff') {
            bar = document.createElement('div'); bar.dataset.yjcmProgress = '4';
            bar.innerHTML = '<div style="width:73%;height:100%"><img src="/extension/十周年UI/image/ui/progress/xinsha/xf_newTimeBar_2.png"></div>';
            document.body.append(bar);
          }
          await Content.chooseButton[0](event, null, game.me);
          const dialog = event.dialog, buttons = [...dialog.buttons], links = buttons.map(b => b.link);
          const openingFrames = [];
          if (window.verifyOpening && lib.config.extension_十周年UI_newDecadeStyle === 'othersOff') {
            const start = performance.now();
            do {
              const copy = [...document.querySelectorAll('.dialog-xinsha-prompt-overlay')].find(n => n.textContent.trim());
              openingFrames.push({ time: performance.now() - start, height: parseFloat(getComputedStyle(dialog).height),
                tipY: copy?.getBoundingClientRect().top, barY: bar?.getBoundingClientRect().top,
                controlsY: ui.control.getBoundingClientRect().top, scale: getComputedStyle(dialog).scale });
              await new Promise(requestAnimationFrame);
            } while (performance.now() - start < 650);
          }
          await document.fonts.ready;
          await new Promise(resolve => setTimeout(resolve, 750));
          ui.update();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const rect = node => node && JSON.parse(JSON.stringify(node.getBoundingClientRect()));
          const footer = dialog.querySelector('.dialog-ol-footer');
          const tip = [...document.querySelectorAll('.dialog-xinsha-prompt-overlay')].find(n => n.textContent.trim());
          const out = { style: lib.config.extension_十周年UI_newDecadeStyle, loading: ui.arena.dataset.loadingStyle, zoom, skill,
            title: dialog.content.firstElementChild.textContent, footer: footer?.textContent, frame: rect(dialog),
            titleRect: rect(dialog.content.firstElementChild), cards: buttons.map(rect), tip: rect(tip), controls: rect(ui.control),
            image: getComputedStyle(dialog, '::before').borderImageSource, titleImage: getComputedStyle(dialog.content.firstElementChild).backgroundImage,
            scale: Math.min(ui.window.getBoundingClientRect().width / 1334, ui.window.getBoundingClientRect().height / 750), progress: rect(bar),
            marker: dialog.classList.contains('dialog-xinsha-layout'), openingFrames };
          if (out.style === 'othersOff') {
            // 整窗移动后，提示与条必须同向等距移动；换行只向上增长正文。
            const stable = () => new Promise(resolve => setTimeout(resolve, 150));
            dialog.style.setProperty('--dialog-ol-anchor-bottom', '40%', 'important'); ui.update(); await stable();
            out.moved = { tip: rect(tip), progress: rect(bar) };
            dialog.style.removeProperty('--dialog-ol-anchor-bottom'); ui.update(); await stable();
            const beforeWrap = { tip: rect(tip), progress: rect(bar) };
            footer.innerHTML += '<br>额外的独立条件'; ui.update(); await stable();
            out.wrapGap = rect(bar).top - rect(tip).bottom;
            out.baseGap = beforeWrap.progress.top - beforeWrap.tip.bottom;
            footer.textContent = out.footer; ui.update(); await stable();
            const hide = ui.window.querySelector('.dialog-xinsha-hide');
            hide.click(); out.hidden = dialog.classList.contains('hidden');
            ui.window.querySelector('.dialog-xinsha-restore').click();
            out.restored = !dialog.classList.contains('hidden') && dialog.content.firstElementChild.textContent === expected;
          }
          out.sameButtons = buttons.every((b, i) => dialog.buttons[i] === b && b.link === links[i]);
          _status.clicked = false; ui.click.button.call(buttons[0]);
          out.selected = ui.selected.buttons.includes(buttons[0]);
          ui.click.ok();
          out.confirmed = event.result?.bool && event.result.links?.[0] === links[0];
          dialog.close();
          await new Promise(resolve => setTimeout(resolve, 750));
          out.cleaned = !document.querySelector('.dialog-xinsha-prompt-overlay');
          bar?.remove();
          return out;
        }, { zoom, skill, prompt, expected });
        if (style === 'othersOff') {
          if (opening) {
            out.openingDrift = Object.fromEntries(['height', 'tipY', 'barY', 'controlsY'].map(key => {
              const values = out.openingFrames.map(f => f[key]).filter(Number.isFinite);
              return [key, Math.max(...values) - Math.min(...values)];
            }));
            if (!baseline) assert.ok(Object.values(out.openingDrift).every(v => v < .2), JSON.stringify({ drift: out.openingDrift, frames: out.openingFrames.filter((f,i)=>i===0||i===out.openingFrames.length-1||Math.abs(f.height-out.openingFrames[i-1].height)>1) }));
          }
          assert.equal(out.title, expected);
          assert.equal(out.footer, skill === 'dcxialei' ? '获得其中的一张牌' : prompt);
          assert.ok(out.image.includes('dialog_xinsha.png'));
          assert.ok(out.titleImage.includes('dialog_xinsha_title.png'));
          assert.ok(Math.abs(out.titleRect.width / out.scale - 295) < .2, JSON.stringify(out));
          assert.ok(Math.abs(out.titleRect.height / out.scale - 37) < .2, JSON.stringify(out));
          assert.ok(Math.abs((out.titleRect.top + out.titleRect.height / 2 - out.frame.top) / out.scale - 20) < .2, JSON.stringify(out));
          assert.ok(out.titleRect.top < out.frame.top + 20 * out.scale && out.titleRect.bottom > out.frame.top + 20 * out.scale);
          assert.ok(out.titleRect.bottom <= Math.min(...out.cards.map(r => r.top)), JSON.stringify(out));
          assert.ok(Math.max(...out.cards.map(r => r.bottom)) <= out.tip.top, JSON.stringify(out));
          assert.ok(Math.abs((out.progress.top - out.tip.bottom) / out.scale - 7) < .2, JSON.stringify(out));
          assert.ok(out.progress.bottom <= out.controls.top, JSON.stringify(out));
          assert.ok(Math.abs(out.moved.tip.top - out.tip.top - out.moved.progress.top + out.progress.top) < .2, JSON.stringify(out));
          assert.ok(Math.abs(out.wrapGap - out.baseGap) < .2, JSON.stringify(out));
          assert.ok(out.controls.bottom <= out.frame.bottom + 1, JSON.stringify(out));
          assert.ok(out.hidden && out.restored && out.marker, JSON.stringify(out));
        } else assert.equal(out.marker, false);
        assert.ok(out.sameButtons && out.selected && out.confirmed && out.cleaned, JSON.stringify(out));
        results.cases.push(out);
      }
      if (style === 'othersOff') {
        const transitions = await page.evaluate(async () => {
          const { game, lib, ui, _status } = await import('/noname.js');
          const { Content } = await import('/noname/library/element/content.js');
          const actions = await import('/extension/十周年UI/src/ui/xinsha-action-buttons.js');
          const nextFrame = () => new Promise(requestAnimationFrame);
          const painted = node => {
            if (!node?.isConnected || node.hidden) return false;
            for (let n = node; n?.nodeType === 1; n = n.parentElement) {
              const s = getComputedStyle(n);
              if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < .001) return false;
            }
            return node.getBoundingClientRect().height > 0;
          };
          const parent = game.createEvent('dcxialei', false); parent.player = game.me;
          const cards = [game.createCard('sha', 'heart', 7), game.createCard('shan', 'heart', 2), game.createCard('tao', 'diamond', 3)];
          const first = game.me.chooseButton(['霞泪：获得其中的一张牌', cards], true);
          first.parent = parent; _status.eventManager.setStatusEvent(first, true);
          await Content.chooseButton[0](first, null, game.me);
          await new Promise(r => setTimeout(r, 300));
          _status.clicked = false; ui.click.button.call(first.dialog.buttons[0]); ui.click.ok();
          first.dialog.close();
          const retained = first.dialog.isConnected;
          const second = game.me.chooseBool(); second.parent = parent;
          second.createDialog = ['是否将剩余牌置于牌堆底？', cards.slice(1)];
          _status.eventManager.setStatusEvent(second, true);
          const pause = game.pause; let release;
          game.pause = () => new Promise(resolve => { release = resolve; });
          const task = Content.chooseBool(second, null, game.me);
          const frames = [], start = performance.now();
          do {
            const prompts = [...document.querySelectorAll('.dialog-ol-footer,.dialog-xinsha-prompt-overlay,#arena > .hand-tip')].filter(painted);
            const copy = prompts.find(n => n.classList.contains('dialog-xinsha-prompt-overlay'));
            frames.push({ time: performance.now() - start, prompts: prompts.map(n => n.textContent.trim()),
              y: copy?.getBoundingClientRect().top, height: parseFloat(getComputedStyle(second.dialog).height),
              controls: ui.control.getBoundingClientRect().top, flow: ui.control.dataset.xinshaAction });
            await nextFrame();
          } while (performance.now() - start < 700);
          ui.click.cancel(); release(); await task; game.pause = pause;
          await new Promise(r => setTimeout(r, 720));
          // 调用真实五谷美化的单击处理；event.dialog 使用原生 videoId 入口。
          const { decorateWugu } = await import('/extension/雷的一将/utils/tableBeautify.js');
          const wugu = ui.create.dialog('五谷丰登', cards, 'hidden'); wugu.videoId = lib.status.videoId++;
          decorateWugu(wugu); wugu.open();
          const pick = game.me.chooseButton(true); pick.dialog = wugu.videoId; pick.closeDialog = false; pick.dialogdisplay = true;
          _status.eventManager.setStatusEvent(pick, true);
          await Content.chooseButton[0](pick, null, game.me);
          const confirmFrames = [], pickStart = performance.now();
          do { confirmFrames.push({ visible: painted(ui.confirm), display: getComputedStyle(ui.confirm).display }); await nextFrame(); }
          while (performance.now() - pickStart < 600);
          const chosen = wugu.buttons[0].link;
          _status.clicked = false; wugu.buttons[0].click();
          const selected = pick.result?.bool && pick.result.links?.[0] === chosen;
          wugu.close();
          const ordinary = game.me.chooseButton(['制衡：请选择一张牌', cards], true);
          ordinary.parent = game.createEvent('zhiheng', false); _status.eventManager.setStatusEvent(ordinary, true);
          await Content.chooseButton[0](ordinary, null, game.me); actions.syncXinshaActionButtons();
          const restored = getComputedStyle(ui.confirm).display !== 'none' && !ui.confirm.classList.contains('xinsha-direct-choice-confirm');
          ordinary.dialog.close();
          await new Promise(r => setTimeout(r, 720));
          return { loading: ui.arena.dataset.loadingStyle, retained, frames, confirmFrames, selected, restored,
            cleaned: !document.querySelector('.dialog-xinsha-prompt-overlay') };
        });
        assert.ok(transitions.retained, '选择退场动画仍保留旧卡牌');
        const diagnostic = JSON.stringify({ ...transitions, frames: [transitions.frames[0], transitions.frames[1], transitions.frames.at(-1)], confirmFrames: transitions.confirmFrames.slice(0, 2) });
        assert.ok(transitions.frames.every(f => f.prompts.length === 1 && f.prompts[0] === '是否将剩余牌置于牌堆底？'), diagnostic);
        for (const key of ['y', 'height', 'controls']) {
          const values = transitions.frames.map(f => f[key]);
          assert.ok(Math.max(...values) - Math.min(...values) < .2, diagnostic);
        }
        assert.ok(transitions.frames.every(f => f.flow === 'window'), JSON.stringify(transitions));
        assert.ok(transitions.confirmFrames.every(f => !f.visible && f.display === 'none'), JSON.stringify(transitions));
        assert.ok(transitions.selected && transitions.restored && transitions.cleaned, JSON.stringify(transitions));
        results.transitions.push(transitions);
      }
      await page.close();
    }
    assert.deepEqual(results.errors, []);
    if (baseline) assert.ok(results.cases.some(c => c.openingDrift && Object.values(c.openingDrift).some(v => v > 1)), 'Opening movement not reproduced');
    fs.writeFileSync(path.join(__dirname, opening ? `skill-card-dialog-opening-${baseline ? 'before' : 'after'}-results.json` : 'skill-card-dialog-layout-results.json'), JSON.stringify(results, null, 2) + '\n');
    if (opening) console.log(JSON.stringify(results.cases.filter(c => c.openingDrift).map(c => ({ loading: c.loading, zoom: c.zoom, skill: c.skill, drift: c.openingDrift }))));
    console.log(`skill-card-dialog-layout-browser: PASS ${results.cases.length} scenes + ${results.transitions.length} rapid-dialog/Wugu flows; native choices, first-frame geometry, one painted prompt, confirmation visibility, cleanup and style isolation`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
