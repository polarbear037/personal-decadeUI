const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { server, chromium } = require('./online-player-tips-browser.cjs');
const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.resolve(root, '../雷霆/pages/famous/miniChange.js'), 'utf8');
const createTrigger = renderer.match(/function createTrigger\(player\) \{[\s\S]*?(?=\nfunction getPlayerBorderLevel)/)[0];
const result = { cases: [], errors: [] };
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => result.errors.push(e.message));
    await page.setContent(`<!doctype html><meta charset="utf-8">
      <link rel="stylesheet" href="${origin}/layout/default/layout.css">
      <link rel="stylesheet" href="${origin}/extension/十周年UI/src/styles/player3.css">
      <link rel="stylesheet" href="${origin}/extension/雷霆/pages/famous/miniChange.css">
      <style>@font-face{font-family:yuanli;src:url('${origin}/extension/雷霆/font/fzbw.ttf')}
      body{margin:0;background:#343d43}#arena{inset:0}
      #arena>.player{left:200px!important;top:140px!important;width:130px!important;height:180px!important;background:#646454}
      .avatar-name{color:white}.avatar-name span{color:#5f5!important}
      </style><div id="arena" class="decadeUI"></div>`);
    await page.waitForFunction(() => [...document.querySelectorAll('link')].every(n => n.sheet));
    await page.evaluate('(() => {' + createTrigger + '\nglobalThis.makeTrigger=createTrigger;})()');
    for (const border of ['xinsha', 'dragon2', 'dragon3', 'dragon4']) {
      for (const zoom of [1, 1.5]) {
        for (const text of ['徐馨', '谋吴懿', '<span>谋</span>吴懿', '神武将体验后缀很长的名字']) {
          await page.mouse.move(800, 600);
          const normal = await page.evaluate(async ({ border, zoom, text }) => {
            document.body.dataset.style = 'othersOff';
            const arena = document.querySelector('#arena');
            arena.dataset.borderStyle = border; arena.dataset.borderLevel = 'five'; arena.style.zoom = zoom;
            arena.innerHTML = `<div class="player fullskin" data-position="0"><div class="camp-wrap" data-camp="shu"><div class="camp-back"></div><div class="camp-border"></div><div class="camp-name"></div><div class="avatar-name">${text}</div></div></div>`;
            const player = arena.firstElementChild, name = player.querySelector('.avatar-name');
            const button = makeTrigger(player);
            if (!button.parentNode) player.appendChild(button);
            await document.fonts.ready;
            await new Promise(requestAnimationFrame);
            const r = name.getBoundingClientRect(), b = button.getBoundingClientRect();
            const range = document.createRange(); range.selectNodeContents(name);
            const glyph = range.getBoundingClientRect(), css = getComputedStyle(name);
            return { name: { x:r.x, y:r.y, width:r.width, height:r.height }, button: { x:b.x,y:b.y,width:b.width,height:b.height }, centerError: Math.abs((glyph.top+glyph.bottom-r.top-r.bottom)/2), overflow: name.scrollHeight > name.clientHeight, align:css.textAlign, ellipsis:css.textOverflow, opacity:getComputedStyle(button).opacity, whiteSpace:css.whiteSpace };
          }, { border, zoom, text });
          assert.equal(normal.align, 'center');
          assert.equal(normal.ellipsis, 'ellipsis');
          assert.equal(normal.whiteSpace, 'nowrap');
          assert.equal(normal.opacity, '0');
          if (!normal.overflow) assert.ok(normal.centerError <= 1, JSON.stringify(normal));
          assert.ok(Math.abs(normal.name.x+normal.name.width/2-normal.button.x-normal.button.width/2) < 1, '按钮与姓名横向中心对齐');
          assert.ok(Math.abs(normal.name.y+normal.name.height/2-normal.button.y-normal.button.height/2) < 1, '按钮与姓名竖向中心对齐');
          assert.ok(Math.abs(normal.button.width/normal.button.height-27/71) < .001, '保留原版27×71比例');
          await page.mouse.move(normal.name.x + normal.name.width / 2, normal.name.y + normal.name.height / 2);
          const hover = await page.evaluate(() => {
            const n=document.querySelector('.avatar-name'), b=document.querySelector('.is-name-trigger'), r=b.getBoundingClientRect();
            return { color:getComputedStyle(n).color, opacity:getComputedStyle(b).opacity, pointer:getComputedStyle(b).pointerEvents, hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b, prefix:n.firstElementChild && getComputedStyle(n.firstElementChild).visibility };
          });
          assert.equal(hover.opacity, '1'); assert.equal(hover.color, 'rgba(0, 0, 0, 0)'); assert.equal(hover.pointer, 'auto'); assert.equal(hover.hit, true);
          if (text.includes('<span>')) assert.equal(hover.prefix, 'hidden');
          await page.mouse.move(800, 600);
          assert.equal(await page.$eval('.is-name-trigger', n=>getComputedStyle(n).opacity), '0');
          assert.notEqual(await page.$eval('.avatar-name', n=>getComputedStyle(n).color), 'rgba(0, 0, 0, 0)');
          result.cases.push({ border, zoom, text, ...normal });
        }
      }
    }
    await page.$eval('.avatar-name', n => n.innerHTML = '<span>谋</span>吴懿');
    assert.equal(await page.locator('.camp-wrap>.is-name-trigger').count(), 1, '更新姓名不移除按钮');
    result.countries = [];
    for (const [camp, id] of [['wei',1],['shu',2],['wu',3],['qun',4],['shen',5],['shen2',5],['ye',101],['jin',4]]) {
      await page.mouse.move(800, 600);
      await page.$eval('.camp-wrap', (n,camp)=>n.dataset.camp=camp,camp);
      const normal = await page.$eval('.is-name-trigger', n=>getComputedStyle(n).backgroundImage);
      assert.ok(normal.includes(`seatSkinBtnNormal${id}.png`));
      const r=await page.locator('.avatar-name').boundingBox();
      await page.mouse.move(r.x+r.width/2,r.y+r.height/2);
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      // 姓名 hover 揭示按钮后，再实际移入按钮验证它自己的 over 态。
      await page.mouse.move(r.x+r.width/2+.2,r.y+r.height/2);
      const over=await page.$eval('.is-name-trigger', n=>getComputedStyle(n).backgroundImage);
      assert.ok(over.includes(`seatSkinBtnOver${id}.png`), `${camp}: ${over}; ${JSON.stringify(await page.$eval('.is-name-trigger',n=>{const r=n.getBoundingClientRect();return {hover:n.matches(':hover'),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.className,rect:[r.x,r.y,r.width,r.height],opacity:getComputedStyle(n).opacity,pointer:getComputedStyle(n).pointerEvents}}))}`);
      for (const url of [normal,over]) await page.evaluate(async url=>{const image=new Image();image.src=url.slice(5,-2);await image.decode();if(image.naturalWidth!==27||image.naturalHeight!==71)throw new Error('Incorrect official button size');},url);
      result.countries.push({camp,id,normal,over});
    }
    await page.$eval('.camp-wrap', n=>n.dataset.camp='shu');
    const nameBox = await page.locator('.avatar-name').boundingBox();
    await page.mouse.move(nameBox.x+nameBox.width/2,nameBox.y+nameBox.height/2);
    await page.screenshot({ path:path.join(__dirname,'yjcm-name-skin-hover.png') });
    await page.mouse.move(800, 600);
    await page.screenshot({ path:path.join(__dirname,'yjcm-name-skin-centered.png') });
    for (const host of ['onlineUI', 'on']) {
      const isolation = await page.evaluate(host => {
        document.body.dataset.style=host;
        const p=document.querySelector('.player');p.querySelector('.is-name-trigger')?.remove();
        const b=makeTrigger(p);if(!b.parentNode)p.appendChild(b);
        return { parent:b.parentNode===p, nameTrigger:b.classList.contains('is-name-trigger') };
      }, host);
      assert.deepEqual(isolation,{parent:true,nameTrigger:false});
    }
    assert.deepEqual(result.errors, []);
    result.passed = true;
    console.log(`YJCM_NAME_SKIN_BROWSER_OK ${result.cases.length} name/layout cases, ${result.countries.length} country mappings`);
  } finally {
    fs.writeFileSync(path.join(__dirname,'yjcm-name-skin-results.json'),JSON.stringify(result,null,2));
    await browser.close(); server.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
