const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});
for(const row of [require("./yjcm-player-tips-source.json").asset]) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root,row.destination))).digest("hex"),row.sha256);
const subjects=true;
seed.mode_config={identity:{player_number:"2"}};
const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
	 const style="othersOff";
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
    await page.route('**/extension/%E9%9B%B7%E7%9A%84%E4%B8%80%E5%B0%86/image/cards/card_23.png',async route=>{await new Promise(resolve=>setTimeout(resolve,450));await route.continue();});
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.locator('#arena > .player').nth(1).waitFor({state:'attached',timeout:45000});
    await page.evaluate(async()=>{
      const {game,ui,lib,get,_status}=await import('/noname.js');
      window.equipLive={game,ui,lib,get,_status,samples:[],operations:[],cards:[],flightEnds:{},firstEquipVisible:{}};
      const remove=Element.prototype.remove;Element.prototype.remove=function(...args){const f=this._xinshaEquipFlight;if(f&&f.source?.cardid)equipLive.flightEnds[f.source.cardid]=performance.now();return remove.apply(this,args);};
      const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');await installCardBeautify();
      lib.config.game_speed='vfast';lib.config.duration=300;
      lib.skill._xinsha_equip_probe={trigger:{global:'phaseUseBegin'},forced:true,silent:true,charlotte:true,firstDo:true,priority:Infinity,
        filter:()=>!equipLive.started,
        async content(){
          equipLive.started=true;for(const [i,p] of game.players.entries())if(!lib.character[p.name])p.init(i===0?'liubei':'caocao');
          for(const player of [game.players.find(p=>p!==game.me),game.me])for(const name of ['zhuge','bagua','chitu','dilu']){
            lib.config.sync_speed=['chitu','dilu'].includes(name);
            const card=game.createCard(name,'spade',9);equipLive.cards.push({card,player});player.directgain([card]);
            equipLive.operations.push({own:player===game.me,name,id:card.cardid,syncSpeed:lib.config.sync_speed});
            await player.useCard(card,player);
            equipLive.operations.at(-1).flightDoneAtUseReturn=!!card.clone?._xinshaEquipFlight?.done;
            // 其他座位连续出下一张，直接验证装备动画等待；本人保留采样窗口。
            if(player===game.me)await game.delay(0,1700);
          }
          equipLive.done=true;game.pause();
        }};
      game.addGlobalSkill('_xinsha_equip_probe');
      const sample=()=>{
        for(const {card,player} of equipLive.cards)if(card.parentNode===player.node.equips&&getComputedStyle(card).visibility==='visible'&&!equipLive.firstEquipVisible[card.cardid])equipLive.firstEquipVisible[card.cardid]=performance.now();
        // computedStyle对应本次渲染时间轴；主线程繁忙时performance.now已前进，不能据此误判尚未绘制的落点。
        const nodes=[...document.querySelectorAll('.decade-xinsha-equip-flight')].map(n=>{const f=n._xinshaEquipFlight,r=n.getBoundingClientRect(),s=getComputedStyle(n),card=f?.equipped,m=new DOMMatrixReadOnly(s.transform),ar=ui.arena.getBoundingClientRect(),er=card?.getBoundingClientRect(),pr=f.player.getBoundingClientRect(),cw=decadeUI.boundsCaches.arena.cardWidth,ch=decadeUI.boundsCaches.arena.cardHeight;return{start:f?.start,point:{x:m.m41,y:m.m42},scale:m.a,portrait:{x:(pr.x+pr.width/2-ar.x)/(ar.width/ui.arena.clientWidth)-cw/2,y:(pr.y+pr.height/2-ar.y)/(ar.height/ui.arena.clientHeight)-ch/2},phase:f.phase,phaseElapsed:document.timeline.currentTime-f.phaseStarted,target:er&&{x:(er.x+er.width/2-ar.x)/(ar.width/ui.arena.clientWidth)-cw/2,y:(er.y+er.height/2-ar.y)/(ar.height/ui.arena.clientHeight)-ch/2},frameQueued:!!f?.frame,requested:!!f?.requested,elapsed:f?.started?document.timeline.currentTime-f.started:null,display:f?.display,own:f?.player===game.me,name:f?.name,id:f?.source?.cardid,rect:r.toJSON(),opacity:s.opacity,visibility:s.visibility,realVisibility:card&&getComputedStyle(card).visibility,departed:!!f?.departed,done:f?.done};});
        if(equipLive.samples.length<1800)equipLive.samples.push({time:performance.now(),event:_status.event?.name,nodes});
      };
      equipLive.timer=setInterval(sample,30);
      if(!_status.auto)ui.click.auto('forced');game.resume2();game.resume();
    });
    await page.waitForFunction(()=>equipLive.done,{},{timeout:45000});
    await page.screenshot({path:path.join(__dirname,'yjcm-equip-animation-live.png')});
    const result=await page.evaluate(()=>{clearInterval(equipLive.timer);return{operations:equipLive.operations,samples:equipLive.samples,completion:equipLive.cards.map(({card,player})=>({id:card.cardid,done:card.clone?._xinshaEquipFlight?.done,equipped:card.parentNode===player.node.equips,visibility:getComputedStyle(card).visibility,flightEnd:equipLive.flightEnds[card.cardid],firstEquipVisible:equipLive.firstEquipVisible[card.cardid],appearanceGap:equipLive.firstEquipVisible[card.cardid]-equipLive.flightEnds[card.cardid]})),clones:document.querySelectorAll('.decade-xinsha-equip-flight').length,equips:equipLive.game.players.flatMap(p=>[...p.node.equips.children].map(c=>({name:c.name,visibility:getComputedStyle(c).visibility})))}});
    fs.writeFileSync(path.join(__dirname,'yjcm-equip-animation-live-results.json'),JSON.stringify({result,errors,validation:'pending'},null,2));
    for(const own of [true,false])for(const name of ['zhuge','bagua','chitu','dilu']){
      const samples=result.samples.flatMap(s=>s.nodes).filter(n=>n.own===own&&n.name===name);
      assert(samples.length>3,`真实 useCard 缺少动画: ${own}/${name}`);
      const overlap=samples.filter(n=>n.realVisibility!==undefined);
      assert(overlap.every(n=>n.realVisibility==='hidden'),`飞行期间已入栏装备必须隐藏: ${own}/${name}`);
      const completion=result.completion.find(c=>c.id===result.operations.find(op=>op.own===own&&op.name===name).id);
      assert(completion?.done&&completion.equipped&&completion.visibility==='visible',`通知晚到也须结束飞行并正常显示装备: ${own}/${name}`);
      assert(Number.isFinite(completion.appearanceGap)&&completion.appearanceGap<150,'渐隐结束后装备栏不能长时间空白：'+JSON.stringify({own,name,gap:completion.appearanceGap}));
      assert(samples.some(n=>n.phase==='stack'),'同帧装备通知不能跳过第一段');
      const operation=result.operations.find(op=>op.own===own&&op.name===name);
      assert.equal(operation.flightDoneAtUseReturn,!own,'仅非主视角须等装备动画完成才结束useCard并允许下一张牌');
      const visible=samples.filter(n=>n.visibility==='visible'&&Number(n.opacity)>.05);
      assert.equal(visible[0]?.phase,'stack','实际卡面首个可见帧不能已经在折返入栏');
      assert(visible.some(n=>n.phase==='stack'&&n.elapsed>10&&n.elapsed<190&&Math.hypot(n.point.x-n.start.x,n.point.y-n.start.y)>5),'卡面可见期间必须记录到首段途中位移');
      if(own){const shown=samples.filter(n=>n.phase==='seat');assert(shown.length,'本人应先以完整牌面到武将中心');assert(shown.every(n=>!n.frameQueued),'飞向武将由浏览器播放，不应保留逐帧控制循环');const slot=samples.find(n=>n.phase==='slot');assert(slot&&Math.hypot(slot.display.x-slot.portrait.x,slot.display.y-slot.portrait.y)<1.5,'本人缩小入栏必须从真实人物中心开始');assert(shown.every(n=>n.scale>=n.start.scale*.969&&Number(n.opacity)>.99),'飞到武将之前不能提前缩入装备栏或先消失');assert(samples.some(n=>n.phase==='slot'&&n.scale<n.start.scale*.5),'到达武将之后才缩小入栏');const entry=samples.filter(n=>n.phase==='stack');assert(entry.length&&entry.every(n=>Math.abs(n.scale-n.start.scale)<.002),'本人展示段保持牌面尺寸');}else {
       assert(samples.every(n=>n.phase!=='seat'),'非主视角不走本人专用人物阶段');
       const departed=samples.find(n=>n.departed);
       assert(departed&&departed.elapsed<320,'非主视角牌面显露后完整飞行200ms，再直接入栏');
       const outbound=samples.filter(n=>n.phase==='stack');
       if(outbound.some(n=>n.elapsed>40))assert(outbound.some(n=>Math.hypot(n.point.x-n.start.x,n.point.y-n.start.y)>5),'真实useCard等待装备通知时应向中央移动');
       for(const n of samples.filter(n=>n.phase==='slot'&&n.target)){
        const from=n.display,dx=n.target.x-from.x,dy=n.target.y-from.y,len=dx*dx+dy*dy;
        const ratio=len?Math.max(0,Math.min(1,((n.point.x-from.x)*dx+(n.point.y-from.y)*dy)/len)):0;
        assert(Math.hypot(n.point.x-from.x-ratio*dx,n.point.y-from.y-ratio*dy)<1,'真实useCard非主视角从通知时当前位置折返');
       }
      }
    }
    assert.equal(result.clones,0);assert(result.equips.every(c=>c.visibility==='visible'));assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(__dirname,'yjcm-equip-animation-live-results.json'),JSON.stringify({result,errors},null,2));
    console.log('YJCM_EQUIP_LIVE_OK: 8 real useCard/equip cases, self/other weapon, armour and both horses, separate flight stages, cleanup, no page errors');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
