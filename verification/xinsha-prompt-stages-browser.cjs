const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const { dependencies } = require("./xinsha-prompt-engine.cjs");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const baseline = process.argv.includes("--baseline");

async function run() {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const results = {};
	try {
		for (const style of ["othersOff", "onlineUI"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard", "xianding"], cards: ["standard", "extra"], touchscreen: false,
				extension_十周年UI_newDecadeStyle: style, extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : "online" });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			if (baseline) await page.route(/\/src\/ui\/xinshaPrompt\.js$/, route => route.fulfill({ contentType: "text/javascript",
				body: cp.execFileSync("git", ["show", "HEAD:src/ui/xinshaPrompt.js"], { cwd: path.resolve(__dirname, ".."), encoding: "utf8" }),
			}));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async ({ style, baseline }) => {
				const { game, lib, ui, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { buildXinshaPrompt } = await import("/extension/十周年UI/src/ui/xinshaPrompt.js");
				const { xinshaPromptEntries } = await import("/extension/十周年UI/src/ui/xinshaPromptData.js");
				game.pause(); game.resume = () => {}; game.resume2 = () => {};
				game.me = game.players[0]; game.me.init("sunquan");
				const actor = game.players[1]; actor.init("guanyu");
				game.me.directgain(Array.from({ length: 8 }, () => game.createCard("sha", "spade", 7)));
				_status.currentPhase = game.me; _status.auto = false; _status.over = false;
				lib.config.auto_confirm = false; lib.config.unauto_choose = true;
				ui.arena.classList.remove("choose-character"); document.querySelector(".decade-welcome-overlay")?.remove();
				const clear = () => { game.uncheck(); for (const d of [...ui.dialogs]) d.close(); for (const c of [...ui.controls]) c.close(); prompts.clearOptimizedPrompts(); };
				const read = () => {
					const n = [...document.querySelectorAll(".decade-optimized-hand-tip")].find(n => !n.closed && !n.classList.contains("hidden"));
					return { main: n?.querySelector(".decade-official-main")?.textContent, detail: n?.querySelector(".decade-official-detail")?.textContent || "", id: n?.dataset.officialSkillId, field: n?.dataset.officialPromptField };
				};
				const open = async choice => {
					_status.eventManager.setStatusEvent(choice, true);
					await Content[choice.name][0](choice, null, game.me); prompts.refreshOptimizedPrompt();
					await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					return { ...read(), native: choice.prompt, nativeDetail: choice.prompt2 };
				};
				const chooseLiexiang = async (mark, gift = false) => {
					clear(); game.me.storage.dcliexiang_extra = mark;
					const event = game.createEvent("dcliexiang_backup", false); event.player = game.me;
					_status.eventManager.setStatusEvent(event, true); lib.skill.dcliexiang_backup.index = 4;
					let choice;
					const draw = game.me.draw, target = game.me.chooseTarget, cardTarget = game.me.chooseCardTarget, damage = actor.damage;
					game.me.draw = async () => {};
					actor.damage = async () => {};
					game.me.chooseTarget = function (...args) {
						const next = target.apply(this, args); next.parent = event;
						if (gift) next.forResult = async () => ({ bool: true, targets: [actor] });
						else { choice = next; next.forResult = () => new Promise(() => {}); }
						return next;
					};
					game.me.chooseCardTarget = function (...args) {
						choice = cardTarget.apply(this, args); choice.parent = event; choice.forResult = () => new Promise(() => {}); return choice;
					};
					try {
						void lib.skill.dcliexiang_backup.content(event, null, game.me);
						await new Promise(resolve => setTimeout(resolve, 0));
					} finally { game.me.draw = draw; game.me.chooseTarget = target; game.me.chooseCardTarget = cardTarget; actor.damage = damage; }
					if (!choice) throw Error("Missing native Liexiang " + (gift ? "gift" : "target"));
					return { choice, prompt: await open(choice) };
				};
				const out = {};
				out.one = (await chooseLiexiang(0)).prompt;
				out.multiple = (await chooseLiexiang(2)).prompt;
				const gift = await chooseLiexiang(0, true); out.gift = gift.prompt;
				out.mixedDetail = buildXinshaPrompt(gift.choice, gift.choice.prompt, "dcliexiang", `${lib.translate.dcliexiang_info}\n必须保留的独立条件`);
				clear();
				const customChoice = game.me.chooseCardTarget({ prompt: gift.choice.prompt, prompt2: "只能交给本轮未获得过牌的角色，必须保留一张黑桃牌",
					filterCard: true, selectCard: [1, 5], filterTarget: lib.filter.notMe, selectTarget: 1 });
				customChoice.parent = gift.choice.parent; out.customDetail = await open(customChoice);
				clear();
				const parent = game.createEvent("dcliexiang", false); parent.player = game.me;
				const choice = game.me.chooseControl(lib.skill.dcliexiang.chooseButton.chooseControl(parent, game.me));
				choice.parent = parent; choice.dialog = lib.skill.dcliexiang.chooseButton.dialog(parent, game.me);
				out.control = await open(choice);
				if (style === "othersOff") {
					clear();
					const stages = [
						["chooseCard", [1, 1], null], ["chooseCard", [2, 2], null], ["chooseCard", [1, 5], null],
						["chooseTarget", null, [1, 1]], ["chooseTarget", null, [1, 2]], ["chooseTarget", null, [2, 2]],
						["chooseCardTarget", [1, 1], [1, 1]], ["chooseToDiscard", [1, 1], null], ["chooseControl", null, null],
					];
					const audit = { checked: 0, official: 0, fallback: 0, failures: [], resolvedSkills: [], unresolvedSkills: [] };
					for (const entry of xinshaPromptEntries.filter(r => r.type === 2 && /[|;]/.test(r.prompts.ActiveTip || ""))) {
						const id = "stage_audit_" + entry.id;
						lib.translate[id] = entry.name; lib.translate[id + "_info"] = entry.description; lib.skill[id] = {};
						const rows = [];
						for (const [name, cards, targets] of stages) {
							const event = { name, player: game.me, selectCard: cards, selectTarget: targets, skill: name === "chooseToUse" ? id : undefined };
							_status.eventManager.setStatusEvent(event, true);
							const result = buildXinshaPrompt(event, "", id, entry.description);
							audit.checked++; audit[result.official ? "official" : "fallback"]++;
							if (result.official) rows.push({ name, cards, targets, text: result.main });
							if (/\{\w+\}|###|[|;]/.test(result.main) || result.detail) audit.failures.push({ id: entry.id, name, result });
							const custom = `${entry.name}：只能选择本轮尚未选过的角色，且必须保留一张黑桃牌`;
							const preserved = buildXinshaPrompt(event, custom, id, "必须保留的独立条件");
							if (preserved.main !== custom || preserved.detail !== "必须保留的独立条件") audit.failures.push({ id: entry.id, name, preserved });
							if (!baseline && entry.description.length > 80) {
								const holder = document.createElement("div"); holder.innerHTML = entry.description;
								const fragment = holder.textContent.slice(10, -10);
								const partial = buildXinshaPrompt(event, "", id, fragment);
								if (partial.detail) audit.failures.push({ id: entry.id, name, partial });
							}
						}
						if (!baseline) {
							const child = id + "_stage"; lib.skill[child] = { sourceSkill: id };
							const inherited = buildXinshaPrompt({ name: "chooseTarget", player: game.me, selectTarget: [1, 1] }, "", child, entry.description);
							if (inherited.detail) audit.failures.push({ id: entry.id, inherited });
							delete lib.skill[child];
						}
						(rows.length ? audit.resolvedSkills : audit.unresolvedSkills).push({ id: entry.id, name: entry.name, rows });
						delete lib.skill[id]; delete lib.translate[id]; delete lib.translate[id + "_info"];
					}
					out.audit = audit;
					// 同阶段不同含义：明任的“放任/换任”不得按第一项代选。
					const record = xinshaPromptEntries.find(r => r.id === 155);
					lib.translate.stage_ambiguous = record.name; lib.translate.stage_ambiguous_info = record.description; lib.skill.stage_ambiguous = {};
					const e = { name: "chooseCard", player: game.me, selectCard: [1, 1] };
					_status.eventManager.setStatusEvent(e, true); out.ambiguous = buildXinshaPrompt(e, "", "stage_ambiguous", "");
					const dimeng = xinshaPromptEntries.find(r => r.id === 121);
					lib.translate.stage_dimeng = dimeng.name; lib.translate.stage_dimeng_info = dimeng.description; lib.skill.stage_dimeng = {};
					const mismatch = { name: "chooseCardTarget", player: game.me, selectCard: [1, 1], selectTarget: [1, 1] };
					_status.eventManager.setStatusEvent(mismatch, true); out.mismatched = buildXinshaPrompt(mismatch, "", "stage_dimeng", "");
				}
				await chooseLiexiang(0);
				return out;
			}, { style, baseline });
			if (!baseline && style === "othersOff") {
				assert.equal(result.one.main, "请选择一名其他角色"); assert.equal(result.one.detail, ""); assert.equal(result.one.id, "3798");
				assert.equal(result.multiple.main, "请选择至多三名其他角色"); assert.equal(result.multiple.detail, "");
				assert.equal(result.gift.main, "请选择一名角色交给其至多5张牌"); assert.equal(result.gift.detail, "");
				assert.equal(result.control.main, "请选择摸牌数");
				assert.equal(result.customDetail.detail, "只能交给本轮未获得过牌的角色，必须保留一张黑桃牌");
				assert.equal(result.mixedDetail.detail, "必须保留的独立条件");
				assert.equal(result.audit.failures.length, 0, JSON.stringify(result.audit.failures.slice(0, 3))); assert.equal(result.ambiguous.official, null);
				assert.equal(result.mismatched.official, null, "手牌是角色条件，不能把两人交换误判成选牌加一人");
			} else if (baseline && style === "othersOff") assert(result.one.detail.length > 100);
			else assert.equal(result.one.main, result.one.native, "Online 原路径保留");
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log("PROMPT_STAGES", baseline ? "before" : style, JSON.stringify({ target: result.one.main, detail: result.one.detail.length,
				checked: result.audit?.checked, official: result.audit?.official, resolved: result.audit?.resolvedSkills.length, unresolved: result.audit?.unresolvedSkills.length, errors }));
			if (!baseline && style === "othersOff") await page.screenshot({ path: path.join(__dirname, "xinsha-prompt-stages-liexiang.png") });
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, baseline ? "xinsha-prompt-stages-before.json" : "xinsha-prompt-stages-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
