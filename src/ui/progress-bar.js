import { game, lib, _status, ui, get } from "noname";
import { initGTBB as e } from "./gtbb.js";
import { initPhaseTipsSkills as t } from "./phase-tips.js";

const a = "jindutiaopl";
const i = [0, 0, 100, 100];
const s = 395 / 3;
const o = 100;

/** 清除window上定时器 */
const n = (e) => {
    window[e] && (clearInterval(window[e]), delete window[e]);
};

/** 根据id移除dom */
const r = (e) => document.getElementById(e)?.remove();

/** 判断新DecadeStyle开关 */
const l = () => {
    const e = lib.config.extension_十周年UI_newDecadeStyle;
    return "on" !== e && "othersOff" !== e;
};

/** 根据className移除子节点 */
const p = (e, t) => {
    e.getElementsByClassName(t)[0]?.remove();
};

/** 创建img元素 */
const d = (e, t) => {
    const a = document.createElement("img");
    a.src = `${lib.assetURL}${e}`;
    a.style.cssText = t;
    return a;
};

/** 创建带data自定义字段div */
const c = (e, t) => {
    const a = document.createElement("div");
    a.data = e;
    a.style.cssText = t;
    return a;
};

/** 创建击杀提示图片 */
const h = (e, t) => {
    const a = document.createElement("img");
    a.classList.add("tipshow", e);
    a.src = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/shoushatip/${t}`;
    a.style.cssText = l()
        ? "display:block;position:absolute;z-index:91;--w:133px;--h:calc(var(--w)*50/431);width:var(--w);height:var(--h);bottom:-22px;"
        : "display:block;position:absolute;z-index:92;--w:129px;--h:calc(var(--w)*50/431);width:var(--w);height:var(--h);bottom:-20px;transform:scale(1.2);";
    return a;
};

function m() {
    game.Jindutiaoplayer = () => {
        n("timer");
        n("timer2");
        r(a);

        const e = document.createElement("div");
        e.id = a;

        const t = (() => {
            const e = lib.config.extension_十周年UI_jindutiaoYangshi;
            const t = parseFloat(lib.config["extension_十周年UI_jindutiaoSet"]) + "%";
            const a = {
                1: {
                    container: {
                        backgroundColor: "rgba(0,0,0,0.4)",
                        width: "620px",
                        height: "12.3px",
                        borderRadius: "1000px",
                        boxShadow: "0px 0px 9px #2e2b27 inset,0px 0px 2.1px #FFFFD5",
                        overflow: "hidden",
                        border: "1.2px solid #000000",
                        position: "fixed",
                        left: "calc(50% - 300px)",
                        bottom: t
                    },
                    progressBar: {
                        data: 620,
                        style: "background-image: linear-gradient(#fccc54 15%, #d01424 30%, #cc6953 90%);height:12.8px;"
                    },
                    clearSpecial: true
                },
                2: {
                    container: {
                        width: "400px",
                        height: "24px",
                        display: "block",
                        left: "calc(50% - 197px)",
                        position: "fixed",
                        bottom: t
                    },
                    progressBar: {
                        data: 300,
                        style: "width:280px;height:4.3px;margin:14px 0 0 85px;background-color:#E2E20A;border-right:5px solid #FFF;position:absolute;top:-3.5px;"
                    },
                    backgroundImage: {
                        src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao.png",
                        style: "--w:400px;--h:calc(var(--w)*44/759);width:var(--w);height:var(--h);position:absolute;top:0;"
                    },
                    clearSpecial: true
                },
                3: {
                    container: {
                        width: "400px",
                        height: "13px",
                        display: "block",
                        boxShadow: "0 0 4px #000000",
                        margin: "0 0 !important",
                        position: "fixed",
                        left: "calc(50% - 197px)",
                        bottom: t
                    },
                    progressBar: {
                        data: 395,
                        style: "z-index:1;width:399px;height:8px;margin:0 0 0 1px;background-color:#F4C336;border-top:3px solid #EBE1A7;border-bottom:2px solid #73640D;border-left:1px solid #73640D;position:absolute;top:0px;border-radius:3px;"
                    },
                    secondaryBar: {
                        data: 395,
                        style: "width:399px;height:0.1px;margin:0 0 0 0.5px;background-color:#fff;opacity:0.8;border-top:1px solid #FFF;border-bottom:1px solid #FFF;border-left:1px solid #FFF;position:absolute;top:17px;border-radius:2px;"
                    },
                    backgroundImages: [
                        {
                            src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao2.1.png",
                            style: "width:400px;height:4px;position:absolute;top:16px;z-index:-1;"
                        },
                        {
                            src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao2.png",
                            style: "width:400px;height:13px;position:absolute;top:0;opacity:0;"
                        },
                        {
                            src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao2.1.png",
                            style: "width:400px;height:14px;position:absolute;top:0;z-index:-1;"
                        }
                    ],
                    setSpecial: true
                },
                4: {
                    container: {
                        width: "450px",
                        height: "13px",
                        display: "block",
                        margin: "0 0 !important",
                        position: "fixed",
                        left: "calc(50% - 220px)",
                        bottom: t,
                        backgroundColor: "#4B3621",
                        borderRadius: "6px"
                    },
                    progressBar: {
                        data: 449,
                        style: "z-index:1;width:449px;height:12px;margin:0;background-color:rgb(230,151,91);position:absolute;top:1px;border-radius:6px;"
                    },
                    clearSpecial: true
                },
                /*新增 5号进度条样式*/
                5: {
                    container: {
                        width: "568px",
                        height: "8px",
                        display: "block",
                        position: "fixed",
                        left: "calc(50% - 284px)",
                        bottom: t,
                        backgroundColor: "#413d34",
                        borderRadius: "0px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.6)"
                    },
                    progressBar: {
                        data: 568,
                        style: "z-index:1;width:568px;height:8px;background:linear-gradient(to right,#b05327,#dba03a);border-top:1.5px outset #da6629;border-left:2px outset #da6629;position:absolute;top:0;border-radius:2px;"
                    },
                    clearSpecial: true,
                    flameElement: {
                        style: "position:absolute;right:0px;top:0;width:20px;height:8px;background:#fff08a;z-index:2;border-radius:0px;pointer-events:none;"
                    }
                }
                /*结束*/
            };
            return a[e] ?? a[1];
        })();

        t.clearSpecial && delete window.jindutiaoTeshu;
        t.setSpecial && !window.jindutiaoTeshu && (window.jindutiaoTeshu = true);

        Object.assign(e.style, t.container);
        const i = c(t.progressBar.data, t.progressBar.style);
        e.appendChild(i);

        /*新增火焰头样式与dom*/
        if (!document.getElementById('flame-style')) {
            const s = document.createElement('style');
            s.id = 'flame-style';
            s.textContent = '.progress-flame{position:absolute;right:0px;top:0;width:3px;height:8px;background:#fbe673;z-index:2;border-radius:0px;pointer-events:none;filter:blur(0.5px);}';
            document.head.appendChild(s);
        }
        if (t.flameElement) {
            const f = document.createElement('div');
            f.className = 'progress-flame';
            i.appendChild(f);
        }
        /*结束*/

        let o = null;
        let l = null;

        t.secondaryBar && (o = c(t.secondaryBar.data, t.secondaryBar.style), e.appendChild(o));
        t.backgroundImage && e.appendChild(d(t.backgroundImage.src, t.backgroundImage.style));
        if (t.backgroundImages) {
            t.backgroundImages.forEach((bgItem, idx) => {
                const imgDom = d(bgItem.src, bgItem.style);
                0 === idx && (l = imgDom);
                e.appendChild(imgDom);
            });
        }

        document.body.appendChild(e);
        const p = parseFloat(lib.config.extension_十周年UI_jindutiaoST);

        window.timer = setInterval(() => {
            i.style.width = `${i.data}px`;
            i.style.backgroundColor = i.data <= s ? "rgba(230,56,65,0.88)" : "rgb(230,151,91)";
            0 === --i.data && (n("timer"), e.remove());
        }, p);

        if (window.jindutiaoTeshu && o && l) {
            window.timer2 = setInterval(() => {
                o.style.width = --o.data + "px";
                0 === o.data && (n("timer2"), delete window.jindutiaoTeshu, o.remove(), l.remove());
            }, p / 2);
        }
    };

    game.as_removeText = () => {
        _status.as_showText?.remove();
        delete _status.as_showText;
        _status.as_showImage?.show();
    };

    game.as_showText = (e, t, a, s = "shousha", o = 16, n = "#ffffff") => {
        if (!e) return false;
        t = Array.isArray(t) ? t : i;
        a = true === a || "number" === typeof a ? a : 3;
        game.as_removeText();

        const r = ui.create.div("", e, ui.window);
        r.style.cssText = `z-index:-3;pointer-events:none;font-family:${s};font-size:${o}px;color:${n};line-height:${1.2 * o}px;text-align:center;left:${t[0] + t[2] / 2}%;top:${t[1]}%;width:0%;height:${t[3]}%;position:absolute;transition:all 1s`;
        _status.as_showText = r;
        _status.as_showImage?.hide();

        setTimeout(() => {
            r.style.left = `${t[0]}%`;
            r.style.width = `${t[2]}%`;
        }, 1);

        true !== a && setTimeout(game.as_removeText, 1000 * a);
        return true;
    };

    game.as_removeImage = () => {
        if (_status.as_showImage) {
            const e = _status.as_showImage;
            e.style.animation = "left-to-right-out 1s";
            delete _status.as_showImage;
            setTimeout(() => e.remove(), 1000);
        }
    };

    game.as_showImage = (e, t, a) => {
        if (!e) return false;
        t = Array.isArray(t) ? t : i;
        a = true === a || "number" === typeof a ? a : 3;
        game.as_removeImage();

        const s = ui.create.div("", "", ui.window);
        s.style.cssText = `z-index:-1;pointer-events:none;left:${t[0]}%;top:${t[1]}%;width:8%;height:${t[3]}%;position:absolute;background-size:100% 100%;background-position:center;background-image:url(${lib.assetURL}${e});transition:all 1s`;
        _status.as_showImage = s;
        _status.as_showText && s.hide();

        true !== a && setTimeout(game.as_removeImage, 1000 * a);
        return true;
    };
}

const u = (e) => {
    let t = false;
    let i = false;
    let s = [];
    let d = null;

    const c = () => {
        t || (t = true, game.Jindutiaoplayer());
    };
    const h = () => {
        t && (t = false, n("timer"), n("timer2"), r(a));
    };

    window.resetProgressBarState = () => {
        t = false;
    };

    const m = (player) => {
        if (!player || player === game.me || s.includes(player)) return;
        s.push(player);
        p(player, "timeai");
        p(player, "timePhase");

        const { container: e, boxTime: t } = ((isCurrentPhase) => {
            const tDom = document.createElement("div");
            const barDom = document.createElement("div");
            const imgDom = document.createElement("img");
            const flagNewUi = l();

            if (flagNewUi) {
                tDom.classList.add(isCurrentPhase ? "timePhase" : "timeai");
                tDom.style.cssText = "display:block;position:absolute;z-index:90;--w:122px;--h:calc(var(--w)*4/145);width:var(--w);height:var(--h);left:3.5px;bottom:-6.2px;";
                barDom.data = 125;
                barDom.style.cssText = "z-index:92;--w:33px;--h:calc(var(--w)*4/120);width:var(--w);height:var(--h);margin:1px;background-color:#dd9900;position:absolute;top:0;";
                imgDom.src = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/time.png`;
                imgDom.style.cssText = "position:absolute;z-index:91;--w:122px;--h:calc(var(--w)*4/145);width:var(--w);height:var(--h);top:0;";
            } else {
                tDom.classList.add(isCurrentPhase ? "timePhase" : "timeai");
                tDom.style.cssText = "display:block;position:absolute;z-index:90;--w:122px;--h:calc(var(--w)*8/162);width:var(--w);height:var(--h);left:1.5px;bottom:-14px;";
                barDom.data = 120;
                barDom.style.cssText = "z-index:91;width:115px;height:3.3px;margin:1px;background-color:#f2c84b;position:absolute;top:0;border-radius:3px;";
                imgDom.src = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/timeX.png`;
                imgDom.style.cssText = "position:absolute;z-index:90;--w:122px;--h:calc(var(--w)*8/162);width:var(--w);height:var(--h);top:0;";
            }
            tDom.appendChild(barDom);
            tDom.appendChild(imgDom);
            return { container: tDom, boxTime: barDom };
        })(_status.currentPhase === player);

        player.appendChild(e);
        const timerKey = `timerai_${player.playerid}`;
        window[timerKey] = setInterval(() => {
            t.style.width = --t.data + "px";
            0 === t.data && (n(timerKey), e.remove());
        }, 150);
    };

    const clearAiTimer = () => {
        if (i || s.length) {
            i = false;
            s.forEach((player) => {
                n(`timerai_${player.playerid}`);
                p(player, "timeai");
                p(player, "timePhase");
            });
            s = [];
        }
    };

    const g = () => {
        const event = _status.event;
        let player;
        if (event?.player && (_status.paused || _status.imchoosing)) {
            if ("wuxie" === event?.type) {
                "0" !== lib.config.extension_十周年UI_jindutiaoYangshi && c();
                if (!(i && s.length > 1)) {
                    clearAiTimer();
                    i = true;
                    game.players.forEach((e) => {
                        e !== game.me && m(e);
                    });
                }
            } else if (event.player === game.me) {
                clearAiTimer();
                "0" !== lib.config.extension_十周年UI_jindutiaoYangshi && c();
            } else {
                h();
                if ((player = event.player) && player !== game.me) {
                    if (!(i && 1 === s.length && s[0] === player)) {
                        clearAiTimer();
                        i = true;
                        m(player);
                    }
                }
            }
        } else {
            h();
            clearAiTimer();
        }
    };

    let x = setInterval(() => {
        if (_status.gameStarted) {
            clearInterval(x);
            d || (d = setInterval(g, o));
        }
    }, o);

    lib.onover.push(() => {
        if (d) {
            clearInterval(d);
            d = null;
        }
        h();
        clearAiTimer();
    });
};

function g(a) {
    lib.removeFirstByClass = lib.removeFirstByClass || ((e, t) => e.getElementsByClassName(t)[0]?.remove());
    lib.createTipImg = lib.createTipImg || ((e, t, a) => {
        const i = document.createElement("img");
        i.classList.add("tipshow", e);
        i.src = t;
        i.style.cssText = a;
        return i;
    });

    t();

    if ("connect" !== get.mode()) {
        u();
        (() => {
            let e = null;
            let t = null;
            const a = () => {
                if (!_status.gameStarted || !game.players) return;
                const a = _status.currentPhase;
                if (a && a !== game.me && a.isPhaseUsing?.()) {
                    if (e !== a) {
                        e && p(e, "playertip");
                        e = a;
                        !a.getElementsByClassName("playertip")[0] && a.appendChild(h("playertip", l() ? "tip.png" : "phasetip.png"));
                    }
                } else {
                    e && (p(e, "playertip"), e = null);
                }

                const event = _status.event;
                if ("phaseDiscard" === event?.name && event.player !== game.me) {
                    if (t !== event.player) {
                        t && p(t, "playertipQP");
                        t = event.player;
                        !event.player.getElementsByClassName("playertipQP")[0] && event.player.appendChild(h("playertipQP", l() ? "tipQP.png" : "discardtip.png"));
                    }
                } else {
                    t && (p(t, "playertipQP"), t = null);
                }
            };

            let i = setInterval(() => {
                if (_status.gameStarted) {
                    clearInterval(i);
                    setInterval(a, o);
                }
            }, o);
        })();

        (() => {
            if (!l()) return;
            const cardTipMap = {
                sha: { cls: "playertipsha", img: "tipsha.png" },
                shan: { cls: "playertipshan", img: "tipshan.png" },
                tao: { cls: "playertiptao", img: "tiptao.png" },
                jiu: { cls: "playertipjiu", img: "tipjiu.png" }
            };
            const t = new Map();

            lib.announce.subscribe("Noname.Game.Event.Trigger", (payload) => {
                const { name: eventName, event: event } = payload;
                if (!["useCardBegin", "respondBegin"].includes(eventName)) return;
                if (!event?.card || event.player === game.me) return;
                const cardName = event.card.name || event.card.viewAs;
                const cfg = cardTipMap[cardName];
                if (cfg && !event.player.getElementsByClassName(cfg.cls)[0]) {
                    p(event.player, "tipskill");
                    event.player.appendChild(h(cfg.cls, cfg.img));
                    t.set(event.player, cfg.cls);
                }
            });

            lib.announce.subscribe("Noname.Game.Event.Trigger", (payload) => {
                const { name: eventName } = payload;
                if (["useCardEnd", "respondEnd", "phaseBegin", "phaseEnd", "dieBegin"].includes(eventName)) {
                    t.forEach((cls, player) => p(player, cls));
                    t.clear();
                }
            });
        })();

        e();
    } else {
        e();
    }
}

export { m as initPrecontentUI, g as registerLegacyModules };
