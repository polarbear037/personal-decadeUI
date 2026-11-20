const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});

const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
	 for (const style of ["othersOff", "onlineUI"]) {
		console.log('CHECK_STYLE',style);
		seed.extension_十周年UI_newDecadeStyle = style;
		const page = await browser.newPage({ viewport: { width: 1500, height: 750 } });
		page.setDefaultTimeout(12000);
		const errors = [], failed = [];
		let startupReject;
		const startupFailure = new Promise((resolve, reject) => { startupReject = reject; });
		page.on("pageerror", error => { errors.push(error.message); startupReject(error); });
		page.on("dialog", dialog => { console.log("DIALOG", dialog.message()); void dialog.accept(); });
		page.on("console", message => { if (message.type() === "error" && message.text().includes("一将成名动态背景")) errors.push(message.text()); });
		page.on("response", response => { if (response.status() >= 400 && /\/(yijiang|phase)\//.test(response.url())) failed.push(response.status() + " " + decodeURIComponent(response.url())); });
		// 本机安装包的依赖目录是原始 CommonJS；仅在夹具里提供与本体包装器一致的出口。
		for (const [request, bundle, globalName] of [
			["crypto-js@4.2.0/node_modules/crypto-js/index.js", "crypto-js@4.2.0/node_modules/crypto-js/crypto-js.js", "CryptoJS"],
			["jszip@2.7.0/node_modules/jszip/lib/index.js", "jszip@2.7.0/node_modules/jszip/dist/jszip.js", "JSZip"],
			["nosleep.js@0.12.0/node_modules/nosleep.js/src/index.js", "nosleep.js@0.12.0/node_modules/nosleep.js/dist/NoSleep.js", "NoSleep"],
			["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core"],
			["stackframe@1.3.4/node_modules/stackframe/stackframe.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "StackFrame"],
			["error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "ErrorStackParser"],
			["stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "StackTraceGPS"],
		]) {
			const source = fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", bundle), "utf8").replaceAll("}(this,", "}(globalThis,").replaceAll(")(this,", ")(globalThis,");
			const prefix = ["ErrorStackParser", "StackTraceGPS"].includes(globalName) ? 'import "/_virtual/stackframe.js";\n' : "";
			await page.route("**/node_modules/.pnpm/" + request, route => route.fulfill({ contentType: "text/javascript", body: prefix + source + `\nexport function __require(){return globalThis.${globalName};}` }));
		}
		for (const [pattern, file] of [["**/pinyin-pro/dist/index.js", "pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.mjs"], ["**/dedent/dist/dedent.js", "dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"]]) {
			await page.route(pattern, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", file), "utf8") }));
		}
		await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
		console.log('LOADED',style);
		await Promise.race([startupFailure, page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 })]).catch(async error => {
			console.log("STARTUP", JSON.stringify({ errors, failed, body: await page.locator("body").innerText() }));
			await page.screenshot({ path: path.join(__dirname, "yjcm-startup.png") });
			throw error;
		});

  await page.evaluate(async()=>{
   const {game,ui,lib,get,_status}=await import('/noname.js');Object.assign(window,{game,ui,lib,get,_status});
   const layout=await import('/extension/十周年UI/src/ui/equip-layout.js');Object.assign(window,layout);
   game.pause();game.pause2();for(const d of [...ui.dialogs])d.close();document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
   game.me=game.players[0];game.me.init('zhoushan');game.players[1].init('caocao');_status.gameStarted=true;_status.over=false;
   ui.arena.classList.remove('selecting');
   window.readEquip=player=>{
    const e=player.node.equips,host=e.parentNode,r=host.getBoundingClientRect();
    return {host:r.toJSON(),equipStyle:e.style.cssText,equipRect:e.getBoundingClientRect().toJSON(),equipComputed:{rows:getComputedStyle(e).gridTemplateRows,align:getComputedStyle(e).alignContent,transition:getComputedStyle(e).transition},layout:e.dataset.equipLayout,cards:[...e.children].filter(c=>!c.classList.contains('hidden')).map(c=>({slot:get.equipNum(c),rect:c.getBoundingClientRect().toJSON(),row:c.style.getPropertyValue('--equip-row'),label:c.node.name2.textContent,name:c.node.name2.querySelector('.decade-equip-name')?.textContent,range:c.node.name2.querySelector('.decade-equip-range')?.textContent,images:[...c.node.name2.querySelectorAll('img')].map(im=>({src:im.getAttribute('src'),loaded:im.naturalWidth>0,hidden:im.hidden,rect:im.getBoundingClientRect().toJSON()})),topComputed:getComputedStyle(c).top,bottomComputed:getComputedStyle(c).bottom,translate:getComputedStyle(c).translate,transition:getComputedStyle(c).transition,animation:getComputedStyle(c).animation,inline:c.style.cssText,transform:getComputedStyle(c).transform,font:getComputedStyle(c.node.name2.querySelector('.decade-equip-name')||c.node.name2).fontSize,opacity:getComputedStyle(c.node.name2).opacity,background:getComputedStyle(c.node.name2).backgroundImage,compact:!!c.dataset.decadeHorse}))};
   };
   window.fillEquip=(player,slots)=>{
    for(const c of [...player.node.equips.children])c.remove();
    for(const slot of slots){const card=game.createCard(['','qinggang','baiyin','jueying','chitu','muniu'][slot],['','spade','club','diamond','heart','club'][slot],[0,6,1,13,5,12][slot]);player.$addVirtualEquip(card,[card]);}
    refreshEquipLayout(player);
   };
  });
  await page.evaluate(()=>fillEquip(game.players[1],[1,2,3,4,5]));
  await page.waitForFunction(()=>[...game.players[1].node.equips.querySelectorAll('img:not([hidden])')].every(i=>i.complete&&i.naturalWidth));
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
  const full=await page.evaluate(()=>readEquip(game.players[1]));results[style]={full};
  if(style==='othersOff'){

   assert.equal(full.layout,'xinsha');
   const bySlot=slot=>full.cards.find(c=>c.slot===slot);
   assert.equal(bySlot(5).row,'1');assert.equal(bySlot(1).row,'2');assert.equal(bySlot(4).row,'5');
   for(const c of full.cards){assert(!c.compact);assert(c.images.every(im=>im.hidden||im.loaded));assert.match(c.background,/equip\/xinsha\/background/);assert(Math.abs(c.rect.width/full.host.width-125/164)<.002,JSON.stringify(c));assert(Math.abs(c.rect.height/full.host.height-23/236)<.002);}
   assert.equal(bySlot(1).name,'青釭剑');assert.equal(bySlot(1).range,'2');assert.equal(bySlot(3).range,'+1');
   for(const [slot,bottom] of [[5,104],[1,81],[2,58],[3,35],[4,12]]){
    const c=bySlot(slot);assert(Math.abs((full.host.bottom-c.rect.bottom)/full.host.height-(bottom-8)/236)<.002,JSON.stringify({slot,c,full}));assert(Math.abs((c.rect.left-full.host.left)/full.host.width-(37-21)/164)<.002,JSON.stringify({slot,left:c.rect.left,host:full.host}));
   }
   await page.screenshot({path:path.join(__dirname,'yjcm-equip-layout-browser.png')});
   const r=await page.locator('#arena > .player').nth(1).boundingBox();await page.screenshot({path:path.join(__dirname,'yjcm-equip-layout-player.png'),clip:{x:r.x-5,y:r.y-5,width:r.width+10,height:r.height+10}});

   results[style].selectionOpacity=[];
   for(const state of ['idle','selecting','current_action','selectable']){
    await page.evaluate(state=>{const p=game.me;if(p.node.equips.parentNode!==p)p.append(p.node.equips);fillEquip(p,[1]);ui.arena.classList.toggle('selecting',state==='selecting'||state==='selectable');p.classList.toggle('current_action',state==='current_action');p.node.equips.firstChild.classList.toggle('selectable',state==='selectable');},state);
    const opacity=await page.evaluate(()=>readEquip(game.me).cards[0].opacity);assert.equal(opacity,'1',state);results[style].selectionOpacity.push({state,opacity});
   }
   await page.evaluate(()=>{ui.arena.classList.remove('selecting');game.me.classList.remove('current_action');ui.equipSolts.append(game.me.node.equips);});
   results[style].sparse=[];
   for(const slots of [[1],[2],[3],[4],[5],[1,2,4],[1,2,3,4]]){
    await page.evaluate(slots=>fillEquip(game.players[1],slots),slots);await page.waitForTimeout(40);
    const result=await page.evaluate(()=>readEquip(game.players[1]));
    for(const c of result.cards){const old=bySlot(c.slot);assert(Math.abs(c.rect.y-old.rect.y)<.5,JSON.stringify({slots,c,old,result}));assert(Math.abs(c.rect.width-old.rect.width)<.5,'宝物不能改变马栏宽度');}
    results[style].sparse.push({slots,result});
   }

   await page.evaluate(()=>{const p=game.players[1];p.node.equips.replaceChildren();p.vcardsMap.equips=[];p.disabledSlots={equip1:1,equip2:1,equip3:1,equip4:1,equip5:1};p.$syncDisable();p.$handleEquipChange();});
   await page.waitForTimeout(70);
   results[style].abolished=await page.evaluate(()=>({state:readEquip(game.players[1]),markers:[...game.players[1].node.equips.querySelectorAll('.feichu')].map(c=>({slot:get.equipNum(c),image:getComputedStyle(c.querySelector('.name2')).backgroundImage,icon:getComputedStyle(c.querySelector('.decade-equip-feichu-icon')).backgroundImage}))}));
   assert.equal(results[style].abolished.state.cards.length,5);assert.equal(results[style].abolished.markers.length,5);
   for(const c of results[style].abolished.state.cards){assert(Math.abs(c.rect.y-bySlot(c.slot).rect.y)<.5);assert(Math.abs(c.rect.width-bySlot(c.slot).rect.width)<.5);}
   for(const c of results[style].abolished.markers){assert.match(c.image,/xinsha\/game_abolish_equip_label/);assert.match(c.icon,/xinsha\/game_abolish_equip_/);}
   assert(await page.evaluate(()=>[...game.players[1].node.equips.querySelectorAll('.feichu>.name2')].every(n=>getComputedStyle(n).fontSize==='0px')),'废除原生直接文本须隐藏');
   const ar=await page.locator('#arena > .player').nth(1).boundingBox();await page.screenshot({path:path.join(__dirname,'yjcm-equip-layout-abolished.png'),clip:{x:ar.x-5,y:ar.y-5,width:ar.width+10,height:ar.height+10}});
   await page.evaluate(()=>{const p=game.players[1];p.disabledSlots={};p.$syncDisable();p.expandedSlots={equip1:1};p.$syncExpand();fillEquip(p,[1,2,3,4,5]);const c=game.createCard('zhuge','club',1);p.$addVirtualEquip(c,[c]);refreshEquipLayout(p);});
   await page.waitForTimeout(70);
   results[style].expanded=await page.evaluate(()=>readEquip(game.players[1]));
   assert.equal(results[style].expanded.cards.filter(c=>c.slot===1).length,2);assert.equal(new Set(results[style].expanded.cards.map(c=>c.row)).size,6);
   await page.evaluate(()=>{const p=game.players[1];p.disabledSlots={equip2:1};p.$syncDisable();refreshEquipLayout(p);});
   await page.waitForTimeout(70);
   results[style].extraWeapon=await page.evaluate(()=>({state:readEquip(game.players[1]),hidden:game.players[1].node.equips.querySelector('.feichu[data-equip-slot="2"]')?.dataset.equipReplaced}));
   assert.equal(results[style].extraWeapon.hidden,'true');
   await page.evaluate(()=>{const p=game.players[1];p.expandedSlots={};p.disabledSlots={};p.$syncExpand();p.$syncDisable();p.node.equips.replaceChildren();p.vcardsMap.equips=[];});
   results[style].points=[];
   for(const suit of ['heart','diamond','club','spade'])for(let number=1;number<=13;number++){
    await page.evaluate(({suit,number})=>{const p=game.players[1];fillEquip(p,[1]);const c=p.node.equips.firstChild;c.suit=suit;c.number=number;refreshEquipLayout(p);},{suit,number});
    await page.waitForFunction(()=>[...game.players[1].node.equips.querySelectorAll('img:not([hidden])')].every(i=>i.complete&&i.naturalWidth));
    const p=await page.evaluate(()=>readEquip(game.players[1]).cards[0]);assert(p.images.every(i=>i.loaded));results[style].points.push({suit,number,images:p.images});
   }
   await page.evaluate(()=>{fillEquip(game.me,[1,2,3,4,5]);});
   await page.waitForFunction(()=>[...game.me.node.equips.querySelectorAll('img:not([hidden])')].every(i=>i.complete&&i.naturalWidth));
   results[style].independent=await page.evaluate(()=>readEquip(game.me));
   assert.equal(results[style].independent.cards.length,5);
   for(const c of results[style].independent.cards)assert(Math.abs(c.rect.height-23)<.1,'独立栏使用23设计高度');
   await page.evaluate(()=>{const c=game.me.node.equips.firstChild;window.saved=c;window.cardNodes=[...c.node.name2.childNodes];const copy=c.copy('thrown');ui.arena.append(copy);window.copyResult={assembled:copy.querySelector('.name2')?.dataset.xinshaEquip,slot:copy.dataset.equipSlot,range:!!copy.querySelector('.decade-equip-range')};copy.remove();c.goto(ui.special);game.me.$handleEquipChange();});
   await page.waitForTimeout(50);results[style].copy=await page.evaluate(()=>({...copyResult,entity:saved.node.name2.dataset.xinshaEquip,slotEntity:saved.dataset.equipSlot}));
   assert.equal(results[style].copy.assembled,undefined);assert.equal(results[style].copy.slot,undefined);assert.equal(results[style].copy.range,false);assert.equal(results[style].copy.entity,undefined);assert.equal(results[style].copy.slotEntity,undefined);
   await page.evaluate(async()=>{let count=0;window.skinSwitch={chukuangWorkerApi:{playEffect(){return ++count;}}};const {installEquipSweepCompatibility}=await import('/extension/十周年UI/src/ui/equip-effects.js');installEquipSweepCompatibility();installEquipSweepCompatibility();const api=skinSwitch.chukuangWorkerApi;api.playEffect('FX_PaiJu_ZhuangBei_saoguang',{parent:game.players[1]});window.sweepXinsha=count;api.playEffect('another-effect',{});window.otherEffect=count;lib.config.extension_十周年UI_newDecadeStyle='onlineUI';api.playEffect('FX_PaiJu_ZhuangBei_saoguang',{});window.sweepOnline=count;lib.config.extension_十周年UI_newDecadeStyle='othersOff';});
   results[style].sweep=await page.evaluate(()=>({xinsha:sweepXinsha,other:otherEffect,online:sweepOnline}));assert.deepEqual(results[style].sweep,{xinsha:0,other:1,online:2});
  }else{assert.equal(full.layout,'combined');assert(full.cards.some(c=>c.compact));assert(full.cards.every(c=>c.images.some(i=>i.src?.includes('/equip/official/'))));}
  assert.deepEqual(errors,[]);results[style].errors=errors;await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'yjcm-equip-layout-results.json'),JSON.stringify(results,null,2));
 console.log('YJCM_EQUIP_LAYOUT_OK: 5 fixed official slots, 52 suit/number cases, native composition/copy lifecycle, independent column, Online isolation and sweep routing');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
