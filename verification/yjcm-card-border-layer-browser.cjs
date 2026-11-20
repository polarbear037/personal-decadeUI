// 真实 Card、雷的一将牌面服务及三套边框；像素检查边框是否实际盖到不透明牌面上。
const fs = require('node:fs');
const path = require('node:path');
const { bootstrap, server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const { PNG } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const css = read('extension/十周年UI/src/styles/card-xinsha.css');
const fix = css.slice(css.indexOf('/* 独立牌面位于'), css.indexOf('.card.selected::before'));
const results = [];
const changed = (a, b, r) => {
	let count = 0;
	for (let y = Math.ceil(r.y); y < Math.floor(r.y + r.height); y++) for (let x = Math.ceil(r.x); x < Math.floor(r.x + r.width); x++) {
		const i = (y * a.width + x) * 4;
		if ([0, 1, 2].some(c => Math.abs(a.data[i + c] - b.data[i + c]) > 8)) count++;
	}
	return count;
};
(async () => {
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: 'msedge', headless: true });
	try {
		const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
		const errors = [];
		page.on('pageerror', e => errors.push(e.message));
		await bootstrap(page, origin, true);
		await page.addStyleTag({ content: css.replace(fix, '') });
		await page.addStyleTag({ url: origin + '/extension/十周年UI/src/styles/layout-xinsha.css' });
		// layout-xinsha.css 也会 @import 卡牌样式；从所有实际加载副本移除新规则，真实复现旧层级。
		await page.evaluate(() => {
			const seen = new Set();
			const strip = sheet => {
				if (seen.has(sheet)) return; seen.add(sheet);
				for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
					const rule = sheet.cssRules[i];
					if (rule.styleSheet) strip(rule.styleSheet);
					else if (rule.selectorText?.includes('.lei-yijiang-card') && rule.style?.borderImageWidth) sheet.deleteRule(i);
				}
			};
			[...document.styleSheets].forEach(strip);
		});
		await page.addStyleTag({ content: '#arena{position:absolute;inset:0}#samples{position:absolute;left:30px;top:30px}.hand-cards{position:absolute;left:350px;top:60px;width:400px;height:400px}.handcards{position:relative;width:100%;height:100%}.handcards>.card{position:absolute;left:0;top:0;margin:0}.card{animation:none!important;transition:none!important}.card::before{transition:none!important}' });
		await page.addScriptTag({ content: script('extension/十周年UI/src/ui/cardStyles.js', 'window.updateBorderStyles=d;') });
		await page.addScriptTag({ content: script('extension/雷的一将/utils/config.js', 'window.getConfig=getConfig;') });
		await page.addScriptTag({ content: script('extension/雷的一将/utils/cardBeautify.js', 'window.installYijiangCards=installCardBeautify;').replaceAll('import.meta.url', JSON.stringify(origin + '/extension/雷的一将/utils/cardBeautify.js')) });
		await page.evaluate(async () => {
			document.body.dataset.style = 'othersOff';
			lib.config.extension_十周年UI_newDecadeStyle = 'othersOff';
			game.me = {}; _status.event.player = game.me;
			await installYijiangCards();
			window.sampleCard = makeSample('sha', 'spade', 8);
			const hand = document.createElement('div'); hand.className = 'hand-cards';
			const cards = document.createElement('div'); cards.className = 'handcards';
			hand.append(cards); ui.arena.append(hand);
			window.handCard = ui.create.card(cards).init(['heart', 10, 'sha']);
			window.fixStyle = document.createElement('style'); document.head.append(fixStyle);
		});
		await page.waitForFunction(() => [sampleCard, handCard].every(c => c.classList.contains('lei-yijiang-card-ready')));
		for (const border of ['off', 'kuang1', 'kuang2', 'kuang3']) {
			await page.evaluate(border => {
				fixStyle.textContent = '';
				lib.config.extension_十周年UI_cardkmh = border;
				updateBorderStyles(); applyCardBorder(sampleCard, game.me, true);
				for (const c of [sampleCard, handCard]) c.style.transform = 'scale(1.5)';
			}, border);
			await page.evaluate(() => Promise.all([...document.querySelectorAll('.card')].map(c => {
				const src = getComputedStyle(c).borderImageSource;
				if (src === 'none') return;
				const image = new Image(); image.src = src.slice(5, -2); return image.decode();
			})));
			const before = PNG.sync.read(await page.screenshot());
			const bounds = await page.evaluate(() => [sampleCard, handCard].map(c => c.getBoundingClientRect().toJSON()));
			await page.evaluate(fix => { fixStyle.textContent = fix; }, fix);
			const after = PNG.sync.read(await page.screenshot());
			if (border === 'kuang1') {
				fs.writeFileSync(path.join(__dirname, 'yjcm-card-border-layer-before.png'), PNG.sync.write(before));
				fs.writeFileSync(path.join(__dirname, 'yjcm-card-border-layer-after.png'), PNG.sync.write(after));
			}
			const layers = await page.evaluate(() => [sampleCard, handCard].map(c => {
				const s = getComputedStyle(c), frame = getComputedStyle(c, '::after');
				const r = c.getBoundingClientRect();
				return { source: s.borderImageSource, frame: frame.borderImageSource, width: frame.borderImageWidth, rootWidth: s.borderImageWidth,
					z: +frame.zIndex, faceZ: +getComputedStyle(c.querySelector('.lei-yijiang-card-face')).zIndex,
					pointer: frame.pointerEvents, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === c,
					rect: r.toJSON() };
			}));
			for (let i = 0; i < layers.length; i++) {
				assert.deepEqual(layers[i].rect, bounds[i], 'border overlay cannot alter card geometry');
				assert.equal(layers[i].source, layers[i].frame);
				assert.equal(layers[i].rootWidth, '0');
				assert.equal(layers[i].width, i ? '20px' : '16px');
				assert.ok(layers[i].z > layers[i].faceZ);
				assert.equal(layers[i].pointer, 'none'); assert.equal(layers[i].hit, true);
				const r = bounds[i];
				const edgePixels = changed(before, after, { x: r.x + 3, y: r.y + 3, width: r.width - 6, height: 18 });
				assert.ok(border === 'off' ? edgePixels === 0 : edgePixels > 20, `${border}: actual upper border pixels ${edgePixels}; card ${i}; ${JSON.stringify(layers[i])}`);
				assert.equal(changed(before, after, { x: r.x + 45, y: r.y + 85, width: 45, height: 35 }), 0, 'card interior stays unchanged');
				layers[i].edgePixels = edgePixels;
			}
			results.push({ border, layers });
		}
		await page.evaluate(() => { sampleCard.classList.add('selected'); handCard.classList.add('selected'); });
		const selected = await page.evaluate(() => [sampleCard, handCard].map(c => ({ before: getComputedStyle(c, '::before').opacity, after: getComputedStyle(c, '::after').opacity, shadow: getComputedStyle(c, '::after').boxShadow })));
		assert.ok(selected.every(s => s.before === '1' && s.after === '1' && s.shadow === 'none'));
		await page.screenshot({ path: path.join(__dirname, 'yjcm-card-border-layer-browser.png') });
		for (const style of ['onlineUI', 'on', 'off', 'babysha', 'codename']) {
			await page.evaluate(style => { document.body.dataset.style = style; fixStyle.textContent = ''; }, style);
			const before = await page.screenshot();
			await page.evaluate(fix => { fixStyle.textContent = fix; }, fix);
			assert.deepEqual(await page.screenshot(), before, `${style}: no visual change`);
		}
		assert.deepEqual(errors, []);
		fs.writeFileSync(path.join(__dirname, 'yjcm-card-border-layer-results.json'), JSON.stringify({ results, selected, isolated: ['onlineUI', 'on', 'off', 'babysha', 'codename'], errors }, null, 2) + '\n');
		console.log('PASS: real card service; off/3 frames; 16px/20px; opaque-face pixels; geometry; input; selection; 5 other styles');
	} finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
