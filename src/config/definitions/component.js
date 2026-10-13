import { lib } from "noname";
import { createCollapseEnd as createCollapseEnd, createCollapseTitle as createCollapseTitle } from "../utils.js";
import { onGainSkillsVisibleUpdate as onGainSkillsVisibleUpdate, onLoadingStyleUpdate as onLoadingStyleUpdate, onPlayerMarkStyleUpdate as onPlayerMarkStyleUpdate, onGTBBYangshiClick as onGTBBYangshiClick, onJDTSYangshiUpdate as onJDTSYangshiUpdate, onJindutiaoSetUpdate as onJindutiaoSetUpdate, onJindutiaoSetBlur as onJindutiaoSetBlur, onJindutiaoYangshiUpdate as onJindutiaoYangshiUpdate } from "../handlers/component-handlers.js";
const p = createCollapseTitle("component_title", "部件管理"),
	s = { name: "进度条", init: "2", intro: "切换进度条样式", item: { 0: "关闭", 1: "手杀进度条", 2: "十周年PC端进度条", 3: "十周年客户端进度条", 4: "一将成名进度条", 5: "OL客户端进度条" }, update: onJindutiaoYangshiUpdate },
	g = { name: "进度条速度", init: "200", intro: "设置玩家进度条的时间间隔", item: { 10: "10毫秒/次", 50: "50毫秒/次", 100: "100毫秒/次", 200: "200毫秒/次", 500: "500毫秒/次", 800: "800毫秒/次", 1e3: "1秒/次", 2e3: "2秒/次" } },
	u = { name: "进度条高度", init: "27.5", intro: "输入0~100的数值，设置玩家进度条的高度百分比（默认值为22）", input: !0, onblur: onJindutiaoSetBlur, update: onJindutiaoSetUpdate },
	c = { name: "阶段提示", init: "0", intro: "切换阶段提示样式", item: { 0: "关闭", 1: "手杀阶段提示", 2: "十周年阶段提示", 3: "OL阶段提示", 4: "欢乐阶段提示" }, update: onJDTSYangshiUpdate },
	f = { name: "狗托播报", init: "0", intro: "开启后，顶部会出现滚动播报栏", item: { 0: "关闭", 1: "手杀", 2: "十周年" }, onclick: onGTBBYangshiClick },
	h = { name: "播报字体", init: "on", intro: "切换狗托播报字体（即时生效）", item: { on: '<font face="shousha">手杀', off: '<font face="yuanli">十周年' } },
	y = { name: "时间间隔", init: "60000", intro: "更改狗托播报出现的时间间隔", item: { 3e4: "0.5min/次", 6e4: "1min/次", 12e4: "2min/次", 3e5: "5min/次" } },
	B = { name: "标记样式", init: "decade", item: { red: "红灯笼", yellow: "黄灯笼", decade: "十周年" }, update: onPlayerMarkStyleUpdate };
const O = {
		name: "更换光标+loading框",
		intro: "可以更换局内选项框以及光标",
		init: "off",
		item: (function () {
			const basePath = `${lib.assetURL}extension/十周年UI/image/ui/dialog`,
				createPreview = filename => `<div style="width:60px;height:40px;position:relative;background-image: url(${basePath}/${filename});background-size: 100% 100%;"></div>`;
			return { off: "关闭", on: createPreview("dialog2.png"), On: createPreview("dialog1.png"), othersOn: createPreview("dialog3.png"), othersOff: createPreview("dialog4.png"), onlineUI: createPreview("dialog5.png") };
		})(),
		update: onLoadingStyleUpdate,
	},
	S = { name: "获得技能显示", init: "othersOn", item: { on: "显示", off: "不显示", othersOn: "显示他人" }, update: onGainSkillsVisibleUpdate },
	T = { name: "武将详情插件", init: !0, intro: "开启后，点击武将可查看详细信息" },
	j = createCollapseEnd("component_title"),
	k = { component_title: p, jindutiaoYangshi: s, jindutiaoST: g, jindutiaoSet: u, JDTSYangshi: c, GTBBYangshi: f, GTBBFont: h, GTBBTime: y, playerMarkStyle: B, loadingStyle: O, gainSkillsVisible: S, characterPlugin: T, component_title_end: j };
export { h as GTBBFont, y as GTBBTime, f as GTBBYangshi, c as JDTSYangshi, T as characterPlugin, k as componentConfigs, p as component_title, j as component_title_end, S as gainSkillsVisible, g as jindutiaoST, u as jindutiaoSet, s as jindutiaoYangshi, O as loadingStyle, B as playerMarkStyle };
