# Online 互动道具核对

参考为指定 `G:/yoka.game_g_android_4.0.2.apk`，SHA-256 `38d46c46f91796e6006776354a9b3da4cf19832d9a89a0668510e7906ba2011d`。本次复用同一 REA 会话已核对的 APK 成员与身份，Evidence `ev_32483949fee139f6db2757f22d574f2cbe5546f2c7637023601d83f12254c266`，父记录 `ev_edcf0b916ee34807938588035c3ed96b6f776080202e0b1ddb6b950602425eab`。主脚本 `217defbb!main.sgs` 的 SHA-256 为 `dfd781ab2ed667c2576da52f77170244704a525ab28daf3139a2c1a50e4440ad`。

本目录保留 APK 内 `WP`（道具参数）、`Vvi`（飞行/命中）、`yns`（局内道具窗口）、`sOi`（窗口布局）、`fCs`（选中道具）、`lns`（使用和长按）片段。逐文件原文范围与哈希见 `provenance.json`。REA 聚焦分析父 Evidence `ev_6377c862723d37d42cb24c5ab85c23b822020cf4358b937529f6ccd31c7fb82d`，摘要 `ev_4910fb2cdac97a2e2de982f403f3a7b71f36713713ebd1b31d57aef66acf0324`；6段 JS 解析成功。外部依赖、动态属性和服务端状态未执行，不将静态分析当作官方实机画面验证。

`gn_paijuhudong` 具体参数来自已有官方运行缓存 `list7.sgs.zip!list7.sgs`，SHA-256 `50f0bd3f57dd50f57303cb154df1da60e236559554eb267a91dbd4e4b8c79b5e`。该缓存身份与 APK 分开记录，选取鲜花、美酒、鸡蛋、草鞋四项，沿用此按钮原有范围。未扩展到原版其余道具。

| 道具 | Spine | 动作 | 缩放 | 速度参数 | 命中 |
| --- | --- | --- | --- | --- | --- |
| 草鞋 | `fx_uihd_caoxie` | `fly1→hit1`、`fly2→hit2`，第二路位移晚200ms | 0.8 | 26 | `Ahit` 摆动 |
| 鸡蛋 | `Ol_DaoJu_jidan` | `fly1→hit1` | 1.2 | 26 | `Bhit` 摆动 |
| 鲜花 | `fx_uihd_huashu` | `fly1→hit1` | 1 | 26 | `Nhit` 正向光效 |
| 美酒 | `fx_uihd_qingmeijiu` | `fly1→hit1` | 1 | 21 | `Nhit` 正向光效 |

`playType=2`，飞行时长为逻辑距离×0.01÷速度×1000ms；草鞋、鸡蛋 `curveParam=0,0.5`，鲜花、美酒 `curveParam=0.1,0.2`，控制点沿上侧法线抬高距离/2×随机弧度。读取原配置首路草鞋偏移、多次互动落点扩散和200ms启动间隔。飞行骨骼循环，抵达后停止飞行，播放非循环命中。`Vvi.PlayEffSound` 对应 `voice/paijuhudong`；移动端 `GetEffectSound` 实际映射 `/res/local/voice/paijuhudong/*.ogg`。正向光效为 `FX_MatchGame_daoju_shouji3`，原版限制每角色至少间隔1秒。负向摆动读取原 `playHudongShake` 的12帧位移关键帧，本地按60fps对应200ms执行。

全部骨骼为 Spine `4.0.56`，原 `.skel`、`.atlas.txt`（仅改扩展名 `.atlas`）和所引用PNG保持字节一致。五组素材15个文件、8段OGG、6张图集裁切均来自 APK；5张道具图标来自官方资源端，APK 缓存中未发现相应图标。图标路径依据 APK `AppItemSmallIconUrl` 和本次官方 `res/config/list1.sgs` 商品映射（缩写字段 `a/m` 为ID/PicID）核对，选定商品行保存在 `goods.json`。该在线配置同样不冒充 APK 字节。34个实际资源的源路径、成员或官方URL、裁切和SHA-256见 `assets.json`；骨骼动作与时长见 `animations.json`。运行时全部本地加载，不访问资源端。

播放只使用皮肤切换原有 `playEffect/stopEffect` 与 `_startFollowUpdate`，通过本功能自己的逻辑坐标锚点更新贝塞尔路线，不创建新画布，不清空皮切其他动画。每个实例使用独立ID和跟随ID；结束仅回收这些ID。显式 `json:false`，避免皮切自动探测JSON产生404。

交互保留本体 `throwEmotion` 广播、联机 `game.send("throwEmotion", target, emotion)` 与录像 `throwEmotion` 条目。100ms发送间隔依据 `ROt.SendInteractPropUseReq`，长按200ms依据 `kP.UseTime/lns.longPressSendProp`。本地没有官方账号库存、菜篮子扣费、购买和服务端概率，不伪造账户余额；原按钮的消耗数字继续作为展示。官方机器人表情/服务器彩蛋概率未新增模拟。神黄忠统一在第一路实际命中时通知一次，防止两只鞋和旧600ms路径重复播报。

