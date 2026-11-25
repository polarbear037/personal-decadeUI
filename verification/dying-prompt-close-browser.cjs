const fs = require("node:fs");
const path = require("node:path");
const { installNativeHarness, server, chromium, assert } = require("./optimized-prompt-browser.cjs");

async function run() {
	const baseline = process.argv.includes("--baseline");
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = [];
	const errors = [];
	try {
		for (const style of ["othersOff", "onlineUI", "on"]) {
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			page.on("pageerror", error => errors.push(error.message));
			const origin = `http://127.0.0.1:${server.address().port}`;
			await installNativeHarness(page, origin, false);
			await page.addStyleTag({ url: `${origin}/extension/十周年UI/src/styles/${style === "othersOff" ? "dialog-xinsha" : "dialogOK"}.css` });
			const polyfill = fs.readFileSync(path.resolve(__dirname, "../../../noname/init/polyfill.js"), "utf8");
			await page.addScriptTag({ content: polyfill.slice(polyfill.indexOf("HTMLDivElement.prototype.delete ="), polyfill.indexOf("HTMLDivElement.prototype.goto =")) });
			results.push(...await page.evaluate(async style => {
				const host = document.createElement("div");
				host.id = "window";
				ui.arena.before(host);
				host.append(ui.arena);
				document.body.dataset.style = style;
				lib.config.extension_十周年UI_newDecadeStyle = style;
				_status.imchoosing = true;
				ui.selected = { cards: [], targets: [], buttons: [] };
				const css = document.createElement("style");
				css.textContent = "html,body,#window,#arena{width:100%;height:100%;margin:0}#arena{position:relative}body{--yjcm-unit:1px}.hand-tip{position:absolute}.hand-tip.hidden{opacity:0!important}";
				document.head.append(css);
				const snapshot = tip => ({ text: tip.textContent, stroke: tip.dataset.text || "", pseudo: getComputedStyle(tip, "::before").content, opacity: Number(getComputedStyle(tip).opacity), closed: !!tip.closed });
				const frame = () => new Promise(requestAnimationFrame);
				const rows = [];
				for (const mode of ["online", "xinsha", "off"]) {
					for (const reason of mode === "off" ? ["close"] : ["clear", "uncheck", "finished", "off", "dialog"]) {
						clearOptimizedPrompts();
						lib.config.extension_十周年UI_optimizePrompt = mode;
						_status.event = { name: "chooseToUse", type: "dying", player: game.me, dying: { name: "星张昭", hp: 0 }, isMine: () => true, prompt: "星张昭濒死，是否帮助？", prompt2: "当前体力：0" };
						let dialog;
						if (mode !== "off") {
							dialog = ui.create.dialog(_status.event.prompt);
							dialog.classList.add("prompt");
							_status.event.dialog = dialog;
							dialog.addText(_status.event.prompt2);
							refreshOptimizedPrompt();
						} else {
							const tip = decadeUI.showHandTip("星张昭濒死，需要1个桃，是否帮助？");
							tip.strokeText();
						}
						const tip = decadeUI.statics.handTips.find(tip => !tip.closed);
						await document.fonts.ready;
						await new Promise(resolve => setTimeout(resolve, 130));
						const before = snapshot(tip);
						if (reason === "close") tip.close();
						else if (reason === "clear") clearOptimizedPrompts();
						else if (reason === "uncheck") lib.hooks.uncheckEnd.handlers.forEach(handler => handler(_status.event, ["card", "target", "button"]));
						else if (reason === "finished") { _status.event.finished = true; refreshOptimizedPrompt(); }
						else if (reason === "off") { lib.config.extension_十周年UI_optimizePrompt = "off"; refreshOptimizedPrompt(); }
						else { _status.imchoosing = false; _status.event.finished = true; dialog.close(); }
						const frames = [snapshot(tip)];
						for (let i = 0; i < 12; i++) { await frame(); frames.push(snapshot(tip)); }
						const reused = decadeUI.showHandTip("下一次求桃提示");
						rows.push({ style, mode, reason, before, frames, reused: reused === tip, nextText: reused.textContent });
						reused.close();
						if (dialog && reason !== "dialog") dialog.close();
						clearOptimizedPrompts();
						_status.imchoosing = true;
					}
				}
				// 隐藏应保留文字以便恢复；关闭只清理自身，仍能恢复上一层提示。
				const previous = decadeUI.showHandTip("上一层提示");
				previous.strokeText();
				const current = decadeUI.showHandTip("当前求桃提示");
				current.strokeText();
				current.hide();
				const hiddenText = current.textContent;
				current.show();
				current.close();
				rows.push({ style, stack: { hiddenText, current: snapshot(current), previous: snapshot(previous), restored: !previous.classList.contains("hidden") } });
				previous.close();
				return rows;
			}, style));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, `dying-prompt-close-${baseline ? "before" : "results"}.json`), JSON.stringify({ results, errors }, null, 2));
		assert.deepEqual(errors, []);
		const cases = results.filter(row => !row.stack);
		if (baseline) {
			const residue = cases.filter(row => row.frames.some(frame => frame.text && frame.opacity > 0));
			assert.ok(residue.length, "未复现关闭残影");
			console.log("DYING_PROMPT_CLOSE_BASELINE", JSON.stringify(residue.map(({ style, mode, reason, frames }) => ({ style, mode, reason, firstFrame: frames[0] }))));
		} else {
			for (const row of cases) {
				const label = `${row.style}/${row.mode}/${row.reason}`;
				assert.ok(row.before.text.includes("濒死") && row.before.opacity > 0, label + " 提示未显示");
				assert.ok(row.frames.every(frame => frame.closed && !frame.text && !frame.stroke && !frame.pseudo.includes("濒死")), label + " 关闭后残留正文或描边");
				assert.ok(row.reused && row.nextText === "下一次求桃提示", label + " 缓存复用失败");
			}
			for (const { style, stack } of results.filter(row => row.stack)) {
				assert.equal(stack.hiddenText, "当前求桃提示", style + " hide 清空了可恢复提示");
				assert.ok(stack.restored && stack.previous.text === "上一层提示" && !stack.previous.closed, style + " 上层提示未恢复");
				assert.ok(!stack.current.text && !stack.current.stroke && stack.current.closed, style + " 已关闭提示未清理");
			}
			console.log(`DYING_PROMPT_CLOSE_OK cases=${cases.length} samples=${cases.length * 13} styles=3 stack=3 errors=0`);
		}
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
}
run().catch(error => { console.error(error); process.exitCode = 1; });
