const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const { server, chromium } = require('./online-player-tips-browser.cjs');
const root = path.resolve(__dirname, '..');
const after = fs.readFileSync(path.join(root, 'src/styles/player3.css'), 'utf8');
// 去掉本次五阶适配，恢复旧龙旗映射，以当前其他样式为基线复现。
const before = after.replace(/\/\* 五阶同样[\s\S]*?(?=body\[data-style="othersOff"\] #arena > \.player\[data-position="0"\] > \.card-count)/,
 `body[data-style="othersOff"] #arena.decadeUI[data-border-style="dragon4"] > .player[data-border-level="five"] > .hp-wrap,
 body[data-style="othersOff"] #arena.decadeUI[data-border-style="dragon4"][data-border-level="five"] > .player > .hp-wrap {
  --yjcm-hp-bg: url("../../ui/assets/lbtn/yijiang/dragon2_hp_grade_5.png");
 }\n`);
const results = { cases: [], errors: [], failedResources: [] };

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const origin = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 650 } });
  page.on('pageerror', e => results.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) results.failedResources.push(r.url()); });
  await page.route('**/src/styles/player3.css?hp-probe=*', route => route.fulfill({ contentType: 'text/css', body: route.request().url().endsWith('before') ? before : after }));
  async function load(version) {
   await page.setContent(`<!doctype html><meta charset="utf-8">
    <link rel="stylesheet" href="${origin}/layout/default/layout.css">
    <link rel="stylesheet" href="${origin}/extension/十周年UI/src/styles/player3.css?hp-probe=${version}">
    <style>
    body { background:#303840; margin:0; } #arena { inset:0; width:100%; height:100%; }
    #arena > .player { position:absolute!important; left:80px!important; top:100px!important; width:130px!important; height:180px!important; background:#627584!important; }
    #arena > .player[data-position="1"] { left:350px!important; }
    #arena > .player > .hp-wrap > .hp { position:absolute; }
    .label { position:absolute; top:35px; left:50px; color:white; font:18px sans-serif; }
    </style><div id="arena" class="decadeUI"></div>`);
   await page.waitForFunction(() => [...document.querySelectorAll('link')].every(n => n.sheet));
  }
  async function probe({ style, arenaGrade, grade, maxHp, zoom=1, host='othersOff' }) {
   return page.evaluate(async args => {
    const arena = document.querySelector('#arena');
    document.body.dataset.style = args.host;
    arena.dataset.borderStyle = args.style;
    arena.dataset.borderLevel = args.arenaGrade;
    arena.style.zoom = args.zoom;
    arena.innerHTML = [0, 1].map(pos => `<div class="player fullskin" data-position="${pos}" ${args.grade ? `data-border-level="${args.grade}"` : ''} data-max-hp="${args.maxHp}"><div class="hp-wrap"><div class="hp${args.maxHp === 'hujia' ? ' textstyle' : ''}" data-condition="high">${args.maxHp === 'hujia' ? '9/9<div></div>' : '<div></div>'.repeat(Number(args.maxHp))}</div></div></div>`).join('');
    await new Promise(requestAnimationFrame);
    return [...arena.children].map(p => {
     const wrap=p.querySelector('.hp-wrap'), hp=wrap.firstElementChild, pip=hp.lastElementChild;
     const w=wrap.getBoundingClientRect(), r=p.getBoundingClientRect(), b=pip.getBoundingClientRect();
     const css=getComputedStyle(wrap), bg=getComputedStyle(wrap,'::before'), h=getComputedStyle(hp);
     return { pos:p.dataset.position, source:bg.borderImageSource, slice:bg.borderImageSlice,
      bgHeight:parseFloat(bg.height), wrapBorder:css.borderImageSource, hpBottom:parseFloat(h.bottom),
      centerX:(b.left+b.width/2-w.left)/(w.height/105), centerBottom:(w.bottom-b.top-b.height/2)/(w.height/105),
      right:(r.right-w.right)/args.zoom, bottom:(r.bottom-w.bottom)/args.zoom,
      geometry:[css.right,css.bottom,css.width,css.height,css.transform,bg.borderImageSource,bg.borderImageSlice,bg.height,h.left,h.bottom,h.marginLeft,pip.offsetWidth,pip.offsetHeight] };
    });
   }, { style, arenaGrade, grade, maxHp, zoom, host });
  }
  const styles=['xinsha','dragon2','dragon3','dragon4'];
  const ordinary = new Map();
  await load('before');
  results.before = {};
  for(const style of styles) results.before[style]=await probe({style,arenaGrade:'random',grade:'five',maxHp:'4'});
  for(const host of ['othersOff','onlineUI','on']) for(const style of styles) for(const grade of (host==='othersOff'?['one','two','three','four']:['one','two','three','four','five'])) {
   const key=JSON.stringify({host,style,grade});
   ordinary.set(key, await probe({host,style,arenaGrade:'random',grade,maxHp:'4'}));
  }
  // 源文件及截图都保留，旧版龙旗用错图，玄墨/耀金使用大图九宫格。
  assert.match(results.before.dragon4[0].source,/dragon2_hp_grade_5/);
  assert.match(results.before.dragon2[0].wrapBorder,/dragon2_big_hp_grade_5/);
  assert.match(results.before.dragon3[0].wrapBorder,/dragon2_big_hp_grade_5/);
  await load('after');
  for(const zoom of [1,1.5]) for(const style of styles) for(const maxHp of ['1','2','3','4','5','hujia']) for(const mode of ['random','uniform']) {
   const args={style,arenaGrade:mode==='random'?'random':'five',grade:mode==='random'?'five':null,maxHp,zoom};
   const rows=await probe(args), count=maxHp==='hujia'?5:Number(maxHp), edge=style==='dragon4'?14:6;
   const source=style==='dragon4'?'dragon4_hp_grade_5':style==='xinsha'?'yjcm_general_hp_bg':'dragon2_hp_grade_5';
   for(const r of rows) {
    assert.ok(r.source.includes(source),JSON.stringify({args,r}));
    assert.equal(r.wrapBorder,'none'); assert.equal(r.slice,'146 0 30 fill');
    assert.ok(Math.abs(r.bgHeight-Math.max(178,count*20+(style==='dragon4'?135:130)+edge))<.1,JSON.stringify({args,r}));
    assert.ok(Math.abs(r.centerX-25)<.1,JSON.stringify({args,r}));
    assert.ok(Math.abs(r.centerBottom-(edge+(maxHp==='hujia'?15:10)))<.1,JSON.stringify({args,r}));
    assert.ok(Math.abs(r.right-2)<.1 && Math.abs(r.bottom-4)<.1,JSON.stringify({args,r}));
   }
   results.cases.push({...args,rows});
  }
  for(const [key,expected] of ordinary) {
   const args=JSON.parse(key), actual=await probe({...args,arenaGrade:'random',maxHp:'4'});
   assert.deepEqual(actual.map(r=>r.geometry),expected.map(r=>r.geometry),key);
  }
  // arena 为五阶时，随机/显式低阶角色仍使用自己的普通框。
  for(const style of styles) {
   const random=await probe({style,arenaGrade:'random',grade:'two',maxHp:'4'});
   const uniform=await probe({style,arenaGrade:'five',grade:'two',maxHp:'4'});
   assert.ok(!uniform[0].source.includes('grade_5'),JSON.stringify({style,uniform}));
   assert.deepEqual(uniform.map(r=>r.geometry),random.map(r=>r.geometry));
  }
  // 保存四种五阶框及两个视角的真实 CSS 绘制，标签只用于验证图。
  await page.evaluate(() => { document.body.dataset.style='othersOff'; document.querySelector('#arena').remove(); });
  await page.evaluate(styles => {
   for(let col=0;col<styles.length;col++) {
    const arena=document.createElement('div'); arena.id='arena'; arena.className='decadeUI';
    arena.dataset.borderStyle=styles[col]; arena.dataset.borderLevel='random';
    arena.style.cssText=`left:${col*310}px;top:0;width:300px;height:620px;position:absolute`;
    arena.innerHTML=`<span class="label">${styles[col]} / five</span>`+[0,1].map(pos=>`<div class="player fullskin" data-position="${pos}" data-border-level="five" data-max-hp="4" style="left:80px!important;top:${90+pos*270}px!important"><div class="hp-wrap"><div class="hp" data-condition="high"><div></div><div></div><div></div><div></div></div></div></div>`).join('');
    document.body.appendChild(arena);
   }
  },styles);
  await page.waitForTimeout(300);
  const rendered=PNG.sync.read(await page.screenshot({path:path.join(__dirname,'hp-wrap-matrix.png')}));
  const goldCards=await page.evaluate(()=>[...document.querySelectorAll('#arena[data-border-style="dragon4"] > .player')].map(p=>{const r=p.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
  results.frameEdges=goldCards.map(card=>{
   let right=-Infinity,bottom=-Infinity;
   for(let y=Math.floor(card.top);y<card.bottom+5;y++)for(let x=Math.floor(card.left);x<card.right+5;x++){
    const at=(y*rendered.width+x)*4,[r,g,b]=rendered.data.subarray(at,at+3);
    if(r>140&&g>75&&r>g*1.1&&g>b*1.3){right=Math.max(right,x+.5);bottom=Math.max(bottom,y+.5)}
   }
   return {rightInset:card.right-right,bottomInset:card.bottom-bottom};
  });
  // 参考图的金边贴牌右缘，底部龙纹略超出牌底；不能将外溢龙纹当作横线。
  assert.ok(results.frameEdges.every(r=>Math.abs(r.rightInset)<1.5&&r.bottomInset>=-4&&r.bottomInset<1.5),JSON.stringify(results.frameEdges));
  const centers=await page.evaluate(() => [...document.querySelectorAll('.hp > div')].map(n => {
   const r=n.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
  }));
  await page.addStyleTag({content:'.hp > div { opacity:0!important; transition:none!important; }'});
  const background=PNG.sync.read(await page.screenshot());
  results.backgroundPixels=centers.map(({x,y})=>{
   const at=(Math.floor(y)*background.width+Math.floor(x))*4;
   return [...background.data.subarray(at,at+3)];
  });
  // 隐去血珠后，每一颗中心下方必须实际画到棕色槽内，而不是只验 CSS 坐标。
  assert.ok(results.backgroundPixels.every(([r,g,b])=>r>g&&g>b&&b<70),JSON.stringify(results.backgroundPixels));
  assert.deepEqual(results.errors,[]); assert.deepEqual(results.failedResources,[]);
  results.ordinaryAndOtherStyleCases=ordinary.size;
  results.seatChecks=results.cases.length*2;
  fs.writeFileSync(path.join(__dirname,'hp-wrap-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({passed:true,seatChecks:results.seatChecks,isolationCases:ordinary.size,errors:results.errors,failedResources:results.failedResources}));
 } finally { await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
