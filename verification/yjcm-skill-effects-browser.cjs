const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { server, chromium, seed } = require("./online-player-tips-browser.cjs");
const { dependencies } = require("./xinsha-prompt-engine.cjs");

(async () => {
	const style = process.argv.includes("--online") ? "onlineUI" : "othersOff";
	const mobile = process.argv.includes("--mobile");
	const artifactStyle = style + (mobile ? "-mobile" : "");
	Object.assign(seed, { mode: "identity", characters: ["standard"], cards: ["standard", "extra"], extension_十周年UI_newDecadeStyle: style, phonelayout: true, touchscreen: false });
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
	const page = await browser.newPage({ viewport: mobile ? { width: 960, height: 540 } : { width: 1500, height: 800 }, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile });
	const errors = [], failures = [], results = {};
	page.on("pageerror", error => errors.push(error.message));
	page.on("dialog", dialog => dialog.accept());
	page.on("response", response => { if (response.status() >= 400 && response.url().includes("xuanzhong")) failures.push(response.status() + " " + response.url()); });
	try {
		await dependencies(page);
		await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
		await page.locator("#arena > .player").nth(1).waitFor({ state: "attached", timeout: 45000 });
		await require('./skill-button-worker-fixture.cjs').installWorkerFixture(page,style);
		// 夹具只测光效是否吞掉按钮输入；遗留倒计时和受控玩家不参与命中。
		await page.addStyleTag({content:'#jindutiaopl{display:none!important}#arena>.player{pointer-events:none!important}'});
		results.states = await page.evaluate(async () => {
			const { game, ui, lib, get, _status } = await import("/noname.js");
			Object.assign(window, { game, ui, lib, get, _status });
			game.pause(); game.resume = () => {};
			for (const dialog of [...ui.dialogs]) dialog.close();
			for (const control of [...ui.controls]) control.close();
			document.querySelector(".decade-welcome-overlay")?.remove();
			ui.arena.classList.remove("choose-character");
			game.me = game.players[0]; game.me.init("caocao"); game.players[1].init("liubei");
			game.me.addSkill("rende"); game.me.addSkill("wusheng");
			game.me.addSkill("jianxiong");
			_status.gameStarted = true; _status.over = false; _status.auto = false;
			ui.updateSkillControl(game.me, true);
			const read = () => [...document.querySelectorAll('[data-skill-button-effect="active"],[data-skill-button-effect="passive"]')].map(node => ({ id: node.dataset.id, type: node.dataset.skillButtonEffect }));
			const phase = game.createEvent("phaseUse", false); phase.player = game.me;
			const event = (name, skill, parent = phase, player = game.me) => {
				const next = game.createEvent(name, false); next.player = player; next.parent = parent;
				if (skill) next.skill = skill;
				// 保留真实GameEvent/按钮更新器，夹具停止后续结算。
				next.then = () => {};
				_status.eventManager.setStatusEvent(next, true); return next;
			};
			const update = () => { ui.skillControl.update(); ui.gskillControl?.update(); return read(); };
			const out = {};
			_status.imchoosing = true; ui.skills = { skills: ["rende", "wusheng"] }; ui.skills2 = ui.skills3 = undefined;
			event("chooseToUse"); out.availableOnly = update();
			ui.skills = { skills: [] };
			event("chooseToUse", "rende"); out.activeSelected = update();
			const originalFx = document.querySelector('[data-skill-button-effect="active"]');
			for (let i = 0; i < 20; i++) update();
			out.reused = originalFx === document.querySelector('[data-skill-button-effect="active"]');
			event("useSkill", "rende"); _status.imchoosing = false; out.activeResolving = update();
			_status.event.finish(); out.activeFinished = update();
			if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") {
				lib.skill.rende_fx_passive = { sourceSkill: "rende", trigger: { player: "damageEnd" } };
				const passive = event("rende_fx_passive"); out.activeFromPassiveName = update();
				event("trigger", "rende_fx_passive"); out.activeFromPassiveSkill = update();
				event("trigger", "rende"); out.activeFromMainId = update();
				_status.imchoosing = true;
				event("chooseTarget", null, passive); out.activeFromPassiveTarget = update();
				event("chooseCard", "rende", passive); out.activeFromPassiveCard = update();
				const choice = event("chooseToUse", "rende");
				choice.result = { bool: true, skill: "rende" }; out.activeWithOldResult = update();
				choice.backup("rende"); out.activeAfterBackup = update();
				_status.auto = true; out.activeAuto = update(); _status.auto = false;
				_status.imchoosing = false; out.activeNotChoosing = update(); _status.imchoosing = true;
				choice.cancelled = true; out.activeCancelled = update();
				event("chooseToUse", "rende", phase, game.players[1]); out.activeRemote = update();
				event("chooseToRespond", "wusheng"); out.activeResponse = update();
				_status.over = true; out.activeGameOver = update(); _status.over = false;
			}
			_status.imchoosing = false;
			event("trigger", "jianxiong"); out.passiveAutomatic = update();
			const trigger = _status.event; event("chooseBool", null, trigger); _status.imchoosing = true; out.passiveAsk = update();
			_status.event.result = { bool: true }; out.pendingWithOldResult = update();
			const cost = event("jianxiong_cost", "jianxiong"); event("chooseTarget", null, cost); out.passiveCost = update();
			const content = event("jianxiong"); event("chooseTarget", null, content); out.passiveTargets = update();
			event("chooseBool", null, content); out.passiveAccepted = update();
			event("chooseBool", null, content, game.players[1]); out.remoteChoice = update();
			event("jianxiong", null); _status.imchoosing = false; out.passiveSettlement = update();
			event("chooseBool", null, content); _status.imchoosing = true; _status.auto = true; out.autoControl = update(); _status.auto = false;
			_status.event.cancelled = true; out.cancelled = update();
			event("chooseToUse", "wusheng"); out.conversion = update();
			out.isolation = [];
			const originalStyle = lib.config.extension_十周年UI_newDecadeStyle;
			for (const target of ["othersOff", "onlineUI", "on", "off", "babysha", "codename"].filter(x=>x!==originalStyle)) {
				lib.config.extension_十周年UI_newDecadeStyle = target; document.body.dataset.style = target;
				out.isolation.push({ style: target, count: update().length });
			}
			lib.config.extension_十周年UI_newDecadeStyle = originalStyle; document.body.dataset.style = originalStyle;
			window.skillFxProbe = { event, update, phase };
			event("chooseBool", null, trigger); update();
			return out;
		});
		const s = results.states;
		assert.deepEqual(s.availableOnly.map(x=>x.id).sort(),style === "onlineUI" ? ["rende","wusheng"] : []);
		for (const name of ["activeFinished", "passiveAutomatic", "remoteChoice", "passiveSettlement", "autoControl", "cancelled"]) assert.equal(s[name].length, 0, name);
		assert.deepEqual(s.activeSelected.map(x => x.id), ["rende"]);
		assert.deepEqual(s.activeResolving.map(x => x.id), style === "onlineUI" ? ["rende"] : [], "activeResolving");
		if (style === "othersOff") {
			for (const name of ["activeFromPassiveName", "activeFromPassiveSkill", "activeFromMainId", "activeFromPassiveTarget", "activeFromPassiveCard", "activeAuto", "activeNotChoosing", "activeCancelled", "activeRemote", "activeGameOver"]) assert.deepEqual(s[name], [], name);
			for (const name of ["activeWithOldResult", "activeAfterBackup"]) assert.deepEqual(s[name].map(x => x.id), ["rende"], name);
			assert.deepEqual(s.activeResponse.map(x => x.id), ["wusheng"]);
		}
		for (const name of ["passiveAsk", "pendingWithOldResult", "passiveCost"]) assert.deepEqual(s[name].map(x => x.id), style === "onlineUI" ? [] : ["jianxiong"], name);
		for (const name of ["passiveTargets", "passiveAccepted"]) assert.deepEqual(s[name].map(x => x.id), ["jianxiong"], name);
		assert.deepEqual(s.conversion.map(x => x.id), ["wusheng"]); assert(s.reused);
		assert(s.isolation.every(x => x.count === 0));
		results.geometry = [];
		for (const zoom of [.75, 1, 1.5]) for (const side of ["right", "left"]) for (const passive of [false, true]) {
			const geometry = await page.evaluate(async ({ zoom, side, passive }) => {
				document.body.style.zoom = String(zoom); ui.window.dataset.yjcmSide = side;
				ui.window.style.transform = zoom === .75 ? 'scale(.85)' : '';
				ui.arena.dataset.rightLayout = side === "right" ? "on" : "off";
				const parent = skillFxProbe.event(passive ? "jianxiong" : "chooseToUse", passive ? null : "rende");
				if (passive) skillFxProbe.event("chooseBool", null, parent);
				_status.imchoosing = true; skillFxProbe.update();
				await document.fonts.ready; await new Promise(requestAnimationFrame);
				let fx = document.querySelector("[data-skill-button-spine]");
				for(let n=0;n<300&&!document.querySelector("[data-skill-button-spine]")?._skillButtonSpine;n++) await new Promise(r=>setTimeout(r,20));
				// Online既有定时刷新可能重建按钮；解码后读取当前节点而非已脱离的旧节点。
				fx = document.querySelector("[data-skill-button-spine]");
				const a = fx.getBoundingClientRect(), b = fx.parentNode.getBoundingClientRect();
				const c=getComputedStyle(fx.parentNode), properties=['width','height','box-sizing','background-image','background-size','background-position','background-repeat','border-image','border-width','border-style','border-radius'];
				return { playing:!!fx._skillButtonSpine&&!fx._skillButtonSpine.completed, canvas:document.querySelectorAll('canvas').length, staticCss:properties.map(p=>`${p}:${c.getPropertyValue(p)}`).join(';'), staticSize:[parseFloat(c.width),parseFloat(c.height)], widthRatio: a.width / b.width, heightRatio: a.height / b.height, left: (a.left-b.left)/b.width, top: (a.top-b.top)/b.height, pointer: getComputedStyle(fx).pointerEvents, natural: [Number(fx.dataset.spineWidth),Number(fx.dataset.spineHeight)], hit: document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest("[data-id]")?.dataset.id };
			}, { zoom, side, passive });
			const ridge = style === "onlineUI" ? passive ? [8,136,7,62] : [20,157,19,75] : passive ? [24,95,24,48] : [25,132,24,66];
			assert(geometry.playing,`${style} Spine did not start`);
			await page.waitForTimeout(80);
			let gpu;
			for(let attempt=0;attempt<40;attempt++) {
			gpu = await page.evaluate(async()=>{
				const marker=document.querySelector('[data-skill-button-spine]');if(!marker?._skillButtonSpine)return {pending:true};
				const b=marker.getBoundingClientRect(),c=document.querySelector('#chukuang-canvas').getBoundingClientRect(),probe=await __skillProbe();
				if(!marker.isConnected)return {pending:true};
				const node=probe.nodes.find(n=>n.id===marker._skillButtonSpine.id&&!n.completed);
				const b2=marker.parentNode.getBoundingClientRect(),at=document.elementFromPoint(b2.left+b2.width/2,b2.top+b2.height/2);
				return {node,hit:at?.closest('[data-id]')?.dataset.id,hitTrace:{rect:[b2.left,b2.top,b2.width,b2.height],element:at?.outerHTML.slice(0,250),zoom:game.documentZoom,inner:[innerWidth,innerHeight]},expected:[2*b.width/c.width/Number(marker.dataset.spineWidth),2*b.height/c.height/Number(marker.dataset.spineHeight),2*(b.left+b.width/2-c.left)/c.width-1,1-2*(b.top+b.height/2-c.top)/c.height],workerErrors:__skillWorkerErrors,canvasZ:getComputedStyle(document.querySelector('#chukuang-canvas')).zIndex,buttonZ:getComputedStyle(ui.skillControl).zIndex};
			});
			if(gpu.node&&[0,5,12,13].every((slot,index)=>Math.abs(gpu.node.mvp[slot]-gpu.expected[index])<.0001))break;
			await page.waitForTimeout(100);
			}
			fs.writeFileSync(path.join(__dirname,`${style}-skill-gpu-last.json`),JSON.stringify(gpu,null,2));
			assert(gpu.node,'real Worker node missing');assert.deepEqual(gpu.workerErrors,[]);
			for(const [index,slot] of [0,5,12,13].entries()) assert(Math.abs(gpu.node.mvp[slot]-gpu.expected[index])<.0001,`GPU alignment ${style}/${zoom}/${side}/${passive}/${slot}: ${gpu.node.mvp[slot]} vs ${gpu.expected[index]}`);
			geometry.gpu=gpu;
			const [w,h] = geometry.natural;
			const edges = [geometry.left+ridge[0]/w*geometry.widthRatio,geometry.left+ridge[1]/w*geometry.widthRatio,geometry.top+ridge[2]/h*geometry.heightRatio,geometry.top+ridge[3]/h*geometry.heightRatio];
			const nativeSize=style==='othersOff'?passive?[120*.9/72.5,73/26]:[158/110,91/45]:passive?[145/130,71/56]:[178/146,95/64];
			assert(Math.abs(geometry.widthRatio-nativeSize[0])<.003);
			assert(Math.abs(geometry.heightRatio-nativeSize[1])<.003);
			const expectedX=.5-nativeSize[0]/2,expectedY=(style==='othersOff'&&passive?.5-1/26:.5)-nativeSize[1]/2;
			assert(Math.abs(geometry.left-expectedX)<.003);assert(Math.abs(geometry.top-expectedY)<.003);
			assert.equal(geometry.pointer, "none"); assert.equal(gpu.hit, passive ? "jianxiong" : "rende",JSON.stringify({mobile,zoom,side,passive,gpu}));
			results.geometry.push({ zoom, side, passive, edges, ...geometry });
			if(!mobile&&zoom===1&&side==='right') {
				const maskPage=await browser.newPage({viewport:{width:300,height:180}});
				await maskPage.goto(`http://127.0.0.1:${server.address().port}/extension/十周年UI/info.json`);
				await maskPage.setContent('<body style="margin:0;background:transparent"><div></div></body>');
				await maskPage.locator('div').evaluate((n,css)=>n.style.cssText=`position:absolute;left:10px;top:10px;${css}`,geometry.staticCss);
				await maskPage.waitForTimeout(250);
				await maskPage.screenshot({path:path.join(__dirname,`${style}-skill-effects-static-${passive?'passive':'active'}.png`),omitBackground:true,clip:{x:10,y:10,width:geometry.staticSize[0],height:geometry.staticSize[1]}});
				await maskPage.close();
			}
		}
		await page.evaluate(() => { document.body.style.zoom = "1"; ui.window.dataset.yjcmSide = "right"; });
		await page.screenshot({ path: path.join(__dirname, `${artifactStyle}-skill-effects-browser.png`) });
		results.animation = [];
		for (const passive of [false,true]) {
			await page.evaluate(passive=>{
				ui.arena.dataset.rightLayout = "on";
				const parent=skillFxProbe.event(passive?"jianxiong":"chooseToUse",passive?null:"rende");
				if(passive)skillFxProbe.event("chooseTarget",null,parent);
				_status.imchoosing=true; skillFxProbe.update();
			},passive);
			await page.waitForTimeout(100);
			const clip = await page.evaluate(()=>{
				const b=document.querySelector("[data-skill-button-spine]").getBoundingClientRect();
				return {x:Math.max(0,b.left-8),y:Math.max(0,b.top-8),width:b.width+16,height:b.height+16};
			});
			const frames=[];
			for(let i=0;i<3;i++) { frames.push(await page.screenshot({clip}));await page.waitForTimeout(130); }
			assert(!frames[0].equals(frames[1])||!frames[1].equals(frames[2]),"Spine did not animate");
			fs.writeFileSync(path.join(__dirname,`${artifactStyle}-skill-effects-${passive?'passive':'active'}.png`),frames[1]);
			results.animation.push({passive,changed:true});
		}
		assert.deepEqual(errors, []); assert.deepEqual(failures, []);
		assert(results.geometry.every(x=>x.canvas===results.geometry[0].canvas),'Spine added another canvas');
		await page.evaluate(()=>__skillModule.setSkillButtonEffectsEnabled(false));
		await page.waitForTimeout(100);
		results.disabled=await page.evaluate(async()=>({markers:document.querySelectorAll('[data-skill-button-spine]').length,playing:(await __skillProbe()).nodes.filter(n=>!n.completed).length,follow:skinSwitch.chukuangWorkerApi._followUpdateMap.size}));
		assert.deepEqual(results.disabled,{markers:0,playing:0,follow:0});
		await page.evaluate(()=>__skillModule.setSkillButtonEffectsEnabled(true));
		await page.waitForFunction(()=>document.querySelector('[data-skill-button-spine]')?._skillButtonSpine?.completed===false);
		results.cleanup=await page.evaluate(async()=>{
			_status.imchoosing=false; ui.skills={skills:[]}; skillFxProbe.event('phaseUse'); skillFxProbe.update();
			await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
            const worker=await __skillProbe();
            return {markers:document.querySelectorAll('[data-skill-button-spine]').length,playing:worker.nodes.filter(n=>!n.completed).length,shared:document.querySelectorAll('#chukuang-canvas').length===1,follow:skinSwitch.chukuangWorkerApi._followUpdateMap.size,parents:worker.parents};
		});
		assert.deepEqual(results.cleanup,{markers:0,playing:0,shared:true,follow:0,parents:0});
		results.errors = errors; results.failures = failures;
		fs.writeFileSync(path.join(__dirname, `${style}-skill-effects${mobile?'-mobile':''}-results.json`), JSON.stringify(results, null, 2));
		console.log("SKILL_EFFECTS_OK", JSON.stringify({ style, states: Object.keys(s).length, geometry: results.geometry.length, errors, failures }));
	} finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
