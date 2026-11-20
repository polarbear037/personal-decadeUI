const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});

seed.mode_config={identity:{player_number:"2"}};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
	 const style=process.argv.includes('--online')?'onlineUI':'othersOff';
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
      window.judgeProbe={game,ui,lib,get,_status,operations:[],cards:[],samples:[]};
      const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');
      if(lib.config.extension_十周年UI_newDecadeStyle==='othersOff')await installCardBeautify();
      lib.config.game_speed='vfast';lib.config.duration=300;
      const animate=Element.prototype.animate;
      Element.prototype.animate=function(...args){const animation=animate.apply(this,args),flight=this._xinshaDelayJudgeFlight;if(flight){flight.probeFrames=args[0];flight.probeDuration=args[1].duration;}return animation;};
      lib.skill._xinsha_delay_probe={trigger:{global:'phaseUseBegin'},forced:true,silent:true,charlotte:true,firstDo:true,priority:Infinity,
        filter:()=>!judgeProbe.started,
        async content(){
          judgeProbe.started=true;for(const [i,p] of game.players.entries())if(!lib.character[p.name])p.init(i===0?'liubei':'caocao');
          for(const own of [true,false])for(const name of ['lebu','bingliang']){
            const actor=own?game.me:game.players.find(p=>p!==game.me),target=game.players.find(p=>p!==actor);
            const card=game.createCard(name,'spade',9);judgeProbe.cards.push({card,target,name,own});actor.directgain([card]);
            judgeProbe.operations.push({own,name,id:card.cardid});
            await actor.useCard(card,target);
            await game.delay(0,1100);
          }
          const actor=game.me,target=game.players.find(p=>p!==actor),card=game.createCard('sha','club',7);
          // 清掉既有兵，避免规则禁止重复贴同名牌。
          const existing=target.getCards('j').filter(c=>(c.viewAs||c.name)==='bingliang');if(existing.length)await target.discard(existing);
          actor.directgain([card]);judgeProbe.cards.push({card,target,name:'bingliang',own:true,virtual:true});
          judgeProbe.operations.push({own:true,name:'bingliang',id:card.cardid,virtual:true});
          await actor.useCard({name:'bingliang'},[card],target);await game.delay(0,1100);
          judgeProbe.done=true;game.pause();
        }};
      game.addGlobalSkill('_xinsha_delay_probe');
      judgeProbe.timer=setInterval(()=>{
        for(const c of judgeProbe.cards){
          const node=c.flight?.source||c.card.clone,flight=c.flight||node?._xinshaDelayJudgeFlight,attached=flight?.card;if(flight)c.flight=flight;
          if(!flight||flight.done)continue;
          const style=getComputedStyle(node),matrix=new DOMMatrixReadOnly(style.transform),target=attached?.node?.judgeMark?.node?.judge?.getBoundingClientRect();
          judgeProbe.samples.push({id:c.card.cardid,own:c.own,name:c.name,virtual:c.virtual,done:flight.done,time:performance.now(),elapsed:flight.animation?.currentTime,point:{x:matrix.m41,y:matrix.m42},scale:matrix.a,visible:node.isConnected&&style.visibility==='visible',opacity:style.opacity,markVisible:attached?.isConnected&&getComputedStyle(attached).visibility==='visible',markOpacity:attached&&getComputedStyle(attached).opacity,frames:flight.probeFrames,duration:flight.probeDuration,target:target?.toJSON()});
        }
      },25);
      if(!_status.auto)ui.click.auto('forced');game.resume2();game.resume();
    });
    if(style==='othersOff'){
      await page.waitForFunction(()=>judgeProbe.samples.some(s=>s.elapsed>430&&!s.done),{},{timeout:45000});
      await page.screenshot({path:path.join(__dirname,'yjcm-delay-judge-flight.png')});
    }
    await page.waitForFunction(()=>judgeProbe.done,{},{timeout:60000});
    await page.screenshot({path:path.join(__dirname,'yjcm-delay-judge-'+style+'.png')});
    const result=await page.evaluate(()=>{clearInterval(judgeProbe.timer);const {game,ui}=judgeProbe;return{style:document.body.dataset.style,operations:judgeProbe.operations,samples:judgeProbe.samples,remaining:document.querySelectorAll('.decade-xinsha-delay-judge-pending').length,completion:judgeProbe.cards.map(c=>({id:c.card.cardid,virtual:c.virtual,done:c.flight?.done,sourceConnected:c.flight?.source.isConnected,judges:[...c.target.node.judges.children].map(n=>({name:n.viewAs||n.name,visibility:getComputedStyle(n).visibility,opacity:getComputedStyle(n).opacity}))}))};});
    fs.writeFileSync(path.join(__dirname,'yjcm-delay-judge-'+style+'-results.json'),JSON.stringify({result,errors},null,2));
    assert.equal(result.style,style);assert.equal(result.operations.length,5);assert.equal(result.remaining,0);
    if(style==='othersOff')for(const op of result.operations){
      const rows=result.samples.filter(s=>s.id===op.id&&!s.done&&s.elapsed!=null);
      assert(rows.length>4,'真实useCard应有完整动画: '+JSON.stringify(op));
      assert(rows.every(s=>!s.markVisible&&s.markOpacity==='0'),'飞行期间隐藏判定图标');
      assert(rows.some(s=>s.elapsed>30&&s.elapsed<190&&s.visible),'首段抬升必须可见');
      assert(rows.some(s=>s.elapsed>420&&s.elapsed<630&&s.visible),'缩小飞行必须可见');
      assert(rows.every(s=>Math.abs(s.duration-2000/3)<.001));
      const f=rows[0].frames;assert.deepEqual(f.map(k=>k.offset),[0,.3,.6,1]);
      const completion=result.completion.find(c=>c.id===op.id);assert(completion.done&&!completion.sourceConnected,'结束须清理飞牌');
    }
    else assert.equal(result.samples.length,0,'Online不得进入一将动画');
    assert(result.completion.at(-1).judges.some(j=>j.name==='bingliang'&&j.visibility==='visible'&&j.opacity==='1'));
    assert.deepEqual(errors,[]);
    console.log('YJCM_DELAY_JUDGE_OK',style,'5 real useCard/addJudge cases, both directions and virtual card; cleanup; no page errors');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
