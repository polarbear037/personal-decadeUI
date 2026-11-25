const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server,chromium,seed}=require('./online-player-tips-browser.cjs');
const {dependencies}=require('./xinsha-prompt-engine.cjs');
const style=process.argv.includes('--online')?'onlineUI':process.argv.includes('--decade')?'on':'othersOff';
(async()=>{
 const report={cases:[],errors:[]};await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  Object.assign(seed,{mode:'identity',characters:['standard','xianding'],cards:['standard','extra'],hp_style:'round',game_speed:'vfast',duration:100,extension_十周年UI_newDecadeStyle:style,extension_十周年UI_optimizePrompt:'xinsha'});
  const page=await browser.newPage({viewport:{width:1638,height:919}});page.on('pageerror',e=>{report.errors.push(e.stack);console.log('PAGE_ERROR',e.stack)});page.on('dialog',d=>d.accept());await dependencies(page);
  for(const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js','error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js'])if(/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8')))await page.unroute('**/node_modules/.pnpm/'+file);
  await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);await page.locator('#arena>.player').nth(1).waitFor({state:'attached',timeout:45000});
  await page.evaluate(async()=>{
   const {game,ui,lib,_status}=await import('/noname.js');window.cancelProbe={done:false,cases:[],presented:0};
   lib.skill._initial_control_presentation={trigger:{player:'useSkillBegin'},forced:true,silent:true,charlotte:true,async content(){cancelProbe.presented++}};game.addGlobalSkill('_initial_control_presentation');
   lib.skill._initial_control_probe={trigger:{global:'phaseUseBegin'},forced:true,silent:true,charlotte:true,firstDo:true,priority:Infinity,filter:()=>!cancelProbe.started,async content(){
    cancelProbe.started=true;for(const p of game.players){p.init('caocao');p.removeSkills(p.getSkills());}
    // 此夹具跳过选将；先关闭选将阶段遗留的独立“确定”，再走真实出牌选择。
    for(const c of [...ui.controls])c.close();
   lib.skill.initial_control_another={enable:'phaseUse',usable:1,filterTarget:lib.filter.notMe,async content(event, trigger, player){const picked=await player.chooseControl({controls:['basic','trick'],prompt:'另一主动技能：选择一项',ai:()=>0}).forResult();await player.draw(1);}};lib.translate.initial_control_another='通用测试';
   lib.skill.initial_control_after_effect={...lib.skill.initial_control_another,async content(event, trigger, player){await player.draw(1);await player.chooseControl({controls:['basic','trick'],prompt:'效果后的强制选择',ai:()=>0}).forResult();}};lib.translate.initial_control_after_effect='效果之后';
   lib.skill.initial_control_prepared={...lib.skill.initial_control_another,async contentBefore(event, trigger, player){await player.draw(1);}};lib.translate.initial_control_prepared='已付代价';
   const skills=lib.config.extension_十周年UI_newDecadeStyle==='othersOff'?['dccaiyun','initial_control_another','initial_control_after_effect','initial_control_prepared']:['dccaiyun','initial_control_another'];
   const actor=game.me,target=game.players.find(p=>p!==actor);actor.addSkills(skills);
    if(_status.auto)ui.click.auto('forced');lib.config.auto_confirm=false;
    for(const skill of skills)for(const cancel of lib.config.extension_十周年UI_newDecadeStyle==='othersOff'&&!['initial_control_after_effect','initial_control_prepared'].includes(skill)?[true,false]:[false]){
     actor.removeSkill('dccaiyun_eff');target.removeSkill('dccaiyun_eff');
     const row={cancel,skill,before:{self:actor.countCards('h'),other:target.countCards('h'),uses:actor.getStat('skill')[skill]||0,presented:cancelProbe.presented}};cancelProbe.cases.push(row);cancelProbe.active=row;
     const parent=actor.chooseToUse();parent.type='phase';
     await parent;row.after={self:actor.countCards('h'),other:target.countCards('h'),uses:actor.getStat('skill')[skill]||0,presented:cancelProbe.presented,selfBuff:actor.hasSkill('dccaiyun_eff'),otherBuff:target.hasSkill('dccaiyun_eff')};
     delete cancelProbe.active;
    }
    cancelProbe.done=true;game.pause();
   }};game.addGlobalSkill('_initial_control_probe');if(!_status.auto)ui.click.auto('forced');game.resume2();game.resume();
  });
  const skills=style==='othersOff'?['dccaiyun','initial_control_another','initial_control_after_effect','initial_control_prepared']:['dccaiyun','initial_control_another'];
  for(const skill of skills)for(const cancel of style==='othersOff'&&!['initial_control_after_effect','initial_control_prepared'].includes(skill)?[true,false]:[false]){
   await page.waitForFunction(({cancel,skill})=>window.cancelProbe?.active?.cancel===cancel&&cancelProbe.active.skill===skill&&_status.event.name==='chooseToUse',{cancel,skill},{timeout:30000});
   await page.evaluate(skill=>{ui.click.skill(skill);ui.click.target.call(game.players.find(p=>p!==game.me));ui.click.ok();},skill);
   await page.waitForFunction(()=>_status.event.name==='chooseControl'&&document.querySelector('#dui-controls>.control>div'),null,{timeout:30000});
   await page.waitForTimeout(600);
   const before=await page.evaluate(()=>{const e=_status.event;return{skill:cancelProbe.active.skill,controls:e.controls,uses:game.me.getStat('skill')[cancelProbe.active.skill]||0,bar:[...ui.control.children].map(c=>({cls:c.className,confirm:c===ui.confirm,end:c===e.endButton,display:getComputedStyle(c).display,links:[...c.children].map(n=>n.link)})),buttons:[...ui.control.querySelectorAll('[data-yjcm-action] > div')].map(n=>({link:n.link,bg:getComputedStyle(n).backgroundImage,rect:Element.prototype.getBoundingClientRect.call(n).toJSON()}))};});report.cases.push(before);const labels=skill==='dccaiyun'?['basic','trick','equip']:['basic','trick'],reversible=style==='othersOff'&&!['initial_control_after_effect','initial_control_prepared'].includes(skill);assert.deepEqual(before.controls,reversible?[...labels,'cancel2']:labels);assert.equal(before.uses,reversible||skill==='initial_control_native'?0:1);
   const button=page.locator(cancel?'#dui-controls [data-yjcm-reconsider="true"]':'#dui-controls > .control > div').filter({hasText:cancel?'取消':'基本'});if(cancel&&skill==='dccaiyun')await page.screenshot({path:path.join(__dirname,'initial-control-cancel.png')});await button.click();
   if(cancel){await page.waitForFunction(()=>_status.event.name==='chooseToUse'&&!_status.event.skill);await page.evaluate(()=>ui.click.cancel());}
  }
  await page.waitForFunction(()=>cancelProbe.done,null,{timeout:30000});report.flow=await page.evaluate(()=>cancelProbe.cases);console.log(JSON.stringify(report,null,2));assert.deepEqual(report.errors,[]);
  if(style==='othersOff')for(const c of report.cases){const nodes=c.buttons;assert.equal(nodes.length,c.controls.length);if(c.controls.includes('cancel2')){assert.match(nodes.at(-1).bg,/cmn_btn_brown_180_54/);assert(nodes.slice(1).every(n=>Math.abs((n.rect.top+n.rect.bottom)-(nodes[0].rect.top+nodes[0].rect.bottom))<1),'选项和取消垂直居中');assert(nodes.at(-1).rect.left>nodes.at(-2).rect.right,'取消在选项右边');assert(Math.abs(nodes.at(-1).rect.height/nodes[0].rect.height-54/51)<.002,'分别保留54/51高度');assert(Math.abs(nodes.at(-1).rect.width/nodes[0].rect.width-180/140)<.002,'分别保留180/140最小宽度');}assert(!c.bar.some(c=>c.display!=='none'&&c.links.includes('确定')));}
  for(const row of report.flow){if(row.cancel)assert.deepEqual(row.after,{...row.before,selfBuff:false,otherBuff:false});else{const buff=row.skill==='dccaiyun';assert.equal(row.after.uses,1);assert.equal(row.after.presented,row.before.presented+1);assert.equal(row.after.self,row.before.self+(row.skill==='initial_control_prepared'?2:1));assert.equal(row.after.other,row.before.other+(buff?1:0));assert.equal(row.after.selfBuff,buff);assert.equal(row.after.otherBuff,buff);}}
 }finally{fs.writeFileSync(path.join(__dirname,`initial-control-cancel-${style}-results.json`),JSON.stringify(report,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
