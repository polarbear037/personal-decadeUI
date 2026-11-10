const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const extension = path.resolve(__dirname, '..');
const app = path.resolve(extension, '../..');
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname === '/fixture') return response.setHeader('Content-Type', 'text/html; charset=utf-8'), response.end('<!doctype html><meta charset="utf-8"><body data-style="onlineUI"><div id="arena" class="decadeUI"></div>');
  if (pathname === '/favicon.ico') return response.writeHead(204).end();
  const file = path.resolve(app, '.' + pathname);
  if (!file.startsWith(app + path.sep) || !fs.existsSync(file)) return response.writeHead(404).end();
  response.setHeader('Content-Type', ({ '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1000, height: 650 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin + '/fixture');
    for (const stylesheet of ['layout/default/layout.css', 'extension/十周年UI/src/styles/player4.css', 'extension/十周年UI/src/styles/card.css', 'extension/十周年UI/src/styles/layout.css', 'extension/十周年UI/src/styles/equip.css']) await page.addStyleTag({ url: origin + '/' + stylesheet });
    await page.addStyleTag({ content: 'body{background:#29251f}#arena{position:absolute;inset:0}.player{position:absolute!important;top:70px!important;left:70px!important;width:200px!important;height:250px!important}.equips-wrap{height:200px!important;bottom:80px!important;right:100px!important}' });
    await page.evaluate(() => {
      window.lib = { assetURL: '/' };
      window.decadeUIPath = '/extension/十周年UI/';
      window.get = { equipNum: card => card.slot, suit: card => card.suit, number: card => card.number, strNumber: number => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[number] || String(number) };
      window.buildPlayer = local => {
        document.querySelector('#arena').replaceChildren();
        const player = document.createElement('div'); player.className = 'player';
        const equips = document.createElement('div'); equips.className = 'equips';
        player.node = { equips }; player.append(equips); document.querySelector('#arena').append(player);
        if (local) { const wrap = document.createElement('div'); wrap.className = 'equips-wrap'; wrap.append(equips); document.querySelector('#arena').append(wrap); }
        for (const slot of [3, 4, 5]) {
          const card = document.createElement('div'); card.className = 'card'; card.slot = slot; card.suit = 'spade'; card.number = 5;
          const name2 = document.createElement('div'); name2.className = 'name2'; name2.textContent = '原装备内容'; card.node = { name2 }; card.append(name2); equips.append(card);
        }
        window.player = player;
      };
    });
    const source = fs.readFileSync(path.join(extension, 'src/ui/equip-layout.js'), 'utf8').replace(/^import[^;]*;\s*/gm, '').replace(/^export[^;]*;\s*/gm, '');
    await page.addScriptTag({ content: source + '\nwindow.refreshEquipLayout = refreshEquipLayout;' });
    let passed = 0;
    for (const local of [false, true]) {
      await page.evaluate(local => buildPlayer(local), local);
      for (const suit of ['heart', 'diamond', 'spade', 'club']) for (let number = 1; number <= 13; number++) {
        await page.evaluate(({ suit, number }) => {
          for (const card of player.node.equips.children) { card.suit = suit; card.number = number; }
          refreshEquipLayout(player); refreshEquipLayout(player);
        }, { suit, number });
        await page.waitForFunction(() => [...player.querySelectorAll('.decade-equip-horse img'), ...document.querySelectorAll('.equips-wrap .decade-equip-horse img')].every(image => image.complete && image.naturalWidth > 0));
        const horses = await page.evaluate(() => [...player.node.equips.querySelectorAll('.decade-equip-horse')].map(marker => ({
          images: [...marker.querySelectorAll('img')].map(image => ({ src: image.src, loaded: image.complete && image.naturalWidth > 0, width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height, visible: getComputedStyle(image).display !== 'none' })),
          text: marker.textContent, overflow: marker.scrollWidth > marker.clientWidth, width: marker.clientWidth, scroll: marker.scrollWidth, slot: marker.dataset.slot,
          order: [...marker.children].map(node => node.className), count: marker.querySelectorAll('img').length,
        })));
        assert.equal(horses.length, 2);
        for (const horse of horses) {
          const color = ['heart', 'diamond'].includes(suit) ? 'r' : 'b';
          assert.equal(horse.count, 2, '花色点数未全部使用图片或重复创建');
          assert(horse.images[0].src.endsWith(`/images/suit/${suit}.png`), '花色图片错误');
          assert(horse.images[1].src.endsWith(`/images/number/${color}${number}.png`), '点数图片或颜色错误');
          assert(horse.images.every(image => image.loaded && image.visible && image.width > 0 && image.height > 0), '图片未加载或不可见');
          assert.equal(horse.text, horse.slot === '3' ? '+1' : '-1', '花色点数仍存在文字绘制');
          assert.deepEqual(horse.order, ['decade-equip-horse-icon', 'decade-equip-horse-suit', 'decade-equip-horse-number', 'decade-equip-horse-distance']);
          assert(!horse.overflow, '图片坐骑栏溢出 ' + JSON.stringify({ local, suit, number, horse }));
        }
        passed++;
      }
      await page.screenshot({ path: path.join(__dirname, local ? 'equip-horse-images-local.png' : 'equip-horse-images-player.png') });
      await page.evaluate(() => {
        player.node.equips.lastElementChild.remove(); refreshEquipLayout(player);
      });
      assert.equal(await page.locator('.decade-equip-horse').count(), 0, '取消同行布局后图片未清理');
    }
    assert.deepEqual(errors, [], 'Browser errors');
    console.log(JSON.stringify({ passed, scope: '角色及独立装备栏，四花色、1至13点、图片加载和布局恢复', errors }, null, 2));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
