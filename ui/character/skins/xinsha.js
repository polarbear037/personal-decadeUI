/**
 * 新杀风格角色弹窗
 * 功能：龙框、资料页面、装备对话框、VIP系统
 */
import { _status } from "noname";
import { createBaseCharacterPlugin } from "./base.js";

const IMAGE_PATH = "extension/十周年UI/ui/assets/character/xinsha/";
const OFFICIAL_PATH = `${IMAGE_PATH}official/`;
const AUDIO_PATH = "../extension/十周年UI/ui/assets/lbtn/shousha/";

const NICKNAMES = ["缘之空", "小小恐龙", "自然萌", "海边的ebao", "小云云", "无语", "点点", "猫猫虫", "小爱莉", "冰佬", "鹿鹿", "黎佬", "小曦", "浮牢师", "U佬", "蓝宝", "影宝", "柳下跖", "k9", "扶苏", "皇叔"];

/**
 * 创建新杀风格角色插件
 */
export function createXinshaCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseCharacterPlugin(lib, game, ui, get, ai, _status, app);

	return {
		...base,
		skinName: "xinsha",

		/**
		 * 获取对话框背景图片路径
		 */
		getGroupBackgroundImage() {
			return `${IMAGE_PATH}yemian.png`;
		},

		/**
		 * 获取龙框背景图片路径
		 */
		getLongkuangBackgroundImage(group) {
			if (!this.validGroups.includes(group)) group = "default";
			return `${IMAGE_PATH}${group}.png`;
		},

		click: {
			...base.click,

			/**
			 * 玩家信息弹窗点击处理
			 */
			playerIntro(e, node) {
				e?.preventDefault();
				e?.stopPropagation();
				const plugin = this;
				const player = node || this;
				if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") return;

				if (plugin.playerDialog) {
					plugin.playerDialog.hide();
					plugin.playerDialog.remove();
					plugin.playerDialog = null;
				}

				const container = plugin._createDialogContainer(player);
				plugin.playerDialog = container;
				container.show(player, true);
			},
		},

		/**
		 * 创建对话框容器
		 * @private
		 */
		_createDialogContainer(player) {
			const plugin = this;
			const container = ui.create.div(".popup-container.hidden", ui.window, ev => {
				if (ev.target === container) {
					container.hide();
				}
			});

			const playname = player === game.me ? lib.config.connect_nickname : get.translation(NICKNAMES.randomGet(1));
			const dialog = ui.create.div(".xinsha-character-dialog.yjcm-seat-info", container);
			const rightPane = ui.create.div(".right", dialog);

			this._buildMainDialog(dialog, rightPane, player, playname);
			this._createProfilePage(dialog, player, playname);

			// 坐标以原版 1334×750 场景为基准，保持人物窗 1031×460 的比例。
			const resize = () => {
				const width = ui.window.clientWidth;
				const height = ui.window.clientHeight;
				const unit = Math.min(width / 1334, height / 750);
				dialog.style.setProperty("--yjcm-info-scale", String(unit));
			};
			const observer = new ResizeObserver(resize);
			const remove = container.remove.bind(container);
			container.remove = () => {
				observer.disconnect();
				remove();
			};
			container.show = (player, bool) => {
				this._showContent(player, rightPane, bool, dialog);
				container.classList.remove("hidden");
				resize();
				observer.observe(ui.window);
				game.pause2();
			};

			container.hide = () => {
				container.classList.add("hidden");
				observer.disconnect();
				game.resume2();
			};

			return container;
		},

		/**
		 * 构建主对话框内容
		 * @private
		 */
		_buildMainDialog(dialog, rightPane, player, playname) {
			ui.create.div(".yjcm-info-frame", dialog);
			ui.create.div(".yjcm-info-split", dialog);
			const footer = ui.create.div(".yjcm-info-footer", dialog);
			this._createActionButtons(dialog, rightPane, player);
			this._createCharacterSkins(dialog, player);
			this._createCloseButton(dialog);
			ui.create.div(".wanjiaming2", footer, playname);

			rightPane.innerHTML = "<div></div>";
			lib.setScroll(rightPane.firstChild);
		},

		/**
		 * 创建操作按钮
		 * @private
		 */
		_createActionButtons(dialog, rightPane, player) {
			const skill = ui.create.div(".skillx", dialog);
			const equip = ui.create.div(".equip", dialog);
			skill.textContent = "技能";
			equip.textContent = "装备";
			for (const button of [skill, equip]) {
				button.setAttribute("role", "tab");
				button.tabIndex = 0;
				button.onkeydown = event => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						button.click();
					}
				};
			}
			const container = dialog.parentElement;

			const clearRightPane = () => {
				if (rightPane.firstChild) {
					while (rightPane.firstChild.firstChild) {
						rightPane.firstChild.removeChild(rightPane.firstChild.firstChild);
					}
				}
			};

			skill.addEventListener("click", () => {
				game.playAudio(`${AUDIO_PATH}caidan.mp3`);
				clearRightPane();
				container.show(player, true);
				equip?.classList.remove("active");
				skill?.classList.add("active");
			});

			equip.addEventListener("click", () => {
				game.playAudio(`${AUDIO_PATH}caidan.mp3`);
				clearRightPane();
				container.show(player, false);
				skill?.classList.remove("active");
				equip?.classList.add("active");
			});
		},

		/**
		 * 创建资料页面
		 * @private
		 */
		_createProfilePage(dialog, player, playname) {
			const footer = dialog.querySelector(".yjcm-info-footer");
			const caizhu = ui.create.div(".caizhu", footer);
			caizhu.title = "查看资料";
			caizhu.setAttribute("role", "button");
			caizhu.setAttribute("aria-label", "查看资料");
			caizhu.tabIndex = 0;
			caizhu.onclick = () => this._showProfileDialog(player, playname);

			// 原版入口固定显示；雷霆开关与接口均在点击时读取，允许窗口接口稍后加载。
			const miniChange = ui.create.div(".miniChange", footer);
			miniChange.title = "更换皮肤";
			miniChange.setAttribute("role", "button");
			miniChange.setAttribute("aria-label", "更换皮肤");
			miniChange.tabIndex = 0;
			miniChange.onclick = event => {
				event.preventDefault();
				event.stopPropagation();
				const value = lib.config?.tl_versus_miniChange;
				if (value !== true && value !== "开启") {
					ui.create.toast('请打开“雷霆”扩展迷你换肤功能');
					return;
				}
				const panel = globalThis.__tlMiniChangePanel;
				if (typeof panel?.open === "function") void panel.open(player);
			};

			for (const button of dialog.querySelectorAll(".caizhu, .miniChange")) {
				button.onkeydown = event => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						button.click();
					}
				};
			}
		},

		/**
		 * 显示装备对话框
		 * @private
		 */
		_showEquipmentDialog() {
			const popuperContainer = ui.create.div(".popup-container", { background: "rgb(0,0,0,0)" }, ui.window);
			game.playAudio(`${AUDIO_PATH}label.mp3`);

			popuperContainer.delete = function (delay = 0) {
				setTimeout(() => this.remove(), delay);
			};

			ui.create.div(".zbbigdialog", popuperContainer);

			const guanbi = ui.create.div(".guanbi", popuperContainer, "   ");
			guanbi.addEventListener("click", ev => {
				game.playAudio(`${AUDIO_PATH}caidan.mp3`);
				popuperContainer.delete(200);
				ev.stopPropagation();
			});
		},

		/**
		 * 显示资料对话框
		 * @private
		 */
		_showProfileDialog(player, playname) {
			const popuperContainer = ui.create.div(".popup-container", { background: "rgb(0,0,0,0)" }, ui.window);
			game.playAudio(`${AUDIO_PATH}label.mp3`);

			popuperContainer.delete = function (delay = 0) {
				setTimeout(() => this.remove(), delay);
			};

			const bigdialog = ui.create.div(".bigdialog", popuperContainer);

			this._buildProfileDialog(bigdialog, player, playname);

			const haoyou3 = ui.create.div(".haoyou3", bigdialog, "   ");
			haoyou3.addEventListener("click", ev => {
				game.playAudio(`${AUDIO_PATH}caidan.mp3`);
				popuperContainer.delete(200);
				ev.stopPropagation();
			});
		},

		/**
		 * 构建资料对话框内容
		 * @private
		 */
		_buildProfileDialog(bigdialog, player, playname) {
			ui.create.div(".useless", bigdialog);

			const nameshutiao = ui.create.div(".nameshutiao", bigdialog);
			const rarity = game.getRarity(player.name) || "junk";
			nameshutiao.setBackgroundImage(`${IMAGE_PATH}${rarity}.png`);

			const useless2 = ui.create.div(".useless2", bigdialog);
			useless2.setBackgroundImage(`${IMAGE_PATH}InfoBg2.png`);

			const pifuk = ui.create.div(".pifuk", bigdialog);
			pifuk.setBackgroundImage(`${IMAGE_PATH}pifuk.png`);

			const skinname = this.utils.getQhlySkinTranslation(player.name);
			ui.create.div(".pifuming", bigdialog, skinname);

			const wujiangming = ui.create.div(".wujiangming", bigdialog, get.translation(player["name"]));

			const wanjiaming = ui.create.div(".wanjiaming", bigdialog, playname);

			this._createVIPInfo(wanjiaming, player);
			this._createGuildInfo(bigdialog, player);
			this._createPlayerStats(bigdialog, player);
			this._createBadges(bigdialog, player);

			const shanchang4 = ui.create.div(".shanchang4", bigdialog);
			shanchang4.style.backgroundImage = player.node.avatar.style.backgroundImage;

			const minixingxiang = ui.create.div(".minixingxiang", bigdialog);
			const miniData = player.miniXingxiangData || (player.miniXingxiangData = { img: `xingxiang${Math.floor(Math.random() * 6)}` });
			minixingxiang.setBackgroundImage(`${IMAGE_PATH}${miniData.img}.png`);
		},

		/**
		 * 创建VIP信息
		 * @private
		 */
		_createVIPInfo(parent, player) {
			const vipimg = document.createElement("div");
			vipimg.style.cssText = "width:60px;top:2px;height:20px;left:3px;position:relative;background-size:100% 100%;";
			const vipPath = player._vipCache || (player._vipCache = ["vip0", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"].randomGet());
			vipimg.setBackgroundImage(`${IMAGE_PATH}${vipPath}.png`);
			parent.appendChild(vipimg);
		},

		/**
		 * 创建公会信息
		 * @private
		 */
		_createGuildInfo(parent, player) {
			const guildInfo =
				player._guildInfo ||
				(player._guildInfo = {
					name: ["活动武将 扩展交流群", "✟虚拟小杀重度依赖✟", "无名杀本体更新内测群", "无名杀牢大院", "无名杀扩展适配"].randomGet(1),
					icon: ["c1", "c2", "c3"].randomGet(),
				});

			const gonghui = ui.create.div(".gonghui", parent, `公会：${guildInfo.name}`);
			const gonghuiimg = document.createElement("div");
			gonghuiimg.style.cssText = "width:40px;top:2px;height:15px;left:20px;position:relative;background-size:100% 100%;";
			gonghuiimg.setBackgroundImage(`${IMAGE_PATH}${guildInfo.icon}.png`);
			gonghui.appendChild(gonghuiimg);
		},

		/**
		 * 创建玩家数据
		 * @private
		 */
		_createPlayerStats(parent, player) {
			if (!player.profileData) {
				player.profileData = {
					xinyu: Math.floor(Math.random() * 900) + 99,
					meili: Math.floor(Math.random() * 900) + 99,
					shouhu: Math.floor(Math.random() * 1) + 999,
					wujiang1: Math.floor(Math.random() * 999) + 1000,
					pifu1: Math.floor(Math.random() * 999) + 3000,
					jiangling: Math.floor(Math.random() * 89) + 10,
				};
			}

			ui.create.div(".xinyu", parent, `${player.profileData.xinyu}<br>信誉`);
			ui.create.div(".meili", parent, `${player.profileData.meili}<br>魅力`);
			ui.create.div(".shouhu", parent, `${player.profileData.shouhu}<br>守护`);
			ui.create.div(".wujiang1", parent, `${player.profileData.wujiang1}<br>武将`);
			ui.create.div(".pifu1", parent, `${player.profileData.pifu1}<br>样式`);
			ui.create.div(".jiangling", parent, `${player.profileData.jiangling}<br>将灵`);
			ui.create.div(".changyongwujiang", parent, "武将展示");
		},

		/**
		 * 创建徽章
		 * @private
		 */
		_createBadges(parent, player) {
			const minichenghao = ui.create.div(".minichenghao", parent);
			const chenghaoData = player.chenghaoData || (player.chenghaoData = { img: `ch${Math.floor(Math.random() * 27)}` });
			minichenghao.setBackgroundImage(`${IMAGE_PATH}${chenghaoData.img}.png`);

			const baishi = ui.create.div(".baishi", parent);
			const baishiData = player.baishiData || (player.baishiData = { img: ["b1", "b2", "b3"].randomGet() });
			baishi.setBackgroundImage(`${IMAGE_PATH}${baishiData.img}.png`);

			const wngs = ui.create.div(".wngs", parent);
			const historyData = player.historyData || (player.historyData = { img: ["s1", "s2", "s3", "s4", "s5", "s6"].randomGet() });
			wngs.setBackgroundImage(`${IMAGE_PATH}${historyData.img}.png`);

			const deng = ui.create.div(".deng", parent);
			const lampData = player.lampData || (player.lampData = { img: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"].randomGet() });
			deng.setBackgroundImage(`${IMAGE_PATH}${lampData.img}.png`);
		},

		/**
		 * 创建武将立绘
		 * @private
		 */
		_createCharacterSkins(dialog, player) {
			const card = ui.create.div(".yjcm-general-card", dialog);
			const portrait = ui.create.div(".yjcm-general-portrait", card);
			const country = ui.create.div(".yjcm-general-country", card);
			const countryBackground = ui.create.div(".yjcm-general-country-bg", country);
			const emblem = ui.create.div(".yjcm-general-emblem", country);
			const nameLabel = ui.create.div(".yjcm-general-name", country);
			const hp = ui.create.div(".yjcm-general-hp", card);
			const render = secondary => {
				const name = secondary ? player.name2 : player.name1 || player.name;
				const hidden = player !== game.me && player.classList.contains(secondary ? "unseen2" : "unseen");
				const group = hidden ? "unknown" : get.character(name)?.group || player.group;
				const countryId = { wei: 1, shu: 2, wu: 3, qun: 4, shen: 5, Han: 10, ye: 13, jin: 20 }[group] || 0;
				portrait.style.backgroundImage = hidden
					? `url("${lib.assetURL}${OFFICIAL_PATH}game_playerinfo_new_empty.png")`
					: (secondary ? player.node.avatar2 : player.node.avatar)?.style.backgroundImage || "";
				country.setBackgroundImage(`${OFFICIAL_PATH}yjcm_general_gradation_bg_${countryId}.png`);
				countryBackground.style.display = countryId ? "" : "none";
				if (countryId) countryBackground.setBackgroundImage(`${OFFICIAL_PATH}yjcm_general_country_bg_${countryId}.png`);
				emblem.style.display = countryId ? "" : "none";
				if (countryId) emblem.setBackgroundImage(`${OFFICIAL_PATH}yjcm_general_country_${countryId}.png`);
				nameLabel.innerHTML = hidden ? "未知" : get.slimNameHorizontal(name);
				nameLabel.style.fontSize = nameLabel.textContent.length > 5 ? "16px" : nameLabel.textContent.length > 4 ? "20px" : "24px";
				hp.replaceChildren();
				if (!hidden) {
					const maxHp = get.character(name)?.maxHp;
					if (Number.isFinite(maxHp)) {
						// 原版 HP 容器 36×105，底图含透明上缘，不能按可见血珠直接裁缩。
						const count = Math.ceil(maxHp);
						const background = ui.create.div(".yjcm-general-hp-bg", hp);
						background.style.height = `${Math.max(178, Math.min(count, 5) * 20 + 130 + 6)}px`;
						if (count > 5) {
							ui.create.div(".yjcm-general-hp-count", hp, String(maxHp));
							const pip = ui.create.div(".yjcm-general-hp-pip", hp);
							pip.style.bottom = "11px";
						} else for (let i = 0; i < count; i++) {
							const pip = ui.create.div(".yjcm-general-hp-pip", hp);
							pip.style.bottom = `${6 + i * 20}px`;
						}
					}
				}
				dialog.dataset.general = secondary ? "secondary" : "primary";
			};
			render(false);
			if (player.name2) {
				dialog.classList.add("yjcm-double-general");
				const switcher = ui.create.div(".yjcm-general-switch", dialog);
				for (const [index, title] of ["主将", "副将"].entries()) {
					const button = ui.create.div(".yjcm-general-switch-button", switcher, title);
					button.setAttribute("role", "button");
					button.tabIndex = 0;
					button.onclick = () => {
						render(Boolean(index));
						for (const child of switcher.children) child.classList.toggle("active", child === button);
					};
					button.onkeydown = event => {
						if (event.key === "Enter" || event.key === " ") { event.preventDefault(); button.click(); }
					};
					button.classList.toggle("active", index === 0);
				}
			}
		},

		/**
		 * 创建稀有度信息
		 * @private
		 */
		_createRarityInfo(dialog, player) {
			const name = player.name1 || player.name;
			const rarity = game.getRarity(name) || "junk";
			const pe = ui.create.div(".pe1", dialog);
			const peUrl = lib.config["extension_千幻聆音_enable"] ? `${IMAGE_PATH}pe_${this.utils.getQhlyLevel(name)}.png` : `${IMAGE_PATH}pe_${rarity}.png`;
			pe.style.backgroundImage = `url("${peUrl}")`;
		},

		/**
		 * 创建关闭按钮
		 * @private
		 */
		_createCloseButton(dialog) {
			const diaozhui = ui.create.div(".diaozhui", dialog);
			diaozhui.setBackgroundImage(`${OFFICIAL_PATH}game_playerinfonew_btnclose.png`);
			diaozhui.setAttribute("role", "button");
			diaozhui.setAttribute("aria-label", "关闭人物信息");
			diaozhui.tabIndex = 0;
			diaozhui.onkeydown = event => {
				if (event.key === "Enter" || event.key === " ") { event.preventDefault(); diaozhui.click(); }
			};
			diaozhui.addEventListener("click", () => {
				game.playAudio(`${AUDIO_PATH}caidan.mp3`);
				const container = dialog.parentElement;
				container.hide();
			});
		},

		/**
		 * 创建龙框
		 * @private
		 */
		_createLongkuang(dialog, player) {
			const longkuang = ui.create.div(".longkuang", dialog);
			longkuang.setBackgroundImage(this.getLongkuangBackgroundImage(player.group));
		},

		/**
		 * 创建等级标识
		 * @private
		 */
		_createLevelBadge(dialog, player) {
			const level = ui.create.div(".level", dialog);
			const levelData = player.levelData || (player.levelData = { img: String(Math.floor(Math.random() * 13) + 1) });
			level.setBackgroundImage(`${IMAGE_PATH}${levelData.img}.png`);
		},

		/**
		 * 创建武将名称
		 * @private
		 */
		_createCharacterName(dialog, player) {
			const wjname = ui.create.div(".wjname", dialog);
			wjname.innerHTML = get.slimNameHorizontal(player.name);
		},

		/**
		 * 显示内容
		 * @private
		 */
		_showContent(player, rightPane, bool, dialog) {
			rightPane.firstChild.replaceChildren();
			for (const [selector, active] of [[".skillx", bool], [".equip", !bool]]) {
				const tab = dialog.querySelector(selector);
				tab.classList.toggle("active", active);
				tab.setAttribute("aria-selected", String(active));
			}
			let oSkills = player.getSkills(null, false, false).slice(0);
			oSkills = oSkills.filter(s => lib.skill[s] && s !== "jiu" && !lib.skill[s].nopop && !lib.skill[s].equipSkill && lib.translate[s + "_info"]);
			if (player === game.me && player.hiddenSkills?.length) oSkills.addArray(player.hiddenSkills);

			if (bool) {
				const skill = dialog.querySelector(".skillx");
				skill?.classList.add("active");
				if (oSkills.length) {
					oSkills.forEach(name => {
						this.createSkillItem(rightPane.firstChild, name, player, dialog.parentElement);
						const label = rightPane.firstChild.lastElementChild?.querySelector("[data-color]");
						if (label) {
							const badge = document.createElement("span");
							const active = Boolean(lib.skill[name]?.enable);
							badge.className = `yjcm-skill-kind${active ? " active" : ""}`;
							badge.textContent = active ? "主" : "被";
							label.appendChild(badge);
						}
					});
				}
			} else {
				this._showEquipment(player, rightPane);
			}
		},

		/**
		 * 显示装备
		 * @private
		 */
		_showEquipment(player, rightPane) {
			const eSkills = player.getVCards("e");
			if (eSkills.length) {
				eSkills.forEach(card => {
					const cards = card.cards;
					const isQiexie = card.name.startsWith("qiexie_");
					const displayName = card.name + "_info";
					let str = [get.translation(isQiexie ? card.name : card), get.translation(displayName)];

					if (Array.isArray(cards) && cards.length && (cards.length !== 1 || cards[0].name !== card.name)) {
						str[0] += `（${get.translation(cards)}）`;
					}
					if (lib.card[card.name]?.cardPrompt) {
						str[1] = lib.card[card.name].cardPrompt(card, player);
					}
					if (isQiexie && lib.translate[card.name + "_append"]) {
						str[1] += `<br><br><div style="font-size: 0.85em; font-family: xinwei; line-height: 1.2;">${lib.translate[card.name + "_append"]}</div>`;
					}
					ui.create.div(".xskillx", `<div data-color>${str[0]}</div><div>${str[1]}</div>`, rightPane.firstChild).style.marginBottom = "10px";
				});
			}

			if (player.extraEquip?.length) {
				const shownEquips = new Set();
				player.extraEquip.forEach(info => {
					const [skillName, equipName, preserve] = info;
					if (preserve && !preserve(player)) return;
					if (shownEquips.has(equipName)) return;
					shownEquips.add(equipName);

					const skillTrans = lib.translate[skillName] || skillName;
					const equipTrans = lib.translate[equipName] || equipName;
					const equipInfo = lib.translate[equipName + "_info"] || "";
					ui.create.div(".xskillx", `<div data-color>【${skillTrans}】视为装备【${equipTrans}】</div><div>${equipInfo}</div>`, rightPane.firstChild).style.marginBottom = "10px";
				});
			}

			this.showHandCards(rightPane.firstChild, player);

			const judges = player.getVCards("j");
			if (judges.length) {
				ui.create.div(".xcaption", "判定区域", rightPane.firstChild);
				judges.forEach(card => {
					const cardx = game.createCard(get.name(card, false), get.suit(card, false), get.number(card, false), get.nature(card, false));
					cardx.style.zoom = "0.8";
					rightPane.firstChild.appendChild(cardx);
				});
			}

			const shownHs = player.getShownCards();
			const allShown = player.isUnderControl() || (!game.observe && game.me?.hasSkillTag("viewHandcard", null, player, true));
			if (!shownHs.length && !allShown && !judges.length && !eSkills.length) {
				ui.create.div(".noxcaption", rightPane.firstChild, "当前未穿戴装备");
			}
		},
	};
}
