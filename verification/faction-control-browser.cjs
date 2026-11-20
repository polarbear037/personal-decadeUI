const { server, chromium, assert, read, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');
const path = require('node:path');
const nativePlayer = read('noname/library/element/player.js');
const nativeGet = read('noname/get/index.js');
const selectGroupSource = nativeGet.slice(nativeGet.indexOf('  selectGroup(name, type) {'), nativeGet.indexOf('  types() {', nativeGet.indexOf('  selectGroup(name, type) {')));
function method(name, endMarker) {
  const start=nativePlayer.indexOf(`  ${name}(`),end=nativePlayer.indexOf(endMarker,start);
  assert.ok(start>=0&&end>start);
  return nativePlayer.slice(start,end).replace(`  ${name}(`,'function(');
}
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/__card_verification__');
    await page.evaluate(origin=>{
      document.head.innerHTML=`<meta charset="utf-8"><base href="${origin}/">`;
      document.body.innerHTML='<div id="arena" class="decadeUI"></div><div id="controls"></div>';
      window._status={event:null};
      window.lib={config:{mode:'doudizhu',extension_十周年UI_newDecadeStyle:'onlineUI',extension_十周年UI_jindutiaoYangshi:'0'},group:['wei','shu','wu','qun','jin'],element:{},assetURL:origin+'/',init:{onfree(){}},filter:{filterButton:()=>true,buttonIncluded:()=>true}};
      window.get={mode:()=>lib.config.mode,event:()=>_status.event,id:()=>String(Math.random()),translation:x=>x,select:x=>Array.isArray(x)?x:[x,x],links:buttons=>buttons.map(button=>button.link),itemtype:x=>x?.buttons?'dialog':null,is:{object:x=>Object.prototype.toString.call(x)==='[object Object]'}};
      window.ui={arena:document.querySelector('#arena'),selected:{buttons:[]},create:{buttonChooseAll(){}},click:{},confirm:document.createElement('div')};
      ui.confirm.append(document.createElement('div'));
      Array.prototype.add=function(item){if(!this.includes(item))this.push(item);return this;};
      Array.prototype.remove=function(item){const i=this.indexOf(item);if(i>=0)this.splice(i,1);return this;};
      window.game={pause(){if(_status.event)_status.event.paused=true;},countChoose(){},check(){},resume(){if(_status.event)_status.event.paused=false;window.pendingChoiceResolve?.();window.pendingChoiceResolve=null;}};
      game.createEvent=name=>({name,local:true,finished:false,set(key,value){this[key]=value;return this;},setContent(name){this.handlers=lib.element.content[name];},finish(){this.finished=true;},isMine(){return this.local;},isOnline(){return false;},resume(){game.resume();},
        async run(){const previous=_status.event;_status.event=this;try{for(const handler of this.handlers){if(this.finished)break;await handler(this,null,this.player);if(this.paused&&!this.result)await new Promise(resolve=>window.pendingChoiceResolve=resolve);}}finally{_status.event=previous;}},
        forResult(){this.promise ||= this.run();return this.promise.then(()=>this.result);}});
      ui.click.ok=()=>{const event=_status.event;event.result={bool:true,links:get.links(ui.selected.buttons)};event.choosing=false;ui.selected.buttons.length=0;game.resume();};
      window.factionOpens=0;window.factionTips=0;
      window.decadeUI={showHandTip(){factionTips++;const tip=document.createElement('div');tip.className='hand-tip';tip.appendText=text=>tip.textContent=text;tip.strokeText=()=>{};tip.show=()=>ui.arena.append(tip);tip.close=()=>tip.remove();return tip;}};
      ui.create.dialog=(prompt,spec)=>{
        const dialog=document.createElement('div');dialog.className='dialog';dialog.buttons=[];
        const container=document.createElement('div');container.className='content-container';dialog.content=document.createElement('div');dialog.content.className='content';container.append(dialog.content);dialog.append(container);
        const buttons=document.createElement('div');buttons.className='buttons';dialog.content.append(buttons);
        for(const link of spec?.[0]||[]){const button=document.createElement('div');button.className='button card selectable';button.link=link;buttons.append(button);dialog.buttons.push(button);}
        dialog.open=function(){factionOpens++;ui.arena.append(this);return this;};dialog.close=function(){this.remove();return this;};
        return applyFactionDialogInteraction(applyOnlineFactionDialog(dialog));
      };
    },origin);
    for(const file of ['/layout/default/layout.css','/extension/十周年UI/src/styles/layout.css','/extension/十周年UI/src/styles/online-faction-dialog.css'])await page.addStyleTag({url:origin+file});
    await page.addStyleTag({content:'#arena{position:absolute;inset:20px;width:calc(100% - 40px);height:calc(100% - 40px)}'});
    await page.addScriptTag({content:script('noname/library/element/content.js','lib.element.content=Content;')});
    await page.addScriptTag({content:script('extension/十周年UI/src/ui/online-faction-dialog.js','window.applyOnlineFactionDialog=applyOnlineFactionDialog;')});
    await page.addScriptTag({content:script('extension/十周年UI/src/ui/faction-dialog-interaction.js','window.applyFactionDialogInteraction=applyFactionDialogInteraction;')});
    await page.addScriptTag({content:script('extension/十周年UI/src/overrides/faction-character-init.js','window.installFactionControl=applyFactionControlChoice;')});
    await page.addScriptTag({content:'window.Player=class Player{};Player.prototype.chooseControl='+method('chooseControl','\n  /**')+';Player.prototype.chooseButton='+method('chooseButton','\n  chooseButtonOL(')+';'});
    await page.addScriptTag({content:`get.selectGroup=({${selectGroupSource}}).selectGroup;`});
    // 本体对普通武将返回唯一势力；必须验证整个原生 chooseButton 流程没有先开后关。
    for(const style of ['onlineUI','othersOff','on','off','codename','babysha']) {
      const state=await page.evaluate(async style=>{
        lib.config.extension_十周年UI_newDecadeStyle=style;
        document.body.dataset.style=style;
        lib.selectGroup=['shen'];
        get.character=()=>({group:'wei',skills:[]});get.config=()=>true;
        const groups=get.selectGroup('caocao');
        const before={opens:factionOpens,tips:factionTips};
        const player=new Player();
        const event=player.chooseButton(['请选择你的势力',[groups.map(group=>['','','group_'+group]),'vcard']],true).set('direct',true);
        let callbackCount=0;event.callback=(current,result)=>{if(current===player&&result.links[0][2]==='group_wei')callbackCount++;};
        const result=await event.forResult();
        await new Promise(resolve=>requestAnimationFrame(resolve));
        return {groups,result,opens:factionOpens-before.opens,tips:factionTips-before.tips,callbackCount,dialogs:ui.arena.querySelectorAll('.dialog').length,active:ui.arena.classList.contains('faction-dialog-active')};
      },style);
      assert.deepEqual(state.groups,['wei']);
      assert.equal(state.result.bool,true);
      assert.equal(state.result.links[0][2],'group_wei');
      assert.equal(state.callbackCount,1,'保留原生结果与回调');
      assert.equal(state.opens,0,`${style}: 唯一势力自动确认不得开窗`);
      assert.equal(state.tips,0,`${style}: 不得短暂创建神武将提示`);
      assert.equal(state.dialogs,0);
      assert.equal(state.active,false,'不得残留隐藏确认栏的状态');
      const unaffected=await page.evaluate(async()=>{
        const results=[];
        for(const sample of [
          {name:'神武将',info:{group:'shen',skills:[]}},
          {name:'双势力武将',info:{group:'wei',skills:[],doubleGroup:['wei','shu']}},
          {name:'未启用自动确认',direct:false},
          {name:'唯一按钮不可选',filter:()=>false},
          {name:'需要选择两项',select:[2,2]},
          {name:'普通选牌',card:'sha'},
        ]) {
          get.character=()=>sample.info||{group:'wei',skills:[]};
          const groups=get.selectGroup('sample');
          const player=new Player();
          const event=player.chooseButton(['请选择你的势力',[groups.map(group=>['','',sample.card||'group_'+group]),'vcard']],true).set('direct',sample.direct!==false);
          if(sample.filter)event.filterButton=sample.filter;
          if(sample.select)event.selectButton=sample.select;
          const before=factionOpens;
          _status.event=event;
          await lib.element.content.chooseButton[0](event,null,player);
          results.push({name:sample.name,opens:factionOpens-before});
          event.result={bool:false,links:[]};
          await lib.element.content.chooseButton[1](event,null,player);
          _status.event=null;
        }
        return results;
      });
      for(const sample of unaffected)assert.equal(sample.opens,1,`${style}: ${sample.name}保留原开窗行为`);
    }
    await page.evaluate(()=>{lib.config.extension_十周年UI_newDecadeStyle='onlineUI';delete document.body.dataset.style;});
    const singleControl=await page.evaluate(async()=>{
      installFactionControl();
      const before=factionOpens;
      const event=new Player().chooseControl(['shu']).set('prompt','请选择你的势力');
      const result=await event.forResult();
      return {opens:factionOpens-before,result};
    });
    assert.equal(singleControl.opens,0,'chooseControl转出的唯一势力同样不得开窗');
    assert.equal(singleControl.result.control,'shu');
    assert.equal(singleControl.result.index,0);
    await page.evaluate(()=>{
      installFactionControl();
      const player=new Player();player.name1='shen_zhangfei';
      window.controlEvent=player.chooseControl(['shu','wei','wu','qun','jin']).set('prompt','请选择你的势力');
      controlEvent.parent={name:'_shengroup_choice'};
      window.controlPending=controlEvent.forResult().then(result=>window.controlResult=result).catch(error=>{window.fixtureFailure=error.stack;});
    });
    await page.waitForFunction(()=>document.querySelector('.online-faction-button')||window.fixtureFailure);
    const failure=await page.evaluate(()=>window.fixtureFailure);if(failure)throw new Error(failure);
    const state=await page.locator('.online-faction-button').evaluateAll(buttons=>buttons.map(button=>({link:button.link,image:getComputedStyle(button,'::before').backgroundImage,width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height})));
    assert.equal(state.length,5);
    assert.equal(state[0].link[2],'group_shu','沿用chooseControl的原选项顺序');
    for(const button of state){assert.match(button.image,/select_country_/);assert.ok(button.width>40&&Math.abs(button.width-button.height)<1);}
    await page.screenshot({path:path.join(__dirname,'faction-control-doudizhu.png')});
    await page.locator('.online-faction-button').nth(1).click();
    await page.waitForFunction(()=>!!window.controlResult);
    assert.equal(await page.evaluate(()=>controlResult.control),'wei');
    assert.equal(await page.evaluate(()=>controlResult.index),1);
    assert.equal(await page.locator('.online-faction-dialog').count(),0);
    assert.equal(await page.evaluate(()=>controlEvent.finished),true);
    assert.deepEqual(errors,[]);
    console.log('FACTION_CONTROL_BROWSER_OK: native get.selectGroup + Player.chooseButton / single faction never opens in six styles / callback-result preserved / native Player.chooseControl multi-faction click');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
