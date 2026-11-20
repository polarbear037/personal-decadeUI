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
    const result=await page.evaluate(async()=>{
      const {game,ui,lib,get,_status}=await import('/noname.js');
      game.pause();game.pause2();for(const dialog of [...ui.dialogs])dialog.close();ui.arena.classList.remove('choose-character');
      const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');await installCardBeautify();
      const actor=game.me,target=game.players.find(p=>p!==actor);actor.init('liubei');target.init('caocao');
      const wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(ok,message)=>{if(!ok)throw Error(message);};
      const begin=(cold=false)=>{
        const physical=game.createCard('lebu','heart',6);actor.directgain([physical]);decadeUI.layout.updateHand();
        const use=game.createEvent('useCard',false);Object.assign(use,{player:actor,card:physical,cards:[physical],targets:[target]});_status.eventManager.tempEvent=undefined;_status.eventManager.setStatusEvent(use,true);
        const cards=[physical];cards.duiMod=true;physical.throwWith='h';const node=actor.$throw(cards,0,false,false);
        if(cold)node.style.visibility='hidden';
        check(!!node._xinshaDelayJudgeSource,'throw route must protect native moveDelete');node.moveDelete(target);
        target.$addVirtualJudge(physical,[physical]);const flight=node._xinshaDelayJudgeFlight;
        check(!!flight,'attach route must start flight');check(getComputedStyle(flight.card).visibility==='hidden','judge hidden synchronously');
        return{physical:flight.card,node,flight};
      };
      const output={};
      let c=begin(true);await wait(450);check(!c.flight.animation,'cold card cannot consume animation before visibility');
      const ready=performance.now();c.node.style.visibility='visible';await wait(130);
      check(c.flight.animation?.currentTime<200,'cold image must still be in first leg when visible '+JSON.stringify({frame:c.flight.frame,keys:Object.keys(c.flight),time:c.flight.animation?.currentTime,done:c.flight.done,visible:getComputedStyle(c.node).visibility,display:getComputedStyle(c.node).display,connected:c.node.isConnected,cardConnected:c.physical.isConnected}));await wait(700);
      check(c.flight.done&&!c.node.isConnected&&getComputedStyle(c.physical).visibility==='visible','cold flight completion');output.cold={delay:450,finishedAfterVisible:performance.now()-ready};c.physical.remove();
      c=begin();await wait(80);c.physical.remove();await wait(50);check(c.flight.done&&!c.node.isConnected,'removed target must cancel flight');check(!c.physical.style.visibility,'removed card visibility restored');output.targetRemoved=true;
      c=begin(true);c.node.remove();await wait(50);check(c.flight.done&&!c.physical.style.visibility,'removed source must reveal actual judge');c.physical.remove();output.sourceRemoved=true;
      c=begin();await wait(80);lib.config.extension_十周年UI_newDecadeStyle='onlineUI';document.body.dataset.style='onlineUI';await wait(50);
      check(c.flight.done&&!c.node.isConnected&&!c.physical.style.visibility,'style change must clean source/target');c.physical.remove();output.styleChange=true;
      lib.config.extension_十周年UI_newDecadeStyle='othersOff';document.body.dataset.style='othersOff';
      c=begin();await wait(80);c.flight.animation.cancel();await wait(50);check(c.flight.done&&!c.physical.style.visibility,'cancel must restore judge');c.physical.remove();output.animationCancel=true;
      c=begin(true); // 只调用本模块的结束清理，避免其他扩展结束副作用。
      const cleanup=lib.onover.find(fn=>String(fn).includes('for (const flight of flights)'));
      check(!!cleanup,'module game-over cleanup installed');cleanup();await wait(30);check(c.flight.done&&!c.physical.style.visibility,'game over must cleanup');c.physical.remove();output.gameOver=true;
      c=begin();await wait(100);const unrelated=game.createCard('lebu','diamond',3);target.$addVirtualJudge(unrelated,[unrelated]);
      const unlinked=target.node.judges.firstChild;check(!unlinked._xinshaDelayJudgeFlight&&getComputedStyle(unlinked).visibility==='visible','same name without physical source cannot borrow other flight');unlinked.remove();c.physical.remove();await wait(40);output.noBorrow=true;
      document.body.style.zoom='1.5';await wait(100);c=begin();await wait(450);const frames=c.flight.animation.effect.getKeyframes(),last=new DOMMatrixReadOnly(frames.at(-1).transform),rect=c.physical.node.judgeMark.node.judge.getBoundingClientRect(),ar=ui.arena.getBoundingClientRect(),sx=ar.width/ui.arena.clientWidth,sy=ar.height/ui.arena.clientHeight;
      const expected={x:(rect.x+rect.width/2-ar.x)/sx-c.node.offsetWidth/2,y:(rect.y+rect.height/2-ar.y)/sy-c.node.offsetHeight/2};
      check(Math.hypot(last.m41-expected.x,last.m42-expected.y)<.1,'zoomed endpoint must equal actual judge center');output.zoom={zoom:1.5,error:Math.hypot(last.m41-expected.x,last.m42-expected.y)};
      await wait(450);check(c.flight.done&&!c.node.isConnected,'zoom flight cleanup');c.physical.remove();
      output.pending=document.querySelectorAll('.decade-xinsha-delay-judge-pending').length;check(output.pending===0,'no pending judge leaks');return output;
    });
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'yjcm-delay-judge-lifecycle-results.json'),JSON.stringify({result,errors},null,2));
    console.log('YJCM_DELAY_JUDGE_LIFECYCLE_OK',JSON.stringify(result));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
