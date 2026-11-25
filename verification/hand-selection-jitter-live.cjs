const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
 const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
 try {
  const page = browser.contexts().flatMap(context => context.pages()).find(page => page.url() === 'http://localhost:8089/app.html');
  if (!page) throw new Error('Current noname page not found');
  const pointer = process.argv.includes('--pointer');
  const binding = '__probeHandJitterPointer' + Date.now();
  await page.exposeFunction(binding, async ({ x, y }) => {
   const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.card')?.cardid, { x, y });
   await page.mouse.move(x, y); await page.mouse.click(x, y); return { x, y, hit };
  });
  const syncExternal = process.argv.includes('--sync-external');
  const result = await page.evaluate(async ({ pointer, index, binding, syncExternal }) => {
   const { game, ui, lib, _status } = await import('./noname.js');
   const event = _status.event;
   if (event.name !== 'chooseToUse' || event.player !== game.me || lib.config.auto_confirm || ui.selected.cards.length || ui.selected.targets.length) throw new Error('Selection probe requires idle local chooseToUse with auto_confirm=false');
   const card = game.me.getCards('h').filter(card => card.name === 'sha' && card.classList.contains('selectable'))[index];
   if (!card) throw new Error('Selectable sha missing');
   const before = JSON.stringify(game.players.map(player => [player.playerid, player.hp, player.getCards('hesjx').map(card => card.cardid)]));
   const rows = [], frames = [], restores = [];
   const start = performance.now();
   function record(kind, extra = {}) { if (rows.length < 600) rows.push({ t: performance.now() - start, kind, ...extra }); }
   function wrap(object, key, capture) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    const original = object[key];
    const wrapped = function (...args) { capture.call(this, args); return original.apply(this, args); };
    object[key] = wrapped; restores.push(() => { if (object[key] === wrapped) { if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key]; } });
   }
   wrap(lib.element.Card.prototype, 'updateTransform', function (args) { if (this === card) record('updateTransform', { args, inline: this.style.transform, stack: new Error().stack }); });
   wrap(decadeUI.layout, 'updateHand', function () { record('updateHand', { stack: new Error().stack }); });
   wrap(card, 'animate', function (args) { record('animate', { args, stack: new Error().stack }); });
   const observer = new MutationObserver(records => {
    for (const mutation of records) if (mutation.target === card) record(mutation.attributeName, { old: mutation.oldValue, value: card.getAttribute(mutation.attributeName) });
    if (syncExternal) for (const animation of card.getAnimations()) if (animation.id === 'xinsha-hand-motion') {
     const keys = animation.effect.getKeyframes();
     if (keys.at(-1).transform !== card.style.transform) {
      record('syncExternalTarget', { old: keys.at(-1).transform, target: card.style.transform });
      animation.effect.setKeyframes([keys[0], { ...keys.at(-1), transform: card.style.transform }]);
     }
    }
   });
   observer.observe(card, { attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class'] });
   const inputTypes = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
   const input = event => record('input', { type: event.type, target: event.target.closest?.('.card')?.cardid || event.target.className, dragged: _status.dragged, clicked: _status.clicked, selected: ui.selected.cards.map(card => card.cardid) });
   inputTypes.forEach(type => document.addEventListener(type, input, true));
   let clicked = false;
   try {
    _status.clicked = false;
    if (pointer) {
     const r = card.getClientRects()[0], next = card.nextElementSibling?.getClientRects()[0];
     record('pointerPosition', { rect: r.toJSON(), next: next?.toJSON(), pointer: await window[binding]({ x: r.left + 6, y: r.top + r.height * .65 }) });
    } else { _status.clicked = false; ui.click.card.call(card); }
    clicked = true;
    record('selectionResult', { selected: ui.selected.cards.map(card => card.cardid) });
    await new Promise(resolve => {
     function sample() {
      const r = card.getBoundingClientRect();
      frames.push({ t: performance.now() - start, x: r.x, y: r.y, transform: getComputedStyle(card).transform, inline: card.style.transform,
       animations: card.getAnimations().map(animation => ({ id: animation.id, time: animation.currentTime, state: animation.playState, keys: animation.effect.getKeyframes() })) });
      if (performance.now() - start < 2300) requestAnimationFrame(sample); else resolve();
     }
     requestAnimationFrame(sample);
    });
   } finally {
    observer.disconnect(); for (const restore of restores.reverse()) restore();
    inputTypes.forEach(type => document.removeEventListener(type, input, true));
    if (clicked && _status.event === event && ui.selected.cards.includes(card)) { _status.clicked = false; ui.click.card.call(card); }
    _status.clicked = false;
   }
   await new Promise(resolve => setTimeout(resolve, 500));
   const stable = frames.filter(frame => frame.t > 800);
   return { style: lib.config.extension_十周年UI_newDecadeStyle, syncExternal, card: card.cardid, rows, frames,
    jitter: { x: Math.max(...stable.map(frame => frame.x)) - Math.min(...stable.map(frame => frame.x)), y: Math.max(...stable.map(frame => frame.y)) - Math.min(...stable.map(frame => frame.y)) },
    sameEvent: _status.event === event, sameCards: before === JSON.stringify(game.players.map(player => [player.playerid, player.hp, player.getCards('hesjx').map(card => card.cardid)])), selectedAfter: ui.selected.cards.length };
  }, { pointer, index: Number(process.argv.find(arg => arg.startsWith('--index='))?.split('=')[1] || 0), binding, syncExternal });
  await page.evaluate(binding => { delete window[binding]; delete window.__probeHandJitterPointer; }, binding);
  fs.writeFileSync(path.join(__dirname, `hand-selection-jitter-live${pointer ? '-pointer' : ''}${syncExternal ? '-synced' : ''}-results.json`), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, rows: result.rows.slice(0, 18), frames: result.frames.filter((_, index) => index % 50 === 0) }, null, 2));
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
