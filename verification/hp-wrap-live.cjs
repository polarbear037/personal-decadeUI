const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { connect } = require('F:/noname/后台调试/noname-debug.cjs');

(async () => {
 const connection=await connect();
 try {
  const result=await connection.evaluate(`(async()=>{
   const {game,ui,_status}=await import('./noname.js');
   if(document.body.dataset.style!=='othersOff') throw Error('Expected othersOff style');
   const event=_status.event, selected=ui.selected.cards.slice(), players=game.players.slice(), health=players.map(p=>p.hp);
   const beadPositions=()=>players.map(p=>{const r=p.getBoundingClientRect();return [...p.node.hp.children].map(n=>{const b=n.getBoundingClientRect();return [b.left-r.left,b.top-r.top,b.width,b.height]})});
   const beadsBefore=beadPositions();
   const old=[...document.querySelectorAll('link[rel=stylesheet]')].find(n=>n.href.includes('/src/styles/player3.css'));
   if(!old) throw Error('player3 stylesheet not found');
   const replacement=old.cloneNode();
   replacement.href=new URL('extension/十周年UI/src/styles/player3.css?hp-wrap-fix='+Date.now(),location.href).href;
   await new Promise((resolve,reject)=>{replacement.onload=resolve;replacement.onerror=()=>reject(Error('player3 reload failed'));old.after(replacement)});
   old.remove();
   await document.fonts.ready;
   await new Promise(resolve=>setTimeout(resolve,180));
   const beadsAfter=beadPositions();
   const beadPositionsUnchanged=beadsBefore.every((row,i)=>row.length===beadsAfter[i].length&&row.every((b,j)=>b.every((v,k)=>Math.abs(v-beadsAfter[i][j][k])<.02)));
   return {style:document.body.dataset.style,borderStyle:ui.arena.dataset.borderStyle,beadPositionsUnchanged,
    eventUnchanged:_status.event===event,
    selectionUnchanged:selected.length===ui.selected.cards.length&&selected.every((c,i)=>c===ui.selected.cards[i]),
    playersUnchanged:players.length===game.players.length&&players.every((p,i)=>p===game.players[i]),
    hpUnchanged:players.every((p,i)=>p.hp===health[i]),
    players:game.players.map(p=>{
     const wrap=p.node.hpWrap,hp=p.node.hp,w=wrap.getBoundingClientRect(),last=hp.lastElementChild?.getBoundingClientRect();
     return {position:p.dataset.position,grade:p.dataset.borderLevel||ui.arena.dataset.borderLevel,maxHp:p.dataset.maxHp,
      source:getComputedStyle(wrap,'::before').borderImageSource,bgHeight:parseFloat(getComputedStyle(wrap,'::before').height),
      backgroundTransform:getComputedStyle(wrap,'::before').transform,
      hpBottom:parseFloat(getComputedStyle(hp).bottom),centerBottom:last?(w.bottom-last.top-last.height/2)/(w.height/105):null};
    })};
  })()`);
  for(const p of result.players.filter(p=>p.grade==='five')) {
   if(result.borderStyle==='dragon4') {
    assert.match(p.source,/dragon4_hp_grade_5/);
    assert.equal(p.backgroundTransform,'matrix(1, 0, 0, 1, 4, 8)');
    assert.ok(Math.abs(p.hpBottom-(p.maxHp==='hujia'?19:14))<.1,JSON.stringify(p));
   }
  }
  if(result.playersUnchanged&&result.hpUnchanged) assert.equal(result.beadPositionsUnchanged,true,'HP bead positions must stay unchanged');
  fs.writeFileSync(path.join(__dirname,'hp-wrap-live-results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
 } finally {connection.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
