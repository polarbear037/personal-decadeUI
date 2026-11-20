import { game, lib, _status, ui, get } from "noname";
import { initGTBB as initGTBB } from "./gtbb.js";
import { initPhaseTipsSkills as initPhaseTipsSkills } from "./phase-tips.js";
import { initOnlinePlayerTips } from "./online-player-tips.js";
import { initXinshaPlayerTips, refreshXinshaPlayerTips } from "./xinsha-player-tips.js";

const a = "jindutiaopl";
const i = [0, 0, 100, 100];
const s = 395 / 3;
const o = 100;

/** 清除window上定时器 */
const n = name => {
	window[name] && (clearInterval(window[name]), delete window[name]);
};

/** 根据id移除dom */
const r = id => document.getElementById(id)?.remove();

/** 判断新DecadeStyle开关 */
const l = () => {
	const style = lib.config.extension_十周年UI_newDecadeStyle;
	return "on" !== style && "othersOff" !== style;
};

/** 根据className移除子节点 */
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

/** 创建带data自定义字段div */
const c = (data, style) => {
	const el = document.createElement("div");
	el.data = data;
	el.style.cssText = style;
	return el;
};

/** 创建击杀提示图片 */
const h = (className, imgName) => {
	const img = document.createElement("img");
	img.classList.add("tipshow", className);
	img.src = `${lib.assetURL}extension/十周年UI/ui/assets/lbtn/shoushatip/${imgName}`;
	img.style.cssText = l() ? "display:block;position:absolute;z-index:91;--w:133px;--h:calc(var(--w)*50/431);width:var(--w);height:var(--h);bottom:-22px;" : "display:block;position:absolute;z-index:92;--w:129px;--h:calc(var(--w)*50/431);width:var(--w);height:var(--h);bottom:-20px;transform:scale(1.2);";
	return img;
};

