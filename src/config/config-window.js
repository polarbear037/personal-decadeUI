import { ui, lib, game } from "noname";
import { config as config } from "./index.js";
let t = null,
	n = "appearance";
function a() {
	if (t) return;
	!(function () {
		if (document.getElementById("decade-config-window-styles")) return;
		const link = document.createElement("link");
		((link.id = "decade-config-window-styles"), (link.rel = "stylesheet"), (link.href = `${lib.assetURL}extension/十周年UI/src/config/config-window.css`), document.head.appendChild(link));
	})();
	const overlay = ui.create.div(".decade-config-overlay"),
		dialog = ui.create.div(".decade-config-dialog", overlay);
	ui.create.div(".decade-config-pattern", dialog);
	ui.create.div(".decade-config-title", dialog).innerHTML = "十周年UI配置中心";
	const avatar = document.createElement("img");
	((avatar.src = `${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar.jpg`),
		(avatar.className = "decade-config-avatar"),
		(avatar.onclick = () => {
			(overlay.remove(), (t = null));
		}),
		dialog.appendChild(avatar));
	const sidebar = ui.create.div(".decade-config-sidebar", dialog),
		content = ui.create.div(".decade-config-content", dialog);
	let currentTab = n;
	([
		{ id: "appearance", name: "整体外观" },
		{ id: "card", name: "卡牌相关" },
		{ id: "component", name: "部件管理" },
		{ id: "misc", name: "其他设置" },
	].forEach(tab => {
		const btn = ui.create.div(".decade-config-tab", sidebar);
		((btn.innerHTML = tab.name),
			tab.id === currentTab && btn.classList.add("active"),
			(btn.onclick = () => {
				currentTab !== tab.id &&
					((currentTab = tab.id),
					(n = tab.id),
					Array.from(sidebar.children).forEach(child => {
						child.classList.remove("active");
					}),
					btn.classList.add("active"),
					i(content, currentTab));
			}));
	}),
		i(content, currentTab),
		overlay.addEventListener("click", n => {
			n.target === overlay && (overlay.remove(), (t = null));
		}),
		document.body.appendChild(overlay),
		(t = overlay));
}
function i(t, n) {
	((t.innerHTML = ""), (t.scrollTop = 0));
	const a = (function (tabId) {
		return (
			{
				appearance: [
					{ isTitle: !0, name: "样式设置" },
					{ key: "newDecadeStyle", name: "切换样式", type: "select" },
					{ key: "outcropSkin", name: "露头样式", type: "select" },
					{ key: "borderStyle", name: "边框风格•仅一将", type: "select" },
					{ key: "borderLevel", name: "等阶边框", type: "select" },
					{ isTitle: !0, name: "功能开关" },
					{ key: "aloneEquip", name: "单独装备栏", type: "toggle" },
					{ key: "meanPrettify", name: "菜单美化", type: "toggle" },
					{ key: "dynamicSkin", name: "动态皮肤", type: "toggle" },
					{ key: "dynamicSkinOutcrop", name: "动皮露头", type: "toggle" },
					{ key: "killEffect", name: "击杀特效", type: "toggle" },
				],
				card: [
					{ isTitle: !0, name: "卡牌效果" },
					{ key: "cardGhostEffect", name: "幻影出牌", type: "toggle" },
					{ key: "autoSelect", name: "自动选择", type: "toggle" },
					{ key: "cardPrompt", name: "出牌信息提示", type: "toggle" },
					{ key: "cardAlternateName", name: "牌名辅助", type: "toggle" },
					{ isTitle: !0, name: "卡牌样式" },
					{ key: "cardPrettify", name: "卡牌美化", type: "select" },
					{ key: "cardkmh", name: "卡牌边框", type: "select" },
					{ key: "chupaizhishi", name: "出牌指示", type: "select" },
					{ isTitle: !0, name: "尺寸调整" },
					{ key: "cardScale", name: "手牌大小", type: "input" },
					{ key: "discardScale", name: "弃牌堆卡牌大小", type: "input" },
					{ key: "handTipHeight", name: "出牌信息提示高度", type: "input" },
					{ key: "handFoldMin", name: "手牌折叠", type: "input" },
				],
				component: [
					{ isTitle: !0, name: "进度条设置" },
					{ key: "jindutiaoYangshi", name: "进度条样式", type: "select" },
					{ key: "jindutiaoST", name: "进度条速度", type: "select" },
					{ key: "jindutiaoSet", name: "进度条高度", type: "input" },
					{ isTitle: !0, name: "界面元素" },
					{ key: "JDTSYangshi", name: "阶段提示", type: "select" },
					{ key: "GTBBYangshi", name: "狗托播报", type: "select" },
					{ key: "GTBBFont", name: "播报字体", type: "select" },
					{ key: "GTBBTime", name: "时间间隔", type: "select" },
					{ key: "playerMarkStyle", name: "标记样式", type: "select" },
					{ key: "loadingStyle", name: "光标+loading框", type: "select" },
					{ key: "gainSkillsVisible", name: "获得技能显示", type: "select" },
					{ isTitle: !0, name: "插件功能" },
					{ key: "characterPlugin", name: "武将详情插件", type: "toggle" },
				],
				misc: [
					{ isTitle: !0, name: "音效与视觉" },
					{ key: "bettersound", name: "更多音效", type: "toggle" },
					{ key: "skillDieAudio", name: "中二模式", type: "toggle" },
					{ key: "showDistanceDisplay", name: "手杀距离显示", type: "toggle" },
					{ key: "audioEasterEggs", name: "武将彩蛋", type: "toggle" },
					{ key: "wujiangbeijing", name: "武将背景", type: "toggle" },
					{ key: "shiliyouhua", name: "官方势力", type: "toggle" },
					{ isTitle: !0, name: "游戏功能" },
					{ key: "enableRecastInteraction", name: "重铸交互", type: "toggle" },
					{ key: "enableEquipCopy", name: "装备入手", type: "toggle" },
					{ key: "mx_decade_characterDialog", name: "自由选将筛选框", type: "select" },
					{ key: "rightLayout", name: "左右布局", type: "select" },
					{ key: "eruda", name: "调试助手", type: "toggle" },
				],
			}[tabId] || []
		);
	})(n);
	a.forEach(configItem => {
		if (configItem.isTitle) {
			return void (ui.create.div(".decade-config-section-title", t).innerHTML = configItem.name);
		}
		const configKey = `extension_十周年UI_${configItem.key}`,
			configDef = config[configItem.key];
		if (!configDef) return;
		const item = ui.create.div(".decade-config-item", t),
			table = document.createElement("table");
		table.className = "decade-config-table";
		const tr = document.createElement("tr"),
			tdName = document.createElement("td");
		((tdName.className = "decade-config-name"), (tdName.innerHTML = configItem.name));
		let introDiv = null;
		configDef.intro &&
			((introDiv = document.createElement("div")),
			(introDiv.className = "decade-config-intro"),
			(introDiv.innerHTML = configDef.intro),
			(tdName.onclick = function (e) {
				(e.stopPropagation(), introDiv.classList.toggle("show"));
			}));
		const tdControl = document.createElement("td");
		if (((tdControl.className = "decade-config-control"), "toggle" === configItem.type)) {
			const e = lib.config[configKey],
				t = void 0 !== e ? e : configDef.init,
				n = document.createElement("div");
			n.className = "decade-config-toggle " + (t ? "on" : "off");
			const c = document.createElement("div");
			((c.className = "decade-config-toggle-slider"),
				n.appendChild(c),
				(n.onclick = function () {
					const newValue = !lib.config[configKey];
					(game.saveConfig(configKey, newValue), (n.className = "decade-config-toggle " + (newValue ? "on" : "off")), configDef.onclick ? configDef.onclick(newValue) : configDef.update && configDef.update());
				}),
				tdControl.appendChild(n));
		} else if ("select" === configItem.type) {
			const e = lib.config[configKey] ?? configDef.init,
				t = document.createElement("div");
			((t.className = "decade-config-options"),
				Object.keys(configDef.item).forEach(key => {
					const option = document.createElement("div");
					((option.className = "decade-config-option"), key === e ? (option.classList.add("selected"), (option.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(168, 237, 234, 0.4) !important;")) : (option.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: none !important;"));
					let displayText = configDef.item[key];
					if ("string" == typeof displayText && displayText.includes("<")) {
						const e = document.createElement("div");
						e.innerHTML = displayText;
						displayText = (e.textContent || e.innerText).trim() || key;
					}
					((option.textContent = displayText),
						(option.dataset.value = key),
						(option.onclick = function () {
							if (this.dataset.value === lib.config[configKey]) return;
							(Array.from(t.children).forEach(child => {
								(child.classList.remove("selected"), (child.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: none !important;"));
							}),
								this.classList.add("selected"),
								(this.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(168, 237, 234, 0.4) !important;"));
							const newValue = this.dataset.value;
							configDef.onclick ? configDef.onclick(newValue) : (game.saveConfig(configKey, newValue), configDef.update && configDef.update());
						}),
						t.appendChild(option));
				}),
				tdControl.appendChild(t));
		} else if ("input" === configItem.type) {
			const e = document.createElement("input");
			((e.type = "text"),
				(e.className = "decade-config-input"),
				(e.value = lib.config[configKey] ?? configDef.init),
				e.addEventListener("blur", function () {
					const newValue = this.value.trim();
					newValue && (configDef.onblur ? configDef.onblur.call(this) : game.saveConfig(configKey, newValue), configDef.update && configDef.update());
				}),
				e.addEventListener("keydown", function (e) {
					"Enter" === e.key && this.blur();
				}),
				tdControl.appendChild(e));
		}
		if ((tr.appendChild(tdName), tr.appendChild(tdControl), table.appendChild(tr), introDiv)) {
			const e = document.createElement("tr"),
				t = document.createElement("td");
			((t.colSpan = 2), t.appendChild(introDiv), e.appendChild(t), table.appendChild(e));
		}
		item.appendChild(table);
	});
}
function c() {
	a();
}
function o() {
	t && (t.remove(), (t = null));
}
export { o as hideDecadeConfigWindow, c as showDecadeConfigWindow };
