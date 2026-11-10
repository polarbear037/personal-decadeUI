const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '../../..');
const seed = {
  extensions: ['十周年UI'], extension_十周年UI_enable: true,
  extension_十周年UI_newDecadeStyle: 'onlineUI', extension_十周年UI_eruda: false,
  extension_十周年UI_welcomeDialog: false, extension_十周年UI_cardPrompt: false,
  extension_十周年UI_welcomeVersion: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../info.json'), 'utf8')).version,
  show_splash: 'off', splash_style: 'style1', new_tutorial: true, layout: 'newlayout',
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost'), pathname = decodeURIComponent(url.pathname);
  if (pathname === '/favicon.ico') return res.writeHead(204).end();
  if (['/checkFile', '/getFileList', '/readFile'].includes(pathname)) {
    const target = path.resolve(root, url.searchParams.get('fileName') || url.searchParams.get('dir') || '.');
    if (target !== root && !target.startsWith(root + path.sep)) return res.writeHead(403).end();
    let data;
    if (pathname === '/checkFile') data = target.endsWith('noname.config.txt') ? null : fs.existsSync(target) ? fs.statSync(target).isDirectory() ? 'directory' : 'file' : null;
    if (pathname === '/getFileList') {
      const entries = fs.readdirSync(target, { withFileTypes: true });
      data = { folders: entries.filter(e => e.isDirectory()).map(e => e.name), files: entries.filter(e => e.isFile()).map(e => e.name) };
    }
    if (pathname === '/readFile') data = Array.from(fs.readFileSync(target));
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, data }));
  }
  if (pathname === '/mate-hand-probe') {
    res.setHeader('Content-Type', 'text/html;charset=utf-8');
    return res.end(`<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/noname.js","vue":"/node_modules/.pnpm/vue@3.5.28/node_modules/vue/dist/vue.esm-browser.js","pinyin-pro":"/node_modules/.pnpm/pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.js","dedent":"/node_modules/.pnpm/dedent@1.7.1/node_modules/dedent/dist/dedent.js"}}</script><script type="module">
      localStorage.setItem('gplv3_noname_alerted','true');sessionStorage.setItem('thunderLobby','true');window.confirm=()=>true;
      await new Promise((resolve,reject)=>{const request=indexedDB.open('noname_0.9_data',4);request.onupgradeneeded=()=>{for(const name of ['config','data','image','audio'])request.result.createObjectStore(name);request.result.createObjectStore('video',{keyPath:'time'});};request.onsuccess=()=>{const tx=request.result.transaction('config','readwrite');for(const [k,v] of Object.entries(${JSON.stringify(seed)}))tx.objectStore('config').put(v,k);tx.oncomplete=()=>{request.result.close();resolve();};};request.onerror=reject;});
      await import('/noname/entry.js');</script>`);
  }
  const filename = path.resolve(root, '.' + pathname);
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' })[path.extname(filename)] || 'application/octet-stream');
  if (pathname === '/game/config.json') return res.end(JSON.stringify({ ...JSON.parse(fs.readFileSync(filename, 'utf8')), ...seed }));
  fs.createReadStream(filename).pipe(res);
});