旧 `ui/assets/lbtn/OL_line/gift/{hua,jidan,qingjiu,tuoxie,xianhua}.png` 在移除原礼物面板后已无运行时引用，已删除；其他风格仍使用的本体 PNG 未删除。

用户提供的现状/原版参考图为938×422、640×286。按原版面板/画面比例折算到1720宽布局基准（这是本地参考图适配，不声称APK固定舞台宽度），面板源几何565×205，左距80，纵向按参考图155/286的画面高度定位；`ResizeObserver` 只同步窗口变化，手牌高度不影响弹窗位置。选择状态使用 `online-prop-selected`，避开本体 `.selected:not(...)` 的红色 `box-shadow!important`，仅显示原版 `shopitem_select.png` 黄色框。

已执行 `node --check src/ui/online-props.js`、`node --check ui/lbtn/skins/online.js`、`node verification/online-props-browser.cjs`。浏览器夹具覆盖真实底部按钮、四项图标、原版字体和黄色框、单击/连续点击/200ms长按、其他玩家过滤、实际皮切 Worker/Spine起播、飞行和命中、8段音效播放、草鞋两路及神黄忠单次彩蛋、1/1.25缩放和宽主视角头像、发送与录像参数、非Online回退、关闭及结束回收。画布数量不增加；未发生JS/Worker错误或资源404。938×422回归测量面板比例、左距和纵向位置，改变手牌区高度时弹窗位置保持不动；加载本体真实红框规则确认没有红光。

截图 `../online-props-panel-selected.png`、`../online-props-reference-layout.png`、`../online-props-selected-detail.png` 及四种道具的飞行/命中截图可供核对。完整 Electron 实局、真实多客户端联机与官方运行画面逐帧对照仍未完成；本地头像比例、帧率和官方账户服务存在上述适配，不能据此宣称像素或逐帧完全一致。

原版 `Ens.onClickOverMask` 在 `InteractPropWindow/InteractPropWindow2` 显示时先返回，阻止后续人物面板和拍一拍；`bvi.onInteractPropClick` 再次点击按钮会关闭窗口。对应片段与范围见 `avatar-interaction.js` / `avatar-interaction-provenance.json`，REA 父 Evidence `ev_515e73f6390b36a7cd216d51fb9c1c87d0ba6335c689955a364808a54eb3d141`，摘要 `ev_02248f6e933fda94f676270a738c5910d4f5964b10cd0573a319b17afb1458e6`。本地原来在document捕获阶段处理道具点击，已经晚于先注册的拍一拍监听；现在由window捕获统一接管 pointer、兼容mouse、touch与dblclick。短按在pointerup发送一次，长按每200ms发送，随后的兼容click去重；关闭不保留旧连点状态。本地拍一拍模块也读取道具窗口状态，并监听开关通知重置连点记录。

冲突回归故意先注册真实拍一拍document捕获，再安装道具模块；角色节点挂载本体真实 `ui.click.avatar`。鼠标连点、原生双击、真实触摸及长按均只使用道具，不拍一拍、不打开人物面板、不暂停游戏；关闭窗口后真实拍一拍和人物面板入口分别恢复。`node verification/paiyipai-browser.cjs` 另行回归全部34个皮切表情、48条文字与原有拍一拍交互。

## 送花落点源码核验（2026-11-08）

本次重新读取指定 APK，身份仍为上述 SHA-256。REA APK 清单父 Evidence `ev_65da5542f799801e88d798da84540b3ae0ad80e0ab02057018e37567a183b770`，精确成员视图 `ev_67e053e58c37e6f138e0064bfa72249abde7c92c757a7efde36eed7bbe35be0c`。实际 APK 成员为 `assets/cache/https.__web.sanguosha.com_220_sgsolApp/217defbb`，它是 ZIP，内部成员为 `main.sgs`；前文的 `217defbb!main.sgs` 表示此嵌套关系。内层脚本 SHA-256 与上述 `mainSha256` 相同，按 `provenance.json` 范围重新截取的 `WP.js`、`Vvi.js` 与本目录内容逐字一致。两段脚本聚焦分析父 Evidence `ev_0399c42e2c7e90cbd82a04c50e217f43573d53edf5362ef7b08a4a9eaef82b9b`。

`Vvi.PlayPropAnim` 先取目标座位中心，再叠加 `100 × WP.GetRandomOffset(动画序号, Wwt.PlayingPropNum)` 范围内的 X/Y 独立随机偏移。`ShowInteractProp` 增加次数，最后一次互动结束或超时后重置次数。结合项目保存的官方运行缓存 `configuration.json` 中送花项 `randomOffsets=1,0;2,0.2;4,0.4;6,0.5;8,0.6`，第1次偏移为0，第2～3次为±20，第4～5次为±40，第6～7次为±50，第8次及以后为±60，单位为官方逻辑坐标。使用 Node VM 加载实际 `WP.js`，执行第1～10次的 `GetRandomOffset`，与本地 `online-props.js` 的档位计算全部一致。因此独立播放结束后再次送花落点固定，快速连续播放允许散开；不是所有鲜花都固定同一落点。

