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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/probe');
  await page.waitForFunction(async()=>{const {game}=await import('/noname.js');return game.players.length>2&&!!window.decadeUI;});
  await page.waitForTimeout(2000);
  const {results,dynamicResults}=await page.evaluate(async()=>{
   const {game,lib,ui}=await import('/noname.js');
   for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();
   document.querySelector('.decade-welcome-overlay')?.remove();
   game.me=game.players[0];game.me.init('shen_dianwei');game.players[1].init('shen_dianwei');game.players[2].init('liubei');
   for(const name of ['ol_liufeng','sp_zhaoyun'])lib.skill.qiexie.createCard(name);
   const results=[],dynamicResults=[];
   for(const mode of ['local','other','embedded']){
    const player=mode==='other'?game.players[1]:game.me;
    if(mode==='embedded'){
     lib.config.extension_十周年UI_aloneEquip=false;
     ui.arena.dataset.aloneEquip='off';player.appendChild(player.node.equips);
    }
    player.node.equips.replaceChildren();player.vcardsMap.equips=[];
    player.expandedSlots={equip1:1};player.disabledSlots={equip2:1};player.$syncExpand();player.$syncDisable();
    for(const name of ['qiexie_ol_liufeng','qiexie_sp_zhaoyun'])player.directequip(game.createCard(name,'none','none'));
    const ordinary=game.createCard('guanshi','spade',5);game.players[2].directequip(ordinary);
    await document.fonts.ready;await new Promise(r=>setTimeout(r,650));
    for(const card of [...player.node.equips.children,ordinary]){
     const label=card.querySelector('.decade-equip-name');if(!label)continue;
     const style=getComputedStyle(label),labelRect=label.getBoundingClientRect(),iconRect=card.querySelector('.decade-equip-type-icon').getBoundingClientRect(),nameRect=card.node.name2.getBoundingClientRect();
     results.push({mode,name:card.name,text:label.textContent,title:label.title,fits:label.scrollWidth<=label.clientWidth,align:style.textAlign,ellipsis:style.textOverflow,overflow:style.overflow,leftGap:labelRect.left-iconRect.right,rightGap:nameRect.right-labelRect.right,height:card.getBoundingClientRect().height,nameHeight:nameRect.height,background:getComputedStyle(card.node.name2).backgroundImage});
    }
    const {refreshEquipLayout}=await import('/extension/十周年UI/src/ui/equip-layout.js');
    const card=[...player.node.equips.children].find(c=>c.name==='qiexie_ol_liufeng');
    const label=card.querySelector('.decade-equip-name');
    const measure=state=>({mode,state,text:label.textContent,align:getComputedStyle(label).textAlign,ellipsis:getComputedStyle(label).textOverflow,overflow:getComputedStyle(label).overflow,width:label.clientWidth,overflows:label.scrollWidth>label.clientWidth});
    card.style.width='64px';await new Promise(requestAnimationFrame);dynamicResults.push(measure('narrow'));
    card.style.width='240px';await new Promise(requestAnimationFrame);dynamicResults.push(measure('wide'));
    card.suit='spade';refreshEquipLayout(player);dynamicResults.push(measure('suit only'));
    card.suit='none';card.number=7;refreshEquipLayout(player);dynamicResults.push(measure('number only'));
    card.number='none';refreshEquipLayout(player);dynamicResults.push(measure('none restored'));
    card.style.removeProperty('width');
    const other=[...player.node.equips.children].find(c=>c.name==='qiexie_sp_zhaoyun');
    lib.translate.qiexie_sp_zhaoyun='SP赵云测试超长装备名称';refreshEquipLayout(player);
    await new Promise(requestAnimationFrame);
    const otherLabel=other.querySelector('.decade-equip-name');
    dynamicResults.push({mode,state:'long name',text:otherLabel.textContent,align:getComputedStyle(otherLabel).textAlign,ellipsis:getComputedStyle(otherLabel).textOverflow,overflow:getComputedStyle(otherLabel).overflow,width:otherLabel.clientWidth,overflows:otherLabel.scrollWidth>otherLabel.clientWidth});
    if(mode!=='embedded'){lib.translate.qiexie_sp_zhaoyun='SP赵云';refreshEquipLayout(player);}
   }
   return {results,dynamicResults};
  });
  fs.writeFileSync(path.join(__dirname,'equip-name-browser-results.json'),JSON.stringify({results,dynamicResults,errors},null,2));
  for(const result of results){
   assert.equal(result.text,result.name==='qiexie_ol_liufeng'?'OL界刘封':result.name==='qiexie_sp_zhaoyun'?'SP赵云':'贯石斧\u00a03');
   if(result.name==='qiexie_ol_liufeng')assert.equal(result.title,'OL界刘封');
   assert(result.fits,result.mode+' '+result.name+' 名称溢出');
   assert.equal(result.ellipsis,'ellipsis');assert.equal(result.overflow,'hidden');
   assert.equal(result.align,result.name==='guanshi'?'left':'center');
   if(result.name!=='guanshi'){assert(Math.abs(result.leftGap-3)<1,'名称未紧随图标');assert(Math.abs(result.rightGap-2)<1,'名称未占满右侧');}
  }
  for(const result of dynamicResults){
   assert.equal(result.align,['suit only','number only'].includes(result.state)?'left':'center');
   assert.equal(result.ellipsis,'ellipsis');assert.equal(result.overflow,'hidden');
   assert.equal(result.overflows,['narrow','long name'].includes(result.state),result.mode+' '+result.state+' 动态截断状态错误');
   assert.equal(result.text,result.state==='long name'?'SP赵云测试超长装备名称':'OL界刘封','完整名称被按字符数裁剪');
  }
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(__dirname,'equip-name-browser.png')});
  console.log(JSON.stringify({passed:results.length+dynamicResults.length,modes:['local','other','embedded'],errors},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
