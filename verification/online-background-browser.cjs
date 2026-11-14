const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const key = 'extension_十周年UI_onlineBackground';
const dir = path.resolve(__dirname, '..');
const source = require('./online-background-source.json');
const dirAssets = path.join(dir, source.assets.directory);
for (const [file, digest] of Object.entries({ ...source.assets.wallpaper_sha256_by_relative_path, ...Object.fromEntries(Object.entries(source.assets.ui).map(([f,v])=>[f,v.sha256])) })) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dirAssets,file))).digest('hex'), digest, file);
}
Object.assign(seed, { characters: ['standard'], cards: ['standard'], mode_config: { identity: { player_number: '2' } }, touchscreen: false });
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 570 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && message.text().includes('动态背景')) errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400 && response.url().includes('OL_line/background')) errors.push(response.status()+' '+response.url()); });
    const url = `http://127.0.0.1:${server.address().port}/player-tips-probe`;
    async function ready() {
      await page.goto(url);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      await page.evaluate(async () => {
        const { game, ui, lib, get, _status } = await import('/noname.js');
        Object.assign(window, { game, ui, lib, get, _status });
        game.pause();
        for (const dialog of [...ui.dialogs]) dialog.close();
        document.querySelector('.decade-welcome-overlay')?.remove();
        ui.arena.classList.remove('choose-character');
        game.me = game.players[0]; game.me.init('liubei');
        game.players[1].init('sunquan');
        game.resume2();
      });
    }
    async function open() {
      const rect = await page.evaluate(() => ui.caidanbutton.getBoundingClientRect().toJSON());
      await page.mouse.click(rect.x+rect.width/2, rect.y+rect.height/2);
      await page.locator('.online-game-menu-item[aria-label="背景"]').click();
      await page.getByRole('dialog', { name: '切换背景' }).waitFor();
    }
    const tile = name => page.locator('.online-wallpaper-tile').filter({hasText:name});
    const active = '.online-wallpaper-tile[aria-pressed="true"]';
    const checkbox = page.getByRole('checkbox', {name:'应用到所有模式'});
    await ready();
    await open();
    assert.equal(await page.locator('.online-wallpaper-tile').count(),26);
    assert.equal(await checkbox.isChecked(),true);
    await page.evaluate(() => document.fonts.ready);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    for (const [selector, weight] of [
      ['.online-wallpaper-tab', '700'],
      ['.online-wallpaper-name', '400'],
      ['.online-wallpaper-all > span', '400'],
    ]) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      const label = page.locator(selector).first();
      assert.deepEqual(fonts.map(font => [font.familyName, font.isCustomFont, font.glyphCount]), [
        ['FZLBGBK', true, (await label.textContent()).length],
      ], selector);
      assert.equal(await label.evaluate(node => getComputedStyle(node).fontWeight), weight, selector);
    }
    await cdp.detach();
    await tile('小雪荀采').click();
    await page.waitForFunction(() => ui.background.style.backgroundImage.includes('bg/xiaoxuexuncai.png'));
    await page.getByRole('button', {name:'关闭背景选择'}).click();
    await open();
    assert.equal(await page.locator(active).innerText(),'小雪荀采');
    assert.equal(await page.locator('.online-wallpaper-tile').first().innerText(),'小雪荀采');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const confirmUnderModal = await page.evaluate(() => {
      ui.create.confirm('o');
      const confirm = ui.confirm;
      const button = [...(confirm?.children ?? [])].find(node => node.getBoundingClientRect().width > 0);
      if (!button) return { passed:false, confirm:confirm?.outerHTML };
      const { x, y, width, height } = button.getBoundingClientRect();
      const hit = document.elementFromPoint(x+width/2, y+height/2);
      return { passed:!!hit?.closest('.online-wallpaper-overlay'), hit:hit?.outerHTML.slice(0,250), rect:[x,y,width,height] };
    });
    assert.equal(confirmUnderModal.passed,true,JSON.stringify(confirmUnderModal));
    if (process.env.DECADE_WALLPAPER_SCREENSHOT) await page.screenshot({path:process.env.DECADE_WALLPAPER_SCREENSHOT});
    const bounds = await page.locator('.online-wallpaper-list').boundingBox();
    await page.mouse.move(bounds.x + 150, bounds.y + 150);
    await page.mouse.wheel(0, 400);
    await page.waitForFunction(() => document.querySelector('.online-wallpaper-list').scrollTop > 0);
    await checkbox.uncheck();
    await page.getByRole('button',{name:'静态皮肤'}).click();
    assert.equal(await page.locator('.online-wallpaper-tile').count(),59);
    await page.locator('.online-wallpaper-tile').first().click();
    const snapshot = await page.evaluate(key => lib.config[key],key);
    assert.equal(snapshot.allModes,false);
    assert.match(snapshot.global,/xiaoxuexuncai/);
    assert.match(snapshot.modes.identity,/22104/);
    const modeBackgrounds = await page.evaluate(async () => {
      const {createOnlineBackgroundSelector} = await import('/extension/十周年UI/ui/lbtn/skins/online-background-selector.js');
      const selector = createOnlineBackgroundSelector(lib,game,ui,get,_status);
      const originalMode = lib.config.mode;
      let otherMode;
      try {
        lib.config.mode = 'doudizhu';
        selector.restore();
        otherMode = ui.background.style.backgroundImage;
      } finally {
        lib.config.mode = originalMode;
        selector.restore();
      }
      return [otherMode, ui.background.style.backgroundImage];
    });
    assert.match(modeBackgrounds[0],/xiaoxuexuncai/);
    assert.match(modeBackgrounds[1],/22104/);
    await page.getByRole('button',{name:'动态皮肤'}).click();
    assert.equal(await page.locator('.online-wallpaper-tile').count(),3);
    async function verifyAnimation(index, fullScene = false) {
      const row = page.locator('.online-wallpaper-tile').nth(index);
      const name = await row.innerText();
      await row.click();
      await page.waitForFunction(() => ui.background.querySelector('canvas')?.dataset.playing === 'true', null, { timeout:15000 }).catch(e => { throw new Error(name + ': ' + errors.join(' | ') + ' ' + e.message); });
      const pixels = await page.evaluate(async () => {
        const canvas = ui.background.querySelector('canvas');
        const out = document.createElement('canvas'); out.width = 80; out.height = 40;
        const ctx = out.getContext('2d');
        const frame = () => new Promise(resolve => requestAnimationFrame(() => {
          ctx.clearRect(0,0,80,40); ctx.drawImage(canvas,0,0,80,40);
          const bytes = ctx.getImageData(0,0,80,40).data;
          const opaque = Array.from(bytes).filter((value, index) => index % 4 === 3 && value >= 240).length;
          resolve([bytes.some((v,i)=>i%4===3 && v>0),out.toDataURL(),opaque / (out.width * out.height)]);
        }));
        const before = await frame();
        await new Promise(r=>setTimeout(r,350));
        const after = await frame();
        const rect = canvas.getBoundingClientRect();
        const host = ui.background.getBoundingClientRect();
        return {
          animated: [before[0],after[0],before[1]!==after[1]],
          opaque: Math.min(before[2], after[2]),
          canvas: [rect.x, rect.y, rect.width, rect.height],
          host: [host.x, host.y, host.width, host.height],
          background: ui.background.style.backgroundImage,
          filter: getComputedStyle(ui.background).filter,
          buffer: [canvas.width, canvas.height],
          resolution: [canvas.clientWidth, canvas.clientHeight].map(value => Math.round(value * devicePixelRatio)),
        };
      });
      assert.deepEqual(pixels.animated,[true,true,true],name);
      assert.deepEqual(pixels.canvas,pixels.host,name);
      assert.deepEqual(pixels.buffer,pixels.resolution,name);
      if (fullScene) {
        assert.ok(pixels.opaque > 0.95, `${name}: opaque coverage ${pixels.opaque}`);
        assert.equal(pixels.background,'none',name);
        assert.equal(pixels.filter,'none',name);
      }
      console.log('Animated:',name);
    }
    await page.evaluate(() => { lib.config.image_background_blur = true; });
    for (let index=0; index<3; index++) await verifyAnimation(index, true);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForFunction(() => {
      const canvas = ui.background.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      return Math.abs(rect.left) < 2 && Math.abs(rect.top) < 2
        && Math.abs(rect.width - innerWidth) < 2 && Math.abs(rect.height - innerHeight) < 2
        && canvas.width === Math.round(canvas.clientWidth * devicePixelRatio)
        && canvas.height === Math.round(canvas.clientHeight * devicePixelRatio);
    });
    await page.setViewportSize({ width: 1280, height: 570 });
    await page.evaluate(() => { lib.config.image_background_blur = false; });
    await page.getByRole('button',{name:'主题背景'}).click();
    for (const kingdom of ['魏','蜀','吴','群']) {
      const rows = await page.locator('.online-wallpaper-tile').allTextContents();
      await verifyAnimation(rows.findIndex(name=>name.startsWith(kingdom+'势力')));
    }
    await checkbox.check();
    await tile('小雪荀采').click();
    assert.deepEqual((await page.evaluate(key=>lib.config[key],key)).modes,{});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.online-wallpaper-overlay').count(),0);
    assert.equal(await page.evaluate(()=>_status.paused2),false);
    await ready();
    await page.waitForFunction(() => ui.background.style.backgroundImage.includes('bg/xiaoxuexuncai.png'));
    seed.extension_十周年UI_newDecadeStyle = 'on';
    await ready();
    assert.equal(await page.evaluate(()=>ui.background.dataset.onlineWallpaper),undefined);
    await page.locator('img[src$="/CD/button3.png"]').click();
    await page.locator('.popup-container .BJ').click();
    await page.locator('.backgroundsbg').waitFor();
    assert.equal(await page.locator('.online-wallpaper-overlay').count(),0);
    assert.deepEqual(errors,[]);
    console.log('WALLPAPER_BROWSER_OK');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