// 两个真实浏览器客户端，经loopback WebSocket和本体Client编解码走定向消息。
const wireServer = new (require('ws').Server)({ server });
const wirePeers = new Map();
wireServer.on('connection', socket => {
 const role = new URL(socket.upgradeReq.url, 'http://localhost').searchParams.get('role');wirePeers.set(role,socket);
 socket.on('message', raw => { const peer=wirePeers.get(role==='host'?'receiver':'host'); if(peer)peer.send(raw); });
 socket.on('close',()=>wirePeers.delete(role));
});
async function verifyNetwork(browser, host) {
 const sender = await browser.newPage({viewport:{width:1440,height:900}}), receiver = await browser.newPage({viewport:{width:1440,height:900}});
 for(const page of [sender,receiver]) {
  await page.goto('http://127.0.0.1:'+server.address().port+'/mate-hand-probe');
  await page.waitForFunction(async()=>{const{game,ui}=await import('/noname.js');return game.players.length>1&&window.decadeUI&&ui.arena&&Array.isArray(ui.dialogs);},null,{timeout:45000});
  await page.waitForTimeout(1200);
  await page.evaluate(async()=>{
   const {game,ui,lib,get,_status}=await import('/noname.js');Object.assign(window,{game,ui,lib,get,_status});game.pause();for(const d of [...ui.dialogs])d.close();document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
   game.me=game.players[0];game.me.init('liubei');game.players[1].init('guanyu');game.me.side=game.players[1].side=true;_status.over=false;_status.gameStarted=true;
   lib.skill.mate_network_probe={charlotte:true,ai:{viewHandcard:true,skillTagFilter(player,tag,arg){return player.side===arg.side;}}};game.me.addSkill('mate_network_probe');
  });
 }
 const endpoint='ws://127.0.0.1:'+server.address().port;
 await host.evaluate(async endpoint=>{
  document.body.style.zoom='';setCards(5);game.me.playerid='sender';mate.playerid='receiver';lib.playerOL ||= {};lib.node ||= {};lib.playerOL.sender=game.me;lib.playerOL ||= {};lib.playerOL.receiver=mate;lib.node.observing=[];window.privatePackets=0;
  window.mateHostWire=new WebSocket(endpoint+'/wire?role=host');await new Promise(resolve=>mateHostWire.onopen=resolve);
  mate.ws=new lib.element.Client({send(raw){privatePackets++;mateHostWire.send(raw);}},true);
  mateHostWire.onmessage=event=>{const args=JSON.parse(event.data);for(let i=1;i<args.length;i++)args[i]=get.parsedResult(args[i]);lib.message.server[args.shift()].apply({id:'sender'},args);};
 },endpoint);
 await receiver.evaluate(async endpoint=>{
  const me=game.me,friend=game.players[1];me.playerid='receiver';friend.playerid='sender';lib.playerOL ||= {};lib.playerOL.receiver=me;lib.playerOL ||= {};lib.node ||= {};lib.playerOL.sender=friend;me.node.handcards1.replaceChildren();me.node.handcards2.replaceChildren();const card=game.createCard('sha','spade',1,'fire');card.cardid='mate-probe-0';me.node.handcards1.append(card);game.online=true;
  game.ws=new WebSocket(endpoint+'/wire?role=receiver');await new Promise(resolve=>game.ws.onopen=resolve);game.ws.onmessage=lib.element.ws.onmessage;
 },endpoint);
 await sender.evaluate(async endpoint=>{
  const me=game.me,target=game.players[1];me.playerid='sender';target.playerid='receiver';lib.playerOL ||= {};lib.node ||= {};lib.playerOL.sender=me;lib.playerOL ||= {};lib.playerOL.receiver=target;target.node.handcards1.replaceChildren();target.node.handcards2.replaceChildren();const card=game.createCard('sha','spade',1,'fire');card.cardid='mate-probe-0';target.node.handcards1.append(card);target.decadeUI_updateShowCards();game.online=true;
  game.ws=new WebSocket(endpoint+'/wire?role=sender');await new Promise(resolve=>game.ws.onopen=resolve);target.node.showCards.click();
 },endpoint);
 await sender.locator('.dui-mate-card').click();
 await receiver.waitForFunction(()=>game.me.getCards('h')[0].classList.contains('dui-mate-recommended'),null,{timeout:5000});
 const received=await receiver.evaluate(()=>{const card=game.me.getCards('h')[0],badge=card.querySelector(':scope > .dui-mate-recommend-badge'),s=badge&&getComputedStyle(badge),r=badge?.getBoundingClientRect();return{card:card.cardid,by:card.dataset.mateRecommender,selected:ui.selected.cards.length,badge:badge?{tag:badge.tagName,kind:badge.dataset.recommendation,display:s.display,visibility:s.visibility,background:s.backgroundImage,width:r.width,height:r.height}:null};});
 assert.equal(received.card,'mate-probe-0');assert.equal(received.selected,0);
 assert.equal(received.badge?.tag,'SPAN');assert.equal(received.badge.kind,'received');assert.equal(received.badge.display,'block');assert.equal(received.badge.visibility,'visible');assert(received.badge.background.includes('card_tag_recommon1.png'));assert(received.badge.width>0&&received.badge.height>0);
 await receiver.locator('.handcards > .card.dui-mate-recommended').screenshot({path:path.join(__dirname,'online-hand-cards-received.png')});
 const rejection=await host.evaluate(()=>{
  const count=privatePackets,fn=lib.message.server.decadeUIMateCard;fn.call({id:'sender'},'receiver',['nonexistent']);fn.call({id:'unknown'},'receiver',['mate-probe-0']);lib.node.observing.push(window.observer={id:'sender'});fn.call(observer,'receiver',['mate-probe-0']);lib.node.observing=[];enemy.playerid='enemy';lib.playerOL.enemy=enemy;fn.call({id:'enemy'},'receiver',['mate-probe-0']);return{privatePackets,rejected:privatePackets===count};
 });
 assert.equal(rejection.privatePackets,1);assert(rejection.rejected);await sender.close();await receiver.close();return{received,...rejection,transport:'native game.send -> WebSocket -> named server handler -> Player.send/Client.send -> native ws.onmessage'};
}

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: {width:1440,height:900} });
  const errors=[],badResponses=[]; page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)badResponses.push({status:r.status(),path:decodeURIComponent(new URL(r.url()).pathname)});});
  await page.goto(`http://127.0.0.1:${server.address().port}/mate-hand-probe`);
  await page.waitForFunction(async()=>{const{game,ui}=await import('/noname.js');return game.players.length>1&&window.decadeUI&&ui.arena&&Array.isArray(ui.dialogs);},null,{timeout:45000});
  await page.waitForTimeout(1200);
  await page.evaluate(async()=>{
   const{game,ui,lib,get,_status}=await import('/noname.js'); Object.assign(window,{game,ui,lib,get,_status});game.pause();for(const d of [...ui.dialogs])d.close();document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
   game.me=game.players[0];window.mate=game.players[1];window.enemy=game.players[2];game.me.init('liubei');mate.init('guanyu');enemy.init('caocao');game.me.side=mate.side=true;enemy.side=false;_status.over=false;_status.gameStarted=true;
   lib.skill.mate_probe={charlotte:true,ai:{viewHandcard:true,skillTagFilter(player,tag,arg){return arg.side===player.side;}}};game.me.addSkill('mate_probe');
   window.setCards=count=>{mate.node.handcards1.replaceChildren();mate.node.handcards2.replaceChildren();for(let i=0;i<count;i++){const card=game.createCard(['sha','shan','tao','wuxie','jiu'][i%5],['spade','heart','club','diamond'][i%4],i%13+1,i===0?'fire':undefined);card.cardid='mate-probe-'+i;mate.node.handcards1.appendChild(card);}mate.decadeUI_updateShowCards();};setCards(10);
  });
  await page.waitForTimeout(400);await page.evaluate(()=>document.fonts.ready);
  const strip=await page.evaluate(()=>{const n=mate.node.showCards,r=n.getBoundingClientRect(),p=mate.getBoundingClientRect();return{text:n.textContent,lines:n.querySelectorAll('.handcard').length,ellipsis:n.querySelector('.handcard-more')?.textContent,rect:r.toJSON(),player:p.toJSON(),visible:getComputedStyle(n).display!=='none',z:getComputedStyle(n).zIndex};});
  assert(strip.visible&&strip.lines===4&&strip.ellipsis==='...',JSON.stringify(strip));assert(strip.text.startsWith('火杀'),strip.text);
  await page.locator('.online-handdisplays').filter({hasText:'火杀'}).click();await page.waitForTimeout(300);
  const panel=await page.evaluate(()=>{const n=document.querySelector('.dui-mate-hand-popup'),g=n.querySelector('.dui-mate-hand-grid');return{cards:g.querySelectorAll('.dui-mate-card').length,title:n.querySelector('.dui-mate-hand-title').textContent,scrollHeight:g.scrollHeight,clientHeight:g.clientHeight,rect:n.getBoundingClientRect().toJSON(),columns:getComputedStyle(g).gridTemplateColumns,visible:getComputedStyle(n).visibility};});
  assert.equal(panel.cards,10);assert(panel.scrollHeight>panel.clientHeight);assert(panel.rect.left>=0&&panel.rect.right<=1440);assert(panel.rect.top>=0&&panel.rect.bottom<=900);
  await page.screenshot({path:path.join(__dirname,'online-hand-cards-browser.png')});
  const nativeBefore=await page.evaluate(()=>({selected:ui.selected.cards.length,hand:mate.getCards('h').map(c=>c.cardid),dialogCount:ui.dialogs.length}));
  await page.locator('.dui-mate-card').first().click();await page.waitForTimeout(400);
  const rec=await page.evaluate(()=>({closed:!document.querySelector('.dui-mate-hand-popup'),recommended:mate.getCards('h').filter(c=>c.classList.contains('dui-mate-recommended')).map(c=>c.cardid),selected:ui.selected.cards.length,hand:mate.getCards('h').map(c=>c.cardid),label:mate.node.showCards.querySelector('.dui-mate-recommended-label')?.textContent}));
  assert(rec.closed);assert.deepEqual(rec.recommended,['mate-probe-0']);assert.deepEqual(rec.hand,nativeBefore.hand);assert.equal(rec.selected,nativeBefore.selected);assert.equal(rec.label,'火杀');
  await page.evaluate(()=>mate.node.showCards.click());await page.waitForTimeout(250);
  const badge = await page.locator('.dui-mate-card-selected > .dui-mate-recommend-badge').evaluate(n=>{const s=getComputedStyle(n);return{tag:n.tagName,kind:n.dataset.recommendation,display:s.display,background:s.backgroundImage,width:s.width,height:s.height};});assert.equal(badge.tag,'SPAN');assert.equal(badge.kind,'sent');assert.equal(badge.display,'block');assert(badge.background.includes('card_tag_recommon0.png'));await page.screenshot({path:path.join(__dirname,'online-hand-cards-recommend.png')});
  await page.locator('.dui-mate-hand-grid').hover();await page.mouse.wheel(0,400);await page.waitForTimeout(150);assert(await page.locator('.dui-mate-hand-grid').evaluate(n=>n.scrollTop>0));
  await page.keyboard.press('Escape');assert.equal(await page.locator('.dui-mate-hand-popup').count(),0);
  const copied=await page.evaluate(()=>{window.markedCard=mate.getCards('h')[0];const clone=markedCard.copy();const result={sourceBadges:markedCard.querySelectorAll('.dui-mate-recommend-badge').length,cloneBadges:clone.querySelectorAll('.dui-mate-recommend-badge').length,cloneMarked:clone.classList.contains('dui-mate-recommended')};clone.remove();markedCard.remove();return result;});
  assert.deepEqual(copied,{sourceBadges:1,cloneBadges:0,cloneMarked:false});await page.waitForTimeout(350);
  assert(await page.evaluate(()=>!markedCard.querySelector('.dui-mate-recommend-badge')&&!markedCard.classList.contains('dui-mate-recommended')),'离开手牌后清理推荐DOM');
  const changes=[];
  for(const count of [1,4,5,8,9,16]){
   await page.evaluate(count=>{setCards(count);mate.node.showCards.click();},count);await page.waitForTimeout(250);
   const m=await page.evaluate(()=>{const n=document.querySelector('.dui-mate-hand-popup'),g=n.querySelector('.dui-mate-hand-grid');return{count:g.children.length,rect:n.getBoundingClientRect().toJSON(),scroll:g.scrollHeight>g.clientHeight};});assert.equal(m.count,count);assert(m.rect.right<=1440&&m.rect.bottom<=900);changes.push(m);await page.keyboard.press('Escape');
  }
  await page.evaluate(()=>{setCards(6);mate.node.showCards.click();mate.getCards('h')[0].remove();});await page.waitForTimeout(350);assert.equal(await page.locator('.dui-mate-card').count(),5);
  await page.evaluate(()=>mate.classList.add('dead'));await page.waitForTimeout(350);assert.equal(await page.locator('.dui-mate-hand-popup').count(),0);assert(await page.evaluate(()=>getComputedStyle(mate.node.showCards).visibility==='hidden' || getComputedStyle(mate.node.showCards).display==='none'));
  await page.evaluate(()=>{mate.classList.remove('dead');setCards(3);mate.node.showCards.click();game.me.removeSkill('mate_probe');});await page.waitForTimeout(350);assert.equal(await page.locator('.dui-mate-hand-popup').count(),0);assert(await page.evaluate(()=>getComputedStyle(mate.node.showCards).visibility==='hidden' || getComputedStyle(mate.node.showCards).display==='none'));
  await page.evaluate(()=>{const c=game.createCard('sha','spade',7);c.cardid='enemy';enemy.node.handcards1.appendChild(c);enemy.decadeUI_updateShowCards();});assert(await page.evaluate(()=>getComputedStyle(enemy.node.showCards).visibility==='hidden' || getComputedStyle(enemy.node.showCards).display==='none'));
  await page.evaluate(()=>{game.me.addSkill('mate_probe');setCards(3);mate.node.showCards.click();lib.config.extension_十周年UI_newDecadeStyle='on';document.body.dataset.style='on';});await page.waitForTimeout(350);assert.equal(await page.locator('.dui-mate-hand-popup').count(),0);assert(await page.evaluate(()=>!mate.node.showCards.classList.contains('online-handdisplays')));
  await page.evaluate(()=>{lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.style='onlineUI';setCards(5);document.body.style.zoom='1.5';mate.node.showCards.click();});await page.waitForTimeout(350);
  const zoom=await page.locator('.dui-mate-hand-popup').evaluate(n=>n.getBoundingClientRect().toJSON());assert(zoom.left>=0&&zoom.right<=1441&&zoom.top>=0&&zoom.bottom<=901,JSON.stringify(zoom));
  const assets=await page.evaluate(async()=>{const rows=[];for(const name of ['other_hand_card_bg.png','skillTipShowBg.png','card_tag_recommon0.png','card_tag_recommon1.png']){const img=new Image();img.src='/extension/十周年UI/image/ui/hand/'+name;await img.decode();rows.push({name,width:img.naturalWidth,height:img.naturalHeight});}return rows;});
  await page.evaluate(()=>{document.body.style.zoom='';game.observe=true;mate.decadeUI_updateShowCards();});assert(await page.evaluate(()=>getComputedStyle(mate.node.showCards).display==='none'));assert.equal(await page.locator('.dui-mate-hand-popup').count(),0);
  await page.evaluate(()=>{game.observe=false;mate.decadeUI_updateShowCards();mate.node.showCards.click();mate.uninit();});assert.equal(await page.locator('.dui-mate-hand-popup').count(),0);
  await page.evaluate(()=>{mate.init('guanyu');mate.side=game.me.side;});
  const legacy=[];
  for(const style of ['on','babysha']){
   const state=await page.evaluate(style=>{
    lib.config.extension_十周年UI_newDecadeStyle=style;document.body.dataset.style=style;setCards(3);
    mate.node.showCards.click();const result={style,lines:mate.node.showCards.querySelectorAll('.handcard').length,online:mate.node.showCards.classList.contains('online-handdisplays'),nativePopup:!!document.querySelector('.popup-container')};
    document.querySelector('.popup-container')?.click();return result;
   },style);
   assert.equal(state.lines,5);assert.equal(state.online,false);assert.equal(state.nativePopup,true);legacy.push(state);
  }
  await page.evaluate(()=>{lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.style='onlineUI';setCards(3);});
  const cancelled=await page.evaluate(async()=>{
   mate.node.showCards.click();const button=document.querySelector('.dui-mate-card');button.click();button.click();
   await new Promise(resolve=>setTimeout(resolve,150));
   const result={open:!!document.querySelector('.dui-mate-hand-popup'),recommended:mate.getCards('h').some(c=>c.classList.contains('dui-mate-recommended')),badges:document.querySelectorAll('.dui-mate-hand-popup .dui-mate-recommend-badge').length};
   const {closeOnlineHandCards}=await import('/extension/十周年UI/src/ui/online-hand-cards.js');closeOnlineHandCards();return result;
  });assert(cancelled.open);assert.equal(cancelled.recommended,false);assert.equal(cancelled.badges,0);
  const pending = await page.evaluate(()=>{
   setCards(3);
   lib.config.extension_十周年UI_newDecadeStyle='on';document.body.dataset.style='on';
   const before=mate.getCards('h').filter(c=>c.classList.contains('dui-mate-recommended')).length;
   lib.message.client.decadeUIMateCard(game.me,mate,['mate-probe-0']);
   return {before,after:mate.getCards('h').filter(c=>c.classList.contains('dui-mate-recommended')).length};
  });assert.equal(pending.after,pending.before,'非Online风格不得接收推荐标记');
  await page.evaluate(()=>{lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.style='onlineUI';setCards(3);});
  const interrupted=await page.evaluate(async()=>{
   mate.node.showCards.click();document.querySelector('.dui-mate-card').click();
   lib.config.extension_十周年UI_newDecadeStyle='on';document.body.dataset.style='on';
   const send=game.send,online=game.online;let packets=0;game.online=true;game.send=()=>packets++;
   try{
    await new Promise(resolve=>setTimeout(resolve,150));
    return {packets,recommended:mate.getCards('h').some(c=>c.classList.contains('dui-mate-recommended'))};
   }finally{game.send=send;game.online=online;}
  });assert.deepEqual(interrupted,{packets:0,recommended:false},'切换风格必须取消待发送的推荐');
  await page.evaluate(()=>{
   for(const callback of lib.onover)callback();
   lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.style='onlineUI';_status.over=false;
   setCards(3);game.me.removeSkill('mate_probe');
  });await page.waitForTimeout(350);
  assert(await page.evaluate(()=>getComputedStyle(mate.node.showCards).display==='none'),'下一局必须恢复可见手牌权限刷新');
  await page.evaluate(()=>{game.me.addSkill('mate_probe');setCards(3);});
  const network = await verifyNetwork(browser, page);
  const lifecycle={copied,cancelled,nonOnlineReceive:pending,interruptedSend:interrupted,restartedRefresh:true};
  const result={strip,panel,rec,badge,changes,zoom,assets,network,legacy,lifecycle,errors,badResponses};fs.writeFileSync(path.join(__dirname,'online-hand-cards-browser-results.json'),JSON.stringify(result,null,2));assert.deepEqual(errors,[]);assert.deepEqual(badResponses.filter(row=>/online-hand-cards|image\/ui\/hand/.test(row.path)),[]);console.log('ONLINE_HAND_CARDS_OK',JSON.stringify({counts:changes.map(row=>row.count),badge,network,legacy,lifecycle,errors,existingHttp404:badResponses.length,assets:assets.length}));
 } finally{await browser.close();await new Promise(resolve=>wireServer.close(resolve));await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
