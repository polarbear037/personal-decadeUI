const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { connect } = require('F:/noname/后台调试/noname-debug.cjs');

(async () => {
  const connection = await connect();
  try {
    if (process.argv.includes('--install')) {
      // 原位更新公共函数，保留 lose / give / throw 已共享的 WeakMap，不能另载一份快照表。
      if (connection.kind !== 'renderer') throw new Error('Live update requires renderer debugging');
      await connection.rpc.call('Debugger.enable');
      try {
        const fn = await connection.rpc.call('Runtime.evaluate', {
          expression: 'import("./extension/十周年UI/src/utils/hand-card-position.js").then(m => m.captureHandCardPosition)', awaitPromise: true,
        });
        const properties = await connection.rpc.call('Runtime.getProperties', { objectId: fn.result.objectId });
        const location = properties.internalProperties.find(property => property.name === '[[FunctionLocation]]')?.value?.value;
        if (!location?.scriptId) throw new Error('Shared hand position script not found');
        const scriptSource = fs.readFileSync(path.join(__dirname, '../src/utils/hand-card-position.js'), 'utf8');
        const updated = await connection.rpc.call('Debugger.setScriptSource', { scriptId: location.scriptId, scriptSource });
        if (updated.status !== 'Ok') throw new Error('Shared position live update: ' + JSON.stringify(updated));
      } finally { await connection.rpc.call('Debugger.disable'); }
      await connection.evaluate(`(async () => {
        const { game, lib } = await import('./noname.js');
        if (lib.config.extension_十周年UI_newDecadeStyle !== 'othersOff') throw new Error('Unexpected live style');
        const moduleURL = new URL('./extension/十周年UI/src/overrides/player/card-movement-xinsha.js', location.href);
        const source = await (await fetch(moduleURL, { cache: 'no-store' })).text();
        const fresh = source.replace(/from\\s*(["'])([^"']+)\\1/g, (match, quote, specifier) => {
          if (!specifier.startsWith('.')) return match;
          const resolved = new URL(specifier, moduleURL);
          return 'from ' + JSON.stringify(resolved.href);
        });
        const blobURL = URL.createObjectURL(new Blob([fresh], { type: 'text/javascript' }));
        let movement;
        try { movement = await import(blobURL); } finally { URL.revokeObjectURL(blobURL); }
        let owner = game.me;
        while (owner && !Object.hasOwn(owner, '$give')) owner = Object.getPrototypeOf(owner);
        if (!owner || !['movementOverrides.playerGive', 'applyHandCardPosition'].some(text => owner.$give.toString().includes(text))) throw new Error('Unexpected give wrapper');
        owner.$give = movement.playerGive;
      })()`);
    }
    const result = await connection.evaluate(`(${async function () {
      const { game, ui, lib, _status } = await import('./noname.js');
      const beforeEvent = _status.event, paused = _status.paused;
      const cards = game.me.getCards('h');
      const target = game.players.find(player => player !== game.me);
      if (!cards.length || !target) throw new Error('No local hand card or recipient');
      const state = () => JSON.stringify(game.players.map(player => [player.playerid, player.getCards('hesjx').map(card => card.cardid)]));
      const beforeState = state();
      const rect = node => {
        const r = node.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      };
      const source = rect(cards[0]);
      const previous = new Set(ui.arena.children);
      game.me.$give([cards[0]], target, false, false);
      const clone = [...ui.arena.children].find(node => !previous.has(node) && node.classList.contains('gainingcard'));
      if (!clone) throw new Error('Give clone missing');
      const start = rect(clone);
      // 后台窗口的 rAF 可能降频，允许正常动画与清理走完，不改变页面可见状态。
      for (let attempt = 0; clone.isConnected && attempt < 30; attempt++) await new Promise(resolve => setTimeout(resolve, 200));
      return { style: lib.config.extension_十周年UI_newDecadeStyle, source, start,
        delta: Object.fromEntries(Object.keys(source).map(key => [key, start[key] - source[key]])),
        cleaned: !clone.isConnected, sameEvent: _status.event === beforeEvent,
        samePaused: _status.paused === paused, sameCards: state() === beforeState };
    }.toString()})()`);
    const baseline = process.argv.includes('--baseline');
    fs.writeFileSync(path.join(__dirname, `give-flight-origin-live-${baseline ? 'before' : 'after'}-results.json`), JSON.stringify(result, null, 2) + '\n');
    assert.ok(result.cleaned && result.sameEvent && result.samePaused && result.sameCards, 'Live state or cleanup changed');
    if (baseline) assert.ok(Math.abs(result.delta.y) > 5, 'Baseline did not reproduce');
    else for (const delta of Object.values(result.delta)) assert.ok(Math.abs(delta) < .1, 'Live origin mismatch');
    console.log(JSON.stringify(result));
  } finally { connection.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
