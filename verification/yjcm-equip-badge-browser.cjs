// 真实 Card、装备入手 hooks、样式路由及雷的一将牌面服务；浏览器夹具，不是 Electron 实局。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const css = fs.readFileSync(path.join(__dirname, '../src/styles/card-xinsha.css'), 'utf8');
const badgeRules = css.slice(css.indexOf('/** 装备入手：'), css.indexOf('/** 卡名显示 */'));
const results = [];

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    for (const style of ['othersOff', 'onlineUI', 'on', 'off', 'babysha', 'codename']) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 500 } });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await bootstrap(page, origin, true);
      const files = await page.evaluate(async style => {
        for (const link of document.querySelectorAll('link[href*="/extension/"]')) link.remove();
        document.body.dataset.style = style;
        ui.arena.dataset.newDecadeStyle = style;
        lib.config.extension_十周年UI_newDecadeStyle = style;
        const { getStyleFile } = await import('/extension/十周年UI/src/styles/style-route.js');
        return ['card', 'meihua', 'equip'].map(name => '/extension/十周年UI/src/styles/' + getStyleFile(name, style));
      }, style);
      assert(files[0].endsWith(style === 'othersOff' ? 'card-xinsha.css' : style === 'onlineUI' ? 'card-online.css' : 'card.css'));
      for (const file of files) await page.addStyleTag({ url: origin + file });
      await page.addStyleTag({ content: '.handcopies{position:relative;display:flex;gap:30px;padding:40px}.handcopies>.card{position:relative;left:auto;top:auto;width:108px;height:150px;margin:0}' });
      await page.evaluate(() => {
        window.copyHooks = {};
        lib.hooks = Object.fromEntries(['checkBegin', 'checkCard', 'checkEnd', 'uncheckBegin'].map(key => [key, { add(fn) { (copyHooks[key] ||= []).push(fn); } }]));
        lib.config.extension_十周年UI_enableEquipCopy = true;
        lib.config.extension_十周年UI_aloneEquip = false;
        lib.suit = ['spade', 'heart', 'club', 'diamond'];
        Array.prototype.remove = function(value) { const i = this.indexOf(value); if (i >= 0) this.splice(i, 1); return this; };
        ui.selected = { cards: [] };
        ui.special = document.createElement('div'); ui.special.style.display = 'none'; document.body.append(ui.special);
        ui.updatehl = () => {};
        window.checkCalls = 0; game.check = () => checkCalls++;
        get.position = card => card.testPosition || 'h';
        window.hand = document.createElement('div'); hand.className = 'handcopies'; ui.arena.append(hand);
        window.equipped = []; window.copies = [];
        window.copyPlayer = {
          getCards(position, filter) { const cards = position === 'e' || position === 'he' ? equipped : position === 's' ? copies : []; return filter ? cards.filter(filter) : cards.slice(); },
          countCards() { return equipped.length; },
          directgains(cards, unused, tag) { for (const card of cards) {
            card.testPosition = 's'; card.addGaintag(tag); card.updateTransform = () => {};
            card.discard = function() { this.testPosition = 'd'; };
            card.delete = function() { this.remove(); copies = copies.filter(c => c !== this); };
            copies.push(card); hand.append(card);
          } }
        };
        game.me = copyPlayer;
        for (const suit of ['spade', 'heart']) { const card = makeSample('bagua', suit, 2, undefined, copyPlayer); card.testPosition = 'e'; card.cardid = 'equip-' + suit; equipped.push(card); }
        window.normal = makeSample('sha', 'club', 7, undefined, copyPlayer);
        window.makeChoice = () => ({ name: 'chooseCard', position: 'he', player: copyPlayer, selectCard: 1, backup() {}, restore() {} });
      });
      if (style === 'othersOff') {
        // 只读加载真实服务，不写入关联扩展。
        await page.evaluate(() => { window.getConfig = () => true; });
        const provider = script('extension/雷的一将/utils/cardBeautify.js', 'window.installCardBeautify=installCardBeautify;').replaceAll('import.meta.url', JSON.stringify(origin + '/extension/雷的一将/utils/cardBeautify.js'));
        await page.addScriptTag({ content: provider });
        await page.evaluate(async () => { await installCardBeautify(); });
      }
      await page.addScriptTag({ content: script('extension/十周年UI/src/features/equipCopy.js', 'window.setupEquipCopy=a;') });
      await page.evaluate(async () => { setupEquipCopy(); window.choice = makeChoice(); await copyHooks.checkBegin[0](choice); });
      assert.equal(await page.locator('.handcopies>.card>.equip-hand-equipped').count(), 2);
      if (style === 'othersOff') await page.waitForFunction(() => copies.every(card => card.classList.contains('lei-yijiang-card-ready')));
      await page.evaluate(async () => { await document.fonts.ready; });
      const measure = () => page.evaluate(() => copies.map(card => {
        const label = card.querySelector('.equip-hand-equipped'), s = getComputedStyle(label), r = label.getBoundingClientRect(), c = card.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(label); const text = range.getBoundingClientRect();
        return { text: label.textContent, background: s.backgroundImage, pointer: s.pointerEvents, display: s.display, font: s.fontFamily, fontSize: s.fontSize, color: s.color, stroke: s.webkitTextStrokeColor, strokeWidth: s.webkitTextStrokeWidth,
          left: (r.left - c.left) / c.width, bottom: (c.bottom - r.bottom) / c.height, width: r.width / c.width, height: r.height / c.height,
          textCenterX: (text.left + text.width / 2 - c.left) / c.width, textCenterBottom: (c.bottom - text.top - text.height / 2) / c.height,
          aboveFace: !card.querySelector('.lei-yijiang-card-face') || Number(s.zIndex) > Number(getComputedStyle(card.querySelector('.lei-yijiang-card-face')).zIndex) };
      }));
      const presentation = await measure();
      if (style === 'othersOff') {
        for (const p of presentation) {
          assert(p.background.includes('/xinsha/card_text_bg.png'));
          assert.equal(p.text, '已装备'); assert.equal(p.pointer, 'none'); assert(p.aboveFace);
          assert(Math.abs(p.left + 2 / 126) < .001); assert(Math.abs(p.width - 130 / 126) < .001);
          assert(Math.abs(p.height - 61 / 174) < .001); assert(Math.abs(p.bottom) < .001);
          assert(Math.abs(p.textCenterX - 61 / 126) < .002);
          assert(Math.abs(p.textCenterBottom - 28.5 / 174) < .002);
          assert(Math.abs(parseFloat(p.fontSize) - 22 * 108 / 126) < .01);
          assert.equal(p.color, 'rgb(255, 255, 255)'); assert.equal(p.stroke, 'rgb(63, 51, 24)');
        }
        const image = await page.evaluate(async () => { const img = new Image(); img.src = getComputedStyle(copies[0].querySelector('.equip-hand-equipped')).backgroundImage.slice(5, -2); await img.decode(); return [img.naturalWidth, img.naturalHeight]; });
        assert.deepEqual(image, [130, 61]);
        await page.screenshot({ path: path.join(__dirname, 'yjcm-equip-badge-browser.png') });
        // 手动缩放宿主，验证底图和文字随牌面一致缩放。
        await page.evaluate(() => { hand.style.transformOrigin = '0 0'; hand.style.transform = 'scale(.8)'; });
        const scaled = await measure();
        for (const p of scaled) { assert(Math.abs(p.left + 2 / 126) < .001); assert(Math.abs(p.width - 130 / 126) < .001); }
      } else {
        // 将新增规则额外送到其他分支，确认宿主限定阻止跨风格生效。
        await page.addStyleTag({ content: badgeRules });
        assert.deepEqual(await measure(), presentation, `${style} 被一将标记规则改变`);
      }
      assert(await page.evaluate(() => !normal.querySelector('.equip-hand-equipped') && !equipped.some(card => card.querySelector('.equip-hand-equipped'))));
      await page.evaluate(() => { copies[0].classList.add('selected'); copies[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      assert(await page.evaluate(() => copies[0].relatedCard.classList.contains('selected') && ui.selected.cards.includes(copies[0].relatedCard) && checkCalls === 1));
      await page.evaluate(async () => { window.chosen = copies[0].relatedCard; choice.result = { cards: [copies[0]] }; await copyHooks.uncheckBegin[0](choice, ['card']); });
      assert(await page.evaluate(() => copies.length === 0 && !hand.querySelector('.equip-hand-equipped') && choice.result.cards[0] === chosen && choice.position === 'he'));
      await page.evaluate(async () => { window.nextChoice = makeChoice(); await copyHooks.checkBegin[0](nextChoice); });
      assert.equal(await page.locator('.handcopies>.card>.equip-hand-equipped').count(), 2);
      await page.evaluate(async () => { nextChoice.result = { bool: false, cards: [] }; await copyHooks.uncheckBegin[0](nextChoice, ['card']); });
      assert.equal(await page.locator('.handcopies>.card>.equip-hand-equipped').count(), 0);
      await page.evaluate(async () => { lib.config.extension_十周年UI_enableEquipCopy = false; await copyHooks.checkBegin[0](makeChoice()); lib.config.extension_十周年UI_enableEquipCopy = true; lib.config.extension_十周年UI_aloneEquip = true; await copyHooks.checkBegin[0](makeChoice()); });
      assert.equal(await page.locator('.handcopies>.card').count(), 0);
      assert.deepEqual(errors, []);
      results.push({ style, files, presentation, selectionSync: true, resultOriginal: true, cleanup: true, reentry: true, cancel: true, disabledAndAlone: true, errors });
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'yjcm-equip-badge-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify({ styles: results.map(r => r.style), actualXinshaCardProvider: true, selectionAndCleanup: true, errors: [] }));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
