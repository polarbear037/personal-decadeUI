const path = require('node:path');
const { server, chromium, assert, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const resultRoot = __dirname;
const mobile = process.argv.includes('--mobile');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
    await page.route('**/extension/*/chukuangWorker.js', route => route.fulfill({ contentType: 'text/javascript', body: read('extension/皮肤切换/chukuangWorker.js') + `
self.addEventListener('message', e => {
 if(e.data?.message !== 'ONLINE_PROP_PROBE') return;
 const animation=playerAnimation.getAnni(null,'4.0');
self.postMessage({message:'ONLINE_PROP_RESULT',width:animation.canvas.width,height:animation.canvas.height,nodes:animation.nodes.filter(n=>!n.completed&&(String(n.id).startsWith('online-prop-')||n.id==='shared-sentinel')).map(n=>({id:n.id,name:n.name,action:n.skeleton.state.getCurrent(0)?.animation?.name,x:n.renderX,y:n.renderY,scale:n.renderScale}))});
});` }));
    await page.goto(origin + '/__card_verification__');
    await page.evaluate(() => {
      const map = document.createElement('script'); map.type = 'importmap';
      map.textContent = JSON.stringify({ imports: { noname: '/noname.js', vue: '/node_modules/vue/dist/vue.esm-browser.js' } });
      document.head.append(map);
    });
    await page.addStyleTag({ url: origin + '/extension/十周年UI/ui/styles/lbtn/online.css' });
    const nativeSelected = read('layout/default/layout.css').match(/\.selected:not\(\.tdnodes\)[\s\S]*?\n}/)[0];
    await page.addStyleTag({ content: nativeSelected });
    await page.evaluate(async ({ origin, mobile }) => {
      const runtime = await import('/noname.js');
      await import('/noname/init/polyfill.js');
      Object.assign(window, runtime);
      lib.path = (await import('/noname/library/path.js')).default;
      const { Player } = await import('/noname/library/element/player.js');
      lib.config = { extension_十周年UI_newDecadeStyle: 'onlineUI', volumn_audio: 0, repeat_audio: true, background_audio: true };
      lib.assetURL = origin + '/'; lib.skill.huaren = {}; lib.skill.shenyu = { subSkill: { jieshu: {} } };
      document.body.dataset.style = 'onlineUI';
      document.head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width,initial-scale=1">');
      document.head.insertAdjacentHTML('beforeend', '<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#332b21}#window{position:absolute;inset:0}#arena{position:absolute;inset:0}.player{position:absolute;width:130px;height:175px;background:#6d5d42;border:2px solid #bba372;border-radius:6px}.avatar{position:absolute;inset:0}.anniubutton{position:relative;width:50px;height:50px;background-size:contain}.rightbuttons{position:absolute;right:10px;bottom:20px}.leftbuttons{position:absolute;left:10px;bottom:20px}#chukuang-canvas-wraper{position:fixed;inset:0;pointer-events:none;z-index:1000}</style>');
      ui.window = document.createElement('div'); ui.window.id = 'window'; document.body.append(ui.window);
      ui.arena = document.createElement('div'); ui.arena.id = 'arena'; ui.window.append(ui.arena);
      ui.handcards1 = document.createElement('div'); ui.handcards1.className = 'handcards';
      ui.handcards1.style.cssText = 'position:absolute;left:160px;right:180px;bottom:0;height:160px;border-top:1px solid #8c754e';
      ui.arena.append(ui.handcards1);
      ui.create.div = (selector, parent) => {
        const node = document.createElement('div'); node.className = selector.replace(/^\./, '').replaceAll('.', ' ');
        node.setBackgroundImage = url => { node.style.backgroundImage = `url("${lib.assetURL}${url}")`; };
        parent?.append(node); return node;
      };
      window.oldThrowCalls = [];
      Player.prototype.$throwEmotion = function(target, emotion) { oldThrowCalls.push({ target: target.playerid, emotion }); return 'old-throw'; };
      const makePlayer = (name, x, y) => {
        const node = document.createElement('div'); node.className = 'player'; node.style.left = x + 'px'; node.style.top = y + 'px';
        node.innerHTML = '<div class="avatar"></div>'; node.node = { avatar: node.firstElementChild };
        Object.assign(node, { name, name1: name, playerid: name, nickname: name });
        node.dataset.position = name;
        Object.assign(node, { isIn: () => !node.dead, isDead: () => !!node.dead, isUnseen: () => false,
          $throwEmotion(...args) { return Player.prototype.$throwEmotion.apply(this, args); }, throwEmotion: Player.prototype.throwEmotion,
          lines: [], say(text) { this.lines.push(text); } });
        ui.arena.append(node); return node;
      };
      game.players = [makePlayer('caocao', 100, 80), makePlayer('ol_shen_huangzhong', 940, 390), makePlayer('liubei', 760, 70)];
      game.me = game.players[0]; game.dead = []; game.documentZoom = window.documentZoom = 1;
      game.broadcastAll = (callback, ...args) => callback(...args);
      window.videos = []; game.addVideo = (...args) => videos.push({ type: args[0], data: args[2] });
      window.sent = []; game.send = (...args) => sent.push({ type: args[0], target: args[1].playerid, emotion: args[2] });
      const nativeAudio = game.playAudio.bind(game); window.audioRecords = [];
      game.playAudio = (...args) => {
        const audio = nativeAudio(...args); audio.muted = true;
        const record = { path: args.join('/'), playing: false }; audioRecords.push(record);
        audio.addEventListener('playing', () => { record.playing = true; });
        audio.addEventListener('error', () => { record.error = audio.error?.message; }); return audio;
      };
      window.decadeUI = { get: { bodySize: () => ({ width: innerWidth, height: innerHeight }) } };
      window.skinSwitch = { url: origin + '/extension/皮肤切换/', configKey: {}, isMobile: () => mobile };
      const { createChukuangWorkerApi } = await import('/extension/皮肤切换/js/modules/chukuang-worker-api.js');
      Object.assign(skinSwitch, createChukuangWorkerApi(lib, ui, game, _status));
      window.workerErrors = [];
      const initFirst = skinSwitch.chukuangWorkerInit; window.firstInitCount = 0;
      skinSwitch.chukuangWorkerInit = function() {
        const existing = skinSwitch.chukuangWorker;
        initFirst.call(this);
        if (!existing) {
          firstInitCount++; skinSwitch.chukuangWorker.addEventListener('error', error => workerErrors.push(error.message));
          observeStops(skinSwitch.chukuangWorker);
        }
      };
      const api = skinSwitch.chukuangWorkerApi, post = api._postPlayEffect;
      window.effectCalls = []; window.effectStarts = []; window.hits = [];
      api._postPlayEffect = function(worker, message, sprite, position, onStart) {
        effectCalls.push({ sprite: { ...sprite }, position, message, firstWorker: worker === skinSwitch.chukuangWorker, time: performance.now() });
        return post.call(this, worker, message, sprite, position, success => { effectStarts.push({ id: sprite.id, action: sprite.action, success }); onStart?.(success); });
      };
      window.followCalls = []; const follow = api._startFollowUpdate;
      api._startFollowUpdate = function(worker, ...args) {
        followCalls.push({ firstWorker: worker === skinSwitch.chukuangWorker, canvasId: args[2] });
        return follow.call(this, worker, ...args);
      };
      window.stopCalls = [];
      const observeStops = worker => {
        const postMessage = worker.postMessage;
        worker.postMessage = function(data, ...args) {
          if (/^STOP_EFFECT/.test(data.message)) stopCalls.push({ message: data.message, id: data.sprite?.id, firstWorker: worker === skinSwitch.chukuangWorker });
          return postMessage.call(this, data, ...args);
        };
      };
      document.addEventListener('leiol:throwEmotionHit', event => hits.push({ emotion: event.detail.emotion, time: performance.now(), player: event.detail.player.playerid }));
      window.pats = 0; window.characterPanels = 0; window.pauseCount = 0;
      lib.config.doubleclick_intro = true;
      lib.config.extension_雷的ol_paiyipaiContent = { 1: 0, 2: 0, 3: 0 };
      ui.menuContainer = document.createElement('div');
      game.pause2 = () => { pauseCount++; };
      ui.click.charactercard = () => { characterPanels++; };
      get.attitude = () => -1;
      const nativeAvatar = ui.click.avatar; window.nativeAvatarCalls = [];
      for (const player of game.players) {
        lib.character[player.name] = []; player.skin = { name: player.name };
        for (const type of ['click', 'touchend']) player.node.avatar.addEventListener(type, function(event) { const record = { name: player.name, type: event.type, double: this._doubleClicking, enabled: lib.config.doubleclick_intro, known: !!lib.character[player.name], menu: !!ui.menuContainer, inGame: game.players.includes(this.parentNode), unseen: this.parentNode.isUnseen(0) }; nativeAvatarCalls.push(record); nativeAvatar.call(this); record.after = this._doubleClicking; record.time = performance.now(); });
      }
      document.addEventListener('leiol:paiyipai', () => { pats++; });
      // 故意先注册真实拍一拍 document 捕获，复现其先于道具模块加载的情况。
      window.pai = (await import('/extension/雷的ol/utils/paiyipai.js')).installPaiyipai({ game, lib, get, document, _status });
      pai.setEnabled(true);
      const { createOnlineLbtnPlugin } = await import('/extension/十周年UI/ui/lbtn/skins/online.js');
      window.plugin = createOnlineLbtnPlugin(lib, game, ui, get, ai, _status, {});
      plugin.createBottomButtons();
      window.propsController = (await import('/extension/十周年UI/src/ui/online-props.js')).installOnlineProps();
      (await import('/extension/雷的ol/extension/olshenhuangzhong.js')).olshenhuangzhong();
      window.canvasCount = document.querySelectorAll('canvas').length;
      window.probe = () => new Promise((resolve, reject) => {
        const worker = skinSwitch.chukuangWorker;
        const timer = setTimeout(() => reject(new Error('Worker position probe timeout')), 3000);
        const listener = event => { if (event.data?.message !== 'ONLINE_PROP_RESULT') return; clearTimeout(timer); worker.removeEventListener('message', listener); resolve(event.data); };
        worker.addEventListener('message', listener); worker.postMessage({ message: 'ONLINE_PROP_PROBE' });
      });
    }, { origin, mobile });
    assert.equal(await page.locator('#chukuang-canvas').count(), 0, '第一画布在首次使用前尚未创建');
    await page.locator('.anniubutton').first().click();
    assert.equal(await page.locator('.online-prop-item').count(), 4);
    await page.evaluate(() => document.fonts.ready);
    if (!mobile) await page.screenshot({ path: path.join(resultRoot, 'online-props-panel.png') });
    await page.locator('[data-emotion="shoe"]').click();
    const layout = await page.evaluate(() => {
      const panel = document.querySelector('.online-prop-panel').getBoundingClientRect(), host = ui.window.getBoundingClientRect(), hand = ui.handcards1.getBoundingClientRect();
      const selected = document.querySelector('.online-prop-selected');
      return { widthRatio: panel.width / host.width, leftRatio: (panel.left - host.left) / host.width, topRatio: (panel.top - host.top) / host.height, shadow: getComputedStyle(selected).boxShadow, nativeSelected: selected.classList.contains('selected'), border: getComputedStyle(selected, '::after').backgroundImage };
    });
    assert(Math.abs(layout.widthRatio - 565 / 1720) < 0.002 && Math.abs(layout.leftRatio - 80 / 1720) < 0.002 && Math.abs(layout.topRatio - 155 / 286) < 0.002, JSON.stringify(layout));
    assert.equal(layout.shadow, 'none'); assert.equal(layout.nativeSelected, false); assert.match(layout.border, /shopitem_select\.png/);
    if (!mobile) await page.screenshot({ path: path.join(resultRoot, 'online-props-panel-selected.png') });
    assert.equal(await page.locator('.online-prop-target').count(), 2);
    await page.locator('.player').nth(1).locator('.avatar').click();
    await page.waitForFunction(() => effectStarts.filter(item => item.success).length >= 2);
    assert.equal(await page.locator('#chukuang-canvas').count(), 1, '首次使用按需创建皮切第一共享画布');
    const inFlight = await page.evaluate(() => probe());
    assert(inFlight.nodes.some(node => node.action === 'fly1' || node.action === 'fly2'), JSON.stringify(inFlight));
    assert.ok(await page.evaluate(() => effectCalls.every(call => call.firstWorker && call.message === 'PLAY_EFFECT')), '正常场景也必须固定走第一共享画布');
    if (!mobile) await page.screenshot({ path: path.join(resultRoot, 'online-props-shoe-flight.png') });
    await page.waitForFunction(() => hits.length === 1);
    await page.waitForTimeout(750);
    assert.equal(await page.evaluate(() => game.players[1].lines.length), 1, '同一丢鞋批次两只鞋仅触发一次神黄忠受击语音，无旧600ms重复');
    const shoes = await page.evaluate(() => effectCalls.filter(item => /caoxie$/.test(item.sprite.name)).map(item => item.sprite.action));
    assert.deepEqual(shoes, ['fly1', 'fly2', 'hit1', 'hit2']);
    await page.waitForFunction(() => propsController.activeCount === 0);
    await page.evaluate(() => {
      skinSwitch.chukuangWorkerApi.playEffect({ id: 'shared-sentinel', name: '../../../十周年UI/assets/animation/online-props/fx_uihd_huashu', version: '4.0', json: false, action: 'fly1', loop: true }, { x: -100, y: -100 });
      skinSwitch.chukuangWorkerInit2();
      const wrapper = document.getElementById('chukuang-canvas-wraper2');
      wrapper.style.setProperty('z-index', '3', 'important'); wrapper.style.visibility = 'hidden';
    });
    for (const emotion of ['egg', 'flower', 'wine']) {
      await page.locator(`[data-emotion="${emotion}"]`).click();
      const before = await page.evaluate(() => hits.length);
      await page.locator('.player').nth(1).locator('.avatar').click();
      await page.waitForFunction(count => hits.length > count, before);
      if (!mobile) await page.screenshot({ path: path.join(resultRoot, `online-props-${emotion}-hit.png`) });
      await page.waitForFunction(() => propsController.activeCount === 0);
    }
    assert.equal(await page.evaluate(() => game.players[1].lines.length), 2, '仅鞋、蛋触发神黄忠语音');
    assert.equal(await page.evaluate(() => skinSwitch.chukuangWorkerApi._followUpdateMap.size), 0);
    assert.equal(await page.evaluate(() => oldThrowCalls.length), 0, 'Online 不走旧PNG演出');
    assert.ok((await page.evaluate(() => probe())).nodes.some(node => node.id === 'shared-sentinel'), '停止道具不能清空第一画布中的其他特效');
    await page.evaluate(() => {
      skinSwitch.chukuangWorkerApi.stopEffect({ id: 'shared-sentinel', name: '../../../十周年UI/assets/animation/online-props/fx_uihd_huashu', version: '4.0', json: false });
      document.getElementById('chukuang-canvas-wraper2').style.cssText = '';
    });
    assert.deepEqual(await page.evaluate(() => [pats, characterPanels, pauseCount]), [0, 0, 0]);
    assert.equal(await page.evaluate(() => document.querySelectorAll('canvas').length), await page.evaluate(() => canvasCount + 2), '第一画布复用，测试另建第二画布模拟地图');
    assert.equal(await page.evaluate(() => firstInitCount), 1, '第一 Worker 和画布只创建一次');
    for (const zoom of [1, 1.25]) {
      const before = await page.evaluate(zoom => {
        propsController.hide(); document.body.style.zoom = zoom; window.documentZoom = game.documentZoom = zoom;
        game.me.style.width = '520px'; game.me.node.avatar.style.cssText = 'position:absolute;left:auto;right:20px;top:12px;width:112px;height:142px';
        game.players[1].style.left = '740px'; game.players[1].style.top = '340px';
        const rect = game.players[1].node.avatar.getBoundingClientRect();
        window.expectedHit = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const before = hits.length; game.me.throwEmotion(game.players[1], 'egg'); return before;
      }, zoom);
      await page.waitForFunction(before => hits.length > before, before);
      await page.waitForTimeout(80);
      const sample = await page.evaluate(async () => {
        const result = await probe(), node = result.nodes.find(node => node.action === 'hit1');
        const canvas = document.getElementById('chukuang-canvas').getBoundingClientRect();
        return { node, error: node ? { x: Math.abs(canvas.left + node.x / result.width * canvas.width - expectedHit.x), y: Math.abs(canvas.bottom - node.y / result.height * canvas.height - expectedHit.y) } : null };
      });
      assert(sample.error && sample.error.x < 2 && sample.error.y < 2, `zoom ${zoom}: ${JSON.stringify(sample)}`);
      await page.waitForFunction(() => propsController.activeCount === 0);
    }
    await page.evaluate(() => { document.body.style.zoom = ''; window.documentZoom = game.documentZoom = 1; propsController.show(); });
    await page.locator('[data-emotion="egg"]').click();
    const target = page.locator('.player').nth(2).locator('.avatar');
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    const beforeHold = await page.evaluate(() => videos.filter(record => record.type === 'throwEmotion').length);
    await page.waitForTimeout(660); await page.mouse.up();
    const afterHold = await page.evaluate(() => videos.filter(record => record.type === 'throwEmotion').length);
    assert(afterHold - beforeHold >= 3 && afterHold - beforeHold <= 4, `200ms long press: ${afterHold - beforeHold}`);
    await target.click({ clickCount: 2, delay: 110 });
    await page.waitForTimeout(120);
    const touchBox = await target.boundingBox();
    await page.touchscreen.tap(touchBox.x + touchBox.width / 2, touchBox.y + touchBox.height / 2);
    await page.waitForTimeout(120);
    await page.touchscreen.tap(touchBox.x + touchBox.width / 2, touchBox.y + touchBox.height / 2);
    assert.deepEqual(await page.evaluate(() => [pats, characterPanels, pauseCount]), [0, 0, 0], '道具选人连续鼠标/原生双击/真实触摸不触发拍一拍、人物面板或暂停');
    await page.evaluate(() => { propsController.stop(); game.online = true; propsController.show(); });
    await page.locator('[data-emotion="flower"]').click(); await page.waitForTimeout(110); await target.click();
    assert.deepEqual(await page.evaluate(() => sent.at(-1)), { type: 'throwEmotion', target: 'liubei', emotion: 'flower' });
    await page.mouse.click(650, 740);
    assert.equal(await page.locator('.online-prop-panel').count(), 0);
    assert.equal(await page.locator('.online-prop-target').count(), 0);
    await target.click({ clickCount: 2, delay: 100 });
    assert.equal(await page.evaluate(() => pats), 1, '关闭道具后恢复真实拍一拍');
    await page.evaluate(() => { pai.setEnabled(false); game.players[2].node.avatar._doubleClicking = false; });
    // 本体首击的匿名500ms回收定时器仍可能在队列中，待其结束后独立验证原生入口。
    await page.waitForTimeout(550);
    await target.click({ clickCount: 2, delay: 100 });
    assert.equal(await page.evaluate(() => characterPanels), 1, JSON.stringify(await page.evaluate(() => ({ nativeAvatarCalls, pats, characterPanels, open: propsController.isOpen }))));
    await page.evaluate(() => { game.online = false; lib.config.extension_十周年UI_newDecadeStyle = 'on'; document.body.dataset.style = 'on'; game.me.throwEmotion(game.players[1], 'shoe'); propsController.show(); });
    assert.equal(await page.evaluate(() => oldThrowCalls.length), 1, '非Online风格保留原演出');
    assert.equal(await page.locator('.online-prop-panel').count(), 0);
    await page.evaluate(() => { lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI'; document.body.dataset.style = 'onlineUI'; game.me.throwEmotion(game.players[1], 'egg'); _status.over = true; lib.onover.forEach(callback => callback()); });
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => propsController.activeCount), 0);
    assert.equal(await page.evaluate(() => skinSwitch.chukuangWorkerApi._followUpdateMap.size), 0);
    assert.ok(await page.evaluate(() => effectCalls.filter(call => call.sprite.id.startsWith('online-prop-')).every(call => call.firstWorker && call.message === 'PLAY_EFFECT')), '所有飞行、命中和正向光效均固定走第一画布');
    assert.ok(await page.evaluate(() => followCalls.length > 0 && followCalls.every(call => call.firstWorker && call.canvasId === null)), '跟随更新发往第一 Worker，保留预先换算的逻辑坐标');
    assert.ok(await page.evaluate(() => stopCalls.length > 0 && stopCalls.every(call => call.firstWorker && call.message === 'STOP_EFFECT')), '停止和清理均使用第一画布');
    assert.deepEqual(await page.evaluate(() => workerErrors), []);
    assert.deepEqual(await page.evaluate(() => effectStarts.filter(item => !item.success)), []);
    assert.ok(await page.evaluate(() => audioRecords.filter(record => /online-props/.test(record.path)).every(record => record.playing && !record.error)), JSON.stringify(await page.evaluate(() => audioRecords)));
    assert.deepEqual(errors, []);
    await page.setViewportSize({ width: 938, height: 422 });
    await page.evaluate(() => { _status.over = false; });
    await page.waitForFunction(() => !_status.over);
    await page.evaluate(() => { ui.handcards1.style.height = '102px'; propsController.hide(); propsController.show(); });
    await page.locator('[data-emotion="shoe"]').click();
    const reference = await page.evaluate(() => {
      const rect = document.querySelector('.online-prop-panel').getBoundingClientRect(), hand = ui.handcards1.getBoundingClientRect();
      return { width: rect.width, left: rect.left, top: rect.top, shadow: getComputedStyle(document.querySelector('.online-prop-selected')).boxShadow };
    });
    assert(Math.abs(reference.width - 938 * 565 / 1720) < 1 && Math.abs(reference.top - 422 * 155 / 286) < 1, JSON.stringify(reference));
    await page.evaluate(() => { ui.handcards1.style.height = '180px'; });
    await page.waitForTimeout(50);
    assert.equal(await page.locator('.online-prop-panel').evaluate(node => node.getBoundingClientRect().top), reference.top, '弹窗位置不随手牌区高度改变');
    assert.equal(reference.shadow, 'none', '加载本体真实红框选择器后仍只有官方黄色框');
    if (!mobile) await page.screenshot({ path: path.join(resultRoot, 'online-props-reference-layout.png') });
    if (!mobile) await page.locator('.online-prop-panel').screenshot({ path: path.join(resultRoot, 'online-props-selected-detail.png') });
    await page.evaluate(() => propsController.stop());
    console.log(`ONLINE_PROPS_BROWSER_OK (${mobile ? 'mobile branch / DPR 3 / touch' : 'desktop / DPR 1'}): first canvas lazy-created once, all props always use first shared Worker/canvas, including map canvas lowered/hidden; fly/hit/good-hit/follow/stop isolation, other shared effects retained; four props, audio, click/hold/send/end cleanup and other style fallback`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
