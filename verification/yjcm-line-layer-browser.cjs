const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const { PNG } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const layout = read('extension/十周年UI/src/styles/layout-xinsha.css');
const compatibility = layout.match(/body\[data-style="othersOff"\] #arena \.lei-yijiang-line\s*\{[^}]+\}/)[0];
const core = read('noname/game/index.js');
const start = core.indexOf('  linexy(path) {');
const nativeLine = core.slice(start, core.indexOf('  jianqiLineAnim', start));

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const result = { cases: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
    page.on('pageerror', e => result.errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) result.errors.push(`${r.status()} ${r.url()}`); });
    await bootstrap(page, origin, false);
    await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').forEach(n => n.remove()));
    for (const file of ['layout/default/layout.css', 'layout/long2/layout.css', 'extension/十周年UI/src/styles/layout-xinsha.css']) {
      await page.addStyleTag({ url: `${origin}/${file}` });
    }
    await page.evaluate(nativeLine => {
      document.body.dataset.style = 'othersOff';
      lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
      lib.config.extension_雷的一将_lineBeautify = true;
      lib.configMenu = { appearence: { config: { zhishixian: { item: {} } } } };
      lib.onover = [];
      lib.lineColor = new Map();
      lib.config.duration = 500;
      get.xyDistance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
      game.saveConfig = (key, value) => { lib.config[key] = value; };
      game.zsOriginLineXy = game.linexy = (0, eval)(`({${nativeLine}}).linexy`);
      HTMLDivElement.prototype.show = function () { this.classList.remove('hidden'); };
      HTMLDivElement.prototype.listenTransition = () => {};
      ui.arena.innerHTML = '';
      ui.arena.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0';
      window.discard = ui.create.card(ui.arena).init(['spade', 7, 'sha']);
      discard.classList.add('thrown');
      discard.style.cssText = 'position:absolute;left:400px;top:225px;width:108px;height:150px;background:#18283a;transform:none;transition:none';
      // 在真实样式表中移除兼容规则，复现此前已提高两类指示线层级的状态。
      window.lineSheet = [...document.styleSheets].find(s => s.href?.endsWith('/layout-xinsha.css'));
      const index = [...lineSheet.cssRules].findIndex(r => r.selectorText?.includes('.lei-yijiang-line'));
      lineSheet.deleteRule(index);
    }, nativeLine);
    await page.addScriptTag({ content: script('extension/雷的一将/utils/config.js', 'window.getConfig=getConfig;') });
    await page.addScriptTag({ content: script('extension/雷的一将/utils/lineBeautify.js', 'window.installLineBeautify=installLineBeautify;').replaceAll('import.meta.url', JSON.stringify(`${origin}/extension/雷的一将/utils/lineBeautify.js`)) });
    const before = await page.evaluate(async () => {
      installLineBeautify();
      window.line = game.linexy([100, 300, 900, 300]);
      for (const a of line.getAnimations({ subtree: true })) { a.pause(); a.currentTime = 450; }
      await Promise.all([...line.querySelectorAll('img')].map(i => i.decode()));
      return { line: getComputedStyle(line).zIndex, discard: getComputedStyle(discard).zIndex };
    });
    assert.deepEqual(before, { line: '4', discard: '5' });
    const covered = PNG.sync.read(await page.screenshot());
    await page.evaluate(rule => lineSheet.insertRule(rule, lineSheet.cssRules.length), compatibility);
    // 弃牌本身也不接收输入，指示线不能拦截下方的 arena。
    const after = await page.evaluate(() => ({ line: getComputedStyle(line).zIndex, inline: line.style.zIndex, pointer: getComputedStyle(line).pointerEvents, hit: document.elementFromPoint(450, 300) === ui.arena }));
    assert.deepEqual(after, { line: '9', inline: '4', pointer: 'none', hit: true });
    const visible = PNG.sync.read(await page.screenshot());
    let changedPixels = 0;
    for (let y = 295; y <= 305; y++) for (let x = 420; x <= 490; x++) {
      const i = (y * visible.width + x) * 4;
      if ([0, 1, 2].some(c => Math.abs(visible.data[i + c] - covered.data[i + c]) > 20)) changedPixels++;
    }
    assert.ok(changedPixels > 100, `line must visibly cross the opaque discard card: ${changedPixels}`);
    for (const classes of ['thrown gainingcard', 'thrown drawingcard']) {
      const layers = await page.evaluate(classes => { discard.className = 'card ' + classes; return { line: +getComputedStyle(line).zIndex, card: +getComputedStyle(discard).zIndex }; }, classes);
      assert.ok(layers.line > layers.card);
      result.cases.push({ classes, ...layers });
    }
    const native = await page.evaluate(() => {
      const node = game.linexy([100, 300, 900, 300], 'drag');
      const z = getComputedStyle(node).zIndex; node.remove(); return z;
    });
    assert.equal(native, '9', 'native drag fallback retains the existing layer');
    // 新规则即使额外加载在其他风格，也不能改变第三方线节点原有的内联层级。
    for (const style of ['on', 'off', 'onlineUI', 'babysha', 'codename']) {
      const z = await page.evaluate(style => { document.body.dataset.style = style; return getComputedStyle(line).zIndex; }, style);
      assert.equal(z, '4', `${style}: compatibility is isolated`);
      result.cases.push({ style, line: z, isolated: true });
    }
    result.reproduction = { before, after, changedPixels, nativeDrag: native };
    assert.deepEqual(result.errors, []);
    console.log(JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(__dirname, 'yjcm-line-layer-results.json'), JSON.stringify(result, null, 2) + '\n');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
