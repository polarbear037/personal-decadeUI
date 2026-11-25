// 本体 chooseButton + 实际印牌美化，验证固定展示框与普通/月光条的组合。
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { dependencies } = require('./xinsha-prompt-engine.cjs');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = { cases: [], errors: [] };
  try {
    for (const loading of ['othersOff', 'dialog_xinsha']) {
      Object.assign(seed, { mode: 'identity', characters: ['standard', 'xianding'], cards: ['standard', 'extra'], touchscreen: false,
        extension_十周年UI_newDecadeStyle: 'othersOff', extension_十周年UI_loadingStyle: loading, extension_十周年UI_optimizePrompt: 'online' });
      const page = await browser.newPage({ viewport: { width: 2052, height: 919 } });
      page.on('pageerror', e => results.errors.push(e.message)); page.on('dialog', d => d.accept());
      await dependencies(page);
      for (const file of ['core-js-bundle@3.48.0/node_modules/core-js-bundle/index.js','stackframe@1.3.4/node_modules/stackframe/stackframe.js',
        'error-stack-parser@2.1.4/node_modules/error-stack-parser/error-stack-parser.js','stacktrace-gps@3.1.2/node_modules/stacktrace-gps/stacktrace-gps.js']) {
        if (/as __require/.test(fs.readFileSync(path.resolve(__dirname,'../../../node_modules/.pnpm',file),'utf8'))) await page.unroute('**/node_modules/.pnpm/'+file);
      }
      await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
      await page.locator('#arena > .player').nth(1).waitFor({ state: 'attached', timeout: 45000 });
      await page.evaluate(async () => {
        const { game,lib,ui,_status } = await import('/noname.js');
        const { installPrintedCards } = await import('/extension/雷的一将/utils/printedCards.js');
        game.pause(); game.resume=()=>{}; game.me=game.players[0]; game.me.init('sunquan');
        _status.auto=false; _status.over=false; lib.config.auto_confirm=false;
        ui.arena.classList.remove('choose-character'); document.querySelector('.decade-welcome-overlay')?.remove();
        for(const d of [...ui.dialogs])d.close(); for(const c of [...ui.controls])c.close();
        installPrintedCards(); await document.fonts.ready;
      });
      for (const zoom of [1,1.5288461538461537]) for(const count of [3,9,15,18]) for(const moon of [false,true]) {
        const result = await page.evaluate(async ({zoom,count,moon}) => {
          const {game,lib,ui,_status}=await import('/noname.js');
          game.documentZoom=zoom;document.body.style.zoom=zoom;await new Promise(r=>setTimeout(r,180));
          game.uncheck();for(const c of [...ui.controls])c.close();
          const skill=count===3?'zhiheng':'dcshiji',parent=game.createEvent(skill,false);parent.player=game.me;
          const names=['guohe','huogong','juedou','nanman','shunshou','taoyuan','tiesuo','wanjian','wugu','sha','shan','tao','wuzhong','wuxie','jiedao','lebu','jiu','bingliang'];
          const links=names.slice(0,count).map(name=>['锦囊','',name]);
          const event=game.me.chooseButton([`是否对吕玲绮发动【${lib.translate[skill]}】？`,[links,'vcard']],false);event.parent=parent;
          _status.eventManager.setStatusEvent(event,true);
          const previousStyle=lib.config.extension_十周年UI_jindutiaoYangshi,interval=window.setInterval;
          lib.config.extension_十周年UI_jindutiaoYangshi='4';let tick,handle;
          window.setInterval=(callback)=>{tick=callback;return interval(()=>{},2147483647);};
          try{handle=game.Jindutiaoplayer({id:'printed-progress-probe',parent:document.body});}
          finally{window.setInterval=interval;lib.config.extension_十周年UI_jindutiaoYangshi=previousStyle;}
          const bar=handle.bar;
          if(moon)for(let i=0;i<449;i++)tick();
          await lib.element.content.chooseButton[0](event,null,game.me);
          const d=event.dialog,buttons=[...d.buttons],frames=[],start=performance.now();
          do {
            const tip=document.querySelector('.dialog-xinsha-prompt-overlay'),p=tip.getBoundingClientRect(),b=bar.getBoundingClientRect(),root=d.getBoundingClientRect(),scale=root.width/d.offsetWidth;
            const gridNode=d.querySelector('.lyj-printed-grid'),grid=gridNode.getBoundingClientRect(),a=ui.control.getBoundingClientRect();
            const titleRect=d.querySelector('.caption').getBoundingClientRect();
            const upperGap=(grid.top-titleRect.bottom)/scale+parseFloat(getComputedStyle(gridNode).paddingTop);
            const lowerGap=(p.top-grid.bottom)/scale+parseFloat(getComputedStyle(gridNode).paddingBottom);
            frames.push({time:performance.now()-start,title:d.querySelector('.caption').textContent,tipY:p.top,barY:b.top,gap:(b.top-p.bottom)/scale,
              buttonsGap:(a.top-b.bottom)/scale,cardsGap:(p.top-grid.bottom)/scale+parseFloat(getComputedStyle(gridNode).paddingBottom),barHeight:b.height/scale,
			  gridTop:(grid.top-root.top)/scale,upperGap,lowerGap,
              copies:document.querySelectorAll('.dialog-xinsha-prompt-overlay').length});
            await new Promise(requestAnimationFrame);
          }while(performance.now()-start<450);
          let switched;
          if(!moon&&count===3){for(let i=0;i<449;i++)tick();ui.update();}
          d.hide();
          if(!moon&&count===3)switched={moon:bar.dataset.yjcmMoonProgress==='true',collapsedHeight:parseFloat(getComputedStyle(bar).height)/parseFloat(getComputedStyle(ui.window).getPropertyValue('--yjcm-unit'))};
          d.open();await new Promise(r=>setTimeout(r,80));
          const tip=document.querySelector('.dialog-xinsha-prompt-overlay');const restored=!!tip;
          _status.clicked=false;ui.click.button.call(buttons[0]);const selected=ui.selected.buttons.includes(buttons[0]);ui.click.ok();
          const confirmed=event.result?.bool&&event.result.links?.[0]===buttons[0].link;
          const sameButtons=buttons.every((b,i)=>b===d.buttons[i]);
          d.close();handle.dispose();await new Promise(r=>setTimeout(r,720));
          return {loading:ui.arena.dataset.loadingStyle,zoom,count,moon,frames,switched,restored,selected,confirmed,sameButtons,cleaned:!document.querySelector('.dialog-xinsha-prompt-overlay')};
        }, {zoom,count,moon});
        const diagnostic=JSON.stringify({...result,frames:[result.frames[0],result.frames.at(-1)]});
        assert.ok(result.frames.every(f=>f.copies===1&&Math.abs(f.gap-7)<.1&&f.buttonsGap>1&&f.cardsGap>=-1&&Math.abs(f.barHeight-(moon?26:17))<.1),diagnostic);
        assert.ok(result.frames.every(f=>f.upperGap>1&&f.lowerGap>1&&Math.abs(f.upperGap-f.lowerGap)<.1),diagnostic);
        for(const k of ['tipY','barY'])assert.ok(Math.max(...result.frames.map(f=>f[k]))-Math.min(...result.frames.map(f=>f[k]))<.2,diagnostic);
        assert.ok(result.restored&&result.selected&&result.confirmed&&result.sameButtons&&result.cleaned,diagnostic);
        if(result.switched)assert.ok(result.switched.moon&&Math.abs(result.switched.collapsedHeight-26)<.1,diagnostic);
        results.cases.push(result);
      }
      await page.close();
    }
    assert.deepEqual(results.errors,[]);
    fs.writeFileSync(path.join(__dirname,'printed-dialog-layout-results.json'),JSON.stringify(results,null,2)+'\n');
    console.log(`PRINTED_DIALOG_LAYOUT_OK ${results.cases.length} native cases; fixed scene, grid/prompt/progress/actions, ordinary/moon, restore, confirmation and cleanup`);
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
