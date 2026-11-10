const { bootstrap, server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page, origin, true);
    await page.addStyleTag({ url: origin + '/extension/十周年UI/src/styles/player4.css' });
    await page.addStyleTag({ content: '#arena{position:absolute;inset:20px}.player{position:absolute!important;top:80px!important;left:80px!important;width:160px!important;height:220px!important}.equips-wrap{height:250px!important;bottom:80px!important;right:80px!important}.card{animation:none!important;transition:none!important}' });
    await page.evaluate(() => {
      window.decadeUI = { get: { bodySize: () => ({ width: innerWidth, height: innerHeight }) } };
      window.messages = [];
      window.skinSwitch = { chukuangWorkerInit() {}, chukuangWorker: { postMessage: message => messages.push(message) } };
      get.copy = value => ({ ...value });
      get.equipNum = card => Number(get.subtype(card)?.slice(-1));
      get.suit = card => card.suit; get.number = card => card.number;
      for (const [name, slot] of [['zhuge',1],['bagua',2],['dilu',3],['chitu',4],['muniu',5]]) lib.card[name] = { type:'equip', subtype:'equip'+slot, fullskin:true };
      const canvas = document.createElement('canvas'); canvas.id = 'chukuang-canvas';
      canvas.style.cssText = 'position:fixed;left:15px;top:10px;width:1050px;height:650px;opacity:0'; document.body.append(canvas);
    });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/equip-layout.js', 'Object.assign(window,{refreshEquipLayout,restoreEquipPresentation});') });
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/equip-effects.js', 'window.installEquipSweepCompatibility=installEquipSweepCompatibility;') });
    await page.addScriptTag({ content: read('extension/皮肤切换/js/modules/chukuang-worker-api.js').replace('export function ', 'function ') + '\nskinSwitch.chukuangWorkerApi=createChukuangWorkerApi(lib,ui,game,_status).chukuangWorkerApi;installEquipSweepCompatibility();installEquipSweepCompatibility();' });
    const mark = read('extension/标记补充/extension.js');
    const start = mark.indexOf('lib.skill._zhuangbeisaoguang_ = {');
    const sweep = mark.slice(start, mark.indexOf('if (config.shiyongkapaitixiao', start)).trim().replace('lib.skill._zhuangbeisaoguang_', 'window.actualSweep').replace('content: function ()', 'content: function (trigger, player)');
    await page.addScriptTag({ content: sweep });
    let passed = 0;
    for (const local of [false, true]) for (const slots of [[1,2,3], [1,2,3,4], [1,2,3,4,5]]) {
      await page.evaluate(({ local, slots }) => {
        ui.arena.replaceChildren();
        window.player = document.createElement('div'); player.className='player'; player.dataset.position=local?'0':'1';
        player.node={equips:document.createElement('div')}; player.node.equips.className='equips'; player.append(player.node.equips); ui.arena.append(player);
        if (local) { const wrap=document.createElement('div');wrap.className='equips-wrap';wrap.append(player.node.equips);ui.arena.append(wrap); }
        for (const slot of slots) { const card=ui.create.card(player.node.equips);card.init(['spade',1,['','zhuge','bagua','dilu','chitu','muniu'][slot]]); }
        refreshEquipLayout(player);
      }, { local, slots });
      for (const slot of slots.filter(slot => slot <= 4)) {
        const result = await page.evaluate(slot => {
          const card=[...player.node.equips.children].find(card => get.equipNum(card)===slot);
          const nativeTimeout=window.setTimeout; let delay;
          window.setTimeout=(callback,milliseconds)=>{delay=milliseconds;callback();return 0;};
          try { actualSweep.content({card},player); } finally { window.setTimeout=nativeTimeout; }
          return {delay,message:messages.at(-1),bounds:card.getBoundingClientRect().toJSON(),canvas:document.getElementById('chukuang-canvas').getBoundingClientRect().toJSON()};
        }, slot);
        assert.equal(result.delay,2000); assert.equal(result.message.sprite.action,'play');
        assert.equal(result.message.position.scale,.6); assert.equal(result.message.position.speed,1);
        assert.deepEqual(result.message.position.x,[0,.5]); assert.deepEqual(result.message.position.y,[0,.5]);
        const expectedBounds={...result.bounds,left:result.bounds.left-result.canvas.left,top:result.bounds.top-result.canvas.top};
        for (const dimension of ['left','top','width','height']) assert(Math.abs(result.message.position.parent.boundRect[dimension]-expectedBounds[dimension])<1, `实际槽位 ${slot} ${dimension}`);
        const clip=result.message.sprite.clip;
        assert.equal(!!clip,slots.includes(5)&&slot>=3,'仅半宽坐骑裁切扫光');
        if (clip) for (const dpr of [1,1.5,2]) {
          assert(Math.abs(clip.x[1]*result.canvas.width*dpr-(result.bounds.left-result.canvas.left)*dpr)<1);
          assert(Math.abs(clip.y[1]*result.canvas.height*dpr-(result.canvas.bottom-result.bounds.bottom)*dpr)<1);
          assert(Math.abs(clip.width[1]*result.canvas.width*dpr-result.bounds.width*dpr)<1);
          assert(Math.abs(clip.height[1]*result.canvas.height*dpr-result.bounds.height*dpr)<1);
        }
        passed++;
      }
    }
    assert(await page.evaluate(() => {
      const sprite={name:'other-effect'}, position={parent:player,x:[0,.63],y:[0,.4]};
      skinSwitch.chukuangWorkerApi.playEffect(sprite,position);
      const untouched=messages.at(-1).position.parent.boundRect.width===player.getBoundingClientRect().width && messages.at(-1).position.x[1]===.63 && !sprite.clip;
      const sweepSprite={name:'../../../标记补充/animation/OL装备/FX_PaiJu_ZhuangBei_saoguang',action:'play'}, sweepPosition={parent:player,x:[0,.63],y:[0,.17]};
      skinSwitch.chukuangWorkerApi.playEffect(sweepSprite,sweepPosition);
      return untouched && !sweepSprite.clip && sweepPosition.parent===player && sweepPosition.x[1]===.63;
    }), '其他特效与调用方参数保持原样');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed,source:'标记补充原扫光入口 + 皮肤切换真实 Worker API',errors},null,2));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode=1; });
