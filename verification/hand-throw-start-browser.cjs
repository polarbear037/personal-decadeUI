const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {server, chromium, seed} = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");
Object.assign(seed, {mode:"identity", characters:["standard"],cards:["standard","extra"],extension_十周年UI_JDTSYangshi:"3",extension_十周年UI_rightLayout:"on",phonelayout:true,touchscreen:false});

const results = {};
(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	try {
	 for (const style of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"]) {
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

  const result=await page.evaluate(async()=>{
    const {game,ui,lib,get,_status}=await import('/noname.js');
    const {createContentLose}=await import('/extension/十周年UI/src/overrides/content.js');
    game.pause();game.pause2();for(const d of [...ui.dialogs])d.close();
    document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
    game.me=game.players[0];game.me.init('liubei');game.players[1].init('caocao');_status.gameStarted=true;_status.over=false;
    const actor=game.me, rows=[];
    const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const loseStep=createContentLose([])[1];
    for(const mode of ['normal','selected','confirmed','responded','chooseonly','cancelled','reused','scroll','transition','zoom','multiple','cached']){
      for(const c of [...actor.node.handcards1.children])c.remove();
      const cards=Array.from({length:mode==='scroll'?35:5},()=>game.createCard('sha','spade',9));actor.directgain(cards,false);
      const parent=game.createEvent('useCard',false);Object.assign(parent,{player:actor,card:cards[1],cards:[cards[1]],targets:[game.players[1]],delay:false});
      _status.eventManager.tempEvent=undefined;_status.eventManager.setStatusEvent(parent,true);
      if(mode==='zoom'){document.body.style.zoom='1.25';decadeUI.layout.resize();}
      decadeUI.layout.updateHand();
      cards.forEach(c=>c.style.transition='none');await wait(40);
      const source=cards[1];
      if(mode==='selected'){source.classList.add('selected');source.updateTransform(true);}
      let confirmedPosition;
      if(['confirmed','responded','chooseonly','cancelled','reused'].includes(mode)){
        const choose=mode==='responded'?actor.chooseToRespond():actor.chooseToUse();choose.parent=parent;
        if(mode==='chooseonly')choose.chooseonly=true;
        _status.eventManager.setStatusEvent(choose,true);
        ui.selected.cards.add(source);source.classList.add('selected');source.updateTransform(true);
        await wait(50);confirmedPosition=rect(source);
        const resume=game.resume;game.resume=()=>{};
        try{if(mode==='cancelled')ui.click.cancel();else ui.click.ok();}finally{game.resume=resume;}
        if(ui.selected.cards.length||source.classList.contains('selected'))throw new Error('Selection was not cleared');
        await wait(120);
        if(['confirmed','responded','reused'].includes(mode)){
          for(const key of ['x','y','width','height'])if(Math.abs(rect(source)[key]-confirmedPosition[key])>=1)throw new Error(`${mode}/${key}: card moved before flight ${JSON.stringify({before:confirmedPosition,after:rect(source),event:choose.name,nouse:choose.nouse,chooseonly:choose.chooseonly,result:choose.result?.confirm,card:choose.result?.card?.name,bool:choose.result?.bool,count:choose.result?.cards?.length})}`);
          const use=game.createEvent('useCard',false);Object.assign(use,{player:actor,parent:choose,card:source,cards:[source],targets:[game.players[1]]});
          _status.eventManager.setStatusEvent(use,true);decadeUI.layout.updateHand();await wait(120);
          for(const key of ['x','y','width','height'])if(Math.abs(rect(source)[key]-confirmedPosition[key])>=1)throw new Error(`${mode}/${key}: layout moved card before flight`);
          if(mode==='reused'){
            const next=actor.chooseToUse();next.parent=parent;
            _status.eventManager.setStatusEvent(next,true);source.updateTransform(false);await wait(50);
            if(rect(source).y<=confirmedPosition.y+5)throw new Error('Confirmed state leaked into next choice');
          }
        }else if(rect(source).y<=confirmedPosition.y+5)throw new Error('Cancelled card did not return');
      }
      if(mode==='scroll'){lib.config.fold_card=true;lib.config.extension_十周年UI_handFoldMin=70;decadeUI.layout.updateHand();ui.handcards1Container.scrollLeft=60;if(!ui.handcards1Container.scrollLeft)throw new Error('Scroll scenario did not scroll');}
      if(mode==='transition'){
        source.style.transition='transform 1000ms linear';source.getBoundingClientRect();source.style.transform+=' translateY(-40px)';await wait(120);
      }
      const used=mode==='multiple'?[cards[1],cards[2]]:[source];parent.cards=used;
      const loss=game.createEvent('lose',false);Object.assign(loss,{player:actor,cards:used.slice(),position:ui.ordering,visible:true,animate:true,vcard_map:new Map(),getlx:false,blameEvent:parent,parent});
      const expected=used.map(rect), starts=[];
      if(mode==='cached'){decadeUI.boundsCaches.hand._x+=80;decadeUI.boundsCaches.hand._y+=90;}
      const base=actor.$throwordered2;
      actor.$throwordered2=function(card,...args){const result=base.call(this,card,...args);starts.push(rect(result));return result;};
      try{await loseStep(loss,null,actor);}finally{actor.$throwordered2=base;}
      rows.push({mode,expected,starts,confirmedPosition,handHeight:ui.handcards1.offsetHeight,containerHeight:ui.me.offsetHeight});
      await wait(500);
      for(const c of ui.thrown.slice())c.remove();ui.thrown.length=0;
      document.body.style.zoom='';ui.handcards1Container.scrollLeft=0;lib.config.extension_十周年UI_handFoldMin=9;decadeUI.boundsCaches.hand.updated=false;
    }
    return {style:lib.config.extension_十周年UI_newDecadeStyle,rows};
  });
  results[style]={result,errors};
  for(const row of result.rows){
    assert.equal(row.starts.length,row.expected.length,`${style}/${row.mode}: clone count`);
    for(let i=0;i<row.expected.length;i++)for(const key of ['x','y','width','height']){
      const delta=Math.abs(row.starts[i][key]-row.expected[i][key]);
      assert(delta<1,`${style}/${row.mode}/${key}: start delta ${delta.toFixed(3)}px`);
    }
  }
  assert.deepEqual(errors,[]);
  console.log('HAND_THROW_START_OK',style);
  await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'hand-throw-start-results.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(__dirname,'hand-throw-start-results.json'),JSON.stringify(results,null,2));server.close();process.exitCode=1;});
