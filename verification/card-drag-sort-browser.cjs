// 加载真实排序模块和十周年卡牌点击，覆盖快速加减选与正常拖动。
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function fixture(page, origin, zoom, mode) {
    await page.goto(origin + '/__card_verification__');
    await page.evaluate(({ zoom, mode }) => {
        if (mode !== 'pointer') delete window.PointerEvent;
        document.body.innerHTML = '<div id="wrap"><div id="hand"><div id="a" class="card selectable selected">甲</div><div id="b" class="card selectable selected">乙</div><div id="c" class="card selectable">丙</div></div></div>';
        document.head.insertAdjacentHTML('beforeend', '<style>body{margin:0}#wrap{overflow:visible}#hand{display:flex;gap:20px;margin:100px}.card{width:108px;height:150px;background:#987}</style>');
        document.body.style.zoom = zoom;
        window.lib = { config: { enable_drag: true } };
        window._status = { event: { custom: { replace: {}, add: {} } }, lastdragchange: [] };
        window.ui = { window: document.body, arena: document.body, canvas: document.createElement('canvas'), handcards1: document.getElementById('hand'), handcards1Container: document.getElementById('wrap'), selected: { cards: [...document.querySelectorAll('.selected')], targets: [] }, click: {} };
        window.checks = 0;
        window.game = { documentZoom: zoom, me: { hasSkillTag: () => false }, check() { checks++; }, uncheck() {} };
        window.get = { info: () => ({}), select: value => value, itemtype: node => node.classList?.contains('card') ? 'card' : '' };
        Object.assign(_status.event, { player: game.me, isMine: () => true, filterCard: () => true, selectCard: [0, 3], position: 'h' });
        game.me.getCards = () => [...ui.handcards1.children];
        window.decadeUI = { layout: { updateHand() {}, invalidateHand() {} }, boundsCaches: { hand: { cardScale: 1 } } };
        Array.prototype.add = function (card) { if (!this.includes(card)) this.push(card); return this; };
        Array.prototype.remove = function (card) { const index = this.indexOf(card); if (index >= 0) this.splice(index, 1); return this; };
        for (const card of ui.handcards1.children) {
            card.updateTransform = () => {};
            card.addEventListener('click', event => ui.click.card.call(card, event));
        }
        document.addEventListener('click', () => { _status.clicked = false; });
        window.frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.fire = (type, id = 'a', options = {}) => {
            const card = document.getElementById(id), rect = card.getBoundingClientRect();
            const x = options.x ?? rect.left + 30, y = options.y ?? rect.top + 50;
            const end = type === 'up' || type === 'cancel';
            const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: end ? 0 : 1, ...options };
            let event;
            if (mode === 'pointer') {
                event = new PointerEvent({ down: 'pointerdown', move: 'pointermove', up: 'pointerup', cancel: 'pointercancel' }[type], { pointerId: 1, pointerType: 'mouse', isPrimary: true, ...init });
            } else if (mode === 'touch') {
                const contact = new Touch({ identifier: options.identifier ?? 1, target: card, clientX: x, clientY: y, pageX: x, pageY: y });
                event = new TouchEvent({ down: 'touchstart', move: 'touchmove', up: 'touchend', cancel: 'touchcancel' }[type], { bubbles: true, cancelable: true, touches: end ? [] : [contact], changedTouches: [contact] });
            } else event = new MouseEvent({ down: 'mousedown', move: 'mousemove', up: 'mouseup' }[type], init);
            card.dispatchEvent(event);
        };
        window.snapshot = () => ({ dragged: !!_status.dragged, order: [...ui.handcards1.children].map(card => card.id), selected: ui.selected.cards.map(card => card.id), opacity: document.getElementById('a').style.opacity, checks });
    }, { zoom, mode });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/ui/click.js', 'ui.click.card=t;') });
    if (mode !== 'touch') {
        const clicks = read('noname/ui/click/index.js');
        await page.addScriptTag({ content: `class NativeMouse {
            ${clicks.slice(clicks.indexOf('  windowmousedown(e) {'), clicks.indexOf('  cardtouchstart(e) {'))}
            ${clicks.slice(clicks.indexOf('  windowmouseup(e) {'), clicks.indexOf('  mousemove() {'))}
        };document.addEventListener('mousedown', NativeMouse.prototype.windowmousedown);document.addEventListener('mouseup', NativeMouse.prototype.windowmouseup);` });
    }
    const expose = 'h();decadeUI.initCardDragSwap();';
    const content = process.env.CARD_DRAG_TEST_BEFORE
        ? '(function(){' + execFileSync('git', ['show', 'HEAD:src/features/cardDragSort.js'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).replace(/^import[^;]*;\s*/gm, '').replace(/^export\s*\{[^}]*\};?\s*/gm, '') + expose + '})();'
        : script('extension/十周年UI/src/features/cardDragSort.js', expose);
    await page.addScriptTag({ content });
}

