const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "..");

async function dependencies(page) {
	for (const [request, bundle, name] of [
		["crypto-js@4.2.0/node_modules/crypto-js/index.js", "crypto-js@4.2.0/node_modules/crypto-js/crypto-js.js", "CryptoJS"],
		["jszip@2.7.0/node_modules/jszip/lib/index.js", "jszip@2.7.0/node_modules/jszip/dist/jszip.js", "JSZip"],
		["nosleep.js@0.12.0/node_modules/nosleep.js/src/index.js", "nosleep.js@0.12.0/node_modules/nosleep.js/dist/NoSleep.js", "NoSleep"],
		["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "core"],
		["stackframe@1.3.4/node_modules/stackframe/stackframe.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "StackFrame"],
		["error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "ErrorStackParser"],
		["stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js", "StackTraceGPS"],
	]) {
		const source = fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", bundle), "utf8").replaceAll("}(this,", "}(globalThis,").replaceAll(")(this,", ")(globalThis,");
		const prefix = ["ErrorStackParser", "StackTraceGPS"].includes(name) ? 'import "/_virtual/stackframe.js";\n' : "";
		await page.route("**/node_modules/.pnpm/" + request, route => route.fulfill({ contentType: "text/javascript", body: prefix + source + `\nexport function __require(){return globalThis.${name};}` }));
	}
	for (const [pattern, file] of [["**/pinyin-pro/dist/index.js", "pinyin-pro@3.28.0/node_modules/pinyin-pro/dist/index.mjs"], ["**/dedent/dist/dedent.js", "dedent@1.7.1/node_modules/dedent/dist/dedent.mjs"]]) {
		await page.route(pattern, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(root, "../../node_modules/.pnpm/", file), "utf8") }));
	}
}

async function run() {
 await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
 const browser = await chromium.launch({channel:"msedge", headless:true});
 try {
  for (const style of ["onlineUI", "on", "off", "othersOff", "babysha", "codename"]) {
   Object.assign(seed, {mode:"identity", characters:["standard"], cards:["standard","extra"], touchscreen:false, extension_十周年UI_newDecadeStyle:style});
   const page = await browser.newPage({viewport:{width:1500,height:800}});
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("dialog",d=>d.accept());
   await dependencies(page);
   await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
   await page.locator("#arena > .player").nth(1).waitFor({state:"attached",timeout:45000});
   await page.evaluate(async()=>{
    const {game,ui,lib,_status}=await import("/noname.js");
    game.pause();game.resume=()=>{};game.resume2=()=>{};
    game.me=game.players[0];game.me.init("sunquan");
    _status.auto=false;_status.over=false;_status.gameStarted=true;
    ui.arena.classList.remove("choose-character");
    document.querySelector(".decade-welcome-overlay")?.remove();
   });
   await require("./handcard-multiselect-engine.cjs")(page);
   // 布局刷新可能发生在按住下一张牌、尚未 mouseup 的期间。
   const held = await page.evaluate(async()=>{
    const {ui,_status}=await import("/noname.js");
    const cards=ui.selected.cards.slice();
    const tops=cards.map(c=>c.getBoundingClientRect().top);
    const deviations=cards.map(()=>0);
    _status.mousedown=true;_status.mouseleft=false;
    decadeUI.layout.updateHand();
    const start=performance.now();
    await new Promise(resolve=>{
     const sample=()=>{
      cards.forEach((c,i)=>deviations[i]=Math.max(deviations[i],Math.abs(c.getBoundingClientRect().top-tops[i])));
      if(performance.now()-start<350)requestAnimationFrame(sample);else resolve();
     };requestAnimationFrame(sample);
    });
    _status.mousedown=false;
    cards.forEach(c=>c.updateTransform(true));
    return deviations;
   });
   console.log("MULTISELECT_STYLE",JSON.stringify({style,held,errors}));
   assert(held.every(d=>d<.1),style+": held-pointer layout drops previously selected cards");
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log("HANDCARD_MULTISELECT_ALL_STYLES_OK");
 } finally {await browser.close();server.close();}
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1;});
