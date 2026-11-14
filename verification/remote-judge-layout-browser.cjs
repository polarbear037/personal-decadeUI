const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page, origin, true);
    await page.addStyleTag({ url: origin + '/layout/long2/layout.css' });
    await page.addStyleTag({ url: origin + '/extension/十周年UI/src/styles/player4.css' });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/online-judge-layout.js', 'window.syncOnlineJudgeLayout=syncOnlineJudgeLayout;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/ui/update.js', 'ui.updatej=s;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/player/card-movement-online.js', 'window.playerAddVirtualJudge=playerAddVirtualJudge;') });
    await page.evaluate(() => {
      lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI';
      document.body.dataset.style = 'onlineUI';
      ui.arena.dataset.newDecadeStyle = 'onlineUI';
      window.player = ui.create.div('.player', ui.arena);
      player.dataset.position = '1';
      player.style.cssText = 'position:absolute;left:500px;top:360px';
      player.node = { judges: ui.create.div('.judges', player) };
      window.decadeUI = {};
      game.broadcastAll = (fn, ...args) => fn(...args);
      for (const name of ['bingliang', 'shandian']) {
        lib.card[name] = { type: 'delay' }; lib.translate[name] = name;
      }
      window.addJudge = name => {
        const card = makeSample('lebu'); card.name = name;
        card.isCard = true;
        // 夹具未安装本体HTMLDivElement动画清理扩展；这里没有待清理的动画。
        card.fix = () => card;
        playerAddVirtualJudge.call(player, card, [card]); return card;
      };
      window.measure = () => [...player.node.judges.children].map(card => {
        const mark = card.node.judgeMark.node.judge, r = mark.getBoundingClientRect();
        const alpha = window.markAlpha?.[card.name];
        const drawWidth = r.width * .95;
        return { name: card.name, left: r.left, top: r.top, width: r.width,
          visibleLeft: alpha && r.left + (r.width - drawWidth) / 2 + alpha.left / alpha.width * drawWidth,
          visibleRight: alpha && r.left + (r.width - drawWidth) / 2 + alpha.right / alpha.width * drawWidth,
          visible: getComputedStyle(card).visibility !== 'hidden' && Number(getComputedStyle(card).opacity) > 0,
          background: getComputedStyle(mark).backgroundImage };
      });
    });
    // 动态图有透明留白，应核对实际alpha边界，不能要求45px承载矩形互不相交。
    await page.evaluate(async () => {
      window.markAlpha = {};
      for (const [name, file] of [['lebu', 'FX_LBSS'], ['bingliang', 'FX_BLCD'], ['shandian', 'FX_SD']]) {
        const image = new Image();
        image.src = `${lib.assetURL}extension/十周年UI/image/ui/judge-mark/${file}_icon_play_dynamic.png`;
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
        let left = image.width, right = 0;
        for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) if (pixels[(y * image.width + x) * 4 + 3] > 10) {
          left = Math.min(left, x); right = Math.max(right, x + 1);
        }
        markAlpha[name] = { left, right, width: image.width };
      }
    });
    const results = [];
    const check = async label => {
      const marks = await page.evaluate(() => measure());
      assert.ok(marks.every((r, i) => r.visible && (!i || r.visibleLeft > marks[i - 1].visibleRight)), `${label}: ${JSON.stringify(marks)}`);
      const gaps = marks.slice(1).map((r, i) => r.visibleLeft - marks[i].visibleRight);
      assert.ok(gaps.every(gap => gap >= 2 && gap <= 10), `图标可见间距不紧凑: ${JSON.stringify(gaps)}`);
      results.push({ label, count: marks.length, gaps });
      return marks;
    };
    for (const name of ['lebu', 'bingliang', 'shandian']) {
      await page.evaluate(name => addJudge(name), name);
      await page.waitForFunction(() => measure().every(mark => mark.background.includes('FX_')));
      await check(`连续贴入${name}`);
    }
    const three = await check('三牌并列');
    assert.deepEqual(three.map(mark => mark.name), ['shandian', 'bingliang', 'lebu']);
    assert.equal(three[1].left - three[0].left, 38);
    // 等图标解码后截图；背景绘制区域60px，但水平方向仍为45px。
    await page.evaluate(async () => {
      await Promise.all(measure().map(mark => new Promise((resolve, reject) => {
        const image = new Image(); image.onload = resolve; image.onerror = reject;
        image.src = mark.background.match(/url\("?(.*?)"?\)/)[1];
      })));
    });
    await page.screenshot({ path: path.join(__dirname, 'remote-judge-layout-browser.png') });
    await page.evaluate(() => { player.node.judges.children[1].remove(); ui.updatej(player); });
    const two = await check('移除中间牌后补位');
    assert.equal(two[1].left, three[2].left, '最右侧图标应保持原锚点');
    assert.equal(two[1].left - two[0].left, 38);
    await page.evaluate(() => { player.node.judges.replaceChildren(); ui.updatej(player); addJudge('lebu'); });
    await check('清空后重新贴牌');
    await page.evaluate(() => { addJudge('bingliang'); addJudge('shandian'); });
    for (const position of ['2', '4', '7', '8']) {
      await page.evaluate(position => { player.dataset.position = position; ui.updatej(player); }, position);
      await check(`座位${position}`);
    }
    // 主视角沿用原队列与箭头；切回其他座位不得留下主视角布局状态。
    await page.evaluate(() => { game.me = player; player.dataset.position = '0'; ui.updatej(player); });
    await page.waitForTimeout(350);
    const self = await page.evaluate(() => ({
      gap: getComputedStyle(player.node.judges).columnGap,
      layout: player.node.judges.dataset.onlineJudgeLayout,
      arrows: player.node.judges.querySelectorAll('.dui-judge-queue-arrow').length,
      x: [...player.node.judges.children].map(card => card.getBoundingClientRect().left),
    }));
    assert.equal(self.gap, 'normal'); assert.equal(self.layout, 'true'); assert.equal(self.arrows, 2);
    assert.equal(self.x[1] - self.x[0], 50);
    await page.evaluate(() => { game.me = null; player.dataset.position = '1'; ui.updatej(player); });
    await check('切回非主视角');
    assert.equal(await page.evaluate(() => player.node.judges.dataset.onlineJudgeLayout), undefined);
    await page.evaluate(() => {
      document.body.dataset.style = 'on'; lib.config.extension_十周年UI_newDecadeStyle = 'on'; ui.updatej(player);
    });
    assert.equal(await page.evaluate(() => getComputedStyle(player.node.judges).columnGap), 'normal', '其他风格不应新增间距');
    await page.waitForTimeout(100);
    assert.deepEqual(errors, []);
    console.log('REMOTE_JUDGE_LAYOUT_OK', JSON.stringify({ results, step: 38, self, errors }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
