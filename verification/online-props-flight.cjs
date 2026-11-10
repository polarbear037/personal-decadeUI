const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = path.join(__dirname, 'online-props-source');
const config = require('./online-props-source/configuration.json');
const local = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/ui/online-props.js'), 'utf8').replace(/^import .*;\r?\n/, '').replaceAll('export ', '') + '\nglobalThis.flight = getOnlinePropFlight; globalThis.props = onlineProps;', local);
class Point { constructor(x, y) { this.x = x; this.y = y; } normalize() { const length = Math.hypot(this.x, this.y); this.x /= length; this.y /= length; } }
class Sprite { scale() {} pos(x, y) { this.x = x; this.y = y; } PlayAni() {} }
const original = vm.createContext({ kwt: (object, key, value) => object[key] = value, JUt: class {}, VP: class {}, bwt: Map, Tx: Sprite, Laya: { Point }, Wwt: {}, AMt: { SAFE_AREA_WIDTH: 0 }, gt: { F: value => value }, Map });
vm.runInContext(fs.readFileSync(path.join(source, 'WP.js'), 'utf8') + '\nglobalThis.Prop = WP;', original);
vm.runInContext(fs.readFileSync(path.join(source, 'Vvi.js'), 'utf8') + '\nglobalThis.Effect = Vvi;', original);
const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 0.00001, `${label}: ${actual} != ${expected}`);
let passed = 0;
for (const prop of local.props) {
 const official = Object.assign(new original.Prop(), config.props.find(item => item.ID === prop.id));
 for (const count of [1, 2, 3, 4, 6, 8, 10]) for (const index of prop.clips.keys()) for (const direction of [1, -1]) {
  const from = { x: direction > 0 ? 10 : 900, y: 500, width: 174, height: 232 };
  const to = { x: direction > 0 ? 900 : 10, y: 80, width: 174, height: 232 };
  const instance = new original.Effect();
  Object.assign(instance, { fromSeat: { seatX: from.x, seatY: from.y, ScaledWidth: 174, ScaledHeight: 232 }, toSeat: { seatX: to.x, seatY: to.y, ScaledWidth: 174, ScaledHeight: 232 }, propInfo: official, soundInfo: null, addGameSceneEffect() {}, registerSpine() {} });
  let expected;
  instance.CreateBezierPoints = (sprite, delay, start, control, end, duration) => { expected = { delay, start, control, end, duration }; };
  original.Wwt.PlayingPropNum = count;
  vm.runInContext('globalThis.randomIndex=0; Math.random=()=>[0.25,0.75,0.4][randomIndex++%3];', original);
  instance.PlayPropAnim(index);
  for (const scale of [0.65, 1, 1.25]) {
   let randomIndex = 0;
   const scaleRect = rect => Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, value * scale]));
   const actual = local.flight(scaleRect(from), scaleRect(to), prop, count, index, () => [0.25, 0.75, 0.4][randomIndex++ % 3]);
   for (const point of ['start', 'control', 'end']) for (const axis of ['x', 'y']) close(actual[point][axis], expected[point][axis] * scale, `${prop.emotion}/${count}/${index}/${direction}/${scale}/${point}.${axis}`);
   close(actual.duration, expected.duration, `${prop.emotion} duration`);
   close(actual.delay, expected.delay, `${prop.emotion} delay`);
   passed++;
  }
 }
}
console.log(`ONLINE_PROPS_FLIGHT_OK: ${passed} cases matched actual APK WP.GetRandomOffset / Vvi.PlayPropAnim / Vvi.playFlyToEnd; both directions, all four props and five clips, 7 repeat counts, 3 scales`);
