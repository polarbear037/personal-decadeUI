const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const { dependencies } = require("./xinsha-prompt-engine.cjs");

async function run() {
	const baseline = process.argv.includes("--baseline");
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	const results = {};
	try {
		for (const style of baseline ? ["othersOff"] : ["othersOff", "onlineUI"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_newDecadeStyle: style, extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : "online" });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			if (baseline) await page.route(/\/src\/ui\/xinshaPrompt\.js/, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(__dirname, "../.codex-tmp/qinglong-prompt/xinshaPrompt.before.js"), "utf8") }));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async () => {
				const { game, ui, lib, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { buildXinshaPrompt } = await import("/extension/十周年UI/src/ui/xinshaPrompt.js");
				game.pause(); game.resume = () => {};
				for (const dialog of [...ui.dialogs]) dialog.close();
				for (const control of [...ui.controls]) control.close();
				prompts.clearOptimizedPrompts();
				document.querySelector(".decade-welcome-overlay")?.remove();
				ui.arena.classList.remove("choose-character");
				game.me = game.players[0]; game.me.init("sunquan");
				const target = game.players[1]; target.init("machao");
				game.me.addSkill("qinglong_skill");
				const sha = game.createCard("sha", "spade", 7);
				game.me.directgain([sha, game.createCard("shan", "heart", 2)]);
				_status.currentPhase = game.me; _status.auto = false; _status.over = false;
				lib.config.auto_confirm = false;
				const effect = game.createEvent("qinglong_skill", false);
				const trigger = { player: game.me, target, card: new lib.element.VCard({ name: "sha" }) };
				effect.player = game.me; effect._trigger = trigger;
				_status.eventManager.setStatusEvent(effect, true);
				let choice;
				const originalUse = game.me.chooseToUse;
				game.me.chooseToUse = function (...args) {
					choice = originalUse.apply(this, args);
					// 停在原生选择步骤，避免运行后续用牌/伤害结算。
					choice.then = () => {};
					return choice;
				};
				try { lib.skill.qinglong_skill.content(effect, trigger, game.me); }
				finally { game.me.chooseToUse = originalUse; }
				if (!choice) throw new Error("qinglong_skill did not create chooseToUse");
				choice._skillChoice = [];
				_status.eventManager.setStatusEvent(choice, true);
				_status.imchoosing = true;
				const tip = () => document.querySelector(".decade-optimized-hand-tip:not(.hidden)");
				const read = () => {
					const node = tip(), main = node?.querySelector(".decade-official-main");
					return { text: main?.textContent || "", detail: node?.querySelector(".decade-official-detail")?.textContent || "", id: node?.dataset.officialSkillId, field: node?.dataset.officialPromptField, font: node && getComputedStyle(node).fontFamily, lineHeight: node && parseFloat(getComputedStyle(node).lineHeight), height: node?.getBoundingClientRect().height, spans: [...(main?.children || [])].map(span => ({ text: span.textContent, color: getComputedStyle(span).color })) };
				};
				prompts.refreshOptimizedPrompt();
				const early = read();
				const rendered = [];
				const originalTip = decadeUI.showHandTip;
				decadeUI.showHandTip = function (...args) {
					const node = originalTip.apply(this, args);
					const originalShow = node.show;
					node.show = function (...rest) { const result = originalShow.apply(this, rest); rendered.push(this.textContent); return result; };
					return node;
				};
				await Content.chooseToUse[0](choice, null, game.me);
				await document.fonts.ready;
				await new Promise(requestAnimationFrame);
				const opened = read();
				_status.clicked = false; ui.click.card.call(sha);
				const selected = { ...read(), cards: ui.selected.cards.length, targetAllowed: choice.filterTarget(sha, game.me, target), addCount: choice.addCount, targets: ui.selected.targets.map(player => player.name), locked: !target.classList.contains("selectable") };
				let multi = null, autoOff = null, ordinary = null, virtual = null;
				if (document.body.dataset.style === "othersOff") {
					const other = game.players[2]; other.init("zhangfei");
					// 保留真实 selectTarget 计算，通过本体 mod 模拟“可额外指定一人”。
					lib.skill._qinglong_extra_target_probe = { mod: { selectTarget(card, player, range) { if (card.name === "sha") range[1]++; }, targetInRange(card) { if (card.name === "sha") return true; } } };
					game.me.addSkill("_qinglong_extra_target_probe");
					game.check();
					const extraSelectable = other.classList.contains("selectable");
					_status.clicked = false; ui.click.target.call(other);
					multi = { range: get.select(choice.selectTarget), extraSelectable, targets: ui.selected.targets.map(player => player.name), originalLocked: !target.classList.contains("selectable") };
					_status.clicked = false; ui.click.target.call(target);
					multi.afterOriginalClick = ui.selected.targets.map(player => player.name);
					_status.clicked = false; ui.click.target.call(other);
					multi.afterExtraClick = ui.selected.targets.map(player => player.name);
					multi.cardsAfterExtraClick = ui.selected.cards.length;
					// 本体 complexSelect 取消已选额外目标会重置整次选牌；再次选杀须恢复固定目标。
					_status.clicked = false; ui.click.card.call(sha);
					multi.afterReselectCard = ui.selected.targets.map(player => player.name);
					game.me.removeSkill("_qinglong_extra_target_probe"); delete lib.skill._qinglong_extra_target_probe;
					game.uncheck(); lib.config.extension_十周年UI_autoSelect = false;
					game.check(); _status.clicked = false; ui.click.card.call(sha);
					autoOff = ui.selected.targets.includes(target);
					game.uncheck();
					const logSkill = choice.logSkill; delete choice.logSkill;
					game.check(); _status.clicked = false; ui.click.card.call(sha);
					ordinary = ui.selected.targets.length;
					game.uncheck(); choice.logSkill = logSkill;
					game.check(); _status.clicked = false; ui.click.card.call(sha);
					game.uncheck(); game.me.addSkill("wusheng");
					game.check(); _status.clicked = false; ui.click.skill("wusheng");
					_status.clicked = false; ui.click.card.call(game.me.getCards("h").find(card => card.name === "shan"));
					virtual = { name: get.card()?.name, targets: ui.selected.targets.map(player => player.name), locked: !target.classList.contains("selectable") };
				}
				const custom = buildXinshaPrompt(choice, "追刀的额外条件：只可使用红色杀", "qinglong_skill", "必须保留的说明");
				ui.click.cancel();
				// 转化技能的首次取消返回追刀选牌，第二次取消才结束本次追刀。
				if (tip()) ui.click.cancel();
				const cancelled = !tip();
				// 重新显示同一请求供截图检查。
				delete choice.result; choice.finished = false; _status.imchoosing = true;
				prompts.refreshOptimizedPrompt();
				decadeUI.showHandTip = originalTip;
				return { bodyStyle: document.body.dataset.style, nativePrompt: choice.prompt, early, opened, selected, multi, autoOff, ordinary, virtual, rendered, custom, cancelled };
			});
			if (baseline) {
				assert.match(result.early.text, /###/);
				console.log("QINGLONG_BASELINE", JSON.stringify({ early: result.early.text, opened: result.opened.text, detail: result.opened.detail }));
			} else if (style === "othersOff") {
				for (const step of [result.early, result.opened, result.selected]) {
					assert.equal(step.text, "使用【青龙偃月刀】，继续使用【杀】");
					assert.equal(step.detail, "");
					assert.equal(step.id, "26"); assert.equal(step.field, "DefensiveTip");
					assert.match(step.font, /dui-xinsha-prompt-label/);
				}
				assert.ok(result.rendered.every(text => !/###|当你使用的/.test(text)), JSON.stringify({ residue: result.rendered.filter(text => /###|当你使用的/.test(text)), virtual: result.virtual }));
				assert.ok(result.opened.height <= result.opened.lineHeight + 1, "追刀提示未保持单行");
				assert.equal(result.opened.spans.find(span => span.text === "【青龙偃月刀】").color, "rgb(255, 217, 121)");
				assert.equal(result.opened.spans.find(span => span.text === "【杀】").color, "rgb(255, 217, 121)");
				assert.equal(result.selected.cards, 1); assert.equal(result.selected.targetAllowed, true); assert.equal(result.selected.addCount, false);
				assert.deepEqual(result.selected.targets, ["machao"]); assert.equal(result.selected.locked, true);
				assert.equal(result.multi.extraSelectable, true); assert.deepEqual(result.multi.range, [1, 2]);
				assert.deepEqual(result.multi.targets, ["machao", "zhangfei"]);
				assert.deepEqual(result.multi.afterOriginalClick, ["machao", "zhangfei"]);
				assert.deepEqual(result.multi.afterExtraClick, []); assert.equal(result.multi.cardsAfterExtraClick, 0);
				assert.deepEqual(result.multi.afterReselectCard, ["machao"]);
				assert.equal(result.multi.originalLocked, true); assert.equal(result.autoOff, true); assert.equal(result.ordinary, 0);
				assert.deepEqual(result.virtual, { name: "sha", targets: ["machao"], locked: true });
				assert.equal(result.custom.main, "追刀的额外条件：只可使用红色杀"); assert.equal(result.custom.detail, "必须保留的说明");
				assert.equal(result.cancelled, true);
			} else {
				assert.match(result.opened.font, /dui-official-prompt/);
				assert.notEqual(result.opened.text, "使用【青龙偃月刀】，继续使用【杀】");
				assert.deepEqual(result.selected.targets, []);
			}
			assert.deepEqual(errors, []);
			if (!baseline) await page.screenshot({ path: path.join(__dirname, `xinsha-qinglong-prompt-${style}.png`) });
			results[style] = { ...result, errors };
			console.log("QINGLONG_PROMPT_OK", style);
			await page.close();
		}
		if (!baseline) fs.writeFileSync(path.join(__dirname, "xinsha-qinglong-prompt-results.json"), JSON.stringify(results, null, 2));
	} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
