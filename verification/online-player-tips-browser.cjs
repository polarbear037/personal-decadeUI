const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '../../..');
const seed = {
  extensions: ['十周年UI'], extension_十周年UI_enable: true,
  extension_十周年UI_newDecadeStyle: 'onlineUI', extension_十周年UI_eruda: false,
  extension_十周年UI_welcomeDialog: false, extension_十周年UI_cardPrompt: false,
  extension_十周年UI_welcomeVersion: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../info.json'), 'utf8')).version,
  show_splash: 'off', splash_style: 'style1', new_tutorial: true, layout: 'newlayout',
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost'), pathname = decodeURIComponent(url.pathname);
  if (pathname === '/favicon.ico') return res.writeHead(204).end();
  if (['/checkFile', '/getFileList', '/readFile'].includes(pathname)) {
    const target = path.resolve(root, url.searchParams.get('fileName') || url.searchParams.get('dir') || '.');
    if (target !== root && !target.startsWith(root + path.sep)) return res.writeHead(403).end();
    let data;
    if (pathname === '/checkFile') data = target.endsWith('noname.config.txt') ? null : fs.existsSync(target) ? fs.statSync(target).isDirectory() ? 'directory' : 'file' : null;
    if (pathname === '/getFileList') {
      const entries = fs.readdirSync(target, { withFileTypes: true });
      data = { folders: entries.filter(e => e.isDirectory()).map(e => e.name), files: entries.filter(e => e.isFile()).map(e => e.name) };
    }
    if (pathname === '/readFile') data = Array.from(fs.readFileSync(target));
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, data }));
  }
  if (pathname === '/player-tips-probe') {
    res.setHeader('Content-Type', 'text/html;charset=utf-8');
    return res.end(`<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/noname.js","vue":"/node_modules/.pnpm/vue@3.5.28/node_modules/vue/dist/vue.esm-browser.js","pinyin-pro":"/node_modules/.pnpm/pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.js","dedent":"/node_modules/.pnpm/dedent@1.7.1/node_modules/dedent/dist/dedent.js"}}</script><script type="module">
      localStorage.setItem('gplv3_noname_alerted','true');sessionStorage.setItem('thunderLobby','true');window.confirm=()=>true;
      await new Promise((resolve,reject)=>{const request=indexedDB.open('noname_0.9_data',4);request.onupgradeneeded=()=>{for(const name of ['config','data','image','audio'])request.result.createObjectStore(name);request.result.createObjectStore('video',{keyPath:'time'});};request.onsuccess=()=>{const tx=request.result.transaction('config','readwrite');for(const [k,v] of Object.entries(${JSON.stringify(seed)}))tx.objectStore('config').put(v,k);tx.oncomplete=()=>{request.result.close();resolve();};};request.onerror=reject;});
      await import('/noname/entry.js');</script>`);
  }
  const filename = path.resolve(root, '.' + pathname);
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' })[path.extname(filename)] || 'application/octet-stream');
  if (pathname === '/game/config.json') return res.end(JSON.stringify({ ...JSON.parse(fs.readFileSync(filename, 'utf8')), ...seed }));
  fs.createReadStream(filename).pipe(res);
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], badResponses = [], consoleErrors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) badResponses.push({ status: response.status(), path: decodeURIComponent(new URL(response.url()).pathname) }); });
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.waitForFunction(async () => { const { game, ui } = await import('/noname.js'); return game.players.length > 1 && !!window.decadeUI && Array.isArray(ui.dialogs) && !!ui.arena; }, null, { timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const { game, ui, lib, get, _status } = await import('/noname.js');
      const tips = await import('/extension/十周年UI/src/ui/online-player-tips.js');
      const { Content } = await import('/noname/library/element/content.js');
      Object.assign(window, { game, ui, lib, get, _status, tips, Content });
      game.pause();
      for (const dialog of [...ui.dialogs]) dialog.close();
      document.querySelector('.decade-welcome-overlay')?.remove();
      ui.arena.classList.remove('choose-character');
      game.me = game.players[0];
      window.actor = game.players[1];
      game.me.init('liubei'); actor.init('guanyu');
      _status.gameStarted = true; _status.over = false; _status.currentPhase = actor;
      window.phase = game.createEvent('phaseUse', false); phase.player = actor;
      window.activate = event => { _status.eventManager.setStatusEvent(event, true); tips.refreshOnlinePlayerTips(); return event; };
      window.choose = props => {
        const event = actor[props.name]();
        Object.assign(event, props); event.parent = props.parent || phase;
        return activate(event);
      };
      window.read = (player = actor) => {
        const tip = player.querySelector('.decade-online-player-tip'), toast = player.querySelector('.decade-online-sha-toast');
        const style = node => node ? getComputedStyle(node) : null;
        return { text: tip?.textContent || '', color: style(tip)?.color, subjectColor: style(tip?.querySelector('span'))?.color, font: style(tip)?.fontFamily,
          fontSize: style(tip?.firstElementChild)?.fontSize, rect: tip?.getBoundingClientRect().toJSON(),
          toast: toast?.getAttribute('aria-label') || '', toastColor: style(toast?.querySelector('.decade-online-sha-current'))?.color,
          labelColor: style(toast?.querySelector('.decade-online-sha-label'))?.color, maxColor: style(toast?.querySelector('.decade-online-sha-max'))?.color,
          toastRect: toast?.getBoundingClientRect().toJSON(), effects: toast?.querySelectorAll('.is-changing > span').length || 0,
          leaving: toast?.classList.contains('is-leaving') || false, count: player.querySelectorAll('.decade-online-player-tip').length };
      };
      lib.skill.tip_extra_sha = { charlotte: true, mod: { cardUsable(card, player, num) { if (card.name === 'sha') return num + 1; } } };
      actor.addSkill('tip_extra_sha');
      actor.getStat().card.sha = 0;
    });
    const nativeEntry = await page.evaluate(async () => {
      const event = choose({ name: 'chooseToUse', type: 'phase' });
      await Content.chooseToUse[0](event, null, actor);
      tips.refreshOnlinePlayerTips();
      const waiting = read();
      // 同一真实选择事件在技能选择、取消技能后恢复基础操作提示。
      event.skill = 'wusheng'; game.check(); tips.refreshOnlinePlayerTips(); const skill = read();
      delete event.skill; game.uncheck(); tips.refreshOnlinePlayerTips(); const cancelled = read();
      return { result: event.result, waiting, skill, cancelled };
    });
    assert.equal(nativeEntry.result, 'ai');
    assert.equal(nativeEntry.waiting.text, '思考 出牌');
    assert.equal(nativeEntry.skill.text, '思考“武圣”技能');
    assert.equal(nativeEntry.cancelled.text, '思考 出牌');
    const scenes = await page.evaluate(() => {
      const result = {};
      choose({ name: 'chooseToUse', type: 'phase' }); result.play = read();
      choose({ name: 'chooseToUse', type: 'phase', skill: 'wusheng' }); result.skill = read();
      const skillEvent = game.createEvent('rende', false); skillEvent.player = actor; skillEvent.parent = phase;
      choose({ name: 'chooseTarget', parent: skillEvent }); result.nestedSkill = read();
      choose({ name: 'chooseToRespond', respondTo: [game.me, { name: 'sha' }] }); result.card = read();
      choose({ name: 'chooseToRespond', respondTo: [game.me, game.createCard('sha', 'spade', 7, 'fire')] }); result.physicalCard = read();
      choose({ name: 'chooseToUse', type: 'wuxie' }); result.wuxie = read();
      const discard = game.createEvent('phaseDiscard', false); discard.player = actor;
      choose({ name: 'chooseToDiscard', parent: discard }); result.discard = read();
      choose({ name: 'chooseToUse', type: 'phase' }); result.restored = read();
      actor.querySelector('.decade-online-player-tip').remove(); tips.refreshOnlinePlayerTips(); result.detached = read();
      const use = actor.chooseToUse({ type: 'phase' }); use.parent = phase;
      const attack = actor.useCard({ name: 'sha' }, game.me, false); attack.parent = use;
      const local = game.me.chooseToRespond(); local.parent = attack; activate(local);
      result.local = read(game.me); result.remoteDuringLocal = read();
      activate(attack); result.resolving = read();
      attack.skill = 'wusheng'; tips.refreshOnlinePlayerTips(); result.convertedAction = read(); delete attack.skill;
      const skillUse = actor.useSkill('zhiheng', [], []); skillUse.parent = phase; activate(skillUse); result.skillAction = read();
      const draw = game.createEvent('draw', false); draw.player = actor; draw.parent = skillUse; activate(draw); result.skillDraw = read();
      const passive = game.createEvent('trigger', false); passive.player = actor; passive.skill = 'yingzi'; passive.parent = phase; activate(passive); result.passive = read();
      passive.player = game.me; tips.refreshOnlinePlayerTips(); result.otherSkill = read();
      use.result = { bool: true }; activate(use); result.completedChoice = read();
      choose({ name: 'chooseToUse', type: 'phase' });
      const event = game.createEvent('chooseCharacter', false); event.player = actor; activate(event); result.character = read();
      choose({ name: 'chooseToUse', type: 'phase' });
      return result;
    });
    assert.equal(scenes.play.text, '思考 出牌');
    assert.equal(scenes.play.color, 'rgb(219, 199, 165)');
    assert.equal(scenes.play.subjectColor, 'rgb(255, 216, 0)');
    assert.equal(scenes.skill.text, '思考“武圣”技能');
    assert.equal(scenes.nestedSkill.text, '思考“仁德”技能');
    assert.equal(scenes.card.text, '思考杀');
    assert.equal(scenes.physicalCard.text, '思考火杀');
    assert.equal(scenes.wuxie.text, '思考无懈可击');
    assert.equal(scenes.discard.text, '思考 弃牌');
    assert.equal(scenes.discard.subjectColor, 'rgb(255, 80, 80)');
    assert.equal(scenes.restored.text, scenes.play.text);
    assert.equal(scenes.detached.count, 1);
    assert.equal(scenes.local.text, ''); assert.equal(scenes.remoteDuringLocal.text, ''); assert.equal(scenes.character.text, '');
    assert.equal(scenes.resolving.text, '思考杀', '真实 useCard 已有牌名时不能继续显示默认出牌提示');
    assert.equal(scenes.convertedAction.text, '思考“武圣”技能');
    assert.equal(scenes.skillAction.text, '思考“制衡”技能');
    assert.equal(scenes.skillDraw.text, '思考“制衡”技能', '技能的摸牌子事件应保留技能上下文');
    assert.equal(scenes.passive.text, '思考“英姿”技能', '独立触发事件没有 useCard 祖先也须识别技能');
    assert.equal(scenes.otherSkill.text, '', '另一名角色发动技能期间不能继续把操作提示挂在当前回合角色上');
    assert.equal(scenes.completedChoice.text, '思考 出牌', 'AI 计算出 result 不代表选择事件已退出');
    await page.waitForTimeout(400);
    const full = await page.evaluate(() => read());
    assert.equal(full.toast, '出杀次数：2/2');
    assert.equal(full.labelColor, 'rgb(241, 219, 181)'); assert.equal(full.maxColor, 'rgb(228, 213, 160)'); assert.equal(full.toastColor, 'rgb(223, 152, 69)');
    await page.evaluate(() => { actor.getStat().card.sha = 1; tips.refreshOnlinePlayerTips(); });
    await page.waitForTimeout(240);
    const decreased = await page.evaluate(() => read());
    assert.equal(decreased.toast, '出杀次数：1/2'); assert.equal(decreased.effects, 3);
    await page.evaluate(() => { actor.getStat().card.sha = 2; tips.refreshOnlinePlayerTips(); });
    await page.waitForTimeout(400);
    const zero = await page.evaluate(() => read());
    assert.equal(zero.toast, '出杀次数：0/2');
    const zeroNumber = await page.evaluate(() => getComputedStyle(actor.querySelector('.decade-online-sha-incoming')).color);
    assert.equal(zeroNumber, 'rgb(179, 179, 179)');
    await page.evaluate(() => { actor.getStat().card.sha = 1; tips.refreshOnlinePlayerTips(); });
    await page.waitForTimeout(400);
    const increased = await page.evaluate(() => read());
    assert.equal(increased.toast, '出杀次数：1/2');
    await page.evaluate(() => { actor.directequip(game.createCard('zhuge', 'club', 1)); tips.refreshOnlinePlayerTips(); });
    await page.waitForTimeout(400);
    const unlimited = await page.evaluate(() => read());
    assert.equal(unlimited.toast, '出杀次数 ∞');
    await page.evaluate(() => {
      for (const card of actor.getCards('e')) card.remove(); actor.vcardsMap.equips = [];
      actor.removeSkill('tip_extra_sha'); tips.refreshOnlinePlayerTips();
    });
    assert.equal((await page.evaluate(() => read())).toast, '');
    await page.evaluate(() => { actor.addSkill('tip_extra_sha'); actor.getStat().card.sha = 0; tips.refreshOnlinePlayerTips(); });
    await page.waitForTimeout(450);
    await page.evaluate(() => document.fonts.ready);
    // 冷启动的欢迎窗口是延迟创建；只在验收页面中移除遮挡。
    await page.evaluate(() => document.querySelector('.decade-welcome-overlay')?.remove());
    const visuals = await page.evaluate(async () => {
      const image = new Image(); image.src = new URL('/extension/十周年UI/image/ui/tip/online/seat_opt_tips_bg.png', location); await image.decode();
      const tip = actor.querySelector('.decade-online-player-tip'), toast = actor.querySelector('.decade-online-sha-toast');
      const rect = actor.getBoundingClientRect(), tr = toast.getBoundingClientRect();
      return { image: [image.width, image.height], fontLoaded: document.fonts.check('22px dui-online-player-tip'), actor: rect.toJSON(), read: read(), toastOffset: tr.top - rect.bottom, toastGap: tr.top - tip.getBoundingClientRect().bottom,
        enterDuration: toast.getAnimations()[0].effect.getTiming().duration, background: getComputedStyle(tip).backgroundImage,
        overlays: actor.querySelectorAll('img.tipshow,.tipskill').length };
    });
    assert.deepEqual(visuals.image, [210, 26]); assert.equal(visuals.fontLoaded, true); assert.equal(visuals.enterDuration, 150); assert.equal(visuals.overlays, 0);
    assert(Math.abs(visuals.read.rect.width / visuals.actor.width - 180 / 146) < .02);
    assert(Math.abs(visuals.toastGap - 2) < .25, '出杀次数提示上边缘应与思考提示下边缘相隔2px');
    assert(Math.abs(parseFloat(visuals.read.fontSize) / visuals.actor.width - 22 / 146 * .72) < .005);
    const skillFit = await page.evaluate(() => {
      const event = choose({ name: 'chooseToUse', type: 'phase', skill: 'wusheng' });
      const node = actor.querySelector('.decade-online-player-tip'), line = node.firstElementChild;
      const range = document.createRange(); range.selectNodeContents(line);
      const result = { text: node.textContent, fontSize: getComputedStyle(line).fontSize, content: range.getBoundingClientRect().toJSON(), panel: node.getBoundingClientRect().toJSON() };
      return result;
    });
    assert(skillFit.content.left >= skillFit.panel.left - 1 && skillFit.content.right <= skillFit.panel.right + 1, '完整技能提示超出了底图');
    await page.screenshot({ path: path.join(__dirname, 'online-player-tips-skill.png') });
    await page.evaluate(() => { choose({ name: 'chooseToUse', type: 'phase' }); });
    await page.screenshot({ path: path.join(__dirname, 'online-player-tips-game.png') });
    await page.waitForFunction(() => document.querySelector('.decade-online-sha-toast.is-leaving'), null, { polling: 20, timeout: 3000 });
    const leaving = await page.evaluate(() => read()); assert.equal(leaving.leaving, true);
    await page.waitForTimeout(200);
    assert.equal((await page.evaluate(() => read())).toast, '', '次数相同不能每100ms重复弹出');
    const lifecycle = await page.evaluate(() => {
      actor.getStat().card.sha = 1; tips.refreshOnlinePlayerTips();
      const end = game.createEvent('phaseJieshu', false); end.player = actor; activate(end);
      const phaseEnd = read();
      choose({ name: 'chooseToUse', type: 'phase' });
      lib.config.extension_十周年UI_newDecadeStyle = 'off'; tips.refreshOnlinePlayerTips(); const switched = read();
      lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI'; tips.refreshOnlinePlayerTips();
      lib.onover.forEach(fn => fn()); const over = read();
      return { phaseEnd, switched, over };
    });
    await page.waitForTimeout(300);
    assert.equal(lifecycle.phaseEnd.text, ''); assert.equal(lifecycle.phaseEnd.toast, ''); assert.equal(lifecycle.switched.text, ''); assert.equal(lifecycle.over.text, '');
    assert.equal((await page.evaluate(() => read())).toast, '', '退出后延迟toast不得重现');
    assert.deepEqual(errors, []);
    assert.deepEqual(badResponses.filter(response => /online-player-tips|FZLBGBK|seat_opt_tips/.test(response.path)), []);
    const report = { nativeEntry, scenes, full, decreased, zero, increased, unlimited, visuals, skillFit, leaving, lifecycle, errors, badResponses, consoleErrors };
    fs.writeFileSync(path.join(__dirname, 'online-player-tips-results.json'), JSON.stringify(report, null, 2));
    console.log('ONLINE_PLAYER_TIPS_ENGINE_OK', JSON.stringify({ scenes: Object.keys(scenes), counts: [full.toast, decreased.toast, zero.toast, increased.toast, unlimited.toast], errors, badResponses }));
  } finally { await browser.close(); server.close(); }
}

module.exports = { server, chromium, root, seed };
if (require.main === module) run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
