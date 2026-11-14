const fs = require('node:fs');
const path = require('node:path');
const { server, chromium, assert } = require('../../雷的ol/verification/card-beautify-browser.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(origin + '/__card_verification__');
    for (const file of ['layout/default/layout.css', 'layout/long2/layout.css', 'extension/十周年UI/src/styles/player3.css', 'extension/十周年UI/src/styles/layout.css']) {
      await page.addStyleTag({ url: origin + '/' + file });
    }
    await page.evaluate(() => {
      document.body.dataset.style = 'othersOff';
      document.body.innerHTML = '<div id="arena" class="decadeUI" data-border-level="five" data-border-style="xinsha"></div>';
      const arena = document.querySelector('#arena');
      for (let index = 0; index < 5; index++) {
        const player = document.createElement('div');
        player.className = 'player'; player.dataset.borderLevel = ['one', 'two', 'three', 'four', 'five'][index];
        player.style.cssText = `left:${130 + index * 190}px;top:220px;bottom:auto`;
        player.innerHTML = '<div class="camp-wrap"><div class="camp-back"></div><div class="camp-border"></div></div>';
        arena.append(player);
      }
      window.mask = player => {
        const border = player.querySelector('.camp-border');
        const style = getComputedStyle(border, '::after');
        return { content: style.content, image: style.backgroundImage, filter: style.filter, pointerEvents: style.pointerEvents, width: style.width, height: style.height };
      };
    });
    const results = [];
    const styles = ['xinsha', 'dragon2', 'dragon3', 'dragon4'];
    const names = ['SF_paiju_jie_zuowei5_play2_dynamic', 'sgs_paiju_heilongkuang_play_dynamic', 'sgs_paiju_jinlongkuang_play_dynamic', 'sgs_paiju_laolongkuang_play_dynamic'];
    for (const [index, style] of styles.entries()) {
      const result = await page.evaluate(async ({ style, name }) => {
        const arena = document.querySelector('#arena'); arena.dataset.borderStyle = style;
        const players = [...arena.children];
        const levels = players.map(mask);
        const image = new Image(); image.src = levels[4].image.match(/url\("?([^"\)]+)/)[1]; await image.decode();
        arena.dataset.borderLevel = 'random';
        const random = players.map(mask);
        arena.dataset.borderLevel = 'five'; delete players[4].dataset.borderLevel;
        const inherited = mask(players[4]); players[4].dataset.borderLevel = 'five';
        arena.dataset.borderLevel = 'random';
        return { style, name, levels, random, inherited, image: [image.naturalWidth, image.naturalHeight] };
      }, { style, name: names[index] });
      for (const values of [result.levels, result.random]) {
        assert(values.slice(0, 4).every(item => item.content === 'none'), `${style}: low levels hidden`);
        assert.equal(values[4].content, '""');
        assert(values[4].image.includes(names[index]));
        assert.equal(values[4].pointerEvents, 'none');
      }
      assert.equal(result.inherited.content, '""');
      assert(result.image.every(value => value > 0));
      const border = page.locator('.player').last().locator('.camp-border');
      await page.waitForTimeout(150);
      const first = await border.screenshot();
      await page.waitForTimeout(550);
      const second = await border.screenshot();
      assert(!first.equals(second), `${style}: APNG must animate`);
      result.animated = true;
      await page.screenshot({ path: path.join(__dirname, `dragon-frame-mask-${style}.png`) });
      results.push(result);
    }
    for (const style of ['on', 'off', 'onlineUI', 'babysha', 'codename']) {
      const content = await page.evaluate(style => { document.body.dataset.style = style; return mask(document.querySelector('.player:last-child')).content; }, style);
      assert.equal(content, 'none', `${style}: no mask`);
    }
    // 原样式引用的一阶底图已经缺失；新增动态素材不得出现加载错误。
    const knownMissingAsset = errors.filter(error => error.endsWith('/image/styles/xinsha/new_border_camp1.png'));
    assert.deepEqual(errors.filter(error => !knownMissingAsset.includes(error)), []);
    fs.writeFileSync(path.join(__dirname, 'dragon-frame-mask-results.json'), JSON.stringify({ results, otherStylesIsolated: true, knownMissingAsset, unexpectedErrors: [] }, null, 2));
    console.log('PASS: four animated masks; levels 1–4 hidden; fixed/random/inherited levels; other UI styles isolated. Existing missing asset: new_border_camp1.png (404).');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
