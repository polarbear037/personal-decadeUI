// 只读加载实际配置、皮肤切换 Worker 和 Spine 资源，核对本次皮肤参数。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('C:/Users/Thunder/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const appRoot = path.resolve(__dirname, '../../..');
const uiRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(uiRoot, 'src/skins/dynamicSkin.js'), 'utf8');
const start = source.indexOf('\tfengfangnv: {');
const end = source.indexOf('\n\t},', start) + 4;
const skin = vm.runInNewContext('({' + source.slice(start, end) + '})').fengfangnv['轻舟月岚'];
const dataSource = fs.readFileSync(path.join(appRoot, 'extension/皮肤切换/js/worker/online-playback-data.js'), 'utf8');
const profile = vm.runInNewContext(dataSource + '\nckGetOnlineSkinProfile(' + JSON.stringify(skin) + ')');
assert.equal(profile.id, '49102');
assert.equal(profile.zoom, .55);
assert.deepEqual(Array.from(profile.seatPlace), [150, -100]);
assert.deepEqual(Array.from(profile.attack), [200, 120]);
assert.deepEqual(Array.from(profile.selfInteraction), [150, -80]);
const expected = { x: .5 + 150 * .55 * 175.5 / 232 / 130, y: .5 - 100 * .55 / 232,
    scale: .55 * 646 / 306 * 175.5 / 232, eventScale: 2 * .55 * 175.5 / 232 };
