const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '../../..');
const extension = path.resolve(__dirname, '..');
const horseOnly = process.argv.includes('--horse-only');
const restoreEffectsOnly = process.argv.includes('--restore-effects-only');
const loneAttackOnly = process.argv.includes('--lone-attack-only');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const code = (name, expose) => '(function(){' + read(name).replace(/^import[\s\S]*?;\s*/gm, '').replace(/^export\s*\{[^}]*\};?\s*/gm, '') + '\n' + expose + '})();';
const native = read('noname/library/element/player.js');
const handle = native.slice(native.indexOf('  $handleEquipChange() {'), native.indexOf('  addVirtualJudge(card, cards) {'));
const sync = native.slice(native.indexOf('  $syncDisable(map) {'), native.indexOf('  //以下函数涉及到本次更新内容而进行修改', native.indexOf('  $syncDisable(map) {')));
const markSource = read('extension/标记补充/extension.js');
const sweepStart = markSource.indexOf('lib.skill._zhuangbeisaoguang_ = {');
const sweepSkill = markSource.slice(sweepStart, markSource.indexOf("if (config.shiyongkapaitixiao", sweepStart)).trim().replace('lib.skill._zhuangbeisaoguang_', 'window.actualEquipSweep').replace('content: function ()', 'content: function (trigger, player)');
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (url === '/fixture') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><body><div id="window"><div id="arena" class="decadeUI"></div></div>'); return; }
  if (url === '/favicon.ico') { res.writeHead(204).end(); return; }
  const file = path.resolve(root, '.' + url);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin + '/fixture');
    for (const name of ['layout/default/layout.css', 'extension/十周年UI/src/styles/player4.css', 'extension/十周年UI/src/styles/card.css', 'extension/十周年UI/src/styles/icon.css', 'extension/十周年UI/src/styles/layout.css', 'extension/十周年UI/src/styles/equip.css']) await page.addStyleTag({ url: origin + '/' + name });
    await page.addStyleTag({ content: 'body{background:#29251f;color:white}#window,#arena{position:absolute;inset:0}.player{position:absolute!important;top:100px!important;left:100px!important;width:160px!important;height:220px!important}.equips-wrap{height:250px!important;bottom:80px!important;right:80px!important}.card>.name2{font-family:sans-serif!important}.case-label{position:absolute;top:40px;left:100px;font-size:20px}' });
    await page.evaluate(({ handle, sync }) => {
      window.lib = { config: { extension_十周年UI_aloneEquip: true } };
      window.ui = { arena: document.getElementById('arena') };
      window.get = { equipNum: card => Number(card.name.match(/(?:equip|slot)(\d)/)?.[1] || card.slot), suit:card => card.suit, number:card => card.number, strNumber:n => ({1:'A',11:'J',12:'Q',13:'K'})[n] || String(n || ''), translation: value => value, copy: value => ({ ...value }), is: { mountCombined: () => false } };
      window._status = {};
      Array.prototype.add = function (v) { if (!this.includes(v)) this.push(v); };
      Array.prototype.remove = function (v) { const i = this.indexOf(v); if (i >= 0) this.splice(i, 1); };
      window.game = { broadcast() {}, addVideo() {}, expandSkills: v => v };
      window.nativePlayer = new Function('return ({' + handle + ',' + sync + '})')();
      const names = ['诸葛连弩 1', '八卦阵', '爪黄飞电 +1', '赤兔 -1', '木牛流马'];
      window.makeCard = (name, slot, state = 'equipped') => {
        const card = document.createElement('div'); card.className = 'card equip' + slot; card.name = name; card.slot = slot;
        card.dataset.suit = state === 'equipped' ? 'spade' : 'none';
        card.suit = card.dataset.suit; card.number = state === 'equipped' ? 5 : '';
        if (state === 'empty') card.classList.add('emptyequip', 'hidden');
        if (state === 'feichu') card.classList.add('feichu');
        const label = document.createElement('div'); label.className = 'name2';
        label.innerHTML = state === 'feichu' ? (slot === 3 ? '+1马栏 已废除' : slot === 4 ? '-1马栏 已废除' : '宝物栏 已废除') : '<span style="font-size:14px;margin-left:15px">♠</span><span style="font-size:14px">5</span><span style="font-size:17px;color:white;margin-left:2px">' + names[slot - 1] + '</span>';
        card.node = { name2: label }; card.append(label); card.fix = () => card;
        return card;
      };
      game.createCard = name => makeCard(name, Number(name.match(/equip(\d)/)[1]), name.startsWith('feichu_') ? 'feichu' : 'empty');
      window.buildPlayer = local => {
        ui.arena.replaceChildren();
        const player = document.createElement('div'); player.className = 'player'; player.dataset.position = local ? '0' : '1'; ui.arena.append(player);
        const equips = document.createElement('div'); equips.className = 'equips'; player.append(equips); player.node = { equips };
        player.extraEquip = []; player.hiddenSkills = []; player.disabledSlots = {};
        player.hasEmptySlot = slot => !player.disabledSlots['equip' + slot];
        player.getEquips = slot => Array.from(equips.children).filter(card => get.equipNum(card) === Number(slot) && !card.classList.contains('emptyequip') && !card.classList.contains('feichu'));
        if (local) {
          game.me = player;
          const wrap = document.createElement('div'); wrap.className = 'equips-wrap';
          const back = document.createElement('div'); back.className = 'equips-back'; wrap.back = back; wrap.append(back);
          for (let n = 0; n < 5; n++) { const slot = document.createElement('div'); slot.dataset.type = n; back.append(slot); }
          wrap.append(equips); ui.arena.append(wrap); ui.equipSolts = wrap;
        } else { game.me = null; ui.equipSolts = null; }
        window.player = player; return player;
      };
      window.setState = states => {
        player.node.equips.replaceChildren(); player.disabledSlots = {};
        for (let slot = 1; slot <= 5; slot++) {
          const state = states[slot - 1] || 'empty';
          if (state === 'equipped') player.node.equips.append(makeCard('slot' + slot, slot));
          if (state === 'feichu') player.disabledSlots['equip' + slot] = 1;
        }
        nativePlayer.$syncDisable.call(player);
        player.$handleEquipChange();
      };
    }, { handle, sync });
    await page.addScriptTag({ content: code('extension/十周年UI/src/ui/equip-layout.js', 'Object.assign(window,{refreshEquipLayout,restoreEquipPresentation});') });
    await page.addScriptTag({ content: code('extension/十周年UI/src/ui/equip-effects.js', 'window.installEquipSweepCompatibility=installEquipSweepCompatibility;') });
    await page.addScriptTag({ content: read('extension/皮肤切换/js/modules/chukuang-worker-api.js').replace('export function ', 'function ') + '\nwindow.createChukuangWorkerApi=createChukuangWorkerApi;' });
    await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.id = 'chukuang-canvas'; canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;opacity:0'; document.body.append(canvas);
      window.decadeUI = { get:{ bodySize:() => ({width:innerWidth,height:innerHeight}) } };
      window.sweepMessages = [];
      window.skinSwitch = { chukuangWorkerInit(){}, chukuangWorker:{postMessage:message => sweepMessages.push(message)} };
      skinSwitch.chukuangWorkerApi = createChukuangWorkerApi(lib,ui,game,_status).chukuangWorkerApi;
      installEquipSweepCompatibility(); installEquipSweepCompatibility();
    });
    await page.addScriptTag({ content:sweepSkill });
    await page.evaluate(() => { get.subtype = card => 'equip' + get.equipNum(card); });
    const route = read('extension/十周年UI/src/overrides/player/card-route.js');
    const routeHandle = route.slice(route.indexOf('function playerHandleEquipChange() {'), route.indexOf('\nfunction playerLose()'));
    await page.evaluate(routeHandle => {
      window.routeHandle = new Function('actionOverrides', 'refreshEquipLayout', 'return ' + routeHandle)({ playerHandleEquipChange: nativePlayer.$handleEquipChange }, refreshEquipLayout);
      window.installPlayer = local => { buildPlayer(local); player.$handleEquipChange = window.routeHandle; };
      window.measure = () => {
        const rect = node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom, right:r.right }; };
        return { container: rect(player.node.equips), layout: player.node.equips.dataset.equipLayout, cards: Object.fromEntries([...player.node.equips.children].map(c => [get.equipNum(c), { ...rect(c), hidden:c.classList.contains('hidden'), label:c.node.name2.innerHTML, labelOverflow:c.node.name2.scrollWidth > c.node.name2.clientWidth }])) };
      };
    }, routeHandle);
    const results = [];
    for (const local of [false, true]) {
      await page.evaluate(local => installPlayer(local), local);
      if (loneAttackOnly) {
        await page.evaluate(() => setState(['empty', 'empty', 'equipped', 'empty', 'empty']));
        const defenseSlot = (await page.evaluate(() => measure())).cards[3];
        for (const defense of ['empty', 'equipped', 'feichu']) for (const attack of ['equipped', 'feichu']) for (const treasure of ['empty', 'equipped', 'feichu']) {
          await page.evaluate(states => setState(states), ['empty', 'empty', defense, attack, treasure]);
          const m = await page.evaluate(() => measure());
          const lone = defense === 'empty' && attack === 'equipped';
          const thirdRow = lone || treasure !== 'empty';
          const description = `${local ? '独立' : '角色'} ${defense}/${attack}/${treasure}`;
          assert(Math.abs(m.cards[4].y - defenseSlot.y - (thirdRow ? 0 : local ? 30 : 20)) < 1, description + ' 进攻马行位置错误');
          assert(Math.abs(m.cards[4].x - m.container.x - (!lone && treasure !== 'empty' ? m.container.width / 2 : 0)) < 1, description + ' 进攻马列位置错误');
          if (local && lone) {
            const background = await page.evaluate(() => {
              const node = ui.equipSolts.back.querySelector('[data-type="3"]');
              const rect = node.getBoundingClientRect();
              return { x: rect.x, y: rect.y, display: getComputedStyle(node).display };
            });
            assert.notEqual(background.display, 'none', description + ' 进攻马背景未显示');
            assert(Math.abs(background.y - m.cards[4].y) < 1 && Math.abs(background.x - m.cards[4].x) < 1, description + ' 背景与进攻马错位');
          }
          results.push(description);
        }
        const playerSource = read('extension/十周年UI/src/ui/player-element.js');
        const start = playerSource.indexOf('new MutationObserver(mutations => {');
        const endText = '.observe(a.node.equips, { childList: !0 })';
        await page.evaluate(source => new Function('player', source)(player), playerSource.slice(start, playerSource.indexOf(endText, start) + endText.length).replace('a.node.equips', 'player.node.equips'));
        await page.evaluate(() => {
          setState(['empty', 'empty', 'empty', 'equipped', 'empty']);
          player.node.equips.append(makeCard('slot3', 3));
        });
        await page.waitForFunction(() => player.node.equips.dataset.loneAttackHorse !== 'true');
        assert((await page.evaluate(() => measure())).cards[4].y > defenseSlot.y, '补上防御马后进攻马未恢复末行');
        await page.evaluate(() => player.getEquips(3)[0].remove());
        await page.waitForFunction(() => player.node.equips.dataset.loneAttackHorse === 'true');
        assert(Math.abs((await page.evaluate(() => measure())).cards[4].y - defenseSlot.y) < 1, '失去防御马后进攻马未移回第三行');
        await page.screenshot({ path: path.join(extension, '.codex-tmp', local ? 'equip-lone-attack-local.png' : 'equip-lone-attack-player.png') });
        await page.evaluate(() => player.getEquips(4)[0].remove());
        await page.waitForFunction(() => player.node.equips.dataset.loneAttackHorse !== 'true');
        if (local) assert(await page.evaluate(() => getComputedStyle(ui.equipSolts.back.querySelector('[data-type="2"]')).display !== 'none'), '失去进攻马后防御马空栏背景未恢复');
        continue;
      }
      for (const defense of ['empty', 'equipped', 'feichu']) for (const attack of ['empty', 'equipped', 'feichu']) for (const treasure of ['empty', 'equipped', 'feichu']) {
        const states = ['equipped', 'equipped', defense, attack, treasure];
        await page.evaluate(states => setState(states), states);
        const m = await page.evaluate(() => measure());
        const description = `${local ? '独立' : '角色'} ${states.join('/')}`;
        const combined = treasure !== 'empty';
        const disabled = await page.evaluate(() => [...player.node.equips.querySelectorAll('.feichu')].map(card => {
          const label = card.querySelector('.decade-equip-feichu-label');
          const marker = card.querySelector('.decade-equip-feichu');
          return { slot:get.equipNum(card), count:card.querySelectorAll('.decade-equip-feichu').length, text:label?.textContent, fits:label && label.scrollWidth <= label.clientWidth, metrics:label && {font:getComputedStyle(label).fontSize,width:label.clientWidth,scroll:label.scrollWidth,card:card.getBoundingClientRect().width,marker:marker.getBoundingClientRect().width,parts:[...marker.children].map(n => ({text:n.textContent,width:n.getBoundingClientRect().width,margin:getComputedStyle(n).marginLeft}))}, distance:marker?.querySelector('.decade-equip-feichu-distance')?.textContent,
            order:marker && [...marker.children].map(n => n.className) };
        }));
        for (const d of disabled) {
          assert.equal(d.count, 1, description + ' 废除展示节点重复');
          assert.equal(d.text, '废除', description + ' 废除文字错误');
          if (!horseOnly && !restoreEffectsOnly) assert(d.fits, description + ' 废除文字裁剪 ' + JSON.stringify(d.metrics));
          assert.equal(d.metrics.font, combined && [3,4].includes(d.slot) ? '12px' : '16px', description + ' 废除字号错误');
          if ([3,4].includes(d.slot)) {
            assert.equal(d.distance, d.slot === 3 ? '+1' : '-1', description + ' 马距错误');
            assert.deepEqual(d.order, ['decade-equip-feichu-icon','decade-equip-feichu-label','decade-equip-feichu-distance'], description + ' 废除马栏顺序错误');
          }
        }
        assert.equal(m.layout, combined ? 'combined' : attack !== 'empty' ? 'attack' : 'normal', description);
        const horses = await page.evaluate(() => [3,4].map(slot => {
          const card = [...player.node.equips.children].find(c => get.equipNum(c) === slot);
          const marker = card.querySelector('.decade-equip-horse');
          const name2 = card.node.name2;
          return { slot, count:card.querySelectorAll('.decade-equip-horse').length, text:marker && [...marker.children].map(c => c.querySelector('img')?.alt ?? c.textContent).join(''), order:marker && [...marker.children].map(c => c.className), markerFits:marker && marker.scrollWidth <= marker.clientWidth,
            originalsHidden:[...name2.children].filter(c => c !== marker).every(c => getComputedStyle(c).display === 'none') };
        }));
        for (const horse of horses) {
          const compact = combined && states[horse.slot - 1] === 'equipped';
          assert.equal(horse.count, compact ? 1 : 0, description + ' 马栏紧凑展示状态错误');
          if (compact) {
            assert.equal(horse.text, '♠5' + (horse.slot === 3 ? '+1' : '-1'), description + ' 马栏内容或顺序错误');
            assert(horse.originalsHidden, description + ' 原装备名仍显示');
            assert(horse.markerFits, description + ' 紧凑马栏溢出');
          }
        }
        const row = local ? 30 : 20;
        if (defense === 'empty' && attack === 'equipped') {
          assert(Math.abs(m.cards[4].y - m.cards[2].y - row) < 1, description + ' 单独进攻马应放在防御马所在的第三行');
          assert(Math.abs(m.cards[4].x - m.container.x) < 1, description + ' 单独进攻马应放在防御马所在的左栏');
          if (local) {
            const background = await page.evaluate(() => {
              const node = ui.equipSolts.back.querySelector('[data-type="3"]');
              const rect = node.getBoundingClientRect();
              return { y: rect.y, x: rect.x, display: getComputedStyle(node).display };
            });
            assert.notEqual(background.display, 'none', description + ' 单独进攻马背景未显示');
            assert(Math.abs(background.y - m.cards[4].y) < 1 && Math.abs(background.x - m.cards[4].x) < 1, description + ' 单独进攻马背景与卡牌错位');
          }
        }
        const visible = Object.values(m.cards).filter(c => !c.hidden);
        assert(Math.max(...visible.map(c => c.bottom)) - Math.min(...visible.map(c => c.y)) <= row * 4 + 1, description + ' 超出四行');
        if (combined) {
          for (const slot of [1, 2, 5]) assert(Math.abs(m.cards[slot].width - m.container.width) < 1, description + ' 武器/防具/宝物未全宽');
          if (defense !== 'empty') {
            assert(Math.abs(m.cards[3].y - m.cards[4].y) < 1, description + ' 马栏不同行');
            assert(m.cards[3].right <= m.cards[4].x + 1, description + ' 马栏重叠');
            assert(Math.abs(m.cards[3].width - m.container.width / 2) < 1, description + ' 防御马未半宽');
            assert(Math.abs(m.cards[3].x - m.container.x) < 1, description + ' 防御马未居左');
          }
          assert(m.cards[4].width <= m.container.width / 2 + 1, description + ' 进攻马未半宽');
          assert(m.cards[5].y > m.cards[4].y, description + ' 宝物未位于马栏下方');
        } else {
          for (const slot of [3, 4, 5]) if (states[slot - 1] !== 'empty') assert(Math.abs(m.cards[slot].width - m.container.width) < 1, description + ' 未恢复全宽');
        }
        results.push(description);
      }
      // 覆盖全部花色和双位/字母点数，并确认恢复整栏时复用原节点。
      await page.evaluate(() => {
        setState(['equipped','equipped','equipped','equipped','empty']);
        window.originalHorses = [3,4].map(slot => { const card = player.getEquips(slot)[0]; return { card, html:card.node.name2.innerHTML, children:[...card.node.name2.childNodes] }; });
        player.node.equips.append(makeCard('slot5',5)); player.$handleEquipChange();
      });
      for (const suit of ['heart','diamond','spade','club']) for (const number of [1,10,11,12,13]) {
        const compact = await page.evaluate(({ suit, number }) => {
          for (const slot of [3,4]) { const card = player.getEquips(slot)[0]; card.suit = suit; card.number = number; card.dataset.suit = suit; }
          refreshEquipLayout(player); refreshEquipLayout(player);
          return [3,4].map(slot => {
            const card = player.getEquips(slot)[0], marker = card.querySelector('.decade-equip-horse');
            const icon = marker.querySelector('.decade-equip-horse-icon');
            const markerBounds = marker.getBoundingClientRect(), iconBounds = icon.getBoundingClientRect();
            const distanceBounds = marker.querySelector('.decade-equip-horse-distance').getBoundingClientRect();
            const numberBounds = marker.querySelector('.decade-equip-horse-number').getBoundingClientRect();
            const suitBounds = marker.querySelector('.decade-equip-horse-suit').getBoundingClientRect();
            return { slot, suit:marker.querySelector('.decade-equip-horse-suit img')?.alt, number:marker.querySelector('.decade-equip-horse-number img')?.alt,
              fits:marker.scrollWidth <= marker.clientWidth, count:card.querySelectorAll('.decade-equip-horse').length, border:getComputedStyle(icon).borderTopWidth,
              iconLeft:iconBounds.left-markerBounds.left, textCenter:(suitBounds.left+distanceBounds.right)/2, remainingCenter:(iconBounds.right+markerBounds.right)/2,
              ordered:iconBounds.right <= suitBounds.left + 0.5 && suitBounds.right <= numberBounds.left + 0.5 && numberBounds.right <= distanceBounds.left + 0.5,
              suitImage:marker.querySelector('.decade-equip-horse-suit img')?.src,
              textStyles:['distance','number'].map(part => { const s=getComputedStyle(marker.querySelector('.decade-equip-horse-'+part)); return { color:s.color, font:s.fontSize, transform:s.transform }; }) };
          });
        }, { suit, number });
        for (const horse of compact) {
          assert.equal(horse.suit, {heart:'♥',diamond:'♦',spade:'♠',club:'♣'}[suit], '紧凑马栏花色错误');
          assert.equal(horse.number, ({1:'A',11:'J',12:'Q',13:'K'})[number] || String(number), '紧凑马栏点数错误');
          assert.equal(horse.count, 1, '重复刷新产生多个马栏展示');
          assert.equal(horse.border, '0px', '马栏图标出现圆圈');
          assert(Math.abs(horse.iconLeft) < 1, '马栏图标未固定靠左');
          assert(horse.ordered, '马栏未按图标、花色、点数、距离排列或发生重叠');
          if (!restoreEffectsOnly) assert(Math.abs(horse.textCenter-horse.remainingCenter) < 1, '马栏文字未在剩余空间居中 ' + JSON.stringify({local,suit,number,textCenter:horse.textCenter,remainingCenter:horse.remainingCenter}));
          assert(horse.suitImage.includes(`/images/suit/${suit}.png`), '未使用对应彩色花色图片');
          for (const style of horse.textStyles) {
            assert.equal(style.color, 'rgb(255, 255, 255)', '马栏文字未统一为白色');
            assert.equal(style.font, '12px', '马栏字号未使用12px');
            assert.equal(style.transform, 'none', '马栏文字被缩放');
          }
          assert(horse.fits, `紧凑马栏溢出 ${local}/${suit}/${number}`);
        }
      }
      const originalsRestored = await page.evaluate(() => {
        player.getEquips(5)[0].remove(); player.$handleEquipChange();
        return originalHorses.every(({card,html,children}) => card.node.name2.innerHTML === html && children.every((child,i) => card.node.name2.childNodes[i] === child));
      });
      assert(originalsRestored, '整栏恢复时原装备内容或节点被替换');
      await page.evaluate(() => setState(['equipped','equipped','equipped','equipped','equipped']));
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(__dirname, local ? 'equip-four-rows-local.png' : 'equip-four-rows-player.png') });
      await page.evaluate(() => setState(['feichu','feichu','feichu','feichu','feichu']));
      await page.waitForTimeout(650);
      const allFonts = await page.evaluate(() => [...player.node.equips.querySelectorAll('.feichu.card')].map(card => [get.equipNum(card), getComputedStyle(card.querySelector('.decade-equip-feichu-label')).fontSize]));
      for (const [slot,font] of allFonts) assert.equal(font, [3,4].includes(slot) ? '12px' : '16px', '全废除状态字号错误');
      await page.screenshot({ path: path.join(__dirname, local ? 'equip-four-rows-disabled-local.png' : 'equip-four-rows-disabled-player.png') });
      await page.evaluate(() => setState(['feichu','feichu','feichu','empty','feichu']));
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(__dirname, local ? 'equip-four-rows-treasure-local.png' : 'equip-four-rows-treasure-player.png') });
      const playerSource = read('extension/十周年UI/src/ui/player-element.js');
      const observerStart = playerSource.indexOf('new MutationObserver(mutations => {');
      const observerEndText = '.observe(a.node.equips, { childList: !0 })';
      const observerEnd = playerSource.indexOf(observerEndText, observerStart) + observerEndText.length;
      const observerSource = playerSource.slice(observerStart, observerEnd).replace('a.node.equips', 'player.node.equips');
      await page.evaluate(observerSource => {
        new Function('player', observerSource)(player);
        setState(['equipped','equipped','equipped','equipped','equipped']);
      }, observerSource);
      // 两种恢复顺序、宝物有无：用生产 observer 自动处理，不手动刷新布局。
      for (const treasure of ['empty','equipped','feichu']) for (const order of [[3,4],[4,3]]) {
        await page.evaluate(treasure => setState(['equipped','equipped','feichu','feichu',treasure]), treasure);
        for (const slot of order) {
          await page.evaluate(slot => { delete player.disabledSlots['equip'+slot]; nativePlayer.$syncDisable.call(player); }, slot);
          await page.waitForFunction(slot => [...player.node.equips.children].some(card => get.equipNum(card) === slot && card.classList.contains('emptyequip') && card.dataset.equipSlot === String(slot)), slot);
        }
        const restoration = await page.evaluate(() => ({ ...measure(), back:ui.equipSolts && [...ui.equipSolts.back.children].map(node => { const r=node.getBoundingClientRect(), s=getComputedStyle(node); return {type:node.dataset.type,x:r.x,y:r.y,width:r.width,height:r.height,display:s.display,image:s.backgroundImage}; }) }));
        assert.equal(restoration.layout, treasure === 'empty' ? 'normal' : 'combined', '依次恢复马栏后布局错误');
        if (local) {
          const defense = restoration.back.find(node => node.type === '2');
          assert(defense.width > 0 && defense.height > 0 && defense.display !== 'none' && defense.image !== 'none', '依次恢复马栏后防御马背景空白');
          assert(Math.abs(defense.y-restoration.cards[3].y) < 2, '恢复后防御马背景与卡槽错行');
          if (order[0] === 3 && treasure !== 'feichu') await page.screenshot({path:path.join(__dirname,treasure === 'empty' ? 'equip-restored-empty-local.png' : 'equip-restored-treasure-local.png')});
        }
        await page.evaluate(() => { player.node.equips.append(makeCard('slot3',3),makeCard('slot4',4)); });
        await page.waitForFunction(() => [3,4].every(slot => [...player.node.equips.children].some(card => get.equipNum(card) === slot && !card.classList.contains('emptyequip') && card.dataset.equipSlot === String(slot))));
        if (treasure !== 'empty') assert(await page.evaluate(() => [3,4].every(slot => !!player.getEquips(slot)[0].querySelector('.decade-equip-horse'))), '恢复栏位后装备马未显示');
      }
      await page.evaluate(() => setState(['equipped','equipped','equipped','equipped','equipped']));
      for (const slot of [3,4]) {
        const actualSweep = await page.evaluate(slot => {
          const nativeTimeout = window.setTimeout;
          let delay;
          window.setTimeout = (callback,milliseconds) => { delay=milliseconds; callback(); return 0; };
          try { actualEquipSweep.content({card:player.getEquips(slot)[0]},player); }
          finally { window.setTimeout=nativeTimeout; }
          return {delay,clip:sweepMessages.at(-1).sprite.clip};
        },slot);
        assert.equal(actualSweep.delay,2000,'标记补充扫光延迟被改变');
        assert(actualSweep.clip,'实际标记补充扫光入口未应用半栏裁切');
        const sweep = await page.evaluate(slot => {
          const sourceSprite = {name:'../../../标记补充/animation/OL装备/FX_PaiJu_ZhuangBei_saoguang',action:'play'};
          const sourcePosition = {scale:0.6,speed:1,x:[0,0.63],y:[0,slot === 3 ? 0.17 : 0.055],parent:player};
          skinSwitch.chukuangWorkerApi.playEffect(sourceSprite,sourcePosition);
          const message = sweepMessages.at(-1), bounds = player.getEquips(slot)[0].getBoundingClientRect();
          return { clip:message.sprite.clip, parent:message.position.parent.boundRect, sourceUnchanged:!sourceSprite.clip && sourcePosition.parent === player,
            bounds:{left:bounds.left,top:bounds.top,bottom:bounds.bottom,width:bounds.width,height:bounds.height}, canvas:document.getElementById('chukuang-canvas').getBoundingClientRect().toJSON() };
        },slot);
        assert(sweep.sourceUnchanged, '兼容层修改了调用方特效参数');
        assert(Math.abs(sweep.parent.width-sweep.bounds.width) < 1, '扫光未跟随半宽卡槽');
        for (const dpr of [1,1.5,2]) {
          const clip = sweep.clip;
          assert(Math.abs(clip.x[1]*sweep.canvas.width*dpr-(sweep.bounds.left-sweep.canvas.left)*dpr) < 1, '扫光横向裁切错误');
          assert(Math.abs(clip.y[1]*sweep.canvas.height*dpr-(sweep.canvas.bottom-sweep.bounds.bottom)*dpr) < 1, '扫光纵向裁切错误');
          assert(Math.abs(clip.width[1]*sweep.canvas.width*dpr-sweep.bounds.width*dpr) < 1, '扫光裁切不是半行宽度');
          assert(Math.abs(clip.height[1]*sweep.canvas.height*dpr-sweep.bounds.height*dpr) < 1, '扫光裁切高度错误');
        }
      }
      const firstSweep = await page.evaluate(() => {
        const canvas = document.getElementById('chukuang-canvas'); canvas.remove();
        const initialize = skinSwitch.chukuangWorkerInit;
        skinSwitch.chukuangWorkerInit = () => { if (!canvas.isConnected) document.body.append(canvas); };
        try {
          skinSwitch.chukuangWorkerApi.playEffect({name:'../../../标记补充/animation/OL装备/FX_PaiJu_ZhuangBei_saoguang'}, {parent:player,x:[0,.63],y:[0,.17]});
          return canvas.isConnected && !!sweepMessages.at(-1).sprite.clip;
        } finally { skinSwitch.chukuangWorkerInit=initialize; }
      });
      assert(firstSweep,'首次扫光在画布创建前未正确设置裁切');
      const untouched = await page.evaluate(() => {
        const api = skinSwitch.chukuangWorkerApi;
        api.playEffect({name:'other-effect'}, {parent:player,x:[0,.63],y:[0,.17]});
        const other = !sweepMessages.at(-1).sprite.clip;
        setState(['equipped','equipped','equipped','equipped','empty']);
        api.playEffect({name:'../../../标记补充/animation/OL装备/FX_PaiJu_ZhuangBei_saoguang'}, {parent:player,x:[0,.63],y:[0,.17]});
        return other && !sweepMessages.at(-1).sprite.clip;
      });
      assert(untouched, '非马栏特效或全宽扫光被改动');
      await page.evaluate(() => setState(['equipped','equipped','equipped','equipped','equipped']));
      // 不手动调用布局 helper，使用生产 MutationObserver 检查失去/获得/废除/恢复。
      await page.evaluate(() => player.getEquips(5)[0].remove());
      await page.waitForFunction(() => player.node.equips.dataset.equipLayout === 'attack');
      await page.evaluate(() => { player.disabledSlots = {equip5:1}; nativePlayer.$syncDisable.call(player); });
      await page.waitForFunction(() => player.node.equips.dataset.equipLayout === 'combined');
      await page.evaluate(() => { player.disabledSlots = {equip4:1,equip5:1}; player.getEquips(4)[0].remove(); nativePlayer.$syncDisable.call(player); });
      await page.waitForFunction(() => player.node.equips.dataset.equipLayout === 'combined');
      await page.evaluate(() => { player.disabledSlots = {equip4:1}; nativePlayer.$syncDisable.call(player); });
      await page.waitForFunction(() => player.node.equips.dataset.equipLayout === 'attack');
      await page.evaluate(() => { player.disabledSlots = {}; nativePlayer.$syncDisable.call(player); });
      await page.waitForFunction(() => player.node.equips.dataset.equipLayout === 'normal');
      const restored = await page.evaluate(() => measure());
      assert(Math.abs(restored.cards[3].width - restored.container.width) < 1, '动态恢复后防御马未全宽');
      await page.evaluate(() => { player.disabledSlots = {equip5:1}; nativePlayer.$syncDisable.call(player); });
      await page.waitForFunction(() => player.node.equips.dataset.equipLayout === 'combined');
      const treasureOnly = await page.evaluate(() => measure());
      assert(Math.abs(treasureOnly.cards[3].width - treasureOnly.container.width / 2) < 1, '仅宝物栏废除时防御马未折叠');
      await page.evaluate(() => { player.disabledSlots = {}; nativePlayer.$syncDisable.call(player); });
      await page.waitForFunction(() => player.node.equips.dataset.equipLayout === 'normal');
      if (local) {
        for (const direction of ['off', 'on']) {
          await page.evaluate(direction => {
            ui.arena.dataset.rightLayout = direction;
            setState(['equipped','equipped','equipped','equipped','equipped']);
            player.getEquips(4)[0].classList.add('selectable','equip-card-selectable','selected');
          }, direction);
          const transform = await page.evaluate(() => getComputedStyle(player.getEquips(4)[0]).transform);
          assert.equal(transform, `matrix(1, 0, 0, 1, ${direction === 'on' ? '10' : '-10'}, 0)`, '选中位移失效');
        }
      }
      const special = await page.evaluate(() => {
        const attack = player.getEquips(4)[0] || makeCard('slot4',4);
        const treasure = player.getEquips(5)[0] || makeCard('slot5',5);
        if (!attack.parentNode) player.node.equips.append(attack);
        if (!treasure.parentNode) player.node.equips.append(treasure);
        attack.classList.add('emptyequip'); attack.classList.remove('hidden'); attack.extraEquip = ['test', 'skill'];
        refreshEquipLayout(player);
        const visibleExtra = player.node.equips.dataset.equipLayout;
        attack.classList.add('hidden'); treasure.classList.add('hidden'); refreshEquipLayout(player);
        const hiddenEmpty = player.node.equips.dataset.equipLayout;
        attack.classList.remove('hidden'); attack.classList.add('feichu'); attack.node.name2.textContent = '装备技能';
        refreshEquipLayout(player);
        return { visibleExtra, hiddenEmpty, preserved:attack.node.name2.textContent };
      });
      assert.equal(special.visibleExtra, 'combined', '可见额外占位应触发折叠');
      assert.equal(special.hiddenEmpty, 'normal', '隐藏空槽不应触发折叠');
      assert.equal(special.preserved, '装备技能', '废除栏位承载的技能内容被覆盖');
    }
    assert.deepEqual(errors, [], 'Browser errors');
    console.log(JSON.stringify({ passed:results.length, scope:loneAttackOnly ? '单独进攻马位置、背景及动态增减防御马；角色与独立装备栏' : restoreEffectsOnly ? '栏位恢复与扫光边界；保留用户文字排版' : horseOnly ? '马栏定位及展示；不检查用户调整的废除文字溢出' : '完整装备栏', errors }, null, 2));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
