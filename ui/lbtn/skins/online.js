/**
 * @fileoverview OL风格lbtn插件
 * 特点：OL风格菜单、身份任务、礼物系统、历史记录、计时器
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";
import { attachOnlineRecastButton, initOnlineActionButtons, syncOnlineActionButtons } from "../../../src/ui/online-action-buttons.js";
import { installOnlineProps } from "../../../src/ui/online-props.js";

export function createOnlineLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	//为元素添加点击缩放效果
	function addScaleEffect(el, scale = 0.85) {
		el.style.transition = "transform 0.1s ease";
		el.style.cursor = "pointer";
		const shrink = () => {
			el.style.transform = `scale(${scale})`;
		};
		const restore = () => {
			el.style.transform = "scale(1)";
		};
		el.addEventListener("mousedown", shrink);
		el.addEventListener("touchstart", shrink, { passive: true });
		el.addEventListener("mouseup", restore);
		el.addEventListener("touchend", restore);
		el.addEventListener("mouseleave", restore);
	}

	// 身份颜色配置
	const IDENTITY_COLORS = {
		unknown: "#FFFFDE",
		wei: "#0075FF",
		shu: "#FF0000",
		wu: "#00FF00",
		qun: "#FFFF00",
		jin: "#9E00FF",
		ye: "#9E00FF",
		key: "#9E00FF",
	};

	const IDENTITY_INFO = {
		zhu: { label: "主", color: "#FA4A22", aliases: ["zhu", "rZhu", "bZhu"] },
		zhong: { label: "忠", color: "#FFE258", aliases: ["zhong", "rZhong", "bZhong", "mingzhong"] },
		fan: { label: "反", color: "#9FF371", aliases: ["fan", "rYe", "bYe"] },
		nei: { label: "内", color: "#A87AFB", aliases: ["nei", "rNei", "bNei"] },
	};

	// 模式配置
	const MODE_CONFIGS = {
		single: { zhu: "击败对手", fan: "击败对手", undefined: "未选择阵营" },
		boss: { zhu: "击败盟军", cai: "击败神祇", undefined: "未选择阵营" },
		doudizhu: { zhu: "击败所有农民", fan: "击败地主" },
		identity: {
			zhu: "击败反贼和内奸",
			zhong: "保护主公，击败反贼内奸",
			fan: "击败主公",
			nei: "击败所有角色最后击败主公",
			mingzhong: "保护主公，击败反贼内奸",
			undefined: "胜利目标未知",
		},
		versus: {
			undefined: "击败所有敌方",
		},
	};

	// 工具函数
	const formatTime = seconds => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds - h * 3600) / 60);
		const s = seconds - h * 3600 - m * 60;
		const hStr = h > 0 ? `${h < 10 ? "0" : ""}${h}:` : "";
		return `${hStr}${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
	};

	const getCurrentMode = () => get.mode() ?? lib.config.mode;

	return {
		...base,
		skinName: "online",

		content(next) {
			lib.skill._uicardupdate = {
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				unique: true,
				popup: false,
				silent: true,
				noLose: true,
				noGain: true,
				noDeprive: true,
				priority: -Infinity,
				filter: (event, player) => player === game.me,
				content() {
					ui.updateSkillControl?.(game.me, true);
				},
			};
		},

		precontent() {
			base.initBaseRewrites.call(this);
			this.initChatMessage();
			this.initCancelOverride();
			this.initPauseOverride();
			this.initConfirmRewrite();
			this.initArenaReady();
		},

		// 初始化聊天消息处理
		initChatMessage() {
			const originalChat = lib.message.server.chat;
			lib.message.server.chat = function (id, str) {
				if (str.slice(0, 6) === "/audio") {
					game.broadcastAll(url => {
						if (lib.config.background_speak) game.playAudio(url);
					}, str.slice(6));
				} else {
					originalChat.call(this, id, str);
				}
			};
		},

		// 拦截出牌阶段取消
		initCancelOverride() {
			const originalCancel = ui.click.cancel;
			ui.click.cancel = function (node) {
				const event = _status.event;
				if (event && event.type === "phase" && ui.confirm && !event.skill && (ui.selected.cards.length !== 0 || ui.selected.targets.length !== 0)) {
					ui.confirm.classList.add("removing");
					event.restore();
					const cards = event.player.getCards("hej");
					for (let i = 0; i < cards.length; i++) {
						cards[i].recheck("useSkill");
					}
					game.uncheck();
					game.check();
					return;
				}
				return originalCancel.call(this, node);
			};
		},

		// 初始化暂停覆盖
		initPauseOverride() {
			const self = this;

			ui.create.pause = function () {
				if (_status.pausing) return;
				ui.click.shortcut(false);
				const node = ui.create.div(".pausedbg", ui.window);
				node.style.backgroundColor = "rgba(0,0,0,0.5)";
				node.style.backgroundSize = "100% 100%";
				ui.create.div(".resumedbg", node).style.backgroundSize = "100% 100%";
				_status.pausing = true;
				setTimeout(() => {
					_status.pausing = false;
				}, 500);
				if (lib.config.touchscreen) {
					setTimeout(() => node.addEventListener("touchend", ui.click.resume), 500);
				} else {
					node.addEventListener("click", ui.click.resume);
					node.oncontextmenu = ui.click.resume;
				}
				return node;
			};

			ui.click.pause = function () {
				if (!_status.video && (!ui.pause || ui.pause.classList.contains("hidden"))) return;
				self.openHistoryPanel();
			};
		},

		openHistoryPanel() {
			if (_status.paused2 || _status.pausing || _status.nopause || (!_status.video && !_status.gameStarted)) return;
			ui.system.hide();
			game.pause2();
			this.showHistoryPanel();
		},

		// 初始化确认按钮覆写
		initConfirmRewrite() {
			const self = this;
			const observeConfirm = initOnlineActionButtons();
			ui.create.confirm = function (str, func) {
				if (ui.confirm?.classList.contains("closing")) {
					ui.confirm.remove();
					ui.controls.remove(ui.confirm);
					ui.confirm = null;
				}

				if (!ui.confirm) {
					ui.confirm = self.create.confirm();
					observeConfirm(ui.confirm);
				}

				const confirm = ui.confirm;
				confirm.node.ok.classList.add("disabled");
				confirm.node.cancel.classList.add("disabled");

				if (_status.event.endButton) {
					confirm.node.cancel.classList.remove("disabled");
				}

				if (str) {
					if (str.includes("o")) confirm.node.ok.classList.remove("disabled");
					if (str.includes("c")) confirm.node.cancel.classList.remove("disabled");
					confirm.str = str;
				}

				if (func) {
					confirm.custom = func;
				} else {
					confirm.custom = (link, target) => {
						if (link === "ok") ui.click.ok(target);
						else if (link === "cancel") ui.click.cancel(target);
						else target.custom?.(link);
					};
				}

				ui.updatec();
				confirm.update?.();
			};
		},

		// 显示历史记录面板
		showHistoryPanel() {
			const node = ui.create.pause();
			if (!node) return;
			node.addTempClass("start");

			const bigbg = ui.create.div(".bigbgjilu", node);
			const historybg = ui.create.div(".historybg", node);
			const columnbox = ui.create.div(".content", bigbg);

			// 克隆侧边栏
			const clonedSidebar = ui.sidebar.cloneNode(false);
			Array.from(ui.sidebar.childNodes)
				.reverse()
				.forEach(child => {
					clonedSidebar.appendChild(child.cloneNode(true));
				});
			clonedSidebar.querySelectorAll(":scope > *").forEach(el => {
				el.style.display = "block";
			});

			// 获取玩家列表
			const playerList = [...game.players, ...game.dead].sort((a, b) => a.getSeatNum() - b.getSeatNum());

			// 全部按钮
			const allBg = ui.create.div(".namebg", columnbox);
			const allBgBg = ui.create.div(".namebgbg", allBg);
			const allBtn = ui.create.div(".jiluanniu", allBg, e => {
				e.stopPropagation();
				document.querySelectorAll(".gou").forEach(g => g.remove());
				ui.create.div(".gou", allBtn);
				clonedSidebar.querySelectorAll(":scope > *").forEach(el => {
					el.style.display = "block";
				});
				if (clonedSidebar.scrollHeight > clonedSidebar.offsetHeight) {
					clonedSidebar.scrollTop = clonedSidebar.scrollHeight - clonedSidebar.clientHeight;
				}
			});
			ui.create.div(".gou", allBtn);
			ui.create.div(".name", "全部", allBgBg, allBtn.onclick);

			// 玩家按钮
			playerList.forEach(player => {
				const namebg = ui.create.div(".namebg", columnbox);
				if (game.dead.includes(player)) namebg.style.filter = "grayscale(0%)";
				const namebgbg = ui.create.div(".namebgbg", namebg);
				const prefixName = get.slimNameHorizontal(player.name);
				const seatNum = player.getSeatNum();
				const seatText = `(${seatNum === 2 ? "二" : get.cnNumber(seatNum)}号位)`;

				const filterByPlayer = e => {
					e.stopPropagation();
					document.querySelectorAll(".gou").forEach(g => g.remove());
					ui.create.div(".gou", btn);
					const names = [player.name, player.name1, player.name2]
						.filter((v, i, a) => v && a.indexOf(v) === i)
						.map(n => get.translation(n))
						.filter(n => n.length > 0);
					let hasEmpty = false;
					clonedSidebar.querySelectorAll(":scope > *").forEach(el => {
						const text = el.innerText || el.textContent || "";
						if (!text.trim()) {
							el.style.display = hasEmpty ? "none" : "block";
							hasEmpty = true;
							return;
						}
						hasEmpty = false;
						el.style.display = names.some(n => text.includes(n)) ? "block" : "none";
					});
					if (clonedSidebar.scrollHeight > clonedSidebar.offsetHeight) {
						clonedSidebar.scrollTop = clonedSidebar.scrollHeight - clonedSidebar.clientHeight;
					}
				};
				ui.create.div(".name", prefixName + seatText, namebgbg, filterByPlayer);
				const btn = ui.create.div(".jiluanniu", namebg, filterByPlayer);
			});

			historybg.appendChild(clonedSidebar);
			ui.historybar.classList.add("paused");
			ui.arena.classList.add("paused");
			ui.window.classList.add("touchinfohidden");
			ui.time.hide();
			game.onpause?.();
			if (clonedSidebar.scrollHeight > clonedSidebar.offsetHeight) {
				clonedSidebar.scrollTop = clonedSidebar.scrollHeight - clonedSidebar.clientHeight;
			}
		},

		initArenaReady() {
			const self = this;
			lib.arenaReady.push(() => {
				self.initAutoNode();
				self.initIdentityShow();
				self.createMenuButton();
				self.createBottomButtons();
				self.createTimeNode();
			});
		},

		// OL Pvi：普通托管只显示取消按钮，保留本体 auto 监听。
		initAutoNode() {
			if (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI" || !ui.autonode) return;
			const cancel = ui.autonode.lastElementChild;
			if (!cancel || cancel.classList.contains("online-auto-cancel")) return;
			cancel.classList.add("online-auto-cancel");
			cancel.textContent = "取消托管";
			cancel.setAttribute("role", "button");
			cancel.tabIndex = 0;
			cancel.addEventListener("keydown", event => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				if (ui.arena.classList.contains("auto")) ui.click.auto();
			});
		},

		// 初始化身份显示
		initIdentityShow() {
			const self = this;
			// 设置胜利条件翻译
			const mode = getCurrentMode();
			if (mode === "guozhan") {
				lib.translate["undefined_win_option"] = "未选择势力";
				lib.translate["unknown_win_option"] = "保持隐蔽";
				lib.translate["ye_win_option"] = "击败场上所有其他角色";
				lib.group.forEach(g => {
					lib.translate[`${g}_win_option`] = `击败所有非${get.translation(g)}势力角色`;
				});
			} else {
				Object.entries(MODE_CONFIGS[mode] ?? {}).forEach(([k, v]) => {
					lib.translate[`${k}_win_option`] = v;
				});
			}

			if (!ui.identityShow) {
				ui.identityShow = ui.create.div(".identityShow", ui.window);
				ui.create.div(".online-identity-count", ui.identityShow);
				ui.create.div(".online-identity-goal", ui.identityShow);
				ui.create.div(".jiluButton", "牌局记录", ui.identityShow, () => self.openHistoryPanel());
			}
			ui.identityShow_update = () => self.updateIdentityShow();
			ui.identityShow_update();
			setInterval(() => ui.identityShow_update?.(), 1000);
		},

		// 更新身份显示
		updateIdentityShow() {
			// 更新玩家昵称
			game.countPlayer(player => {
				if (!player.nickname) {
					const nicknames = ["缘之空", "小小恐龙", "自然萌", "海边的ebao", "小云云", "点点", "猫猫虫", "小爱莉", "冰佬", "鹿鹿", "黎佬", "浮牢师", "U佬", "蓝宝", "影宝", "柳下跖", "无语", "小曦", "墨渊", "k9", "扶苏", "皇叔", "龙哥", "🦅🦅🦅"];
					player.nickname = player === game.me ? lib.config.connect_nickname : nicknames.randomGet();
				}
			});

			let counts = "";
			const mode = getCurrentMode();
			const versusMode = mode === "versus" ? (_status.mode ?? (_status.connectMode ? lib.configOL.versus_mode : get.config("versus_mode", mode))) : null;
			const isHappy2v2 = versusMode === "two" || versusMode === "2v2";
			if (mode === "guozhan" || ["siguo", "jiange"].includes(versusMode)) {
				Object.entries(IDENTITY_COLORS).forEach(([key, color]) => {
					const count = game.countPlayer(p => p.identity === key);
					if (count > 0) counts += `<span style="color:${color}">${get.translation(key)}${count}</span> `;
				});
			} else if (mode !== "doudizhu" && !isHappy2v2) {
				Object.values(IDENTITY_INFO).forEach(({ label, color, aliases }) => {
					const count = game.countPlayer(p => aliases.includes(p.identity));
					if (mode === "identity" || count > 0) counts += `<span style="color:${color}">${label}</span>${count}`;
				});
			}
			const countNode = ui.identityShow.querySelector(".online-identity-count");
			countNode.innerHTML = counts;
			countNode.hidden = !counts;

			const identity = game.me?.identity;
			let goal = "";
			if (mode === "doudizhu") goal = MODE_CONFIGS.doudizhu[identity];
			else if (isHappy2v2) goal = MODE_CONFIGS.versus.undefined;
			else if (game.me) goal = lib.translate[identity + "_win_option"];
			ui.identityShow.querySelector(".online-identity-goal").textContent = goal || "消灭所有敌方";
		},

		// 创建菜单按钮
		createMenuButton() {
			const self = this;

			ui.caidanbutton = ui.create.div(".ui.caidanbutton", ui.window);
			// 通用缩放效果（长按需额外覆盖）
			addScaleEffect(ui.caidanbutton, 0.85);

			let pressTimer = null;
			let isLongPress = false;

			const startPress = e => {
				e.preventDefault();
				isLongPress = false;
				pressTimer = setTimeout(() => {
					isLongPress = true;
				}, 500);
			};

			const endPress = e => {
				e.preventDefault();
				if (pressTimer) {
					clearTimeout(pressTimer);
					pressTimer = null;
				}
				if (!isLongPress) {
					self.openMenu();
				}
			};

			ui.caidanbutton.addEventListener("mousedown", startPress);
			ui.caidanbutton.addEventListener("touchstart", startPress, { passive: false });
			ui.caidanbutton.addEventListener("mouseup", endPress);
			ui.caidanbutton.addEventListener("touchend", endPress);
			ui.caidanbutton.onclick = null;
		},

		// 独立的菜单创建函数，供短按调用
		openMenu() {
			const self = this;
			const container = ui.create.div(".popup-container.online-game-menu", ui.window);
			const home = ui.create.div(".caidanopen", container);

			// 定义直接关闭
			const immediateClose = () => {
				if (container.parentNode) container.remove();
			};

			// 通用按钮创建（带点击缩放，默认关闭）
			const createMenuItem = (label, skin, width, height, onClickHandler, close = true) => {
				const btn = ui.create.div(".controls.online-game-menu-item", home);
				btn.setAttribute("aria-label", label);
				btn.setBackgroundImage(`${assetPath}OL_line/uibutton/${skin}.png`);
				btn.style.backgroundSize = `${width * 2 / 3}px ${height * 2 / 3}px`;

				btn.addEventListener("click", e => {
					e.stopPropagation();
					btn.style.transform = "scale(0.9)";
					setTimeout(() => {
						btn.style.transform = "scale(1)";
						onClickHandler?.();
						if (close) immediateClose();
					}, 100);
				});
				return btn;
			};

			// 设置
			createMenuItem("设置", "shezhi", 120, 41, () => {
				game.closePopped?.();
				game.pause2?.();
				ui.click.configMenu?.();
				ui.system1?.classList.remove("shown");
				ui.system2?.classList.remove("shown");
			});
			// 背景
			createMenuItem("背景", "beijing", 122, 38, () => {
				self.openBackgroundSelector();
			});
			// 托管按钮（不关闭菜单，缩放动画，点击切换图标）
			const getAutoState = () => game.me?.isAuto?.() ?? _status.auto ?? false;
			const tuoguanBtn = createMenuItem("托管", "tool_trusteeship_0", 120, 41, () => {
				ui.click.auto();
				updateTuoGuanIcon();
			}, false);
			const updateTuoGuanIcon = () => {
				const isAuto = getAutoState();
				tuoguanBtn.setAttribute("aria-label", isAuto ? "取消托管" : "托管");
				tuoguanBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/tool_trusteeship_0${isAuto ? "_cancel" : ""}.png`);
			};
			updateTuoGuanIcon();

			if (ui.giveup && !ui.giveup.classList.contains("hidden")) {
				createMenuItem("投降", "touxiang", 120, 41, () => {
					ui.giveup?.dispatchEvent(new Event(lib.config.touchscreen ? "touchend" : "click"));
				});
			}
			createMenuItem("反馈", "btn_feedback_0", 122, 36, () => {
				const feedback = Object.values(game.system || {}).find(item => item.name === "反馈" && item.click);
				if (feedback) feedback.click();
				else alert("当前对局未配置反馈入口。");
			});
			// 离开
			createMenuItem("离开", "likai", 120, 41, () => {
				window.location.reload();
			});

			// 动态系统菜单项
			self.addSystemMenuItems(home, immediateClose);

			// 动画初始化
			const items = Array.from(home.children).filter(el => el.classList.contains("controls"));
			items.forEach(item => {
				item.style.transform = "translateX(100px)";
				item.style.opacity = "0";
				item.style.transition = "transform 0.3s ease, opacity 0.3s ease";
				item.style.transitionDelay = "0s";
			});
			requestAnimationFrame(() => {
				items.forEach((item, index) => {
					item.style.transitionDelay = `${index * 0.05}s`;
					item.style.transform = "translateX(0)";
					item.style.opacity = "1";
				});
			});

			// 带动画关闭（背景/空白）
			const closeMenu = () => {
				items.forEach((item, index) => {
					item.style.transitionDelay = `${(items.length - 1 - index) * 0.05}s`;
					item.style.transform = "translateX(100px)";
					item.style.opacity = "0";
				});
				const totalDelay = (items.length - 1) * 0.05 + 0.3;
				setTimeout(() => {
					if (container.parentNode) container.remove();
				}, totalDelay * 1000);
			};

			container.addEventListener("click", e => {
				if (e.target === container) {
					e.stopPropagation();
					closeMenu();
				}
			});
			home.addEventListener("click", e => {
				if (!e.target.closest(".controls")) {
					closeMenu();
				}
			});
		},

		// 添加系统菜单项
		addSystemMenuItems(home, immediateClose) {
			const excludedItems = ["聊天", "联机大厅", "最近连接", "投降", "重来", "选项", "暂停", "不询问无懈", "托管", "反馈", "♫", "整理手牌", "收藏", "牌堆"];
			for (let i in game.system) {
				if (excludedItems.includes(game.system[i].name)) continue;
				const node = ui.create.div(".controls.online-game-menu-extra", game.system[i].name, home);
				node.style.transition = "transform 0.1s ease"; // 缩放动画准备
				if (game.system[i].click) {
					node.addEventListener("click", e => {
						e.stopPropagation();
						node.style.transform = "scale(0.85)";
						setTimeout(() => {
							node.style.transform = "scale(1)";
							game.system[i].click();
							if (immediateClose) immediateClose();
						}, 100);
					});
				}
			}
		},

		// 创建底部按钮
		createBottomButtons() {
			const self = this;
			installOnlineProps();
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			ui.anniubuttons = ui.create.div(isRight ? ".leftbuttons" : ".rightbuttons", ui.window);

			// 礼物按钮
			const giftBtn = ui.create.div(".anniubutton", ui.anniubuttons);
			giftBtn.dataset.onlinePropButton = "true";
			giftBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/gameview_tool_btn_prop.png`);
			addScaleEffect(giftBtn);
			giftBtn.listen(event => {
				event.preventDefault();
				event.stopPropagation();
				self.showGiftPanel();
			});

			// 聊天按钮
			const talkBtn = ui.create.div(".anniubutton", ui.anniubuttons);
			talkBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/gameview_tool_btn_chat.png`);
			addScaleEffect(talkBtn);
			talkBtn.onclick = () => {
				self.showTalkPanel();
			};

			// 排序按钮
			const sortBtn = ui.create.div(".anniubutton", ui.anniubuttons);
			sortBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/gameview_tool_btn_sort.png`);
			addScaleEffect(sortBtn);
			sortBtn.onclick = () => {
				self.sortHandCards();
			};
		},

		// 创建计时器节点
		createTimeNode() {
			if (ui.cardRoundTimeNode) ui.cardRoundTimeNode.remove();
			ui.cardRoundTimeNode = ui.create.div(".cardRoundNumber", ui.window);
			const cardPileNode = ui.create.div(".cardPileNumber", ui.cardRoundTimeNode);
			const cardCount = ui.create.div(".online-card-count", cardPileNode);
			const roundNode = ui.create.div(".roundNumber", ui.cardRoundTimeNode);
			ui.timeNode = ui.create.div(".time", ui.cardRoundTimeNode);

			lib.config.show_time3 = false;
			lib.config.show_time2 = false;
			lib.config.show_cardpile_number = false;

			game.updateRoundNum = () => {
				const num = Math.max(1, game.roundNumber || 1);
				roundNode.textContent = `第${num > 10 ? num : get.cnNumber(num, true)}轮`;
				ui.cardRoundTimeNode.style.display = "block";
			};

			game.updateCardNum = (num, step) => {
				clearTimeout(cardPileNode.interval);
				if (cardPileNode._num == null) {
					cardPileNode._num = num;
				} else if (cardPileNode._num !== num) {
					if (!step) step = 500 / Math.abs(cardPileNode._num - num);
					cardPileNode._num += cardPileNode._num > num ? -1 : 1;
					if (cardPileNode._num !== num) {
						cardPileNode.interval = setTimeout(() => game.updateCardNum(num, step), step);
					}
				}
				cardCount.textContent = cardPileNode._num;
			};

			// 时间更新
			const updateTime = () => {
				if (!ui.timeNode.starttime) ui.timeNode.starttime = get.utc();
				const num = Math.round((get.utc() - ui.timeNode.starttime) / 1000);
				ui.timeNode.textContent = formatTime(num);
			};
			updateTime();
			setInterval(updateTime, 1000);

			// 覆写轮数更新
			const originUpdate = game.updateRoundNumber;
			game.updateRoundNumber = function () {
				originUpdate.apply(this, arguments);
				const cardNumber = ui.cardPile.childNodes.length || 0;
				game.broadcastAll(num => {
					game.updateCardNum?.(num);
					game.updateRoundNum?.();
				}, cardNumber);
			};

			// 隐藏原始元素
			setTimeout(() => {
				document.querySelectorAll(".touchinfo.left, .touchinfo.right, .time, .cardPileNumber").forEach(node => {
					if (!ui.cardRoundTimeNode?.contains(node)) node.style.display = "none";
				});
			}, 1000);

			game.updateCardNum?.(0);
			game.updateRoundNum?.();
		},

		// 显示礼物面板
		showGiftPanel() {
			installOnlineProps().show();
		},

		// 显示聊天面板
		showTalkPanel() {
			if (!game.me) return;
			const self = this;
			let shuru = null;

			const container = ui.create.div(".popup-container", ui.window, e => {
				if (e.target === container) {
					container.hide();
					if (shuru) {
						shuru.value = "";
						shuru.style.display = "none";
					}
				}
			});
			const bg = ui.create.div(".talkbg", container);
			const typechanges = ui.create.div(".typechanges", bg);
			const rightbg = ui.create.div(".talkrightbg", bg);

			const tabs = [
				{ name: "快捷", click: () => self.createQuickMessages(rightbg) },
				{ name: "表情", click: () => self.createEmotionPanel(rightbg) },
				{ name: "消息", click: () => self.createHistoryMessages(rightbg) },
			];

			let activeBtn = null;
			tabs.forEach((tab, i) => {
				const btn = ui.create.div(".typechange", tab.name, typechanges);
				btn.onclick = () => {
					if (activeBtn) activeBtn.classList.remove("typechangelight");
					btn.classList.add("typechangelight");
					activeBtn = btn;
					while (rightbg.firstChild) rightbg.removeChild(rightbg.firstChild);
					tab.click();
				};
				if (i === 0) {
					btn.click();
					activeBtn = btn;
				}
			});

			// 打字按钮
			const dazi = ui.create.div(".dazi", "打字", bg);
			dazi.addEventListener("click", e => {
				e.stopPropagation();
				if (!shuru) {
					shuru = document.createElement("input");
					shuru.type = "text";
					shuru.placeholder = "请输入要说的话";
					shuru.style.cssText = "position:absolute;left:50%;transform:translateX(-50%);z-index:1000;top:5%;width:60%;height:10%;font-size:30px;background-color:rgba(255,255,255,0.9);border:2px solid #C1AD92;border-radius:5px;padding:5px;outline:none;pointer-events:auto;";
					ui.window.appendChild(shuru);
				}
				shuru.style.display = "block";
				shuru.focus();
			});

			document.addEventListener("keydown", e => {
				if (shuru?.style.display === "block" && e.key === "Enter") {
					const value = shuru.value.trim();
					if (value) {
						if (game.online) game.send("chat", game.onlineID, value);
						else game.me.chat(value);
						while (rightbg.firstChild) rightbg.removeChild(rightbg.firstChild);
						self.createHistoryMessages(rightbg);
					}
					shuru.value = "";
					shuru.style.display = "none";
				}
			});
		},

		// 创建快捷消息
		createQuickMessages(container) {
			let skills = game.me.getSkills(null, false, false).filter(s => {
				const info = get.info(s);
				return !info?.charlotte;
			});
			// 添加衍生技能
			skills.forEach(skill => {
				const info = get.info(skill);
				if (info?.derivation) {
					const derivations = Array.isArray(info.derivation) ? info.derivation : [info.derivation];
					skills.push(...derivations);
				}
			});
			skills = [...new Set(skills)];

			skills.forEach(name => {
				if (!get.info(name)) return;
				const textList = game.parseSkillText(name, game.me.name);
				const audioList = game.parseSkillAudio(name, game.me.name);
				textList.forEach((text, i) => {
					ui.create.div(".talkquick", `[${get.skillTranslation(name)}]${text}`, container, () => {
						let actualPath = audioList[i].startsWith("ext:") ? `../extension/${audioList[i].slice(4)}` : `../audio/${audioList[i]}`;
						if (game.online) {
							game.send("chat", game.onlineID, text);
							game.send("chat", game.onlineID, `/audio${actualPath}`);
						} else {
							game.me.chat(text);
							game.broadcastAll(path => {
								if (lib.config.background_speak) game.playAudio(path);
							}, actualPath);
						}
					});
				});
			});

			lib.quickVoice?.forEach(chat => {
				ui.create.div(".talkquick", chat, container, () => {
					if (game.online) game.send("chat", game.onlineID, chat);
					else game.me.chat(chat);
				});
			});
		},

		// 创建表情面板
		createEmotionPanel(container) {
			const gridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridGap: "5px", width: "max-content", margin: "0 auto" };
			const list1 = ui.create.div(".emotionbg", container);
			Object.assign(list1.style, gridStyle);
			const list2 = ui.create.div(".emotionbg", container);
			Object.assign(list2.style, gridStyle);
			list2.style.display = "none";

			const srcBase = `${lib.assetURL}image/emotion/`;
			game.getFileList(
				srcBase,
				folders => {
					folders
						.filter(pack => pack !== "throw_emotion")
						.forEach(pack => {
							const packDiv = ui.create.div(".card.fullskin", `<img src="${srcBase}${pack}/1.gif" width="80" height="80">`, list1, () => {
								list2.innerHTML = "";
								game.getFileList(
									`${srcBase}${pack}/`,
									(_, files) => {
										files.forEach(file => {
											const btn = ui.create.div(".card.fullskin", `<img src="${srcBase}${pack}/${file}" width="80" height="80">`, list2, () => {
												if (game.online) game.send("emotion", game.onlineID, pack, file);
												else game.me.emotion(pack, file);
											});
											btn.style.cssText = "width:80px;height:80px;";
										});
									},
									() => {}
								);
								list1.style.display = "none";
								list2.style.display = "grid";
							});
							packDiv.style.cssText = "width:80px;height:80px;";
						});
				},
				() => {}
			);
		},

		// 创建历史消息
		createHistoryMessages(container) {
			lib.chatHistory?.forEach(chat => {
				let displayName = (chat[0] || "").replace(/\[undefined\]/g, "");
				const content = `<span style="color:rgb(220,170,50);">${displayName}：</span><br>${chat[1]}`;
				ui.create.div(".talkhistory", content, container);
			});
			container.scrollTop = container.scrollHeight;
		},

		// 排序手牌
		sortHandCards() {
			if (!game.me || game.me.hasSkillTag("noSortCard")) return;
			const cards = game.me.getCards("hs");
			const sort2 = (b, a) => {
				if (a.name !== b.name) return lib.sort.card(a.name, b.name);
				else if (a.suit !== b.suit) return lib.suit.indexOf(a) - lib.suit.indexOf(b);
				else return a.number - b.number;
			};
			if (cards.length > 1) {
				cards.sort(sort2);
				cards.forEach((card, j) => {
					game.me.node.handcards1.insertBefore(cards[j], game.me.node.handcards1.firstChild);
				});
				decadeUI?.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
			}
		},

		create: {
			control() {},

			confirm() {
				const confirm = ui.create.control("<span>确定</span>", "cancel");
				confirm.classList.add("lbtn-confirm");
				confirm.node = {
					ok: confirm.firstChild,
					cancel: confirm.lastChild,
				};
				if (_status.event.endButton) _status.event.endButton.close();
				confirm.node.ok.link = "ok";
				confirm.node.ok.classList.add("primary");
				confirm.node.cancel.classList.add("primary2");
				confirm.custom = (link, target) => {
					if (link === "ok") ui.click.ok(target);
					else if (link === "cancel") ui.click.cancel(target);
					else if (target.custom) target.custom(link);
				};

				// 设置事件监听
				for (const k in confirm.node) {
					confirm.node[k].classList.add("disabled");
					confirm.node[k].removeEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
					confirm.node[k].addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
						e.stopPropagation();
						if (this.classList.contains("disabled")) {
							if (this.link === "cancel" && this.dataset.type === "endButton" && _status.event.endButton) {
								_status.event.endButton.custom();
								ui.confirm.close();
							}
							return;
						}
						if (this.parentNode.custom) this.parentNode.custom(this.link, this);
					});
				}

				// 设置skills2
				attachOnlineRecastButton(confirm);
				if (ui.skills2?.skills.length) {
					confirm.skills2 = [];
					ui.skills2.skills.forEach(skill => {
						const item = document.createElement("div");
						item.link = skill;
						item.innerHTML = get.translation(skill);
						item.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
							e.stopPropagation();
							ui.click.skill(this.link);
						});
						item.dataset.type = "skill2";
						if (ui.updateSkillControl) ui.updateSkillControl(game.me, true);
					});
				}

				confirm.update = function () {
					syncOnlineActionButtons();
					if (confirm.skills2) {
						if (_status.event.skill && _status.event.skill !== confirm.dataset.skill) {
							confirm.dataset.skill = _status.event.skill;
							confirm.skills2.forEach(item => item.remove());
							ui.updatec();
						} else if (!_status.event.skill && confirm.dataset.skill) {
							delete confirm.dataset.skill;
							confirm.skills2.forEach(item => confirm.insertBefore(item, confirm.firstChild));
							ui.updatec();
						}
					}
					if (ui.updateSkillControl) ui.updateSkillControl(game.me, true);
				};

				return confirm;
			},

			cardRoundTime() {
				return base.create.cardRoundTime();
			},

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
				ui.create.div(".settingButton", ui.arena);
				ui.create.div(".tuoguanButton", ui.arena, ui.click.auto);

				const className = isRight ? ".handcardNumber" : ".handcardNumber1";
				const node = ui.create.div(className, ui.arena).hide();
				node.node = {
					cardPicture: ui.create.div(".cardPicture", node),
					cardNumber: ui.create.div(".cardNumber", node),
				};

				node.updateCardnumber = function () {
					if (!game.me) return;
					const current = game.me.countCards("h") || 0;
					const limit = game.me.getHandcardLimit() || 0;
					const color = current > limit ? "red" : "white";
					const displayLimit = limit === Infinity ? "∞" : limit;
					this.node.cardNumber.innerHTML = `<span><font color="${color}">${current}</font><sp style="font-size:15px;font-family:yuanli;color:#FFFCF5;">/</sp>${displayLimit}</span>`;
					this.show();
					game.addVideo("updateCardnumber", null, { cardNumber: limit });
				};

				node.node.cardNumber.interval = setInterval(() => ui.handcardNumber?.updateCardnumber(), 1000);
				game.addVideo("createhandcardNumber");
				return node;
			},
		},
	};
}
