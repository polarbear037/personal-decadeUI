const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('./online-player-tips-browser.cjs');
const target=path.resolve(__dirname,'../../皮肤切换/js/utils/chrome-fix.js');
const patch=source=>source.replace('        function createScaledRect(rect, scale) {',`        function scaledRectToJSON() {
            const value = {};
            RECT_KEYS.forEach(key => { value[key] = this[key]; });
            return value;
        }
        function createScaledRect(rect, scale) {`).replace('            return scaledRect;',`            // 保留既有可枚举坐标与缩放结果，补齐原生 DOMRect 的序列化接口。
            Object.defineProperty(scaledRect, 'toJSON', { value: scaledRectToJSON });
            return scaledRect;`);
(async()=>{
  const original=fs.readFileSync(target,'utf8'),installed=process.argv.includes('--installed')||original.includes('function scaledRectToJSON()');
  const fixed=installed?original:patch(original);
  if(!installed){
    assert.notEqual(fixed,original);
    fs.mkdirSync(path.resolve(__dirname,'../.codex-tmp/rect-protocol'),{recursive:true});
    fs.writeFileSync(path.resolve(__dirname,'../.codex-tmp/rect-protocol/chrome-fix.fixed.js'),fixed);
  }
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const rows=[];
    for(const version of [127,128,140])for(const zoom of [1,1.5,2]){
      const page=await browser.newPage();await page.setContent('<!doctype html><div id="probe"></div>');
      await page.evaluate(({version,zoom})=>{
        Object.defineProperty(navigator,'userAgent',{value:`Chrome/${version}.0.0.0`,configurable:true});
        window.documentZoom=zoom;
        const rect=new DOMRect(120,80,300,180);
        HTMLElement.prototype.getBoundingClientRect=()=>rect;
        window.getComputedStyle=()=>({transform:'scale(1.25)'});
      },{version,zoom});
      await page.addScriptTag({content:fixed.replace('export function initChromeFix','function initChromeFix')+'\ninitChromeFix();'});
      const row=await page.evaluate(()=>{
        const r=document.querySelector('#probe').getBoundingClientRect(),json=r.toJSON();
        return {json,serialized:JSON.parse(JSON.stringify(r)),spread:{...r},keys:Object.keys(r)};
      });
      const scale=version<128?1:zoom*(version>=140?1.25:1);
      const expected={bottom:260/scale,height:180/scale,left:120/scale,right:420/scale,top:80/scale,width:300/scale,x:120/scale,y:80/scale};
      assert.deepEqual(row.json,expected);assert.deepEqual(row.serialized,expected);
      if(version>=128){assert.deepEqual(row.spread,expected);assert.deepEqual(row.keys,Object.keys(expected));}
      rows.push({version,zoom});await page.close();
    }
    console.log('RECT_JSON_COMPAT_OK',JSON.stringify(rows));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
