const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
seed.characters = ['standard'];
seed.cards = ['standard'];
seed.mode_config = { identity: { player_number: '2' } };

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], badResources = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', r => { if (r.status() >= 400 && /tooltip|FZLBGBK/.test(r.url())) badResources.push([r.status(), r.url()]); });
    await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
    await page.waitForFunction(async () => { const { game, ui } = await import('/noname.js'); return game.players.length > 1 && !!window.decadeUI && !!ui.arena; }, null, { timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const { game, ui, lib, get, _status } = await import('/noname.js');
      const { skillButtonTooltip } = await import('/extension/十周年UI/src/ui/skillButtonTooltip.js');
      Object.assign(window, { game, ui, lib, get, _status, skillButtonTooltip });
      game.pause();
      for (const dialog of [...ui.dialogs]) dialog.close();
      document.querySelector('.decade-welcome-overlay')?.remove();
      ui.arena.classList.remove('choose-character');
      game.me = game.players[0]; game.me.init('sunquan');
      window.testCard = game.createCard('sha', 'heart', 7);
      game.me.directgain([testCard]);
      window.openCard = card => {
        const dialog = get.nodeintro(card, false);
        dialog.classList.add('popped', 'static'); ui.window.append(dialog);
        lib.placePoppedDialog(dialog, {clientX: 900, clientY: 350});
        window.cardDialog = dialog; return dialog;
      };
      openCard(testCard);
      window.readTooltip = host => {
        const panel = host.querySelector('.decade-official-tooltip');
        const name = panel.querySelector('.decade-tooltip-name');
        const description = panel.querySelector('.decade-tooltip-description');
        const css = getComputedStyle(panel), title = getComputedStyle(name), body = getComputedStyle(description);
        return { kind:host.dataset.decadeTooltip, text:host.textContent, name:name.textContent,
          width:parseFloat(css.width), hostWidth:parseFloat(getComputedStyle(host).width), rect:host.getBoundingClientRect().toJSON(), panel:panel.getBoundingClientRect().toJSON(),
          nameColor:title.color, nameSize:title.fontSize, bodySize:body.fontSize, bodyLine:body.lineHeight,
          border:getComputedStyle(panel,'::before').borderImageSlice, background:getComputedStyle(panel,'::before').borderImageSource,
          font:css.fontFamily, caption:host.querySelector('.decade-tooltip-name').innerHTML };
      };
    });
    await page.waitForFunction(() => document.querySelector('#decade-official-tooltip-style')?.sheet);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    const card = await page.evaluate(() => { lib.placePoppedDialog(cardDialog, {clientX:900,clientY:350}); return readTooltip(cardDialog); });
    console.log('CARD', JSON.stringify(card));
    assert.equal(card.kind, 'card'); assert.equal(card.width, 416);
    assert.equal(card.nameColor, 'rgb(48, 220, 35)'); assert.equal(card.bodySize,'26px');
    assert.equal(card.bodyLine,'31.2px'); assert.equal(card.border,'28 fill');
    assert(Math.abs(card.hostWidth - 332.8) < 1);
    assert.equal(card.name,'杀');
    assert.match(card.background,/tool_tips_bg.png/);
    assert.match(card.text,/造成1点伤害/);
    await page.screenshot({ path:path.join(__dirname,'online-tooltip-card.png') });

    const nativeCases = await page.evaluate(() => {
      cardDialog.remove();
      const originalZhuge = lib.card.zhuge;
      lib.card.zhuge = { ...originalZhuge, distance:{attackFrom:-2}, cardPrompt: () => '动态说明：当前已存放2张牌。' };
      lib.translate.tooltip_tag='测试标签';
      const dynamic = game.createCard('zhuge','spade',12); dynamic.gaintag=['tooltip_tag'];
      game.me.directgain([dynamic]);
      const dialog = openCard(dynamic), text = dialog.textContent; dialog.remove();
      lib.card.zhuge = originalZhuge;
      lib.card.sha.cardPrompt = () => '测试视为牌说明';
      testCard.viewAs = 'shan';
      const hidden = testCard.copy(); hidden.classList.add('infohidden'); ui.arena.append(hidden);
      const hiddenDialog = get.nodeintro(hidden), hiddenStyled = !!hiddenDialog?.dataset.decadeTooltip;
      hiddenDialog?.remove(); hidden.remove();
      delete testCard.viewAs; delete lib.card.sha.cardPrompt;
      lib.config.extension_十周年UI_newDecadeStyle='on'; document.body.dataset.style='on';
      const normal = get.nodeintro(testCard); const normalStyled = !!normal.dataset.decadeTooltip; normal.remove();
      lib.config.extension_十周年UI_newDecadeStyle='onlineUI'; document.body.dataset.style='onlineUI';
      ui.updateSkillControl(game.me,true);
      const button = ui.skillControl.querySelector('[data-id="zhiheng"]');
      if (!button) throw new Error('Native online zhiheng skill button missing');
      // 将真实按钮移到独立位置，避免测试开局尚未选将的技能栏重绘移除它；保留原监听。
      ui.window.append(button);
      button.style.cssText='position:absolute;right:120px;bottom:80px;width:80px;height:55px;background:#675331;color:white;z-index:100';
      button.id='tooltip-skill-probe';
      lib.skill.tooltip_mark={intro:{markcount:'expansion',content:(_storage, player)=>`当前已记录${player.getExpansions('tooltip_mark').length}张牌。`}};
      lib.translate.tooltip_mark='附属牌标记';
      const markedCards=[game.createCard('sha','spade',8),game.createCard('tao','heart',3)];
      game.me.$addToExpansion(markedCards,false,['tooltip_mark']);game.me.updateMark('tooltip_mark');
      const markDialog=get.nodeintro(game.me.marks.tooltip_mark);ui.window.append(markDialog);lib.placePoppedDialog(markDialog,{clientX:500,clientY:350});
      const mark={compact:markDialog.classList.contains('online-mark-card-dialog'),text:markDialog.textContent,cards:markDialog.querySelectorAll('.button.card').length};markDialog.remove();
      markedCards.forEach(card=>card.remove());game.me.unmarkSkill('tooltip_mark');
      return {text,hiddenStyled,normalStyled,mark};
    });
    assert.match(nativeCases.text,/动态说明：当前已存放2张牌/);
    assert.match(nativeCases.text,/测试标签/); assert.match(nativeCases.text,/攻击范围：3/);
    assert.equal(nativeCases.hiddenStyled,false); assert.equal(nativeCases.normalStyled,false);
    assert.equal(nativeCases.mark.compact,true);assert.match(nativeCases.mark.text,/当前已记录2张牌/);assert.equal(nativeCases.mark.cards,2);
    await page.locator('#tooltip-skill-probe').hover();
    await page.waitForFunction(() => skillButtonTooltip.tooltip?.style.opacity==='1');
    await page.waitForTimeout(250);
    const skill = await page.evaluate(() => readTooltip(skillButtonTooltip.tooltip));
    console.log('SKILL',JSON.stringify(skill));
    assert.equal(skill.kind,'skill'); assert.equal(skill.width,491);
    assert.equal(skill.nameColor,'rgb(255, 216, 0)'); assert.equal(skill.nameSize,'33px');
    assert.equal(skill.bodySize,'28px'); assert.equal(skill.bodyLine,'34px'); assert.equal(skill.border,'29 29 29 31 fill');
    assert(skill.rect.top >= 0 && skill.rect.bottom <= 900);
    await page.screenshot({ path:path.join(__dirname,'online-tooltip-skill.png') });
    await page.mouse.move(10,10); await page.waitForTimeout(300);
    const hidden = await page.evaluate(() => skillButtonTooltip.tooltip.style.display);
    assert.equal(hidden,'none');

    await page.evaluate(() => {
      lib.dynamicTranslate.zhiheng = () => '长说明，保留官方排版及动态技能状态。'.repeat(65);
      skillButtonTooltip.show(document.querySelector('#tooltip-skill-probe'),'zhiheng',game.me);
    });
    await page.waitForFunction(() => skillButtonTooltip.tooltip?.style.opacity==='1');
    const long = await page.evaluate(() => {
      const host=skillButtonTooltip.tooltip, panel=host.firstElementChild, scroll=panel.querySelector('.decade-tooltip-scroll');
      return {height:panel.offsetHeight, scrollHeight:scroll.scrollHeight, clientHeight:scroll.clientHeight, arrowHidden:panel.querySelector('.decade-tooltip-arrow-dn').hidden};
    });
    assert.equal(long.height,520); assert.equal(long.clientHeight,482); assert(long.scrollHeight>482); assert.equal(long.arrowHidden,false);
    const scrollRect = await page.locator('.skill-button-tooltip .decade-tooltip-scroll').boundingBox();
    await page.mouse.move(scrollRect.x+scrollRect.width/2,scrollRect.y+scrollRect.height/2);
    await page.waitForTimeout(250); await page.mouse.wheel(0,400); await page.waitForTimeout(200);
    const scrolled=await page.evaluate(() => ({top:skillButtonTooltip.tooltip.querySelector('.decade-tooltip-scroll').scrollTop,display:skillButtonTooltip.tooltip.style.display}));
    assert(scrolled.top>0,'长说明必须可通过真实滚轮滚动'); assert.equal(scrolled.display,'block');
    await page.screenshot({ path:path.join(__dirname,'online-tooltip-scroll.png') });
    const painted=await page.evaluate(()=>{
      const host=skillButtonTooltip.tooltip, rect=host.getBoundingClientRect();
      return {opacity:getComputedStyle(host).opacity,z:getComputedStyle(host).zIndex, playerZ:getComputedStyle(game.me).zIndex,
        onTop:host.contains(document.elementFromPoint(rect.x+30,rect.y+rect.height-30))};
    });
    assert.equal(painted.opacity,'1');assert.equal(painted.onTop,true);
    const arrowStart=await page.locator('.skill-button-tooltip .decade-tooltip-arrow-dn').evaluate(n=>getComputedStyle(n).transform);
    await page.waitForTimeout(2100);
    const arrowEnd=await page.locator('.skill-button-tooltip .decade-tooltip-arrow-dn').evaluate(n=>getComputedStyle(n).transform);
    assert.notEqual(arrowStart,arrowEnd);

    const edges = await page.evaluate(() => {
      skillButtonTooltip.destroy(); delete lib.dynamicTranslate.zhiheng;
      const results=[];
      for (const zoom of [1,1.5]) {
        ui.window.style.zoom=String(zoom); ui.window.style.width=`${1440/zoom}px`; ui.window.style.height=`${900/zoom}px`;
        const dialog=openCard(testCard);
        for (const point of [{clientX:5,clientY:5},{clientX:1435,clientY:895}]) {
          lib.placePoppedDialog(dialog,point); results.push(dialog.getBoundingClientRect().toJSON());
        }
        dialog.remove();
      }
      ui.window.style.zoom=''; ui.window.style.width=''; ui.window.style.height='';
      _status.clicked=false; ui.click.intro.call(testCard,{clientX:900,clientY:350});
      const clicked=!!document.querySelector('#nodeintro[data-decade-tooltip="card"]');
      return {results,clicked};
    });
    assert.equal(edges.clicked,true);
    for(const rect of edges.results) assert(rect.x>=0 && rect.y>=0 && rect.right<=1440 && rect.bottom<=900,JSON.stringify(rect));
    await page.locator('.poplayer').last().click({position:{x:10,y:10},force:true});
    await page.waitForTimeout(600);
    assert.equal(await page.locator('#nodeintro[data-decade-tooltip]').count(),0);
    await page.evaluate(() => {
      lib.config.hover_handcard=true;
      if (!testCard._hoverfunc) lib.setHover(testCard,ui.click.hoverplayer,20);
      testCard._hoveration=20;
      testCard.id='tooltip-card-hover';
    });
    await page.locator('#tooltip-card-hover').hover();
    await page.waitForFunction(() => testCard._mouseenterdialog?.dataset.decadeTooltip==='card');
    const hover=await page.evaluate(()=>readTooltip(testCard._mouseenterdialog));
    assert.equal(hover.width,416);assert.equal(hover.name,'杀');
    assert.deepEqual(badResources,[]); assert.deepEqual(errors,[]);
    const results={card,skill,nativeCases,long,scrolled,painted,edges,hover,errors,badResources};
    fs.writeFileSync(path.join(__dirname,'online-tooltip-results.json'),JSON.stringify(results,null,2));
    console.log('ONLINE_TOOLTIP_OK',JSON.stringify({card:card.rect,skill:skill.rect,long,scrolled,errors,badResources}));
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
