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
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.locator('#arena > .player').nth(1).waitFor({state:'attached',timeout:45000});
    const setup = await page.evaluate(async subjects => {
      const { game, ui, lib, get, _status } = await import('/noname.js');
      game.pause();
      // 通过原生托管完成选将并运行整个回合，不替换事件栈、不手动刷新提示。
      document.querySelector('.decade-welcome-overlay')?.remove();
      for (const dialog of [...(ui.dialogs || [])]) dialog.close();
      lib.config.game_speed = 'vfast'; lib.config.duration = 600;
      const samples = [], changes = [];
      window.liveTips = { game, ui, lib, get, _status, samples, changes };
      // 从非先手角色观察，确保首回合就是需显示提示的其他角色，而不是本地回合。
      lib.announce.subscribe('gameStart', () => {
        const observer = game.players.find(player => player !== game.zhu);
        if(observer!==game.me)game.swapPlayer(observer);
        if (subjects) { game.zhu.init('sunquan'); game.zhu.addSkill('yingzi'); }
      });
      if (subjects) {
        // 测试页仅安排确定的输入；执行的仍是本体 useSkill/useCard 编译链和标准技能。
        lib.skill._online_tip_subjects = {
          trigger: { global: 'phaseUseBegin' }, forced: true, silent: true, charlotte: true, firstDo: true, priority: Infinity,
          filter: event => event.player !== game.me && !liveTips.subjectsRun,
          async content(event, trigger) {
            liveTips.subjectsRun = true;
            const actor = trigger.player, material = game.createCard('shan', 'heart', 2), card = game.createCard('wuzhong', 'heart', 7);
            actor.directgain([material, card]);
            await actor.useSkill('zhiheng', [material], []);
            await actor.useCard(card, actor);
            liveTips.subjectsDone = true;
          },
        };
        game.addGlobalSkill('_online_tip_subjects');
      }
      const sample = () => {
        const chain = []; let event = _status.event;
        for (let depth = 0; event && depth < 14; depth++, event = event.parent) {
          chain.push({ name: event.name, player: event.player?.playerid, skill: event.skill, card: event.card?.name, finished: event.finished, result: typeof event.result, bool: event.result?.bool });
          if (event.name === 'phaseUse' || event.name === 'phaseDiscard') break;
        }
        const nodes = game.players.filter(player => player !== game.me).map(player => {
          const node = player.querySelector('.decade-xinsha-player-tip');
          return { player: player.playerid, text: node?.textContent || '', tip:!!node, progress:!!player.querySelector(':scope>.timeai,:scope>.timePhase'), seatDisplay:player.querySelector('.seat')&&getComputedStyle(player.querySelector('.seat')).display, display: node && getComputedStyle(node).display, rect: node?.getBoundingClientRect().toJSON() };
        });
        if (samples.length < 400) samples.push({ chain, nodes, currentPhase: _status.currentPhase?.playerid, text: nodes.map(node => node.text).filter(Boolean).join('|') });
      };
      lib.announce.subscribe('Noname.Game.Event.Changed', () => { if (changes.length < 1200) changes.push(_status.event?.name); });
      window.liveTips.timer = setInterval(sample, 40);
      if (!_status.auto) ui.click.auto('forced');
      game.resume2(); game.resume();
      return { style: document.body.dataset.style, startEvent: _status.event?.name, auto: _status.auto };

    }, subjects);
    await page.waitForFunction(() => document.querySelector('.decade-xinsha-player-tip'), null, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    const painted = await page.evaluate(() => {
      const node = document.querySelector('.decade-xinsha-player-tip'), style = getComputedStyle(node), rect = node.getBoundingClientRect();
      node.style.setProperty('pointer-events', 'auto', 'important');
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      const visibleOnTop = top === node || node.contains(top);
      node.style.removeProperty('pointer-events');
      return { text: node.textContent, display: style.display, visibility: style.visibility, opacity: style.opacity, zIndex: style.zIndex, visibleOnTop, rect: rect.toJSON() };
    });
    await page.screenshot({ path: path.join(__dirname, 'yjcm-player-tips-live.png') });
    if (subjects) await page.waitForFunction(() => liveTips.subjectsDone, null, { timeout: 15000 });
    else await page.waitForTimeout(5000);
    const result = await page.evaluate(() => {
      const { game, _status, samples, changes, timer } = liveTips; clearInterval(timer);
      return { done: _status.over, used: game.players.map(player => ({player: player.playerid, cards: player.getStat().card})), samples, changes, gameStarted: _status.gameStarted, lastEvent: _status.event?.name, paused: [_status.paused,_status.paused2,_status.paused3], body: document.body.innerText.slice(0,800), phaseNodes: document.querySelectorAll('.decade-xinsha-player-tip').length };
    });
    fs.writeFileSync(path.join(__dirname, subjects ? 'yjcm-player-tips-subjects-results.json' : 'yjcm-player-tips-live-results.json'), JSON.stringify({ setup, painted, result, errors }, null, 2));
    console.log('LIVE_TIP_OBSERVATION', JSON.stringify({ setup, painted, done: result.done, used: result.used, samples: result.samples.length, visibleSamples: result.samples.filter(sample => sample.text).length, events: [...new Set(result.changes)], otherErrors: errors.map(error => error.split('\n')[0]) }));
    assert.deepEqual(errors.filter(error => /xinsha-player-tips\.js/.test(error)), []);
    assert(!result.failure, result.failure);
    assert(result.samples.some(sample => sample.text), '真实AI回合中思考提示从未显示');
    for(const sample of result.samples)for(const node of sample.nodes)assert.equal(node.tip,node.progress,'真实回合中提示必须随角色进度条同在同退');
    assert.equal(painted.visibleOnTop, true, '提示已生成，但被其他节点遮住');
    assert.equal(painted.visibility, 'visible'); assert.equal(painted.opacity, '1');
    if (subjects) {
      assert(result.samples.some(sample => sample.text.includes('制衡思考中')), '真实 useSkill 执行中未显示制衡');
      assert(result.samples.some(sample => sample.text.includes('无中生有思考中')), '真实 useCard 执行中未显示无中生有');
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
