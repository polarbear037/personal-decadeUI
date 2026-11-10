const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '../../..');
const server = http.createServer((req, res) => {
 const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
 if (pathname === '/favicon.ico') return res.writeHead(204).end();
 if (pathname === '/phase-noname.js') {
  res.setHeader('Content-Type','text/javascript');
  return res.end('export const {game,ui,lib,_status,get}=window;');
 }
 if (pathname === '/phase-fixture') {
  res.setHeader('Content-Type','text/html;charset=utf-8');
  return res.end('<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/phase-noname.js"}}</script><link rel="stylesheet" href="/layout/default/layout.css"><link rel="stylesheet" href="/extension/十周年UI/src/styles/layout.css"><style>body{margin:0;background:#443827}#window{position:absolute;width:1280px;height:720px}#arena{background:linear-gradient(#65533c,#302b24)}#me{position:absolute;bottom:0;height:160px;width:100%}.sample-hand{position:absolute;left:100px;bottom:18px;display:flex;gap:4px}.sample-hand span{background:#e1d8bd;color:#25231e;font:24px serif;width:86px;height:120px;padding:4px;box-sizing:border-box}.table-caption{left:40px;top:35px;color:#c4b088}</style><div id="window"><div id="arena"><div class="table-caption">OL 阶段提示验收</div><div class="sample-hand"><span>无中<br>生有</span><span>顺手<br>牵羊</span><span>杀</span><span>桃</span></div></div><div id="me"></div></div>');
 }
 const filename = path.resolve(root, '.' + pathname);
 if (!filename.startsWith(root + path.sep)) return res.writeHead(403).end();
 fs.readFile(filename, (error,data) => {
  if(error)return res.writeHead(404).end();
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf'})[path.extname(filename)]||'application/octet-stream');
  res.end(data);
 });
});

