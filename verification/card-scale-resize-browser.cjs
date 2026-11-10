const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const runtimeModules = path.join(require("node:os").homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules");
const { chromium } = require(require.resolve("playwright", { paths: [__dirname, runtimeModules] }));

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const source = file => read(file).replace(/^import .*;\r?\n/gm, "").replace(/^export .*;\r?\n?/gm, "");
const wrap = (file, before, after) => `(() => {\n${before}\n${source(file)}\n${after}\n})();`;
const css = read("../../layout/default/layout.css") + "\n" + read("src/styles/layout.css").replace(/^@import .*;\r?\n/gm, "");

(async () => {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
	const errors = [];
	page.on("pageerror", error => errors.push(error.message));
	page.on("console", message => message.type() === "error" && errors.push(message.text()));
	try {
		await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style>
		<style>html,body{width:100%;height:100%;margin:0}#window,#arena{position:absolute;inset:0;width:100%;height:100%}
		#arena>.hand-wrap{position:absolute;left:200px;right:200px;bottom:0;width:auto}
		.card{background-color:#d6bd83}.card.selected{background-color:#bdcbe0}</style>
		<div id="window"><div id="arena" class="decadeUI"><div class="hand-wrap"><div class="hand-cards"><div class="handcards"></div></div></div></div></div>`);
		await page.addScriptTag({ content: `
		window.lib = {config:{fold_card:false,extension_十周年UI_cardScale:0.18,extension_十周年UI_discardScale:0.14}};
		window.ui = {window:document.querySelector('#window'),arena:document.querySelector('#arena'),me:document.querySelector('.hand-wrap'),handcards1:document.querySelector('.handcards'),handcards1Container:document.querySelector('.hand-cards'),thrown:[]};
		window.game = {me:{},saveConfig(key,value){lib.config[key]=value}};
		window._status = {event:{player:game.me}};
		window.decadeUIName = '十周年UI';
		window.decadeUI = {dataset:{bodySize:{updated:false}},zooms:{card:1},isMobile:()=>false};
		${wrap("src/core/sheet.js", "", "decadeUI.sheet=e();decadeUI.sheet.sheetList=[document.styleSheets[0]];")}
		${wrap("src/core/getters.js", "const e=()=>{},t=class{};", "decadeUI.get=n();")}
		${wrap("src/utils/bounds.js", "", "window.BoundsCache=t;window.createBoundsCaches=e;")}
		${wrap("src/core/utility.js", `const delayRemoveCards=()=>{},getMapElementPos=()=>{},getRandom=()=>{},isMobile=()=>false,getPlayerIdentity=()=>{},layoutHandDraws=()=>{},layoutDrawCards=()=>{},cardTempSuitNum=()=>{},tryAddPlayerCardUseTag=()=>{},playTrickJudgeResult=()=>{},showHandTip=()=>{},element={};`, "h(decadeUI);p(decadeUI);")}
		${wrap("src/core/layout.js", "", "decadeUI.layout=e();")}
		${wrap("src/overrides/card/overrides.js", "const LAYOUT={CARD_SELECT_OFFSET_DESKTOP:20,CARD_SELECT_OFFSET_MOBILE:10};", "window.updateCardTransform=p;")}
		${wrap("src/config/handlers/card-handlers.js", "", "window.scaleHandlers={hand:c,discard:r};")}
		const makeCard=(parent,classes)=>{const card=document.createElement('div');card.className='card '+classes;card.updateTransform=updateCardTransform;parent.appendChild(card);return card};
		for(let i=0;i<4;i++)makeCard(ui.handcards1,i===1?'selected':'');
		for(let i=0;i<3;i++)ui.thrown.push(makeCard(ui.arena,'thrown'));
		window.addEventListener('resize',()=>decadeUI.layout.resize());
		decadeUI.layout.resize();
		window.measure=()=>{
			const hand=ui.handcards1.firstChild.getBoundingClientRect(),discard=ui.thrown[0].getBoundingClientRect();
			return {viewportWidth:innerWidth,viewportHeight:innerHeight,handWidth:hand.width,discardWidth:discard.width,
				handRatio:hand.width/innerWidth,discardRatio:discard.width/innerWidth,
				selected:ui.handcards1.children[1].classList.contains('selected'),
				selectedTransform:ui.handcards1.children[1].style.transform,
				containerHeight:ui.me.clientHeight,scale:decadeUI.zooms.card,
				boundsScale:decadeUI.boundsCaches.hand.cardScale};
		};
		` });
		const samples = [];
		// Preserve the old card sizes in a 1280x720 reference window; only width drives resizing.
		const check = async (label, handSize = 0.18, discardSize = 0.14) => {
			const handRatio = (720 * handSize * 108 / 150) / 1280;
			const discardRatio = (720 * discardSize * 108 / 150) / 1280;
			await page.waitForFunction(({ handRatio, discardRatio }) => {
				const m = measure();
				return Math.abs(m.handRatio - handRatio) < 0.0002 && Math.abs(m.discardRatio - discardRatio) < 0.0002;
			}, { handRatio, discardRatio }, { timeout: 3500 }).catch(async error => {
				throw new Error(`${label}: ${error.message}; measured ${JSON.stringify(await page.evaluate(() => measure()))}`);
			});
			await page.waitForTimeout(80);
			const sample = await page.evaluate(() => measure());
			assert.ok(Math.abs(sample.handRatio - handRatio) < 0.0002, `${label}: hand ${JSON.stringify(sample)}`);
			assert.ok(Math.abs(sample.discardRatio - discardRatio) < 0.0002, `${label}: discard ${JSON.stringify(sample)}`);
			assert.ok(sample.selected && sample.selectedTransform.includes("translateY(-20px)"), `${label}: selected card stays raised`);
			assert.equal(sample.scale, sample.boundsScale, `${label}: scale cache is current`);
			samples.push({ label, ...sample });
		};
		await check("1280x720");
		await page.setViewportSize({ width: 1600, height: 720 });
		await check("width-only grow");
		await page.setViewportSize({ width: 1200, height: 720 });
		await check("width-only shrink");
		await page.setViewportSize({ width: 1280, height: 720 });
		await check("width restored");
		const beforeHeightChange = await page.evaluate(() => measure());
		await page.setViewportSize({ width: 1280, height: 1080 });
		await check("height-only resize");
		const afterHeightChange = await page.evaluate(() => measure());
		assert.ok(Math.abs(afterHeightChange.handWidth - beforeHeightChange.handWidth) < 0.3, "height alone must not change hand width");
		assert.ok(Math.abs(afterHeightChange.discardWidth - beforeHeightChange.discardWidth) < 0.3, "height alone must not change discard width");
		// Cross both original-size caps, then shrink and return to the initial size.
		for (const [width, height] of [[1600, 900], [1920, 1080], [2560, 1440], [1200, 600], [1280, 720]]) {
			await page.setViewportSize({ width, height });
			await check(`${width}x${height}`);
		}
		// Exercise native resize events in a continuous drag sequence.
		for (let frame = 0; frame < 30; frame++) {
			const step = frame < 15 ? frame : 29 - frame;
			await page.setViewportSize({ width: 1280 + step * 35, height: 720 });
			const live = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(measure()))));
			assert.ok(Math.abs(live.handRatio - 0.0729) < 0.0002, `drag frame ${frame}: hand ${JSON.stringify(live)}`);
			assert.ok(Math.abs(live.discardRatio - 0.0567) < 0.0002, `drag frame ${frame}: discard ${JSON.stringify(live)}`);
		}
		await check("continuous resize");
		await page.evaluate(() => scaleHandlers.hand.call({tagName:'INPUT',value:'0.25'}));
		await check("hand setting changes independently", 0.25, 0.14);
		await page.evaluate(() => scaleHandlers.discard.call({tagName:'INPUT',value:'0.20'}));
		await check("discard setting changes independently", 0.25, 0.20);
		await page.setViewportSize({ width: 1200, height: 600 });
		await check("resize after settings", 0.25, 0.20);
		// Use the same CSS zoom and percentage body sizing as ui.updatez.
		for (const zoom of [0.8, 1.25, 1.5]) {
			await page.evaluate(zoom => {
				document.body.style.zoom=zoom;
				decadeUI.layout.resize();
			}, zoom);
			await check(`documentZoom=${zoom}`, 0.25, 0.20);
			await page.setViewportSize({ width: 1800, height: 600 });
			await check(`documentZoom=${zoom} resized`, 0.25, 0.20);
			await page.setViewportSize({ width: 1200, height: 600 });
		}
		await page.evaluate(() => {
			document.body.style.zoom=1;
			delete lib.config.extension_十周年UI_cardScale;
			delete lib.config.extension_十周年UI_discardScale;
			decadeUI.layout.resize();
		});
		await check("default settings");
		await page.setViewportSize({ width: 1600, height: 600 });
		await check("width-only resize");
		const animations = await page.evaluate(async () => {
			const card = ui.handcards1.firstChild;
			card.style.opacity = '0.5';
			card.style.transform = 'translate(0px,0px) scale(0.4)';
			card.getBoundingClientRect();
			const opacity = card.getAnimations().find(animation => animation.transitionProperty === 'opacity');
			await new Promise(resolve => setTimeout(resolve, 100));
			decadeUI.layout.updateHand();
			const ordinaryMove = card.getAnimations().some(animation => animation.transitionProperty === 'transform');
			decadeUI.layout.resize();
			return { ordinaryMove, opacityState: opacity?.playState, resizingTransform: card.getAnimations().some(animation => animation.transitionProperty === 'transform') };
		});
		assert.equal(animations.ordinaryMove, true, "ordinary card movement retains its transform transition");
		assert.equal(animations.opacityState, "running", "resize retains the opacity transition");
		assert.equal(animations.resizingTransform, false, "resize commits the card transform immediately");
		for (const value of [0.1, 1]) {
			await page.evaluate(value => {
				scaleHandlers.hand.call({tagName:'INPUT',value:String(value)});
				scaleHandlers.discard.call({tagName:'INPUT',value:String(value)});
			}, value);
			await check(`setting boundary ${value}`, value, value);
		}
		const fallback = await page.evaluate(() => {
			const getStyle=decadeUI.sheet.getStyle;
			try {
				decadeUI.sheet.getStyle=()=>null;
				return decadeUI.getCardBestScale();
			} finally { decadeUI.sheet.getStyle=getStyle; }
		});
		assert.equal(fallback, 900 / 150, "unloaded card stylesheet uses a finite fallback scale at width 1600");
		assert.deepEqual(errors, [], "browser errors");
		console.log(JSON.stringify({result:"CARD_WIDTH_RATIO_RESIZE_OK",liveDragFrames:30,animations,samples:samples.map(({label,viewportWidth,viewportHeight,handWidth,discardWidth,handRatio,discardRatio})=>({label,viewportWidth,viewportHeight,handWidth,discardWidth,handRatio,discardRatio})),errors}, null, 2));
	} finally {
		await browser.close();
	}
})().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
