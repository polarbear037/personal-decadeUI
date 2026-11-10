const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, _electron } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '../../..');
const enabled = process.argv.includes('--decade');
const thunder = process.argv.includes('--thunder');
const seed = {extension_十周年UI_JDTSYangshi:"3",extensions:[...(enabled?['十周年UI']:[]),...(thunder?['雷霆']:[])], extension_十周年UI_enable:true, extension_雷霆_enable:true, extension_十周年UI_newDecadeStyle:'onlineUI',extension_十周年UI_eruda:false,extension_十周年UI_optimizePrompt:true,extension_十周年UI_cardPrompt:false,extension_十周年UI_aloneEquip:true,tl_theme_theme:'新版OL',show_splash:thunder?'init':'off',splash_style:thunder?'thunder-lobby':'style1',layout:'newlayout',new_tutorial:true,extension_十周年UI_welcomeDialog:false};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (['/checkFile', '/getFileList', '/readFile'].includes(pathname)) {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const target = path.resolve(root, params.get('fileName') || params.get('dir') || '.');
    res.setHeader('Content-Type', 'application/json');
    if (target !== root && !target.startsWith(root + path.sep)) return res.writeHead(403).end();
    let data;
    if (pathname === '/checkFile') data = target.endsWith('noname.config.txt') ? null : fs.existsSync(target) ? fs.statSync(target).isDirectory() ? 'directory' : 'file' : null;
    if (pathname === '/getFileList') { const entries=fs.readdirSync(target,{withFileTypes:true}); data={folders:entries.filter(e=>e.isDirectory()).map(e=>e.name),files:entries.filter(e=>e.isFile()).map(e=>e.name)}; }
    if (pathname === '/readFile') data = Array.from(fs.readFileSync(target));
    return res.end(JSON.stringify({success:true,data}));
  }
  if (pathname === '/probe') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/noname.js","vue":"/node_modules/.pnpm/vue@3.5.28/node_modules/vue/dist/vue.esm-browser.js","pinyin-pro":"/node_modules/.pnpm/pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.js","dedent":"/node_modules/.pnpm/dedent@1.7.1/node_modules/dedent/dist/dedent.js"}}</script><script type="module">localStorage.setItem("gplv3_noname_alerted","true");sessionStorage.setItem("thunderLobby","true");window.alert=message=>console.error(message);window.confirm=()=>true;await new Promise((resolve,reject)=>{const req=indexedDB.open("noname_0.9_"+(typeof __dirname==="string"&&__dirname.length?__dirname.split("/").filter(Boolean).map(p=>/[a-z]/i.test(p[0])?p[0]:"_").join("")+"_":"")+"data",4);req.onupgradeneeded=()=>{for(const name of ["config","data","image","audio"])req.result.createObjectStore(name);req.result.createObjectStore("video",{keyPath:"time"});};req.onsuccess=()=>{const tx=req.result.transaction("config","readwrite");for(const [k,v] of Object.entries('+JSON.stringify(seed)+'))tx.objectStore("config").put(v,k);tx.oncomplete=()=>{req.result.close();resolve();};};req.onerror=reject;});await import("/noname/entry.js");</script>');
  }
  if (pathname === '/favicon.ico') return res.writeHead(204).end();
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({'.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
  if (pathname === '/game/config.json') {
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.assign(config, { extensions: enabled ? ['十周年UI'] : [], extension_十周年UI_enable: true, extension_十周年UI_newDecadeStyle: 'onlineUI', extension_十周年UI_eruda: false, show_splash: 'off', touchscreen: false, tutorial: true, splash_style: 'style1', animation: false, compatible: true, ...seed });
    return res.end(JSON.stringify(config));
  }
  fs.createReadStream(file).pipe(res);
});


