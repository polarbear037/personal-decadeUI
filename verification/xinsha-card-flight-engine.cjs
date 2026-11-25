const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/ui/card-transfer-motion-xinsha.js'), 'utf8');
class Matrix {
  constructor(value) {
    const n = value.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g)?.map(Number);
    if (value.startsWith('matrix(')) [this.a, this.b, this.c, this.d, this.e, this.f] = n;
    else if (value.startsWith('translate(')) { [this.e, this.f, this.a, this.d = this.a] = n; }
    else { this.a = this.d = 1; this.e = this.f = 0; }
  }
}
const lib = { config: { extension_十周年UI_newDecadeStyle: 'othersOff' } }, game = { me: {} };
const frames = [], removals = [], motions = [];
const context = vm.createContext({ lib, game, DOMMatrix: Matrix, Math, performance: { now: () => 901 },
  getComputedStyle: c => ({ transform: c.style.transform }), requestAnimationFrame: f => frames.push(f),
});
vm.runInContext(source.replace(/^import[^\n]*\n/, '').replace('export function', 'function'), context);
function card() {
  const properties = new Map([['transition-property', ['transform, opacity', 'important']]]);
  return { isConnected: true, remove() { this.isConnected = false; }, style: { transform: 'matrix(0.8,0,0,0.8,20,40)',
    getPropertyValue: k => properties.get(k)?.[0] || '', getPropertyPriority: k => properties.get(k)?.[1] || '',
    setProperty: (k, v, p) => properties.set(k, [v, p || '']), removeProperty: k => properties.delete(k),
  }, animate(keyframes, options) {
    const motion = { keyframes, options, pause() { this.paused = true; }, play() { this.played = true; }, cancel() { this.cancelled = true; } };
    motions.push(motion); return motion;
  } };
}
const dui = { layoutDrawCards(cards) { cards.forEach(c => c.style.transform = 'translate(420px,240px) scale(0.9)'); }, delayRemoveCards(...args) { removals.push(args); } };
function move(cards, player, self) { context.cards = cards; context.player = player; context.dui = dui; context.self = self; vm.runInContext('moveXinshaCardsToSeat(cards,player,dui,self)', context); }
for (const self of [false, true]) {
  const cards = [card(), card()]; move(cards, {}, self);
  const scheduledBefore = removals.length;
  const pair = motions.slice(-2), expectedDuration = self ? 600 : 1300 / 3;
  assert.equal(pair[0].options.duration, expectedDuration);
  assert.equal(pair[0].currentTime, 0); assert(pair[0].paused && !pair[0].played);
  assert.equal(cards[0].style.getPropertyValue('transition-property'), 'transform, opacity');
  assert.equal(cards[0].style.getPropertyPriority('transition-property'), 'important');
  const mid = new Matrix(pair[0].keyframes[60].transform);
  assert(Math.abs(mid.e - (20 + 400 * (1 - Math.cos(Math.PI / 4)))) < 1e-9);
  assert(Math.abs(mid.a - 0.85) < 1e-9);
  const end = new Matrix(pair[0].keyframes.at(-1).transform);
  assert(Math.abs(end.e - 420) < 1e-9 && Math.abs(end.f - 240) < 1e-9);
  frames.shift()();
  assert(pair.every(m => m.played && m.startTime === 901));
  assert.equal(removals.length, scheduledBefore, 'no wall-clock removal scheduled while flight is unfinished');
  pair.forEach((m, index) => { m.onfinish(); assert(m.cancelled); assert.equal(removals.at(-1)[0][0], cards[index]); assert.equal(removals.at(-1)[1], 100); });
}
for (const style of ['othersOff', 'onlineUI', 'on']) {
  lib.config.extension_十周年UI_newDecadeStyle = style;
  for (const local of [false, true]) {
    const count = motions.length;
    move([card()], local ? game.me : {}, false);
    if (style === 'othersOff' && !local) frames.shift()();
    else { assert.equal(motions.length, count); assert.equal(removals.at(-1)[1], 460); }
  }
}
lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
const removed = card(); move([removed], {}, false); removed.isConnected = false; frames.shift()(); assert(motions.at(-1).cancelled);
const changed = card(); move([changed], {}, false); lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI'; frames.shift()(); assert.equal(changed.isConnected, false);
let maxError = 0;
for (let i = 0; i < 120; i++) for (let n = 1; n < 10; n++) {
  const t = (i + n / 10) / 120;
  const approx = (1 - Math.cos(i / 120 * Math.PI / 2)) * (1 - n / 10) + (1 - Math.cos((i + 1) / 120 * Math.PI / 2)) * n / 10;
  maxError = Math.max(maxError, Math.abs(approx - (1 - Math.cos(t * Math.PI / 2))));
}
assert(maxError < 0.000022);
const routes = fs.readFileSync(path.join(root, 'src/overrides/player/card-movement-xinsha.js'), 'utf8');
for (const call of ['moveXinshaCardsToSeat(r,player,c)', 'moveXinshaCardsToSeat(t,player,o)', 'moveXinshaCardsToSeat(e,t,s,player===game.me)']) assert(routes.includes(call));
console.log(`XINSHA_CARD_FLIGHT_ENGINE_OK: 433/600ms EaseSineIn, independent scale, first-frame clock, batch start, cleanup, local/Online isolation; curve error ${maxError}`);
