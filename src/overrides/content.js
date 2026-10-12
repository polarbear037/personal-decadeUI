import{ui,get,lib,_status,game}from"noname";function e(e){}function a(e){return[...e.slice(0,-2),async(event,trigger,player)=>{let{cards:e,gaintag:a}=event;const i=player.node.handcards1,t=document.createDocumentFragment();for(let d=0;d<e.length;d++){const card=e[d];if(lib.config.sort_card(card),lib.config.reverse_sort,["o","d"].includes(get.position(card,!0))&&card.addKnower("everyone"),card.fix(),card.style.transform="",card.parentNode!=i){a.forEach(e=>card.addGaintag(e)),event.knowers&&card.addKnower(event.knowers),t.appendChild(card),_status.discarded&&_status.discarded.remove(card);for(let e=0;e<card.vanishtag.length;e++)"_"!=card.vanishtag[e][0]&&card.vanishtag.splice(e--,1)}else e.splice(d--,1)}const s=window.decadeUI,r=function(e,r){e.duiMod=event.source,player==game.me&&(s.layoutHandDraws(e),s.queueNextFrameTick(s.layoutHand,s),game.addVideo("gain12",player,[get.cardsInfo(t.childNodes),a]));const d=player.getCards("s");d.length?i.insertBefore(t,d[0]):i.appendChild(t),game.broadcast(function(e,a,i,t){e.directgain(a,null,t),_status.cardPileNum=i},player,e,ui.cardPile.childNodes.length,a),!0!==r?setTimeout(function(e){e.update(),game.resume()},get.delayx(400,400)+66,player):player.update()};if("draw"==event.animate)game.pause(),r(e),player.$draw(e.length);else if("gain"==event.animate)game.pause(),r(e),player.$gain(e,event.log);else if("gain2"==event.animate||"draw2"==event.animate)game.pause(),r(e),player.$gain2(e,event.log);else if("give"==event.animate||"giveAuto"==event.animate){game.pause(),r(e);const a=event.losing_map;if("give"==event.animate)for(const e in a){(_status.connectMode?lib.playerOL:game.playerMap)[e].$give(a[e][0],player,event.log)}else for(const e in a){const i=(_status.connectMode?lib.playerOL:game.playerMap)[e];a[e][1].length&&i.$giveAuto(a[e][1],player,event.log),a[e][2].length&&i.$give(a[e][2],player,event.log)}}else if("function"==typeof event.animate){const a=event.animate(event);game.pause(),setTimeout(function(){r(e,!0),game.resume()},get.delayx(a,a))}else r(e,!0)},async(event,trigger,player)=>{event.updatePile&&game.updateRoundNumber()}]}function i(){return[async(event,trigger,player)=>{const e=`${get.translation(player)}的${event.judgestr}判定`;event.videoId=lib.status.videoId++;let a,i=event.directresult;if(i||(i=player.getTopCards?player.getTopCards()[0]:get.cards()[0]),!i)return void event.finish();const t=get.owner(i);if(t)a=t.lose(i,"visible",ui.ordering);else{const e=game.cardsGotoOrdering(i);event.position!=ui.discardPile&&(e.noOrdering=!0),a=e}return player.judging.unshift(i),game.addVideo("judge1",player,[get.cardInfo(player.judging[0]),e,event.videoId]),game.broadcastAll(function(e,card,a,i){const t=game.online?{}:_status.event;game.chess?t.node=card.copy("thrown","center",ui.arena).addTempClass("start"):t.node=e.$throwordered2(card.copy(),!0),lib.cardOL&&(lib.cardOL[i]=t.node),t.node.cardid=i,window.decadeUI||(ui.arena.classList.add("thrownhighlight"),t.node.classList.add("thrownhighlight"))},player,player.judging[0],event.videoId,get.id()),game.log(player,"进行"+event.judgestr+"判定，亮出的判定牌为",player.judging[0]),await game.delay(2),event.noJudgeTrigger||await event.trigger("judge"),a.forResult()},async(event,trigger,player)=>{if(event.result={card:player.judging[0],name:player.judging[0].name,number:get.number(player.judging[0]),suit:get.suit(player.judging[0]),color:get.color(player.judging[0]),node:event.node},event.fixedResult)for(const i in event.fixedResult)event.result[i]=event.fixedResult[i];if(event.result.judge=event.judge(event.result),event.result.judge>0?event.result.bool=!0:event.result.judge<0?event.result.bool=!1:event.result.bool=null,player.judging.shift(),game.checkMod(player,event.result,"judge",player),event.judge2){const e=event.judge2(event.result);"boolean"==typeof e&&player.tryJudgeAnimate(e)}0!=event.clearArena&&game.broadcastAll(ui.clear),game.broadcast(function(){window.decadeUI||ui.arena.classList.remove("thrownhighlight")}),game.addVideo("judge2",null,event.videoId),game.log(player,"的判定结果为",event.result.card);const e=event.trigger("judgeFixing");event.triggerMessage("judgeresult");let a=null;if(event.callback){const e=game.createEvent("judgeCallback",!1);e.player=player,e.card=event.result.card,e.judgeResult=get.copy(event.result),e.setContent(event.callback),a=e}else get.owner(event.result.card)||event.position!=ui.discardPile&&event.position.appendChild(event.result.card);await e,event.next.includes(a)&&await a}]}function t(e){return[async(event,trigger,player)=>{const e=event.getParent();"discard"==e.name&&"discard"==event.type||"loseToDiscardpile"==e.name&&"loseToDiscardpile"==event.type?(!1===e.delay&&(event.delay=!1),null==event.animate&&(event.animate=e.animate)):(event.delay=!1,null==event.blameEvent&&(event.animate=!1))},async(event,trigger,player)=>{let{cards:e}=event;event.vcards={cards:[],es:[],js:[]},event.vcard_cards=[],event.gaintag_map={};const a=[],i=[],t=[],s=[],r=[],d=[];event.insert_card&&event.position==ui.cardPile&&event.cards.reverse();const n=player.getCards("hejsx");event.stockcards=e.slice(0);for(let l=0;l<e.length;l++){let o=[e[l]];if(n.includes(e[l])){if(e[l].parentNode)if(e[l].parentNode.classList.contains("equips")){e[l].throwWith=e[l].original="e";const a=e[l][e[l].cardSymbol];if(a){if(e[l].isViewAsCard){let t=a.cards;o.addArray(t),event.vcard_cards.addArray(t),t.forEach(t=>{t.throwWith=t.original="e",delete t.destiny,i.push(t),event.vcard_map.set(t,a||get.autoViewAs(e[l],void 0,!1))})}else i.push(e[l]),event.vcard_map.set(e[l],a||get.autoViewAs(e[l],void 0,!1)),event.vcard_cards.add(e[l]);event.vcards.cards.push(e[l]),event.vcards.es.push(e[l])}}else if(e[l].parentNode.classList.contains("judges")){e[l].throwWith=e[l].original="j";const a=e[l][e[l].cardSymbol];if(a){if(e[l].isViewAsCard){let i=a.cards;o.addArray(i),event.vcard_cards.addArray(i),i.forEach(i=>{i.throwWith=i.original="j",delete i.destiny,t.push(i),event.vcard_map.set(i,a||get.autoViewAs(e[l],void 0,!1))})}else t.push(e[l]),event.vcard_map.set(e[l],a||get.autoViewAs(e[l],void 0,!1)),event.vcard_cards.add(e[l]);event.vcards.cards.push(e[l]),event.vcards.js.push(e[l])}}else e[l].parentNode.classList.contains("expansions")?(e[l].throwWith=e[l].original="x",r.push(e[l]),event.vcard_map.set(e[l],get.autoViewAs(e[l],void 0,!1)),e[l].gaintag&&e[l].gaintag.length&&d.addArray(e[l].gaintag)):e[l].parentNode.classList.contains("handcards")?e[l].classList.contains("glows")?(e[l].throwWith=e[l].original="s",s.push(e[l]),event.vcard_map.set(e[l],get.autoViewAs(e[l],void 0,!1))):(e[l].throwWith=e[l].original="h",a.push(e[l]),event.vcard_map.set(e[l],get.autoViewAs(e[l],void 0,player))):e[l].throwWith=e[l].original=null;for(let e=0;e<o.length;e++){if(o[e].gaintag&&o[e].gaintag.length){event.gaintag_map[o[e].cardid]=o[e].gaintag.slice(0);o[e].gaintag.filter(e=>!e.startsWith("eternal_")).forEach(a=>o[e].removeGaintag(a))}o[e].style.transform+=" scale(0.2)",o[e].classList.remove("glow"),o[e].classList.remove("glows"),o[e].recheck();const a=lib.card[o[e].name];if("_destroy"in o[e]){if(o[e]._destroy){o[e].delete(),o[e].destroyed=o[e]._destroy;continue}}else if("destroyed"in o[e]){if(!1!==event.getlx&&event.position&&o[e].willBeDestroyed(event.position.id,null,event)){o[e].selfDestroy(event);continue}}else if(a.destroy){o[e].delete(),o[e].destroyed=a.destroy;continue}event.position?(_status.discarded&&(event.position==ui.discardPile?_status.discarded.add(o[e]):_status.discarded.remove(o[e])),event.insert_index?(o[e].fix(),event.position.insertBefore(o[e],event.insert_index(event,o[e]))):event.insert_card?(o[e].fix(),event.position.insertBefore(o[e],event.position.firstChild)):event.position==ui.cardPile?(o[e].fix(),event.position.appendChild(o[e])):o[e].goto(event.position)):o[e].remove()}}else e.splice(l--,1)}const o=window.decadeUI;if(player==game.me&&o.queueNextFrameTick(o.layoutHand,o),ui.updatej(player),game.broadcast((e,a,i)=>{for(let t=0;t<a.length;t++)a[t].removeGaintag(!0),a[t].classList.remove("glow"),a[t].classList.remove("glows"),a[t].fix(),a[t].remove();e==game.me&&ui.updatehl(),ui.updatej(e),_status.cardPileNum=i},player,e.slice(),ui.cardPile.childNodes.length),0!=event.animate){const a=event.getParent();if(a.discardid=lib.status.videoId++,game.broadcastAll(function(e,a,i,t){const s=a.slice().map(e=>e.cards?e.cards:[e]).flat();s.duiMod=!0,t&&e.$throw(s,null,"nobroadcast");const r=[];r._discardtime=get.time();for(let d=0;d<s.length;d++)s[d].clone&&r.push(s[d].clone);ui.todiscard[i]=r},player,e,a.discardid,event.visible),lib.config.sync_speed&&e[0]?.clone)if(0!=a.delay){const i=get.time();a.waitingForTransition=i,e[0].clone.listenTransition(function(){_status.waitingForTransition==i&&_status.paused&&game.resume(),delete a.waitingForTransition})}else if(a.getParent().discardTransition){delete a.getParent().discardTransition;const i=get.time();a.getParent().waitingForTransition=i,e[0].clone.listenTransition(function(){_status.waitingForTransition==i&&_status.paused&&game.resume(),delete a.getParent().waitingForTransition})}}if(game.addVideo("lose",player,[get.cardsInfo(a),get.cardsInfo(i),get.cardsInfo(t),get.cardsInfo(s)]),event.cards2=a.concat(i),e.removeArray(event.vcards.cards),e.addArray(event.vcard_cards),player.getHistory("lose").push(event),game.getGlobalHistory().cardMove.push(event),player.update(),game.addVideo("loseAfter",player),event.num=0,event.position==ui.ordering){const a=event.relatedEvent||event.getParent();if(a.orderingCards||(a.orderingCards=[]),!a.noOrdering&&!a.cardsOrdered){a.cardsOrdered=!0;const e=game.createEvent("orderingDiscard",!1);event.next.remove(e),a.after.push(e),e.relatedEvent=a,e.setContent("orderingDiscard")}a.noOrdering||a.orderingCards.addArray(e)}else event.position==ui.cardPile&&game.updateRoundNumber();if(d.length)for(const l of d)player[lib.skill[l]&&lib.skill[l].mark||player.hasCard(card=>card.hasGaintag(l),"x")?"markSkill":"unmarkSkill"](l);event.hs=a,event.es=i,event.js=t,event.ss=s,event.xs=r,game.clearCardKnowers(a),a.length&&!event.visible&&player.getCards("h").forEach(e=>{e.clearKnowers()})},...e.slice(2)]}export{i as contentJudge,a as createContentGain,t as createContentLose,e as setBaseContentMethods};
//扣血动画（OL样式）细品细品
    if (lib.config.hp_style == 'glass') {

lib.skill._HploseMobile = {
    trigger: {
        player: "damageBegin4",
    },
    forced: true,
    popup: false,
    charlotte: true,
    forceLoad: true,
    firstDo: true,
    priority: -10,
    filter: function (event, player) {
        if (typeof event.num != "number") return false;
        return event.num && event.num > 0 && player.hujia != undefined && player.hujia == 0;
    },
    content: function () {
        "step 0"
        event.count = trigger.num;
        event.setmtop = [];
        event.setmtop.push(0);
        event.setxHp = [];
        event.setxHp.push(player.hp);
        // 提取动作，共用统一流失体力骨骼
        if (player.hp > player.maxHp * 2 / 3)
            event.animAction = 'play'
        else if (player.hp <= player.maxHp * 2 / 3 && player.hp > player.maxHp / 3)
            event.animAction = 'play3'
        else if (player.hp <= player.maxHp / 3)
            event.animAction = 'play2'
        "step 1"
        if (event.DamageHp) {
            event.setxHp[0]--;
            if (event.setxHp[0] < 1) { event.goto(3); }
        }
        if (player.maxHp <= 5) {
            if (trigger.player == game.me) event.setmtop[0] = -(4.0 - Math.max(event.setxHp[0], 1)) * 16;
            else event.setmtop[0] = -(5.0 - Math.max(event.setxHp[0], 1)) * 16;
        } else {
            if (trigger.player == game.me) event.setmtop[0] -= 14.0;
            else event.setmtop[0] -= 28;
            event.jumpOn = true;
        }
        "step 2"
        if (event.count > 0) {
            player == game.me ? event.setMtop = 0.45 : event.setMtop = 0.54;
            // 替换为统一chukuangWorkerApi播放，保留原有偏移坐标
            skinSwitch.chukuangWorkerApi.playEffect({
                name: '../../../十周年UI/assets/animation/FX_MatchGame_diaoxie',
                action: event.animAction,
            }, {
                scale: 0.5,
                x: [-122, 0.998],
                y: [event.setmtop[0], event.setMtop],
                parent: player,
            });
            event.count--;
            if (event.count > 0 && !event.jumpOn) {
                event.DamageHp = true;
                event.goto(1);
            } else {
                event.goto(3);
            }
        }
        "step 3"
        if (event.DamageHp) delete event.DamageHp;
        if (event.jumpOn) delete event.jumpOn;
        event.setxHp.shift();
        event.setmtop.shift();
        event.finish();
    },
};

//流失体力
lib.skill._losehp_ = {
    trigger: {
        player: "loseHpBegin",
    },
    forced: true,
    popup: false,
    charlotte: true,
    forceLoad: true,
    firstDo: true,
    priority: -10,
    filter: function (event, player) {
        if (typeof event.num != "number") return false;
        return event.num && event.num > 0 && player.hujia != undefined && player.hujia == 0;
    },
    content: function () {
        "step 0"
        event.count = trigger.num;
        event.setmtop = [];
        event.setmtop.push(0);
        event.setxHp = [];
        event.setxHp.push(player.hp);
        // 保留三段血量区分动作
        if (player.hp > player.maxHp * 2 / 3)
            event.animAction = 'play'
        else if (player.hp <= player.maxHp * 2 / 3 && player.hp > player.maxHp / 3)
            event.animAction = 'play3'
        else if (player.hp <= player.maxHp / 3)
            event.animAction = 'play2'
        "step 1"
        if (event.DamageHp) {
            event.setxHp[0]--;
            if (event.setxHp[0] < 1) { event.goto(3); }
        }
        if (player.maxHp <= 5) {
            if (trigger.player == game.me) event.setmtop[0] = -(4.0 - Math.max(event.setxHp[0], 1)) * 16;
            else event.setmtop[0] = -(5.0 - Math.max(event.setxHp[0], 1)) * 16;
        } else {
            if (trigger.player == game.me) event.setmtop[0] -= 14.0;
            else event.setmtop[0] -= 28;
            event.jumpOn = true;
        }
        "step 2"
        if (event.count > 0) {
            player == game.me ? event.setMtop = 0.45 : event.setMtop = 0.54;
            // 修正：x、y完整绑定动态变量，不再固定0.5覆盖偏移
            skinSwitch.chukuangWorkerApi.playEffect({
                name: '../../../十周年UI/assets/animation/FX_MatchGame_TLLS',
                action: event.animAction,
            }, {
                scale: 0.8,
                x: [-122, 0.998],
                y: [event.setmtop[0], event.setMtop],
                parent: player,
            });
            event.count--;
            if (event.count > 0 && !event.jumpOn) {
                event.DamageHp = true;
                event.goto(1);
            } else {
                event.goto(3);
            }
        }
        "step 3"
        if (event.DamageHp) delete event.DamageHp;
        if (event.jumpOn) delete event.jumpOn;
        event.setxHp.shift();
        event.setmtop.shift();
        event.finish();
    },
};


        lib.skill._HpRecoverMobile = {
    trigger: {
        player: 'recoverBegin'
    },
    forced: true,
    charlotte: true,
    filter: function (event, player) {
        return event.source;
    },
    content: function () {
        var name = event.triggername;
        //------定义五个骨骼播放对应五个勾玉-----// 
        let animation1 = { name: 'skeleton', speed: 0.7, action: 'animation' }

        let animation2 = { name: 'FX_MatchGame_huixie_fanwei', speed: 0.7, action: 'play1' }
        let animation3 = { name: 'FX_MatchGame_huixie_fanwei', speed: 0.7, action: 'play2' }
        let animation4 = { name: 'FX_MatchGame_huixie_fanwei', speed: 0.7, action: 'play3' }
        //------主视角勾玉-------//
        let scale1 = { scale: 0.5, x: [0, 0.07], y: [0, 0.535], parent: player }//从上至下第一个勾玉定位
        let scale2 = { scale: 0.5, x: [0, 0.07], y: [0, 0.44], parent: player }//第二个勾玉
        let scale3 = { scale: 0.5, x: [0, 0.07], y: [0, 0.345], parent: player }//第三个勾玉
        let scale4 = { scale: 0.5, x: [0, 0.07], y: [0, 0.25], parent: player }//第四个勾玉
        let scale5 = { scale: 0.5, x: [0, 0.07], y: [0, 0.155], parent: player }//第五个勾玉 
        let scale55 = { scale: 1.0, x: [0, 0.05], y: [0, 0.2], parent: player }//第五个勾玉     

        let scale6 = { scale: 0.5, x: [0, 0.07], y: [0, 0.355], parent: player }//多体力勾玉 
        let scale66 = { scale: 1.0, x: [0, 0.05], y: [0, 0.35], parent: player }//多体力勾玉 
        //------主视角勾玉--------//

        //------AI视角勾玉------//
        let scale11 = { scale: 0.5, x: [0, 0.08], y: [0, 0.535], parent: player }//从上至下第一个勾玉定位
        let scale21 = { scale: 0.5, x: [0, 0.08], y: [0, 0.44], parent: player }//第二个勾玉
        let scale31 = { scale: 0.5, x: [0, 0.08], y: [0, 0.345], parent: player }//第三个勾玉
        let scale41 = { scale: 0.15, x: [0, 0.08], y: [0, 0.25], parent: player }//第四个勾玉
        let scale51 = { scale: 0.5, x: [0, 0.08], y: [0, 0.155], parent: player }//第五个勾玉 
        let scale515 = { scale: 1.0, x: [0, 0.13], y: [0, 0.23], parent: player }//第五个勾玉 
        let scale61 = { scale: 0.5, x: [0, 0.08], y: [0, 0.355], parent: player }//多体力勾玉 
        let scale616 = { scale: 1.0, x: [0, 0.13], y: [0, 0.38], parent: player }//多体力勾玉 
        if (lib.config['extension_十周年UI_newDecadeStyle'] == "onlineui") {
            scale1 = { scale: 0.1, x: [0, 0.06], y: [0, 0.32], parent: player }//从上至下第一个勾玉定位
            scale2 = { scale: 0.1, x: [0, 0.06], y: [0, 0.25], parent: player }//第二个勾玉
            scale3 = { scale: 0.1, x: [0, 0.06], y: [0, 0.18], parent: player }//第三个勾玉
            scale4 = { scale: 0.1, x: [0, 0.06], y: [0, 0.11], parent: player }//第四个勾玉
            scale5 = { scale: 0.1, x: [0, 0.06], y: [0, 0.04], parent: player }//第五个勾玉 
            scale6 = { scale: 0.1, x: [0, 0.06], y: [0, 0.04], parent: player }//多体力勾玉 
            scale11 = { scale: 0.1, x: [0, 0.06], y: [0, 0.42], parent: player }//从上至下第一个勾玉定位
            scale21 = { scale: 0.1, x: [0, 0.04], y: [0, 0.33], parent: player }//第二个勾玉
            scale31 = { scale: 0.1, x: [0, 0.04], y: [0, 0.25], parent: player }//第三个勾玉
            scale41 = { scale: 0.1, x: [0, 0.04], y: [0, 0.16], parent: player }//第四个勾玉
            scale51 = { scale: 0.1, x: [0, 0.04], y: [0, 0.08], parent: player }//第五个勾玉 
            scale61 = { scale: 0.1, x: [0, 0.04], y: [0, 0.08], parent: player }//多体力勾玉 
        }
        //------AI视角勾玉-------//
        if (trigger.source == player) {  //主视角回血时 			
            //------五体力上限开始-----// 
            if (player.maxHp == 5 && trigger.num == 5 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    
                    action: 'play',
                }, { ...scale1 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 1 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
            };
            if (player.maxHp == 5 && trigger.num == 2 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation3, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 3 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 4 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 1 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 2 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 3 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 4 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale1 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 1 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 2 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale1 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 3 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale1 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 1 && player.hp == 3 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 2 && player.hp == 3 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale1 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == 1 && player.hp == 4 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale1 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation3, scale55);
            };
            if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 3 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 4 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 5 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale1 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            //-------------五体力上限结束------------// 

            //-------------四体力上限开始------------//    
            if (player.maxHp == 4 && trigger.num == 1 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
            };
            if (player.maxHp == 4 && trigger.num == 2 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 3 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 4 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 1 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 2 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 3 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 1 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 2 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num == 1 && player.hp == 3 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation3, scale55);
            };
            if (player.maxHp == 4 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 4 && trigger.num == Math.abs(player.hp) + 3 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 4 && trigger.num == Math.abs(player.hp) + 4 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale2 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            //-------------四体力上限结束------------//        

            //-------------三体力上限开始------------// 
            if (player.maxHp == 3 && trigger.num == 1 && player.hp == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
            };
            if (player.maxHp == 3 && trigger.num == 2 && player.hp == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 3 && trigger.num == 3 && player.hp == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 3 && trigger.num == 1 && player.hp == 1) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 3 && trigger.num == 2 && player.hp == 1) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 3 && trigger.num == 1 && player.hp == 2) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 3 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation3, scale55);
            };
            if (player.maxHp == 3 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation4, scale55);
            };
            if (player.maxHp == 3 && trigger.num == Math.abs(player.hp) + 3 && player.hp < 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale3 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play3',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            //-------------三体力上限结束------------//   

            //-------------二体力上限开始------------//   
            if (player.maxHp == 2 && trigger.num == 1 && player.hp == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation3, scale55);
            };
            if (player.maxHp == 2 && trigger.num == 2 && player.hp == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 2 && trigger.num == 1 && player.hp == 1) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale4 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 2 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation3, scale55);
            };
            if (player.maxHp == 2 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale4 });
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play2',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            //-------------二体力上限结束------------//

            //-------------一体力上限开始------------//
            if (player.maxHp == 1 && trigger.num == 1 && player.hp == 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
            if (player.maxHp == 1 && trigger.num >= 1 && player.hp < 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale5 });
                decadeUI.animation.playSpine(animation2, scale55);
            }; //一体力上限可能存在上限溢出的情况
            //-------------一体力上限结束------------//    

            //-------------多体力上限开始(大于5)------------//    
            if (player.maxHp > 5) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale6 });
                decadeUI.animation.playSpine(animation2, scale66);
            };
            //-------------多体力上限结束(大于5)------------//

            //-------------护甲开始------------------------//
            if (player.maxHp > 3 && player.hujia !== undefined && player.hujia > 0) {
                skinSwitch.chukuangWorkerApi.playEffect({
                    name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
                    action: 'play',
                }, { ...scale6 });
                decadeUI.animation.playSpine(animation2, scale55);
            };
        }
