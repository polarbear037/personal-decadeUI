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
		for (const style of ["othersOff", "onlineUI"]) {
			Object.assign(seed, { mode: "identity", characters: ["standard", "sp"], cards: ["standard"], touchscreen: false, extension_十周年UI_newDecadeStyle: style, extension_十周年UI_optimizePrompt: style === "othersOff" ? "xinsha" : "online" });
			const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			if (baseline) await page.route(/\/src\/ui\/xinshaPrompt\.js/, route => route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.resolve(__dirname, "../.codex-tmp/prompt-audit/xinshaPrompt.before.js"), "utf8") }));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async () => {
				const { game, lib, ui, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { buildXinshaPrompt } = await import("/extension/十周年UI/src/ui/xinshaPrompt.js");
				const { xinshaPromptEntries } = await import("/extension/十周年UI/src/ui/xinshaPromptData.js");
				game.pause(); game.resume = () => {};
				game.me = game.players[0]; game.me.init("sp_sunshangxiang");
				const actor = game.players[1]; actor.init("guanyu");
				_status.auto = false; _status.over = false; lib.config.unauto_choose = true;
				ui.arena.classList.remove("choose-character");
				document.querySelector(".decade-welcome-overlay")?.remove();
				const clear = () => {
					game.uncheck();
					for (const dialog of [...ui.dialogs]) dialog.close();
					for (const control of [...ui.controls]) control.close();
					prompts.clearOptimizedPrompts();
				};
				clear();
				const phase = game.createEvent("phaseUse", false); phase.player = actor;
				const read = () => {
					const tip = [...ui.arena.querySelectorAll(".decade-optimized-hand-tip")].find(node => !node.closed && !node.classList.contains("hidden"));
					return { main: tip?.querySelector(".decade-official-main")?.textContent || "", detail: tip?.querySelector(".decade-official-detail")?.textContent || "", id: tip?.dataset.officialSkillId, field: tip?.dataset.officialPromptField };
				};
				const open = async event => {
					_status.eventManager.setStatusEvent(event, true);
					await Content[event.name][0](event, null, game.me);
					prompts.refreshOptimizedPrompt();
					return { ...read(), native: event.prompt, nativeDetail: event.prompt2 || "" };
				};
				// 实际良助内容创建选择事件，停在选择之前，不执行摸牌结算。
				const parent = game.createEvent("liangzhu", false); Object.assign(parent, { player: game.me, parent: phase });
				_status.eventManager.setStatusEvent(parent, true);
				let choice;
				const originalTarget = game.me.chooseTarget;
				game.me.chooseTarget = function (...args) { choice = originalTarget.apply(this, args); choice.forResult = () => new Promise(() => {}); return choice; };
				try { lib.skill.liangzhu.content(parent, { player: actor }, game.me); }
				finally { game.me.chooseTarget = originalTarget; }
				if (!choice) throw new Error("liangzhu did not create chooseTarget");
				choice.parent = parent;
				const liangzhu = await open(choice);
				clear();
				// 使用犟0真实出战技能解析、缮甲规则和本体chooseUseTarget，不手写有花色的提示。
				const resources = await (await fetch("/extension/犟0/assets/jiangling-ui.json")).json();
				const config = resources.config;
				const item = Object.values(config.SpriteItemConf).find(item => Object.values(item.GameSkillID || {}).some(id => Object.values(config.SpriteSkillConf).some(row => row.SkillID === id && row.GameSkillID === 1762)) && item.SpriteGrade === "GSGTCommon");
				if (!item) throw new Error("Missing Cao Chun loadout");
				const profile = { revision: 0, records: [{ id: "audit", itemId: item.SpriteItemID, level: 1, unlockedGameSkillIds: [1762] }] };
				const { createJianglingSkillContext } = await import("/extension/犟0/render/skill-state.js");
				const { createAdvancedJianglingRules } = await import("/extension/犟0/render/skills-advanced.js");
				lib.config.extension_犟0_jianglingSkillsPveOnly = false;
				const context = createJianglingSkillContext({ lib, game, get, ui, status: _status, config, gear: { goods: {}, skills: {} }, profile: () => profile, recordId: () => "audit", random: () => 0 });
				game.jiang0Skills = { context };
				lib.skill.jiang0_rule_1762 = { ...createAdvancedJianglingRules(context)[1762], jiang0JianglingRule: true };
				const row = context.row(game.me, 1762);
				if (!row) throw new Error("Missing active ShanJiaJL row");
				const jl = game.createEvent("jiang0_rule_1762", false); Object.assign(jl, { player: game.me, parent: phase, triggername: "phaseUseBegin" });
				_status.eventManager.setStatusEvent(jl, true);
				let use;
				const originalUse = game.me.chooseUseTarget, originalDraw = game.me.draw;
				game.me.draw = () => Promise.resolve();
				game.me.chooseUseTarget = function (...args) { use = originalUse.apply(this, args); use.then = () => new Promise(() => {}); return use; };
				try { lib.skill.jiang0_rule_1762.content(jl, { player: game.me }, game.me); await new Promise(resolve => setTimeout(resolve, 0)); }
				finally { game.me.draw = originalDraw; game.me.chooseUseTarget = originalUse; }
				if (!use) throw new Error("Cao Chun did not create chooseUseTarget");
				use.parent = jl;
				const startUse = async (event, custom) => {
					clear(); choice = null;
					if (custom) event.prompt = custom;
					_status.eventManager.setStatusEvent(event, true);
					game.me.chooseTarget = function (...args) { choice = originalTarget.apply(this, args); choice.forResult = () => new Promise(() => {}); return choice; };
					try { Content.chooseUseTarget[0](event, null, game.me); }
					finally { game.me.chooseTarget = originalTarget; }
					if (!choice) throw new Error("chooseUseTarget did not create chooseTarget");
					choice.parent = event;
					return open(choice);
				};
				const caochun = await startUse(use);
				const customUse = game.me.chooseUseTarget({ name: "sha", isCard: true }, false); customUse.parent = jl;
				const custom = await startUse(customUse, "缮甲：只能选择距离为1的角色");
				const plainUse = game.me.chooseUseTarget({ name: "sha", isCard: true }, false); plainUse.parent = phase;
				const ordinaryVirtual = await startUse(plainUse);
				clear();
				const stageCases = {};
				for (const [key, recordId, stage, cards, targets] of [
					["targetAfterCost", 33, "chooseTarget", null, [1, 1]],
					["cardBeforeTarget", 65, "chooseCard", [1, 1], null],
					["modifiedTargetCount", 93, "chooseTarget", null, [2, 2]],
					["discardInsteadOfUse", 33, "chooseToDiscard", [2, 2], null],
					["noCardCost", 250, "chooseCardTarget", [0, 0], [1, 1]],
					["noTargetCost", 250, "chooseCardTarget", [1, 1], [0, 0]],
					["zeroCostTemplate", 65, "chooseCardTarget", [0, 0], [1, 1]],
					["unlimitedTargets", 250, "chooseTarget", null, () => [1, Infinity]],
				]) {
					const entry = xinshaPromptEntries.find(entry => entry.id === recordId), id = `stage_${recordId}`;
					lib.skill[id] = {}; lib.translate[id] = entry.name; lib.translate[id + "_info"] = entry.description;
					const event = { name: stage, player: game.me, selectCard: cards, selectTarget: targets };
					_status.eventManager.setStatusEvent(event, true);
					stageCases[key] = buildXinshaPrompt(event, `是否发动【${entry.name}】？`, id, entry.description);
					delete lib.skill[id]; delete lib.translate[id]; delete lib.translate[id + "_info"];
				}
				const multiple = game.me.chooseTarget({ prompt: "请选择一名角色", prompt2: "视为使用一张【杀】", _get_card: new lib.element.VCard({ name: "sha" }), selectTarget: [1, 2] });
				multiple.parent = phase;
				stageCases.multipleVirtual = await open(multiple);
				clear();
				// 全表检查兜底丢名、占位符/分支串泄漏、自定义条件覆盖；每种选择事件都覆盖。
				const failures = [], stages = ["chooseBool", "chooseControl", "chooseButton", "chooseCard", "chooseTarget", "chooseCardTarget", "chooseToDiscard", "chooseToUse"];
				let failureCount = 0;
				const fail = value => { failureCount++; if (failures.length < 50) failures.push(value); };
				let checked = 0, official = 0, fallback = 0;
				for (const entry of xinshaPromptEntries.filter(entry => entry.type === 2)) {
					const id = `audit_skill_${entry.id}`;
					lib.translate[id] = entry.name; lib.translate[id + "_info"] = entry.description;
					lib.skill[id] = {};
					for (const stage of stages) {
						const event = { name: stage, player: game.me, selectCard: [1, 1], selectTarget: [1, 1], skill: stage === "chooseToUse" ? id : undefined };
						_status.eventManager.setStatusEvent(event, true);
						const result = buildXinshaPrompt(event, `是否发动【${entry.name}】？`, id, entry.description);
						checked++;
						if (result.official) official++; else fallback++;
						if (!result.official && !result.main.includes(entry.name)) fail([entry.id, stage, "lost_skill", result.main]);
						if (/\{[\w]+\}|###|[|;]/.test(result.main)) fail([entry.id, stage, "template_residue", result.main]);
						const empty = buildXinshaPrompt(event, "", id, entry.description);
						if (!empty.official && !empty.main.includes(entry.name)) fail([entry.id, stage, "empty_lost_skill", empty.main]);
						if (["chooseControl", "chooseButton"].includes(stage) && !empty.official && empty.main !== `“${entry.name}”：请选择一项`) fail([entry.id, stage, "wrong_control_action", empty.main]);
						const text = `${entry.name}：只能选择本轮尚未选过的角色，且必须保留一张黑桃牌`;
						lib.skill[id].prompt = text;
						const custom = buildXinshaPrompt(event, text, id, "必须保留的独立条件");
						if (custom.main !== text || custom.detail !== "必须保留的独立条件") fail([entry.id, stage, "custom_overwritten", custom]);
						delete lib.skill[id].prompt;
					}
					delete lib.skill[id]; delete lib.translate[id]; delete lib.translate[id + "_info"];
				}
				return { liangzhu, caochun, custom, ordinaryVirtual, stageCases, loadout: { name: row.SkillName, id: row.GameSkillID, itemId: item.SpriteItemID }, audit: { entries: xinshaPromptEntries.length, checked, official, fallback, failureCount, failures } };
			});
			if (!baseline && style === "othersOff") {
				assert.match(result.liangzhu.main, /良助/);
				assert.equal(result.caochun.main, "请选择一个目标视为对其使用一张杀");
				assert.equal(result.caochun.id, "1762");
				assert.equal(result.ordinaryVirtual.main, "选择1名目标角色");
				assert.equal(result.custom.main, "缮甲：只能选择距离为1的角色");
				assert.equal(result.stageCases.targetAfterCost.main, "“武圣”：请选择1名角色");
				assert.equal(result.stageCases.cardBeforeTarget.main, "“青囊”：请选择1张牌");
				assert.equal(result.stageCases.modifiedTargetCount.main, "“节命”：请选择2名角色");
				assert.equal(result.stageCases.discardInsteadOfUse.main, "“武圣”：请弃置2张牌");
				assert.equal(result.stageCases.noCardCost.main, "“良助”：请选择1名角色");
				assert.equal(result.stageCases.noTargetCost.main, "“良助”：请选择1张牌");
				assert.equal(result.stageCases.zeroCostTemplate.main, "“青囊”：请选择1名角色");
				assert.equal(result.stageCases.unlimitedTargets.main, "“良助”：请选择至少1名角色");
				assert.equal(result.stageCases.multipleVirtual.main, "请选择1至2名角色，视为使用【杀】");
				assert.equal(result.stageCases.multipleVirtual.detail, "");
				assert.deepEqual(result.audit.failures, []);
				assert.equal(result.audit.failureCount, 0);
			} else if (!baseline) {
				assert.match(result.liangzhu.main, /良助/);
				assert.equal(result.caochun.main, result.caochun.native);
			}
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log("XINSHA_PROMPT_AUDIT", baseline ? "before" : style, JSON.stringify({ liangzhu: result.liangzhu.main, caochun: result.caochun.main, audit: { ...result.audit, failures: result.audit.failures.length }, errors }));
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, `xinsha-prompt-audit-${baseline ? "before" : "results"}.json`), JSON.stringify(results, null, 2));
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
