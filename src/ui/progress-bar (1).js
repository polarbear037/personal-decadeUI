import { game, lib, _status, ui, get } from "noname";
import { initGTBB as initGTBB } from "./gtbb.js";
import { initPhaseTipsSkills as initPhaseTipsSkills } from "./phase-tips.js";

const a = "jindutiaopl";
const i = [0, 0, 100, 100];
const s = 395 / 3;
const o = 100;

/** 清除定时器 */
const n = name => {
	window[name] && (clearInterval(window[name]), delete window[name]);
};

/** 根据ID移除DOM */
const r = id => document.getElementById(id)?.remove();

/** 判断是否开启新DecadeStyle */
const l = () => {
	const style = lib.config.extension_十周年UI_newDecadeStyle;
	return "on" !== style && "othersOff" !== style;
};

/** 根据className移除子元素 */
const p = (parent, className) => {
	parent.getElementsByClassName(className)[0]?.remove();
};

/** 创建img元素 */
const d = (src, style) => {
	const img = document.createElement("img");
	img.src = `${lib.assetURL}${src}`;
	img.style.cssText = style;
	return img;
};

/** 创建带data自定义属性的div */
const c = (data, style) => {
	const el = document.createElement("div");
	el.data = data;
	el.style.cssText = style;
	return el;
};

