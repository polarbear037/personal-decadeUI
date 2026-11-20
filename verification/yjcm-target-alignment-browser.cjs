// 用当前牌局实际角色DOM复现暗将/动皮无不透明头像的遮挡，量取原图亮边到角色边界的误差。
const fs=require('node:fs'),path=require('node:path');
const {server,chromium,assert}=require('../../雷的ol/verification/card-beautify-browser.cjs');
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'yjcm-target-seat-fixture.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'yjcm-target-effects-source.json'),'utf8'));
const results=[];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1180,height:1320},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/__card_verification__');
  for(const file of ['layout/default/layout.css','layout/nova/layout.css','extension/十周年UI/src/styles/extension.css','extension/十周年UI/src/styles/player3.css','extension/十周年UI/src/styles/layout-xinsha.css'])await page.addStyleTag({url:origin+'/'+file});
  await page.addStyleTag({content:`html,body{margin:0;width:100%;height:100%;background:#655640}#arena{position:absolute;inset:0;width:100%;height:100%;margin:0}#arena>.player{position:absolute!important;width:130px!important;height:180px!important;bottom:auto!important;transition:none!important;transform:scale(1.3)!important;transform-origin:0 0!important}.label{position:absolute;left:0;top:calc(100% + 15px);width:180px;color:white;font:14px sans-serif;z-index:100}.player>.primary-avatar{clip-path:none!important}`});
  await page.evaluate(({html,origin})=>{
   document.body.dataset.style='othersOff';document.body.innerHTML='<div id="arena" class="decadeUI selecting" data-mode="identity" data-outcrop-skin="shizhounian" data-border-style="dragon4"></div>';
   const states=[['idle',''],['white','selectable'],['gold','selectable selected'],['red','target'],['green','glow_phase']];
   for(const [row,kind] of ['hidden','dynamic','static','outcrop'].entries())for(const [col,[id,state]] of states.entries()){
    const template=document.createElement('template');template.innerHTML=html.replaceAll('http://localhost:8089',origin);const p=template.content.firstElementChild;
    p.className='player fullskin '+(kind==='hidden'?'unseen':kind==='dynamic'?'d-skin':'')+' '+state;p.id=`${kind}-${id}`;p.dataset.position='2';
    p.style.cssText=`left:${40+col*230}px!important;top:${45+row*310}px!important`;
    const avatar=p.querySelector('.primary-avatar');avatar.classList.toggle('has-outcrop',kind==='outcrop');avatar.style.backgroundImage=`url('${origin}/image/character/caocao.jpg')`;
    p.querySelector('.dynamic-wrap')?.replaceChildren();
    const label=document.createElement('span');label.className='label';label.textContent=`${kind} / ${id}`;p.append(label);document.querySelector('#arena').append(p);
   }
  },{html:snapshot.html,origin});
  for(const border of ['xinsha','dragon2','dragon3','dragon4']){
   await page.evaluate(border=>document.querySelector('#arena').dataset.borderStyle=border,border);
   await page.evaluate(async()=>{const images=new Set([...document.querySelectorAll('.player')].flatMap(p=>[getComputedStyle(p).backgroundImage,getComputedStyle(p,'::before').backgroundImage]));await Promise.all([...images].filter(v=>v!=='none').map(async v=>{const im=new Image();im.src=v.match(/url\("?([^"\)]+)/)[1];await im.decode();}));});
   await page.waitForTimeout(2200);
   const records=await page.evaluate(()=>[...document.querySelectorAll('.player')].map(p=>{const r=p.getBoundingClientRect(),s=getComputedStyle(p,'::before'),b=getComputedStyle(p,'::after');return{id:p.id,rect:{x:r.x,y:r.y,width:r.width,height:r.height},root:{w:p.clientWidth,h:p.clientHeight},effect:{url:s.backgroundImage,w:parseFloat(s.width),h:parseFloat(s.height),x:parseFloat(s.left),y:parseFloat(s.top),z:s.zIndex,scale:new DOMMatrix(s.transform).a},backdrop:{image:b.backgroundImage,z:b.zIndex}};}));
   for(const p of records){
    assert.equal(p.effect.z,'-1');assert.equal(p.backdrop.z,'0');assert.match(p.backdrop.image,/player-bg\/bj1.png/);
    if(p.id.endsWith('-idle'))continue;
    const file=p.effect.url.match(/([^/]+)\.png/)[1];
    const asset=source.assets.find(r=>file===r.name+'_play_dynamic');
    const ref=file==='paiju_target_actived'?source.geometry.white:{canvas:asset&&[asset.width,asset.height],bright_ridge_lrtb:asset?.bright_ridge_lrtb};assert.ok(ref.canvas,file);
    const [w,h]=ref.canvas,[l,r,t,b]=ref.bright_ridge_lrtb;
    const isHalo=/-red$|-green$/.test(p.id),scale=p.effect.scale;
    const isGold=p.id.endsWith('-gold');
    assert.equal(scale,isHalo?1.03:isGold?1.05:1,'selected orange and turn/response use separate scales');
    const width=p.effect.w*scale,height=p.effect.h*scale,left=p.effect.x-width/2,top=p.effect.y-height/2;
    p.ridgeErrors=[left+l*width/w,left+r*width/w-p.root.w,top+t*height/h,top+b*height/h-p.root.h];
    // APNG亮边中心不一定等于透明画布中心；CSS绕画布中心缩放时保留这份亚像素偏移。
    const shiftX=((l+r-w)/2)*p.effect.w/w*(scale-1),shiftY=((t+b-h)/2)*p.effect.h/h*(scale-1);
    const outset=(scale-1)/2;
    const expected=p.id.endsWith('-white')?[-3,3,-3,3]:[-p.root.w*outset+shiftX,p.root.w*outset+shiftX,-p.root.h*outset+shiftY,p.root.h*outset+shiftY];
    assert.ok(p.ridgeErrors.every((v,i)=>Math.abs(v-expected[i])<.04),`${border}/${p.id}: bright-edge mismatch ${p.ridgeErrors}`);
   }
   await page.screenshot({path:path.join(__dirname,`yjcm-target-alignment-${border}.png`)});
   results.push({border,records});console.log(`${border}: real player DOM, hidden/dynamic/static, bright-edge alignment PASS`);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'yjcm-target-alignment-results.json'),JSON.stringify(results,null,2)+'\n');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
