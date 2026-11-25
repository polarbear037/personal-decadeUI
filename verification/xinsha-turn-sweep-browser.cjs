const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium } = require('./online-player-tips-browser.cjs');

(async () => {
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const browser = await chromium.launch({ channel: 'msedge', headless: true });
	const errors = [], results = { cases: [], errors };
	try {
		const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
		page.on('pageerror', error => errors.push(error.message));
		await page.route('**/turn-sweep-probe', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/turn-sweep-noname.js"}}</script><body style="margin:0;background:#283b3e"><canvas width="960" height="540" style="position:absolute;pointer-events:none"></canvas><div class="player" style="position:absolute;left:400px;top:160px;width:120px;height:180px;background:#604c34;outline:1px solid white"><div style="color:white;padding:30px">武将牌</div></div>` }));
		await page.route('**/turn-sweep-noname.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const lib=window.lib; export const get={};' }));
		const origin = `http://127.0.0.1:${server.address().port}`;
		await page.goto(origin + '/turn-sweep-probe');
		await page.addScriptTag({ url: origin + '/extension/皮肤切换/spine.js' });
		await page.addScriptTag({ url: origin + '/extension/皮肤切换/spine-lib/spine_4_0.js' });
		await page.addScriptTag({ url: origin + '/extension/皮肤切换/animations.js' });
		await page.evaluate(async () => {
			window.lib = { config: { extension_十周年UI_newDecadeStyle: 'othersOff' } };
			window.decadeUI = { get: { bodySize: () => ({ width: innerWidth, height: innerHeight }) } };
			window.calls = [];
			window.skinSwitch = { chukuangWorkerApi: { playEffect(...args) { calls.push(args); return 'played'; } } };
			const compatibility = await import('/extension/十周年UI/src/ui/equip-effects.js');
			compatibility.installEquipSweepCompatibility();
			compatibility.installEquipSweepCompatibility();
			window.effect = { name: '../../../标记补充/animation/十周年入场/SF_paiju_jie_zuowei4', version: '4.0', action: 'play' };
			window.player = document.querySelector('.player');
			window.position = { scale: .7, speed: .6, parent: player };
			const base = '/extension/标记补充/animation/十周年入场/SF_paiju_jie_zuowei4';
			const atlas = new spine_4.TextureAtlas(await (await fetch(base + '.atlas')).text());
			window.data = new spine_4.SkeletonBinary(new spine_4.AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(await (await fetch(base + '.skel')).arrayBuffer()));
			window.texture = new Image(); texture.src = base + '.png'; await texture.decode();
			window.sample = (time, fixed, scale = .7, dpr = 1) => {
				const sk = new spine_4.Skeleton(data), state = new spine_4.AnimationState(new spine_4.AnimationStateData(data));
				state.setAnimation(0, 'play', false); state.update(time); state.apply(sk); sk.updateWorldTransform();
				sk.bounds = { size: { x: 500, y: 500 } };
				const pos = { ...position, scale };
				skinSwitch.chukuangWorkerApi.playEffect(effect, pos);
				const [sprite, fitted] = calls.at(-1);
				const node = new APNode4_0({ ...sprite, ...(fixed ? fitted : pos), skeleton: sk, referNode: player });
				node.update({ dpr, canvas: { width: innerWidth * dpr, height: innerHeight * dpr }, delta: 0 });
				const m = node.mvp.values;
				const project = (x, y) => ({ x: (m[0] * x + m[4] * y + m[12] + 1) * innerWidth / 2, y: (1 - m[1] * x - m[5] * y - m[13]) * innerHeight / 2 });
				const bone = sk.findBone('longkuang4_tx4'), center = project(bone.worldX, bone.worldY), rect = player.getBoundingClientRect();
				return { sk, project, error: [center.x - rect.left - rect.width / 2, center.y - rect.top - rect.height / 2] };
			};
			window.paint = fixed => {
				const { sk, project } = sample(.6, fixed), ctx = document.querySelector('canvas').getContext('2d');
				ctx.clearRect(0, 0, 960, 540);
				for (const slot of sk.drawOrder) {
					const a = slot.getAttachment(); if (!a) continue;
					const r = a.region, w = r.width, h = r.height, tile = document.createElement('canvas'); tile.width = w; tile.height = h;
					const tc = tile.getContext('2d');
					if (r.degrees === 90) { tc.translate(0, h); tc.rotate(-Math.PI / 2); tc.drawImage(texture, r.x, r.y, h, w, 0, 0, h, w); }
					else tc.drawImage(texture, r.x, r.y, w, h, 0, 0, w, h);
					const v = []; a.computeWorldVertices(slot.bone, v, 0, 2);
					const bl = project(v[0], v[1]), tl = project(v[2], v[3]), tr = project(v[4], v[5]);
					ctx.save(); ctx.globalAlpha = slot.color.a; ctx.transform((tr.x-tl.x)/w,(tr.y-tl.y)/w,(bl.x-tl.x)/h,(bl.y-tl.y)/h,tl.x,tl.y); ctx.drawImage(tile,0,0); ctx.restore();
				}
			};
		});
		results.identity = await page.evaluate(() => ({ version: data.version, animations: data.animations.map(a => a.name) }));
		for (const zoom of [.75, 1, 1.5]) for (const dpr of [1, 3]) for (const scale of [.5, .7, 1]) {
			const result = await page.evaluate(({ zoom, dpr, scale }) => {
				player.style.transform = `scale(${zoom})`;
				return { zoom, dpr, scale, before: sample(.6, false, scale, dpr).error, frames: [.2,.4,.8,1.2].map(t => sample(t,true,scale,dpr).error) };
			}, { zoom, dpr, scale });
			assert(result.before[0] > 2 && result.before[1] > 1);
			for (const frame of result.frames) assert(frame.every(error => Math.abs(error) < .001), JSON.stringify(result));
			results.cases.push(result);
		}
		results.isolation = await page.evaluate(() => {
			const out = [];
			for (const style of ['onlineUI','on','off','babysha']) {
				lib.config.extension_十周年UI_newDecadeStyle = style;
				skinSwitch.chukuangWorkerApi.playEffect(effect, position);
				out.push({ style, unchanged: calls.at(-1)[0] === effect && calls.at(-1)[1] === position });
			}
			lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
			const other = { ...effect, name: '../../../标记补充/animation/saoguang' };
			skinSwitch.chukuangWorkerApi.playEffect(other, position); out.push({ other: true, unchanged: calls.at(-1)[0] === other && calls.at(-1)[1] === position });
			const callback = () => {}, original = JSON.stringify(effect);
			skinSwitch.chukuangWorkerApi.playEffect(effect, position, callback);
			out.push({ preserved: calls.at(-1)[2] === callback && calls.at(-1)[1].scale === .7 && calls.at(-1)[1].speed === .6 && !position.x && !position.y && JSON.stringify(effect) === original });
			return out;
		});
		assert(results.isolation.every(r => r.unchanged || r.preserved));
		await page.evaluate(() => { player.style.transform = 'none'; paint(false); });
		await page.screenshot({ path: path.join(__dirname, 'xinsha-turn-sweep-before.png') });
		await page.evaluate(() => paint(true));
		await page.screenshot({ path: path.join(__dirname, 'xinsha-turn-sweep-after.png') });
		assert.deepEqual(errors, []);
		fs.writeFileSync(path.join(__dirname, 'xinsha-turn-sweep-results.json'), JSON.stringify(results, null, 2));
		console.log(JSON.stringify({ cases: results.cases.length, frames: results.cases.length * 4, identity: results.identity, isolation: results.isolation, errors }));
	} finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
