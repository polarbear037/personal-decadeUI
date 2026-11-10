const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { server, chromium, seed } = require('./online-player-tips-browser.cjs');
seed.characters = ['standard', 'sp', 'onlyOL', 'huicui', 'clan'];
seed.cards = ['standard', 'extra'];

(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const results = [];
 try {
  for (const [style, phone] of [['onlineUI', false], ['onlineUI', true], ['on', false], ['codename', false]]) {
   seed.extension_十周年UI_newDecadeStyle = style;
   seed.extension_十周年UI_playerMarkStyle = phone ? 'yellow' : 'decade';
   seed.phonelayout = phone;
   const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
   const page = await context.newPage();
   const errors = [], failed = [];
   page.on('pageerror', error => errors.push(String(error)));
   page.on('response', response => { if (response.status() >= 400) failed.push([response.status(), response.url()]); });
   page.on('dialog', dialog => dialog.accept());
   await page.goto(`http://127.0.0.1:${server.address().port}/player-tips-probe`);
   await page.waitForFunction(async () => {
    const { game, ui } = await import('/noname.js');
    return game.players.length > 1 && window.decadeUI && ui.autonode && Array.isArray(ui.dialogs);
   }, null, { timeout: 45000 });
   await page.waitForTimeout(1500);
   const initial = await page.evaluate(async () => {
    const { game, ui, lib, get, ai, _status } = await import('/noname.js');
    Object.assign(window, { game, ui, lib, get, ai, _status });
    game.pause();
    for (const dialog of [...ui.dialogs]) dialog.close();
    document.querySelector('.decade-welcome-overlay')?.remove();
    game.me = game.players[0]; game.me.init('liubei'); game.players[1].init('guanyu');
    game.me.directgain([game.createCard('sha', 'spade', 8), game.createCard('tao', 'heart', 3)]);
    ui.arena.classList.remove('choose-character');
    ui.auto.show();
    _status.gameStarted = true; _status.over = false; _status.paused2 = false;
    _status.imchoosing = false; _status.auto = false;
    const event = game.createEvent('phaseUse', false); event.player = game.me;
    _status.eventManager.setStatusEvent(event, true);
    lib.skill.online_probe_counter = { intro: { content: count => `计数 ${count}` } };
    lib.translate.online_probe_counter_bg = '计';
    game.me.addMark('online_probe_counter', 3, false);
    game.me.markSkill('wusheng', { content: '武圣' });
    if (lib.config.extension_十周年UI_newDecadeStyle === 'onlineUI') {
     game.me.addMark('baonu', 3, false);
     game.me.markAuto('olkuangmo_effect', game.players[1]);
     game.players[1].markAuto('olkuangmo_effect', game.me);
    }
    window.readAuto = () => {
     const style = node => getComputedStyle(node);
     const cancel = ui.autonode.lastElementChild;
     const badges = [...ui.arena.querySelectorAll('.online-seat-trusteeship')].filter(node => node.getClientRects().length > 0);
     const seatBadge = badges[0];
     return { auto: _status.auto, arenaAuto: ui.arena.classList.contains('auto'),
      seatBadgeCount: badges.length, seatBadge: seatBadge?.textContent,
      seatBadgeOnSelf: seatBadge?.parentElement === game.me.node.marks,
      seatBadgeRect: seatBadge?.getBoundingClientRect().toJSON(), playerRect: game.me.getBoundingClientRect().toJSON(),
      marks: [...game.me.node.marks.querySelectorAll('.mark')].filter(node => node.getClientRects().length > 0).map(node => ({
       text: node.querySelector('.mark-text')?.textContent, count: node.querySelector('.mark-count')?.textContent,
       background: style(node).borderImageSource, rect: node.getBoundingClientRect().toJSON(),
      })),
      background: style(ui.autonode).backgroundImage, opacity: style(ui.autonode).opacity,
      text: ui.autonode.textContent,
      cancel: cancel.textContent, cancelBackground: style(cancel).backgroundImage,
      cancelRect: cancel.getBoundingClientRect().toJSON(), cancelColor: style(cancel).color,
      cancelFont: style(cancel).fontSize, panelRect: ui.autonode.getBoundingClientRect().toJSON(),
      nodes: ui.autonode.children.length, windowCss: [...document.styleSheets].some(sheet => sheet.href?.includes('/lbtn/window/')) };
    };
    return readAuto();
   });
   await page.evaluate(() => ui.click.auto());
   await page.waitForTimeout(600);
   const active = await page.evaluate(() => readAuto());
   assert.equal(active.auto, true); assert.equal(active.arenaAuto, true);
   assert.equal(initial.seatBadgeCount, 0);
   if (style === 'onlineUI') {
    assert.equal(active.seatBadgeCount, 1);
    assert.equal(active.seatBadge, '托管'); assert.equal(active.seatBadgeOnSelf, true);
    assert.deepEqual(active.marks.map(mark => [mark.text, mark.count]), [['托管', undefined], ['计', '3'], ['武圣', undefined]]);
    assert(active.marks.every(mark => /seat_state_bg_new\.png/.test(mark.background)));
    assert(active.marks[1].rect.bottom < active.marks[0].rect.top);
    assert(active.marks[2].rect.bottom < active.marks[1].rect.top);
    assert(Math.abs((active.seatBadgeRect.left - active.playerRect.left) / active.playerRect.width - 28 / 174) < 0.015);
    assert(Math.abs((active.seatBadgeRect.top - active.playerRect.top) / active.playerRect.height - 80 / 232) < 0.015);
    assert.equal(active.text, '取消托管'); assert.equal(active.cancel, '取消托管');
    assert.match(active.background, /trusteeship_bg_new\.png/);
    assert.match(active.cancelBackground, /secbtn_sub\.png/);
    assert.equal(active.nodes, 1);
    assert(active.cancelRect.width > 0 && active.cancelRect.y > 0);
    assert(active.cancelRect.bottom <= active.panelRect.bottom + 1);
    await documentFonts(page);
    await page.screenshot({ path: path.join(__dirname, `online-auto-${phone ? 'phone-layout' : 'desktop'}.png`) });
    await page.locator('.online-auto-cancel').click();
   } else {
    assert.equal(active.seatBadgeCount, 0);
    assert.equal(active.text, '托管中...');
    assert.match(active.cancelBackground, /CD\/tuoguan2\.png/);
    await page.locator('#autonode > div').click();
   }
   await page.waitForTimeout(600);
   const cancelled = await page.evaluate(() => readAuto());
   assert.equal(cancelled.auto, false); assert.equal(cancelled.arenaAuto, false);
   assert.equal(cancelled.seatBadgeCount, 0);
   if (style === 'onlineUI') assert.deepEqual(cancelled.marks.map(mark => [mark.text, mark.count]), [['计', '3'], ['武圣', undefined]]);
   assert.equal(cancelled.opacity, '0');
   if (style === 'onlineUI') {
    const markInteraction = await page.evaluate(() => {
     const player = game.me;
     const card = game.createCard('sha', 'spade', 8);
     player.$addToExpansion([card], false, ['olfushi']);
     player.updateMark('olfushi');
     const pile = player.marks.olfushi;
     const gray = player.marks.online_probe_counter;
     lib.skill.online_probe_text = { intro: { mark: () => '只显示状态' } };
     player.markSkill('online_probe_text');
     const text = player.marks.online_probe_text;
     const textType = text.dataset.onlineMarkType;
     const textIntro = !!get.nodeintro(text);
     player.unmarkSkill('online_probe_text');
     gray.dispatchEvent(new MouseEvent('click', { bubbles: true }));
     const grayPopup = !!document.querySelector('#nodeintro.popped:not(.removing)');
     const rect = pile.getBoundingClientRect();
     const seat = player.getBoundingClientRect();
     pile.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 10, clientY: rect.top + 10 }));
     const popup = document.querySelector('#nodeintro.popped:not(.removing)');
     const result = { grayPopup, textType, textIntro, pilePopup: !!popup, cards: popup?.querySelectorAll('.button.card').length,
      actionX: (rect.left - seat.left) / seat.width, actionY: (rect.top - seat.top) / seat.height,
      compact: popup?.classList.contains('online-mark-card-dialog'),
      tag: popup?.querySelector('.online-mark-card-tag')?.textContent,
      count: pile.markcount.textContent, pileBackground: getComputedStyle(pile).borderImageSource,
      grayBackground: getComputedStyle(gray).borderImageSource, grayHover: !!get.nodeintro(gray) };
     document.querySelector('.poplayer')?.click();
     card.remove();
     player.updateMark('olfushi');
     result.emptyVisible = pile.getClientRects().length > 0;
     player.$addToExpansion([card], false, ['olfushi']);
     player.updateMark('olfushi');
     result.refilled = pile.getClientRects().length > 0 && pile.markcount?.textContent === '1' && pile.querySelectorAll('.mark-count').length === 1;
     card.remove();
     player.unmarkSkill('olfushi');
     lib.skill.online_probe_cards = { intro: { markcount: 'expansion', content: () => '附属牌' } };
     player.$addToExpansion([card], false, ['online_probe_cards']);
     player.updateMark('online_probe_cards');
     const extraMark = player.marks.online_probe_cards;
     result.fallbackCards = get.nodeintro(extraMark)?.querySelectorAll('.button.card').length;
     card.remove();
     player.unmarkSkill('online_probe_cards');
     return result;
    });
    assert.equal(markInteraction.grayPopup, false);
    assert.equal(markInteraction.textType, 'status');
    assert.equal(markInteraction.textIntro, false);
    assert.equal(markInteraction.pilePopup, true);
    assert.equal(markInteraction.cards, 1);
    assert.equal(markInteraction.compact, true);
    assert.equal(markInteraction.tag, '缚豕');
    assert(Math.abs(markInteraction.actionX - 123 / 174) < 0.02, JSON.stringify(markInteraction));
    assert(Math.abs(markInteraction.actionY - 50 / 232) < 0.02, JSON.stringify(markInteraction));
    assert.equal(markInteraction.count, '1');
    assert.match(markInteraction.pileBackground, /seat_state_btn_0_new2024\.png/);
    assert.match(markInteraction.grayBackground, /seat_state_bg_new\.png/);
    assert.equal(markInteraction.emptyVisible, false);
    assert.equal(markInteraction.refilled, true);
    assert.equal(markInteraction.grayHover, false);
    assert.equal(markInteraction.fallbackCards, 1);
    active.markInteraction = markInteraction;
    const hiddenPile = await page.evaluate(async () => {
     const self = game.me, owner = game.players[1];
     const horses = ['chitu', 'dawan', 'dilu'].map(name => game.createCard(name));
     owner.$addToExpansion(horses, false, ['olxinggu']);
     owner.updateMark('olxinggu');
     const mark = owner.marks.olxinggu;
     const read = async () => {
      getComputedStyle(mark).borderImageSource;
      await Promise.allSettled(mark.getAnimations().map(animation => animation.finished));
      const intro = get.nodeintro(mark);
      return { type: mark.dataset.onlineMarkType, count: mark.markcount?.textContent,
       background: getComputedStyle(mark).borderImageSource, intro: !!intro,
       cards: intro?.querySelectorAll('.button.card').length };
     };
     const other = await read();
     game.swapControl(owner);
     const own = await read();
     game.swapControl(self);
     const returned = await read();
     horses.forEach(card => card.remove());
     owner.updateMark('olxinggu');
     const empty = mark.dataset.onlineMarkType;
     owner.unmarkSkill('olxinggu');
     return { other, own, returned, empty };
    });
    assert.deepEqual([hiddenPile.other.type, hiddenPile.other.count, hiddenPile.other.intro], ['status', '3', false]);
    assert.match(hiddenPile.other.background, /seat_state_bg_new\.png/);
    assert.deepEqual([hiddenPile.own.type, hiddenPile.own.cards], ['dialog', 3]);
    assert.match(hiddenPile.own.background, /seat_state_btn_0_new2024\.png/);
    assert.deepEqual(hiddenPile.returned, hiddenPile.other);
    assert.equal(hiddenPile.empty, 'empty');
    active.hiddenPile = hiddenPile;
    await page.evaluate(() => {
     const player = game.me;
     const tribute = game.createCard('huogong', 'heart', 3);
     const tied = game.createCard('sha', 'spade', 8);
     player.$addToExpansion([tribute], false, ['olsblucun']);
     player.updateMark('olsblucun');
     player.addSkill('olsblucun_used');
     player.markAuto('olsblucun_used', [
      get.autoViewAs({ name: 'shunshou' }, 'unsure'),
      get.autoViewAs({ name: 'sha', nature: 'fire' }, 'unsure'),
     ]);
     player.$addToExpansion([tied], false, ['olfushi']);
     player.updateMark('olfushi');
     window.markedCards = [tribute, tied];
    });
    const seat = page.locator('#arena>.player[data-position="0"]');
    const tributeMark = seat.locator('.mark[data-online-lucun="pile"]');
    assert.equal(await tributeMark.getAttribute('data-online-mark-type'), 'status');
    assert.equal(await tributeMark.locator('.mark-count').textContent(), '1');
    await tributeMark.click();
    assert.equal(await page.locator('#nodeintro.popped:not(.removing)').count(), 0);
    await seat.locator('.mark[data-online-lucun="used"]').click();
    const markDialog = page.locator('#nodeintro.online-mark-card-dialog:not(.removing)');
    await markDialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
     const dialog = document.querySelector('#nodeintro.online-mark-card-dialog:not(.removing)');
     return dialog && Number(getComputedStyle(dialog).opacity) > 0.99;
    });
    assert.equal(await markDialog.locator('.content > .caption').first().textContent(), '赂存');
    assert.equal(await markDialog.locator('.online-mark-card-tag').count(), 0);
    await page.waitForFunction(() => {
     const banners = [...document.querySelectorAll('#nodeintro.online-lucun-card-dialog .online-mark-vcard-image')];
     return banners.length === 2 && banners.every(image => image.naturalWidth === 221);
    });
    const compactLayout = await page.evaluate(() => {
     const first = game.me.marks.olsblucun_used.getBoundingClientRect();
     const second = game.me.marks.olfushi.getBoundingClientRect();
     const dialog = document.querySelector('#nodeintro.online-mark-card-dialog:not(.removing)');
     const card = dialog.querySelector('.button.card');
     return { gap: second.top - first.bottom, dialog: dialog.getBoundingClientRect().toJSON(),
      card: card.getBoundingClientRect().toJSON(), frame: getComputedStyle(dialog, '::before').borderImageSource,
      banners: [...dialog.querySelectorAll('.online-mark-vcard-image')].map(image => image.src.split('/').at(-1)),
      suits: dialog.querySelectorAll('.online-mark-card-tag').length };
    });
    assert(compactLayout.gap > 0, JSON.stringify(compactLayout));
    assert.match(compactLayout.frame, /tip_bg\.png/);
    assert(compactLayout.card.left >= compactLayout.dialog.left && compactLayout.card.bottom <= compactLayout.dialog.bottom);
    assert(compactLayout.card.width > compactLayout.card.height * 3);
    assert.deepEqual(compactLayout.banners, ['shunshou.png', 'sha_fire.png']);
    if (!phone) {
     await documentFonts(page);
     await page.screenshot({ path: path.join(__dirname, 'online-mark-card-dialog-browser.png') });
    }
    await page.locator('.poplayer').last().click({ position: { x: 10, y: 10 } });
    await page.evaluate(() => {
     game.me.removeSkill('olsblucun_used');
    });
    await page.waitForFunction(() => {
     const { olsblucun, olsblucun_used, olfushi } = game.me.marks;
     return !olsblucun_used && olsblucun.dataset.onlineMarkType === 'status' && olfushi.style.getPropertyValue('--online-mark-index') === '0';
    });
    await page.evaluate(() => {
     markedCards.forEach(card => card.remove());
     for (const skill of ['olsblucun', 'olfushi']) game.me.unmarkSkill(skill);
    });
    active.compactLayout = compactLayout;
    await page.evaluate(() => {
     game.me.addSkill('clanbaozu');
     game.me.addSkill('olfenyue');
     game.me.addSkill('olfeiyang');
     ui.updateSkillControl(game.me);
    });
    await documentFonts(page);
    await page.waitForFunction(() => game.me.node.xSkillMarks.querySelector('.skillMarkItem.zhuanhuanji[data-id="olfenyue"]'));
    if (!phone) await page.screenshot({ path: path.join(__dirname, 'online-circle-mark-browser.png') });
    const graphicMarks = await page.evaluate(async () => {
     const player = game.me, other = game.players[1];
     const lane = player.node.xSkillMarks;
     const fury = lane.querySelector('[data-state-id="18"]');
     const frenzy = lane.querySelector('[data-state-id="3730"]');
     const otherFrenzy = other.node.xSkillMarks.querySelector('[data-state-id="3730"]');
     const conversion = lane.querySelector('.skillMarkItem.zhuanhuanji[data-id="olfenyue"]');
     conversion.style.transform = 'scale(1.2)';
     conversion.style.animation = 'none';
     const limited = ['clanbaozu', 'olfeiyang'].map(skill => lane.querySelector(`.skillMarkItem.xiandingji[data-id="${skill}"]`));
     const centerXs = [...limited, conversion, fury, frenzy].map(mark => {
      const { left, width } = mark.getBoundingClientRect();
      return left + width / 2;
     });
     const overlap = (a, b) => a.top < b.bottom && b.top < a.bottom;
     const visible = badge => {
      const rect = badge.getBoundingClientRect();
      return badge.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
     };
     const initial = { fury: fury.textContent, frenzy: frenzy.textContent, other: otherFrenzy.textContent,
      color: getComputedStyle(frenzy).getPropertyValue('--online-circle-color'),
      mask: getComputedStyle(frenzy, '::before').maskImage,
      right: frenzy.getBoundingClientRect().left > player.getBoundingClientRect().left + player.getBoundingClientRect().width / 2,
      separate: [fury, frenzy].every(badge => !overlap(badge.getBoundingClientRect(), conversion.getBoundingClientRect())),
      hittable: [fury, frenzy, otherFrenzy].every(visible), centerXs,
      iconRect: frenzy.getBoundingClientRect().toJSON(), conversionRect: conversion.getBoundingClientRect().toJSON(),
      playerRect: player.getBoundingClientRect().toJSON(), laneDisplay: getComputedStyle(lane).display };
     conversion.style.removeProperty('transform');
     conversion.style.removeProperty('animation');
     frenzy.click();
     initial.popup = !!document.querySelector('#nodeintro.popped:not(.removing)');
     document.querySelector('.poplayer')?.click();
     player.addMark('baonu', 3, false);
     await new Promise(requestAnimationFrame);
     const lit = { text: fury.textContent, frame: getComputedStyle(fury, '::after').backgroundImage };
     player.removeMark('baonu', 6, false);
     player.unmarkAuto('olkuangmo_effect', other);
     await new Promise(requestAnimationFrame);
     other.addSkill('panshi');
     other.addMark('cxliushi2', 2, false);
     await new Promise(requestAnimationFrame);
     const child = other.node.xSkillMarks.querySelector('[data-state-id="304"]');
     const arrow = other.node.xSkillMarks.querySelector('[data-state-id="278"]');
     const arrowGlyphs = [...arrow.querySelectorAll('.online-circle-glyph')].map(glyph => glyph.textContent);
     const arrowCount = arrow.querySelector('.online-circle-count').textContent;
     other.removeMark('cxliushi2', 2, false);
     await new Promise(requestAnimationFrame);
     return { initial, lit, removed: !fury.isConnected && !frenzy.isConnected, otherRemains: otherFrenzy.isConnected,
      child: child?.textContent, arrowGlyphs, arrowCount, arrowRemoved: !arrow.isConnected };
    });
    assert.deepEqual([graphicMarks.initial.fury, graphicMarks.initial.frenzy, graphicMarks.initial.other], ['怒3', '狂', '狂']);
    assert.equal(graphicMarks.initial.color, '#ba3000');
    assert.match(graphicMarks.initial.mask, /state_icon_bg\.png/);
    assert(graphicMarks.initial.right && graphicMarks.initial.separate, JSON.stringify(graphicMarks.initial));
    assert(graphicMarks.initial.hittable, JSON.stringify(graphicMarks.initial));
    assert(Math.max(...graphicMarks.initial.centerXs) - Math.min(...graphicMarks.initial.centerXs) < 0.5, JSON.stringify(graphicMarks.initial));
    assert.equal(graphicMarks.initial.popup, true);
    assert.equal(graphicMarks.child, '子');
    assert.deepEqual(graphicMarks.arrowGlyphs, ['流', '矢']);
    assert.equal(graphicMarks.arrowCount, '2');
    assert(graphicMarks.arrowRemoved);
    assert.equal(graphicMarks.lit.text, '怒6');
    assert.match(graphicMarks.lit.frame, /state_icon_frame_light\.png/);
    assert(graphicMarks.removed && graphicMarks.otherRemains);
    active.graphicMarks = graphicMarks;
    await page.evaluate(() => ui.click.auto());
    await page.waitForTimeout(600);
    await page.locator('.online-auto-cancel').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => _status.auto), false);
    const lifecycle = await page.evaluate(async () => {
     const { createOnlineLbtnPlugin } = await import('/extension/十周年UI/ui/lbtn/skins/online.js');
     const plugin = createOnlineLbtnPlugin(lib, game, ui, get, ai, _status, {});
     plugin.initAutoNode(); plugin.initAutoNode();
     plugin.openMenu();
     return { nodes: ui.autonode.children.length, menu: [...document.querySelectorAll('.controls')].find(node => node.style.backgroundImage.includes('tool_trusteeship_0'))?.style.backgroundImage };
    });
    assert.equal(lifecycle.nodes, 1);
    assert.match(lifecycle.menu, /tool_trusteeship_0\.png/);
    await page.waitForTimeout(700);
    const menuState = await page.evaluate(async () => {
     const button = [...document.querySelectorAll('.controls')].find(node => node.style.backgroundImage.includes('tool_trusteeship_0'));
     button.click(); await new Promise(resolve => setTimeout(resolve, 150));
     const on = { auto: _status.auto, image: button.style.backgroundImage };
     button.click(); await new Promise(resolve => setTimeout(resolve, 150));
     return { on, off: { auto: _status.auto, image: button.style.backgroundImage } };
    });
    assert.equal(menuState.on.auto, true); assert.match(menuState.on.image, /_cancel\.png/);
    assert.equal(menuState.off.auto, false); assert.match(menuState.off.image, /tool_trusteeship_0\.png/);
    active.lifecycle = lifecycle; active.menuState = menuState;
   } else {
    assert.deepEqual(await page.evaluate(() => {
     game.me.addMark('baonu', 3, false);
     const mark = game.me.marks.baonu;
     return { type: mark.dataset.onlineMarkType, visible: mark.getClientRects().length > 0,
      graphics: !!game.me.querySelector('.online-circle-mark'), intro: !!get.nodeintro(mark) };
    }), { type: undefined, visible: true, graphics: false, intro: true });
   }
   assert.deepEqual(errors, []);
   assert.deepEqual(failed.filter(([, url]) => /trusteeship|secbtn_sub|seat_state_bg_new|seat_state_btn_0_new2024|state_icon_/.test(url)), []);
   results.push({ style, phone, initial, active, cancelled, errors, failed });
   console.log('AUTO_STYLE_OK', style, phone);
   await context.close();
  }
  fs.writeFileSync(path.join(__dirname, 'online-auto-results.json'), JSON.stringify(results, null, 2));
  console.log('ONLINE_AUTO_BROWSER_OK');
 } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

async function documentFonts(page) {
 await page.evaluate(() => document.fonts.ready);
}
