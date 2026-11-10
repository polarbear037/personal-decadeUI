const path = require('node:path');
const {bootstrap,server,chromium,assert,script,read} = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1050,height:650}});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
    await bootstrap(page,origin,true);
    await page.addStyleTag({url:origin+'/extension/雷的ol/css/ol/shouqika.css'});
    await page.addStyleTag({url:origin+'/extension/雷的ol/css/ol/cpjl.css'});
    await page.addStyleTag({content:'#samples,#preview{display:none}#arena{position:relative;min-height:600px}.card.thrown{position:absolute!important;width:108px!important;height:150px!important;transform:none!important;animation:none!important;transition:none!important}.used-info{transition:none!important}.msgBox{top:430px!important}.msgs{top:0!important}'});
    const getSource=read('noname/get/index.js');
    const start=getSource.indexOf('  cardsetion(player, sourceEvent) {');
    const nativeTag=getSource.slice(start,getSource.indexOf('\n  /**',start));
    await page.evaluate(({nativeTag,origin})=>{
      Object.assign(lib.translate,{zhanghuai:'张怀',weihuang:'卫璜',jiangwan:'蒋琬',bagua:'八卦阵',zhongyi:'忠义',oltianen:'天恩',wuxie:'无懈可击'});
      lib.config.cardtempname='off';lib.card.wuxie={type:'trick'};
      window.people=[['zhanghuai','wood'],['weihuang','fire'],['jiangwan','water']].map(([name,group])=>({name,group,isPlayer:true,getSeatNum:()=>1}));
      game.me=people[0];game.hasPlayer2=()=>false;game.logv=game.trySkillAudio=()=>{};
      get.slimName=name=>lib.translate[name]||name;get.bordergroup=name=>people.find(p=>p.name===name)?.group;get.groupnature=group=>group;
      const translate=get.translation;get.translation=value=>value?.isPlayer?get.slimName(value.name):translate(value);
      get.skillTranslation=name=>lib.translate[name];get.itemtype=value=>value?.isPlayer?'player':'';
      get.nature=card=>card?.nature||'';get.number=card=>card.number;get.suit=card=>card.suit;get.event=()=>_status.event;
      get.cardsetion=new Function('return ({'+nativeTag+'}).cardsetion')();
      window.uiCards=[];
      window.duiForTags={element:{create:cls=>{const node=document.createElement('div');node.className=cls;return node;}}};
      for(let i=0;i<3;i++){
        const card=makeSample(i===1?'wuxie':'wuzhong',i===0?'heart':'spade',i===1?13:11);
        card.classList.add('thrown');card.style.left=(100+i*155)+'px';card.style.top='80px';ui.arena.append(card);
        card.style.backgroundImage=`url("${origin}/extension/十周年UI/image/card-skins/online/${card.name}.jpg")`;
        uiCards.push(card);
      }
      window.tagEvent=card=>({name:'useCard',card,getParent:()=>({name:'phaseUse',getParent:()=>({name:'phase'})})});
    },{nativeTag,origin});
    await page.addScriptTag({content:script('extension/十周年UI/src/ui/card-utils.js','window.applyUseTag=a;')});
    await page.evaluate(()=>{ui.arena.dataset.newDecadeStyle='onlineUI';uiCards.forEach((card,index)=>{_status.event=tagEvent(card);applyUseTag(card,people[index],_status.event,duiForTags);});});
    await page.evaluate(async()=>{await document.fonts.load('22px newol','张怀卫璜蒋琬使用');await document.fonts.ready;});
    const online=await page.evaluate(()=>uiCards.map(card=>{
      const tag=card.querySelector('.used-info'),name=tag.querySelector('[data-nature] span')||tag.querySelector('[data-nature]'),style=getComputedStyle(tag);
      return {height:tag.getBoundingClientRect().height,cardHeight:card.getBoundingClientRect().height,font:style.fontFamily,size:style.fontSize,nameColor:getComputedStyle(name).color,nameShadow:getComputedStyle(name).textShadow,bg:style.backgroundColor,fits:tag.scrollHeight<=tag.clientHeight,text:tag.textContent};
    }));
    for(const info of online){assert(Math.abs(info.height/info.cardHeight-.44)<.01,'阴影未覆盖底部44%');assert(info.font.includes('newol'),'未使用newol');assert.equal(info.size,'22px');assert.equal(info.nameColor,'rgb(199, 171, 114)');assert.equal(info.bg,'rgba(0, 0, 0, 0.58)');assert(info.fits,'出牌提示文字溢出');assert(info.text.endsWith('使用'));}
    assert(await page.evaluate(()=>[...document.fonts].some(font=>font.family.replaceAll('"','')==='newol'&&font.status==='loaded')),'newol字体文件未实际加载');
    for(const info of online)assert.equal(info.nameShadow,'rgb(0, 0, 0) 0px 1px 2px','武将名残留势力色阴影');
    await page.evaluate(()=>{ui.arena.dataset.newDecadeStyle='on';});
    const fallback=await page.evaluate(()=>{const node=uiCards[0].querySelector('.used-info');return {size:getComputedStyle(node).fontSize,height:node.getBoundingClientRect().height};});
    assert.equal(fallback.size,'17px');assert(fallback.height<online[0].height,'影响了非Online样式');
    await page.evaluate(()=>{ui.arena.dataset.newDecadeStyle='onlineUI';uiCards[0].classList.add('movingcard');});
    assert.equal(await page.evaluate(()=>getComputedStyle(uiCards[0].querySelector('.used-info')).opacity),'0','飞行中的提示被强制显示');
    await page.evaluate(()=>uiCards[0].classList.remove('movingcard'));
    const extension=read('extension/雷的ol/extension.js');
    const toast=extension.slice(extension.indexOf('// 出牌记录美化'),extension.indexOf('//出牌记录结束'))+'}';
    await page.evaluate(()=>{lib.element.player={logSkill(){window.originalLogCalls=(window.originalLogCalls||0)+1;}};});
    await page.addScriptTag({content:'(function(){const config={cpjl:true};const toBool=value=>value;'+toast+'})();'});
    await page.evaluate(()=>{
      game.me=people[2];
      lib.element.player.logSkill.call(people[2],'bagua',undefined,false);
      lib.element.player.logSkill.call(people[1],'zhongyi',[people[0],people[1]],false);
      lib.element.player.logSkill.call(people[1],'oltianen',[people[2]],false);
    });
    await page.waitForFunction(()=>document.querySelectorAll('.msgs.shown').length===3);
    const logs=await page.evaluate(()=>[...document.querySelectorAll('.msgs')].map(msg=>({text:msg.textContent,players:[...msg.querySelectorAll('.lei-ol-record-player')].map(node=>({text:node.textContent,color:getComputedStyle(node).color})),skill:[...msg.querySelectorAll('.lei-ol-record-skill')].map(node=>({text:node.textContent,color:getComputedStyle(node).color})),body:getComputedStyle(msg.firstElementChild).color})));
    for(const log of logs){assert(log.players.length>0);assert.equal(log.skill.length,1);assert(/^“.+”$/.test(log.skill[0].text),'技能引号未一起着色');for(const piece of [...log.players,...log.skill])assert.equal(piece.color,'rgb(199, 171, 114)');assert.notEqual(log.body,'rgb(199, 171, 114)','正文被一起改色');}
    assert(logs.some(log=>log.text==='蒋琬（您）发动“八卦阵”'),'本人提示文本改变');
    assert(logs.some(log=>log.text==='卫璜对张怀、自己发动“忠义”'),'多目标文本改变');
    assert.equal(await page.evaluate(()=>originalLogCalls),3,'未调用原生logSkill');
    await page.screenshot({path:path.join(__dirname,'online-used-info-browser.png')});
    await page.waitForTimeout(3500);
    assert.equal(await page.locator('.msgs').count(),0,'toast未按时回收');
    await page.evaluate(()=>lib.element.player.logSkill.call(people[1],'zhongyi',undefined,false));
    assert.equal(await page.locator('.msgs .lei-ol-record-skill').textContent(),'“忠义”','对象池复用后文本错误');
    assert.deepEqual(errors,[],'浏览器错误');
    console.log(JSON.stringify({onlineCards:online.length,newolLoaded:true,nonOnlinePreserved:true,toasts:logs.length,quotedSkillColored:true,poolReuse:true,errors},null,2));
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
