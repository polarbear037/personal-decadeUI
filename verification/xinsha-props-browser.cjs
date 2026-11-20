const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
const configKey = "extension_十周年UI_yjcmBackground";
Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: "othersOff", extension_十周年UI_rightLayout: "on", phonelayout:true, touchscreen: false });
for (const row of [...require("./yjcm-buttons-source.json").frames, ...require("./yjcm-buttons-source.json").extra, ...require("./yjcm-background-source.json").resources]) {
	assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, row.destination))).digest("hex"), row.sha256, row.destination);
}
const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
		const page = await browser.newPage({ viewport: { width: 1500, height: 750 }, hasTouch: true });
		page.setDefaultTimeout(12000);
		const errors = [], failed = [];
		let startupReject;
		const startupFailure = new Promise((resolve, reject) => { startupReject = reject; });
		page.on("pageerror", error => { errors.push(error.message); startupReject(error); });
		page.on("dialog", dialog => { console.log("DIALOG", dialog.message()); void dialog.accept(); });
		page.on("console", message => { if (message.type() === "error" && message.text().includes("一将成名动态背景")) errors.push(message.text()); });
		page.on("response", response => { if (response.status() >= 400 && (response.url().includes("/yijiang/") || response.url().includes("/xinsha-props/"))) failed.push(response.status() + " " + decodeURIComponent(response.url())); });
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
		await Promise.race([startupFailure, page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 })]).catch(async error => {
			console.log("STARTUP", JSON.stringify({ errors, failed, body: await page.locator("body").innerText() }));
			await page.screenshot({ path: path.join(__dirname, "yjcm-startup.png") });
			throw error;
		});
		await page.evaluate(async () => {
			const { game, ui, lib, get, _status } = await import("/noname.js");
			Object.assign(window, { game, ui, lib, get, _status });
			game.pause();
			for (const dialog of [...ui.dialogs]) dialog.close();
			for (const control of [...ui.controls]) control.close();
			document.querySelector(".decade-welcome-overlay")?.remove();
			ui.arena.classList.remove("choose-character");
			game.me = game.players[0]; game.me.init("liubei"); game.players[1].init("guanyu");
			_status.gameStarted = true; _status.over = false;
			const event = game.createEvent("phaseUse", false); event.player = game.me;
			_status.eventManager.setStatusEvent(event, true);
			for (let i = 0; i < 4; i++) game.me.directgain([game.createCard("sha", "spade", i + 1)]);
			ui.updateSkillControl(game.me, true);
			ui.cardRoundTime.updateRoundCard(); ui.handcardNumber.updateCardnumber();
			ui.create.confirm("oc");
			game.resume2();
		});
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(1200);
		assert.equal(await page.locator("body").getAttribute("data-style"),"othersOff");
		assert(await page.locator('link[href*="/lbtn/xinsha.css"]').count()>0);
		assert.equal(await page.locator('link[href*="/lbtn/shizhounian.css"]').count(),0);
		await page.evaluate(() => {
		 window.propSent=[]; window.propHits=[]; window.propSpines=[]; window.propVideos=[];window.propDetails=[];window.propFlights=[];
		 document.addEventListener('decadeui:xinsha-prop-sent',e=>{propSent.push(e.detail.propId);propDetails.push({id:e.detail.propId,hit:e.detail.hit,combo:e.detail.combo});});
		 document.addEventListener('decadeui:xinsha-prop-hit',e=>propHits.push(e.detail.propId));
		 const animation=decadeUI.animation, play=animation.playSpine;
		 animation.playSpine=function(...args){const node=play.apply(this,args);if(args[0].name?.includes('xinsha-props/'))propSpines.push({name:args[0].name,action:node?.skeleton?.state?.getCurrent(0)?.animation?.name,version:node?.skeleton?.data?.version,events:node?.skeleton?.data?.events?.map(e=>e.name),offset:args[1]?{x:args[1].x[0],y:args[1].y[0],scale:args[1].scale}:null});return node;};
		 const video=game.addVideo; game.addVideo=function(...args){if(args[0]==='throwEmotion')propVideos.push(args[2]);return video.apply(this,args);};
		});
		await page.locator('.yjcm-flower').click();
		await page.locator('.xinsha-prop-panel').waitFor();
		await page.waitForFunction(()=>[...document.querySelectorAll('.xinsha-prop-panel img')].every(n=>n.complete&&n.naturalWidth));
		results.labels=await page.locator('.yjcm-chat-buttons > *').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label')));
		assert.deepEqual(results.labels,['砸蛋送花','聊天','麦克风']);
		assert.equal(await page.locator('.yjcm-quick-face').count(),0);
		assert.match(await page.locator('.yjcm-microphone').evaluate(n=>getComputedStyle(n).backgroundImage),/btn_vtotxt.png/);
		const balance=Number(await page.locator('.xinsha-prop-balance span').innerText());assert(balance>=1500&&balance<=5500);results.balance=balance;
		results.order=await page.locator('.xinsha-prop-panel button').evaluateAll(ns=>ns.map(n=>Number(n.dataset.propId)));
		assert.deepEqual(results.order,[1,3,37,38,2,4,39,40]);
		assert.equal(await page.locator('.xinsha-prop-selected').count(),1);
		results.selection=await page.locator('.xinsha-prop-selected').evaluate(n=>{const p=getComputedStyle(n,'::after');return {boxSizing:p.boxSizing,width:parseFloat(p.width),height:parseFloat(p.height),frameZ:p.zIndex,iconZ:getComputedStyle(n.querySelector('.xinsha-prop-icon')).zIndex,costZ:getComputedStyle(n.querySelector('.xinsha-prop-cost')).zIndex};});
		assert.equal(results.selection.boxSizing,'border-box');assert.equal(results.selection.frameZ,'0');assert.equal(results.selection.iconZ,'1');assert.equal(results.selection.costZ,'1');assert(Math.abs(results.selection.width-105.06)<.1);assert(Math.abs(results.selection.height-102)<.1);
		await page.screenshot({path:path.join(__dirname,'xinsha-props-panel.png')});
		results.layouts=[];
		for(const [width,height] of [[1500,750],[1169,528]]){
		 await page.setViewportSize({width,height});await page.waitForTimeout(180);
		 const layout=await page.evaluate(()=>{const p=document.querySelector('.xinsha-prop-panel'),r=p.getBoundingClientRect(),w=ui.window.getBoundingClientRect(),unit=Math.min(ui.window.clientWidth/1334,ui.window.clientHeight/750),style=getComputedStyle(ui.window);return {unit,x:r.x-w.x,bottom:w.bottom-r.bottom,width:r.width,height:r.height,insetX:parseFloat(style.getPropertyValue('--yjcm-scene-x')),insetY:parseFloat(style.getPropertyValue('--yjcm-scene-y')),cells:[...p.querySelectorAll('button')].map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})),icons:[...document.querySelectorAll('.yjcm-chat-buttons>*')].map(n=>({y:n.getBoundingClientRect().y,image:getComputedStyle(n).backgroundImage}))};});
		 const near=(a,b,label)=>assert(Math.abs(a-b)<.2,label+': '+a+' != '+b);
		 near(layout.x,layout.insetX+89*layout.unit,'panel left');near(layout.bottom,layout.insetY+176*layout.unit,'panel bottom');near(layout.width,289.6*layout.unit,'width');near(layout.height,148*layout.unit,'height');
		 assert(layout.cells.slice(0,4).every(c=>Math.abs(c.y-layout.cells[0].y)<.1));assert(layout.cells[4].y>layout.cells[0].y);
		 assert(layout.icons[0].y<layout.icons[1].y&&layout.icons[1].y<layout.icons[2].y);results.layouts.push(layout);
		}
		await page.setViewportSize({width:1500,height:750});await page.waitForTimeout(180);
		// 经过真实Player.throwEmotion/broadcastAll与真实3.6 AnimationPlayer加载全部八项。
		for(const id of results.order){
		 await page.locator(`.xinsha-prop-panel button[data-prop-id="${id}"]`).click();
		 assert.equal(await page.locator('.xinsha-prop-selected').count(),1);
		 assert.equal(Number(await page.locator('.xinsha-prop-selected').getAttribute('data-prop-id')),id);
		 await page.evaluate(()=>{const r=game.players[1].getBoundingClientRect();window.propTargetPoint={x:r.x+r.width/2,y:r.y+r.height/2};});
		 const pt=await page.evaluate(()=>propTargetPoint);await page.mouse.click(pt.x,pt.y);
		 await page.waitForFunction(id=>propHits.includes(id),id,{timeout:15000});
		 if(id===37)await page.screenshot({path:path.join(__dirname,'xinsha-props-pig-hit.png')});
		}
		results.sent=await page.evaluate(()=>propSent);results.hits=await page.evaluate(()=>propHits);results.spines=await page.evaluate(()=>propSpines);results.videos=await page.evaluate(()=>propVideos);
		assert.deepEqual(results.sent,results.order);assert.deepEqual(results.hits,results.order);assert.equal(results.spines.length,8);assert(results.spines.every(n=>n.action==='play'));
		const pigVideo=results.videos.find(v=>v[2]?.xinshaProp===40);assert(pigVideo);
		await page.evaluate(video=>{game.playerMap[video[0]]=game.players[1];game.videoContent.throwEmotion(game.me,video);},pigVideo);
		await page.waitForFunction(()=>propHits.filter(id=>id===40).length===2);
		// 走真实联机发送入口，验证附加参数仍使用合法的原生emotion。
		await page.evaluate(()=>{window.networkSent=[];window.savedSend=game.send;game.send=(...args)=>networkSent.push([args[0],args[2],args[3]]);game.online=true;});
		await page.locator('.xinsha-prop-panel button[data-prop-id="38"]').click();
		await page.waitForTimeout(120);const pt=await page.evaluate(()=>propTargetPoint);await page.mouse.click(pt.x,pt.y);
		results.network=await page.evaluate(()=>{game.online=false;game.send=savedSend;return networkSent;});
		assert.equal(results.network.length,1);assert.equal(results.network[0][0],'throwEmotion');assert.equal(results.network[0][1],'flower');assert.equal(results.network[0][2].xinshaProp,38);assert.deepEqual(results.network[0][2].xinshaHit,[0,0]);
		// 触摸选择与点击、长按连续赠送、不冒泡到头像。
		await page.locator('.xinsha-prop-panel button[data-prop-id="39"]').dispatchEvent('touchend',{cancelable:true});
		const previous=await page.evaluate(()=>propSent.length);await page.waitForTimeout(120);
		await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
		assert(await page.evaluate(n=>propSent.length>=n+2,previous));
		const touchBefore=await page.evaluate(()=>propSent.length);await page.waitForTimeout(150);await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>propSent.length),touchBefore+1);results.touchSingleThrow=true;
		await page.keyboard.press('Escape');assert.equal(await page.locator('.xinsha-prop-panel').count(),0);assert.equal(await page.locator('.xinsha-prop-target').count(),0);
		await page.locator('.yjcm-flower').click();assert.equal(Number(await page.locator('.xinsha-prop-balance span').innerText()),balance);assert.equal(await page.locator('.xinsha-prop-selected').getAttribute('data-prop-id'),'39');
		await page.keyboard.press('Escape');await page.locator('.yjcm-microphone').click();assert.equal(await page.locator('.xinsha-prop-panel').count(),0);
		await page.locator('.yjcm-chat').click();await page.locator('.dialog.popped.hoverdialog').waitFor();results.chatOpens=await page.locator('.yjcm-chat').evaluate(n=>!!n._uiintro?.isConnected);assert.equal(results.chatOpens,true);await page.evaluate(()=>{const n=document.querySelector('.yjcm-chat');n._uiintro?.remove();delete n._uiintro;ui.currentpopped=null;});
		// 真实投掷链：八项均首击居中、后续散落，并验证命中Spine与飞行使用同一坐标。
		results.scatter=await page.evaluate(async()=>{
		 const {xinshaProps}=await import('/extension/十周年UI/src/ui/xinsha-props.js');
		 game.decadeXinshaProps.stop();propDetails.length=0;propSpines.length=0;propVideos.length=0;propFlights.length=0;
		 const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.classList.contains('xinsha-prop-flight'))propFlights.push({end:frames[1].transform,width:parseFloat(this.style.width),height:parseFloat(this.style.height)});return animate.call(this,frames,options);};
		 for(const prop of xinshaProps){game.decadeXinshaProps.stop();const before=propSpines.length;for(let i=0;i<3;i++)game.me.throwEmotion(game.players[1],prop.emotion,{xinshaProp:prop.id});const deadline=performance.now()+10000;while(propSpines.length<before+3&&performance.now()<deadline)await new Promise(r=>setTimeout(r,16));if(propSpines.length!==before+3)throw new Error('Missing real Spine impact for prop '+prop.id);}
		 await new Promise(r=>setTimeout(r,400));Element.prototype.animate=animate;
		 const r=game.players[1].getBoundingClientRect(),h=ui.window.getBoundingClientRect(),scale=ui.window.clientWidth/h.width;
		 return {details:propDetails.slice(),spines:propSpines.slice(),flights:propFlights.slice(),videos:propVideos.slice(),target:{x:(r.left+r.width/2-h.left)*scale,y:(r.top+r.height/2-h.top)*scale,scale:r.width*scale/190,nativeHeight:r.height/r.width*190,nearTop:(r.top+r.height/2-h.top)*scale<110*ui.window.clientHeight/750}};
		});
		assert.equal(results.scatter.details.length,24);assert.equal(results.scatter.spines.length,24);assert.equal(results.scatter.flights.length,24);
		for(let i=0;i<24;i++){
		 const d=results.scatter.details[i],spine=results.scatter.spines[i],f=results.scatter.flights[i],t=results.scatter.target;
		 assert.equal(d.combo,i%3+1);if(i%3===0)assert.deepEqual(d.hit,[0,0]);
		 assert(Math.abs(d.hit[0])<=45.01);assert(Math.abs(d.hit[1])<=t.nativeHeight/2-49.99);
		 const water=d.id===4,ox=water?-78:0,oy=water?-103:0;
		 assert(Math.abs(spine.offset.x-(d.hit[0]+(t.nearTop?ox:0))*spine.offset.scale)<.01);
		 assert(Math.abs(spine.offset.y-(-d.hit[1]+(t.nearTop?oy:0))*spine.offset.scale)<.01);
		 const xy=f.end.match(/translate\(([-.0-9]+)px,([-.0-9]+)px\)/).slice(1).map(Number);
		 assert(Math.abs(xy[0]+f.width/2-(t.x+d.hit[0]*t.scale-(t.nearTop?0:ox*t.scale)))<.01);
		 assert(Math.abs(xy[1]+f.height/2-(t.y+d.hit[1]*t.scale+(t.nearTop?0:oy*t.scale)))<.01);
		 if(d.id>=37)assert.deepEqual(spine.events,[]);
		 assert.deepEqual(results.scatter.videos[i][2].xinshaHit,d.hit);
		}
		for(let i=0;i<24;i+=3)assert(results.scatter.details.slice(i+1,i+3).some(d=>d.hit.some(n=>Math.abs(n)>.1)),'scatter '+results.scatter.details[i].id);
		await page.waitForTimeout(5100);
		results.comboReset=await page.evaluate(()=>{propDetails.length=0;game.me.throwEmotion(game.players[1],'egg',{xinshaProp:40});game.me.throwEmotion(game.players[2],'egg',{xinshaProp:40});game.me.throwEmotion(game.players[1],'egg',{xinshaProp:40});return propDetails.slice();});
		assert(results.comboReset.every(d=>d.combo===1&&d.hit.every(n=>n===0)));
		// 换风格清理与卸载后恢复原有投掷/录像方法。
		results.cleanup=await page.evaluate(async()=>{const native=game.videoContent.throwEmotion;lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.style='onlineUI';await new Promise(r=>setTimeout(r,40));const active=game.decadeXinshaProps.activeCount;game.decadeXinshaProps.show();const open=game.decadeXinshaProps.isOpen;game.decadeXinshaProps.dispose();return {active,open,restored:game.videoContent.throwEmotion!==native,panels:document.querySelectorAll('.xinsha-prop-panel,.xinsha-prop-target').length};});
		assert.deepEqual(results.cleanup,{active:0,open:false,restored:true,panels:0});
		results.isolation=[];
		for(const style of ['onlineUI','on']) {
		 seed.extension_十周年UI_newDecadeStyle=style;await page.reload();
		 await page.waitForFunction(style=>document.body.dataset.style===style&&!!document.getElementById('arena'),style,{timeout:45000});
		 await page.waitForTimeout(200);assert.equal(await page.locator('.yjcm-chat-buttons,.xinsha-prop-panel,.xinsha-prop-target').count(),0);results.isolation.push(style);
		}
		results.errors=errors;results.failed=failed;assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
		fs.writeFileSync(path.join(__dirname,'xinsha-props-results.json'),JSON.stringify(results,null,2));
		console.log('XINSHA_PROPS_BROWSER_OK',JSON.stringify({order:results.order,hits:results.hits,balance:results.balance,cleanup:results.cleanup}));
	} finally { await browser.close();server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
