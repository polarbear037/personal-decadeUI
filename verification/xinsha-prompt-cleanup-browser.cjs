const fs = require("node:fs");
const path = require("node:path");
const { installNativeHarness, server, chromium, assert } = require("./optimized-prompt-browser.cjs");

async function run() {
	const baseline = process.argv.includes("--baseline");
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
	const errors = [];
	page.on("pageerror", error => errors.push(error.message));
	try {
		const originalRead = fs.readFileSync;
		if (baseline) fs.readFileSync = function (file, ...args) {
			return originalRead.call(this, String(file).replace(/src[\\/]ui[\\/]optimizedPrompt\.js$/, ".codex-tmp/prompt-cleanup/optimizedPrompt.before.js"), ...args);
		};
		try { await installNativeHarness(page, `http://127.0.0.1:${server.address().port}`, false); }
		finally { fs.readFileSync = originalRead; }
		const results = await page.evaluate(async baseline => {
			const host = document.createElement("div");
			host.id = "window";
			ui.arena.before(host);
			host.append(ui.arena);
			const style = document.createElement("style");
			style.textContent = "html,body,#window,#arena{width:100%;height:100%;margin:0}#arena{position:relative}body{--yjcm-unit:1px}.hand-tip{position:absolute}.hand-tip.hidden{opacity:0!important}";
			document.head.append(style);
			document.body.dataset.style = "othersOff";
			lib.config.extension_十周年UI_newDecadeStyle = "othersOff";
			_status.imchoosing = true;
			ui.selected = { cards: [], targets: [], buttons: [] };
			const open = (mode = "xinsha") => {
				lib.config.extension_十周年UI_optimizePrompt = mode;
				_status.event = { name: "chooseToUse", player: game.me, isMine: () => true, prompt: "清理测试提示" };
				refreshOptimizedPrompt();
				return document.querySelector(".decade-optimized-hand-tip");
			};
			const snapshot = tip => ({ text: tip.textContent, stroke: tip.dataset.text || "", pseudo: getComputedStyle(tip, "::before").content, opacity: Number(getComputedStyle(tip).opacity), top: tip.getBoundingClientRect().top, closed: tip.closed });
			const results = {};
			for (const reason of baseline ? ["clear"] : ["clear", "uncheck", "finished", "off"]) {
				const tip = open();
				await document.fonts.ready;
				await new Promise(resolve => setTimeout(resolve, 150));
				const before = snapshot(tip);
				if (reason === "clear") clearOptimizedPrompts();
				else if (reason === "uncheck") lib.hooks.uncheckEnd.handlers.forEach(handler => handler(_status.event, ["card", "target", "button"]));
				else if (reason === "finished") { _status.event.finished = true; refreshOptimizedPrompt(); }
				else { lib.config.extension_十周年UI_optimizePrompt = "off"; refreshOptimizedPrompt(); }
				const frames = [snapshot(tip)];
				for (let i = 0; i < 10; i++) {
					await new Promise(requestAnimationFrame);
					frames.push(snapshot(tip));
				}
				const next = open();
				results[reason] = { before, frames, reused: next === tip, restored: next.textContent };
				clearOptimizedPrompts();
			}
			if (!baseline) {
				const online = open("online");
				const before = snapshot(online);
				clearOptimizedPrompts();
				results.online = { before, after: snapshot(online) };
			}
			return results;
		}, baseline);
		if (baseline) {
			assert.ok(results.clear.frames[0].text && results.clear.frames[0].opacity > 0, "未复现旧提示残影");
			console.log("BASELINE_XINSHA_RESIDUE", JSON.stringify(results.clear.frames[0]));
		} else {
			for (const reason of ["clear", "uncheck", "finished", "off"]) {
				const value = results[reason];
				assert.ok(value.before.text && value.before.opacity > 0);
				assert.ok(value.frames.every(frame => !frame.text && !frame.stroke && !frame.pseudo.includes("清理测试提示")), `${reason} 清理后仍有正文或描边`);
				assert.ok(value.frames.every(frame => frame.closed));
				assert.ok(value.reused, "未复用原有 hand-tip 缓存");
				assert.equal(value.restored, "清理测试提示");
			}
			assert.ok(results.online.before.text, "Online 提示未显示");
			assert.equal(results.online.after.text, "", "Online 关闭后仍有正文残影");
			assert.equal(results.online.after.stroke, "", "Online 关闭后仍有描边残影");
			assert.deepEqual(errors, []);
			fs.writeFileSync(path.join(__dirname, "xinsha-prompt-cleanup-results.json"), JSON.stringify({ results, errors }, null, 2));
			console.log("XINSHA_PROMPT_CLEANUP_OK clear uncheck finished off reuse online; 11 samples per exit; errors=0");
		}
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
}
run().catch(error => { console.error(error); process.exitCode = 1; });
