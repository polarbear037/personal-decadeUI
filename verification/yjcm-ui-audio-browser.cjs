const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { server, chromium } = require('./online-player-tips-browser.cjs');
const root = path.resolve(__dirname, '..');
const report = require('./yjcm-ui-audio-source.json');
for (const asset of report.assets) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset.destination))).digest('hex'), asset.sha256);
const source = fs.readFileSync(path.join(root, 'src/audio/enhancedAudio.js'), 'utf8').replace(/^import[^;]+;\s*/m, '').replace(/export \{[^}]+\};?\s*$/m, '');
const lbtn = fs.readFileSync(path.join(root, 'ui/lbtn/skins/xinsha.js'), 'utf8').replace(/^import[^;]+;\s*/gm, '').replace('export function', 'function');
const engine = fs.readFileSync(path.resolve(root, '../../noname/game/index.js'), 'utf8');
const start = engine.indexOf('  playAudio(...args) {');
const nativeAudio = engine.slice(start, engine.indexOf('\n  /**', start));
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const origin = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
 const page = await browser.newPage();
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
 try {
  await page.goto(origin + '/extension/十周年UI/info.json');
  await page.setContent('<meta charset="utf-8"><style>.control,.skillitem,.xiandingji,.yjcm-button,.card,button{display:inline-block;padding:15px;margin:5px}body{min-height:650px}</style><div id="arena"><div id="dui-controls"><div class="control"><span id="ok">确定</span><span id="cancel">取消</span><span id="end">结束回合</span></div></div><div class="skillitem" id="skill">技能</div><div class="xiandingji" id="limited">限定技</div><div class="skillitem locked" id="locked">锁定技</div><button disabled id="disabled">禁用</button><div class="handcards"><div class="card" id="card"><span id="face">手牌</span></div></div><div class="button card" id="dialog-card">选牌窗</div><button id="keyboard">键盘按钮</button><div class="control" id="touch">触摸</div></div>');
  await page.evaluate(({ origin, nativeAudio }) => {
   Array.prototype.add = function(v) { if (!this.includes(v)) this.push(v); return this; };
   Array.prototype.remove = function(v) { const i = this.indexOf(v); if (i >= 0) this.splice(i, 1); return this; };
   window.calls = []; window.played = []; window.actions = [];
   window.lib = { config: { extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_bettersound: true, background_audio: true, volumn_audio: 4, repeat_audio: false }, skill: {}, assetURL: origin + '/', path: { extname: p => p.match(/\.[^./]+$/)?.[0] || '' } };
   window.get = { objtype: v => v && typeof v === 'object' ? 'object' : typeof v };
   window._status = { skillaudio: [] };
   window.ui = { window: document.body, create: { div(selector, parent) { const n = document.createElement('div'); n.className = selector.replace(/^\./, '').replaceAll('.', ' '); parent?.append(n); return n; } }, click: { configMenu: () => actions.push('settings'), auto: () => actions.push('auto') } };
   window.game = { addVideo() {}, over: () => actions.push('over') };
   const play = new Function('return ({' + nativeAudio + '}).playAudio')();
   game.playAudio = function(...args) { calls.push(args.at(-1)); const audio = play.apply(this, args); audio?.addEventListener('playing', () => played.push({ src: decodeURIComponent(audio.src), volume: audio.volume })); return audio; };
   window.createBaseLbtnPlugin = () => ({});
   window.createXinshaBackgroundSelector = () => ({ open: () => actions.push('background') });
   window.installXinshaProps = () => ({ show() {} });
   document.body.dataset.style = 'othersOff';
   document.getElementById('ok').link = 'ok'; document.getElementById('cancel').link = 'cancel';
   document.getElementById('card').onclick = function() { this.classList.toggle('selected'); actions.push('card'); };
  }, { origin, nativeAudio });
  await page.addScriptTag({ content: source + '\nwindow.setupEnhancedAudio=t;' });
  await page.addScriptTag({ content: lbtn + '\nwindow.createXinshaLbtnPlugin=createXinshaLbtnPlugin;' });
  await page.evaluate(() => {
   setupEnhancedAudio(); setupEnhancedAudio();
   const plugin = createXinshaLbtnPlugin(lib, game, ui, get, {}, _status, {});
   plugin.createTopRightMenu();
   plugin.createOfficialButton('yjcm-sort', '整理', () => actions.push('sort'));
   plugin.createOfficialButton('yjcm-select-all', '全选', () => actions.push('all'));
   plugin.createOfficialButton('yjcm-question', '问号', () => actions.push('question'));
  });
  let expected = 0;
  const sound = async (action, name) => {
   await page.waitForTimeout(85); await action(); expected++;
   await page.waitForFunction(n => played.length >= n, expected);
   await page.waitForTimeout(85);
   assert.equal(await page.evaluate(() => calls.length), expected, '每次操作只播放一次');
   assert.equal(await page.evaluate(() => calls.at(-1)), `audio/xinsha-ui/${name}.mp3`);
  };
  const click = id => page.locator(id).click({ delay: 70 });
  for (const [id, name] of [['#ok','BtnSure'],['#cancel','GameHold'],['#end','TurnOver'],['#skill','SkillBtn'],['#limited','SkillBtn'],['.yjcm-sort','CardSortAndSelectAll'],['.yjcm-select-all','CardSortAndSelectAll'],['.yjcm-question','FuncButton']]) await sound(() => click(id), name);
  await sound(() => click('.yjcm-menu-main'), 'SystemMenuClick');
  await sound(() => click('.yjcm-menu-setting'), 'SystemMenuClick');
  assert(await page.evaluate(() => actions.includes('settings')));
  await sound(() => click('#face'), 'GameChooseCard');
  await click('#face'); assert.equal(await page.evaluate(() => calls.length), expected, '取消选中不播放');
  await sound(() => click('#face'), 'GameChooseCard');
  await sound(() => click('#dialog-card'), 'GameChooseCard');
  await page.locator('#keyboard').focus(); await sound(() => page.keyboard.press('Enter'), 'BtnSure');
  await page.locator('.yjcm-select-all').focus(); await sound(() => page.keyboard.press('Enter'), 'CardSortAndSelectAll');
  await sound(() => page.locator('#touch').dispatchEvent('touchend'), 'BtnSure');
  await sound(() => page.locator('#touch').dispatchEvent('touchend'), 'BtnSure');
  await click('#locked'); await page.locator('#disabled').dispatchEvent('pointerdown', { button: 0 });
  await page.locator('#skill').click({ button: 'right' });
  assert.equal(await page.evaluate(() => calls.length), expected, '锁定/禁用/右键不播放');
  await page.evaluate(() => { lib.config.background_audio = false; }); await click('#ok');
  assert.equal(await page.evaluate(() => calls.length), expected, '音效关闭');
  await page.evaluate(() => { lib.config.background_audio = true; lib.config.extension_十周年UI_bettersound = false; });
  await sound(() => click('#ok'), 'BtnSure');
  const decoded = await page.evaluate(async assets => {
   const context = new AudioContext();
   try { return await Promise.all(assets.map(async a => { const data = await (await fetch('/extension/十周年UI/' + a.destination)).arrayBuffer(); const b = await context.decodeAudioData(data); return b.duration > 0; })); } finally { await context.close(); }
  }, report.assets);
  assert(decoded.every(Boolean), '全部官方音频解码');
  assert((await page.evaluate(() => played)).every(a => a.volume === .5), '沿用本体音量');
  const xinshaPlayed = expected;
  for (const [style, enabled, controlSound] of [['onlineUI', false, 'button4.ogg'], ['on', false, null], ['on', true, 'BtnSure'], ['othersOn', false, null]]) {
   await page.evaluate(({style, enabled}) => { lib.config.extension_十周年UI_newDecadeStyle = style; document.body.dataset.style = style; lib.config.extension_十周年UI_bettersound = enabled; }, {style, enabled});
   await page.waitForTimeout(85); await click('#ok');
   if (controlSound) {
    expected++; await page.waitForFunction(n => played.length >= n, expected);
    assert.equal(await page.evaluate(() => calls.at(-1)), `audio/${controlSound}`);
   }
   assert.equal(await page.evaluate(() => calls.length), expected, style + ' 确认按钮隔离');
   await page.waitForTimeout(85); await click('#face'); expected++;
   await page.waitForFunction(n => played.length >= n, expected);
   assert.equal(await page.evaluate(() => calls.at(-1)), 'audio/btn_activity_listItem1.ogg', style + ' 保留原手牌音效');
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(__dirname, 'yjcm-ui-audio-results.json'), JSON.stringify({ xinshaPlayed, played: expected, decoded: decoded.length, isolationStyles: ['onlineUI','on','othersOn'], errors, currentElectron: false, officialClientRuntime: false }, null, 2) + '\n');
  console.log('YJCM_UI_AUDIO_OK:', expected, 'native playbacks; 8 decoded MP3s; Xinsha menu/keyboard/card/touch/dedupe/mute and 3 other styles passed');
 } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
