const fs = require('node:fs');
const path = require('node:path');
const { installFixture } = require('../../雷的ol/verification/wugu-beautify-browser.cjs');
const { server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 865 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await installFixture(page, origin);
    await page.addScriptTag({ content: script('extension/雷的ol/utils/wuguBeautify.js', 'installWuguBeautify();') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/layout-utils.js', 'window.getDrawStackStart=getDrawStackStart;window.realLayoutDrawCards=e;') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/utils/core.js', 'decadeUI.delayRemoveCards=o;') });
    const filename = process.env.WUGU_FLIGHT_BEFORE || process.env.WUGU_CURVE_BEFORE
      ? path.resolve(__dirname, process.env.WUGU_CURVE_BEFORE ? '../.codex-tmp/wugu-gain-curve-20261024/card-movement-online.js.before' : '../.codex-tmp/wugu-flight-20261024/card-movement-online.js.before')
      : null;
    const movement = filename
      ? fs.readFileSync(filename, 'utf8').replace(/^import[^;]*;\s*/gm, '').replace(/^export\s*\{[^}]*\};?\s*/gm, '')
      : null;
    const expose = 'window.movement={playerGain2,playerDirectgain,playerDraw};';
    await page.addScriptTag({ content: movement ? '(function(){' + movement + expose + '})();' : script('extension/十周年UI/src/overrides/player/card-movement-online.js', expose) });
    await page.evaluate(() => {
      lib.config.sort_card = () => 1;
      get.is.singleHandcard = () => true;
      get.is.mobileMe = () => false;
      HTMLDivElement.prototype.fix = function () { clearTimeout(this.timeout); delete this.timeout; delete this.destiny; this.classList.remove('removing'); return this; };
      window.framesToStart = [];
      const bounds = { cardWidth: 108, cardHeight: 150, cardScale: .8, updated: true,
        check() { this.width = ui.arena.offsetWidth; this.height = ui.arena.offsetHeight; },
        update() { this.check(); } };
      decadeUI.boundsCaches = { arena: bounds }; bounds.check();
      decadeUI.queueNextFrameTick = (callback, context) => framesToStart.push(() => callback.call(context));
      decadeUI.layoutDrawCards = (cards, player, center, options) => realLayoutDrawCards(cards, player, center, decadeUI.boundsCaches, options);
      const handWrap = ui.create.div('.hand-wrap', ui.arena);
      const handContainer = ui.create.div('.hand-cards', handWrap);
      const mainHand = ui.create.div('.handcards', handContainer);
      ui.me = handWrap; ui.handcards1Container = handContainer; ui.handcards1 = mainHand;
      const makeRecipient = (local, left, top) => {
        const player = ui.create.div('.player', ui.arena);
        player.style.cssText = `left:${left}px;top:${top}px;width:160px;height:220px;z-index:4;background:#504231`;
        player.name = local ? 'caocao' : 'liubei'; player.group = local ? 'wei' : 'shu';
        player.dataset.position = local ? '0' : '1'; player.playerid = local ? 'me' : 'remote';
        const hiddenHand = ui.create.div('.handcards', player); hiddenHand.style.display = 'none';
        player.node = { handcards1: local ? mainHand : hiddenHand, handcards2: ui.create.div('', player), avatar: { style: { backgroundImage: `url("${lib.assetURL}image/character/${player.name}.jpg")` } } };
        player.getName = () => lib.translate[player.name]; player.isUnseen = () => false;
        player.checkBoundsCache = () => {
          const r = player.getBoundingClientRect(), a = ui.arena.getBoundingClientRect();
          const zoom = a.width / ui.arena.offsetWidth;
          Object.assign(player, { cacheLeft: (r.left - a.left) / zoom, cacheTop: (r.top - a.top) / zoom, cacheWidth: r.width / zoom, cacheHeight: r.height / zoom });
        };
        player.getCards = () => [...player.node.handcards1.children, ...player.node.handcards2.children];
        player.update = () => {};
        player.directgain = movement.playerDirectgain;
        player.$gain2 = movement.playerGain2;
        player.chooseButton = () => { const next = { set: () => next, forResult: async () => ({ links: [wuguDialog.buttons[0].link] }) }; return next; };
        return player;
      };
      window.localRecipient = makeRecipient(true, 1050, 590);
      window.remoteRecipient = makeRecipient(false, 970, 90);
      game.me = localRecipient; game.players = [localRecipient, remoteRecipient];
      decadeUI.layoutHand = () => {
        [...mainHand.children].forEach((card, index) => {
          card.classList.remove('drawinghidden');
          card.style.left = '0px'; card.style.top = '0px';
          card.style.transform = `translate(${100 + index * 60}px,0px) scale(.8)`;
        });
      };
      ui.updatehl = () => decadeUI.layoutHand();
      const existing = ui.create.card(mainHand); existing.init(['club', 9, 'sha']);
      window.existingHandCard = existing;
      decadeUI.layoutHand();
      // 和生产布局一致的起点，接收者 DOM 仅提供可测量的目标区域。
      bounds.check();
    });
    for (const zoom of [1, 1.5]) for (const local of [false, true]) for (const arrivalFirst of [false, true]) {
      const result = await page.evaluate(async ({ zoom, local, arrivalFirst }) => {
        document.body.style.zoom = zoom;
        const player = local ? localRecipient : remoteRecipient;
        player.node.handcards1.querySelectorAll('.card').forEach(card => { if (card !== existingHandCard) card.remove(); });
        await createWugu(7);
        const selected = wuguDialog.buttons[0];
        const card = selected.link;
        const sourceRect = selected.getBoundingClientRect();
        const source = { x: sourceRect.x, y: sourceRect.y, width: sourceRect.width, height: sourceRect.height };
        player.gain = gained => {
          player.gained = gained;
          if (arrivalFirst) player.directgain([gained], false);
          return Promise.resolve();
        };
        await takeWugu(player);
        const waitingCount = ui.arena.querySelectorAll(':scope > .gainingcard').length;
        if (!arrivalFirst) player.directgain([card], false);
        const flights = [...ui.arena.querySelectorAll(':scope > .gainingcard')];
        const flight = flights[0];
        if (!flight) throw new Error('Wugu flight was not created');
        const rect = flight.getBoundingClientRect();
        const first = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, transform: flight.style.transform };
        const initial = { x: flight.tx, y: flight.ty };
        const sourceRetained = selected.isConnected;
        const entityHidden = local ? getComputedStyle(card).visibility === 'hidden' : null;
        const handLayer = Number(getComputedStyle(ui.me).zIndex);
        const flightLayer = Number(getComputedStyle(flight).zIndex);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const held = flight.getBoundingClientRect();
        const noFlashWhileQueued = Math.abs(held.x - first.x) < .1 && Math.abs(held.y - first.y) < .1;
        player.$gain2(card, undefined, wuguDialog.videoId);
        const deduped = ui.arena.querySelectorAll(':scope > .gainingcard').length === 1;
        let expected;
        if (local) {
          decadeUI.layoutHand();
          const r = card.getBoundingClientRect(), a = ui.arena.getBoundingClientRect();
          const scaleX = a.width / ui.arena.offsetWidth;
          const scaleY = a.height / ui.arena.offsetHeight;
          expected = { x: (r.left - a.left) / scaleX + (r.width / scaleX - 108) / 2, y: (r.top - a.top) / scaleY + (r.height / scaleY - 150) / 2 };
        } else {
          const probe = document.createElement('div');
          decadeUI.layoutDrawCards([probe], player, false, { compact: true });
          expected = { x: probe.tx, y: probe.ty };
        }
        const samples = [];
        framesToStart.splice(0).forEach(callback => callback());
        await new Promise(resolve => {
          const started = performance.now();
          const sample = () => {
            samples.push({ x: flight.tx, y: flight.ty });
            if (performance.now() - started < 490) requestAnimationFrame(sample);
            else resolve();
          };
          requestAnimationFrame(sample);
        });
        const settled = { x: flight.tx, y: flight.ty };
        const localClean = !local || !flight.isConnected && getComputedStyle(card).visibility !== 'hidden' && getComputedStyle(card).opacity === '1';
        await new Promise(resolve => setTimeout(resolve, 400));
        const cleaned = !flight.isConnected;
        const result = { zoom, local, arrivalFirst, waitingCount, count: flights.length, source, first, initial, expected, settled, samples, sourceRetained, entityHidden, flightLayer, handLayer, noFlashWhileQueued, deduped, localClean, cleaned };
        await closeWugu();
        return result;
      }, { zoom, local, arrivalFirst });
      assert.equal(result.count, 1);
      if (!arrivalFirst) assert.equal(result.waitingCount, 0, 'gain2 waits for the real card to enter hand');
      assert.ok(Math.abs(result.source.x - result.first.x) < 1 && Math.abs(result.source.y - result.first.y) < 1, 'first connected paint must start at selected button: ' + JSON.stringify({ zoom, local, arrivalFirst, source: result.source, first: result.first }));
      assert.ok(Math.abs(result.source.width - result.first.width) < 1 && Math.abs(result.source.height - result.first.height) < 1, 'source visual scale retained');
      assert.equal(result.noFlashWhileQueued, true);
      assert.equal(result.sourceRetained, true);
      assert.equal(result.deduped, true);
      assert.equal(result.cleaned, true);
      assert.equal(result.localClean, true);
      if (local) {
        assert.equal(result.entityHidden, true);
        assert.ok(result.flightLayer < result.handLayer, 'local flight travels behind the hand layer');
        const maxY = Math.max(...result.samples.map(point => point.y));
        assert.ok(maxY <= Math.max(result.initial.y, result.expected.y) + 1, 'local gain curve must not fly below the hand endpoint: ' + JSON.stringify({ zoom, arrivalFirst, maxY, endpointY: result.expected.y }));
      }
      assert.ok(Math.abs(result.settled.x - result.expected.x) < 1 && Math.abs(result.settled.y - result.expected.y) < 1, 'flight reaches the correct recipient: ' + JSON.stringify(result));
      let curveSamples = 0;
      for (const point of result.samples) {
        const linear = (point.x - result.initial.x) / (result.expected.x - result.initial.x);
        if (!(linear > .01 && linear < .99)) continue;
        const progress = local ? Math.sqrt(linear) : 1 - Math.sqrt(1 - linear);
        const controlY = local ? result.expected.y : result.expected.y + 108;
        const y = (1 - progress) ** 2 * result.initial.y + 2 * (1 - progress) * progress * controlY + progress ** 2 * result.expected.y;
        assert.ok(Math.abs(point.y - y) < .1, 'uses the gain curve for local hand and draw curve for remote player: ' + JSON.stringify({ zoom, local, arrivalFirst, initial: result.initial, end: result.expected, actualEnd: result.settled, point, expectedY: y }));
        curveSamples++;
      }
      assert.ok(curveSamples >= 5, 'actual requestAnimationFrame curve samples');
      results.push({ zoom, local, arrivalFirst, curveSamples, first: result.first, cleaned: result.cleaned });
    }
    assert.deepEqual(errors, []);
    console.log('WUGU_FLIGHT_BROWSER_OK', JSON.stringify(results));
  } finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
