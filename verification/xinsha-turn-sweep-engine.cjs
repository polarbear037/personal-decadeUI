const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.resolve(root, file), 'utf8');
class Player {
	classList = { contains: name => name === 'player' };
	getBoundingClientRect() { return { left: 320, top: 80, width: 120 * this.zoom, height: 180 * this.zoom, bottom: 80 + 180 * this.zoom }; }
	zoom = 1;
}
const calls = [], lib = { config: { extension_十周年UI_newDecadeStyle: 'othersOff' } };
const api = { playEffect(...args) { calls.push(args); return 'played'; } };
const context = { console, lib, get: {}, HTMLElement: Player, skinSwitch: { chukuangWorkerApi: api }, window: {}, self: {} };
context.decadeUI = context.window.decadeUI = { get: { bodySize: () => ({ width: 960, height: 540 }) } };
vm.createContext(context);
vm.runInContext('self=globalThis;', context);
vm.runInContext(read('../皮肤切换/spine.js'), context);
vm.runInContext(read('../皮肤切换/spine-lib/spine_4_0.js'), context);
vm.runInContext(read('../皮肤切换/animations.js') + '\nglobalThis.Node4=APNode4_0;', context);
vm.runInContext(read('src/ui/equip-effects.js').replace(/^import .*;\r?\n/, '').replace(/export \{[^}]*\};/, '') + '\ninstallEquipSweepCompatibility();installEquipSweepCompatibility();', context);
const spine = context.spine_4, asset = '../标记补充/animation/十周年入场/SF_paiju_jie_zuowei4';
const bytes = fs.readFileSync(path.resolve(root, asset + '.skel'));
const atlas = new spine.TextureAtlas(read(asset + '.atlas'));
const data = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(bytes));
assert.equal(data.version, '4.0.56');
const player = new Player(), effect = { name: '../../../标记补充/animation/十周年入场/SF_paiju_jie_zuowei4', version: '4.0', action: 'play' };
const results = { asset: asset + '.skel', sha256: crypto.createHash('sha256').update(bytes).digest('hex'), runtime: 'actual Spine 4.0 and BaseAPNode.update; Node VM, no browser', cases: [], isolation: [] };
function sample(time, fixed, scale, dpr) {
	const sk = new spine.Skeleton(data), state = new spine.AnimationState(new spine.AnimationStateData(data));
	state.setAnimation(0, 'play', false); state.update(time); state.apply(sk); sk.updateWorldTransform();
	sk.bounds = { size: { x: 500, y: 500 } };
	const pos = { parent: player, scale, speed: .6 };
	assert.equal(api.playEffect(effect, pos), 'played');
	assert.equal(pos.x, undefined); assert.equal(effect.x, undefined);
	const [sprite, adjusted] = calls.at(-1);
	assert.equal(adjusted.speed, .6); assert.equal(adjusted.scale, scale);
	const node = new context.Node4({ ...sprite, ...(fixed ? adjusted : pos), skeleton: sk, referNode: player });
	node.update({ dpr, canvas: { width: 960 * dpr, height: 540 * dpr }, delta: 0 });
	const b = sk.findBone('longkuang4_tx4'), m = node.mvp.values, rect = player.getBoundingClientRect();
	return [(m[0]*b.worldX+m[4]*b.worldY+m[12]+1)*480-rect.left-rect.width/2,
		(1-m[1]*b.worldX-m[5]*b.worldY-m[13])*270-rect.top-rect.height/2];
}
for (const zoom of [.75, 1, 1.5]) for (const dpr of [1, 3]) for (const scale of [.5, .7, 1]) {
	player.zoom = zoom;
	const before = sample(.6, false, scale, dpr), frames = [.2,.4,.8,1.2].map(t => sample(t, true, scale, dpr));
	assert(before[0] > 2 && before[1] > 1);
	for (const frame of frames) assert(frame.every(value => Math.abs(value) < .001), JSON.stringify({ zoom, scale, dpr, frame }));
	results.cases.push({ zoom, dpr, scale, before, after: frames });
}
const position = { parent: player, scale: .7, speed: .6 };
for (const style of ['onlineUI','on','off','babysha']) {
	lib.config.extension_十周年UI_newDecadeStyle = style;
	api.playEffect(effect, position); assert.equal(calls.at(-1)[0], effect); assert.equal(calls.at(-1)[1], position);
	results.isolation.push(style);
}
lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
for (const name of ['../../../标记补充/animation/saoguang','../../../雷的一将/animation/landlord/FX_ChaoShenDiZhu']) {
	const other = { ...effect, name }; api.playEffect(other, position);
	assert.equal(calls.at(-1)[0], other); assert.equal(calls.at(-1)[1], position);
	results.isolation.push(name);
}
const callback = () => {};
api.playEffect(effect, { ...position, x: [3,.4], y: 8 }, callback);
assert.equal(calls.at(-1)[2], callback);
assert(Math.abs(calls.at(-1)[1].x[0] - (3 - 5.934717*.7)) < 1e-9);
assert.equal(calls.at(-1)[1].x[1], .4);
assert(Math.abs(calls.at(-1)[1].y - (8 + 3.499786*.7)) < 1e-9);
fs.writeFileSync(path.join(__dirname,'xinsha-turn-sweep-results.json'), JSON.stringify(results,null,2));
console.log(`PASS: ${results.cases.length} scale/DPR/seat combinations, ${results.cases.length*4} animation samples; other styles/effects isolated; arguments and return preserved.`);
