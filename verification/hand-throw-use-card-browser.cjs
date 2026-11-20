const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});

seed.mode_config={identity:{player_number:"2"}};
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
		page.on('console',message=>{if(message.text().startsWith('USE_PROBE'))console.log(message.text());});
		page.on("dialog", dialog => { console.log("DIALOG", dialog.message()); if(dialog.message().includes('错误信息'))errors.push(dialog.message()); void dialog.accept(); });
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
    const {game,ui,lib,get,_status}=await import('/noname.js');
    window.handUseProbe={game,ui,lib,get,_status,rows:[]};

    const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
    lib.config.game_speed='vfast';lib.config.duration=300;
    lib.skill._hand_use_probe={trigger:{global:'phaseUseBegin'},forced:true,silent:true,charlotte:true,firstDo:true,priority:Infinity,
      filter:()=>!handUseProbe.started,
      async content(){
        handUseProbe.started=true;
        game.me.init('liubei');game.players.find(p=>p!==game.me).init('guanyu');
        for(const actor of [game.me,game.players.find(p=>p!==game.me)])for(const name of ['wuzhong','zhuge']){
          const card=game.createCard(name,'spade',9);actor.directgain([card]);
          await game.delay(0,600);
          const row={own:actor===game.me,name,starts:[],frames:[]};handUseProbe.rows.push(row);console.log('USE_PROBE',row.own,name);
          const baseLose=actor.lose,baseThrow=actor.$throw;
          actor.lose=function(){
            const loss=baseLose.apply(this,arguments);
            if(loss.cards?.includes(card))loss.pushHandler((evt,state)=>{
              if(state.state==='begin'&&card.parentNode===actor.node.handcards1)row.expected=rect(card);
            });
            return loss;
          };
          actor.$throw=function(...args){
            const result=baseThrow.apply(this,args);
            if(result?.name===name){
              row.starts.push(rect(result));
              let count=0;
              const sample=()=>{if(!result.isConnected||count++>=90)return;row.frames.push({rect:rect(result),time:performance.now()});requestAnimationFrame(sample);};
              requestAnimationFrame(sample);
            }
            return result;
          };
          try{await actor.useCard(card,name==='sha'?game.players.find(p=>p!==actor):actor);await game.delay(0,1800);}
          finally{actor.lose=baseLose;actor.$throw=baseThrow;}
          row.finalPosition=get.position(card);
        }
        handUseProbe.done=true;game.pause();
      }};
    game.addGlobalSkill('_hand_use_probe');
    if(!_status.auto)ui.click.auto('forced');game.resume2();game.resume();
  });
  await page.waitForFunction(()=>handUseProbe.done,null,{timeout:60000}).catch(async error=>{console.log('LIVE_STATE',await page.evaluate(()=>({rows:handUseProbe.rows.map(r=>({own:r.own,name:r.name,expected:r.expected,starts:r.starts.length,frames:r.frames.length})),started:handUseProbe.started,event:handUseProbe._status.event?.name,step:handUseProbe._status.event?.step,paused:handUseProbe._status.paused,paused2:handUseProbe._status.paused2,auto:handUseProbe._status.auto,players:handUseProbe.game.players.map(p=>({name:p.name,hp:p.hp}))})));throw error;});
  const result=await page.evaluate(()=>({style:handUseProbe.lib.config.extension_十周年UI_newDecadeStyle,rows:handUseProbe.rows}));
  results[style]={result,errors};
  for(const row of result.rows){
    assert(row.starts.length,`${style}/${row.own}/${row.name}: no flight`);
    assert(row.frames.length>3,`${style}/${row.own}/${row.name}: no frames`);
    assert(row.frames.some(f=>Math.abs(f.rect.y-row.starts[0].y)>10||Math.abs(f.rect.x-row.starts[0].x)>10),`${style}/${row.own}/${row.name}: no movement`);
    if(row.own){
      assert(row.expected,`${style}/${row.name}: no pre-lose sample`);
      for(const key of ['x','y','width','height'])assert(Math.abs(row.starts[0][key]-row.expected[key])<1,`${style}/${row.name}/${key}: origin mismatch`);
    }
    assert.equal(row.finalPosition,row.name==='zhuge'?'e':'d');
  }
  assert.deepEqual(errors,[]);console.log('HAND_USE_CARD_OK',style);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'hand-throw-use-card-results.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(__dirname,'hand-throw-use-card-results.json'),JSON.stringify(results,null,2));server.close();process.exitCode=1;});
