/**
 * @fileoverview OL风格角色弹窗
 * 特点：将灯系统、段位信息、详细资料、衍生技能显示
 */
import { createBaseCharacterPlugin } from "./base.js";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";

/**
 * 创建OL风格角色插件
 * @param {object} lib - 游戏库对象
 * @param {object} game - 游戏对象
 * @param {object} ui - UI对象
 * @param {object} get - 获取器对象
 * @param {object} ai - AI对象
 * @param {object} _status - 状态对象
 * @param {object} app - 应用对象
 * @returns {object} OL风格角色插件对象
 */
export function createOnlineCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseCharacterPlugin(lib, game, ui, get, ai, _status, app);

	const IMAGE_PATH = "extension/十周年UI/ui/assets/character/online/";
	const TOOL_PATH = IMAGE_PATH + "general-tool/";
	const AUDIO_PATH = "../extension/十周年UI/ui/assets/lbtn/shousha/caidan.mp3";
	let playerRates = new WeakMap();
	lib.announce.subscribe("gameStart", () => { playerRates = new WeakMap(); });

	/**
	 * 常量配置
	 * @type {object}
	 */
	const CONSTANTS = {
		GUANJIE_TRANSLATION: {
			1: ["骁卒", ["步卒", "伍长", "什长", "队率", "屯长", "部曲"]],
			2: ["校尉", ["县尉", "都尉", "步兵校尉", "典军校尉"]],
			3: ["郎将", ["骑郎将", "车郎将", "羽林中郎将", "虎贲中郎将"]],
			4: ["偏将军", ["折冲将军", "虎威将军", "征虏将军", "荡寇将军"]],
			5: ["将军", ["监军将军", "抚军将军", "典军将军", "领军将军"]],
			6: ["上将军", ["后将军", "左将军", "右将军", "前将军"]],
			7: ["国护军", ["护军", "左护军", "右护军", "中护军"]],
			8: ["国都护", ["都护", "左都护", "右都护", "中都护"]],
			9: ["统帅", ["卫将军"]],
			10: ["统帅", ["车骑将军"]],
			11: ["统帅", ["骠骑将军"]],
			12: ["大将军", ["大将军"]],
			13: ["大司马", ["大司马"]],
		},
		DUANWEI_TRANSLATION: {
			1: ["新兵一", "新兵二", "新兵三"],
			2: ["骁骑一", "骁骑二", "骁骑三"],
			3: ["先锋一", "先锋二", "先锋三", "先锋四"],
			4: ["大将一", "大将二", "大将三", "大将四"],
			5: ["主帅一", "主帅二", "主帅三", "主帅四", "主帅五"],
			6: ["枭雄", "至尊枭雄", "绝世枭雄"],
		},
		JIANGDENG_CLASSES: ["biao", "jiang", "jie", "wenwu", "guo", "jiangjie", "zu", "shan", "cui", "sp", "shen", "mou", "qi", "xian"],
		SUIT_CONFIG: {
			spade: { symbol: "♠", color: "#2e2e2e", image: "spade.png" },
			heart: { symbol: "♥", color: "#e03c3c", image: "heart.png" },
			club: { symbol: "♣", color: "#2e2e2e", image: "club.png" },
			diamond: { symbol: "♦", color: "#e03c3c", image: "diamond.png" },
		},
		EQUIP_TYPE_ICONS: { equip1: "equip1.png", equip2: "equip2.png", equip3: "equip3.png", equip4: "equip4.png", equip5: "equip5.png" },
		COUNTRY_COLORS: {
			wei: ["#C4D1F0", "#0D2E4D"],
			shu: ["#F4B39C", "#462309"],
			wu: ["#B9F2A1", "#0E3006"],
			qun: ["#F3D79D", "#7C7925"],
			shen: ["#FFE555", "#BEA350"],
			jin: ["#FCBDFD", "#4E1D5A"],
			yao: ["#FFED71", "#B7A933"],
			xie: ["#FF8FE9", "#CD5498"],
			ye: ["#FCF3FF", "#E067EB"],
		},
	};

	return {
		...base,
		skinName: "online",

		/**
		 * 获取势力背景图
		 * @param {string} group - 势力名称
		 * @returns {string} 背景图路径
		 */
		getOlsBackgroundImage(group) {
			if (!this.validGroups.includes(group)) group = "default";
			return `${IMAGE_PATH}ols_${group}.png`;
		},

		/**
		 * 生成随机数据
		 * @param {Player} player - 玩家对象
		 * @returns {object} 包含胜率、官阶等级、人气值等随机数据
		 */
		generateRandomData(player) {
			const guanjieLevel = Math.floor(Math.random() * 13 + 1);
			return {
				...this.getPlayerRates(player),
				guanjieLevel,
				rankLevel: Math.floor(Math.random() * 6 + 1),
				level: [Math.floor(Math.random() * 21) + 180, 200, 200].randomGet(),
				vipLevel: Math.min(guanjieLevel + 1, 10),
				mvpCount: Math.floor(Math.random() * 41 + 20),
			};
		},

		getPlayerRates(player) {
			let rates = playerRates.get(player);
			if (!rates) {
				rates = {
					popularity: 10 + Math.floor(Math.random() * 9990),
					winRate: ((300 + Math.floor(Math.random() * 401)) / 10).toFixed(1) + "%",
					escapeRate: (Math.floor(Math.random() * 101) / 10).toFixed(1) + "%",
				};
				playerRates.set(player, rates);
			}
			return rates;
		},

		/**
		 * 创建边框颜色
		 * @param {HTMLElement} kuang - 边框元素
		 * @param {string} group - 势力名称
		 */
		createBiankuangColor(kuang, group) {
			const tempPlayer = document.createElement("div");
			tempPlayer.classList.add("player");
			const tempCampWrap = document.createElement("div");
			tempCampWrap.classList.add("camp-wrap");
			tempCampWrap.setAttribute("data-camp", group);
			tempPlayer.appendChild(tempCampWrap);
			const tempCampBack = document.createElement("div");
			tempCampBack.classList.add("camp-back");
			tempCampWrap.appendChild(tempCampBack);
			document.body.appendChild(tempPlayer);

			const computedStyle = window.getComputedStyle(tempCampBack);
			let backgroundStyle = computedStyle.background || computedStyle.backgroundColor;
			document.body.removeChild(tempPlayer);

			const match = backgroundStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
			if (match) {
				kuang.style.backgroundImage = `url(${new URL(match[1], window.location.href).href})`;
			} else {
				kuang.style.background = backgroundStyle;
			}
		},

		click: {
			...base.click,
			playerIntro(event, player) {
				event?.preventDefault();
				event?.stopPropagation();
				if ((document.body.dataset.style || lib.config.extension_十周年UI_newDecadeStyle) !== "onlineUI" || !player?.name || !ui.window) return;
				this.playerDialog?.();
				this.showGeneralTool(player);
			},
		},

		showGeneralTool(player) {
			const container = ui.create.div(".popup-container.online-general-tool", ui.window);
			const dialog = ui.create.div(".online-general-tool-window", container);
			dialog.setAttribute("role", "dialog");
			dialog.setAttribute("aria-modal", "true");
			dialog.setAttribute("aria-label", "武将信息");
			ui.create.div(".online-general-tool-title", "武将信息", dialog);
			ui.create.div(".online-general-tool-list-bg", dialog);
			const rightPane = ui.create.div(".online-general-tool-list", dialog);
			const portrait = ui.create.div(".online-general-tool-portrait", dialog);
			const artwork = ui.create.div(".online-general-tool-artwork", portrait);
			ui.create.div(".online-general-tool-frame", portrait);
			const namePlate = ui.create.div(".online-general-tool-nameplate", portrait);
			const groupLabel = ui.create.div(".online-general-tool-country", namePlate);
			const nameLabel = ui.create.div(".online-general-tool-name", namePlate);
			const health = ui.create.div(".online-general-tool-health", portrait);
			const sealLabel = ui.create.div(".online-general-tool-seal-label", portrait);
			const nickname = ui.create.div(".online-general-tool-player", dialog);
			nickname.textContent = player.nickname || "";

			const rates = ui.create.div(".online-general-tool-rates", dialog);
			const { popularity, winRate, escapeRate } = this.getPlayerRates(player);
			for (const [index, [label, stat]] of [["人气值", popularity], ["百场胜率", winRate], ["逃跑率", escapeRate]].entries()) {
				const cell = document.createElement("section");
				const title = new Image();
				title.src = lib.assetURL + TOOL_PATH + `wjxq_txt${3 - index}.png`;
				title.alt = label;
				const value = document.createElement("span");
				value.textContent = stat;
				cell.append(title, value);
				rates.append(cell);
			}
			const button = (className, label, action) => {
				const node = document.createElement("button");
				node.type = "button";
				node.className = className;
				node.setAttribute("aria-label", label);
				node.addEventListener("click", action);
				dialog.append(node);
				return node;
			};
			let detail;
			button("online-general-tool-info", "查看玩家资料", () => {
				if (!detail) {
					detail = this.createDetailPopup(player, this.generateRandomData(player));
					container.append(detail);
				}
				detail.style.display = "block";
				game.playAudio(AUDIO_PATH);
			});

			let second = false;
			const refresh = () => {
				const name = second ? player.name2 : player.name1 || player.name;
				const hidden = player !== game.me && player.classList.contains(second ? "unseen2" : "unseen");
				const character = !hidden && lib.character[name];
				const group = character?.group || character?.[1];
				const textureGroup = group === "ye" ? "yeXin" : group;
				const supported = ["wei", "shu", "wu", "qun", "jin", "shen", "xie", "yao", "yeXin"];
				namePlate.setBackgroundImage(TOOL_PATH + `general_bigSkin_icon_${supported.includes(textureGroup) ? textureGroup : "gary"}_bg_new.png`);
				artwork.setBackground(hidden ? "unknown" : name, "character");
				namePlate.hidden = !character;
				sealLabel.textContent = hidden ? "武将暗置" : "";
				groupLabel.textContent = group ? get.translation(group) : "";
				const [countryColor, countryStroke] = CONSTANTS.COUNTRY_COLORS[group] || CONSTANTS.COUNTRY_COLORS.qun;
				groupLabel.style.color = countryColor;
				groupLabel.style.webkitTextStrokeColor = countryStroke;
				const translatedName = document.createElement("template");
				translatedName.innerHTML = character ? get.slimNameHorizontal(name) : "";
				nameLabel.textContent = translatedName.content.textContent;
				this.renderGeneralToolHealth(health, character);
				this.createRightPanel(rightPane, player, second, hidden);
			};
			if (player.name2) {
				button("online-general-tool-switch", "切换主副将", () => {
					second = !second;
					refresh();
				});
			}
			refresh();

			const fit = () => {
				const scale = Math.min(container.clientWidth / 1450, container.clientHeight / 750);
				if (scale > 0) dialog.style.setProperty("--general-tool-scale", scale);
			};
			fit();
			const observer = new ResizeObserver(fit);
			observer.observe(container);
			const wasPaused = _status.paused2;
			const close = () => {
				observer.disconnect();
				container.remove();
				this.playerDialog = null;
				if (!wasPaused && !ui.arena?.classList.contains("menupaused")) game.resume2();
			};
			this.playerDialog = close;
			button("online-general-tool-close", "关闭武将信息", () => {
				game.playAudio(AUDIO_PATH);
				close();
			});
			container.addEventListener("click", event => {
				event.stopPropagation();
				if (event.target === container) {
					game.playAudio(AUDIO_PATH);
					close();
				}
			});
			for (const type of ["touchstart", "touchend"]) {
				container.addEventListener(type, event => event.stopPropagation());
			}
			game.playAudio(AUDIO_PATH);
			game.pause2();
		},
		renderGeneralToolHealth(health, character) {
			health.replaceChildren();
			health.removeAttribute("aria-label");
			if (!character) return;
			const maxHp = character.maxHp ?? get.infoMaxHp(character[2]);
			const hp = character.hp ?? get.infoHp(character[2]);
			const guozhan = get.mode() === "guozhan";
			const maxPips = guozhan ? Math.ceil(maxHp / 2) : maxHp;
			const compact = maxPips > 5;
			health.classList.toggle("is-compact", compact);
			health.classList.toggle("is-guozhan", guozhan);
			health.setAttribute("aria-label", `体力 ${hp}/${maxHp}`);
			for (let pip = 0; pip < (compact ? 1 : maxPips); pip++) {
				const slot = document.createElement("span");
				if (guozhan) {
					for (const [half, side] of ["R", "L"].entries()) {
						const lastHalf = pip * 2 + 1 === maxHp;
						if (!compact && lastHalf && side === "R") continue;
						const point = pip * 2 + (lastHalf ? 0 : half);
						const icon = new Image();
						icon.alt = "";
						icon.dataset.side = side;
						icon.src = lib.assetURL + TOOL_PATH + `${compact || point < hp ? "bigSkin_wu_hp_country" : "bigSkin_empty_country"}_${side}.png`;
						slot.append(icon);
					}
				} else {
					const icon = new Image();
					icon.alt = "";
					icon.src = lib.assetURL + TOOL_PATH + (compact || pip < hp ? "blood_green_s_new.png" : "bigSkin_empty.png");
					slot.append(icon);
				}
				health.append(slot);
			}
			if (compact) {
				const value = document.createElement("span");
				value.className = "online-general-tool-health-value";
				value.textContent = guozhan ? `${hp / 2}\n/\n${maxHp / 2}` : `${hp}\n/\n${maxHp}`;
				health.append(value);
			}
		},
		createRightPanel(rightPane, player, second, hidden) {
			rightPane.replaceChildren();
			rightPane.scrollTop = 0;
			const content = ui.create.div(".online-general-tool-list-content", rightPane);
			const skills = player.getSkills(null, false, false);
			const names = [player.name1 || player.name, player.name2];
			const generalSkills = names.map(name => lib.character[name]?.skills || lib.character[name]?.[3] || []);
			const current = generalSkills[second ? 1 : 0];
			const other = generalSkills[second ? 0 : 1];
			const visible = hidden ? [] : skills.filter(skill => !player.name2 || current.includes(skill) || !other.includes(skill));
			if (!hidden && player === game.me) {
				visible.push(...(player.hiddenSkills || []).filter(skill => !player.name2 || current.includes(skill)));
			}
			const entries = [...new Set(visible)].filter(skill => lib.skill[skill] && skill !== "jiu" && !lib.skill[skill].nopop && !lib.skill[skill].equipSkill && lib.translate[skill + "_info"]);

			if (hidden) ui.create.div(".online-general-tool-sealed", "武将暗置，暂不显示", content);
			if (entries.length) {
				ui.create.div(".xcaption", "武将技能", content);
				const shown = new Set();
				for (const name of entries) {
					if (!shown.has(name)) this.createOLSkillItem(content, name, player, shown);
				}
			}
			this.showHandCards(content, player);
			this.createOLEquipmentSection(content, player);
			this.showJudgeArea(content, player);
		},
		/**
		 * 创建OL风格技能项
		 * @param {HTMLElement} container - 容器元素
		 * @param {string} name - 技能名称
		 * @param {Player} player - 玩家对象
		 * @param {Set<string>} hasSkills - 已显示的技能集合
		 */
		createOLSkillItem(container, name, player, hasSkills) {
			const info = get.info(name);
			const getTypeText = () => {
				if (info.juexingji || info.limited) {
					return player.awakenedSkills.includes(name) ? "已发动" : "未发动";
				}
				return info.enable ? "主动" : "被动";
			};
			const typeText = getTypeText();
			const typeTag = `<span class="skill-type-tag">（${typeText}）</span>`;
			hasSkills.add(name);

			const skillName = lib.translate[name];

			const rawSkillInfo = skillButtonTooltip.getSkillDescription(name, player);
			const skillInfo = skillButtonTooltip.formatSkillDescription(rawSkillInfo);

			const skillItem = ui.create.div(".xskill.online-general-tool-skill", `<header><span>${skillName}</span>${typeTag}</header><div>${skillInfo}</div>`, container);

			if (info.derivation) {
				const derivations = Array.isArray(info.derivation) ? info.derivation : [info.derivation];
				derivations.forEach(skill => {
					const ysInfo = get.info(skill);
					if (!ysInfo || !lib.translate[skill + "_info"] || hasSkills.has(skill)) return;
					hasSkills.add(skill);
					const ysName = get.skillTranslation(skill);
					const ysDesc = skillButtonTooltip.formatSkillDescription(skillButtonTooltip.getSkillDescription(skill, player));
					let has;
					if (ysInfo.juexingji || ysInfo.limited) {
						has = !player.hasSkill(skill) ? (player.awakenedSkills.includes(skill) ? "已发动" : "未生效") : "未发动";
					} else {
						has = player.hasSkill(skill) ? "已生效" : "未生效";
					}
					const color = has === "未生效" ? 'style="color:#978a81;"' : "";
					ui.create.div(".online-general-tool-derived", `<header ${color}>${ysName}（${has}）</header><div>${ysDesc}</div>`, skillItem);
				});
			}
		},

		/**
		 * 创建OL风格装备区
		 * @param {HTMLElement} container - 容器元素
		 * @param {Player} player - 玩家对象
		 */
		createOLEquipmentSection(container, player) {
			const equips = player.getCards("e");
			if (equips.length) {
				ui.create.div(".xcaption", "装备区", container);
				equips.forEach(card => {
					const suitConfig = CONSTANTS.SUIT_CONFIG[card.suit] || { symbol: "", color: "#FFFFFF" };
					const typeIcon = CONSTANTS.EQUIP_TYPE_ICONS[get.subtype(card)] || "default.png";
					const dianshu = get.strNumber(card.number);

					const firstLine = `<div style="display:flex;align-items:center;gap:8px;position:relative;">` + `<span style="color:#f7d229;font-weight:bold;">${get.translation(card.name).replace(/[【】]/g, "")}</span>` + `<img src="${IMAGE_PATH}${typeIcon}" style="width:14px;height:20px;vertical-align:middle">` + `<div style="margin-left:0;display:flex;align-items:center;gap:2px;">` + (suitConfig.image ? `<img src="${IMAGE_PATH}${suitConfig.image}" style="width:16px;height:16px;margin-left:-2px;margin-top:3px;filter:drop-shadow(0 0 1px white);">` : `<span style="color:${suitConfig.color};margin-left:-2px;margin-top:3px;text-shadow:0 0 1px white;position:relative;">${suitConfig.symbol}</span>`) + `<span style="margin-left:3px;margin-top:3px;font-size:18px;color:${suitConfig.color === "#e03c3c" ? suitConfig.color : "#efdbb6"};font-family:shousha;">${dianshu || ""}</span>` + `</div></div>`;

					let desc = "";
					if (get.subtypes(card).includes("equip1")) {
						let num = 1;
						const cardInfo = get.info(card);
						if (typeof cardInfo?.distance?.attackFrom === "number") {
							num -= cardInfo.distance.attackFrom;
						}
						desc += `攻击范围 :   ${num}<br>`;
					}
					desc += get.translation(card.name + "_info").replace(/[【】]/g, "");

					const special = card.cards?.find(item => item.name === card.name && lib.card[item.name]?.cardPrompt);
					if (special) {
						desc = lib.card[special.name].cardPrompt(special, player);
					}

					ui.create.div(".xskillx", `${firstLine}<div style="margin-top:4px;white-space:pre-wrap;">${desc}</div>`, container);
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
					ui.create.div(".xskillx", `<div style="color:#f7d229;font-weight:bold;">【${skillTrans}】视为装备【${equipTrans}】</div><div style="margin-top:4px;white-space:pre-wrap;">${equipInfo}</div>`, container);
				});
			}
		},

		/**
		 * 创建详细资料弹窗
		 * @param {Player} player - 玩家对象
		 * @param {object} randomData - 随机数据对象
		 * @returns {HTMLElement} 弹窗元素
		 */
		createDetailPopup(player, randomData) {
			const popup = ui.create.div(".popup-container.online-detail-popup", { background: "rgb(0,0,0,0.8)" }, ui.window);
			popup.style.display = "none";

			const guanbi = ui.create.div(".guanbi", popup);
			guanbi.addEventListener("click", () => {
				popup.style.display = "none";
				game.playAudio(AUDIO_PATH);
			});

			const bigdialog = ui.create.div(".bigdialog", popup);

			const minixingxiang = ui.create.div(".minixingxiang", bigdialog);
			ui.create.div(".nameX", player.nickname, minixingxiang);
			ui.create.div(".dengjiX", randomData.level + "级", minixingxiang);
			ui.create.div(".huiyuanX", "会员" + randomData.vipLevel, minixingxiang);
			minixingxiang.setBackgroundImage(`${IMAGE_PATH}../xinsha/xingxiang${Math.floor(Math.random() * 6)}.png`);

			const guanjie = ui.create.div(".guanjie", bigdialog);
			guanjie.setBackgroundImage(`${IMAGE_PATH}sactx_${randomData.guanjieLevel}.png`);
			const guanjieInfo = CONSTANTS.GUANJIE_TRANSLATION[randomData.guanjieLevel];
			ui.create.div(".guanjiewenzi", `<center>${guanjieInfo[0]}<br><center>${guanjieInfo[1].randomGet()}`, guanjie);
			ui.create.div(".xinyufen", "100", bigdialog);
			ui.create.div(".renqizhi", `${randomData.popularity}`, bigdialog);

			const jddialog = ui.create.div(".jddialog", bigdialog);
			const jiangdengsuiji = CONSTANTS.JIANGDENG_CLASSES.randomGets(randomData.guanjieLevel > 8 ? randomData.guanjieLevel + 1 : [randomData.guanjieLevel - 1, randomData.guanjieLevel].randomGet());
			let jiangdengLiang = [];
			let jiangdengLiangguanjie = randomData.guanjieLevel > 4 ? ["biao", "sp", "guo", "jiang", "jie"] : ["biao", "guo", "jiang"];
			if (randomData.guanjieLevel > 6) jiangdengLiangguanjie.push("jiangjie");

			CONSTANTS.JIANGDENG_CLASSES.forEach(name => {
				if (jiangdengLiangguanjie.includes(name) || jiangdengsuiji.includes(name)) {
					jiangdengLiang.push(name);
				}
			});

			CONSTANTS.JIANGDENG_CLASSES.forEach(name => {
				const jdditu = ui.create.div(".jdditu", jddialog);
				const isLit = jiangdengLiang.includes(name);
				const jdtubiao = ui.create.div(isLit ? ".jdtubiao" : ".jdtubiaoan", jdditu);
				jdtubiao.setBackgroundImage(`${IMAGE_PATH}${name}.png`);
				if (isLit) ui.create.div(`.jd${name}donghua`, jdtubiao);
			});

			const paiwei = ui.create.div(".paiweiditu", bigdialog);
			const duanwei = ui.create.div(".duanwei", paiwei);
			const duanweiInfo = CONSTANTS.DUANWEI_TRANSLATION[randomData.rankLevel];
			ui.create.div(".duanweishuzi", `<center>${duanweiInfo.randomGet()}`, paiwei);
			duanwei.setBackgroundImage(`${IMAGE_PATH}pwtx_${randomData.rankLevel}.png`);
			ui.create.div(".shenglvx", `百场胜率 ${randomData.winRate}<br>MVP        ${randomData.mvpCount}次`, paiwei);
			ui.create.div(".paiweiType", "排位赛", paiwei);
			ui.create.div(".typeleft", paiwei);
			ui.create.div(".typeright", paiwei);

			const shanchangdialog = ui.create.div(".shanchangdialog", bigdialog);
			const shanchang = Object.keys(lib.character)
				.filter(key => !lib.filter.characterDisabled(key))
				.randomGets(5);

			shanchang.forEach(charName => {
				const group = lib.character[charName][1];
				const charPic = ui.create.div(".shanchang", shanchangdialog);
				charPic.setBackground(charName, "character");

				const huanfu = ui.create.div(".huanfu", charPic);
				huanfu.onclick = () => {
					window.zyile_charactercard ? window.zyile_charactercard(charName, charPic, false) : ui.click.charactercard(charName, charPic, lib.config.mode === "guozhan" ? "guozhan" : true);
				};

				const kuang = ui.create.div(".kuang", charPic);
				ui.create.div(".xing", kuang);
				ui.create.div(".charName", get.slimNameHorizontal(charName), kuang);
				const shili = ui.create.div(".shili", kuang);
				shili.setBackgroundImage(this.getOlsBackgroundImage(group));
				this.createBiankuangColor(kuang, group);
			});

			return popup;
		},
	};
}
