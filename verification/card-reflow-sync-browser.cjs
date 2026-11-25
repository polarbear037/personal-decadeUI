const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const baseline = process.argv.includes('--baseline');
const result = { baseline, cases: [], errors: [] };

// 对照只恢复两项旧行为：手牌重用抬升时间轴、弃牌各走各的剩余时长。
function baselineSource(filename) {
 const source = fs.readFileSync(path.join(__dirname, '../src/ui', filename), 'utf8');
 if (filename.startsWith('discard')) return source.replace('duration: reflow ? reflowDuration : duration', 'duration');
 return source.replace(/function applyHandMotions\(placements\) \{[\s\S]*?(?=export function clearXinshaHandMotion)/, `function applyHandMotions(placements) {
  for (const {card, transform, selected} of placements) {
   const previous = motions.get(card);
   if (previous && previous.selected === selected) {
    if (previous.animation && previous.target !== transform) {
     previous.target = transform;
     previous.animation.effect.setKeyframes([{transform:previous.from},{transform}]);
    }
    card.style.transform = transform;
    continue;
   }
   if (!previous && !selected) { motions.set(card,{selected}); card.style.transform=transform; continue; }
   const from = getComputedStyle(card).transform;
   previous?.dispose?.();
   const saved=card.style.getPropertyValue('transition-property'), priority=card.style.getPropertyPriority('transition-property');
   card.style.setProperty('transition-property','opacity, left, top'); card.style.transform=transform;
   const animation=card.animate([{transform:from},{transform}],{duration:800/3,easing:'cubic-bezier(0.39, 0.575, 0.565, 1)',fill:'both'});
   animation.pause();
   const state={selected,animation,target:transform,from,saved,priority}; motions.set(card,state);
   let frame=requestAnimationFrame(()=>{frame=0;if(!card.isConnected)return state.dispose();animation.play();animation.startTime=performance.now();});
   state.dispose=()=>{
    if(frame)cancelAnimationFrame(frame);
    animation.onfinish=animation.oncancel=null;animation.cancel();
    if(saved)card.style.setProperty('transition-property',saved,priority);else card.style.removeProperty('transition-property');
    delete state.animation;delete state.dispose;
   };
   animation.onfinish=animation.oncancel=state.dispose;
  }
 }
\n`);
}

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'], extension_十周年UI_newDecadeStyle: 'othersOff', touchscreen: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await dependencies(page);
  // 当前本体已有 ESM 转换过的依赖，旧夹具不能再追加一次 __require 导出。
  await page.route('**/node_modules/.pnpm/**', async route => {
   const filename = path.resolve(__dirname, '../../..', '.' + decodeURIComponent(new URL(route.request().url()).pathname));
   if (fs.existsSync(filename)) {
    const source = fs.readFileSync(filename, 'utf8');
    if (/export\s*\{[^}]*__require/.test(source)) return route.fulfill({ contentType: 'text/javascript', body: source });
   }
   return route.fallback();
  });
  if (baseline) for (const filename of ['handcard-motion-xinsha.js', 'discard-motion-xinsha.js']) {
   await page.route('**/' + filename, route => route.fulfill({ contentType: 'text/javascript', body: baselineSource(filename) }));
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
  const cases = await page.evaluate(async () => {
   const { game, ui, lib, _status } = await import('/noname.js');
   const motion = await import('/extension/十周年UI/src/ui/discard-motion-xinsha.js');
   game.pause(); game.resume = () => {};
   game.me = game.players[0]; game.me.init('sunquan');
   ui.arena.classList.remove('choose-character');
   const phase = game.createEvent('chooseToUse', false); phase.player = game.me;
   _status.eventManager.setStatusEvent(phase, true);
   const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
   const read = card => new DOMMatrix(getComputedStyle(card).transform).e;
   const rows = [];
   async function sample(kind, cards, before, after, extra = {}) {
    const moving = cards.map((card, i) => ({ card, from: before[i], to: after[i] })).filter(row => Math.abs(row.to - row.from) > 3);
    const animations = moving.map(({card}) => card.getAnimations().find(animation => animation.id === 'xinsha-discard-motion' || animation.id === 'xinsha-hand-motion'));
    const samples = [];
    let starts;
    const until = performance.now() + 450;
    await new Promise(resolve => {
     const tick = () => {
      starts ??= animations.map(animation => animation?.startTime ?? null);
      samples.push(moving.map(({card,from,to}) => (read(card) - from) / (to - from)));
      if (performance.now() < until) requestAnimationFrame(tick); else resolve();
     }; requestAnimationFrame(tick);
    });
    const interior = samples.filter(values => Math.min(...values) > .03 && Math.max(...values) < .97);
    rows.push({ kind, count: moving.length, duration: animations.map(a => a?.effect.getTiming().duration ?? null), starts, maxProgressSpread: Math.max(0, ...interior.map(values => Math.max(...values) - Math.min(...values))), intermediateFrames: interior.length, finalError: Math.max(...moving.map(({card,to}) => Math.abs(read(card) - to))), ...extra });
   }
   for (const mode of ['settled', 'selected', 'in-flight']) {
    ui.selected.cards = []; ui._handcardHover = null;
    game.me.getCards('h').forEach(card => card.remove());
    const cards = Array.from({length: 10}, (_, i) => game.createCard('sha', 'heart', i + 1));
    game.me.directgain(cards); decadeUI.layout.updateHand(); await wait(600);
    if (mode !== 'settled') {
     cards[4].classList.add('selected'); ui.selected.cards = [cards[4]]; cards[4].updateTransform(true);
     await wait(mode === 'selected' ? 400 : 85);
    }
    await new Promise(requestAnimationFrame);
    const survivors = cards.filter((card, i) => i !== 1), before = survivors.map(read);
    cards[1].remove(); decadeUI.layout.updateHand();
    await sample('hand-' + mode, survivors, before, survivors.map(card => new DOMMatrix(card.style.transform).e));
   }
   ui.selected.cards = [];
   for (const mode of ['settled', 'mixed-flight', 'blocked']) {
    ui.thrown.forEach(card => { motion.finishXinshaDiscardMotion(card, false); card.remove(); }); ui.thrown = [];
    const cards = Array.from({length: 6}, (_, i) => {
     const card = game.createCard('shan', 'spade', i + 1); card.classList.add('thrown'); ui.arena.append(card); return card;
    });
    ui.thrown = cards; decadeUI.layout.updateDiscard(); await wait(400);
    if (mode !== 'settled') {
     // 一个旧牌仍在飞，其余旧牌已到位；清掉第一张时全部须一同右移。
     motion.updateXinshaDiscardMotion([{ card: cards[2], transform: `translate(${cards[2].tx - 30}px,${cards[2].ty}px) scale(${new DOMMatrix(cards[2].style.transform).a})` }]);
     await wait(95);
    }
    await new Promise(requestAnimationFrame);
    if (mode === 'blocked') { const until = performance.now() + 150; while (performance.now() < until) {} }
    // 与生产重排一致，先同步旧动画时钟再取绘制起点用于归一化。
    for (const card of cards) for (const animation of card.getAnimations()) if (animation.id === 'xinsha-discard-motion') motion.syncXinshaDiscardAnimationTime(animation);
    const survivors = cards.slice(1), before = survivors.map(read);
    let early = 0; survivors.forEach(card => card.addEventListener('webkitTransitionEnd', () => early++));
    cards[0].remove(); decadeUI.layout.updateDiscard();
    await sample('discard-' + mode, survivors, before, survivors.map(card => new DOMMatrix(card.style.transform).e), { early });
   }
   return rows;
  });
  result.cases = cases;
  console.log(JSON.stringify(cases.map(({kind, count, maxProgressSpread, finalError}) => ({kind, count, maxProgressSpread, finalError})), null, 2));
  assert.deepEqual(result.errors, []);
  if (baseline) assert(cases.some(row => row.maxProgressSpread > .12), '旧代码必须复现不同步');
  else for (const row of cases) {
   assert(row.count >= 3, row.kind + ': 至少三张牌移动');
   if (row.duration.some(duration => duration > 1)) assert(row.intermediateFrames >= 1, row.kind + ': 真实途中帧');
   assert(row.maxProgressSpread < .04, row.kind + ': 同帧移动进度一致');
   assert(row.finalError < .02, row.kind + ': 到位');
   if (row.starts.every(start => start !== null)) assert.equal(new Set(row.starts).size, 1, row.kind + ': 共用起播时间');
   if (row.kind.startsWith('discard')) assert.equal(row.early, 0, '途中重排不得提前通知结算');
  }
  console.log(baseline ? 'CARD_REFLOW_DESYNC_REPRODUCED' : 'CARD_REFLOW_SYNC_OK');
 } finally {
  fs.writeFileSync(path.join(__dirname, `card-reflow-sync-${baseline ? 'before' : 'after'}-results.json`), JSON.stringify(result, null, 2) + '\n');
  await browser.close(); server.close();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
