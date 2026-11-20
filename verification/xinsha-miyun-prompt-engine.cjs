const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { dependencies } = require("./xinsha-prompt-engine.cjs");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");

async function run() {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	const results = {};
	try {
		for (const style of ["othersOff", "onlineUI"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_newDecadeStyle: style, extension_十周年UI_loadingStyle: style === "othersOff" ? "dialog_xinsha" : "dialog_ol", extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : "online" });
			const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async () => {
				const { game, lib, ui, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const { updateDialogOlLayout } = await import("/extension/十周年UI/src/ui/dialog-ol-layout.js");
				game.pause(); game.resume = () => {};
				for (const dialog of [...ui.dialogs]) dialog.close();
				for (const control of [...ui.controls]) control.close();
				document.querySelector(".decade-welcome-overlay")?.remove();
				ui.arena.classList.remove("choose-character");
				game.me = game.players[0]; game.me.init("sunquan");
				const target = game.players[1]; target.init("guanyu");
				target.name = "re_caorui"; lib.translate.re_caorui = "界曹叡";
				lib.skill.dcmiyun = { forced: true }; lib.translate.dcmiyun = "密运";
				target.directgain([game.createCard("sha", "spade", 7), game.createCard("shan", "heart", 2), game.createCard("sha", "club", 9), game.createCard("tao", "heart", 6)]);
				_status.auto = false; _status.over = false; lib.config.unauto_choose = true;
				const parent = game.createEvent("dcmiyun", false); parent.player = game.me;
				parent.triggername = "roundStart";
				const choosing = game.me.chooseTarget("密运：获得一名其他角色的一张牌，称为“安”", true, (card, player, current) => current !== player);
				choosing.parent = parent;
				_status.eventManager.setStatusEvent(choosing, true);
				await Content.chooseTarget[0](choosing, null, game.me);
				const choiceTip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
				const chooseTarget = { text: choiceTip?.textContent, colors: [...(choiceTip?.querySelectorAll("span[style]") || [])].map(node => [node.textContent, getComputedStyle(node).color]) };
				const open = async (prompt, count = 1) => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					const event = game.me.gainPlayerCard(target, true, "visibleMove", count);
					event.parent = parent;
					if (prompt) event.prompt = prompt;
					_status.eventManager.setStatusEvent(event, true);
					await Content.gainPlayerCard[0](event, null, game.me);
					await document.fonts.ready;
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					return { event };
				};
				const read = event => {
					const footer = event.dialog.querySelector(".dialog-ol-footer");
					const copy = [...document.querySelectorAll(".dialog-xinsha-prompt-overlay")].find(node => node.textContent === footer?.textContent);
					const player = (copy || footer)?.querySelector('[data-type="player"]');
					return { event: event.name, native: event.prompt, title: event.dialog.content.firstElementChild?.textContent, footer: footer?.textContent, overlay: copy?.textContent, color: player && getComputedStyle(player).color, count: event.dialog.buttons.length, scope: document.body.dataset.style, loading: ui.arena.dataset.loadingStyle, classes: event.dialog.className };
				};
				let { event } = await open();
				const initial = read(event);
				const sample = async () => {
					const frames = [];
					for (let i = 0; i < 35; i++) {
						await new Promise(resolve => requestAnimationFrame(resolve));
						game.check();
						const overlay = [...document.querySelectorAll(".dialog-xinsha-prompt-overlay")].find(node => node.textContent === "请选择界曹叡的1张牌");
						const rect = overlay?.getBoundingClientRect();
						if (rect) frames.push({ y: rect.y, height: rect.height, dialogY: event.dialog.getBoundingClientRect().y });
					}
					return frames;
				};
				const frames = await sample();
				let collapsed, shown, shunchai;
				if (document.body.dataset.style === "othersOff") {
					document.querySelector('.dialog-xinsha-hide:not([hidden])')?.click();
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					const tip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
					collapsed = { text: tip?.textContent, color: tip?.querySelector("span[style]") && getComputedStyle(tip.querySelector("span[style]")).color };
					document.querySelector('.dialog-xinsha-restore:not([hidden])')?.click();
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					shown = read(event);
					const { installShunchaiBeautify } = await import("/extension/雷的一将/utils/shunchaiBeautify.js");
					installShunchaiBeautify();
					({ event } = await open());
					shunchai = { value: read(event), frames: await sample() };
					document.querySelector('.dialog-xinsha-hide:not([hidden])')?.click();
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					const hiddenTip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
					shunchai.collapsed = { text: hiddenTip?.textContent, color: hiddenTip?.querySelector("span[style]") && getComputedStyle(hiddenTip.querySelector("span[style]")).color };
					document.querySelector('.dialog-xinsha-restore:not([hidden])')?.click();
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					shunchai.shown = read(event);
				}
				lib.config.extension_十周年UI_optimizePrompt = "off";
				updateDialogOlLayout(event.dialog, ui.arena);
				const disabled = read(event);
				lib.config.extension_十周年UI_optimizePrompt = "xinsha";
				updateDialogOlLayout(event.dialog, ui.arena);
				const restored = read(event);
				({ event } = await open("密运：只能选择这轮尚未选过的牌"));
				const custom = read(event);
				({ event } = await open(null, 2));
				const two = read(event);
				({ event } = await open());
				return { chooseTarget, initial, frames, collapsed, shown, shunchai, disabled, restored, custom, two };
			});
			assert.equal(result.initial.native, "获得界曹叡一张牌");
			assert.equal(result.initial.title, "密运");
			assert.equal(result.initial.count, 4);
			if (style === "othersOff") {
				assert.equal(result.chooseTarget.text, "请选择一名其他角色获得其一张牌");
				assert.deepEqual(result.chooseTarget.colors, []);
				assert.equal(result.initial.footer, "请选择界曹叡的1张牌");
				assert.equal(result.initial.overlay, result.initial.footer);
				assert.equal(result.initial.color, "rgb(255, 225, 0)");
				assert.equal(result.collapsed.text, result.initial.footer);
				assert.equal(result.collapsed.color, result.initial.color);
				assert.equal(result.shown.footer, result.initial.footer);
				assert.equal(result.shown.color, result.initial.color);
				assert.equal(result.shunchai.collapsed.text, result.initial.footer);
				assert.equal(result.shunchai.collapsed.color, result.initial.color);
				assert.equal(result.shunchai.shown.overlay, result.initial.footer);
				for (const frames of [result.frames, result.shunchai.frames]) {
					const positions = frames.slice(12).map(frame => frame.y);
					assert.ok(positions.length > 12);
					assert.ok(Math.max(...positions) - Math.min(...positions) < .02, "提示逐帧抖动：" + JSON.stringify(frames));
				}
				assert.equal(result.disabled.footer, result.initial.native);
				assert.equal(result.restored.footer, result.initial.footer);
				assert.equal(result.two.footer, "请选择界曹叡的2张牌");
			} else {
				assert.equal(result.initial.footer, result.initial.native);
				assert.equal(result.restored.footer, result.initial.native);
			}
			assert.equal(result.custom.footer, "只能选择这轮尚未选过的牌");
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			await page.screenshot({ path: path.join(__dirname, `xinsha-miyun-prompt-${style}.png`) });
			console.log("MIYUN_PROMPT_OK", style, JSON.stringify(result.initial));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, "xinsha-miyun-prompt-results.json"), JSON.stringify(results, null, 2));
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