//---------AI视角开始---------//
if (trigger.source !== player) {  //AI视角回血时 			
    //------五体力上限开始-----// 
    if (player.maxHp == 5 && trigger.num == 5 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale11
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 1 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 2 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 3 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 4 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 1 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 2 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 3 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 4 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale11
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation2, scale515);

    };
    if (player.maxHp == 5 && trigger.num == 1 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 2 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 3 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale11
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 1 && player.hp == 3 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 2 && player.hp == 3 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale11
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == 1 && player.hp == 4 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale11
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 3 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 4 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 5 && trigger.num == Math.abs(player.hp) + 5 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale11
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    //-------------五体力上限结束------------// 

    //-------------四体力上限开始------------//    
    if (player.maxHp == 4 && trigger.num == 1 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 2 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 3 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 4 && player.hp == 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 1 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 2 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 3 && player.hp == 1 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 1 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 2 && player.hp == 2 && player.hujia !== undefined && player.hujia == 0) {

        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num == 1 && player.hp == 3 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 4 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 4 && trigger.num == Math.abs(player.hp) + 3 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 4 && trigger.num == Math.abs(player.hp) + 4 && player.hp < 0 && player.hujia !== undefined && player.hujia == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale21
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    //-------------四体力上限结束------------//        

    //-------------三体力上限开始------------// 
    if (player.maxHp == 3 && trigger.num == 1 && player.hp == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 3 && trigger.num == 2 && player.hp == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 3 && trigger.num == 3 && player.hp == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 3 && trigger.num == 1 && player.hp == 1) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 3 && trigger.num == 2 && player.hp == 1) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 3 && trigger.num == 1 && player.hp == 2) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 3 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 3 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation4, scale515);
    };
    if (player.maxHp == 3 && trigger.num == Math.abs(player.hp) + 3 && player.hp < 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale31
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play3',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    //-------------三体力上限结束------------//   

    //-------------二体力上限开始------------//   
    if (player.maxHp == 2 && trigger.num == 1 && player.hp == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 2 && trigger.num == 2 && player.hp == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 2 && trigger.num == 1 && player.hp == 1) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale41
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 2 && trigger.num <= Math.abs(player.hp) + 1 && player.hp < 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation3, scale515);
    };
    if (player.maxHp == 2 && trigger.num == Math.abs(player.hp) + 2 && player.hp < 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale41
        });
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play2',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    //-------------二体力上限结束------------//

    //-------------一体力上限开始------------//
    if (player.maxHp == 1 && trigger.num == 1 && player.hp == 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    };
    if (player.maxHp == 1 && trigger.num >= 1 && player.hp < 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale51
        });
        decadeUI.animation.playSpine(animation2, scale515);
    }; //一体力上限可能存在上限溢出的情况
    //-------------一体力上限结束------------//    

    //-------------多体力上限开始(大于5)------------//    
    if (player.maxHp > 5) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale61
        });
        decadeUI.animation.playSpine(animation2, scale616);
    };
    //-------------多体力上限结束(大于5)------------//

    //-------------护甲开始------------------------//
    if (player.maxHp > 3 && player.hujia !== undefined && player.hujia > 0) {
        skinSwitch.chukuangWorkerApi.playEffect({
            name: '../../../十周年UI/assets/animation/FX_MatchGame_xiecao',
            action: 'play',
        }, {
            ...scale61
        });
        decadeUI.animation.playSpine(animation2, scale616);
    };//判断此时是否是数值型勾玉，调用单勾玉特效
    /*       if (player.maxHp > 3 && player.hujia !== undefined && player.hujia == 0 && player.hp <= 0 && trigger.num <= Math.abs(player.hp) + 1){
             decadeUI.animation.playSpine(animation1,scale51);
           };//特殊情况，存在0个护甲进入濒死
           if (player.maxHp > 3 && player.hujia !== undefined && player.hujia == 0 && player.hp <= 0 && trigger.num == Math.abs(player.hp) + 2){
             decadeUI.animation.playSpine(animation1,scale41);
             decadeUI.animation.playSpine(animation1,scale51); 
           };
           if (player.maxHp > 3 && player.hujia !== undefined && player.hujia == 0 && player.hp <= 0 && trigger.num == Math.abs(player.hp) + 3){
             decadeUI.animation.playSpine(animation1,scale31);
             decadeUI.animation.playSpine(animation1,scale41);
             decadeUI.animation.playSpine(animation1,scale51); 
           };
           if (player.maxHp > 3 && player.hujia !== undefined && player.hujia == 0 && player.hp <= 0 && trigger.num == Math.abs(player.hp) + 4){
             decadeUI.animation.playSpine(animation1,scale21);
             decadeUI.animation.playSpine(animation1,scale31);
             decadeUI.animation.playSpine(animation1,scale41);
             decadeUI.animation.playSpine(animation1,scale51); 
           };
           if (player.maxHp > 3 && player.hujia !== undefined && player.hujia == 0 && player.hp <= 0 && trigger.num == Math.abs(player.hp) + 5){
             decadeUI.animation.playSpine(animation1,scale11);
             decadeUI.animation.playSpine(animation1,scale21);
             decadeUI.animation.playSpine(animation1,scale31);
             decadeUI.animation.playSpine(animation1,scale41);
             decadeUI.animation.playSpine(animation1,scale51); 
           };*/
    //-------------护甲结束--------------------//