/** 创建提示图片节点 */
const h = (e, t) => {
	const a = document.createElement("img");
	a.classList.add("tipshow", e);
	a.src = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/shoushatip/${t}`;
	if (l()) {
		a.style.cssText = `display:block;position:absolute;z-index:91;--w:133px;--h:calc(var(--w)*50/431);width:var(--w);height:var(--h);bottom:-22px;`;
	} else {
		a.style.cssText = `display:block;position:absolute;z-index:92;--w:129px;--h:calc(var(--w)*50/431);width:var(--w);height:var(--h);bottom:-20px;transform:scale(1.2);`;
	}
	return a;
};

/** 全局进度条：十周年UI进度条 */
function m() {
	game.Jindutiaoplayer = () => {
		n("timer");
		n("timer2");
		r(a);

		const e = document.createElement("div");
		e.id = a;

		const t = (() => {
			const styleType = lib.config.extension_十周年UI_jindutiaoYangshi;
			const bottom = parseFloat(lib.config["extension_十周年UI_jindutiaoSet"]) + "%";
			const configs = {
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
						bottom: bottom,
					},
					progressBar: {
						data: 620,
						style: "background-image: linear-gradient(#fccc54 15%, #d01424 30%, #cc6953 90%);height:12.8px;",
					},
					clearSpecial: true,
				},
				2: {
					container: {
						width: "400px",
						height: "24px",
						display: "block",
						left: "calc(50% - 197px)",
						position: "fixed",
						bottom: bottom,
					},
					progressBar: {
						data: 300,
						style: "width:280px;height:4.3px;margin:14px 0 0 85px;background-color:#E2E20A;border-right:5px solid #FFF;position:absolute;top:-3.5px;",
					},
					backgroundImage: {
						src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao.png",
						style: "--w:400px;--h:calc(var(--w)*44/759);width:var(--w);height:var(--h);position:absolute;top:0;",
					},
					clearSpecial: true,
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
						bottom: bottom,
					},
					progressBar: {
						data: 395,
						style: "z-index:1;width:399px;height:8px;margin:0 0 0 1px;background-color:#F4C336;border-top:3px solid #EBE1A7;border-bottom:2px solid #73640D;border-left:1px solid #73640D;position:absolute;top:0px;border-radius:3px;",
					},
					secondaryBar: {
						data: 395,
						style: "width:399px;height:0.1px;margin:0 0 0 0.5px;background-color:#fff;opacity:0.8;border-top:1px solid #FFF;border-bottom:1px solid #FFF;border-left:1px solid #FFF;position:absolute;top:17px;border-radius:2px;",
					},
					backgroundImages: [
						{
							src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao2.1.png",
							style: "width:400px;height:4px;position:absolute;top:16px;z-index:-1;",
						},
						{
							src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao2.png",
							style: "width:400px;height:13px;position:absolute;top:0;opacity:0;",
						},
						{
							src: "extension/十周年UI/ui/assets/lbtn/uibutton/jindutiao2.1.png",
							style: "width:400px;height:14px;position:absolute;top:0;z-index:-1;",
						},
					],
					setSpecial: true,
				},
				4: {
					container: {
						width: "450px",
						height: "13px",
						display: "block",
						margin: "0 0 !important",
						position: "fixed",
						left: "calc(50% - 220px)",
						bottom: bottom,
						backgroundColor: "#4B3621",
						borderRadius: "6px",
					},
					progressBar: {
						data: 449,
						style: "z-index:1;width:449px;height:12px;margin:0;background-color:rgb(230,151,91);position:absolute;top:1px;border-radius:6px;",
					},
					clearSpecial: true,
				},
			};
			return configs[styleType] ?? configs[1];
		})();

		if (t.clearSpecial) delete window.jindutiaoTeshu;
		if (t.setSpecial && !window.jindutiaoTeshu) {
			window.jindutiaoTeshu = true;
		}

		Object.assign(e.style, t.container);
		const i = c(t.progressBar.data, t.progressBar.style);
		e.appendChild(i);

		let o = null;
		let l = null;

		if (t.secondaryBar) {
			o = c(t.secondaryBar.data, t.secondaryBar.style);
			e.appendChild(o);
		}
		if (t.backgroundImage) {
			e.appendChild(d(t.backgroundImage.src, t.backgroundImage.style));
		}
		if (t.backgroundImages) {
			t.backgroundImages.forEach((bgItem, idx) => {
				const img = d(bgItem.src, bgItem.style);
				if (idx === 0) l = img;
				e.appendChild(img);
			});
		}

		document.body.appendChild(e);
		const p = parseFloat(lib.config.extension_十周年UI_jindutiaoST);

		// 主进度定时器
		window.timer = setInterval(() => {
			i.style.width = `${i.data}px`;
			i.style.backgroundColor = i.data <= s ? "rgba(230,56,65,0.88)" : "rgb(230,151,91)";
			if (--i.data === 0) {
				n("timer");
				e.remove();
			}
		}, p);

		// 副条特殊定时器
		if (window.jindutiaoTeshu && o && l) {
			window.timer2 = setInterval(() => {
				o.style.width = --o.data + "px";
				if (o.data === 0) {
					n("timer2");
					delete window.jindutiaoTeshu;
					o.remove();
					l.remove();
				}
			}, p / 2);
		}
	};

	game.as_removeText = () => {
		_status.as_showText?.remove();
		delete _status.as_showText;
		_status.as_showImage?.show();
	};

	/** 弹出文字提示 */
	game.as_showText = (str, pos, time, font = "shousha", size = 16, color = "#ffffff") => {
		if (!str) return false;
		pos = Array.isArray(pos) ? pos : i;
		time = true === time || "number" === typeof time ? time : 3;
		game.as_removeText();

		const div = ui.create.div("", str, ui.window);
		div.style.cssText = `
            z-index:-3;
            pointer-events:none;
            font-family:${font};
            font-size:${size}px;
            color:${color};
            line-height:${1.2 * size}px;
            text-align:center;
            left:${pos[0] + pos[2] / 2}%;
            top:${pos[1]}%;
            width:0%;
            height:${pos[3]}%;
            position:absolute;
            transition:all 1s
        `;
		_status.as_showText = div;
		_status.as_showImage?.hide();

		setTimeout(() => {
			div.style.left = `${pos[0]}%`;
			div.style.width = `${pos[2]}%`;
		}, 1);

		if (true !== time) {
			setTimeout(game.as_removeText, 1000 * time);
		}
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

	/** 弹出图片提示 */
	game.as_showImage = (url, pos, time) => {
		if (!url) return false;
		pos = Array.isArray(pos) ? pos : i;
		time = true === time || "number" === typeof time ? time : 3;
		game.as_removeImage();

		const div = ui.create.div("", "", ui.window);
		div.style.cssText = `
            z-index:-1;
            pointer-events:none;
            left:${pos[0]}%;
            top:${pos[1]}%;
            width:8%;
            height:${pos[3]}%;
            position:absolute;
            background-size:100% 100%;
            background-position:center;
            background-image:url(${lib.assetURL}${url});
            transition:all 1s
        `;
		_status.as_showImage = div;
		_status.as_showText && div.hide();

		if (true !== time) {
			setTimeout(game.as_removeImage, 1000 * time);
		}
		return true;
	};
}

const u = e => {
	let t = false;
	let i = false;
	let s = [];
	let d = null;

	const c = () => {
		if (!t) {
			t = true;
			game.Jindutiaoplayer();
		}
	};

	const h = () => {
		if (t) {
			t = false;
			n("timer");
			n("timer2");
			r(a);
		}
	};

	window.resetProgressBarState = () => {
		t = false;
	};

	/** AI玩家倒计时条 */
	const m = player => {
		if (!player || player === game.me || s.includes(player)) return;
		s.push(player);
		p(player, "timeai");
		p(player, "timePhase");

		const { container: e, boxTime: t } = (isPhase => {
			const container = document.createElement("div");
			const boxTime = document.createElement("div");
			const imgBg = document.createElement("img");
			const isShousha = l();

			if (isShousha) {
				container.classList.add(isPhase ? "timePhase" : "timeai");
				container.style.cssText = "display:block;position:absolute;z-index:90;--w:122px;--h:calc(var(--w)*4/145);width:var(--w);height:var(--h);left:3.5px;bottom:-6.2px;";
				boxTime.data = 125;
				boxTime.style.cssText = "z-index:92;--w:33px;--h:calc(var(--w)*4/120);width:var(--w);height:var(--h);margin:1px;background-color:#dd9900;position:absolute;top:0;";
				imgBg.src = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/time.png`;
				imgBg.style.cssText = "position:absolute;z-index:91;--w:122px;--h:calc(var(--w)*4/145);width:var(--w);height:var(--h);top:0;";
			} else {
				container.classList.add(isPhase ? "timePhase" : "timeai");
				container.style.cssText = "display:block;position:absolute;z-index:90;--w:122px;--h:calc(var(--w)*8/162);width:var(--w);height:var(--h);left:1.5px;bottom:-14px;";
				boxTime.data = 120;
				boxTime.style.cssText = "z-index:91;width:115px;height:3.3px;margin:1px;background-color:#f2c84b;position:absolute;top:0;border-radius:3px;";
				imgBg.src = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/timeX.png`;
				imgBg.style.cssText = "position:absolute;z-index:90;--w:122px;--h:calc(var(--w)*8/162);width:var(--w);height:var(--h);top:0;";
			}
			container.appendChild(boxTime);
			container.appendChild(imgBg);
			return { container: container, boxTime: boxTime };
		})(_status.currentPhase === player);

		player.appendChild(e);
		const timerKey = `timerai_${player.playerid}`;
		window[timerKey] = setInterval(() => {
			t.style.width = --t.data + "px";
			if (t.data === 0) {
				n(timerKey);
				e.remove();
			}
		}, 150);
	};

	/** 清空全部AI计时条 */
	const u = () => {
		if (i || s.length) {
			i = false;
			s.forEach(player => {
				n(`timerai_${player.playerid}`);
				p(player, "timeai");
				p(player, "timePhase");
			});
			s = [];
		}
	};

	/** 事件驱动主逻辑 */
	const g = () => {
		const event = _status.event;
		let player;
		if (event?.player && (_status.paused || _status.imchoosing)) {
			if ("wuxie" === event?.type) {
				if ("0" !== lib.config.extension_十周年UI_jindutiaoYangshi) c();
				if (!(i && s.length > 1)) {
					u();
					i = true;
					game.players.forEach(e => {
						if (e !== game.me) m(e);
					});
				}
			} else if (event.player === game.me) {
				u();
				if ("0" !== lib.config.extension_十周年UI_jindutiaoYangshi) c();
			} else {
				h();
				if ((player = event.player) && player !== game.me) {
					if (!(i && 1 === s.length && s[0] === player)) {
						u();
						i = true;
						m(player);
					}
				}
			}
		} else {
			h();
			u();
		}
	};

	let x = setInterval(() => {
		if (_status.gameStarted) {
			clearInterval(x);
			if (!d) d = setInterval(g, o);
		}
	}, o);

	lib.onover.push(() => {
		if (d) {
			clearInterval(d);
			d = null;
		}
		h();
		u();
	});
};

function g(a) {
	lib.removeFirstByClass = lib.removeFirstByClass || ((e, t) => e.getElementsByClassName(t)[0]?.remove());
	lib.createTipImg =
		lib.createTipImg ||
		((e, t, st) => {
			const i = document.createElement("img");
			i.classList.add("tipshow", e);
			i.src = t;
			i.style.cssText = st;
			return i;
		});

	initPhaseTipsSkills();

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
						if (!a.getElementsByClassName("playertip")[0]) {
							a.appendChild(h("playertip", l() ? "tip.png" : "phasetip.png"));
						}
					}
				} else {
					e && (p(e, "playertip"), (e = null));
				}

				const event = _status.event;
				if ("phaseDiscard" === event?.name && event.player !== game.me) {
					if (t !== event.player) {
						t && p(t, "playertipQP");
						t = event.player;
						if (!event.player.getElementsByClassName("playertipQP")[0]) {
							event.player.appendChild(h("playertipQP", l() ? "tipQP.png" : "discardtip.png"));
						}
					}
				} else {
					t && (p(t, "playertipQP"), (t = null));
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
			const tips = {
				sha: { cls: "playertipsha", img: "tipsha.png" },
				shan: { cls: "playertipshan", img: "tipshan.png" },
				tao: { cls: "playertiptao", img: "tiptao.png" },
				jiu: { cls: "playertipjiu", img: "tipjiu.png" },
			};
			const shown = new Map();

			lib.announce.subscribe("Noname.Game.Event.Trigger", data => {
				const { name: name, event: event } = data;
				if (!["useCardBegin", "respondBegin"].includes(name)) return;
				if (!event?.card || event.player === game.me) return;
				const cardName = event.card.name || event.card.viewAs;
				const tip = tips[cardName];
				if (tip && !event.player.getElementsByClassName(tip.cls)[0]) {
					p(event.player, "tipskill");
					event.player.appendChild(h(tip.cls, tip.img));
					shown.set(event.player, tip.cls);
				}
			});

			lib.announce.subscribe("Noname.Game.Event.Trigger", data => {
				const { name: name } = data;
				if (["useCardEnd", "respondEnd", "phaseBegin", "phaseEnd", "dieBegin"].includes(name)) {
					shown.forEach((cls, player) => p(player, cls));
					shown.clear();
				}
			});
		})();

		initGTBB();
	} else {
		initGTBB();
	}
}

export { m as initPrecontentUI, g as registerLegacyModules };
