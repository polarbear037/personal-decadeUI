import{lib,get,_status}from"noname";const e={"界":"jie","神":"shen","武":"wu","族":"clan","标":"std","乐":"yue","谋":"sb",SP:"sp",OL:"ol",TW:"tw","星":"star","☆":"star","★":"star","新杀":"dc","新杀谋":"sb","新杀|谋":"sb","新杀|牢":"lao","OL谋":"sb","OL界":"jie","OL神":"shen","OL乐":"yue","OL汉":"han","手杀":"mb","手杀SP":"mb","手杀界":"jie","手杀神":"shen","手杀乐":"yue","手杀|牢":"lao","手杀|SP":"sp","手杀合":"he","TW谋":"sb","TW神":"shen","TW|起":"jsrg","旧":"old","旧神":"old","旧晋":"old","毅重":"old","节钺":"old","旧|OL":"old","旧|神":"old","旧|界":"old","旧|谋":"old","旧|幻":"old","旧|势":"old","旧|☆":"old","旧|SP":"old","旧|友":"old","旧|族":"old","旧|星":"old","旧|威":"old","旧|武":"old","旧|侠":"old","旧|起":"old","旧|玄":"old","旧|魔":"old","牢":"lao","牢|爻":"lao","牢|神":"lao","牢|SP":"lao","牢|谋":"lao","微信":"wei","微信|牢":"lao","微信|神":"shen","微信|☆":"star","微信|谋":"sb","微信|界":"jie","SP|微信":"sp","SP|微信|神":"shen","欢杀":"Mbaby","欢杀|神":"shen","欢杀|谋":"sb","欢杀|星":"star","SP|欢杀":"sp","SP|欢杀|神":"shen","欢杀|界":"jie","极":"ji","极略SK":"sk","极略★SK":"sk","极略SK神":"shen","极略SP神":"shen","极略SR":"sr","界SP":"jie","爻":"yao","魔":"dm","TW|魔":"dm","OL|魔":"dm","闪":"shan","晋":"jin","威":"v","玄":"xuan","势":"pot","友":"you","幻":"huan","起":"jsrg","经典":"jd","经典神":"shen","忍":"ren","有":"nailong","烈":"lie","韩氏":"hanshi","魂":"hun","汉":"han","狂":"kuang","喵":"miao","念":"nian","战":"zhan","战役篇":"zhan","战役篇神":"shen","桃":"tao","桃神":"shen","汉末":"han","汉末神":"shen","长安":"chang","长安神":"shen","渭南":"wn","渭南神":"shen","荆":"jing","荆神":"shen","疑":"sxrm","梦":"meng","承":"cheng","转":"zhuan","合":"he","衰":"shuai","兴":"xing",SCL:"scl","将":"jiang","用间":"yongjian","君":"jun","侠":"xia","K系列":"k","智将":"zhijiang","龙":"long","欧陆":"eu","九鼎":"jiding","燕幽":"yy","荆扬":"jianghua","蛇":"she","青史":"qingshi","徐兖":"xuyuan","风云":"fengyun","慢":"man","飞鸿":"feihong","虎翼":"huyi","闪耀":"shanyao","闪耀战姬":"shanyao","领主":"lingzhu","志气":"zhi","文心雕龙":"wen","礼":"li","书":"shu","数":"shuxue","御":"yu","射":"sheji","骏骊|神":"shen","S特神":"shen","26|神":"shen","26|SP":"sp","飞鸿|神":"shen","☆神":"shen","赛马|神":"shen","SP|赛马|神":"shen","集蜜":"jm","雁翎":"yan","缘":"yuan","26|界":"jie"},n=e=>`${e}-mark`,s=e=>`${e}Mark`,r={get prefixConfigs(){return{...e}},registerPrefix:(n,s)=>"string"==typeof n&&"string"==typeof s&&(!(!n.trim()||!s.trim())&&(e[n]=s,!0)),registerPrefixes(e){if(!e||"object"!=typeof e)return[];const n=[];for(const[s,r]of Object.entries(e))this.registerPrefix(s,r)&&n.push(s);return n},hasPrefix:n=>n in e,shouldShowPrefixMark:()=>"on"===lib.config?.["extension_十周年UI_newDecadeStyle"],getPrefixConfig(r){const a=lib.translate?.[`${r}_prefix`],i=e[a];return i?{className:n(i),property:s(i)}:null},createMarkElement:(e,n)=>n[e.property]??=decadeUI.element.create(e.className,n),showPrefixMark(e,n,s=!1){if(!this.shouldShowPrefixMark())return;if(!s&&!((e,n)=>{if("guozhan"===get.mode()){if(!_status.gameStarted)return!1;if("function"==typeof e?.isUnseen){if(e.name1===n)return!e.isUnseen(0);if(e.name2===n)return!e.isUnseen(1);if(e.name===n)return!e.isUnseen(0)}return!1}return!0})(n,e))return;const r=this.getPrefixConfig(e);if(!r)return;if(e!==(n.name1||n.name))return;const a=this.createMarkElement(r,n);n.contains(a)||n.appendChild(a);const i=n.node?.name;i&&(i.innerText=get.rawName(e))},clearPrefixMarks(n){if(!n)return;[...new Set(Object.values(e))].forEach(e=>{const r=s(e),a=n[r];a&&(a.remove(),delete n[r])})},setupShowCharacterHook(){const e=this;lib.skill._decadePrefixMark={charlotte:!0,forced:!0,popup:!1,priority:100,trigger:{player:["showCharacterEnd"]},filter:()=>e.shouldShowPrefixMark(),async content(n,s,player){const r=player.name1||player.name;r&&!player.isUnseen?.(0)&&e.showPrefixMark(r,player,!0),player.name2&&!player.isUnseen?.(1)&&e.showPrefixMark(player.name2,player,!0)}},lib.skill.global||(lib.skill.global=[]),lib.skill.global.includes("_decadePrefixMark")||
lib.skill.global.push("_decadePrefixMark")}};export{r as prefixMarkModule};
if (!lib.config['extension_十周年UI_aloneEquip']) {
    //装备栏美化
    lib.element.player.$addVirtualEquip = function (card, cards) {
        const player = this;
        const isViewAsCard = cards.length !== 1 || cards[0].name !== card.name,
            info = get.info(card, false);
        let cardShownName = get.translation(card.name);
        let cardname = card.name;
        let type = info.type
        let subtype = get.subtypes(card)[0];
        let backgroundURL;
        //装备栏背景图
        if (type != 'equip') {
            backgroundURL = decadeUIPath + "/image/ui/equip/online/equip5.png";
        }
        else if (subtype) {
            if (card.name == "liulongcanjia") backgroundURL = decadeUIPath + "/image/ui/equip/online/liulongcanjia.png";
            else {
                backgroundURL = decadeUIPath + "/image/ui/equip/online/" + subtype + ".png";
            }
        }
        //装备名称列表
        let SSEquip = {
            "爪黄飞电": "爪黄&nbsp;&nbsp;+1",
            "大宛": "大宛&nbsp;&nbsp;-1",
            "绝影": "绝影&nbsp;&nbsp;+1",
            "赤兔": "赤兔&nbsp;&nbsp;-1",
            "骅骝": "骅骝&nbsp;&nbsp;+1",
            "紫骍": "紫骍&nbsp;&nbsp;-1",
            "的卢": "的卢&nbsp;&nbsp;+1",
            "吴六剑": "吴六剑&nbsp;2",
            "机关弩": "机关弩&nbsp;1",
            "雌雄双股剑": "雌雄剑&nbsp;2",
            "方天画戟": "方天戟&nbsp;4",
            "贯石斧": "贯石斧&nbsp;3",
            "寒冰剑": "寒冰剑&nbsp;2",
            "麒麟弓": "麒麟弓&nbsp;5",
            "青釭剑": "青釭剑&nbsp;2",
            "青龙偃月刀": "青龙刀&nbsp;3",
            "丈八蛇矛": "丈八矛&nbsp;3",
            "古锭刀": "古锭刀&nbsp;2",
            "朱雀羽扇": "朱雀扇&nbsp;4",
            "七宝刀": "七宝刀&nbsp;2",
            "银月枪": "银月枪&nbsp;3",
            "衠钢槊": "衠钢槊&nbsp;3",
            "飞龙夺凤": "飞龙刀&nbsp;2",
            "三尖两刃刀": "三尖刀&nbsp;3",
            "诸葛连弩": "诸葛弩&nbsp;1",
            "倚天剑": "倚天剑&nbsp;2",
            "七星宝刀": "七星刀&nbsp;2",
            "折戟": "折戟&nbsp;&nbsp;0",
            "无锋剑": "无锋剑&nbsp;1",
            "涯角枪": "涯角枪&nbsp;3",
            "五行鹤翎扇": "五行扇&nbsp;4",
            "断剑": "断剑&nbsp;&nbsp;0",
            "霹雳车": "霹雳车&nbsp;9",
            "水波剑": "水波剑&nbsp;2",
            "红缎枪": "红缎枪&nbsp;3",
            "天雷刃": "天雷刃&nbsp;4",
            "混毒弯匕": "混毒匕&nbsp;1",
            "元戎精械弩": "精械弩&nbsp;3",
            "乌铁锁链": "铁锁链&nbsp;3",
            "太极拂尘": "太极拂&nbsp;5",
            "灵宝仙壶": "灵宝壶&nbsp;3",
            "冲应神符": "冲应符",
            "先天八卦阵": "先天八卦",
            "八卦阵": "八卦",
            "照月狮子盔": "狮子盔",
            "玲珑狮蛮带": "狮蛮带",
            "束发紫金冠": "紫金冠",
            "红棉百花袍": "百花袍",
            "无双方天戟": "方天戟",
            "白银狮子": "银狮子",
            "仁王金刚盾": "金剛盾",
            "桐油百韧甲": "百韧甲",
            "定澜夜明珠": "夜明珠",
            "霹雳投石车": "霹雳车",
        }
        if (SSEquip[cardShownName]) cardShownName = SSEquip[cardShownName];
        const cardx = isViewAsCard ? game.createCard(card) : cards[0];
        cardx.fix();
        const cardSymbol = Symbol("card");
        cardx.cardSymbol = cardSymbol;
        cardx[cardSymbol] = card;
        if (card.subtypes) cardx.subtypes = card.subtypes;
        cardx.style.transform = "";
        cardx.classList.remove("drawinghidden");
        delete cardx._transform;

        

const number = get.strNumber(cardx.number);
let suitImgHtml = "";
let numPrefix = "";

if(cardx.suit === "heart"){
    suitImgHtml = '<img src="extension/十周年UI/images/suit/heart.png" style="width:14px;height:auto;vertical-align:middle;" class="mark-suit">';
    numPrefix = "r";
}
else if(cardx.suit === "diamond"){
    suitImgHtml = '<img src="extension/十周年UI/images/suit/diamond.png" style="width:14px;height:auto;vertical-align:middle;" class="mark-suit">';
    numPrefix = "r";
}
else if(cardx.suit === "spade"){
    suitImgHtml = '<img src="extension/十周年UI/images/suit/spade.png" style="width:14px;height:auto;vertical-align:middle;" class="mark-suit">';
    numPrefix = "b";
}
else if(cardx.suit === "club"){
    suitImgHtml = '<img src="extension/十周年UI/images/suit/club.png" style="width:14px;height:auto;vertical-align:middle;" class="mark-suit">';
    numPrefix = "b";
}
else{
    suitImgHtml = "";
}

// 拼接图片，自动支持1(A)~13(K)
const numImgHtml = `<img src="extension/十周年UI/images/number/${numPrefix}${cardx.number}.png" style="width:14px;height:auto;vertical-align:middle;margin-left:-2px;">`;

const imgStyle = `opacity:1;height:72%;margin-left:2px;margin-top:-1px;position:absolute;` + 
    (lib.config['extension_十周年UI_newDecadeStyle'] == "on" ? "margin-left:-5.5px;" : "");

cardx.node.name2.innerHTML = 
    `<img src="${backgroundURL}" style="${imgStyle}">
    <span style="font-size:14px;margin-left:15px;margin-top:-1.5px;display:inline-block;">${suitImgHtml}</span>
    ${numImgHtml}
    <span style="font-size:17px;color:white;margin-top:1px;margin-left:2px;">${cardShownName}</span>`;











        if (isViewAsCard) {
            cardx.cards = cards || [];
            cardx.viewAs = card.name;
            cardx.classList.add("fakeequip");
        } else {
            delete cardx.viewAs;
            cardx.classList.remove("fakeequip");
        }
        let equipped = false, equipNum = get.equipNum(cardx);
        if (player.node.equips.childNodes.length) {
            for (let i = 0; i < player.node.equips.childNodes.length; i++) {
                if (get.equipNum(player.node.equips.childNodes[i]) >= equipNum) {
                    equipped = true;
                    player.node.equips.insertBefore(cardx, player.node.equips.childNodes[i]);
                    break;
                }
            }
        }
        if (equipped === false) {
            player.node.equips.appendChild(cardx);
            if (cards?.length && _status.discarded) _status.discarded.removeArray(cards);
        }
    };
}
