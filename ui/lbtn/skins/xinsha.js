/**
 * @fileoverview 一将成名风格lbtn插件
 * 使用官方贴图、设计坐标与现有无名杀交互
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";
import { createXinshaBackgroundSelector } from "./xinsha-background-selector.js";
import { installXinshaProps } from "../../../src/ui/xinsha-props.js";
import { initXinshaActionButtons, syncXinshaActionButtons } from "../../../src/ui/xinsha-action-buttons.js";
import { initXinshaButtonInput } from "../../../src/ui/xinsha-button-input.js";
import { installXinshaRecord } from "../../../src/ui/xinsha-record.js";

export function updateXinshaHandCount() {
	if (!game.me) return;
	const current = game.me.countCards("h") || 0, limit = Math.max(0, game.me.getHandcardLimit() || 0);
	const displayLimit = limit === Infinity ? "∞" : limit;
	// SelfSeatView.updateCardNum：当前张数米白色，上限红色。
	this.node.cardNumber.innerHTML = `<span>${current}/<font color="#FF3500">${displayLimit}</font></span>`;
	this.show();
	game.addVideo("updateCardnumber", null, { cardNumber: limit });
}

export function createXinshaLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const backgrounds = createXinshaBackgroundSelector(lib, game, ui, get, _status);

	return {
		...base,
		skinName: "xinsha",

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
			this.recordPanel = installXinshaRecord({ lib, game, ui, get, status: _status });
			initXinshaActionButtons();
			initXinshaButtonInput();
			this.initTempNoWuxieButton();
			this.initArenaReady();
			this.initSelectAllOverride();
		},

		initTempNoWuxieButton() {
			const createControl = ui.create.control;
			ui.create.control = function (...args) {
				const control = createControl.apply(this, args);
				// 原版没有本体的独立 AI 代选按钮；一将样式的所有选牌场景统一屏蔽，保留原生关闭流程。
				if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && Array.from(control.children).some(node => node.link === "AI代选")) {
					control.classList.add("yjcm-ai-select");
				}
				// 本体在复用确认栏时会重建独立的结束回合控件；原版将它与取消互斥显示。
				if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && _status.event?.name === "chooseToUse" && _status.event.type === "phase" && control.stayleft && control.firstChild?.link === "结束回合") {
					control.classList.add("yjcm-end-turn");
				}
				// 按本体回调识别控件，保留 link、_origin、glow 和关闭流程。
				if (lib.config.extension_十周年UI_newDecadeStyle === "othersOff" && control.custom === ui.click.tempnowuxie) {
					control.classList.add("yjcm-tempnowuxie");
					control.firstChild.textContent = "本轮不出";
				}
				return control;
			};
		},

		initArenaReady() {
			const self = this;
			lib.arenaReady.push(() => {
				self.initOfficialLayout();
				self.initRoundUpdate();
				backgrounds.restore();
				if (_status.connectMode) lib.hooks.gameStart.add(backgrounds.restore);

				// 问号按钮
				if (self.supportedModes.includes(lib.config.mode)) {
					self.createQuestionButton();
				}

				// 整理手牌按钮
				self.createSortButton();
				self.createSelectAllButton();

				// 右上角菜单
				self.createTopRightMenu();
				self.createChatButtons();
			});
		},

		initOfficialLayout() {
			const update = () => {
				const unit = Math.min(ui.window.clientWidth / 1334, ui.window.clientHeight / 750);
				// display.getScreenBangsWidth_：Windows 固定60；未知宽屏手机默认60。
				const safeWidth = !lib.device || ui.window.clientWidth / ui.window.clientHeight > 1.86 ? 60 : 0;
				const sceneWidth = Math.max(1334, Math.min(1750, ui.window.clientWidth / unit - safeWidth * 2));
				const insetX = (ui.window.clientWidth - sceneWidth * unit) / 2;
				const insetY = Math.max(0, (ui.window.clientHeight - 750 * unit) / 2);
				ui.window.style.setProperty("--yjcm-unit", `${unit}px`);
				ui.window.style.setProperty("--yjcm-window-width", `${ui.window.clientWidth}px`);
				document.body.style.setProperty("--yjcm-unit", `${unit}px`);
				// 采用参考图中 LuckCardView 的582宽条，横向乘ui.factorX(1)=USE_WIDTH/1334。
				document.body.style.setProperty("--yjcm-progress-width", `${582 * sceneWidth / 1334 * unit}px`);
				ui.window.style.setProperty("--yjcm-scene-x", `${insetX}px`);
				ui.window.style.setProperty("--yjcm-scene-y", `${insetY}px`);
				// arena 有内缩，官方锚点按完整游戏窗口换算，不能直接套 arena 百分比。
				const windowRect = ui.window.getBoundingClientRect();
				const arenaRect = ui.arena.getBoundingClientRect();
				const zoom = windowRect.height / ui.window.clientHeight || 1;
				ui.window.style.setProperty("--yjcm-arena-bottom", `${(windowRect.bottom - arenaRect.bottom) / zoom}px`);
				ui.window.style.setProperty("--yjcm-arena-left", `${(arenaRect.left - windowRect.left) / zoom}px`);
				ui.window.style.setProperty("--yjcm-arena-right", `${(windowRect.right - arenaRect.right) / zoom}px`);
				ui.window.style.setProperty("--yjcm-arena-center", `${(windowRect.left + windowRect.width / 2 - arenaRect.left - arenaRect.width / 2) / zoom}px`);
				ui.window.dataset.yjcmSide = lib.config.extension_十周年UI_rightLayout === "on" ? "right" : "left";
				// 区域变化后让现有布局重新读取宽度，卡牌尺寸仍由 cardScale 设置决定。
				if (window.decadeUI?.boundsCaches?.hand) {
					decadeUI.boundsCaches.hand.updated = false;
					decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
				}
			};
			update();
			const observer = new ResizeObserver(update);
			observer.observe(ui.window);
			observer.observe(ui.arena);
			// 木牛区显隐会改变手牌安全边距，同步刷新缓存宽度及原有排牌。
			if (ui.me) observer.observe(ui.me);
		},

		createOfficialButton(className, label, onClick, parent = ui.window) {
			const button = ui.create.div(`.yjcm-button.${className}`, parent);
			button.setAttribute("role", "button");
			button.setAttribute("aria-label", label);
			button.tabIndex = 0;
			button.onclick = onClick;
			button.onkeydown = event => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					button.click();
				}
			};
			return button;
		},

		createChatButtons() {
			installXinshaProps();
			const buttons = ui.create.div(".yjcm-chat-buttons", ui.window);
			this.createOfficialButton("yjcm-flower", "砸蛋送花", () => this.showInteractionPanel(), buttons);
			const chat = this.createOfficialButton("yjcm-chat", "聊天", null, buttons);
			// chat() 只构造隐藏弹窗，必须经本体弹窗入口挂载和定位。
			lib.setPopped(chat, ui.click.chat, 300, 400, true);
			this.createOfficialButton("yjcm-microphone", "麦克风", null, buttons);
		},

		async showInteractionPanel() {
			installXinshaProps()?.show();
		},

		// 初始化全选按钮覆盖
		initSelectAllOverride() {
			// 禁用原生全选按钮
			ui.create.cardChooseAll = () => null;

			// 移除已存在的全选控件
			const initObserver = () => {
				if (!ui.control) return;
				const observer = new MutationObserver(mutations => {
					mutations.forEach(mutation => {
						mutation.addedNodes.forEach(node => {
							if (node.nodeType === 1 && node.classList?.contains("control")) {
								const first = node.firstElementChild;
								if (first && /^[全反]选$/.test(first.innerHTML) && node.childElementCount === 1) {
									node.remove();
									ui.updatec?.();
								}
							}
						});
					});
				});
				observer.observe(ui.control, { childList: true });
			};

			if (ui.control) initObserver();
			else lib.arenaReady?.push(initObserver);
		},

		// 创建问号按钮
		createQuestionButton() {
			const self = this;
			const btn = this.createOfficialButton("yjcm-question", "胜利条件", null);

			btn.onclick = () => {
				const container = ui.create.div(".popup-container", ui.window);


				const mode = lib.config.mode;
				if (mode === "identity") {
					const cls = self.identityTips[game.me?.identity];
					if (cls) ui.create.div(cls, container);
				} else if (mode === "doudizhu") {
					const cls = self.doudizhuTips[game.me?.identity];
					if (cls) ui.create.div(cls, container);
				} else if (mode === "versus") {
					ui.create.div(".Tiphu", container);
				} else if (mode === "guozhan") {
					const cls = self.groupTips[game.me?.group] || ".Tipweizhi";
					ui.create.div(cls, container);
				}

				container.addEventListener("click", () => {

					container.delete(200);
				});
			};

		},

		// GameSelfSeatUi：整理手牌独立于技能区，保留原排序条件。
		createSelectAllButton() {
			const button = this.createOfficialButton("yjcm-select-all", "全选手牌", () => this.toggleSelectAllCards(update));
			const update = () => {
				const event = _status.event;
				const hidden = !event?.isMine?.() || !event.allowChooseAll || event.complexCard || event.complexSelect || !event.selectCard || get.select(event.selectCard)[1] <= 1;
				if (button.hidden !== hidden) button.hidden = hidden;
				const visible = String(!hidden);
				if (ui.window.dataset.yjcmSelectAll !== visible) ui.window.dataset.yjcmSelectAll = visible;
				const label = ui.selected.cards.length ? "反选" : "全选";
				if (button.textContent !== label) button.textContent = label;
			};
			update();
			setInterval(update, 100);
		},

		createSortButton() {
			const button = this.createOfficialButton("yjcm-sort", "整理手牌", () => this.sortHandCards());
			button.textContent = "整理手牌";
			const update = () => {
				const hidden = !game.me || game.me.getCards("hs").length < 4;
				if (button.hidden !== hidden) button.hidden = hidden;
				const visible = String(!hidden);
				if (ui.window.dataset.yjcmSort !== visible) ui.window.dataset.yjcmSort = visible;
				button.classList.toggle("disabled", !!game.me?.hasSkillTag("noSortCard"));
			};
			update();
			setInterval(update, 1000);
		},

		// GameMenuNew：中心锚点，59px 行距；原生菜单和窗口行为继续走无名杀接口。
		createTopRightMenu() {
			const menu = ui.create.div(".yjcm-menu", ui.window);
			const menuBtn = this.createOfficialButton("yjcm-menu-main", "菜单", toggle, menu);
			menuBtn.setAttribute("aria-expanded", "false");
			ui.yjcmMenuButton = menuBtn;
			const list = ui.create.div(".yjcm-menu-list", menu);
			list.hidden = true;
			const outside = event => {
				if (!menu.contains(event.target)) close();
			};
			function close() {
				list.hidden = true;
				menuBtn.setAttribute("aria-expanded", "false");
				document.removeEventListener("pointerdown", outside, true);
			}
			function toggle() {
				if (!list.hidden) return close();
				list.hidden = false;
				menuBtn.setAttribute("aria-expanded", "true");
				document.addEventListener("pointerdown", outside, true);
			}
			const items = [
				["setting", "设置", () => ui.click.configMenu?.()],
				["background", "背景", () => backgrounds.open()],
				["surround", "退出", () => game.over()],
				["handler", "托管", () => ui.click.auto()],
			];
			for (const [name, label, action] of items) {
				this.createOfficialButton(`yjcm-menu-${name}`, label, () => {
					close();

					action();
				}, list);
			}
			menu.onkeydown = event => {
				if (event.key === "Escape") {
					close();
					menuBtn.focus();
				}
			};
		},

		create: {
			control() {},

			confirm() {
				const confirm = base.create.confirm();
				const update = confirm.update;
				confirm.update = () => {
					update();
					confirm.dataset.yjcmFlow = ui.cardDialog?._isLuckyCardTip || _status.event.name === "gameDraw" ? "redraw" : "normal";
					syncXinshaActionButtons();
				};
				return confirm;
			},

			cardRoundTime() {
				const node = base.create.cardRoundTime();
				ui.window.appendChild(node);
				return node;
			},

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
				// 手牌数量
				const className = isRight ? ".handcardNumber" : ".handcardNumber1";
				const node = ui.create.div(className, ui.arena).hide();
				node.node = {
					cardPicture: ui.create.div(".cardPicture", node),
					cardNumber: ui.create.div(".cardNumber", node),
				};

				node.updateCardnumber = updateXinshaHandCount;

				node.node.cardNumber.interval = setInterval(() => ui.handcardNumber?.updateCardnumber(), 1000);
				game.addVideo("createhandcardNumber");
				return node;
			},
		},
	};
}
