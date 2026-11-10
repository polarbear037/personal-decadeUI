const {server,chromium,assert} = require('../../雷的ol/verification/card-beautify-browser.cjs');
const {PNG} = require('C:/Users/Thunder/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:800}});
    const errors=[];
    page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/__card_verification__');
    await page.setContent('<div id="window"><div id="arena" class="decadeUI" data-loading-style="dialog_ol"><div class="dialog dialog-ol-layout"><div class="content-container"><div class="content"><div class="caption">测试标题</div><div id="probe">对话框内容</div></div></div></div><div id="dui-controls"><button id="control-button" type="button">控制按钮</button></div></div></div><div class="chukuang-canvas-wraper"><canvas class="chukuang-canvas"></canvas></div>');
    for(const file of ['layout/default/layout.css','extension/十周年UI/src/styles/layout.css','extension/皮肤切换/style/edit.css'])await page.addStyleTag({url:`${origin}/${file}`});
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}html,body{width:100%;height:100%;margin:0}#probe{position:relative;height:300px;background:rgb(0,0,255)}#control-button{width:140px}.chukuang-canvas{position:fixed;inset:0;width:100%;height:100%}'});
    await page.addScriptTag({type:'module',content:`import {updateDialogOlLayout} from '${origin}/extension/十周年UI/src/ui/dialog-ol-layout.js'; window.updateLayerDialog=()=>{const dialog=document.querySelector('.dialog');dialog.forcebutton=true;updateDialogOlLayout(dialog,document.querySelector('#arena'),800,false);}; window.layerReady=true;`});
    await page.waitForFunction(()=>window.layerReady);
    await page.evaluate(()=>{const canvas=document.querySelector('canvas');canvas.width=1200;canvas.height=800;const context=canvas.getContext('2d');context.fillStyle='red';context.fillRect(0,0,1200,800);let controlClicks=0,dialogClicks=0;document.querySelector('#control-button').addEventListener('click',()=>controlClicks++);document.querySelector('.dialog').addEventListener('click',()=>dialogClicks++);window.resetLayerClicks=()=>{controlClicks=0;dialogClicks=0;};window.layerClicks=()=>({controlClicks,dialogClicks});updateLayerDialog();});
    for(const framed of [false,true]){
      await page.evaluate(()=>window.resetLayerClicks());
      if(framed)await page.evaluate(()=>{
        const frame=document.createElement('div');frame.id='thunderPcRatioFrame';frame.style.cssText='position:fixed;inset:0;z-index:1;transform:translateZ(0);container-type:size;overflow:hidden';
        const viewport=document.createElement('div');viewport.style.cssText='position:absolute;inset:0;overflow:hidden;clip-path:inset(0)';
        const content=document.createElement('div');content.style.cssText='position:absolute;inset:0;overflow:hidden';
        content.append(document.querySelector('#window'),document.querySelector('.chukuang-canvas-wraper'));viewport.append(content);frame.append(viewport);document.body.append(frame);updateLayerDialog();
      });
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const layers=await page.evaluate(()=>({dialog:Number(getComputedStyle(document.querySelector('.dialog')).zIndex),controls:Number(getComputedStyle(document.querySelector('#dui-controls')).zIndex),canvas:Number(getComputedStyle(document.querySelector('canvas')).zIndex)}));
      assert.equal(layers.dialog,layers.canvas+1,'对话框没有高于出框一个层级');
      assert.equal(layers.controls,layers.dialog+1,`控制栏没有高于对话框一个层级 framed=${framed}`);
      const hitTargets=await page.evaluate(()=>{const controls=document.querySelector('#dui-controls').getBoundingClientRect();const button=document.querySelector('#control-button').getBoundingClientRect();const buttonPoint=[button.left+button.width/2,button.top+button.height/2];const emptyPoint=[controls.right-20,controls.top+controls.height/2];return {button:document.elementFromPoint(...buttonPoint)?.id,empty:document.elementFromPoint(...emptyPoint)?.closest('.dialog')?.classList.contains('dialog'),buttonPoint,emptyPoint};});
      assert.equal(hitTargets.button,'control-button',`控制栏子按钮未覆盖对话框 framed=${framed}`);
      assert.equal(hitTargets.empty,true,`控制栏空白区未穿透对话框 framed=${framed}`);
      await page.mouse.click(...hitTargets.buttonPoint);
      await page.mouse.click(...hitTargets.emptyPoint);
      assert.deepEqual(await page.evaluate(()=>window.layerClicks()),{controlClicks:1,dialogClicks:1},`控制栏按钮/空白区真实点击行为错误 framed=${framed}`);
      const box=await page.locator('#probe').boundingBox();
      const png=PNG.sync.read(await page.screenshot());
      const offset=(Math.floor(box.y+box.height/2)*png.width+Math.floor(box.x+8))*4;
      assert.deepEqual([...png.data.subarray(offset,offset+3)],[0,0,255],`对话框被出框画布遮住 framed=${framed}`);
    }
    for(const excluded of ['dclieqiong','online-faction-dialog','bosscharacter']){
      await page.locator('.dialog').evaluate((node,cls)=>node.classList.add(cls),excluded);
      assert.equal(await page.locator('.dialog').evaluate(node=>getComputedStyle(node).zIndex),'7');
      await page.locator('.dialog').evaluate((node,cls)=>node.classList.remove(cls),excluded);
    }
    await page.locator('#arena').evaluate(node=>node.dataset.loadingStyle='on');
    assert.equal(await page.locator('.dialog').evaluate(node=>getComputedStyle(node).zIndex),'7');
    assert.deepEqual(errors,[]);
    console.log('DIALOG_OL_LAYER_OK: z-index 101 over skin canvas 100; normal and framed paint order; exclusions preserved; 0 page errors');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
