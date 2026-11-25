import { ui, lib } from "noname";

// 当前窗口仍缓存旧模块时接入与磁盘相同的实现；不重启或推进规则事件。
export async function installDiscardMotionClockFix() {
 if (window.__xinshaDiscardClockFix) return { installed: true, alreadyInstalled: true };
 if ((ui.thrown || []).some(card => card.getAnimations?.().some(animation => animation.id === 'xinsha-discard-motion' && animation.playState === 'running'))) throw Error('Wait for the active discard flight to finish');
 const motionURL = new URL('../src/ui/discard-motion-xinsha.js?stall-clock=2', import.meta.url);
 const motion = await import(motionURL.href);
 const layoutURL = new URL('../src/core/layout.js', import.meta.url);
 const source = await (await fetch(layoutURL, { cache: 'no-store' })).text();
 const rewritten = source.replace(/from\s*(["'])([^"']+)\1/g, (match, quote, specifier) => {
  if (specifier.endsWith('/discard-motion-xinsha.js')) return `from ${JSON.stringify(motionURL.href)}`;
  return specifier.startsWith('.') ? `from ${JSON.stringify(new URL(specifier, layoutURL).href)}` : match;
 });
 const blob = URL.createObjectURL(new Blob([rewritten], { type: 'text/javascript' }));
 let fresh;
 try { fresh = (await import(blob)).createLayoutModule(); } finally { URL.revokeObjectURL(blob); }
 const layout = decadeUI.layout, before = { updateDiscard: layout.updateDiscard, resize: layout.resize };
 layout.updateDiscard = fresh.updateDiscard;
 const resize = function (...args) {
  const result = before.resize.apply(this, args);
  for (const card of ui.thrown || []) motion.finishXinshaDiscardMotion(card);
  return result;
 };
 layout.resize = resize;
 window.__xinshaDiscardClockFix = { before, updateDiscard: fresh.updateDiscard, resize, motion, style: lib.config.extension_十周年UI_newDecadeStyle };
 return { installed: true, style: lib.config.extension_十周年UI_newDecadeStyle };
}

export async function probeDiscardClock() {
 const old = await import('../src/ui/discard-motion-xinsha.js');
 const { syncXinshaDiscardAnimationTime } = await import('../src/ui/discard-motion-xinsha.js?stall-clock=2');
 const card = document.createElement('div');
 card.style.cssText = 'position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;pointer-events:none;transition:none;transform:translate(0px,0px)';
 document.body.append(card);
 try {
  old.updateXinshaDiscardMotion([{card, transform:'translate(100px,100px)'}]);
  const animation = card.getAnimations()[0];
  const deadline=performance.now()+3000;
  while(animation.startTime === null) {
   if(performance.now()>deadline)throw Error('Discard clock probe needs a visible animation frame');
   await Promise.race([new Promise(requestAnimationFrame),new Promise(r=>setTimeout(r,250))]);
  }
  await new Promise(r => setTimeout(r,35));
  const until=performance.now()+350; while(performance.now()<until){}
  const stale = {time:animation.currentTime, elapsed:performance.now()-animation.startTime, y:new DOMMatrix(getComputedStyle(card).transform).f};
  syncXinshaDiscardAnimationTime(animation);
  const fresh = {time:animation.currentTime, y:new DOMMatrix(getComputedStyle(card).transform).f};
  return {stale,fresh,passed:stale.y<90&&fresh.y===100};
 } finally { old.finishXinshaDiscardMotion(card,false);card.remove(); }
}
