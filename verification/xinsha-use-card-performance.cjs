const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
const { dependencies } = require('./xinsha-prompt-engine.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const baseline = process.argv.includes('--baseline');
    Object.assign(seed, { mode: 'identity', characters: ['standard'], cards: ['standard', 'extra'], touchscreen: false,
      extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_optimizePrompt: 'xinsha' });
    const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await dependencies(page);
    if (baseline) for (const name of ['handtip.js', 'update.js']) {
      const modulePath = name === 'handtip.js' ? '/src/ui/handtip.js' : '/src/overrides/ui/update.js';
      await page.route('**' + modulePath, route => route.fulfill({ contentType: 'text/javascript',
        body: fs.readFileSync(path.join(__dirname, '../.codex-tmp/use-card-performance', name + '.before'), 'utf8') }));
    }
    if (baseline) await page.route('**/src/styles/equip-xinsha.css*', route => route.fulfill({ contentType: 'text/css',
      body: fs.readFileSync(path.join(__dirname, '../src/styles/equip-xinsha.css'), 'utf8')
        .replaceAll('.card[data-xinsha-equip]', '.card:has(> .name2[data-decade-equip])')
        .replaceAll('.card[data-xinsha-extra-equip]', '.card:has(> .name2[data-xinsha-extra-equip])') }));
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.locator('#arena > .player').nth(1).waitFor({state:'attached',timeout:45000});
    await page.evaluate(async () => {
      const { game, ui, lib, get, _status } = await import('/noname.js');
      const { Content } = await import('/noname/library/element/content.js');
      Object.assign(window, { game, ui, lib, get, _status, Content });
      game.pause(); game.resume = () => {};
      for (const d of [...ui.dialogs]) d.close();
      for (const c of [...ui.controls]) c.close();
      ui.arena.classList.remove('choose-character');
      game.me = game.players[0]; game.me.init('sunquan'); game.players[1].init('guanyu');
      _status.currentPhase = game.me; _status.auto = false; _status.over = false;
      lib.config.auto_confirm = false;
      await (await import('/extension/雷的一将/utils/cardBeautify.js')).installCardBeautify();
      window.phase = game.createEvent('phaseUse', false); phase.player = game.me;
      window.card = game.createCard('wuzhong', 'heart', 7);
      const equipment = game.createCard('qinggang', 'spade', 6);
      game.me.directequip(equipment);
      window.equipmentMarkers = { original: equipment.dataset.xinshaEquip,
        copy: equipment.copy('thrown').dataset.xinshaEquip };
      game.me.directgain([card, ...Array.from({length:15},(_,i)=>game.createCard(i%2?'sha':'shan','spade',i%13+1))]);
      window.layoutReads = { tip: 0, control: 0 };
      const innerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
      Object.defineProperty(HTMLElement.prototype, 'innerText', { ...innerText, get() {
        if (this.classList.contains('hand-tip')) layoutReads.tip++;
        return innerText.get.call(this);
      }});
      const offsetLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft');
      Object.defineProperty(HTMLElement.prototype, 'offsetLeft', { ...offsetLeft, get() {
        if (this.parentNode === ui.control) layoutReads.control++;
        return offsetLeft.get.call(this);
      }});
      window.begin = async () => {
        game.uncheck();
        for (const dialog of [...ui.dialogs]) dialog.close();
        const e = game.me.chooseToUse({type:'phase'}); e.parent = phase;
        _status.eventManager.setStatusEvent(e,true);
        await Content.chooseToUse[0](e,null,game.me);
        return { event: e };
      };
    });
    await page.waitForTimeout(1000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const metricsBefore = (await cdp.send('Performance.getMetrics')).metrics;
    const result = await page.evaluate(async () => {
      const samples = [];
      for (let i=0;i<12;i++) {
        const { event } = await begin();
        await new Promise(r=>setTimeout(r,50));
        let t=performance.now(); _status.clicked=false; ui.click.card.call(card);
        const selected = performance.now()-t;
        await new Promise(requestAnimationFrame);
        t=performance.now(); ui.confirm.node.ok.click();
        const confirmed = performance.now()-t;
        const result = { bool:event.result?.bool, name:event.result?.card?.name };
        await new Promise(r=>setTimeout(r,80));
        samples.push({selected, confirmed, result});
      }
      return { samples, reads: layoutReads, equipmentMarkers, style: document.body.dataset.style,
        face: !!card.querySelector('.lei-yijiang-card-face') };
    });
    const traceEvents = [];
    cdp.on('Tracing.dataCollected', event => traceEvents.push(...event.value));
    await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' });
    const probe = await page.evaluate(() => {
      const control = game.me.node.name;
      const old = control.style.opacity;
      const samples = [];
      try {
        for (let i=0; i<8; i++) {
          const start = performance.now();
          control.style.opacity = String(1 - (i % 2) / 100);
          void ui.arena.clientWidth;
          samples.push(performance.now()-start);
        }
      } finally {
        if (old) control.style.opacity = old;
        else control.style.removeProperty('opacity');
      }
      return { samples, nodes: document.querySelectorAll('*').length };
    });
    const traceDone = new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
    await cdp.send('Tracing.end'); await traceDone;
    probe.recalculatedElements = traceEvents.filter(e=>e.name==='UpdateLayoutTree').map(e=>e.args.elementCount || 0);
    const metricsAfter = (await cdp.send('Performance.getMetrics')).metrics;
    const metrics = Object.fromEntries(metricsAfter.filter(m=>/LayoutCount|RecalcStyleCount|LayoutDuration|RecalcStyleDuration/.test(m.name))
      .map(m=>[m.name,m.value-(metricsBefore.find(b=>b.name===m.name)?.value||0)]));
    const median = key => result.samples.map(s=>s[key]).sort((a,b)=>a-b)[6];
    const report = { baseline, medianSelect: median('selected'), medianConfirm: median('confirmed'), metrics, probe, result, errors };
    fs.writeFileSync(path.join(__dirname,`xinsha-use-card-performance-${baseline?'before':'results'}.json`),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
    assert.equal(result.style,'othersOff'); assert.equal(result.face,true);
    assert.deepEqual(result.equipmentMarkers,{original:'1',copy:undefined},'装备镜像标记随 copy 清理');
    assert.ok(result.samples.every(s=>s.result.bool && s.result.name==='wuzhong'));
    if (!baseline) {
      assert.equal(result.reads.tip,0,'一将优化提示不应读取 innerText 强制排版');
      assert.equal(result.reads.control,0,'固定按钮布局不应读取 offsetLeft 强制排版');
      assert.ok(probe.recalculatedElements.length >= 8);
      assert.ok(Math.max(...probe.recalculatedElements.slice(1,8)) < probe.nodes / 2,
        '无关控件 style 变更不应让装备选择器使整个 arena/window/body 样式失效');
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); server.close(); }
})().catch(e=>{ console.error(e); process.exitCode=1; });
