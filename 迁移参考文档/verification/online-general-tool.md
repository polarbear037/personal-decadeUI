# Online 武将信息与标记弹窗

官方参考为指定的 OL 安卓 4.0.2 APK。`mMt.showGeneralTipHandler` 由牌局头像的武将详情入口调用，经 `GeneralToolWindow` 注册名打开 `qos`。`qos` 继承 `BFi`，使用 `Yki` 的窗口背景和关闭按钮。REA 清单摘要为 `ev_32483949fee139f6db2757f22d574f2cbe5546f2c7637023601d83f12254c266`。APK、内层 `217defbb!main.sgs`、脚本范围和运行素材的成员及 SHA-256 见 [素材清单](online-general-tool-assets.json)。

| 部件 | APK 设计坐标 |
| --- | --- |
| 窗口逻辑区域与遮罩 | 1324×600，遮罩透明度 0.7 |
| `wnd_bg_medium` | `(122, 0)`，1080×600，九宫格上右下左 80、100、80、100 |
| 武将框与头像 | `(285, 105)`，框底 172×228，头像在框内 `(27, 4)`，139×214 |
| 武将名称与体力 | `jki → xns → Hns/$ki`，势力字 26，武将名 22，体力珠按武将初始体力由下往上排列 |
| 技能区底图与滚动区 | 底图 `(609, 72)` 557×496，滚动区 `(612, 80)` 555×482 |
| 技能区字号与间距 | `VFi/YFi/wYt` 的标题和技能名 32，正文 30，正文宽 490，衍生说明宽 457，前导 4、字距 1 |
| 三列统计值 | `BFi` 的表格原点 `(155,435)`，三列值相对坐标及宽度为 `(1,91,136)`、`(138,90,152)`、`(292,91,136)`，字号 30、水平居中 |
| 关闭按钮 | `Yki.addCloseBtn → vOi → mxt.InitSkin`，中心 `(1160,25)`，`wnd_cls` 尺寸 36×35，左上角 `(1142,7.5)` |

`hB.SemiBold` 指向 `res/assets/fontApp/FZLBGBK.ttf`。安卓的 `yxt.Create` 和 `Qx.Create` 均默认使用该字体，复用项目内同 SHA-256 的 `ui/assets/fonts/FZLBGBK.ttf`（`19e6426eee18e655f4d247976a73fd51cefc03e599667e224497c73d598762b8`）。

`qos.updateGetWayUI` 对人气整数使用 `toString()`。`Vwt.WinRateStr` 优先用战绩对象的 `WinRate`，常规值保留 1 位小数，旧数据回退 `O.WpctNormalDesc` 取整数。`O.RunNormalRateDesc` 使用 `toFixed(1)`。本地面板以 10–9999 的整数模拟人气值，以 0.1 个百分点为步长模拟 30%–70% 胜率与 0%–10% 逃跑率。每局按玩家对象缓存，在 `gameStart` 重置。

四张定尺寸九宫格在整数像素坐标合成后整体缩放，其余图集帧按 `sourceSize` 和 `spriteSourceSize` 裁切。页面使用无名杀立绘、当前技能和动态技能说明。暗置副将使用官方遮蔽图标和文案，装备、判定、可见手牌和原有独立资料入口继续使用本地数据与交互。未移植官方账户服务、官方技能简述数据与开窗动画。标记介绍和人物面板使用 103 层，标记关闭层使用 102 层。

`node verification/online-general-tool-browser.cjs --screenshot` 在 Edge 中启动无名杀页面与十周年UI，验证右键、触屏长按、滚轮滚动、主副将切换、暗将信息遮蔽、切换后居中、关闭和恢复暂停状态。检查关闭按钮缩放后的边界和原版中心点命中，以及带前缀的武将名、体力珠、字体文件加载、三列统计的坐标、范围、位数和同局重开一致性。标记用本体 `ui.click.intro` 打开，验证与确认栏重叠时实际命中弹窗，以及切换其他风格时无 Online 层级标记。`node --check` 和 `git diff --check` 通过。已查看 [桌面夹具截图](online-general-tool-desktop.png)。官方客户端运行画面对照、完整 Electron 实局和手机实机仍未验证。
