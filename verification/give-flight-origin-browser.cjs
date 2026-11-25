const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const style of ['othersOff', 'onlineUI', 'on', 'off']) {
      Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'],
        touchscreen: false, extension_十周年UI_newDecadeStyle: style });
      const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await dependencies(page);
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      const rows = await page.evaluate(async () => {
        const { game, ui, lib, _status } = await import('/noname.js');
        const { createContentGain, createContentLose } = await import('/extension/十周年UI/src/overrides/content.js');
        game.pause(); game.resume = () => {};
        game.me = game.players[0];
        game.me.init('sunquan');
        const target = game.players[1]; target.init('caocao');
        game.me.playerid ||= 'give-probe-source';
        target.playerid ||= 'give-probe-target';
        game.playerMap[game.me.playerid] = game.me;
        game.playerMap[target.playerid] = target;
        for (const dialog of [...ui.dialogs]) dialog.close();
        ui.arena.classList.remove('choose-character');
        _status.auto = false; _status.over = false;
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const rect = card => {
          const r = card.getBoundingClientRect();
          return { x: r.left, y: r.top, width: r.width, height: r.height };
        };
        const rows = [], clones = [];
        let broadcastLose;
        const lose = createContentLose([null, null])[1];
        const gain = createContentGain([null, null])[0];
        for (const zoom of [1, 1.5]) {
          document.body.style.zoom = zoom;
          decadeUI.layout.resize();
          for (const scenario of ['attached', 'give', 'giveAuto', 'selected', 'broadcast', 'handcards2', 'scroll']) {
            game.me.getCards('hs').forEach(card => card.remove());
            const card = game.createCard('sha', 'heart', 8);
            game.me.directgain([card], false);
            decadeUI.layout.updateHand();
            await wait(550);
            if (scenario === 'handcards2') {
              const hand = game.me.node.handcards2;
              if (!hand.isConnected) game.me.node.handcards1.parentNode.append(hand);
              hand.style.setProperty('display', 'block', 'important');
              hand.append(card);
            }
            if (scenario === 'scroll') {
              card.parentNode.style.width = '100px';
              card.style.transform = 'translate(260px,15px) scale(1)';
              card.parentNode.scrollLeft = 120;
            }
            if (scenario === 'selected') {
              card.classList.add('selected');
              card._originProbe = card.animate([{ transform: getComputedStyle(card).transform }, { transform: 'translate(260px,-40px) scale(1.2)' }], { duration: 1000, fill: 'both' });
              card._originProbe.pause(); card._originProbe.currentTime = 230;
            }
            await wait(30);
            const source = rect(card), previous = new Set(ui.arena.children);
            if (!source.width || !source.height) throw new Error(`Invisible source: ${scenario}`);
            const parent = { name: 'gain' };
            if (scenario === 'broadcast') {
              // 重新编译生产广播回调，确保离开模块闭包后仍能读取同一个公共位置工具。
              if (!broadcastLose) throw new Error('Lose broadcast missing');
              new Function('game', 'ui', `return (${broadcastLose})`)(game, ui)(game.me, [card], ui.cardPile.childNodes.length);
              game.me.$give([card], target, false, false);
            } else if (scenario === 'attached' || scenario === 'handcards2' || scenario === 'scroll') {
              game.me.$give([card], target, false, false);
            } else {
              // 执行生产 lose/gain 步骤：真实位置保存后实体缩小、移走、入对方手牌，最后才 $give。
              const event = { cards: [card], vcard_map: new Map(), position: ui.special, animate: false, getParent: () => parent };
              const originalBroadcast = game.broadcast;
              game.broadcast = function (fn, ...args) {
                if (typeof fn === 'function' && fn.toString().includes('captureHandCardPosition')) broadcastLose = fn.toString();
                return originalBroadcast.call(this, fn, ...args);
              };
              try { await lose(event, null, game.me); }
              finally { game.broadcast = originalBroadcast; }
              card._originProbe?.cancel();
              const gainEvent = { name: 'gain', player: target, cards: [card], gaintag: [], source: game.me,
                losing_map: { [game.me.playerid]: [[card], [card], []] }, animate: scenario === 'giveAuto' ? 'giveAuto' : 'give', log: false };
              _status.eventManager.setStatusEvent(gainEvent, true);
              await gain(gainEvent, null, target);
            }
            const clone = [...ui.arena.children].find(node => !previous.has(node) && node.classList.contains('gainingcard'));
            if (!clone) throw new Error('Give clone missing');
            rows.push({ zoom, scenario, source, start: rect(clone) });
            clones.push(clone);
            card._originProbe?.cancel();
            card.remove();
            game.me.node.handcards1.style.removeProperty('width');
            game.me.node.handcards1.scrollLeft = 0;
          }
        }
        await wait(1400);
        rows.push({ cleanup: clones.every(card => !card.isConnected) });
        return rows;
      });
      for (const row of rows) {
        if ('cleanup' in row) assert.equal(row.cleanup, true);
        else for (const key of Object.keys(row.source)) assert.ok(Math.abs(row.source[key] - row.start[key]) < .1,
          `${style}/${row.zoom}/${row.scenario}/${key}: ${row.source[key]} -> ${row.start[key]}`);
      }
      assert.deepEqual(errors, []);
      results.push({ style, rows, errors });
      await page.close();
      console.log(`GIVE_ORIGIN_OK ${style}: attached, lose/gain, giveAuto, selected, serialized broadcast, second hand, scroll; zoom 1/1.5`);
    }
    fs.writeFileSync(path.join(__dirname, 'give-flight-origin-results.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
