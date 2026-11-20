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

  const result = await page.evaluate(async () => {
    const { game, ui, lib, _status } = await import('/noname.js');
    game.pause(); game.pause2();
    for (const dialog of [...ui.dialogs]) dialog.close();
    document.querySelector('.decade-welcome-overlay')?.remove();
    ui.arena.classList.remove('choose-character');
    game.me = game.players[0]; game.me.init('liubei'); game.players[1].init('caocao');
    _status.gameStarted = true; _status.over = false;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const event = game.createEvent('discard', false); event.player = game.players[1];
    _status.eventManager.tempEvent = undefined; _status.eventManager.setStatusEvent(event, true);
    const rows = [], base = decadeUI.layout.updateDiscard;
    const create = count => Array.from({ length: count }, () => game.createCard('sha', 'spade', 9));
    for (const [scene, count] of [['single', 1], ['batch', 5], ['large', 20], ['interleaved', 5], ['removing', 5], ['local', 5]]) {
      for (const card of ui.thrown) card.remove(); ui.thrown = [];
      const cards = create(count), frames = [], moving = new Set();
      const onTransition = event => { if (event.propertyName === "transform") moving.add(event.target); };
      ui.arena.addEventListener("transitionrun", onTransition);
      let outgoing;
      if (scene === 'removing') {
        outgoing = create(1); game.players[1].$throw(outgoing, false); await wait(600);
        outgoing[0].clone.classList.add('removing');
      }
      let calls = 0;
      decadeUI.layout.updateDiscard = function () { calls++; return base.apply(this, arguments); };
      if (scene === 'local') {
        game.me.directgain(cards, false); decadeUI.layout.updateHand(); await wait(600);
        cards.forEach(card => card.throwWith = 'h'); cards.duiMod = true;
        game.me.$throw(cards, false);
      } else game.players[1].$throw(cards, false);
      if (scene === 'interleaved') {
        // 下一帧回调已取走队列，但其计时器尚未执行时加入另一批牌。
        await new Promise(resolve => requestAnimationFrame(() => {
          const extra = create(count); game.players[1].$throw(extra, false); cards.push(...extra); resolve();
        }));
      }
      const clones = cards.map(card => card.clone);
      const started = performance.now();
      await new Promise(resolve => {
        function sample(now) {
          frames.push({ t: now - started, cards: clones.map(card => {
            const matrix = new DOMMatrix(getComputedStyle(card).transform);
            return { x: matrix.e, y: matrix.f, scale: matrix.a, target: card.style.transform,
              transitions: card.getAnimations().filter(animation => animation.transitionProperty === 'transform').length };
          }) });
          if (now - started < 900) requestAnimationFrame(sample); else resolve();
        }
        requestAnimationFrame(sample);
      });
      const final = frames.at(-1), stable = frames.filter(frame => frame.t > 650);
      let maxReverse = 0, maxFinalDelta = 0, maxStableDelta = 0, movingCards = 0;
      clones.forEach((card, index) => {
        const target = new DOMMatrix(card.style.transform), first = frames[0].cards[index];
        if (moving.has(card) || frames.some(frame => frame.cards[index].transitions)) movingCards++;
        for (const key of ['x', 'y']) {
          const goal = key === 'x' ? target.e : target.f, direction = Math.sign(goal - first[key]);
          for (let i = 1; i < frames.length; i++) maxReverse = Math.max(maxReverse, -direction * (frames[i].cards[index][key] - frames[i - 1].cards[index][key]));
          maxFinalDelta = Math.max(maxFinalDelta, Math.abs(final.cards[index][key] - goal));
          for (const frame of stable) maxStableDelta = Math.max(maxStableDelta, Math.abs(frame.cards[index][key] - final.cards[index][key]));
        }
      });
      const initialCalls = calls;
      // 执行后必须能继续调度；普通动画回调不得被合并。
      let ordinaryCalls = 0; const ordinary = () => ordinaryCalls++;
      decadeUI.queueNextFrameTick(ordinary, decadeUI); decadeUI.queueNextFrameTick(ordinary, decadeUI);
      decadeUI.queueNextFrameTick(decadeUI.layoutDiscard, decadeUI);
      const deadline = performance.now() + 3000;
      while ((calls === initialCalls || ordinaryCalls < 2) && performance.now() < deadline) await wait(16);
      ui.arena.removeEventListener("transitionrun", onTransition);
      rows.push({ scene, count: cards.length, initialCalls, subsequentCalls: calls - initialCalls, ordinaryCalls,
        movingCards, maxReverse, maxFinalDelta, maxStableDelta, remaining: ui.thrown.length,
        outgoingExcluded: !outgoing || !ui.thrown.includes(outgoing[0].clone) });
      decadeUI.layout.updateDiscard = base;
      if (scene === 'local') { cards.forEach(card => card.remove()); decadeUI.layout.updateHand(); }
    }
    return { style: lib.config.extension_十周年UI_newDecadeStyle, rows };
  });
  results[style] = { result, errors };
  for (const row of result.rows) {
    const label = style + '/' + row.scene;
    assert.equal(row.initialCalls, 1, label + ': batch layout count');
    assert.equal(row.subsequentCalls, 1, label + ': later layout must run');
    assert.equal(row.ordinaryCalls, 2, label + ': ordinary callbacks must remain independent');
    assert.equal(row.movingCards, row.count, label + ': preserve card transitions');
    assert(row.maxReverse < 0.1, label + ': reverse movement ' + row.maxReverse);
    assert(row.maxFinalDelta < 0.1, label + ': final position ' + row.maxFinalDelta);
    assert(row.maxStableDelta < 0.1, label + ': settled jitter ' + row.maxStableDelta);
    assert.equal(row.remaining, row.count, label + ': active card count');
    assert(row.outgoingExcluded, label + ': outgoing cards removed from layout');
  }
  assert.deepEqual(errors, []);
  console.log('DISCARD_BATCH_OK',style);
  await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'discard-batch-results.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(__dirname,'discard-batch-results.json'),JSON.stringify(results,null,2));server.close();process.exitCode=1;});
