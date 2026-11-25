const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const baseline=process.argv.includes('--baseline'),preview=process.argv.includes('--preview');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');const {dependencies}=require('./xinsha-prompt-engine.cjs');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});const report={cases:[],errors:[]};
 try{
  Object.assign(seed,{mode:'identity',characters:['standard','xianding'],cards:['standard','extra'],extension_十周年UI_newDecadeStyle:'othersOff',extension_十周年UI_loadingStyle:'othersOff',extension_十周年UI_optimizePrompt:'online'});
  const page=await browser.newPage({viewport:{width:1638,height:919}});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());await dependencies(page);
  for(const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])if(/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8')))await page.unroute('**/node_modules/.pnpm/'+file);
  if(baseline)await page.route('**/src/ui/optimizedPrompt.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.resolve(__dirname,'../src/ui/optimizedPrompt.js'),'utf8').replace(/const persistent = dialog\._dialogOlKeepControls[^;]+;/,'const persistent = false;')}));
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);await page.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
  await page.evaluate(async()=>{
   const {game,lib,ui,get,_status}=await import('/noname.js');Object.assign(window,{game,lib,ui,get,_status});game.pause();game.me=game.players[0];game.me.init('sunquan');_status.auto=false;_status.over=false;lib.config.auto_confirm=false;
   ui.arena.classList.remove('choose-character');document.querySelector('.decade-welcome-overlay')?.remove();for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();
   const {installOptionListBeautify}=await import('/extension/雷的一将/utils/optionListBeautify.js');installOptionListBeautify();window.prompts=await import('/extension/十周年UI/src/ui/optimizedPrompt.js');
   game.pause=()=>{_status.paused=true;return new Promise(r=>window.finishChoice=r)};game.resume=()=>{window.finishChoice?.();window.finishChoice=null};game.countChoose=()=>{};
  });
  for(const loading of baseline?[]:['othersOff','dialog_xinsha'])for(const style of ['online','xinsha'])for(const zoom of [1,1.5288461538461537])for(const moon of [false,true])for(const html of [false,true]){
   if(preview&&!(loading==='othersOff'&&style==='online'&&zoom===1&&moon&&html))continue;
   await page.evaluate(({loading,style,zoom,moon,html})=>{
    lib.config.extension_十周年UI_loadingStyle=loading;ui.arena.dataset.loadingStyle=loading;lib.config.extension_十周年UI_optimizePrompt=style;game.documentZoom=window.documentZoom=zoom;document.body.style.zoom=zoom;
    game.uncheck();for(const d of [...ui.dialogs])d.close();for(const c of [...ui.controls])c.close();prompts.clearOptimizedPrompts();
    const parent=game.createEvent('dcrejueyan_cost',false);parent.player=game.me;parent.parent=game.createEvent('dcrejueyan',false);parent.parent.player=game.me;const text='你可以选择一项执行，执行后该项目数值变为1，其余项目数值+1';
    window.choice=game.me.chooseControl(['选项一','选项二','选项三','cancel2']);choice.parent=parent;choice.prompt='###是否发动【诀言】？###'+(html?'<div class="text center">'+text+'</div>':text);choice.choiceList=['摸牌：摸一张牌','拿牌：随机从弃牌堆获得一张牌','拼点：与一名角色拼点，赢的角色对没赢的角色造成1点伤害'];choice.displayIndex=false;
    _status.eventManager.setStatusEvent(choice,true);
    const oldInterval=window.setInterval,oldStyle=lib.config.extension_十周年UI_jindutiaoYangshi;let tick;lib.config.extension_十周年UI_jindutiaoYangshi='4';window.setInterval=callback=>{tick=callback;return oldInterval(()=>{},2147483647)};
    try{window.progress=game.Jindutiaoplayer({id:'option-layout-progress',parent:document.body})}finally{window.setInterval=oldInterval;lib.config.extension_十周年UI_jindutiaoYangshi=oldStyle}
    if(moon)for(let i=0;i<449;i++)tick();
    window.choiceFlow=lib.element.content.chooseControl[0](choice,null,game.me);
   },{loading,style,zoom,moon,html});
   await page.waitForFunction(()=>choice.dialog?.isConnected&&choice.choosing);
   const row=await page.evaluate(async()=>{
    await document.fonts.ready;await new Promise(r=>setTimeout(r,100));prompts.refreshOptimizedPrompt();ui.update();const d=choice.dialog,rect=n=>Element.prototype.getBoundingClientRect.call(n).toJSON();
    const tip=document.querySelector('.dialog-xinsha-prompt-overlay'),bar=progress.bar,button=d.querySelector('.lyj-option-cancel'),scale=rect(d).width/d.offsetWidth;
    return{title:d.querySelector('.caption').textContent,titleDisplay:getComputedStyle(d.querySelector('.caption')).display,prompt:tip.textContent,copies:document.querySelectorAll('.dialog-xinsha-prompt-overlay').length,details:tip.querySelectorAll('.decade-official-detail').length,hint:getComputedStyle(d.querySelector('.lyj-option-hint')).display,tip:rect(tip),bar:rect(bar),button:rect(button),options:rect(d.querySelector('.lyj-option-choices')),gap:(rect(button).top-rect(bar).bottom)/scale,promptGap:(rect(bar).top-rect(tip).bottom)/scale,buttons:d.querySelectorAll('.lyj-option-choice').length};
   });Object.assign(row,{loading,style,zoom,moon,html});report.cases.push(row);
   assert.equal(row.title,'诀言');assert.notEqual(row.titleDisplay,'none');assert.equal(row.prompt,'是否发动“诀言”？');assert.equal(row.copies,1);assert.equal(row.details,0);assert.equal(row.hint,'none');assert.ok(row.gap>=11.9,JSON.stringify(row));assert.ok(Math.abs(row.promptGap-7)<.12);assert.ok(row.options.bottom<=row.tip.top+.2);assert.equal(row.buttons,3);
   if(loading==='othersOff'&&style==='online'&&zoom===1&&moon&&html)await page.screenshot({path:path.join(__dirname,'option-prompt-layout.png')});
   await page.locator('.lyj-option-cancel').last().click();const closed=await page.evaluate(async()=>{await choiceFlow;progress.dispose();return{control:choice.result.control,dialogs:document.querySelectorAll('.lyj-option-dialog').length,copies:document.querySelectorAll('.dialog-xinsha-prompt-overlay').length}});assert.equal(closed.control,'cancel2');assert.equal(closed.copies,0);
  }
  report.comparisons=await page.evaluate(async()=>{
   const {installTableBeautify}=await import('/extension/雷的一将/utils/tableBeautify.js');lib.arenaReady||=[];installTableBeautify();
   const result=[];
   for(const style of ['online','xinsha']){
    lib.config.extension_十周年UI_optimizePrompt=style;const skill=game.createEvent('dcrejueyan',false);skill.player=game.me;
    const compare=game.me.chooseToCompare(game.players[1]);compare.parent=skill;_status.eventManager.setStatusEvent(compare,true);
    leiYijiangTableUI.openCompare('prompt-compare-'+style,game.me,[game.players[1]],'诀言');const dialog=ui.dialog;
    prompts.prepareOptimizedPrompt(dialog);prompts.refreshOptimizedPrompt();
    const snapshots=[];
    for(const name of ['chooseCard','chooseToUse','dcrejueyan']){const child=game.createEvent(name,false);child.player=game.me;child.parent=compare;_status.eventManager.setStatusEvent(child,true);let childDialog;if(name==='chooseCard'){childDialog=child.dialog=ui.create.dialog('请选择拼点牌','hidden');childDialog.open();}prompts.refreshOptimizedPrompt();ui.update();const css=getComputedStyle(dialog),rect=Element.prototype.getBoundingClientRect.call(dialog);snapshots.push({name,closing:dialog.classList.contains('decade-optimized-closing'),display:css.display,visible:css.display!=='none'&&css.visibility!=='hidden'&&rect.width>0,collapsed:!!dialog._dialogOlControls?.collapsed});childDialog?.close();}
    dialog.close();prompts.clearOptimizedPrompts();result.push({style,snapshots,closed:!ui.dialogs.includes(dialog)});
   }return result;
  });
  for(const c of report.comparisons){assert.ok(c.snapshots.every(s=>s.visible&&!s.closing&&!s.collapsed),JSON.stringify(c));assert.equal(c.closed,true);}
  assert.deepEqual(report.errors,[]);console.log('OPTION_PROMPT_LAYOUT_OK',report.cases.length,'native chooseControl cases; single prompt, HTML/plain detail, normal/moon, cancel gap and cleanup');
 }finally{fs.writeFileSync(path.join(__dirname,baseline?'option-prompt-layout-before-results.json':preview?'option-prompt-layout-preview-results.json':'option-prompt-layout-results.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
