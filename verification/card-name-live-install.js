(async () => {
 const {lib,game,ui}=await import('./noname.js');
 const before={player:game.me?.name,count:game.me?.countCards('h'),selected:ui.selected.cards.map(c=>c.cardid)};
 const link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(n=>n.href.includes('/src/styles/card-xinsha.css'));
 if(!link)throw new Error('Current xinsha stylesheet not found');
 const url=new URL(link.href);url.searchParams.set('cardNameFix','20261119');
 link.href=url.href;
 const {initCardAlternateNameVisible}=await import('./extension/十周年UI/src/ui/cardAlternateName.js?cardNameFix=20261119');
 initCardAlternateNameVisible();
 // 当前窗口保留各扩展已安装的包装，仅给旧版布局补本次刷新入口。
 const layout=window.decadeUI.layout;
 if(!String(layout.updateHand).includes('cardAlternateName')&&!layout.updateHand._cardNameFix){
  const original=layout.updateHand;
  const wrapped=function(){window.decadeUI?.cardAlternateName?.updateVisibility?.();return original.apply(this,arguments);};
  wrapped._cardNameFix=true;layout.updateHand=wrapped;
 }
 layout.updateHand();
 return {before,after:{player:game.me?.name,count:game.me?.countCards('h'),selected:ui.selected.cards.map(c=>c.cardid)},style:lib.config.extension_十周年UI_newDecadeStyle,enabled:lib.config.extension_十周年UI_cardAlternateName,zones:['handcards1','handcards2'].map(key=>{const zone=game.me?.node?.[key];return {key,count:zone?.children.length,visible:zone?.dataset.cardAlternateNameVisible,style:zone?.dataset.cardAlternateNameStyle,tags:zone?.querySelectorAll('.dui-xinsha-card-name').length};}),timer:window._cardAlternateNameVisibleTimer};
})()
