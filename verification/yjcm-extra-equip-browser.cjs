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
		page.on("response", response => { if (response.status() >= 400 && /\/(yijiang|phase|equip\/xinsha)\//.test(response.url())) failed.push(response.status() + " " + decodeURIComponent(response.url())); });
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
   game.me=game.players[0];game.me.init('liubei');game.players[1].init('caocao');_status.gameStarted=true;_status.over=false;
   window.clearEquip=p=>{p.extraEquip=[];p.node.equips.replaceChildren();p.vcardsMap.equips=[];p.disabledSlots={};p.expandedSlots={};p.$handleEquipChange();};
   window.readExtra=p=>[...p.node.equips.children].filter(c=>c.extraEquip).map(c=>({name:c.node.name2.textContent,skill:c.extraEquip[0],equip:c.extraEquip[1],row:c.style.getPropertyValue('--equip-row'),background:getComputedStyle(c.node.name2).backgroundImage,opacity:getComputedStyle(c.node.name2).opacity,rect:c.getBoundingClientRect().toJSON(),label:c.node.name2.getBoundingClientRect().toJSON(),fontSize:getComputedStyle(c.node.name2).fontSize,html:c.node.name2.innerHTML,extra:c.node.name2.dataset.xinshaExtraEquip,disabled:c.classList.contains('feichu'),markers:c.node.name2.querySelectorAll('.decade-equip-feichu').length}));
  });
  const baseline=!!process.env.EQUIP_BASELINE;
  results[style]={cases:[]};
  for(const which of [0,1])for(const slot of [1,2,3,4,5]){
   const test=await page.evaluate(({which,slot})=>{const p=game.players[which];clearEquip(p);p.addExtraEquip('bazhen',['','qinggang','bagua','jueying','chitu','muniu'][slot]);return readExtra(p);},{which,slot});
   assert.equal(test.length,1);assert.match(test[0].name,/八阵/);
   if(style==='othersOff'&&!baseline){assert.match(test[0].background,/equip\/xinsha\/background/);assert.equal(test[0].extra,'1');assert.equal(test[0].opacity,'1');assert.equal(test[0].row,String(({1:2,2:3,3:4,4:5,5:1})[slot]));assert(test[0].rect.height>5);assert(parseFloat(test[0].fontSize)>5);assert(parseFloat(test[0].fontSize)<=test[0].rect.height);}
   if(style==='onlineUI'){assert.equal(test[0].extra,undefined);assert(!test[0].background.includes('/xinsha/'));}
   results[style].cases.push({which,slot,test});
  }
  // Native updates may rewrite innerHTML while reusing the same placeholder.
  for(const disabled of [false,true]){
   const test=await page.evaluate(disabled=>{const p=game.players[1];clearEquip(p);if(disabled){p.disabledSlots={equip2:1};p.$syncDisable();}p.addExtraEquip('bazhen','bagua');p.$handleEquipChange();p.$handleEquipChange();return readExtra(p);},disabled);
   assert.equal(test.length,1);assert.match(test[0].name,/八阵.*八卦/);
   if(style==='othersOff'&&!baseline){assert.match(test[0].background,/xinsha\/background/);assert.equal(test[0].markers,0);}
   results[style].cases.push({disabled,test});
  }
  const restored=await page.evaluate(()=>{const p=game.players[1];p.removeExtraEquip('bazhen');p.$handleEquipChange();return {extras:readExtra(p),labels:[...p.node.equips.querySelectorAll('.feichu>.name2')].map(n=>({bg:getComputedStyle(n).backgroundImage,extra:n.dataset.xinshaExtraEquip,markers:n.querySelectorAll('.decade-equip-feichu').length}))};});
  assert.equal(restored.extras.length,0);
  if(style==='othersOff'&&!baseline)for(const n of restored.labels){assert.equal(n.extra,undefined);assert.match(n.bg,/abolish_equip_label/);assert.equal(n.markers,1);}
  results[style].restored=restored;
  const preserved=await page.evaluate(()=>{const p=game.players[1];clearEquip(p);p._extraEnabled=true;p.addExtraEquip('bazhen','bagua',false,p=>p._extraEnabled);const shown=readExtra(p);p._extraEnabled=false;p.$handleEquipChange();return {shown,hidden:readExtra(p),stale:p.node.equips.querySelectorAll('[data-xinsha-extra-equip]').length};});
  assert.equal(preserved.shown.length,1);assert.equal(preserved.hidden.length,0);assert.equal(preserved.stale,0);results[style].preserved=preserved;
  const copy=await page.evaluate(()=>{const p=game.players[1];clearEquip(p);p.addExtraEquip('bazhen','bagua');const c=[...p.node.equips.children].find(c=>c.extraEquip).copy('thrown');ui.arena.append(c);const value={marker:c.querySelector('.name2').dataset.xinshaExtraEquip,size:c.querySelector('.name2').style.getPropertyValue('--xinsha-extra-equip-size')};c.remove();return value;});
  assert.equal(copy.marker,undefined);assert.equal(copy.size,'');results[style].copy=copy;
  await page.evaluate(()=>{for(const p of [game.me,game.players[1]]){clearEquip(p);p.addExtraEquip('bazhen','bagua');}ui.arena.classList.add('selecting');game.me.classList.add('current_action');});
  await page.waitForTimeout(650);await page.evaluate(()=>document.fonts.ready);
  const opacity=await page.evaluate(()=>readExtra(game.me)[0].opacity);if(style==='othersOff'&&!baseline)assert.equal(opacity,'1');
  const shot='yjcm-extra-equip-'+style+(baseline?'-before':'')+'.png';await page.screenshot({path:path.join(__dirname,shot)});
  if(style==='othersOff'){const r=await page.locator('#arena > .player').nth(1).boundingBox();await page.screenshot({path:path.join(__dirname,'yjcm-extra-equip-player'+(baseline?'-before':'')+'.png'),clip:{x:r.x-5,y:r.y-5,width:r.width+10,height:r.height+10}});}
  results[style].errors=errors;results[style].failed=failed;assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'yjcm-extra-equip-results'+(process.env.EQUIP_BASELINE?'-before':'')+'.json'),JSON.stringify(results,null,2));
 console.log('PASS',Object.keys(results).join(','));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