(async () => {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[],badResponses=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('response',r=>{if(r.status()>=400)badResponses.push([r.status(),r.url()])});
  await page.goto(`http://127.0.0.1:${server.address().port}/phase-fixture`);
  await page.evaluate(async()=>{
   window.lib={assetURL:location.origin+'/',config:{extension_十周年UI_JDTSYangshi:'3'},skill:{},onover:[]};
   window.game={me:{},players:[{},{}]};
   window._status={currentPhase:game.me};
   window.get={mode:()=> 'identity'};
   window.ui={window:document.querySelector('#window'),arena:document.querySelector('#arena'),me:document.querySelector('#me'),create:{div(selector,str,parent){
    if(str instanceof Node){parent=str;str=''}
    const div=document.createElement('div');div.className=selector.replace(/^\./,'').replaceAll('.',' ');div.textContent=str||'';
    div.show=()=>div.classList.remove('hidden');div.hide=()=>div.classList.add('hidden');parent?.appendChild(div);return div;
   }}};
   window.decadeUI={boundsCaches:{hand:{cardWidth:108,cardScale:.8,check(){}}}};
   const {initPrecontentUI}=await import('/extension/十周年UI/src/ui/progress-bar.js');initPrecontentUI();
   const {initPhaseTipsSkills}=await import('/extension/十周年UI/src/ui/phase-tips.js');initPhaseTipsSkills();
   window.phaseConfig=await import('/extension/十周年UI/src/config/handlers/component-handlers.js');
   window.readPhase=()=>{const node=_status.as_showImage;if(!node)return null;const style=getComputedStyle(node),banner=node.firstElementChild;return {phase:node.dataset.phase,text:node.textContent,zIndex:style.zIndex,display:style.display,width:banner?.offsetWidth,height:banner?.offsetHeight,font:banner&&getComputedStyle(banner).fontSize,color:banner&&getComputedStyle(banner).color,rect:node.getBoundingClientRect().toJSON()}};
  });
  const stages=[['phaseBegin','回合开始'],['phaseZhunbeiBefore','准备阶段'],['phaseJudgeBefore','判定阶段'],['phaseDrawBefore','摸牌阶段'],['phaseUseBefore','出牌阶段'],['phaseDiscardBefore','弃牌阶段'],['phaseJieshuBefore','回合结束'],['phaseEnd','回合结束']];
  const results=[];
  for(const [event,text] of stages){
   const result=await page.evaluate(async event=>{const skill=lib.skill['_jdts_'+event];if(!skill.filter({},game.me))throw Error('stage filter rejected');await skill.content();return readPhase()},event);
   assert.equal(result.text,text);assert.equal(result.zIndex,'6');assert.equal(result.color,'rgb(196, 176, 136)');
   assert(Math.abs(result.rect.width-1280*.085)<.1,'width must come from CSS');
   assert(Math.abs(result.rect.left-1280*.07)<.1,'left must come from CSS');
   assert(Math.abs(result.rect.top-720*.615)<.1,'top must come from CSS');
   assert(Math.abs(result.rect.width/result.rect.height-132/28)<.02,'official aspect ratio');
   assert(Math.abs(parseFloat(result.font)-result.rect.width*26/132)<.1,'font must scale with CSS width');
   results.push(result);
  }
  const animation=await page.evaluate(async()=>{
   game.showJDTsImage('cpjd',true);await document.fonts.ready;
   const node=_status.as_showImage,banner=node.firstElementChild,anim=banner.getAnimations()[0];
   anim.pause();const samples=[];
   for(const time of [0,120,240]){anim.currentTime=time;const s=getComputedStyle(banner);samples.push({time,opacity:Number(s.opacity),x:new DOMMatrix(s.transform).m41})}
   anim.finish();
   const img=new Image;img.src=new URL('/extension/十周年UI/image/ui/phase/online/win_info_time_bg.png',location);await img.decode();
   const pseudo=getComputedStyle(banner,'::before');return {samples,bg:img.width+'x'+img.height,border:pseudo.borderImageSlice,fontReady:document.fonts.check('26px dui-online-phase')};
  });
  assert.equal(animation.samples[0].opacity,0);assert(animation.samples[1].opacity>0&&animation.samples[1].opacity<1);assert.equal(animation.samples[2].opacity,1);assert.equal(animation.samples[0].x,-18);assert.equal(animation.samples[2].x,0);assert.equal(animation.bg,'30x30');assert.equal(animation.fontReady,true);
  await page.waitForTimeout(220);
  const cssPosition = await page.evaluate(() => {
   const node = _status.as_showImage;
   const inline = {left:node.style.left,top:node.style.top,transform:node.style.transform};
   const rule = document.createElement('style');rule.textContent='#window > .decade-online-phase-tip{left:10%;top:55%}';document.head.appendChild(rule);
   const rect=node.getBoundingClientRect().toJSON();rule.remove();return {inline,rect};
  });
  assert.deepEqual(cssPosition.inline,{left:'',top:'',transform:''});
  assert(Math.abs(cssPosition.rect.left-128)<.1);assert(Math.abs(cssPosition.rect.top-396)<.1);
  await page.screenshot({path:path.join(__dirname,'online-phase-tips.png')});
  const lifecycle=await page.evaluate(async()=>{
   const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
   await lib.skill._jdts_ddxy_respond.content({},{});
   const response=readPhase();await lib.skill._jdts_ddxy_end.content();const restored=readPhase();
   game.showJDTsImage('mpjd',.04);game.showJDTsImage('cpjd',true);await sleep(80);const afterOldTimer=readPhase();
   lib.config.extension_十周年UI_JDTSYangshi='2';phaseConfig.onJDTSYangshiUpdate();
   const legacy={url:_status.as_showImage.style.backgroundImage,olNodes:document.querySelectorAll('.decade-online-phase-tip').length};
   game.showJDTsImage('mpjd',.04);lib.config.extension_十周年UI_JDTSYangshi='3';phaseConfig.onJDTSYangshiUpdate();await sleep(80);const afterLegacyTimer=readPhase();
   for(let i=0;i<15;i++)game.showJDTsImage(i%2?'cpjd':'mpjd',true);
   await sleep(230);const surviving=document.querySelectorAll('.decade-online-phase-tip').length;
   const node=_status.as_showImage;game.showJDTsImage(node.dataset.phase,true);const repeated=node===_status.as_showImage;
   ui.window.style.height='800px';await sleep(50);const resized=readPhase();
   lib.config.extension_十周年UI_JDTSYangshi='0';phaseConfig.onJDTSYangshiUpdate();const off={nodes:document.querySelectorAll('.decade-online-phase-tip').length,active:!!_status.as_showImage};
   lib.config.extension_十周年UI_JDTSYangshi='3';phaseConfig.onJDTSYangshiUpdate();game.showJDTsImage('cpjd',true);lib.onover.forEach(fn=>fn());
   return {response,restored,afterOldTimer,legacy,afterLegacyTimer,surviving,repeated,resized,off,over:document.querySelectorAll('.decade-online-phase-tip').length};
  });
  assert.equal(lifecycle.response.text,'等待响应');assert.equal(lifecycle.restored.text,'回合结束');assert.equal(lifecycle.afterOldTimer.text,'出牌阶段');assert.match(lifecycle.legacy.url,/hhjs\.png/);assert.equal(lifecycle.legacy.olNodes,0);assert.equal(lifecycle.afterLegacyTimer.text,'回合结束');assert.equal(lifecycle.surviving,1);assert.equal(lifecycle.repeated,true);assert(lifecycle.resized.rect.top>results[0].rect.top);assert.deepEqual(lifecycle.off,{nodes:0,active:false});assert.equal(lifecycle.over,0);
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
  const report={stages:results,animation,cssPosition,lifecycle,errors,badResponses};
  fs.writeFileSync(path.join(__dirname,'online-phase-tips-results.json'),JSON.stringify(report,null,2));
  console.log('ONLINE_PHASE_TIPS_BROWSER_OK',JSON.stringify({stages:stages.length,animation,lifecycle,errors,badResponses}));
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