function m() {
	game.Jindutiaoplayer = options => {
		const isolated = options && typeof options === "object";
		const barId = isolated && options.id ? options.id : a;
		const parent = isolated && options.parent?.appendChild ? options.parent : document.body;
		let isolatedTimer = null;
		let isolatedTimer2 = null;
		let isolatedSpecial = false;
		let disposed = false;
		if (!isolated) {
			n("timer");
			n("timer2");
			r(a);
		}

		const e = document.createElement("div");
		e.id = barId;
		e.dataset.yjcmProgress = String(lib.config.extension_十周年UI_jindutiaoYangshi);
		const dispose = () => {
			if (disposed) return;
			disposed = true;
			if (isolatedTimer) {
				clearInterval(isolatedTimer);
				isolatedTimer = null;
			}
			if (isolatedTimer2) {
				clearInterval(isolatedTimer2);
				isolatedTimer2 = null;
			}
			e.remove();
		};

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
						width: "var(--yjcm-progress-width, 582px)",
						height: "13px",
						display: "block",
						margin: "0 0 !important",
						position: "fixed",
						left: "50%",
						transform: "translateX(-50%)",
						transitionProperty: "opacity",
						bottom: bottom,
						backgroundColor: "#4B3621",
						borderRadius: "6px",
					},
					progressBar: {
						data: 449,
						proportionalWidth: true,
						style: "z-index:1;width:100%;height:12px;margin:0;position:absolute;top:1px;overflow:hidden;transition:none;",
						image: "extension/十周年UI/image/ui/progress/xinsha/xf_newTimeBar_2.png",
						warningImage: "extension/十周年UI/image/ui/progress/xinsha/xf_newTimeBar_red_2.png",
					},
					moonBar: {
						image: "extension/十周年UI/image/ui/progress/xinsha/newTimeBar.png",
						backgroundImage: "extension/十周年UI/image/ui/progress/xinsha/newTimeBarBg.png",
					},
					clearSpecial: true,
				},
				/*新增 5号进度条样式*/
				5: {
					container: {
						width: "568px",
						height: "8px",
						display: "block",
						position: "fixed",
						left: "calc(50% - 284px)",
						bottom: bottom,
						backgroundColor: "#413d34",
						borderRadius: "0px",
						boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
					},
					progressBar: {
						data: 568,
						style: "z-index:1;width:568px;height:8px;background:linear-gradient(to right,#b05327,#dba03a);border-top:1.5px outset #da6629;border-left:2px outset #da6629;position:absolute;top:0;border-radius:2px;",
					},
					clearSpecial: true,
					flameElement: {
						style: "position:absolute;right:0px;top:0;width:20px;height:8px;background:#fff08a;z-index:2;border-radius:0px;pointer-events:none;",
					},
				},
				/*结束*/
			};
			return configs[styleType] ?? configs[1];
		})();

		if (t.clearSpecial) {
			if (isolated) isolatedSpecial = false;
			else delete window.jindutiaoTeshu;
		}
		if (t.setSpecial) {
			if (isolated) isolatedSpecial = true;
			else !window.jindutiaoTeshu && (window.jindutiaoTeshu = true);
		}

		Object.assign(e.style, t.container);
		const i = c(t.progressBar.data, t.progressBar.style);
		e.appendChild(i);
		// 原版 UILoadingBar 裁切整张渐变图，倒计时不能把剩余部分重新拉伸。
		const progressImage = t.progressBar.image ? d(t.progressBar.image, "position:absolute;left:0;top:0;width:var(--yjcm-progress-width, 582px);height:100%;pointer-events:none;") : null;
		if (progressImage) {
			// 普通条和技能窗口条共用纹理节点，明度也由同一处调整，原图保留。
			if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") progressImage.style.filter = "brightness(1.1)";
			i.appendChild(progressImage);
		}
		let warning = false;
		// 官方 moonTimeBar 使用独立贴图；提前加载，普通倒计时耗尽时直接接续。
		const moonImage = t.moonBar ? d(t.moonBar.image, "position:absolute;left:0;top:0;width:var(--yjcm-progress-width, 582px);height:100%;pointer-events:none;") : null;
		const moonBackground = t.moonBar ? d(t.moonBar.backgroundImage, "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:0;display:none;") : null;
		if (moonBackground) e.appendChild(moonBackground);
		let moonTicks = 0;
		let moonStopped = false;

		/*新增火焰头样式与dom*/
		if (!document.getElementById("flame-style")) {
			const s = document.createElement("style");
			s.id = "flame-style";
			s.textContent = ".progress-flame{position:absolute;right:0px;top:0;width:3px;height:8px;background:#fbe673;z-index:2;border-radius:0px;pointer-events:none;filter:blur(0.5px);}";
			document.head.appendChild(s);
		}
		if (t.flameElement) {
			const f = document.createElement("div");
			f.className = "progress-flame";
			i.appendChild(f);
		}
		/*结束*/

		let o = null;
		let l = null;

		t.secondaryBar && ((o = c(t.secondaryBar.data, t.secondaryBar.style)), e.appendChild(o));
		t.backgroundImage && e.appendChild(d(t.backgroundImage.src, t.backgroundImage.style));
		if (t.backgroundImages) {
			t.backgroundImages.forEach((bgItem, idx) => {
				const img = d(bgItem.src, bgItem.style);
				0 === idx && (l = img);
				e.appendChild(img);
			});
		}

		parent.appendChild(e);
		const p = parseFloat(lib.config.extension_十周年UI_jindutiaoST);

		const updateProgress = () => {
			if (disposed || moonStopped) return;
			if (e.dataset.yjcmMoonProgress === "true") {
				// 同一倒计时间隔，每次只消耗原来的1/5，最后精确停在剩余5%。
				i.data = Math.max(t.progressBar.data * 0.05, t.progressBar.data - ++moonTicks / 5);
				i.style.width = `${i.data / t.progressBar.data * 100}%`;
				if (i.data <= t.progressBar.data * 0.05) {
					moonStopped = true;
					if (isolated) {
						clearInterval(isolatedTimer);
						isolatedTimer = null;
					} else n("timer");
				}
				return;
			}
			// 一将条的视觉宽度随原版画幅缩放，倒计时仍沿用449步，避免加宽后延长时长。
			i.style.width = t.progressBar.proportionalWidth ? `${i.data / t.progressBar.data * 100}%` : `${i.data}px`;
			if (progressImage) {
				if (!warning && i.data <= s) {
					warning = true;
					progressImage.src = `${lib.assetURL}${t.progressBar.warningImage}`;
				}
			} else i.style.backgroundColor = i.data <= s ? "rgba(230,56,65,0.88)" : "rgb(230,151,91)";
			if (0 === --i.data) {
				if (moonImage) {
					e.dataset.yjcmMoonProgress = "true";
					i.data = t.progressBar.data;
					i.style.width = "100%";
					progressImage.replaceWith(moonImage);
					moonBackground.style.display = "";
					return;
				}
				if (isolated) {
					isolatedTimer && clearInterval(isolatedTimer);
					isolatedTimer = null;
					e.remove();
				} else {
					n("timer");
					e.remove();
				}
			}
		};
		if (isolated) isolatedTimer = setInterval(updateProgress, p);
		else window.timer = setInterval(updateProgress, p);

		if ((isolated ? isolatedSpecial : window.jindutiaoTeshu) && o && l) {
			const updateSecondary = () => {
				if (disposed) return;
				o.style.width = --o.data + "px";
				if (0 === o.data) {
					if (isolated) {
						isolatedTimer2 && clearInterval(isolatedTimer2);
						isolatedTimer2 = null;
					} else {
						n("timer2");
						delete window.jindutiaoTeshu;
					}
					o.remove();
					l.remove();
				}
			};
			if (isolated) isolatedTimer2 = setInterval(updateSecondary, p / 2);
			else window.timer2 = setInterval(updateSecondary, p / 2);
		}
		if (!isolated) return;
		return {
			bar: e,
			dispose,
			get timer() {
				return isolatedTimer;
			},
			get timer2() {
				return isolatedTimer2;
			},
		};
	};

	game.as_removeText = () => {
		_status.as_showText?.remove();
		delete _status.as_showText;
		_status.as_showImage?.show();
	};

	game.as_showText = (str, pos, time, font = "shousha", size = 16, color = "#ffffff") => {
		if (!str) return false;
		pos = Array.isArray(pos) ? pos : i;
		time = true === time || "number" === typeof time ? time : 3;
		game.as_removeText();

		const div = ui.create.div("", str, ui.window);
		div.style.cssText = `z-index:-3;pointer-events:none;font-family:${font};font-size:${size}px;color:${color};line-height:${1.2 * size}px;text-align:center;left:${pos[0] + pos[2] / 2}%;top:${pos[1]}%;width:0%;height:${pos[3]}%;position:absolute;transition:all 1s`;
		_status.as_showText = div;
		_status.as_showImage?.hide();

		setTimeout(() => {
			div.style.left = `${pos[0]}%`;
			div.style.width = `${pos[2]}%`;
		}, 1);

		true !== time && setTimeout(game.as_removeText, 1000 * time);
		return true;
	};

	game.as_removeImage = () => {
		if (_status.as_showImage) {
			const e = _status.as_showImage;
			if (e._decadePhaseTipRemove) return e._decadePhaseTipRemove();
			e.style.animation = "left-to-right-out 1s";
			delete _status.as_showImage;
			setTimeout(() => e.remove(), 1000);
		}
	};

	game.as_showImage = (url, pos, time) => {
		if (!url) return false;
		pos = Array.isArray(pos) ? pos : i;
		time = true === time || "number" === typeof time ? time : 3;
		game.as_removeImage();

		const div = ui.create.div("", "", ui.window);
		div.style.cssText = `z-index:-1;pointer-events:none;left:${pos[0]}%;top:${pos[1]}%;width:8%;height:${pos[3]}%;position:absolute;background-size:100% 100%;background-position:center;background-image:url(${lib.assetURL}${url});transition:all 1s`;
		_status.as_showImage = div;
		_status.as_showText && div.hide();

		true !== time && setTimeout(() => {
			if (_status.as_showImage === div) game.as_removeImage();
		}, 1000 * time);
		return true;
	};
}

