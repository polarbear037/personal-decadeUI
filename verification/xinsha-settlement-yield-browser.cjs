const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('./online-player-tips-browser.cjs');

(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<!doctype html><meta charset="utf-8">');
    await page.evaluate(() => {
      window.calls=[];window.clock=100;
      Object.defineProperty(performance,'now',{value:()=>clock,configurable:true});
      Object.defineProperty(window,'scheduler',{configurable:true,writable:true,value:{yield(){
        calls.push('yield');return new Promise(resolve=>setTimeout(()=>{calls.push('paint');resolve();},0));
      }}});
      window.lib={config:{extension_十周年UI_newDecadeStyle:'othersOff'},element:{GameEvent:class {
        waitNext(...args){calls.push(this.name);if(this.fail)throw new Error('native failure');return this.lastPromise=Promise.resolve(args);}
      }}};
    });
    const source=fs.readFileSync(path.join(__dirname,'../src/ui/card-settlement-xinsha.js'),'utf8')
      .replace('import { lib } from "noname";','').replace('export function installXinshaCardSettlementYield','function installXinshaCardSettlementYield');
    await page.addScriptTag({content:source+'\nwindow.installYield=installXinshaCardSettlementYield;'});
    const result=await page.evaluate(async()=>{
      const create=(name,parent)=>Object.assign(new lib.element.GameEvent(),{name,parent});
      const installed=installYield(),duplicate=installYield();
      const phase=create('phaseUse');
      const unchanged=phase.waitNext(1)===phase.lastPromise;
      const phaseCalls=calls.splice(0);
      const use=create('useCard',phase);const pending=use.waitNext('card',2);
      const before=calls.slice();const value=await pending;const after=calls.splice(0);
      clock=120;const child=create('lose',use);await child.waitNext(3);const childCalls=calls.splice(0);
      const parentUnchanged=child.parent===use&&use.parent===phase;
      clock=140;const failing=create('respond',phase);failing.fail=true;
      let error;try{await failing.waitNext();}catch(e){error=e.message;}calls.length=0;
      clock=160;lib.config.extension_十周年UI_newDecadeStyle='onlineUI';
      const onlinePromise=use.waitNext(4);const onlineIdentity=onlinePromise===use.lastPromise;await onlinePromise;const onlineCalls=calls.splice(0);
      lib.config.extension_十周年UI_newDecadeStyle='othersOff';
      clock=180;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      await use.waitNext(5);const hiddenCalls=calls.splice(0);
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
      clock=200;const reused=create('chooseCard',phase);await reused.waitNext();calls.length=0;
      reused.parent=use;clock=220;await reused.waitNext();const reparented=calls.splice(0);
      window.scheduler=undefined;clock=240;const fallback=use.waitNext(6);const fallbackBefore=calls.length;await fallback;const fallbackAfter=calls.splice(0);
      return {installed,duplicate,unchanged,phaseCalls,before,value,after,childCalls,parentUnchanged,error,onlineIdentity,onlineCalls,hiddenCalls,reparented,fallbackBefore,fallbackAfter};
    });
    assert.equal(result.installed,true);assert.equal(result.duplicate,false);
    assert.equal(result.unchanged,true);assert.deepEqual(result.phaseCalls,['phaseUse']);
    assert.deepEqual(result.before,['yield']);assert.deepEqual(result.value,['card',2]);
    assert.deepEqual(result.after,['yield','paint','useCard']);
    assert.deepEqual(result.childCalls,['yield','paint','lose']);assert.equal(result.parentUnchanged,true);
    assert.equal(result.error,'native failure');assert.equal(result.onlineIdentity,true);
    assert.deepEqual(result.onlineCalls,['useCard']);assert.deepEqual(result.hiddenCalls,['useCard']);
    assert.deepEqual(result.reparented,['yield','paint','chooseCard']);
    assert.equal(result.fallbackBefore,0);assert.deepEqual(result.fallbackAfter,['useCard']);assert.deepEqual(errors,[]);
    console.log('XINSHA_SETTLEMENT_YIELD_OK: event order, parent, return/error, idempotence, Online/background isolation and timer fallback');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
