const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
 const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
 try {
  const page = browser.contexts().flatMap(context => context.pages()).find(page => page.url() === 'http://localhost:8089/app.html');
  const result = await page.evaluate(async () => {
   const { game, ui, lib, _status } = await import('./noname.js');
   const rows = [], samples = [], start = performance.now(), restores = [];
   const cards = new Map([...ui.handcards1.children].map(card => [card.style, card]));
   const record = (kind, detail) => { if (rows.length < 2500) rows.push({ t: performance.now() - start, kind, ...detail }); };
   const descriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'transform');
   if (descriptor?.set && descriptor.configurable) {
    const setter = function (value) { const card = cards.get(this); if (card) record('writeTransform', { id: card.cardid, value, stack: new Error().stack }); return descriptor.set.call(this, value); };
    Object.defineProperty(CSSStyleDeclaration.prototype, 'transform', { ...descriptor, set: setter });
    restores.push(() => { if (Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'transform').set === setter) Object.defineProperty(CSSStyleDeclaration.prototype, 'transform', descriptor); });
   }
   const observer = new MutationObserver(records => { for (const mutation of records) if (mutation.target.parentNode === ui.handcards1) record(mutation.attributeName, { id: mutation.target.cardid, old: mutation.oldValue, value: mutation.target.getAttribute(mutation.attributeName) }); });
   observer.observe(ui.handcards1, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class'] });
   try {
    let previous = -100;
    await new Promise(resolve => {
     function sample() {
      const t = performance.now() - start;
      if (t - previous >= 50) {
       previous = t;
       samples.push({ t, event: _status.event.name, selected: ui.selected.cards.map(card => ({ id: card.cardid, inline: card.style.transform, computed: getComputedStyle(card).transform,
        animations: card.getAnimations().map(animation => ({ id: animation.id, time: animation.currentTime, keys: animation.effect.getKeyframes() })) })) });
      }
      if (t < 20000) requestAnimationFrame(sample); else resolve();
     }
     requestAnimationFrame(sample);
    });
   } finally { observer.disconnect(); for (const restore of restores.reverse()) restore(); }
   return { style: lib.config.extension_十周年UI_newDecadeStyle, capturedSetter: !!descriptor?.set, rows, samples };
  });
  fs.writeFileSync(path.join(__dirname, 'hand-selection-watch-live-results.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ rows: result.rows.length, selectedSamples: result.samples.filter(sample => sample.selected.length).length, writers: result.rows.filter(row => row.kind === 'writeTransform').slice(-8) }, null, 2));
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