const u = e => {
	let t = false;
	let i = false;
	let s = [];
	let d = null;

	const c = () => {
		t || ((t = true), game.Jindutiaoplayer());
	};
	const h = () => {
		t && ((t = false), n("timer"), n("timer2"), r(a));
	};

	window.resetProgressBarState = () => {
		t = false;
	};

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
		if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") refreshXinshaPlayerTips();
		const timerKey = `timerai_${player.playerid}`;
		window[timerKey] = setInterval(() => {
			t.style.width = --t.data + "px";
			if (t.data === 0) {
				n(timerKey);
				e.remove();
				if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") refreshXinshaPlayerTips();
			}
		}, 150);
	};

	const clearAiTimer = () => {
		if (i || s.length) {
			i = false;
			s.forEach(player => {
				n(`timerai_${player.playerid}`);
				p(player, "timeai");
				p(player, "timePhase");
			});
			s = [];
			if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff") refreshXinshaPlayerTips();
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
					game.players.forEach(e => {
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
	initOnlinePlayerTips();
	initXinshaPlayerTips();

	if ("connect" !== get.mode()) {
		u();
		(() => {
			let e = null;
			let t = null;
			const a = () => {
				if (!_status.gameStarted || !game.players) return;
				if (["onlineUI", "othersOff"].includes(lib.config.extension_十周年UI_newDecadeStyle)) {
					e && (p(e, "playertip"), (e = null));
					t && (p(t, "playertipQP"), (t = null));
					return;
				}
				const a = _status.currentPhase;
				if (a && a !== game.me && a.isPhaseUsing?.()) {
					if (e !== a) {
						e && p(e, "playertip");
						e = a;
						!a.getElementsByClassName("playertip")[0] && a.appendChild(h("playertip", l() ? "tip.png" : "phasetip.png"));
					}
				} else {
					e && (p(e, "playertip"), (e = null));
				}

				const event = _status.event;
				if ("phaseDiscard" === event?.name && event.player !== game.me) {
					if (t !== event.player) {
						t && p(t, "playertipQP");
						t = event.player;
						!event.player.getElementsByClassName("playertipQP")[0] && event.player.appendChild(h("playertipQP", l() ? "tipQP.png" : "discardtip.png"));
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
				if (lib.config.extension_十周年UI_newDecadeStyle === "onlineUI") return;
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
