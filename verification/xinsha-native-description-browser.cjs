const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { dependencies } = require("./xinsha-prompt-engine.cjs");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const root = path.resolve(__dirname, "../../..");
const packs = fs.readdirSync(path.join(root, "character"), { withFileTypes: true }).filter(row => row.isDirectory() &&
	fs.existsSync(path.join(root, "character", row.name, "skill.js")) && fs.existsSync(path.join(root, "character", row.name, "translate.js"))).map(row => row.name);
const baseline = process.argv.includes("--baseline");
const previousSource = () => fs.readFileSync(path.resolve(__dirname, "../src/ui/xinshaPrompt.js"), "utf8")
	.replace('return normalizeDescription(value).replace(/你(?:可以|可(?=判定|进行|令|选择|将|观看|获得|重置))/g, "你");', "return normalizeDescription(value);");

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
			page.on("pageerror", error => errors.push(error.message)); page.on("dialog", dialog => dialog.accept());
			await dependencies(page);
			for (const file of ["core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js", "stackframe@1.3.4/node_modules/stackframe/stackframe.js", "error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js", "stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js"]) {
				if (/as __require/.test(fs.readFileSync(path.join(root, "node_modules/.pnpm", file), "utf8"))) await page.unroute("**/node_modules/.pnpm/" + file);
			}
			await page.route(/\/src\/ui\/xinshaPrompt\.js\?native-description-baseline$/, route => route.fulfill({ contentType: "text/javascript", body: previousSource() }));
			if (baseline) await page.route(/\/src\/ui\/xinshaPrompt\.js$/, route => route.fulfill({ contentType: "text/javascript", body: previousSource() }));
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
			const result = await page.evaluate(async ({ packs, style }) => {
				const { game, lib, ui, get, _status } = await import("/noname.js");
				const { Content } = await import("/noname/library/element/content.js");
				const prompts = await import("/extension/十周年UI/src/ui/optimizedPrompt.js");
				const { buildXinshaPrompt } = await import("/extension/十周年UI/src/ui/xinshaPrompt.js");
				const before = await import("/extension/十周年UI/src/ui/xinshaPrompt.js?native-description-baseline");
				game.pause(); game.pause = () => new Promise(() => {}); game.resume = () => {}; game.resume2 = () => {};
				game.me = game.players[0]; game.me.init("xuelingyun"); game.players[1].init("guanyu");
				if (!game.me.hasSkill("dcanzhi")) throw Error("Missing native Xue Lingyun skill");
				_status.auto = false; _status.over = false; _status.currentPhase = game.players[1];
				ui.arena.classList.remove("choose-character"); document.querySelector(".decade-welcome-overlay")?.remove();
				const clear = () => { game.uncheck(); for (const d of [...ui.dialogs]) d.close(); for (const c of [...ui.controls]) c.close(); prompts.clearOptimizedPrompts(); };
				const read = () => {
					const tip = [...document.querySelectorAll(".decade-optimized-hand-tip")].find(n => !n.closed && !n.classList.contains("hidden"));
					return { main: tip?.querySelector(".decade-official-main")?.textContent, detail: tip?.querySelector(".decade-official-detail")?.textContent || "",
						id: tip?.dataset.officialSkillId, rect: tip?.getBoundingClientRect().toJSON() };
				};
				const nativeAsk = async custom => {
					clear();
					const event = game.createEvent("dcanzhi_cost", false); event.skill = "dcanzhi"; event.player = game.me;
					const trigger = game.createEvent("damage", false); trigger.player = game.me; event._trigger = trigger;
					_status.eventManager.setStatusEvent(event, true);
					let choice;
					const original = game.me.chooseBool;
					game.me.chooseBool = function (...args) {
						choice = original.apply(this, args); choice.parent = event; choice.forResult = () => new Promise(() => {}); return choice;
					};
					try { void lib.skill.dcanzhi.cost(event, trigger, game.me); }
					finally { game.me.chooseBool = original; }
					if (!choice) throw Error("dcanzhi.cost did not create chooseBool");
					if (custom) choice.prompt2 += "\n只能选择本轮未获得过牌的角色，必须保留一张黑桃牌";
					const nativeDetail = choice.prompt2;
					_status.eventManager.setStatusEvent(choice, true); void Content.chooseBool(choice, null, game.me);
					prompts.refreshOptimizedPrompt(); await document.fonts.ready;
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
					return { choice, state: { ...read(), nativeMain: choice.prompt, nativeDetail, source: lib.translate.dcanzhi_info, nativeUnchanged: choice.prompt2 === nativeDetail } };
				};
				const initial = await nativeAsk(); const out = { native: initial.state };
				ui.click.cancel(); out.cancelled = initial.choice.result?.bool === false;
				const custom = await nativeAsk(true); out.custom = custom.state;
				ui.click.ok(); out.confirmed = custom.choice.result?.bool === true;
				if (style === "othersOff") {
					clear();
					const audit = { packs: [], longLiterals: 0, removedBefore: 0, removedAfter: 0, newlyHandled: [], preserved: [], failures: [] };
					const decode = literal => {
						if (literal[0] === '"') return JSON.parse(literal);
						if (literal.includes("${")) return null;
						const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0" };
						return literal.slice(1, -1).replace(/\\u([\da-f]{4})|\\x([\da-f]{2})|\\(.)/gi, (_, u, x, c) => u || x ? String.fromCharCode(parseInt(u || x, 16)) : escapes[c] ?? c);
					};
					for (const pack of packs) {
						const skills = (await import(`/character/${pack}/skill.js`)).default;
						const translates = (await import(`/character/${pack}/translate.js`)).default;
						audit.packs.push(pack);
						const walk = (id, info, root, seen = new Set()) => {
							if (!info || typeof info !== "object" || seen.has(info)) return;
							seen.add(info);
							const source = info.sourceSkill || root;
							const description = translates[id + "_info"] || translates[source + "_info"] || translates[root + "_info"];
							const name = translates[source] || translates[root];
							if (description && name) for (const [method, value] of Object.entries(info)) {
								if (typeof value !== "function") continue;
								const sourceText = value.toString();
								const literals = [...sourceText.matchAll(/(?:\.set\(\s*["']prompt2["']\s*,|\bprompt2\s*:)\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g)];
								for (const match of literals) {
									const detail = decode(match[1]); if (!detail || detail.length < 40) continue;
									const key = "native_description_probe";
									lib.skill[key] = {}; lib.translate[key] = name; lib.translate[key + "_info"] = description;
									const e = { name: "chooseBool", player: game.me };
									const a = before.buildXinshaPrompt(e, "是否发动【" + name + "】？", key, detail);
									const b = buildXinshaPrompt(e, "是否发动【" + name + "】？", key, detail);
									audit.longLiterals++; if (!a.detail) audit.removedBefore++; if (!b.detail) audit.removedAfter++;
									const row = { pack, id, method, detail, description, remaining: b.detail };
									if (a.detail && !b.detail) audit.newlyHandled.push(row);
									else if (b.detail) audit.preserved.push(row);
									const independent = buildXinshaPrompt(e, "是否发动【" + name + "】？", key, detail + "\n必须保留的独立条件");
									if (!independent.detail.endsWith("必须保留的独立条件")) audit.failures.push({ pack, id, method });
								}
							}
							for (const [sub, child] of Object.entries(info.subSkill || {})) walk(id + "_" + sub, child, root, seen);
						};
						for (const [id, info] of Object.entries(skills)) walk(id, info, id);
					}
					out.audit = audit;
				}
				await nativeAsk();
				return out;
			}, { packs, style });
			assert(result.native.nativeUnchanged); assert(result.cancelled); assert(result.confirmed);
			if (style === "othersOff" && !baseline) {
				assert.equal(result.native.main, "是否发动“暗织”"); assert.equal(result.native.detail, ""); assert.equal(result.native.id, "2383");
				assert.equal(result.custom.detail, "", "一将发动确认只保留主提示");
				assert(result.custom.nativeUnchanged && result.custom.nativeDetail.endsWith("只能选择本轮未获得过牌的角色，必须保留一张黑桃牌"), "只调整显示，原事件条件保留");
				assert(result.audit.newlyHandled.some(row => row.id === "dcanzhi")); assert.deepEqual(result.audit.failures, []);
			} else assert(result.native.detail.length > 40);
			assert.deepEqual(errors, []);
			results[style] = { ...result, errors };
			console.log("NATIVE_DESCRIPTION_OK", style, JSON.stringify({ detail: result.native.detail.length, packs: result.audit?.packs.length,
				longLiterals: result.audit?.longLiterals, removedBefore: result.audit?.removedBefore, removedAfter: result.audit?.removedAfter,
				newlyHandled: result.audit?.newlyHandled.map(row => row.id), errors }));
			if (!baseline && style === "othersOff") {
				await page.waitForFunction(() => [...document.querySelectorAll(".decade-optimized-hand-tip")].some(n => !n.closed && !n.classList.contains("hidden") && Number(getComputedStyle(n).opacity) >= .99));
				await page.screenshot({ path: path.join(__dirname, "xinsha-native-description-anzhi.png") });
			}
			await page.close();
		}
		fs.writeFileSync(path.join(__dirname, baseline ? "xinsha-native-description-before.json" : "xinsha-native-description-results.json"), JSON.stringify(results, null, 2) + "\n");
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
