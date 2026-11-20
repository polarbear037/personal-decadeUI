const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');

async function run() {
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
	const results = {};
	try {
		for (const style of (process.env.BEINI_STYLES || 'on,othersOff,onlineUI').split(',')) {
			Object.assign(seed, { mode: 'identity', characters: ['standard', 'huicui'], cards: ['standard', 'extra'], touchscreen: false, hp_style: 'default',
				extension_十周年UI_newDecadeStyle: style, extension_十周年UI_dynamicSkin: false });
			const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
			const errors = [];
			page.on('pageerror', error => errors.push(error.message));
			page.on('dialog', dialog => dialog.accept());
			await dependencies(page);
			if (process.env.BEINI_REV) {
				const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', process.env.BEINI_REV], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim().split('\n'));
				await page.route('**/extension/**', route => {
					const relative = decodeURIComponent(new URL(route.request().url()).pathname).split('/extension/十周年UI/')[1];
					// 只替换历史样式及修复前的提示入口，保留当前初始化和其他行为。
					const selected = process.env.BEINI_HISTORY_FILES?.split(',');
					if (!relative || !tracked.has(relative) || !(relative === 'ui/skill/skins/base.js' || (selected ? selected.includes(relative) : relative.endsWith('.css')))) return route.fallback();
					return route.fulfill({ contentType: relative.endsWith('.css') ? 'text/css' : relative.endsWith('.json') ? 'application/json' : 'text/javascript',
						body: execFileSync('git', ['show', `${process.env.BEINI_REV}:${relative}`], { cwd: path.resolve(__dirname, '..'), maxBuffer: 16 * 1024 * 1024 }) });
				});
			}
			await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
			await page.waitForFunction(async style => {
				const { ui } = await import('/noname.js');
				return !!window.decadeUI && typeof ui.updateSkillControl === 'function' && document.body.dataset.style === style;
			}, style, { timeout: 45000 });
			results[style] = await page.evaluate(async () => {
				const { game, lib, ui, get, _status } = await import('/noname.js');
				const { default: skills } = await import('/character/huicui/skill.js');
				game.pause(); game.resume = () => {};
				for (const dialog of [...ui.dialogs]) dialog.close();
				for (const control of [...ui.controls]) control.close();
				document.querySelector('.decade-welcome-overlay')?.remove();
				ui.arena.classList.remove('choose-character');
				game.me = game.players[0]; game.me.init('dc_jiachong');
				for (const [index, player] of game.players.entries()) {
					if (index) player.init(['caocao', 'liubei', 'sunquan', 'guanyu', 'zhangfei', 'zhaoyun', 'huangyueying'][index - 1]);
					player.identity = index === 0 ? 'zhu' : index % 2 ? 'fan' : 'zhong';
					player.ai.shown = 1;
				}
				_status.over = false; _status.currentPhase = game.me;
				const parent = game.createEvent('dcbeini', false); parent.player = game.me;
				_status.eventManager.setStatusEvent(parent, true);
				game.me.directgain(Array.from({ length: game.me.maxHp }, () => game.createCard('shan', 'heart', 2)));
				const counts = {}, times = {};
				const wrap = (object, key, label = key) => {
					const original = object[key];
					object[key] = function (...args) {
						counts[label] = (counts[label] || 0) + 1;
						const start = performance.now();
						try { return original.apply(this, args); }
						finally { times[label] = (times[label] || 0) + performance.now() - start; }
					};
				};
				wrap(ui, 'updateSkillControl');
				for (const player of game.players) wrap(player, 'decadeUI_updateShowCards', 'showCards');
				for (const method of ['addSkill', 'removeSkill', 'addSkillTrigger', 'removeSkillTrigger', 'addTip', 'removeTip', 'addSkillBlocker']) wrap(lib.element.player, method);
				const start = performance.now();
				const iterator = skills.dcbeini.content(parent, { player: game.me });
				const choice = iterator.next().value;
				const elapsed = performance.now() - start;
				const profile = { counts: { ...counts }, times: { ...times } };
				const trial = game.players[1];
				trial.addSkill('dcbeini_fengyin2');
				const simulated = { blocked: get.is.blocked('jianxiong', trial), tip: trial.tips?.has('dcbeini_fengyin2') || false };
				trial.removeSkill('dcbeini_fengyin2');
				trial.addSkill('dcbeini_fengyin');
				const formal = { blocked: get.is.blocked('jianxiong', trial), tip: trial.tips?.get('dcbeini_fengyin')?.textContent };
				trial.removeSkill('dcbeini_fengyin');
				const removed = { blocked: get.is.blocked('jianxiong', trial), tip: trial.tips?.has('dcbeini_fengyin') || false };
				trial.addTip('beini-regression', '普通提示');
				const ordinaryTip = trial.tips?.get('beini-regression')?.textContent;
				trial.removeTip('beini-regression');
				return { style: document.body.dataset.style, players: game.players.length, elapsed, ...profile,
					choice: choice.name, aiTargets: choice.aiTargets?.map(player => game.players.indexOf(player)),
					leakedSeal: game.players.some(player => player.skills.includes('dcbeini_fengyin2')), simulated, formal, removed, ordinaryTip };
			});
			results[style].errors = errors;
			if (process.env.BEINI_REV) results[style].history = { revision: process.env.BEINI_REV, files: process.env.BEINI_HISTORY_FILES || 'all tracked CSS' };
			console.log('BEINI', style, JSON.stringify(results[style]));
			assert.equal(results[style].style, style);
			assert.equal(results[style].choice, 'chooseTarget');
			assert.equal(results[style].counts.addTip, results[style].players * (results[style].players - 1) * 2);
			if (!process.env.BEINI_REV) assert.ok(results[style].elapsed < 1000, '悖逆目标计算仍有明显阻塞');
			assert.equal(results[style].leakedSeal, false);
			assert.deepEqual(results[style].aiTargets, [0, 7]);
			assert.deepEqual(results[style].simulated, { blocked: true, tip: !!process.env.BEINI_REV });
			assert.deepEqual(results[style].formal, { blocked: true, tip: '非锁定技失效' });
			assert.deepEqual(results[style].removed, { blocked: false, tip: false });
			assert.equal(results[style].ordinaryTip, '普通提示');
			assert.deepEqual(errors, []);
			await page.close();
			if (process.env.BEINI_PROFILE_ONLY) continue;

			const live = await browser.newPage({ viewport: { width: 1600, height: 900 } });
			const liveErrors = [];
			live.on('pageerror', error => liveErrors.push(error.message));
			live.on('dialog', dialog => dialog.accept());
			await dependencies(live);
			await live.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
			await live.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
			await live.evaluate(async () => {
				const { game, lib, ui, _status } = await import('/noname.js');
				window.beiniLive = { stage: 'starting' };
				lib.skill._verify_beini_driver = {
					trigger: { global: 'phaseUseBegin' }, forced: true, silent: true, charlotte: true, firstDo: true, priority: Infinity,
					filter: () => !beiniLive.started,
					async content(event, trigger) {
						beiniLive.started = true; beiniLive.stage = 'running';
						const actor = trigger.player;
						actor.init('dc_jiachong');
						await actor.discard(actor.getCards('h'));
						const chooseTarget = actor.chooseTarget;
						actor.chooseTarget = function (...args) {
							beiniLive.afterDraw = this.countCards('h');
							beiniLive.maxHp = this.maxHp;
							beiniLive.computeStart = performance.now();
							return chooseTarget.apply(this, args);
						};
						const next = game.createEvent('dcbeini', false);
						next.player = actor;
						next.setContent(lib.skill.dcbeini.content);
						await next;
						actor.chooseTarget = chooseTarget;
						beiniLive.sealed = game.players.filter(player => player.hasSkill('dcbeini_fengyin', null, null, false)).length;
						beiniLive.formalTips = game.players.filter(player => player.tips?.has('dcbeini_fengyin')).length;
						beiniLive.leakedSeal = game.players.some(player => player.skills.includes('dcbeini_fengyin2'));
						beiniLive.stage = 'done'; game.pause();
					},
				};
				lib.skill._verify_beini_sha = {
					trigger: { global: 'useCard1' }, forced: true, silent: true, charlotte: true,
					filter: event => event.card.name === 'sha' && event.getParent('dcbeini').name === 'dcbeini',
					content() {
						beiniLive.sha = true;
						beiniLive.sealedAtSha = game.players.filter(player => player.hasSkill('dcbeini_fengyin', null, null, false)).length;
						beiniLive.tipsAtSha = game.players.filter(player => player.tips?.has('dcbeini_fengyin')).length;
					},
				};
				game.addGlobalSkill('_verify_beini_driver'); game.addGlobalSkill('_verify_beini_sha');
				if (!_status.auto) ui.click.auto('forced');
				game.resume2(); game.resume();
			});
			await live.waitForFunction(() => window.beiniLive?.stage === 'done', null, { timeout: 45000 }).catch(async error => {
				console.error('BEINI_ENGINE_STATE', await live.evaluate(async () => {
					const { _status } = await import('/noname.js');
					return { ...beiniLive, event: _status.event.name, paused: _status.paused, paused2: _status.paused2, auto: _status.auto };
				}), liveErrors);
				throw error;
			});
			results[style].engine = await live.evaluate(() => beiniLive);
			results[style].engine.errors = liveErrors;
			console.log('BEINI_ENGINE', style, JSON.stringify(results[style].engine));
			assert.equal(results[style].engine.afterDraw, results[style].engine.maxHp);
			assert.equal(results[style].engine.sealedAtSha, 2);
			assert.equal(results[style].engine.tipsAtSha, 2);
			assert.equal(results[style].engine.leakedSeal, false);
			assert.equal(results[style].engine.sha, true);
			assert.deepEqual(liveErrors, []);
			await live.close();
		}
		fs.writeFileSync(path.join(__dirname, `beini-refresh${process.env.BEINI_REV ? '-history' : ''}-results.json`), JSON.stringify(results, null, 2));
	} finally { await browser.close(); server.close(); }
}
run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