async function run() {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const results = [];
    try {
        for (const mode of ['pointer', 'mouse', 'touch']) for (const zoom of [1, 1.3]) {
            const context = await browser.newContext({ viewport: { width: 1100, height: 760 }, ...(mode === 'touch' ? { userAgent: 'Android Mobile', hasTouch: true } : {}) });
            const page = await context.newPage(), errors = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
            await fixture(page, origin, zoom, mode);

            // 同一任务内按下再松开，确定性覆盖旧版漏掉松开事件的跨帧窗口。
            const quick = await page.evaluate(async () => {
                fire('down'); fire('up'); await frames();
                const target = document.getElementById('b').getBoundingClientRect();
                fire('move', 'a', { x: target.left + 20, buttons: 0 }); await frames();
                return snapshot();
            });
            assert.equal(quick.dragged, false, `${mode}/${zoom}: 快速松开后空移不启动排序`);
            assert.deepEqual(quick.order, ['a', 'b', 'c']);
            assert.deepEqual(quick.selected, ['a', 'b']);

            // 真实浏览器鼠标输入，反复减选/加选及移动；触摸降级另用触摸事件覆盖。
            if (mode !== 'touch') {
                for (let repeat = 0; repeat < 8; repeat++) {
                    await page.locator('#a').click();
                    await page.waitForTimeout(25);
                    const box = await page.locator('#b').boundingBox();
                    await page.mouse.move(box.x + 20, box.y + 50);
                    await page.waitForTimeout(25);
                    const state = await page.evaluate(() => snapshot());
                    assert.equal(state.dragged, false, '连续真实点击、空移不启动排序');
                    assert.deepEqual(state.order, ['a', 'b', 'c']);
                    assert.deepEqual(state.selected, repeat % 2 ? ['b', 'a'] : ['b']);
                }
            }

            await page.evaluate(async () => {
                fire('down'); await frames();
                const rect = document.getElementById('a').getBoundingClientRect();
                fire('move', 'a', { x: rect.left + 39 });
            });
            assert.equal(await page.evaluate(() => !!_status.dragged), false, '9 像素手抖仍为点击');
            await page.evaluate(() => fire('up'));

            if (mode !== 'touch') {
                await page.evaluate(async () => { fire('down'); await frames(); fire('move', 'a', { x: 400, buttons: 0 }); });
                assert.equal(await page.evaluate(() => !!_status.dragged), false, '窗口外松开后不排序');
                await page.evaluate(() => { fire('down', 'a', { button: 2, buttons: 2 }); fire('move', 'a', { x: 400, buttons: 2 }); });
                assert.equal(await page.evaluate(() => !!_status.dragged), false, '右键不进入排序');
            }
            if (mode === 'pointer') {
                await page.evaluate(() => { fire('down'); fire('move', 'a', { pointerId: 2, x: 400 }); fire('up', 'a', { pointerId: 2 }); });
                assert.equal(await page.evaluate(() => !!_status.dragged), false, '其他指针不移动当前牌');
                await page.evaluate(() => fire('up'));
            }

            // 卡牌自身的松开监听停止冒泡时，document 捕获监听仍须清理。
            await page.evaluate(async () => {
                const type = 'PointerEvent' in window ? 'pointerup' : /Android/.test(navigator.userAgent) ? 'touchend' : 'mouseup';
                document.getElementById('a').addEventListener(type, event => event.stopPropagation(), { once: true });
                fire('down'); fire('up'); await frames(); fire('move', 'a', { x: 400 });
            });
            assert.equal(await page.evaluate(() => !!_status.dragged), false, '被拦截的松开仍结束本次按压');

            for (const finish of ['blur', 'destroy', ...(mode === 'mouse' ? [] : ['cancel'])]) {
                await page.evaluate(async finish => {
                    fire('down'); await frames();
                    if (finish === 'blur') window.dispatchEvent(new Event('blur'));
                    else if (finish === 'cancel') fire('cancel');
                    else { decadeUI.destroyCardDragSwap(); decadeUI.initCardDragSwap(); }
                    fire('move', 'a', { x: 400 });
                }, finish);
                assert.equal(await page.evaluate(() => !!_status.dragged), false, `${finish} 清理候选拖动`);
                const cancelled = await page.evaluate(async finish => {
                    fire('down');
                    const rect = document.getElementById('a').getBoundingClientRect();
                    fire('move', 'a', { x: rect.left + 41 });
                    const started = !!_status.dragged;
                    if (finish === 'blur') window.dispatchEvent(new Event('blur'));
                    else if (finish === 'cancel') fire('cancel');
                    else { decadeUI.destroyCardDragSwap(); decadeUI.initCardDragSwap(); }
                    await frames();
                    return { started, state: snapshot() };
                }, finish);
                assert.equal(cancelled.started, true);
                assert.equal(cancelled.state.dragged, false, `${finish} 清理已启动的排序`);
                assert.deepEqual([...cancelled.state.selected].sort(), ['a', 'b'], `${finish} 不撤掉原有选牌`);
            }

            const vertical = await page.evaluate(async () => {
                fire('down'); await frames();
                const rect = document.getElementById('a').getBoundingClientRect();
                fire('move', 'a', { y: rect.top + 80 });
                return { state: snapshot(), restored: !!document.getElementById('a')._waitingfordrag };
            });
            assert.equal(vertical.state.dragged, false);
            assert.equal(vertical.restored, true, '纵向拖动仍交还本体选牌');

            // 用真实鼠标按住横拖检查排序；触摸降级使用对应的触摸序列。
            if (mode !== 'touch') {
                const a = await page.locator('#a').boundingBox(), b = await page.locator('#b').boundingBox();
                await page.mouse.move(a.x + 30, a.y + 50); await page.mouse.down();
                await page.mouse.move(b.x + 20, b.y + 50); await page.waitForTimeout(60);
            } else await page.evaluate(async () => {
                fire('down'); await frames();
                const target = document.getElementById('b').getBoundingClientRect();
                fire('move', 'a', { x: target.left + 20 }); await frames();
            });
            const sorting = await page.evaluate(() => snapshot());
            assert.equal(sorting.dragged, true, '按住横向拖动仍能排序');
            assert.deepEqual(sorting.order, ['b', 'a', 'c']);
            if (mode !== 'touch') await page.mouse.up();
            else await page.evaluate(() => fire('up'));
            await page.waitForTimeout(60);
            const finished = await page.evaluate(() => snapshot());
            assert.equal(finished.dragged, false);
            if (mode !== 'touch') assert.equal(await page.evaluate(() => _status.mousedown), false, '本体 mouseup 正常清理按下状态');
            assert.deepEqual(finished.selected, ['b'], '真实排序保留原有撤选语义');
            assert.deepEqual(errors, [], '浏览器无脚本错误');
            results.push({ mode, zoom, passed: true });
            await context.close();
        }
        console.log(JSON.stringify({ results, passed: true }));
    } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
