const fs=require('node:fs'),path=require('node:path');
const {connect}=require('F:/noname/后台调试/noname-debug.cjs');
(async()=>{const c=await connect();const out=path.join(__dirname,'yjcm-name-skin-live-results.json');const nodes=[];try{
 await c.rpc.call('DOM.enable');await c.rpc.call('CSS.enable');
 const {root}=await c.rpc.call('DOM.getDocument');
 for(const selector of ['.camp-wrap>.is-name-trigger','.camp-wrap:has(>.is-name-trigger)>.avatar-name']){const n=await c.rpc.call('DOM.querySelector',{nodeId:root.nodeId,selector});if(n.nodeId)nodes.push(n.nodeId);}
 for(const nodeId of nodes)await c.rpc.call('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});
 const result=await c.evaluate(`(async()=>{const {game}=await import('./noname.js');const rows=[...game.players,...(game.dead||[])].map(p=>{const n=p.querySelector('.avatar-name'),b=p.querySelector('.is-name-trigger');if(!n)return null;const r=Element.prototype.getBoundingClientRect.call(n),range=document.createRange();range.selectNodeContents(n);const g=range.getBoundingClientRect();return {name:n.textContent,align:getComputedStyle(n).textAlign,centerError:Math.abs((g.top+g.bottom-r.top-r.bottom)/2),button:b?{parent:b.parentNode.className,opacity:getComputedStyle(b).opacity,image:getComputedStyle(b).backgroundImage,pointer:getComputedStyle(b).pointerEvents}:null}});return {style:document.body.dataset.style,rows}})()`);
 const shot=await c.rpc.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(__dirname,'yjcm-name-skin-live.png'),Buffer.from(shot.data,'base64'));
 fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{for(const nodeId of nodes)await c.rpc.call('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]}).catch(()=>{});c.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
