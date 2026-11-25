## 扩展介绍

「十周年UI配置中心 → 其他设置 → 飞牌动画记录器」提供开关，默认沿用原先自动开启的状态。关闭立即停止采样和钩子，下次启动不导入记录器；开启时按需加载、即时生效。管理面板及样式只在主动打开时加载，关闭状态也可按需查看或删除历史记录，不会自动开启记录。飞牌诊断独立保存最近的卡牌移动、实体牌与展示副本关系、WAAPI/CSS动画起终点、途中坐标及调用栈，不写入战报或录像列表。高频采样保留至多2000条/100万字符；副本来源、动画端点、移动调用及展示牌直接修改 transform 的关键轨迹另外保留至多4000条/300万字符，避免样式刷新挤掉起飞证据。导出的 `recent.keyRows` 与 `recent.rows` 分别为关键轨迹和近期明细；同一记录可能同时存在于两者。记录器已加载时可按 `Ctrl+Shift+L`，也可随时在「十周年UI配置中心 → 其他设置 → 管理飞牌诊断记录」按需打开管理窗口；出现异常后点击「保存异常现场」，可锁定当前记录供后续排查。支持导出 JSON、关闭记录、清空，以及「关闭并删除」。关闭状态会记住，重启后仍可读取此前保存的记录。

一将成名样式（`othersOff → xinsha`）统一隐藏本体「AI代选」按钮，包括弃牌阶段、技能弃牌和交牌等场景，不依赖雷的一将扩展；保留全选手牌、确认取消及本体结算。按钮按原生 `link` 识别，保留控件关闭生命周期，Online及其他样式不受影响。当前6.4.5 APK的弃牌操作栏没有此独立代选按钮；原版AI助手是服务器建议驱动的牌/目标/按钮高亮和说明气泡，属于另一套功能。来源与适配范围见 `verification/yjcm-ai-select-source.json`；静态字节码核对不等于官方客户端实机验证。

一将成名底部「互动道具」按钮使用独立的 `src/ui/xinsha-props.js`，参照Online的选道具、点击角色和长按连续赠送交互，保留本体投掷广播与录像。原版四种道具为鲜花、菜叶、鸡腿、水桶，对应本体 `flower/egg/wine/shoe` 协议；不接入虚构库存或货币。按钮和图标使用官方素材，飞行静图保留比例，等待资源就绪后播放300ms，命中衔接原版Spine及音效；水桶按官方上边界判断分别处理飞行落点和骨骼偏移。Spine复用十周年已有3.6画布，收起面板清理选择和长按状态，换风格和结算回收本功能演出，其他风格保留原流程。面板布局为本地适配，不宣称与原客户端逐像素一致。

资源位于 `assets/animation/xinsha-props/`、`image/ui/xinsha-props/`、`audio/xinsha-props/`。一将成名6.4.5 APK、`GameAniLayer.onPlaySendItemAni`、图集裁切、原始骨骼/独立alpha与哈希记录保存在 `../雷的一将/tests/ai-interaction-source.json` 和 `ai-interaction-assets.json`。验证入口 `node ../雷的一将/tests/ai-interaction-browser.cjs`；自动互动的三个开关位于雷的一将「AI互动」。浏览器夹具不替代完整Electron实局、手机实机及真实多客户端联机。

无名杀游戏的界面美化扩展

Online 判定生效/失效动画通过 `animation.cap.playSpineTo` 直接挂在卡牌上，复用皮肤切换的 Spine 4.0 运行库及有上限的卡牌播放器池。按官方 `126×174` 卡牌、原点 `(63,87)`、实际逻辑卡宽 `/126` 绘制，不使用共享 Worker 跟随或调整共享画布层级。结束、取消或卡牌移除后回收画布；其他风格保留 `effect_panding` 原路径。`node ../雷的ol/verification/judge-on-card-browser.cjs` 验证真实绘制、官方 GPU 变换、桌面/手机仿真、缩放和清理；完整 Electron 实局与手机实机待验证。

