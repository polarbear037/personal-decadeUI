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
    const {game,ui,lib,_status}=await import('/noname.js');Object.assign(window,{game,ui,lib,_status});
    game.pause();game.pause2();for(const d of [...ui.dialogs])d.close();document.querySelector('.decade-welcome-overlay')?.remove();ui.arena.classList.remove('choose-character');
    game.me=game.players[0];game.me.init('caocao');game.players[1].init('liubei');_status.gameStarted=true;
    if(lib.config.extension_十周年UI_newDecadeStyle==='othersOff'){
      const {installCardBeautify}=await import('/extension/雷的一将/utils/cardBeautify.js');
      await installCardBeautify();
    }
    window.judgeLayout=await import('/extension/十周年UI/src/ui/xinsha-judge-layout.js');
    for(const player of [game.me,game.players[1]])for(const name of ['lebu','bingliang','shandian']){
      const card=game.createCard(name,'spade',6);player.$addVirtualJudge(card,[card]);
    }
    window.measure=()=>{
      const v=ui.window.getBoundingClientRect(),s=getComputedStyle(ui.window),u=parseFloat(s.getPropertyValue('--yjcm-unit')),zoom=v.width/ui.window.clientWidth;
      return {unit:u,style:document.body.dataset.style,files:[...document.styleSheets].map(s=>s.href).filter(Boolean),expected:{x:v.left+(parseFloat(s.getPropertyValue('--yjcm-scene-x'))+108*u)*zoom,bottom:v.bottom-(parseFloat(s.getPropertyValue('--yjcm-scene-y'))+194*u)*zoom,step:35*u*zoom},
        self:[...game.me.node.judges.children].map(c=>{const r=c.node.judgeMark.getBoundingClientRect();return{x:r.left,bottom:r.bottom,width:r.width,height:r.height};}),
        marker:game.me.node.judges.dataset.xinshaJudgeLayout,remote:game.players[1].node.judges.dataset.xinshaJudgeLayout};
    };
  });
  await page.waitForTimeout(650);
  results[style]={cases:[]};
  const check=async label=>{
    await page.waitForTimeout(650);const r=await page.evaluate(()=>measure());results[style].cases.push({label,...r});
    assert.equal(r.style,style);assert.equal(r.remote,undefined);
    if(style==='othersOff'){
      assert.equal(r.marker,'true');assert(r.files.some(f=>new URL(f).pathname.endsWith('/player3.css')));
      r.self.forEach((c,i)=>{assert(Math.abs(c.x-r.expected.x-i*r.expected.step)<.2,`${label}: x ${c.x}, expected ${r.expected.x+i*r.expected.step}`);assert(Math.abs(c.bottom-r.expected.bottom)<.2,`${label}: bottom ${c.bottom}, expected ${r.expected.bottom}`);});
    }else{assert.equal(r.marker,undefined);assert(r.files.some(f=>new URL(f).pathname.endsWith('/player4.css')));}
  };
  await check('initial');
  if(style==='othersOff'){
    const inspectFace=()=>page.evaluate(()=>{
      const visible=node=>{for(let n=node;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}return true;};
      return [...game.me.node.judges.children].map(card=>({
        ready:card.classList.contains('lei-yijiang-card-ready'),
        leaks:[...card.children].filter(n=>!n.classList.contains('judge-mark')&&visible(n)).map(n=>n.className),
        pseudo:['::before','::after'].filter(p=>{const s=getComputedStyle(card,p);return s.content!=='none'&&s.display!=='none'&&Number(s.opacity)!==0;}),
        mark:visible(card.node.judgeMark.node.judge),background:getComputedStyle(card).backgroundImage,shadow:getComputedStyle(card).boxShadow,
      }));
    });
    await page.waitForFunction(()=>[...game.me.node.judges.children].every(c=>c.classList.contains('lei-yijiang-card-ready')));
    results[style].faces=[];
    for(const state of ['', 'selected', 'infohidden', 'infoflip', 'drawinghidden', 'fakejudge']){
      await page.evaluate(state=>{for(const card of game.me.node.judges.children){card.classList.remove('selected','infohidden','infoflip','drawinghidden','fakejudge');if(state)card.classList.add(state);card.node.gaintag.textContent='安';}},state);
      await page.waitForTimeout(150);
      const faces=await inspectFace();results[style].faces.push({state,faces});
      for(const face of faces){assert(face.ready);assert.deepEqual(face.leaks,[],`判定区牌面泄漏: ${JSON.stringify(face)}`);assert.deepEqual(face.pseudo,[],`判定区边框/卡背泄漏: ${JSON.stringify(face)}`);assert.equal(face.background,'none');assert.equal(face.shadow,'none');if(!['infohidden','drawinghidden'].includes(state))assert(face.mark);}
    }
    await page.evaluate(()=>{for(const card of game.me.node.judges.children)card.classList.remove('fakejudge');});
    results[style].reuse=await page.evaluate(async()=>{
      const card=game.me.node.judges.firstChild;const next=card.nextSibling;ui.arena.append(card);await new Promise(r=>setTimeout(r,150));
      const face=getComputedStyle(card.querySelector('.lei-yijiang-card-face')),tag=getComputedStyle(card.node.gaintag);
      const restored=face.display!=='none'&&face.visibility!=='hidden'&&Number(face.opacity)>0&&tag.display!=='none'&&Number(tag.opacity)>0;
      game.me.node.judges.insertBefore(card,next);ui.updatej(game.me);return restored;
    });
    assert(results[style].reuse,'牌离开判定区后应恢复牌面与标签');
    await page.screenshot({path:path.join(__dirname,'yjcm-judge-layout-browser.png')});
    results[style].transition=await page.evaluate(async()=>{
      game.me.style.transition='left .3s linear';game.me.style.right='auto';game.me.style.left='900px';
      await new Promise(r=>setTimeout(r,350));game.me.style.left='700px';
      const samples=[];await new Promise(resolve=>{const start=performance.now();const next=()=>requestAnimationFrame(()=>setTimeout(sample,0));const sample=()=>{const r=measure();samples.push(Math.abs(r.self[0].x-r.expected.x));if(performance.now()-start<400)next();else resolve();};next();});
      game.me.style.transition='';return{frames:samples.length,maxError:Math.max(...samples)};
    });
    assert(results[style].transition.frames>5);assert(results[style].transition.maxError<2);
  }
  for(const viewport of [{width:1280,height:880},{width:1920,height:900}]){await page.setViewportSize(viewport);await check('resize '+viewport.width);}
  await page.evaluate(()=>{ui.arena.style.left='120px';ui.arena.style.right='70px';game.me.style.transform='scale(.85)';});await check('sidebar and portrait scale');
  await page.evaluate(()=>{document.body.style.zoom='1.25';ui.window.style.width='80vw';ui.window.style.height='80vh';});await check('documentZoom1.25');
  await page.evaluate(()=>{lib.config.extension_十周年UI_rightLayout='off';ui.window.dataset.yjcmSide='left';game.me.style.left='45px';game.me.style.right='auto';});await check('left hand');
  await page.evaluate(()=>{const c=game.me.node.judges.children[1];c.remove();ui.updatej(game.me);});await check('remove and compact');
  if(style==='othersOff'){
    await page.evaluate(()=>{game.me.$uninit();});
    assert.equal(await page.evaluate(()=>game.me.node.judges.dataset.xinshaJudgeLayout),undefined);
    await page.evaluate(()=>{game.me.init('caocao');const c=game.createCard('lebu','heart',6);game.me.$addVirtualJudge(c,[c]);});await check('reinit');
    await page.evaluate(()=>{lib.config.extension_十周年UI_newDecadeStyle='onlineUI';ui.updatej(game.me);});
    assert.equal(await page.evaluate(()=>game.me.node.judges.dataset.xinshaJudgeLayout),undefined);
  }
  assert.deepEqual(errors,[]);results[style].errors=errors;await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'yjcm-judge-layout-results.json'),JSON.stringify(results,null,2));
 console.log('YJCM_JUDGE_LAYOUT_OK: native judge update, resize, sidebar, zoom, left hand, removal, uninit/reinit and Online isolation');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
