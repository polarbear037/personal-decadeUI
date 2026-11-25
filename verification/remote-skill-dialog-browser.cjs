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
		for (const style of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard", "xianding"], cards: ["standard", "extra"], touchscreen: false, extension_十周年UI_newDecadeStyle: style });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			if (baseline) await page.route(/\/src\/overrides\/ui\/create\.js$/, route => route.fulfill({
				contentType: "text/javascript",
				body: fs.readFileSync(path.resolve(__dirname, "../src/overrides/ui/create.js"), "utf8").replace("let hidden = !!remoteSkillChoice,", "let hidden = !1,"),
			}));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async () => {
				const { game, lib, ui, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				game.pause(); game.resume = () => {};
				game.me = game.players[0]; game.me.init("sunquan");
				const actor = game.players[1]; actor.init("dc_zhongyu");
				_status.auto = false; _status.over = false;
				lib.config.auto_confirm = false;
				ui.arena.classList.remove("choose-character");
				document.querySelector(".decade-welcome-overlay")?.remove();
				const clear = () => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					for (const control of [...ui.controls]) control.close();
				};
				const attached = dialog => dialog.isConnected || ui.dialogs.includes(dialog);
				lib.skill.remote_dialog_buttons = { chooseButton: {
					dialog() { return ui.create.dialog("技能选项", [["杀", "闪"], "textbutton"]); },
					check() { return 1; },
					backup(links) { return { chosen: links[0] }; },
				} };
				const probe = async (name, skill, local, auto = false, simplify = true) => {
					clear(); _status.auto = auto;
					lib.config.extension_十周年UI_simplifySkillPrompt = simplify;
					const player = local ? game.me : actor;
					const event = player[name]();
					event.result = { bool: true, skill }; event.dcjiesi = [1, 2, 3, 4, 5];
					_status.eventManager.setStatusEvent(event, true);
					const method = lib.skill[skill].chooseButton.chooseControl ? "chooseControl" : "chooseButton";
					const original = player[method];
					let choice, resolveChoice;
					player[method] = function (...args) {
						choice = original.apply(this, args);
						choice.forResult = () => new Promise(resolve => { resolveChoice = resolve; });
						return choice;
					};
					let pending;
					try { pending = Content[name][2](event, null, player); }
					finally { player[method] = original; }
					if (!choice) throw new Error("Missing native skill choice");
					const dialog = choice.dialog;
					const out = { mine: event.isMine(), createdOpen: attached(dialog), text: dialog.textContent, buttons: dialog.buttons.length };
					// 留出实际绘制帧，确认默认打开造成的闪现，而非仅看最终关闭状态。
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					out.beforeChoiceOpen = attached(dialog);
					choice.parent = event;
					_status.eventManager.setStatusEvent(choice, true);
					await Content[method][0](choice, null, player);
					out.choiceOpen = attached(dialog);
					if (choice.isMine()) {
						_status.clicked = false;
						if (method === "chooseControl") {
							const control = [...ui.controls].flatMap(bar => [...bar.children]).find(node => node.link === 4);
							if (!control) throw new Error("Missing native control for 4");
							ui.click.control.call(control);
						}
						else { ui.click.button.call(dialog.buttons[0]); ui.click.ok(); }
					}
					await Content[method][1](choice, null, player);
					out.result = { control: choice.result.control, links: choice.result.links };
					resolveChoice(choice.result); await pending;
					_status.eventManager.setStatusEvent(event, true);
					await Content[name][3](event, null, player, choice.result);
					out.backup = { skill: event.skill, chosen: lib.skill[skill + "_backup"].chosen, len: lib.skill[skill + "_backup"].len };
					dialog.close(); out.closed = !ui.dialogs.includes(dialog);
					return out;
				};
				const out = {};
				for (const name of ["chooseToUse", "chooseToRespond"]) {
					out[name] = {};
					for (const skill of ["dcjiesi", "remote_dialog_buttons"]) {
						out[name][skill] = {
							remote: await probe(name, skill, false),
							local: await probe(name, skill, true),
							auto: await probe(name, skill, true, true),
							disabled: await probe(name, skill, false, false, false),
						};
					}
				}
				clear(); _status.auto = false;
				const publicEvent = game.createEvent("useSkill", false);
				Object.assign(publicEvent, { player: actor, result: { skill: "dcjiesi" } });
				_status.eventManager.setStatusEvent(publicEvent, true);
				const publicDialog = ui.create.dialog("公开展示");
				out.publicOpen = attached(publicDialog); publicDialog.close();
				const hidden = ui.create.dialog("主动隐藏", "hidden");
				out.explicitHidden = !attached(hidden);
				return out;
			});
			for (const name of ["chooseToUse", "chooseToRespond"]) {
				for (const [skill, cases] of Object.entries(result[name])) {
					for (const [kind, sample] of Object.entries(cases)) {
						const shouldOpen = kind === "local" || baseline;
						assert.equal(sample.createdOpen, shouldOpen, `${style}/${name}/${skill}/${kind} creation`);
						assert.equal(sample.beforeChoiceOpen, shouldOpen);
						assert.equal(sample.choiceOpen, shouldOpen);
						assert.equal(sample.closed, true);
						assert.equal(sample.backup.skill, skill + "_backup", JSON.stringify({ style, name, skill, kind, sample }));
						if (skill === "dcjiesi") { assert.equal(sample.result.control, 4); assert.equal(sample.backup.len, 4); }
						else { assert.equal(sample.buttons, 2); assert.deepEqual(sample.result.links, ["杀"]); assert.equal(sample.backup.chosen, "杀"); }
					}
				}
			}
			assert.equal(result.publicOpen, true);
			assert.equal(result.explicitHidden, true);
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log("REMOTE_SKILL_DIALOG_OK", style, baseline ? "baseline flash reproduced" : "fixed");
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, `remote-skill-dialog-${baseline ? "before" : "results"}.json`), JSON.stringify(results, null, 2));
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