Online 样式的乐不思蜀、兵粮寸断、闪电判定区标记使用 `image/ui/judge-mark/FX_LBSS_icon_play_dynamic.png`、`FX_BLCD_icon_play_dynamic.png`、`FX_SD_icon_play_dynamic.png`。三种图标统一 `background-size: 95%`、`background-position: 50% 80%`；失败回退原图，其他样式保持原图。`node tests/judge-mark-online-browser.cjs` 检查指定参数、原图回退、节点复用和实际广播挂入入口，并保存新旧对照截图。

Online 可发动的主动/被动技能按钮分别叠加 `fx_UI_AnNIu_ZhuDong_play_dynamic.png` / `fx_UI_AnNIu_BeiDong_new_play_dynamic.png` APNG，按亮矩形区域缩放至按钮边缘，不拦截点击。已进入本地技能触发/结算流程后，即使 `.usable` 消失或次数被扣除，也保持对应动态框；主动技能全程使用 `btnnOL42.png` 且不套灰度滤镜，结束或取消后恢复。阴阳图标为按钮直接子元素，固定左上角 `3px / 3px`，使用 `skillitem_yinyang_bg.png` / `skillitem_yinyang_bg_1.png`；本地实际状态改变时通过 `decadeui:conversion-icon-change` 提供 skill、state 和实际 icon，供雷的 ol 按钮特效定位。首次创建和重复刷新不发送，远端同名技能不改变本地按钮。

被动技能遵循本体 `GameEvent.trigger` → `arrangeTrigger` → `lib.filter.filterTrigger` → `game.createTrigger` → 询问/cost/技能内容的通用流程。UI 不重复执行 `filter`，而是读取已进入询问或结算的本地技能事件、原生 `sourceSkillFor` 和父事件链；通过技能事件完成 Promise 刷新，支持嵌套选牌、目标选择和子技能，未为破军设置专属判断。验证入口：`node tests/online-skill-usability-conversion.cjs`；测试执行本体原生 `filterTrigger/sourceSkillFor`，覆盖 player/source/target/global、过滤失败、次数/轮次/临时禁用、技能失去、远端隔离及已扣次数期间保持动态框。完整 Electron 对局仍待复测。

Online 按钮音效在开启增强音效时使用 `audio/button4.ogg`，卡牌点击保留原音效；`node tests/online-button-audio.mjs` 检查真实 DOM 下嵌套控件、菜单、普通技和限定技、去重及风格隔离，同时验证指定的六个 OGG 文件可加载解码。完整 Electron 对局及实机试听仍需复测。

Online 底部道具按钮接入官方鲜花、美酒、鸡蛋、草鞋资源：选中后连续点击其他角色，长按每200ms发送一次，并保留100ms发送间隔。五组原版 Spine 和8段音效保存在本扩展，固定复用皮肤切换的第一共享画布 `chukuang-canvas` / `chukuangWorker`，飞行、命中、正向光效、跟随和停止均走第一画布；裴秀使用第二共享画布的临时层级；通过皮切现有初始化 API 按需创建并复用，不另建专用 Canvas；按距离、二次贝塞尔曲线和原配置速度飞行，草鞋两路间隔200ms位移，分别衔接飞行/命中动作、受击摆动或正向互动光效。选择框只使用原版黄色素材，独立状态类避免本体 `.selected` 红光；面板按参考图比例缩放及定位，位置独立于手牌区。道具窗口开启时在window捕获阶段接管角色的鼠标、双击与触摸事件，避免触发拍一拍或人物面板，关闭后恢复。关闭、结束和取消回收本功能自己的节点与跟随任务；其他风格保留本体原投掷。已删除5张无引用的旧礼物图，其他风格仍使用的本体投掷素材保留。来源和适配边界见 [官方道具核对](verification/online-props-source/report.md)。`node verification/online-props-browser.cjs` 使用真实皮切 Worker、按钮入口和音频验证四种道具、两路草鞋、连续/长按、联机消息参数、录像条目、1/1.25缩放与宽主视角头像、第一画布只按需建立一次、裴秀地图所在第二画布降层或隐藏时的演出、共享画布其他特效保留、神黄忠命中彩蛋去重和结束清理。`node verification/online-props-browser.cjs --mobile` 检查移动分支、DPR 3、触摸及相同清理路径；这是桌面浏览器模拟移动分支，不替代手机真机。完整 Electron 实局、真实多客户端联机与官方逐帧画面对照未完成。