//--------AI视角结束-------------//




                }
            },
        };
    }

//隐藏技能提示
      // //显示帧数
// lib.arenaReady.push(function () {
         // const el = document.createElement("div");
         // el.id = "_cfx_fps";
         // el.style.cssText = [
           // "position:fixed", "top:4px", "left:92%",
           // "transform:translateX(-50%)", "z-index:99999",
           // "pointer-events:none", "font-size:12px",
           // "font-family:monospace", "font-weight:bold",
           // "padding:2px 6px", "line-height:1.4",
           // "white-space:nowrap", "color:#0f0",
           // "text-shadow:0 0 3px #000,0 0 3px #000",
         // ].join(";");
         // document.body.appendChild(el);
         // let frames = 0, lastTime = performance.now(), rafId;
         // function tick() {
           // frames++;
           // const now = performance.now(), elapsed = now - lastTime;
           // if (elapsed >= 500) {
             // const fps = Math.round(frames * 1000 / elapsed);
             // frames = 0; lastTime = now;
             // if (fps >= 50)      el.style.color = "#0f0";
             // else if (fps >= 30) el.style.color = "#ff0";
             // else                el.style.color = "#f44";
             // el.textContent = fps + " FPS";
           // }
           // rafId = requestAnimationFrame(tick);
         // }
         // rafId = requestAnimationFrame(tick);
         // const origGameOver = game.over;
         // game.over = function () {
           // cancelAnimationFrame(rafId);
           // if (el.parentNode) el.parentNode.removeChild(el);
           // game.over = origGameOver;
           // return origGameOver.apply(this, arguments);
         // };
       // });
     