const path = require('node:path');
const { bootstrap, server, chromium, assert, script, read } = require('../../雷的ol/verification/card-beautify-browser.cjs');

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await bootstrap(page, origin, true);
    if (process.argv.includes('--alone')) await page.evaluate(() => { location.hash = 'alone'; });
    await page.addStyleTag({ url: origin + '/extension/十周年UI/src/styles/player4.css' });
    await page.addStyleTag({ url: origin + '/extension/十周年UI/src/styles/icon.css' });
    await page.addStyleTag({ content: '.player{position:absolute!important;left:70px!important;top:70px!important;width:160px!important;height:220px!important}.handcards{position:absolute;left:300px;top:350px;width:700px;height:150px}.handcards>.card{position:relative;left:auto;top:auto;display:inline-block;margin:10px;width:108px;height:150px}.equips-wrap{height:200px!important;bottom:80px!important;right:100px!important}.card{animation:none!important;transition:none!important}' });
    await page.evaluate(() => {
      document.body.dataset.style = 'onlineUI';
      lib.config.extension_十周年UI_aloneEquip = location.hash === '#alone';
      lib.config.extension_十周年UI_newDecadeStyle = 'onlineUI';
      lib.element.player = {};
      lib.translate.zhuge = '诸葛连弩'; lib.translate.chitu = '赤兔'; lib.translate.dilu = '的卢'; lib.translate.muniu = '木牛流马';
      for (const [name, slot] of [['zhuge', 1], ['bagua', 2], ['dilu', 3], ['chitu', 4], ['muniu', 5]]) lib.card[name] = { type: 'equip', subtype: 'equip' + slot, fullskin: true };
      get.info = card => lib.card[card.name];
      get.subtypes = card => [get.subtype(card)];
      get.equipNum = card => Number(get.subtype(card)?.slice(-1));
      get.number = card => card.number; get.suit = card => card.suit;
      window.player = document.createElement('div'); player.className = 'player'; player.dataset.position = '1';
      player.node = { equips: document.createElement('div'), handcards1: document.createElement('div') };
      player.node.equips.className = 'equips'; player.node.handcards1.className = 'handcards';
      player.append(player.node.equips); ui.arena.append(player, player.node.handcards1);
      if (lib.config.extension_十周年UI_aloneEquip) {
        const wrap = document.createElement('div'); wrap.className = 'equips-wrap';
        wrap.append(player.node.equips); ui.arena.append(wrap);
      }
      game.me = { isUnderControl: () => true }; game.players = [game.me, player];
      window.equipment = [];
      window.VCard = name => ({ name, isCard: true });
      lib.config.extension_十周年UI_cardPrettify = 'online';
      window.decadeUI = { statics: { cards: { READ_OK: { online: true }, online: {} } } };
      for (const name of ['zhuge','bagua','dilu','chitu','muniu']) decadeUI.statics.cards.online[name] = { loaded: true, url: lib.assetURL + 'extension/十周年UI/image/card-skins/online/' + name + '.jpg' };
    });
    await page.addScriptTag({content:script('extension/十周年UI/src/config/utils.js','window.cardSkinMeta=s;')});
    await page.addScriptTag({content:script('extension/十周年UI/src/overrides/card/chixueren.js','Object.assign(window,{ensureChixuerenCardDefinition,getChixuerenSkinFilename});')});
    await page.addScriptTag({content:script('extension/十周年UI/src/overrides/card/skin-loader.js','Object.assign(window,{buildSkinUrl:s,createSkinAsset:c,generateSkinFilename:u,getFallbackKey:i,getFallbackSkinUrl:a,getSkinCache:r,isSkinPreloaded:t,loadFallbackSkin:l,loadSkinImage:d});')});
    await page.addScriptTag({content:script('extension/十周年UI/src/overrides/card/skin-applier.js','Object.assign(window,{applyCardSkin:applySkin,handleSkinFallback:f});')});
    await page.addScriptTag({ content: script('extension/十周年UI/src/ui/equip-layout.js', 'Object.assign(window,{refreshEquipLayout,rememberEquipPresentation,restoreEquipPresentation,updateEquipPresentation});') });
    const playerSource = read('extension/十周年UI/src/ui/player-element.js');
    const observerStart = playerSource.indexOf('new MutationObserver(mutations => {');
    const observerEndText = '.observe(a.node.equips, { childList: !0 })';
    const observerSource = playerSource.slice(observerStart, playerSource.indexOf(observerEndText, observerStart) + observerEndText.length).replace('a.node.equips', 'player.node.equips');
    await page.evaluate(observerSource => {
      player.$handleEquipChange = () => refreshEquipLayout(player);
      new Function('player', observerSource)(player);
    }, observerSource);
    const nativePlayer = read('noname/library/element/player.js');
    await page.evaluate(source => {
      lib.element.player.$addVirtualEquip = new Function('return ({' + source + '})')().$addVirtualEquip;
      game.broadcastAll = (callback, ...args) => callback(...args);
    }, nativePlayer.slice(nativePlayer.indexOf('  $addVirtualEquip(card, cards) {'), nativePlayer.indexOf('  $equip(card) {')));
    const prefix = read('extension/十周年UI/src/ui/prefixMark.js');
    await page.addScriptTag({ content: prefix.slice(prefix.indexOf('if (!lib.config["extension_十周年UI_aloneEquip"])')) });
    await page.addScriptTag({ content: script('extension/十周年UI/src/overrides/player/card-movement-online.js', 'Object.assign(window,{hideEquipFlightCard,animateEquipEntryCard});') });
    await page.addScriptTag({ content: script('extension/雷的ol/utils/cardBeautify.js', 'window.controller=installCardBeautify({cardBeautify:"cardBack_3"});') });
    await page.evaluate(() => {
      for (const name of ['zhuge', 'bagua', 'dilu', 'chitu', 'muniu']) {
        const card = makeSample(name, 'spade', 1, undefined, player);
        card.fix = () => card;
        card.expectedName2 = card.node.name2.innerHTML;
        card.expectedName2Nodes = [...card.node.name2.childNodes];
        card.storage.lifecycleMarker = 'preserved';
        card.addGaintag('lifecycle_tag');
        card.expectedCardid = card.cardid;
        lib.element.player.$addVirtualEquip.call(player, VCard(name), [card]);
        equipment.push(card);
      }
      refreshEquipLayout(player);
    });
    await page.waitForFunction(() => [...player.node.equips.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
    assert(await page.evaluate(() => equipment.every(card => card.node.name2.dataset.decadeEquip === '1')), '两类装备栏都应使用可还原的拼装节点');
    assert(await page.evaluate(() => equipment.every(card => {
      const label = card.node.name2;
      return label.querySelector('.decade-equip-type-icon').src.includes('/equip/official/new_equip_type_') &&
        label.querySelector('.decade-equip-suit').naturalWidth > 0 && label.querySelector('.decade-equip-number').naturalWidth > 0 &&
        label.querySelector('.decade-equip-name').textContent.length > 0;
    })), '装备须保留官方类型图标、独立花色点数图片和文字');
    const icons = await page.evaluate(() => equipment.map(card => {
      const icon = card.node.name2.querySelector(card.dataset.decadeHorse ? '.decade-equip-horse-icon' : ':scope>img');
      const label = card.node.name2.getBoundingClientRect(); const bounds = icon?.getBoundingClientRect();
      return { name: card.name, icon: bounds?.toJSON(), label: label.toJSON(), display: icon && getComputedStyle(icon).display };
    }));
    for (const { name, icon, label, display } of icons) {
      assert(display !== 'none' && icon?.width > 0 && icon?.height > 0, `${name}: 装备小图标应可见`);
      assert(icon.left >= label.left && icon.right <= label.right && icon.top >= label.top && icon.bottom <= label.bottom, `${name}: 装备图标应完整位于横条内`);
    }
    const suffix = process.argv.includes('--alone') ? '-alone' : '';
    await page.screenshot({ path: path.join(__dirname, `equip-card-icons-browser${suffix}.png`) });
    await page.evaluate(() => {
      player._decadeEquipFlights = [{ sourceCard: equipment[0], name: equipment[0].name }];
      hideEquipFlightCard(player, equipment[0]);
      animateEquipEntryCard(equipment[1], 500);
      window.copies = equipment.map(card => { const copy = card.copy('thrown', 'gainingcard'); player.node.handcards1.append(copy); return copy; });
      window.orderingCopies = equipment.map((card, index) => {
        const copy = card.copy('thrown'); Object.assign(copy.style,{left:(310+128*index)+'px',top:'220px',width:'108px',height:'150px'}); ui.arena.append(copy); return copy;
      });
    });
    await page.waitForFunction(() => [...copies,...orderingCopies].every(card => card.classList.contains('lei-ol-card-face-ready')));
    assert(await page.evaluate(() => equipment[0].style.visibility==='hidden' && equipment[1].style.opacity==='0'), '复制展示牌不得提前解除装备区原牌的入场隐藏');
    const copies = await page.evaluate(() => [...copies,...orderingCopies].map(card => ({ name: card.name, bounds: card.getBoundingClientRect().toJSON(), face: card.querySelector('.lei-ol-card-face')?.getBoundingClientRect().toJSON(), name2: getComputedStyle(card.querySelector('.name2')).display, layout: card.dataset.equipSlot, horse: !!card.querySelector('.decade-equip-horse'), assembled: card.querySelector('.name2').dataset.decadeEquip, opacity: getComputedStyle(card).opacity, visibility: getComputedStyle(card).visibility })));
    await page.screenshot({ path: path.join(__dirname, `equip-card-lifecycle-browser${suffix}.png`) });
    for (const copy of copies) {
      assert.equal(copy.layout, undefined, `${copy.name}: 副本不应携带装备布局标记`);
      assert.equal(copy.horse, false, `${copy.name}: 副本不应携带坐骑横条`);
      assert.equal(copy.assembled, undefined, `${copy.name}: 副本不应携带拼装横条标记`);
      assert(copy.bounds.height > copy.bounds.width && copy.face.height > copy.face.width, `${copy.name}: 拆顺/弃置展示须恢复竖版卡面`);
      assert.equal(copy.opacity, '1', `${copy.name}: 副本不应继承装备入场透明度`);
      assert.equal(copy.visibility, 'visible', `${copy.name}: 副本不应继承装备飞行隐藏状态`);
    }
    await page.evaluate(() => equipment.forEach(card => {
      player.node.handcards1.append(card);
      card.style.transform = 'translateX(12px)';
    }));
    await page.waitForFunction(() => equipment.every(card => card.classList.contains('lei-ol-card-face-ready')));
    const restored = await page.evaluate(() => equipment.every(card => card.node.name2.innerHTML === card.expectedName2 && !card.dataset.equipSlot && !card.node.name2.dataset.decadeEquip && !card.querySelector('.decade-equip-horse') && card.cardid === card.expectedCardid && card.hasGaintag('lifecycle_tag') && card.storage.lifecycleMarker === 'preserved' && card.expectedName2Nodes.every((node,index) => card.node.name2.childNodes[index] === node)));
    assert(restored, '实体装备牌离区后应恢复原卡牌节点');
    await page.waitForTimeout(650);
    assert(await page.evaluate(() => equipment.every(card => card.style.transform === 'translateX(12px)' && getComputedStyle(card).opacity === '1' && getComputedStyle(card).visibility === 'visible')), '延迟入场动画不得改动已入手的实体牌');
    console.log(JSON.stringify({ icons: icons.length, copies: copies.length, restored, animationCleanup: true, errors }, null, 2));
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