## 使用方法

### 普通用户游玩

1. 下载Releases文件
2. 将整个文件夹放入无名杀的 `extension` 目录下
3. 打开本体设置-选项-通用-自动导入扩展
4. 重启游戏，在扩展列表中启用"十周年UI"

### 开发模式

1. 克隆本项目到本地
2. 放入无名杀根目录的 `packages/extension` 文件夹，命名为"十周年UI"
3. 返回无名杀根目录依次执行：

```bash
pnpm i
pnpm dev
```

详情见：[如何运行无名杀（程序员版）](https://github.com/libnoname/noname/wiki/%E5%A6%82%E4%BD%95%E8%BF%90%E8%A1%8C%E6%97%A0%E5%90%8D%E6%9D%80%EF%BC%88%E7%A8%8B%E5%BA%8F%E5%91%98%E7%89%88%EF%BC%89)

## 使用帮助

详细的配置说明请参考 `docs/` 目录：

- [卡牌皮肤注册](docs/card-skin-api.md) - 外部扩展注册卡牌皮肤的方法
- [前缀角标注册](docs/prefix-mark-api.md) - 武将前缀角标的配置方法
- [动态皮肤配置](docs/dynamic-skin-api.md) - Spine骨骼动画皮肤的配置方法
- [露头头像配置](docs/outcrop-avatar-api.md) - 露头头像的目录结构和API
- [骨骼动画定位](docs/spine-positioning-api.md) - Spine骨骼动画定位系统说明
- [版本更新日志](docs/update.md) - 十周年UI版本更新日志
- [报错兜底处理](docs/secret.md) - 与无名杀版本不匹配下游玩方法

## 相关链接

- 无名杀游戏：https://github.com/libnoname/noname

## 相关人员

- 原创作者：短歌
- 手杀UI原作者：橙续缘
- 上任维护者：萌新(转型中)
- 当前维护者：点点

## 许可证

GPL-3.0


神武将选势力美化已接入一将成名分支（`othersOff → xinsha`），由 `src/ui/xinsha-faction-dialog.js` 和同名专用 CSS 承载，运行不依赖雷的ol或雷的一将。沿用本体势力伪卡、原选择顺序、直接确认、取消与结算；本地 `chooseControl` 势力询问复用现有转接，AI和远端仍走原流程，普通武将的唯一势力不弹窗。魏蜀吴群使用当前6.4.5 APK原版151×182竖牌，392高窗口、50间距和65顶距来自 `windowSelectCountry`；布局、图集和字节码见 `verification/xinsha-faction-source.json`。晋参照既有自制图片制作独立紫色牌底，文字使用原版 `fzbw.ttf`，不覆盖OL晋图片；该晋牌属于本地适配，来源见 `verification/xinsha-faction-jin-source.json`。保留通用隐藏恢复及现有倒计时，可取消询问保留原生取消栏。`node verification/xinsha-faction-browser.cjs` 检查真实Dialog/十周年创建与open、三种风格、三档缩放、禁用、键盘/鼠标/触屏、隐藏恢复和关闭清理；选择回传另由 `faction-control-choice.mjs` 与 `faction-control-browser.cjs` 检查。浏览器夹具通过不代表完整Electron实局、手机实机或真实联机验证。

一将人物信息框复用十周年UI武将卡牌和当前皮肤，遵循动静开关、djtoggle及场上实际等阶；预览前景/背景共用独立动皮画布，支持露头裁切，关闭和切换武将时释放资源。人物、手牌、装备和判定区信息框保留原版素材，九宫格先合成为一张底图，消除缩放接缝。验证入口：`node verification/info-popup-lifecycle-browser.cjs`、`node verification/yjcm-character-browser.cjs`、`node verification/yjcm-tooltip-browser.cjs`。
