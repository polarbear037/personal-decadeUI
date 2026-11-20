const fs=require('node:fs'),path=require('node:path');
const {server,chromium,assert}=require('../../雷的ol/verification/card-beautify-browser.cjs');
const base='/extension/十周年UI/';
const css=fs.readFileSync(path.join(__dirname,'../src/styles/player3.css'),'utf8');
const newRules=css.slice(css.indexOf('/** 原版座位状态'),css.indexOf('/** 遮罩层 */'));
const actions=fs.readFileSync(path.join(__dirname,'../src/overrides/player/card-actions-xinsha.js'),'utf8');
const useCardHook=actions.slice(actions.indexOf('function n()'),actions.indexOf('function s()'));
const results=[];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const [index,style] of ['on','off','othersOff','onlineUI','babysha','codename'].entries()){
   const page=await browser.newPage({viewport:{width:1368,height:760}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&r.url().includes('/effects/xinsha/'))errors.push(`${r.status()} ${r.url()}`);});
   await page.goto(origin+'/__card_verification__');
   for(const f of ['layout/default/layout.css','layout/long2/layout.css',`extension/十周年UI/src/styles/player${index+1}.css`,`extension/十周年UI/src/styles/layout${style==='othersOff'?'-xinsha':style==='onlineUI'?'-online':''}.css`])await page.addStyleTag({url:origin+'/'+f});
   await page.addStyleTag({content:`html,body{margin:0;width:100%;height:100%;background:#574631}#arena{position:absolute;inset:0;width:100%;height:100%;margin:0}#arena>.player{position:absolute!important;top:100px;bottom:auto!important;width:130px!important;height:180px!important;transition:none!important;border:0!important;border-radius:6px;background:#17120e!important;box-shadow:0 0 0 1px #b6a67d}.player>.primary-avatar{position:absolute;inset:0;width:100%;height:100%;z-index:62;background:url('/image/character/caocao.jpg') center/cover no-repeat;border-radius:6px;pointer-events:none}.label{position:absolute;left:50%;top:calc(100% + 32px);width:190px;transform:translateX(-50%);text-align:center;font:18px sans-serif;color:white;z-index:100}`});
   await page.evaluate(({style})=>{
    document.body.dataset.style=style;
    document.body.innerHTML='<div id="arena" class="decadeUI selecting" data-border-style="xinsha"></div>';
    const states=[['idle','',1],['available','selectable',1],['selected','selectable selected',1],['other-turn','glow_phase',1],['self-response','glow_phase',0],['target','target',1],['selected-target','selectable selected target',1],['available-turn','selectable glow_phase',1]];
    states.forEach(([id,classes,position],i)=>{
     const p=document.createElement('div');p.className='player '+classes;p.id=id;p.dataset.position=position;p.style.left=100+(i%4)*320+'px';p.style.top=80+Math.floor(i/4)*340+'px';
     p.innerHTML='<div class="primary-avatar"></div><span class="label">'+id+'</span>';document.querySelector('#arena').append(p);
    });
    window.readTarget=()=>[...document.querySelectorAll('.player')].map(p=>{
     const r=p.getBoundingClientRect(),read=which=>{const s=getComputedStyle(p,which);return{image:s.backgroundImage,opacity:Number(s.opacity),width:parseFloat(s.width),height:parseFloat(s.height),left:parseFloat(s.left),top:parseFloat(s.top),animation:s.animationName,pointer:s.pointerEvents,z:s.zIndex,scale:new DOMMatrix(s.transform).a};};
     return{id:p.id,width:r.width,height:r.height,shadow:getComputedStyle(p).boxShadow,before:read('::before'),after:read('::after')};
    });
   },{style});
   if(style!=='othersOff'){
    const before=await page.evaluate(()=>readTarget());
    await page.addStyleTag({content:newRules.replaceAll('../../image/',origin+base+'image/')});
    assert.deepEqual(await page.evaluate(()=>readTarget()),before,`${style}: new target rules are isolated`);
    results.push({style,isolated:true});
   }else{
    for(const border of ['xinsha','dragon2','dragon3','dragon4']){
     await page.evaluate(border=>document.querySelector('#arena').dataset.borderStyle=border,border);
     await page.evaluate(async()=>{const images=new Set(readTarget().flatMap(p=>[p.before.image,p.after.image]).filter(v=>v!=='none'));await Promise.all([...images].map(v=>{const image=new Image();image.src=v.match(/url\("?([^"\)]+)/)[1];return image.decode();}));});
     await page.waitForTimeout(2100);
     const state=await page.evaluate(()=>readTarget()),byId=id=>state.find(s=>s.id===id),variant=border==='dragon2'?'m2':'m';
     assert.equal(byId('idle').before.opacity,0);assert.equal(byId('idle').after.opacity,1);
     assert.match(byId('available').before.image,/paiju_target_actived\.png/);
     assert.ok(byId('available').before.opacity>=.45&&byId('available').before.opacity<=1);
     assert.match(byId('available').before.animation,/yjcm-target-breathe/);
     assert.equal(byId('available').before.z,'-1','white stays behind outcrop portraits with the colored frames');
     for(const id of ['selected','selected-target']){
      assert.ok(byId(id).before.image.includes(`paidiorange_${variant}_play_dynamic.png`));
      assert.equal(byId(id).before.opacity,1);assert.equal(byId(id).after.opacity,1);
      assert.equal(byId(id).before.scale,1.05,'orange selected-target frame is enlarged independently');
     }
     assert.equal(byId('selected-target').shadow,'none','no native red shadow over selected gold effect');
     assert.ok(byId('other-turn').before.image.includes(`paidigreen_${variant}_play_dynamic.png`));
     for(const id of ['self-response','target'])assert.ok(byId(id).before.image.includes(`paidired_${variant}_play_dynamic.png`));
     for(const id of ['self-response','target','other-turn'])assert.equal(byId(id).before.scale,1.03);
     // 执行实际一将useCard包装器：给行动者自身加target，原生finish仍须运行并清理。
     const selfUse=await page.evaluate(useCardHook=>{
      const arena=document.querySelector('#arena'),observations=[];
      const before=p=>{const s=getComputedStyle(p,'::before');return {image:s.backgroundImage,width:s.width,height:s.height,transform:s.transform,root:getComputedStyle(p).transform};};
      const base={useCard(){return{step:1,targets:[this],handlers:[],pushHandler(name,handler){this.handlers.push(handler)},finish(){this.nativeFinished=true}}}};
      const use=Function('e','t','return ('+useCardHook+')')(()=>{},()=>base);
      for(const shake of ['off','zoom']){
       arena.dataset.target_shake=shake;
       for(const id of ['other-turn','self-response']){
        const p=document.querySelector('#'+id),normal=before(p),event=use.call(p);
        for(const handler of event.handlers)handler(event,{state:'begin'});
        const targeted=before(p);event.finish();observations.push({shake,id,normal,targeted,finished:event.nativeFinished,cleared:!p.classList.contains('target')});
       }
      }
      delete arena.dataset.target_shake;
      return observations;
     },useCardHook);
     for(const record of selfUse){assert.deepEqual(record.targeted,record.normal,`${record.id}/${record.shake}: self use must not change seat state or enlarge its frame`);assert.equal(record.finished,true);assert.equal(record.cleared,true);}
     assert.match(byId('available-turn').before.image,/paiju_target_actived\.png/);
     await page.evaluate(()=>document.querySelector('#arena').classList.remove('selecting'));
     assert.equal((await page.evaluate(()=>readTarget())).find(p=>p.id==='self-response').before.opacity,0,'self phase without an input request has no response frame');
     await page.evaluate(()=>document.querySelector('#arena').classList.add('selecting'));
     for(const p of state){assert.equal(p.before.pointer,'none');assert.equal(p.after.pointer,'none');assert.ok(!JSON.stringify(p).includes('sprites_glow_'),'old sprites are absent');}
     const selected=byId('selected');
     assert.ok(Math.abs(selected.before.width-130*(border==='dragon2'?206/158:229/175.5))<.1,'APNG bright frame, rather than transparent canvas, matches player width');
     assert.ok(Math.abs(selected.before.height-180*282/229.5)<.1,'APNG bright frame matches player height');
     assert.equal(selected.before.z,'-1');assert.equal(selected.after.z,'0');
     const rect=await page.locator('#selected').boundingBox(),clip={x:rect.x-24,y:rect.y-24,width:rect.width+48,height:rect.height+48};
     const first=await page.screenshot({clip});await page.waitForTimeout(220);const second=await page.screenshot({clip});
     assert.ok(!first.equals(second),'native APNG visibly animates behind avatar');
     // 取消与重新选中只改变状态图，不留旧金框。
     await page.evaluate(()=>document.querySelector('#selected').classList.remove('selected'));
     assert.match((await page.evaluate(()=>readTarget())).find(p=>p.id==='selected').before.image,/paiju_target_actived/);
     await page.evaluate(()=>document.querySelector('#selected').classList.add('selected'));
     await page.screenshot({path:path.join(__dirname,`yjcm-target-effects-${border}.png`)});
     results.push({style,border,states:state,animated:true,selfUse});
    }
   }
   assert.deepEqual(errors,[]);console.log(`${style}: PASS (${style==='othersOff'?'4 border types, 8 states, APNG motion and geometry':'style isolation'})`);await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'yjcm-target-effects-browser-results.json'),JSON.stringify(results,null,2)+'\n');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
