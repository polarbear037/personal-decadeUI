const fs=require('node:fs'),path=require('node:path');
async function installWorkerFixture(page,style){
 await page.route('**/chukuangWorker.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.resolve(__dirname,'../../皮肤切换/chukuangWorker.js'),'utf8')+`
self.addEventListener('message',e=>{if(e.data.message!=='__SKILL_PROBE')return;
 const renderers=['3.6','4.0'].map(v=>playerAnimation.getAnni(null,v));
 self.postMessage({message:'__SKILL_PROBE',parents:Object.keys(htmlElementMap).length,nodes:renderers.flatMap(r=>(r.nodes||[]).filter(n=>n.name?.includes('/skill-button/')).map(n=>({name:n.name,id:n.id,completed:n.completed,opacity:n.renderOpacity,mvp:Array.from(n.mvp.values),canvas:[r.canvas.width,r.canvas.height],rect:n.referNode?.getBoundingClientRect()})))});
});` }));
 await page.addStyleTag({url:'/extension/皮肤切换/style/edit.css'});
 await page.evaluate(async style=>{
  const {lib,game,ui,_status}=await import('/noname.js');lib.arenaReady||=[];
  const {createChukuangWorkerApi}=await import('/extension/皮肤切换/js/modules/chukuang-worker-api.js');
  window.__skillWorkerErrors=[];
  window.skinSwitch={url:'/extension/皮肤切换/',isMobile:()=>false,configKey:{},...createChukuangWorkerApi(lib,ui,game,_status)};
  skinSwitch.chukuangWorkerOnMessage={init(){skinSwitch.chukuangWorker.addEventListener('error',e=>__skillWorkerErrors.push(e.message));}};
  window.__skillModule=await import(`/extension/${style==='onlineUI'?'雷的ol':'雷的一将'}/utils/skillButtonEffects.js`);
  __skillModule.installSkillButtonEffects();
  window.__skillProbe=()=>new Promise(resolve=>{
   const worker=skinSwitch.chukuangWorker;
   const callback=e=>{if(e.data.message!=='__SKILL_PROBE')return;worker.removeEventListener('message',callback);resolve(e.data);};
   worker.addEventListener('message',callback);worker.postMessage({message:'__SKILL_PROBE'});
  });
 },style);
}
module.exports={installWorkerFixture};