const assert=require('node:assert/strict');
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],consoleErrors=[],badResponses=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)badResponses.push({status:r.status(),url:new URL(r.url()).pathname});});
  await page.goto('http://127.0.0.1:'+server.address().port+'/probe');
  await page.waitForFunction(async()=>{const {game}=await import('/noname.js');return game.players.length>1&&!!window.decadeUI;});
  await page.waitForTimeout(1500);
  await page.evaluate(async()=>{
   const {game,ui,lib}=await import('/noname.js');
   for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();
   document.querySelector('.decade-welcome-overlay')?.remove();
   game.me=game.players[0];game.me.init('shen_dianwei');game.players[1].init('shen_dianwei');
   window.testPlayer=game.me;
   window.equipState=(expanded,disabled,names)=>{
    const p=testPlayer;
    p.node.equips.replaceChildren();p.vcardsMap.equips=[];p.expandedSlots=expanded;p.disabledSlots=disabled;
    p.$syncExpand();p.$syncDisable();
    for(const name of names)p.directequip(game.createCard(name,'spade',5));
    p.$handleEquipChange();
   };
   window.measureEquips=()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    return {layout:testPlayer.node.equips.dataset.equipLayout,cards:[...testPlayer.node.equips.children].filter(c=>!c.classList.contains('hidden')).map(c=>({name:c.name,display:getComputedStyle(c).display,...rect(c)})),backgrounds:testPlayer.node.equips.parentElement===ui.equipSolts?[...ui.equipSolts.back.children].map(c=>({type:c.dataset.type,display:getComputedStyle(c).display,...rect(c)})):[]};
   };

  });
  const results=[];
  const check=async(label,expanded,disabled,names)=>{
   await page.evaluate(({expanded,disabled,names})=>equipState(expanded,disabled,names),{expanded,disabled,names});
   await page.waitForTimeout(650);
   const state=await page.evaluate(()=>measureEquips());
   const visible=state.cards.filter(c=>c.display!=='none');
   for(let a=0;a<visible.length;a++)for(let b=a+1;b<visible.length;b++){
    const x=visible[a],y=visible[b];
    assert(Math.min(x.right,y.right)-Math.max(x.x,y.x)<1||Math.min(x.bottom,y.bottom)-Math.max(x.y,y.y)<1,label+': 装备重叠 '+x.name+'/'+y.name);
   }
   const weapons=visible.filter(c=>['zhuge','qinggang','cixiong'].includes(c.name)||c.name.startsWith('qiexie_'));
   if((expanded.equip1||0)>0&&(disabled.equip2||0)>0){
    assert.equal(state.cards.find(c=>c.name==='feichu_equip2')?.display,'none',label+': 废除防具未隐藏');
    if(state.backgrounds.length){
     const bg=state.backgrounds.filter(c=>c.type==='0');assert.equal(bg.length,1+expanded.equip1);
     for(let i=1;i<bg.length;i++)assert(bg[i].y>bg[i-1].y,label+': 武器空槽背景重叠');
    }
   }
   if(weapons.length>1)assert(new Set(weapons.map(c=>c.y)).size===weapons.length,label+': 双武器未分行');
   results.push({label,...state});return state;
  };
  for(const mode of ['local','other','embedded']){
   await page.evaluate(async mode=>{
    const {game,lib,ui}=await import('/noname.js');
    testPlayer=mode==='other'?game.players[1]:game.me;
    if(mode==='embedded'){
     lib.config.extension_十周年UI_aloneEquip=false;
     ui.arena.dataset.aloneEquip='off';game.me.appendChild(game.me.node.equips);
    }
   },mode);
   await check(mode+' empty',{equip1:1},{equip2:1},[]);
   await check(mode+' one',{equip1:1},{equip2:1},['zhuge']);
   await check(mode+' two',{equip1:1},{equip2:1},['zhuge','qinggang','dilu','chitu','muniu']);
   await page.evaluate(async()=>{document.querySelector('.decade-welcome-overlay')?.remove();await document.fonts.ready;});
   await page.screenshot({path:path.join(__dirname,'extra-equip-'+mode+'.png')});
   await check(mode+' horses',{equip1:1},{equip2:1},['zhuge','qinggang','dilu','chitu']);
   await check(mode+' lone horse',{equip1:1},{equip2:1},['zhuge','qinggang','chitu','muniu']);
   await check(mode+' disabled horses',{equip1:1},{equip2:1,equip3:1,equip4:1},['zhuge','qinggang','muniu']);
   await check(mode+' disabled weapon',{equip1:1},{equip1:1,equip2:1},['zhuge','muniu']);
   await page.evaluate(async()=>{const {lib}=await import('/noname.js');lib.skill.qiexie.createCard('guanyu');lib.skill.qiexie.createCard('liubei');});
   await check(mode+' qiexie',{equip1:1},{equip2:1},['qiexie_guanyu','qiexie_liubei','dilu','chitu','muniu']);
   const restored=await check(mode+' armor restored',{equip1:1},{},['zhuge','qinggang','bagua','dilu','chitu','muniu']);
   assert(restored.cards.find(c=>c.name==='bagua').height>0);
   await check(mode+' three weapons',{equip1:2},{equip2:1},['zhuge','qinggang','cixiong','dilu','chitu','muniu']);
   await check(mode+' two armors',{equip2:1},{},['zhuge','bagua','renwang','dilu','chitu','muniu']);
   const reverted=await check(mode+' expansion removed',{}, {equip2:1},['zhuge','dilu','chitu','muniu']);
   assert.notEqual(reverted.cards.find(c=>c.name==='feichu_equip2').display,'none');
   await check(mode+' normal',{}, {},['zhuge','bagua','dilu','chitu','muniu']);
   const clean=await page.evaluate(()=>!testPlayer.node.equips.dataset.expandedEquip&&![...testPlayer.node.equips.children].some(c=>c.style.getPropertyValue('--equip-row')||c.dataset.equipReplaced));
   assert(clean,mode+': 扩展布局残留');
   await check(mode+' before sync',{}, {equip2:1},[]);
   const synced=await page.evaluate(()=>{
    testPlayer.expandedSlots={equip1:1};testPlayer.$syncExpand();
    return testPlayer.node.equips.dataset.expandedEquip==='true'&&testPlayer.node.equips.querySelector('.feichu').dataset.equipReplaced==='true';
   });
   assert(synced,mode+': 空栏扩展未立即刷新');
   await check(mode+' observer before loss',{equip1:1},{equip2:1},['zhuge','qinggang','dilu','chitu','muniu']);
   await page.evaluate(()=>{
    const card=[...testPlayer.node.equips.children].find(c=>c.name==='qinggang');
    testPlayer.vcardsMap.equips=testPlayer.vcardsMap.equips.filter(c=>c.name!=='qinggang');card.remove();
   });
   await page.waitForFunction(()=>{
    const card=[...testPlayer.node.equips.children].find(c=>c.name==='zhuge');
    return getComputedStyle(card).gridRowStart==='1';
   });
   const afterLoss=await page.evaluate(()=>measureEquips());
   assert(!afterLoss.cards.some(c=>c.name==='qinggang'),mode+': 失去武器后残留');
   results.push({label:mode+' observer after loss',...afterLoss});
  }
  assert.deepEqual(errors,[],'Browser page errors');
  fs.writeFileSync(path.join(__dirname,'extra-equip-browser-results.json'),JSON.stringify({passed:results.length,errors,consoleErrors,badResponses,results},null,2));
  console.log(JSON.stringify({passed:results.length,errors,consoleErrors,badResponses},null,2));
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
