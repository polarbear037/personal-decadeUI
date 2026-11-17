const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'../../..'),prefix='/extension/十周年UI/';
const html=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><script type="importmap">{"imports":{"noname":"/mock.js"}}</script>
<script>window.lib={assetURL:''};window.game={};window.decadeUIPath='extension/十周年UI/';window.decadeUI={bodySensor:{addListener(){}}};Array.prototype.remove=function(item){const i=this.indexOf(item);if(i>=0)this.splice(i,1)};
window.contexts=new Set();const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const context=getContext.call(this,type,...args);if(type.includes('webgl')&&context)contexts.add(context);return context;};</script>
<script src="${prefix}src/libs/spine.js"></script><link rel="stylesheet" href="${prefix}src/styles/player3.css">
<style>#arena{width:800px;height:500px}.player{width:130px;height:180px}.dynamic-wrap{width:130px;height:180px;position:relative}canvas{width:300px;height:400px}</style>
<div id="arena"><div class="player d-skin"><div class="dynamic-wrap"></div></div></div><script type="module">
import {getResourceUrl} from '${prefix}src/core/resourcePaths.js';import {DynamicPlayer} from '${prefix}src/animation/DynamicPlayer.js';
try {
const wrap=document.querySelector('.dynamic-wrap');wrap.style.setProperty('--dynamic-skin-background','url("'+getResourceUrl('动态皮肤文件','背景/beijing.png')+'")');
const bg=getComputedStyle(wrap,'::before').backgroundImage;const image=new Image();image.src=bg.match(/url\\(["']?(.*?)["']?\\)/)[1];await image.decode();
window.background={url:image.src,width:image.naturalWidth};
const player=new DynamicPlayer(getResourceUrl('动态皮肤文件'));document.body.appendChild(player.canvas);player.canvas.style.width='300px';player.canvas.style.height='400px';
const name='许劭/交错战线/50250_skin_CCC03',coldCancelled=player.play({name,json:true,version:'3.8',action:'idle'});player.stop(coldCancelled);
const item=player.play({name,json:true,version:'3.8',action:'idle',x:[0,.5],y:[0,.3],scale:.12});
for(let i=0;i<600&&!player.activePlays.get(item);i++)await new Promise(r=>setTimeout(r,50));
const active=player.activePlays.get(item);if(!active)throw Error('Versioned dynamic did not start');
const skeleton=active.node.skeleton;window.skeleton={bones:skeleton.data.bones.length,skins:skeleton.data.skins.map(s=>s.name),selected:skeleton.skin?.name,actions:skeleton.data.animations.map(a=>a.name)};
window.opaque=0;const batch=active.renderer.spine.batcher,end=batch.end;batch.end=function(...args){const result=end.apply(this,args),gl=active.renderer.gl,pixels=new Uint8Array(player.canvas.width*player.canvas.height*4);gl.readPixels(0,0,player.canvas.width,player.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let count=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])count++;window.opaque=Math.max(window.opaque,count);return result;};
const extraItems=[
{name:'欢杀/神太史慈/苍雷玉龙/dandao',version:'3.6',json:true,action:'play',scale:.3},
{name:'魔张飞/经典形象/daiji',version:'4.0',action:'DaiJi',scale:.2},
{name:'蔡贞姬/星神少女/skeleton',version:'4.1',action:'idle',scale:.15},
].map(config=>player.play({...config,x:[0,.5],y:[0,.5]}));
for(let i=0;i<600&&extraItems.some(item=>!player.activePlays.get(item));i++)await new Promise(r=>setTimeout(r,50));
if(extraItems.some(item=>!player.activePlays.get(item)))throw Error('Mixed-version playback did not start');
await new Promise(r=>setTimeout(r,700));if(player.canvas.style.visibility!=='visible')throw Error('Canvas hidden');if(active.renderer.gl.getError())throw Error('WebGL error');
window.mixed=extraItems.map(item=>({version:item.version,bones:player.activePlays.get(item).node.skeleton.data.bones.length}));
player.stop(extraItems[0]);await new Promise(r=>setTimeout(r,100));if(player.canvas.style.visibility!=='visible')throw Error('Stopping legacy hid newer skeletons');
player.stop(item);if(!active.node.completed)throw Error('Stop failed');player.stopAll();
const cancelled=player.play({name,json:true,version:'3.8',action:'idle'});player.stop(cancelled);await new Promise(r=>setTimeout(r,100));if(player.activePlays.size)throw Error('Cancelled play revived');
window.ready=true;
} catch(error) {window.failure=error.stack||String(error);}
</script>`;
const server=http.createServer((req,res)=>{
const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
if(p==='/'){res.setHeader('Content-Type','text/html');return res.end(html)}
if(p==='/mock.js'){res.setHeader('Content-Type','text/javascript');return res.end('export const {game,lib}=window;')}
const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end(p)}
res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});try{
const page=await browser.newPage(),errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+decodeURI(r.url()))});
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready||window.failure,{}, {timeout:60000});
const result=await page.evaluate(()=>({failure:window.failure,background:window.background,skeleton:window.skeleton,mixed:window.mixed,contexts:window.contexts.size,opaque:window.opaque}));
assert.equal(result.failure,undefined,JSON.stringify(result));assert.ok(result.background.width>0);assert.ok(decodeURI(result.background.url).includes('/extension/十周年UI/assets/dynamic/背景/beijing.png'));
assert.ok(result.skeleton.bones>0);assert.ok(result.skeleton.actions.includes('idle'));assert.equal(failed.length,0,JSON.stringify(failed));assert.deepEqual(errors,[]);
assert.equal(result.contexts,1);assert.ok(result.opaque>100);
console.log('DYNAMIC_RESOURCE_BROWSER_OK',JSON.stringify(result));
}finally{await browser.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