for (const layer of [skin, skin.beijing, skin.qianjing]) {
    assert.ok(Math.abs(layer.x[1] - expected.x) < 1e-6);
    assert.ok(Math.abs(layer.y[1] - expected.y) < 1e-6);
    assert.ok(Math.abs(layer.scale - expected.scale) < 1e-6);
}
for (const layer of [skin.gongji, skin.hudong, skin.teshu]) assert.ok(Math.abs(layer.scale - expected.eventScale) < 1e-6);
assert.equal(skin.chuchang, undefined);
const report = { skinId: profile.id, expected, cases: [], errors: [], httpErrors: [] };
const types = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.atlas': 'text/plain' };
const server = http.createServer((req, res) => {
    const filename = path.resolve(appRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!filename.startsWith(appRoot + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(filename, (error, bytes) => {
        if (error) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' }); res.end(bytes);
    });
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        for (const mobile of [false, true]) {
            const context = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: mobile ? 3 : 1,
                userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0.0.0 Mobile Safari/537.36' : undefined });
            const page = await context.newPage();
            page.on('pageerror', error => report.errors.push(error.message));
            page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
            page.on('response', response => { if (response.status() >= 400) report.httpErrors.push({ status: response.status(), url: response.url() }); });
            await page.route('**/__fengyu__', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><body style="background:#282522">' }));
            await page.route('**/dynamicWorker.js?fengyu-test', async route => {
                const response = await route.fetch();
                await route.fulfill({ response, body: (await response.text()) + `
                    const snapshot = (data, phase) => {
                        const manager = animationManagers.getById(data.id);
                        const animation = Object.values(manager.animations).find(animation => animation.nodes.some(node => node.qianjingNode));
                        const main = animation.nodes.find(node => node.qianjingNode);
                        const layer = node => { const track = node.skeleton.state.tracks[0]; return {
                            x:node.x,y:node.y,scale:node.scale,flipX:!!node.flipX,
                            action:track?.animation.name,loop:track?.loop,time:track?.trackTime,next:track?.next?.animation.name,duration:track?.animation.duration }; };
                        postMessage({type:'fengyuSample',id:data.id,phase,main:layer(main),beijing:layer(main.beijingNode),qianjing:layer(main.qianjingNode)});
                    };
                    const start = MESSAGE_HANDLERS.StartPlay;
                    MESSAGE_HANDLERS.StartPlay = data => { start(data); snapshot(data.data,'start'); };
                    MESSAGE_HANDLERS.FENGYU_SAMPLE = data => snapshot(data,'idle');
                    MESSAGE_HANDLERS.FENGYU_ACTIONS = data => {
                        const manager=animationManagers.getById(data.id), animation=manager.getAnimation('4.0');
                        const name=data.name;
                        animation.loadSpine(name,'json',()=>{
                            const actions=animation.getSpineActions(name);
                            for(const action of ['GongJi','HuDong','JiNeng']) {
                                const node=animation.playSpine({name,action,loop:false,scale:.1,x:[0,.5],y:[0,.5]});
                                node.skeleton.state.update(.1);node.skeleton.state.apply(node.skeleton);node.skeleton.updateWorldTransform();
                                node.completed=node.skeleton.completed=true;
                            }
                            postMessage({type:'fengyuActions',actions});
                        });
                    };
                ` });
            });
            await page.goto(origin + '/__fengyu__');
            const scenarios = [
                { id: 1, online: true, outcrop: false, left: false, width: 130, height: 175.5 },
                { id: 2, online: true, outcrop: true, left: true, width: 174, height: 232 },
                { id: 3, online: false, outcrop: false, left: false, width: 130, height: 175.5 },
            ];
            await page.evaluate(({ origin, skin, scenarios }) => {
                window.samples = []; window.workers = [];
                for (const scenario of scenarios) {
                    const canvas=document.createElement('canvas');canvas.style.cssText='width:'+scenario.width+'px;height:'+scenario.height+'px';document.body.append(canvas);
                    const worker=new Worker(origin+'/extension/皮肤切换/dynamicWorker.js?fengyu-test');workers.push(worker);
                    worker.onerror=event=>{throw new Error(event.message);};
                    worker.onmessage=event=>{
                        if(event.data.type==='loadFinish')worker.postMessage({message:'StartPlay',data:event.data});
                        if(['fengyuSample','fengyuActions'].includes(event.data.type)) samples.push(event.data);
                    };
                    const surface=canvas.transferControlToOffscreen();
                    worker.postMessage({message:'CREATE',id:scenario.id,canvas:surface,pathPrefix:origin+'/extension/十周年UI/assets/dynamic/',dpr:devicePixelRatio},[surface]);
                    const player={...skin,id:scenario.id};
                    worker.postMessage({message:'PLAY',id:scenario.id,sprite:{...skin,id:scenario.id,player,loop:true},
                        onlinePlayback:scenario.online,onlineSeatLeft:scenario.left,outcropMask:scenario.outcrop,width:scenario.width,height:scenario.height,dpr:devicePixelRatio});
                }
            }, { origin, skin, scenarios });
            await page.waitForFunction(() => samples.filter(row => row.phase === 'start').length === 3, null, { timeout: 30000 });
            const initial = await page.evaluate(() => samples.filter(row => row.phase === 'start'));
            for (const scenario of scenarios) {
                const row = initial.find(row => row.id === scenario.id);
                const scale = scenario.height / 232;
                for (const layer of [row.main, row.beijing, row.qianjing]) {
                    if (scenario.online) {
                        assert.ok(Math.abs(layer.scale - .55 * (scenario.outcrop ? 714 : 646) / 306 * scale) < 1e-9);
                        assert.ok(Math.abs(layer.x[0] - 150 * .55 * scale * (scenario.left ? -1 : 1)) < 1e-9);
                        assert.ok(Math.abs(layer.y[0] + 100 * .55 * scale) < 1e-9);
                        assert.equal(layer.flipX, scenario.left);
                    } else assert.equal(layer.scale, skin.scale);
                }
                assert.equal(row.main.action, 'ChuChang'); assert.equal(row.qianjing.action, 'ChuChang');
                assert.equal(row.main.next, 'DaiJi'); assert.equal(row.qianjing.next, 'DaiJi');
                if (scenario.online) assert.equal(row.beijing.action, 'DaiJi');
            }
            const duration = Math.max(...initial.flatMap(row => [row.main.duration, row.qianjing.duration]));
            await page.waitForTimeout(duration * 1000 + 300);
            await page.evaluate(() => workers.forEach((worker, index) => worker.postMessage({ message: 'FENGYU_SAMPLE', id: index + 1 })));
            await page.waitForFunction(() => samples.filter(row => row.phase === 'idle').length === 3);
            const idle = await page.evaluate(() => samples.filter(row => row.phase === 'idle'));
            for (const row of idle) for (const layer of [row.main, row.beijing, row.qianjing]) {
                assert.equal(layer.action, 'DaiJi'); assert.equal(layer.loop, true);
            }
            await page.evaluate(name => workers[0].postMessage({ message: 'FENGYU_ACTIONS', id: 1, name }), skin.gongji.name);
            await page.waitForFunction(() => samples.some(row => row.type === 'fengyuActions'), null, { timeout: 20000 });
            const actions = await page.evaluate(() => samples.find(row => row.type === 'fengyuActions').actions);
            assert.deepEqual(actions.map(action => action.name).sort(), ['GongJi', 'HuDong', 'JiNeng']);
            report.cases.push({ mobile, initial, idle, actions });
            await context.close();
        }
        assert.deepEqual(report.errors, []); assert.deepEqual(report.httpErrors, []);
        report.passed = true;
        console.log('FENGYU_QINGZHOU_OK: 6 real Worker cases, 4 skeletons, entrance/idle, profile ID, scale/position and 3 action applications; no page/HTTP errors');
    } catch (error) { report.error = error.stack; throw error; }
    finally {
        fs.writeFileSync(path.join(__dirname, 'fengyu-qingzhou-results.json'), JSON.stringify(report, null, 2), 'utf8');
        await browser.close(); server.close();
    }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
