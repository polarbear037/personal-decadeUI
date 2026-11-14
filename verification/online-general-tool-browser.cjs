const assert = require('node:assert/strict');
const path = require('node:path');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');

Object.assign(seed, {
  characters: ['standard'], cards: ['standard'], right_info: true, longpress_info: true,
  mode_config: { identity: { player_number: '2' } },
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const touchscreen of [false, true]) {
      seed.touchscreen = touchscreen;
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: touchscreen, deviceScaleFactor: touchscreen ? 3 : 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400 && /general-tool|\/character\/online\.css/.test(response.url())) errors.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href?.includes('/styles/character/online.css')), null, { timeout: 5000 }).catch(async error => {
        const styles = await page.evaluate(() => [document.body.dataset.style, [...document.styleSheets].map(sheet => sheet.href).filter(href => href?.includes('character'))]);
        throw new Error(`${error.message}; character styles: ${JSON.stringify(styles)}; errors: ${JSON.stringify(errors)}`);
      });
      await page.evaluate(async () => {
        const { game, ui, lib, get, _status } = await import('/noname.js');
        Object.assign(window, { game, ui, lib, get, _status });
        game.pause();
        for (const dialog of [...(ui.dialogs || [])]) dialog.close();
        document.querySelector('.decade-welcome-overlay')?.remove();
        ui.arena.classList.remove('choose-character');
        game.me = game.players[0]; game.me.init('liubei');
        window.target = game.players[1]; target.init('sunquan', 'guanyu');
        lib.config.buttoncharacter_prefix = 'simple';
        lib.translate.sunquan = '界孙权';
        lib.translate.sunquan_prefix = '界';
        target.nickname = '测试玩家';
        target.classList.add('unseen2');
        target.node.avatar.id = 'general-tool-avatar';
        const description = lib.translate.zhiheng_info;
        lib.dynamicTranslate.zhiheng = () => description + '<br>动态技能说明。' + '测试长技能介绍滚动。'.repeat(60);
        game.resume2();
      });

      const avatar = page.locator('#general-tool-avatar');
      if (touchscreen) {
        const session = await page.context().newCDPSession(page);
        const rect = await avatar.boundingBox();
        const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await page.waitForTimeout(650);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      } else {
        await avatar.click({ button: 'right' });
      }

      const panel = page.locator('.online-general-tool');
      const list = panel.locator('.online-general-tool-list');
      await panel.waitFor({ timeout: 5000 });
      await page.evaluate(() => document.fonts.ready);
      const rates = panel.locator('.online-general-tool-rates span');
      const stats = await rates.allTextContents();
      assert.match(stats[0], /^\d{2,4}$/);
      assert(Number(stats[0]) >= 10 && Number(stats[0]) <= 9999);
      assert.match(stats[1], /^\d{2}\.\d%$/);
      assert(parseFloat(stats[1]) >= 30 && parseFloat(stats[1]) <= 70);
      assert.match(stats[2], /^\d{1,2}\.\d%$/);
      assert(parseFloat(stats[2]) >= 0 && parseFloat(stats[2]) <= 10);
      assert.equal(await panel.locator('.online-general-tool-name').textContent(), '界孙权');
      assert.equal(await panel.locator('.online-general-tool-health img').count(), 4);
      assert.match(await panel.innerText(), /武将信息/);
      assert.match(await list.innerText(), /制衡[\s\S]*动态技能说明/);
      assert.doesNotMatch(await list.innerText(), /武圣/);
      const layout = await panel.evaluate(node => {
        const dialog = node.firstElementChild;
        const skills = dialog.querySelector('.online-general-tool-list');
        const rect = dialog.getBoundingClientRect();
        const close = dialog.querySelector('.online-general-tool-close');
        const closeRect = close.getBoundingClientRect();
        const scale = rect.width / dialog.offsetWidth;
        const closeX = rect.left + 1160 * scale;
        const closeY = rect.top + 25 * scale;
        const hit = document.elementFromPoint(rect.left + rect.width * .57, rect.top + rect.height * .6);
        return {
          z: Number(getComputedStyle(node).zIndex), controlZ: Number(getComputedStyle(document.querySelector('#dui-controls')).zIndex),
          hit: node.contains(hit), background: getComputedStyle(dialog, '::before').backgroundImage,
          portrait: dialog.querySelector('.online-general-tool-artwork').style.backgroundImage,
          geometry: [dialog.offsetWidth, dialog.offsetHeight, skills.offsetLeft, skills.offsetTop, skills.clientWidth, skills.clientHeight],
          closeGeometry: [(closeRect.left - rect.left) / scale, (closeRect.top - rect.top) / scale, closeRect.width / scale, closeRect.height / scale],
          closeHit: document.elementFromPoint(closeX, closeY) === close,
          stats: [...dialog.querySelectorAll('.online-general-tool-rates span')].map(value => [value.offsetLeft, value.offsetTop, value.offsetWidth]),
          fonts: [...dialog.querySelectorAll('.online-general-tool-player, .online-general-tool-name, .online-general-tool-rates span, .xcaption, .online-general-tool-skill > header > span, .online-general-tool-skill > div')].map(node => getComputedStyle(node).fontFamily),
          fontLoaded: [...document.fonts].some(font => font.family === 'GeneralToolTitle' && font.status === 'loaded'),
        };
      });
      assert.deepEqual(layout.geometry, [1324, 600, 612, 80, 555, 482]);
      const expectedClose = [1142, 7.5, 36, 35];
      assert(layout.closeGeometry.every((value, index) => Math.abs(value - expectedClose[index]) < .05), `close bounds in design pixels: ${JSON.stringify(layout.closeGeometry)}`);
      assert.equal(layout.closeHit, true);
      assert.deepEqual(layout.stats, [[1, 91, 136], [138, 90, 152], [292, 91, 136]]);
      assert(layout.fontLoaded && layout.fonts.every(font => font.includes('GeneralToolTitle')), JSON.stringify(layout.fonts));
      assert.match(layout.background, /wnd_bg_medium\.png/);
      assert.match(layout.portrait, /sunquan/);
      assert.equal(layout.z, layout.controlZ + 1);
      assert.equal(layout.hit, true);
      if (!touchscreen) {
        const rect = await list.boundingBox();
        await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.mouse.wheel(0, 340);
        await page.waitForFunction(() => document.querySelector('.online-general-tool-list').scrollTop > 0);
      }

      const press = locator => touchscreen ? locator.tap() : locator.click();
      await press(panel.getByRole('button', { name: '切换主副将' }));
      assert.match(await list.innerText(), /武将暗置，暂不显示/);
      assert.doesNotMatch(await list.innerText(), /武圣|制衡/);
      assert.equal(await panel.locator('.online-general-tool-health img').count(), 0);
      assert.deepEqual(await rates.allTextContents(), stats);
      await page.evaluate(() => { delete lib.dynamicTranslate.zhiheng; });
      await press(panel.getByRole('button', { name: '切换主副将' }));
      assert.match(await list.innerText(), /制衡/);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const alignment = await panel.evaluate(node => {
        const frame = node.firstElementChild.getBoundingClientRect();
        const host = node.getBoundingClientRect();
        return { centerOffset: Math.abs(frame.left + frame.width / 2 - host.left - host.width / 2), scroll: [window.scrollX, window.scrollY, node.scrollLeft, node.scrollTop],
          viewportOffset: Math.abs(frame.left + frame.width / 2 - window.innerWidth / 2),
          ancestors: [node, node.parentElement, document.body, document.documentElement].map(element => [element.id, element.scrollLeft, element.getBoundingClientRect().left]),
        };
      });
      assert(alignment.centerOffset < 1, JSON.stringify(alignment));
      assert(alignment.viewportOffset < 1, JSON.stringify(alignment));
      assert.deepEqual(alignment.scroll, [0, 0, 0, 0]);
      if (!touchscreen && process.argv.includes('--screenshot')) {
        await page.screenshot({ path: path.join(__dirname, 'online-general-tool-desktop.png') });
      }
      await press(panel.getByRole('button', { name: '关闭武将信息' }));
      assert.equal(await panel.count(), 0);
      assert.equal(await page.evaluate(() => !!_status.paused2), false);
      if (!touchscreen) {
        await avatar.click({ button: 'right' });
        await panel.waitFor();
        assert.deepEqual(await rates.allTextContents(), stats);
        await press(panel.getByRole('button', { name: '关闭武将信息' }));
      }

      await page.evaluate(() => {
        lib.skill.general_tool_mark = { intro: { markcount: 'expansion', content: () => '标记弹窗回归' } };
        lib.translate.general_tool_mark = '附属牌标记';
        game.me.$addToExpansion([game.createCard('sha', 'spade', 8)], false, ['general_tool_mark']);
        game.me.updateMark('general_tool_mark');
        const mark = game.me.marks.general_tool_mark;
        const controls = document.querySelector('#dui-controls');
        const rect = controls.getBoundingClientRect();
        ui.click.intro.call(mark, { clientX: rect.left + 100, clientY: rect.top + rect.height / 2 });
        window.markDialog = document.querySelector('.online-player-mark-intro');
        if (!markDialog) throw new Error('Online mark dialog was not classified');
        markDialog.style.left = `${controls.offsetLeft + 80}px`;
        markDialog.style.top = `${controls.offsetTop - 40}px`;
      });
      const mark = await page.evaluate(() => {
        const layer = markDialog.nextElementSibling;
        const controls = document.querySelector('#dui-controls');
        const point = document.createElement('button');
        point.style.cssText = 'position:absolute;left:120px;top:0;pointer-events:auto;';
        controls.append(point);
        const rect = point.getBoundingClientRect();
        const top = document.elementFromPoint(rect.x + 2, rect.y + 2);
        return { z: Number(getComputedStyle(markDialog).zIndex), controlZ: Number(getComputedStyle(controls).zIndex),
          hit: markDialog.contains(top), layer: getComputedStyle(layer).zIndex, text: markDialog.textContent };
      });
      assert.equal(mark.z, mark.controlZ + 1);
      assert.equal(mark.hit, true);
      assert.equal(Number(mark.layer), mark.controlZ);
      assert.match(mark.text, /标记弹窗回归/);
      assert.equal(await page.evaluate(() => {
        document.body.dataset.style = lib.config.extension_十周年UI_newDecadeStyle = 'on';
        return get.nodeintro(game.me.marks.general_tool_mark)?.classList.contains('online-player-mark-intro');
      }), false);
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('ONLINE_GENERAL_TOOL_BROWSER_OK desktop + touch; layout, font, stats, skills, hidden general, scrolling, close and mark stacking');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
