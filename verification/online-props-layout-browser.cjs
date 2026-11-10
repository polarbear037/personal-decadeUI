const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium, seed, root } = require('./online-player-tips-browser.cjs');
seed.characters = ['standard']; seed.cards = ['standard'];
seed.mode_config = { identity: { player_number: '2' } };

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const errors = [];
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/extension/*/chukuangWorker.js', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'extension/皮肤切换/chukuangWorker.js'), 'utf8') + `
self.addEventListener('message', e => {
 if(e.data?.message !== 'ONLINE_PROP_LAYOUT_PROBE') return;
 const animation=playerAnimation.getAnni(null,'4.0');
 self.postMessage({message:'ONLINE_PROP_LAYOUT_RESULT',width:animation.canvas.width,height:animation.canvas.height,nodes:animation.nodes.filter(n=>!n.completed&&String(n.id).startsWith('online-prop-')).map(n=>({id:n.id,name:n.name,action:n.skeleton.state.getCurrent(0)?.animation?.name,x:n.renderX,y:n.renderY,scale:n.renderScale,bounds:n.skeleton.bounds,slots:n.skeleton.slots.map(s=>({name:s.data.name,attachment:s.attachment?.name,width:s.attachment?.width,height:s.attachment?.height,bone:{x:s.bone.worldX,y:s.bone.worldY,scaleX:s.bone.a,scaleY:s.bone.d}}))}))});
});` }));
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
  await page.waitForFunction(async () => { const { game, ui } = await import('/noname.js'); return game.players.length > 1 && !!window.decadeUI && Array.isArray(ui.dialogs) && !!ui.arena; }, null, { timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async origin => {
   const { game, ui, lib, _status } = await import('/noname.js');
   Object.assign(window, { game, ui, lib, _status }); game.pause();
   for (const dialog of [...ui.dialogs]) dialog.close();
   document.querySelector('.decade-welcome-overlay')?.remove();
   ui.arena.classList.remove('choose-character');
   game.me = game.players[0]; game.me.init('liubei'); window.actor = game.players[1]; actor.init('guanyu');
   lib.config.background_audio = false;
   window.skinSwitch = { url: origin + '/extension/皮肤切换/', configKey: {}, isMobile: () => false };
   const { createChukuangWorkerApi } = await import('/extension/皮肤切换/js/modules/chukuang-worker-api.js');
   Object.assign(skinSwitch, createChukuangWorkerApi(lib, ui, game, _status));
   skinSwitch.chukuangWorker = new Worker(skinSwitch.url + 'chukuangWorker.js'); skinSwitch.chukuangWorkerInit = () => {};
   skinSwitch.chukuangWorkerApi.create();
   skinSwitch.chukuangWorkerInit2();
   window.effectStarts = []; const api = skinSwitch.chukuangWorkerApi, post = api._postPlayEffect;
   api._postPlayEffect = function(worker,message,sprite,position,onStart) { return post.call(this,worker,message,sprite,position,success=>{effectStarts.push({id:sprite.id,success});onStart?.(success);}); };
   skinSwitch.chukuangWorker2.addEventListener('error', error => { throw new Error(error.message); });
   window.propsModule = await import('/extension/十周年UI/src/ui/online-props.js');
   window.propsController = propsModule.installOnlineProps(); propsController.show();
   document.querySelector('[data-emotion="flower"]').click();
   window.probe = () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Worker layout probe timeout')), 3000);
    const listener = e => { if (e.data?.message !== 'ONLINE_PROP_LAYOUT_RESULT') return; clearTimeout(timer); skinSwitch.chukuangWorker2.removeEventListener('message', listener); resolve(e.data); };
    skinSwitch.chukuangWorker2.addEventListener('message', listener); skinSwitch.chukuangWorker2.postMessage({message:'ONLINE_PROP_LAYOUT_PROBE'});
   });
   window.rect = node => node.getBoundingClientRect().toJSON();
  }, new URL(page.url()).origin);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  const layout = await page.evaluate(() => ({
   player: rect(actor), avatar: rect(actor.node.avatar), marker: rect(actor.querySelector('.online-prop-target')),
   arrow: rect(actor.querySelector('.online-prop-target img')), text: rect(actor.querySelector('.online-prop-target span')),
   textStyle: {color:getComputedStyle(actor.querySelector('.online-prop-target span')).color,fontSize:getComputedStyle(actor.querySelector('.online-prop-target span')).fontSize},
   items: [...document.querySelectorAll('.online-prop-item')].map(button => ({button:rect(button), icon:rect(button.querySelector('.online-prop-icon')), picture:rect(button.querySelector('.online-prop-icon img')), cost:rect(button.querySelector('.online-prop-cost')), amount:rect(button.querySelector('.online-prop-amount')), basket:rect(button.querySelector('.online-prop-cost img')), overflow:getComputedStyle(button).overflow})),
  }));
  await page.screenshot({ path: path.join(__dirname, process.env.BASELINE ? 'online-props-layout-before.png' : 'online-props-layout-after.png') });
  await page.evaluate(() => propsController.play(game.me, actor, propsModule.onlineProps[0]));
  await page.waitForFunction(() => effectStarts.some(e => e.id.startsWith('online-prop-good-') && e.success));
  // 原骨骼首帧透明，等待真实纹理显现后检查截图。
  await page.waitForTimeout(140);
  const effect = await page.evaluate(() => probe());
  const frame = effect.nodes.find(node => node.id.startsWith('online-prop-good-'));
  assert(frame, '正向命中框必须在真实 Worker 起播');
  const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 1, `${label}: ${actual} != ${expected}`);
  for (const axis of ['x','y','width','height']) close(layout.marker[axis], layout.player[axis], `完整目标区域 ${axis}`);
  close(layout.text.x - layout.player.x, layout.player.width * 26 / 174, '原版提示 X');
  close(layout.text.y - layout.player.y, layout.player.height * 105 / 232, '原版提示 Y');
  close(layout.text.width, layout.player.width * 142 / 174, '原版提示宽度');
  close(layout.arrow.width, layout.player.width * 62 / 174, '原版箭头宽度');
  assert.equal(layout.textStyle.color, 'rgb(255, 255, 0)');
  for (const item of layout.items) {
   const scale = item.button.width / 80;
   close(item.picture.width, 70 * scale, '图标内缩保留边框');
   close(item.picture.x - item.icon.x, 5 * scale, '图标边框左缘');
   close(item.icon.bottom - item.picture.bottom, 5 * scale, '图标边框下缘');
   close(item.amount.width, 41 * scale, '消耗数字宽度');
   close(item.basket.x - item.amount.right, 2 * scale, '数字与菜篮子间距');
  }
  close(frame.x, layout.player.x + layout.player.width / 2, '命中框中心 X');
  close(900 - frame.y, layout.player.y + layout.player.height / 2, '命中框中心 Y');
  assert(frame.scale * 214 >= layout.player.width && frame.scale * 268 >= layout.player.height, '原版框纹理可见区域须覆盖整个 player');
  await page.screenshot({ path:path.join(__dirname, 'online-props-target-frame.png'), clip:{x:layout.player.x-45,y:layout.player.y-45,width:layout.player.width+90,height:layout.player.height+90} });
  await page.locator('.online-prop-panel').screenshot({path:path.join(__dirname,'online-props-panel-layout.png')});
  const scenarios = [];
  for (const zoom of [1, 1.25]) {
   await page.waitForFunction(() => propsController.activeCount === 0);
   await page.evaluate(zoom => { document.body.style.zoom=String(zoom); propsController.hide(); propsController.show(); document.querySelector('[data-emotion="flower"]').click(); },zoom);
   await page.waitForTimeout(50);
   const state = await page.evaluate(() => ({player:rect(actor),marker:rect(actor.querySelector('.online-prop-target')),text:rect(actor.querySelector('.online-prop-target span'))}));
   for (const axis of ['x','y','width','height']) close(state.player[axis],state.marker[axis],`zoom ${zoom} 目标 ${axis}`);
   close(state.text.y-state.player.y,state.player.height*105/232,`zoom ${zoom} 提示 Y`);
   scenarios.push({zoom,...state});
  }
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(__dirname,'online-props-layout-results.json'),JSON.stringify({layout,effect,scenarios,errors},null,2));
  console.log('ONLINE_PROPS_LAYOUT_OK',JSON.stringify({player:layout.player,frame:{x:frame.x,y:frame.y,scale:frame.scale},scenarios:scenarios.length,errors}));
 } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
