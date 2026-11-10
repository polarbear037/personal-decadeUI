const path = require('node:path');
const { bootstrap, server, chromium, assert, script } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({channel:'msedge',headless:true});
    const page = await browser.newPage({viewport:{width:850,height:500}});
    const errors = [];
    page.on('pageerror',error => errors.push(String(error)));
    page.on('console',message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response',response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page,origin,true);
    await page.addStyleTag({url:origin+'/extension/十周年UI/src/styles/meihua.css'});
    await page.addStyleTag({content:'.card{animation:none!important;transition:none!important}.handcopies{position:relative;display:flex;gap:20px;padding:24px}.handcopies>.card{position:relative;width:108px;height:150px;margin:0}'});
    await page.evaluate(() => {
      window.copyHooks = {};
      lib.hooks = Object.fromEntries(['checkBegin','checkCard','checkEnd','uncheckBegin'].map(name => [name,{add(fn){(copyHooks[name] ||= []).push(fn);}}]));
      lib.config.extension_十周年UI_enableEquipCopy = true;
      lib.config.extension_十周年UI_aloneEquip = false;
      lib.suit=['spade','heart','club','diamond'];
      Array.prototype.remove = function(value){const index=this.indexOf(value);if(index>=0)this.splice(index,1);return this;};
      ui.selected = {cards:[]}; ui.special = document.createElement('div'); ui.special.style.display='none'; document.body.append(ui.special);
      ui.updatehl = () => {};
      window.checkCalls = 0; game.check = () => checkCalls++;
      get.position = card => card.testPosition || 'h';
      const hand = document.createElement('div'); hand.className='handcopies'; ui.arena.append(hand);
      window.equipped = [], windowCopies = [];
      window.copyPlayer = {
        getCards(position,filter){let cards=position==='e'?equipped:position==='s'?windowCopies:position==='he'?equipped:[];return filter?cards.filter(filter):cards.slice();},
        countCards(){return equipped.length;},
        directgains(cards,_unused,tag){for(const card of cards){card.testPosition='s';card.addGaintag(tag);card.updateTransform=()=>{};card.discard=function(){this.testPosition='d';};card.delete=function(){this.remove();windowCopies=windowCopies.filter(c=>c!==this);};windowCopies.push(card);hand.append(card);}}
      };
      game.me = copyPlayer;
      for (const suit of ['spade','heart']) {
        const original = makeSample('bagua',suit,2,undefined,copyPlayer);
        original.testPosition='e'; original.cardid='equip-'+suit; equipped.push(original);
      }
      window.normal = makeSample('sha','club',7,undefined,copyPlayer);
      window.makeChoice = () => ({name:'chooseCard',position:'he',player:copyPlayer,selectCard:1,backup(){},restore(){}});
    });
    await page.addScriptTag({content:script('extension/十周年UI/src/features/equipCopy.js','window.setupEquipCopy=a;')});
    await page.evaluate(async () => { setupEquipCopy(); window.choice=makeChoice(); await copyHooks.checkBegin[0](choice); });
    await page.waitForFunction(() => document.querySelectorAll('.handcopies>.card>.equip-hand-equipped').length === 2);
    const presentation = await page.evaluate(async () => {
      await document.fonts.ready;
      return Promise.all(windowCopies.map(async card => {
        const label=card.querySelector('.equip-hand-equipped'),s=getComputedStyle(label),r=label.getBoundingClientRect(),c=card.getBoundingClientRect();
        const image = new Image(); image.src=s.backgroundImage.slice(5,-2); await image.decode();
        return {text:label.textContent,background:s.backgroundImage,pointer:s.pointerEvents,inside:r.left>=c.left&&r.right<=c.right&&r.top>=c.top&&r.bottom<=c.bottom,imageWidth:image.naturalWidth,epclick:!!card.querySelector('.epclick')};
      }));
    });
    for(const p of presentation){assert.equal(p.text,'已装备');assert(p.background.includes('/image/ui/card/cityname_bg_card.png'));assert(p.inside,'装备标识超出卡牌');assert.equal(p.pointer,'none');assert(p.imageWidth>0,'指定底图未加载');assert(!p.epclick,'旧已装备图片与新标识重复');}
    assert(await page.evaluate(() => !equipped.some(c=>c.querySelector('.equip-hand-equipped'))&&!normal.querySelector('.equip-hand-equipped')),'普通手牌或真实装备被添加标识');
    await page.evaluate(() => { windowCopies[0].classList.add('selected'); windowCopies[0].dispatchEvent(new MouseEvent('click',{bubbles:true})); });
    const selected = await page.evaluate(() => ({original:windowCopies[0].relatedCard.classList.contains('selected'),included:ui.selected.cards.includes(windowCopies[0].relatedCard),checks:checkCalls,tag:windowCopies[0].gaintag,position:get.position(windowCopies[0])}));
    assert(selected.original&&selected.included&&selected.checks===1,'选择副本未同步真实装备 '+JSON.stringify(selected));
    await page.screenshot({path:path.join(__dirname,'equip-copy-badge-browser.png')});
    await page.evaluate(async () => { window.chosenOriginal=windowCopies[0].relatedCard;choice.result={cards:[windowCopies[0]]};await copyHooks.uncheckBegin[0](choice,['card']); });
    assert(await page.evaluate(() => !windowCopies.length&&!document.querySelector('.handcopies .equip-hand-equipped')&&choice.result.cards[0]===chosenOriginal),'副本退出未清理或结果未还原');
    await page.evaluate(async () => { window.nextChoice=makeChoice();await copyHooks.checkBegin[0](nextChoice); });
    assert.equal(await page.locator('.handcopies>.card>.equip-hand-equipped').count(),2,'再次选择时标识数量错误');
    await page.evaluate(async () => { nextChoice.result={bool:false,cards:[]};await copyHooks.uncheckBegin[0](nextChoice,['card']); });
    assert.equal(await page.locator('.handcopies>.card>.equip-hand-equipped').count(),0,'取消选择后装备副本标识残留');
    assert.deepEqual(errors,[],'浏览器错误');
    console.log(JSON.stringify({copies:2,assetLoaded:true,selectionSynced:true,cleanup:true,reentry:true,cancelCleanup:true,errors},null,2));
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
