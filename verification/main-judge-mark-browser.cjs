const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page, origin, true);
    await page.addStyleTag({ url: origin + '/layout/long2/layout.css' });
    // 聚焦判定区；不加载各主题的武将选择光效。
    await page.addStyleTag({ content: '#arena>.player::before,#arena>.player::after{display:none!important}' });
    await page.addScriptTag({ content: script('extension/雷的ol/utils/cardBeautify.js', 'window.cardController=installCardBeautify({cardBeautify:"cardBack_3"});') });
    await page.evaluate(() => {
      ui.arena.dataset.newDecadeStyle = 'onlineUI';
      for (const position of ['0', '1']) {
        const player = ui.create.div('.player', ui.arena);
        player.dataset.position = position;
        player.style.cssText = `position:absolute;left:${position === '0' ? 800 : 400}px;top:360px`;
        ui.create.div('.judges', player);
      }
      window.judgeCard = makeSample('lebu', 'heart', 6);
      judgeCard.node.gaintag.textContent = '炁';
      for (const selector of ['.online-card-tag', '.huaren-owner-tag']) {
        ui.create.div(selector, judgeCard).textContent = '测试标签';
      }
      window.cardTags = () => [...judgeCard.querySelectorAll(':scope > :is(.gaintag, .online-card-tag, .huaren-owner-tag)')];
      judgeCard.node.judgeMark.node.judge.style.backgroundImage = `url("${lib.assetURL}extension/十周年UI/image/ui/judge-mark/lebu.png")`;
      window.normalHost = judgeCard.parentElement;
      document.querySelector('.player[data-position="0"]>.judges').append(judgeCard);
      window.visible = node => {
        for (let current = node; current; current = current.parentElement) {
          const style = getComputedStyle(current);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        }
        return true;
      };
    });
    await page.waitForFunction(() => judgeCard.querySelector('.lei-ol-card-face'));
    for (let style = 1; style <= 6; style++) {
      const link = await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/player${style}.css` });
      for (const state of ['', 'infohidden', 'infoflip', 'drawinghidden', 'blank', 'fakejudge', 'selected']) {
        const result = await page.evaluate(({ state, style }) => {
          judgeCard.classList.remove('infohidden', 'infoflip', 'drawinghidden', 'blank', 'fakejudge', 'selected');
          if (state) judgeCard.classList.add(state);
          const cardStyle = getComputedStyle(judgeCard);
          const leaks = [...judgeCard.children].filter(node => !node.classList.contains('judge-mark') && visible(node)).map(node => node.className);
          const pseudo = ['::before', '::after'].filter(part => {
            const css = getComputedStyle(judgeCard, part);
            return css.display !== 'none' && css.content !== 'none' && Number(css.opacity) !== 0;
          });
          const mark = judgeCard.node.judgeMark.node.judge, rect = mark.getBoundingClientRect();
          return { style, state, leaks, pseudo, background: cardStyle.backgroundImage, shadow: cardStyle.boxShadow,
            mark: visible(mark) && rect.width > 0 && rect.height > 0 };
        }, { state, style });
        assert.deepEqual(result.leaks, [], `卡面泄漏: ${JSON.stringify(result)}`);
        assert.deepEqual(result.pseudo, [], `卡背或选中框泄漏: ${JSON.stringify(result)}`);
        assert.equal(result.background, 'none');
        assert.equal(result.shadow, 'none');
        // 本体有意隐藏的牌（例如挂入动画尚未结束）不强行显示标记。
        if (!['infohidden', 'drawinghidden'].includes(state)) assert.equal(result.mark, true, `标记不可见: ${JSON.stringify(result)}`);
        results.push(result);
      }
      await link.evaluate(node => node.remove());
    }
    await page.addStyleTag({ url: origin + '/extension/十周年UI/src/styles/player4.css' });
    await page.evaluate(() => {
      judgeCard.classList.remove('selected');
      document.querySelector('.player[data-position="1"]>.judges').append(judgeCard);
    });
    assert.equal(await page.evaluate(() => visible(judgeCard.node.judgeMark.node.judge)), true, '其他座位的判定图标被误隐藏');
    assert.equal(await page.evaluate(() => visible(judgeCard.querySelector('.lei-ol-card-face'))), true, '其他视角被误隐藏');
    assert.deepEqual(await page.evaluate(() => cardTags().map(visible)), [false, false, false], '其他座位的判定图标泄漏卡牌标签');
    await page.evaluate(() => normalHost.append(judgeCard));
    assert.equal(await page.evaluate(() => visible(judgeCard.querySelector('.lei-ol-card-face'))), true, '移出判定区后卡面未恢复');
    assert.deepEqual(await page.evaluate(() => cardTags().map(visible)), [true, true, true], '移出判定区后卡牌标签未恢复');
    await page.evaluate(() => document.querySelector('.player[data-position="0"]>.judges').append(judgeCard));
    await page.screenshot({ path: path.join(__dirname, 'main-judge-mark-browser.png') });
    assert.deepEqual(errors, [], '浏览器错误');
    console.log('MAIN_JUDGE_MARK_OK', JSON.stringify({ cases: results.length, remoteAndReuse: true, errors }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
