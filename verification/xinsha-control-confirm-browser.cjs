const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { dependencies } = require("./xinsha-prompt-engine.cjs");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const baseline = process.argv.includes("--baseline");

async function run() {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = {};
	try {
		for (const style of ["othersOff", "onlineUI", "on"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard", "xianding"], cards: ["standard", "extra"], touchscreen: false,
				extension_十周年UI_newDecadeStyle: style, extension_十周年UI_loadingStyle: "off" });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			if (baseline) await page.route(/\/ui\/styles\/lbtn\/xinsha-official\.css/, route => route.fulfill({ contentType: "text/css",
				body: fs.readFileSync(path.resolve(__dirname, "../ui/styles/lbtn/xinsha-official.css"), "utf8")
					.replace(/^body\[data-style="othersOff"\].*data-xinsha-action="multi".*> \.lbtn-confirm.*\r?\n/m, ""),
			}));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			await page.evaluate(async () => {
				const { game, lib, ui, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const actions = await import("/extension/十周年UI/src/ui/xinsha-action-buttons.js");
				Object.assign(window, { game, lib, ui, _status, Content, actions });
				game.pause(); game.resume = () => {}; game.resume2 = () => {};
				game.me = game.players[0]; game.me.init("sunquan"); game.me.addSkill("dcliexiang");
				_status.auto = false; _status.over = false; _status.currentPhase = game.me;
				lib.config.auto_confirm = false; ui.arena.classList.remove("choose-character");
				document.querySelector(".decade-welcome-overlay")?.remove();
				for (const d of [...ui.dialogs]) d.close();
				for (const c of [...ui.controls]) c.close();
				window.begin = async (separate, labels) => {
					const parent = game.me.chooseToUse({ type: "phase" });
					_status.eventManager.setStatusEvent(parent, true);
					game.check(); ui.create.confirm("oc"); window.retainedConfirm = ui.confirm;
					// 不清空上一层确认栏：覆盖真实技能二级选择的节点复用。
					const info = lib.skill.dcliexiang.chooseButton;
					const event = game.me.chooseControl(labels || info.chooseControl(parent, game.me));
					event.parent = parent; event.dialog = info.dialog(parent, game.me); event.seperate = separate;
					_status.eventManager.setStatusEvent(event, true);
					await Content.chooseControl[0](event, null, game.me);
					actions.syncXinshaActionButtons();
				};
				window.read = () => ({ flow: ui.control.dataset.xinshaAction, confirmDisplay: getComputedStyle(ui.confirm).display,
					sameConfirm: ui.confirm === retainedConfirm && ui.confirm.isConnected,
					unit: parseFloat(getComputedStyle(ui.window).getPropertyValue("--yjcm-unit")),
					nodes: [...ui.control.children].filter(c => c !== ui.confirm && !c.stayleft).flatMap(c => [...c.children])
						.map(n => ({ link: n.link, rect: n.getBoundingClientRect().toJSON() })) });
				window.finish = async () => {
					const event = _status.event;
					await Content.chooseControl[1](event, null, game.me);
					_status.eventManager.setStatusEvent(event.parent, true);
					game.check(); ui.create.confirm("o"); actions.syncXinshaActionButtons();
					return { result: event.result.control, display: getComputedStyle(ui.confirm).display, same: ui.confirm === retainedConfirm };
				};
			});
			await page.evaluate(() => document.fonts.ready);
			const scenes = [];
			for (const separate of [false, true]) {
				await page.evaluate(separate => begin(separate), separate);
				await page.waitForTimeout(600);
				const state = await page.evaluate(() => read());
				assert(state.sameConfirm, "原确认栏应保留供后续选择复用");
				assert.equal(state.nodes.length, 6);
				if (style === "othersOff") {
					if (baseline) {
						assert.notEqual(state.confirmDisplay, "none");
						console.log("BASELINE_REPRODUCED", { separate, confirmDisplay: state.confirmDisplay });
					} else {
						assert.equal(state.confirmDisplay, "none");
						for (let i = 1; i < state.nodes.length; i++) {
							assert(Math.abs(state.nodes[i].rect.bottom - state.nodes[0].rect.bottom) < 1, "六项在同一行");
							assert(Math.abs(state.nodes[i].rect.left - state.nodes[i - 1].rect.right - 25 * state.unit) < 1, "选项间距一致");
						}
					}
				} else {
					assert.equal(state.flow, undefined); assert.notEqual(state.confirmDisplay, "none", "其他风格保持原显隐");
				}
				const link = separate ? "cancel2" : "三张";
				await page.evaluate(link => {
					_status.clicked = false;
					const node = [...ui.control.children].filter(c => c !== ui.confirm).flatMap(c => [...c.children]).find(n => n.link === link);
					ui.click.control.call(node);
				}, link);
				const restored = await page.evaluate(() => finish());
				assert.equal(restored.result, link); assert(restored.same); assert.notEqual(restored.display, "none", "下一层确认恢复");
				scenes.push({ separate, state, restored });
			}
			assert.deepEqual(errors, []);
			results[style] = { scenes, errors };
			console.log("CONTROL_CONFIRM_OK", style);
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, baseline ? "xinsha-control-confirm-before.json" : "xinsha-control-confirm-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