鲜花自身 `hit1` 使用上述落点；额外 `Nhit` 调用角色的 `playHuDongGoodEff`，APK 原文使用 `s.pos(mMt.SEAT_WIDTH>>1,mMt.SEAT_HEIGHT>>1)`，固定在角色效果层中心。两者不可混为同一落点。本地 `playGoodHit` 同样单独取目标中心，但其起终点基准是头像可见矩形，原版是座位矩形，布局差异仍需实机对照。

另发现轨迹参数差异：上述官方运行缓存的鲜花、美酒 `curveParam` 为 `0.1,0.2`，本地 `getOnlinePropRoute` 默认统一使用 `0～0.5`；前文对弧度范围的笼统描述不适用于鲜花、美酒。该差异改变中途轨迹，不改变贝塞尔曲线最终落点。本轮只核验并记录依据，未修改运行逻辑；配置依据为既有官方运行缓存，不冒充 APK 内配置或当前服务端配置，未进行官方客户端运行对照。

## 四种道具轨迹、布局及完整目标区域

继续核对并接入上述弧度差异，现鲜花、美酒为 `0.1～0.2`，鸡蛋、两路草鞋为 `0～0.5`。草鞋第一路目标偏移为发送者半宽/半高的 `(-0.15,-0.15)`，第二路无基础偏移、晚200ms启动，第6次起第二路随机偏移为±99；其余连续使用档位不变。官方脚本使用统一的场景逻辑坐标，本地通过目标角色宽度/174换算位移和速度，避免直接把固定逻辑像素叠加到已经缩放的屏幕坐标。本人发送锚点仍使用可见头像，避免本人宽 player 的手牌布局挤偏起点；其他角色使用完整 player 矩形。正向命中效果改用目标尺寸，按目标宽/174、高/232中较大的比例适配并居中，不再继承发送者头像的缩放。

APK 新增聚焦片段为 `Dns.js`、`Gns.js`、`EnsTarget.js`，范围、SHA-256和官方174×232座位常量见 `layout-provenance.json`。六段相关完整类的 REA 聚焦分析父 Evidence `ev_0f1b4c101d5dcdcf34baa4c6913f98d4b35a9440a713bbd133fc16463f630e16`，摘要 `ev_531e123b80ea6b7edc636c3b07801897d518f8322e68df0a127ce0a6d2500f04`，无解析失败；`EnsTarget.js` 保留原始方法片段，不作为独立脚本执行。

`Dns`/`Gns` 明确将80×80边框与居中的70×70道具图片分层；消耗底图在(3,61)、73×15，数字在(3,58)、41×24，菜篮子在(46,62)、14×13。本地恢复这组几何，移除原先将大图片直接绘于边框上的覆盖，并把数字从73px区域内的padding排版改为独立41px区域。`Ens.showInteractTips` 的提示为(26,105)、142×41、字号24、黄色；箭头为(63,-11)、62×58，往返移动10逻辑像素，每方向500ms。DOM通过完整目标区域的容器尺寸映射这些坐标，不再使用固定20px字号和百分比猜测尺寸。原版首击空文字时箭头Y可能因 `textHeight` 不同而变化，本地按24px提示文字高度保持统一。

`node verification/online-props-flight.cjs` 直接执行保存且已与APK字节核对的 `WP.GetRandomOffset`、`Vvi.PlayPropAnim`、`Vvi.playFlyToEnd`，与本地实际飞行计算对照。四项道具、五条动画路径、左右方向、7档连续次数、3种坐标缩放共210组，起终点、控制点、飞行时长与启动间隔全部一致。该检查使用受控Laya几何替身，证明公式和配置映射，不声称执行了官方客户端。

`node verification/online-props-layout-browser.cjs` 使用真实本体入口、CSS、角色DOM和皮切Worker/Spine，验证图标内缩、边框下缘、41px数字宽、数字与菜篮子的2px间隔、黄色提示坐标、1/1.25缩放及完整目标区域。原版命中框图集可见外缘为214×268，真实Worker采样确认按目标矩形中心绘制，覆盖132×175完整player；骨骼首帧透明，截图在实际起播140ms后取得。截图 `../online-props-panel-layout.png`、`../online-props-target-frame.png`，数据 `../online-props-layout-results.json`。`node verification/online-props-browser.cjs` 回归四道具实际演出、双鞋、音效、连点/长按、输入隔离、宽本人锚点、发送/录像、退出清理、其他风格回退，全部通过。`node --check` 检查运行模块和两个新脚本通过。未完成完整Electron实局、真实多客户端联机和官方实机逐帧画面对照。
