# 动态皮肤配置说明

本章节将介绍十周年UI的动态皮肤系统配置方法。

## 一、功能说明

动态皮肤是基于Spine骨骼动画的武将皮肤系统，可以让武将立绘动起来。

- 打开动态皮肤开关后直接替换原有武将皮肤
- 动态皮肤参数表：https://docs.qq.com/sheet/DS2Vaa0ZGWkdMdnZa
- 相关文件放到 `path.json` 中“动态皮肤文件”指定的目录（默认 `assets/dynamic`）

启用条件：用户在确保安装对应的《皮肤切换》和《千幻铃音》扩展前提下，在十周年UI设置中开启"动态皮肤"选项。

## 二、文件位置

| 文件类型     | 位置                       |
| ------------ | -------------------------- |
| 参数配置文件 | `src/skins/dynamicSkin.js` |
| 骨骼资源文件 | `path.json` 的“动态皮肤文件”目录 |

## 三、配置格式

编辑 `src/skins/dynamicSkin.js` 中的 `dynamicSkinConfig` 对象：

```javascript
武将名: {
  皮肤名: {
    name: "xxx",           // 必填，骨骼名称（不带.skel后缀）
    action: "xxx",         // 播放动作，一般是 DaiJi
    x: [10, 0.5],          // left: calc(10px + 50%)，默认[0, 0.5]
    y: [10, 0.5],          // bottom: calc(10px + 50%)，默认[0, 0.5]
    scale: 0.5,            // 缩放大小，默认1
    angle: 0,              // 旋转角度，默认0
    speed: 1,              // 播放速度，默认1
    hideSlots: [],         // 隐藏的部件
    clipSlots: [],         // 裁剪的部件（仅露头动皮）
    background: "xxx.jpg", // 背景图片
  }
}
```

## 四、资源文件

### 1. 文件结构

每个动态皮肤需要三个文件：

```
assets/dynamic/
└── 武将名/
    └── 皮肤名/
        ├── xxx.skel    # 骨骼数据文件
        ├── xxx.atlas   # 图集描述文件
        └── xxx.png     # 纹理图片
```

### 2. 路径对应关系

`name` 参数对应 `path.json` 的“动态皮肤文件”目录下的路径：

| name 参数              | 实际文件路径                               |
| ---------------------- | ------------------------------------------ |
| `mychar/默认/daiji`    | `assets/dynamic/mychar/默认/daiji.skel`    |
| `卢弈/姝丽风华/daiji2` | `assets/dynamic/卢弈/姝丽风华/daiji2.skel` |

## 五、添加新动皮

### 第一步：准备Spine骨骼文件

- 使用Spine软件导出骨骼动画
- 导出格式：二进制(.skel) + 图集(.atlas + .png)
- 版本要求：Spine 3.8兼容格式

### 第二步：放置资源文件

```
assets/dynamic/mychar/皮肤名/
├── daiji.skel
├── daiji.atlas
└── daiji.png
```

### 第三步：添加参数配置

编辑 `src/skins/dynamicSkin.js`：

```javascript
export const dynamicSkinConfig = {
	mychar: {
		皮肤名: {
			name: "mychar/皮肤名/daiji",
			x: [0, 0.5],
			y: [0, 0.45],
			scale: 0.8,
			speed: 1,
		},
	},
};
```

### 第四步：共享皮肤（可选）

在 `setupDynamicSkin` 函数中添加共享配置：

```javascript
const dynamicSkinExtend = {
	re_luyi: decadeUI.dynamicSkin.luyi,
};
decadeUI.get.extend(decadeUI.dynamicSkin, dynamicSkinExtend);
```

## 六、配置示例

```javascript
luyi: {
  姝丽风华: {
    name: "卢弈/姝丽风华/daiji2",
    shan: "play3",
    x: [0, 0.438],
    y: [0, 0.396],
    angle: -2,
    scale: 1.07,
    shizhounian: true,
    // 出场动画
    chuchang: {
      name: "卢弈/姝丽风华/chuchang",
      x: [0, 0.777],
      y: [0, 0.36],
      scale: 0.7,
      action: "play",
    },
    // 攻击动画
    gongji: {
      name: "卢弈/姝丽风华/chuchang2",
      x: [0, 0.812],
      y: [0, 0.254],
      scale: 0.8,
      action: "gongji",
    },
    // 特殊技能动画
    teshu: {
      name: "卢弈/姝丽风华/chuchang2",
      x: [0, 0.812],
      y: [0, 0.254],
      scale: 0.8,
      action: "jineng",
    },
    // 背景动画
    beijing: {
      name: "卢弈/姝丽风华/beijing",
      x: [0, 0.29],
      y: [0, 0.5],
      scale: 0.4,
    },
    // 指示线特效
    zhishixian: {
      name: "卢弈/姝丽风华/shouji2",
      scale: 0.5,
      speed: 0.8,
      delay: 0.4,
      effect: {
        name: "卢弈/姝丽风华/shouji",
        scale: 0.5,
        speed: 0.8,
        delay: 0.25,
      },
    },
  },
}
```

## 七、调试方法

控制台执行：

```javascript
// 停止当前动皮
game.me.stopDynamic();

// 测试新配置
game.me.playDynamic({
	name: "xxx",
	loop: true,
	x: [0, 0.5],
	y: [0, 0.5],
	scale: 0.5,
	angle: 0,
	speed: 1,
	hideSlots: [],
	clipSlots: [],
});
```

## 八、注意事项

1. 动态皮肤需要WebGL支持，部分老旧设备可能无法使用
2. 同时显示的动皮数量过多会造成严重卡顿
3. 骨骼文件需要使用Spine 3.8兼容格式导出
4. 大尺寸纹理图片会影响性能，建议优化图片大小

## 九、人物与背景分别裁切

十周年（`on`）和一将成名（`othersOff`）在开启“动皮露头”时，人物 canvas 保持原来的 `200px` 高度、缩放和位置。背景顶部单独裁去 `10%`，即在 200px 画布中留出 20px 的露头空间。

- 独立背景动画：千幻聆音/皮肤切换使用 `beijing`、`player.beijing` 或 `dybg`。`src/ui/dynamicOutcrop.js` 在实际 `dynamic.play` 提交前设置背景自身的 `clip`，保留双将左右分区和更小的自定义裁切；人物自身的 `clip` 不变。千幻聆音重定义 `playDynamic` 不会覆盖这层处理。
- 同一骨骼内的背景：继续使用皮肤配置的 `clipSlots`，由 Spine renderer 对指定背景附件裁切顶部 10%。必须列出该皮肤真实的背景附件名，不能靠 canvas 的 CSS 自动识别背景；没有对应配置时无法单独分离此类背景。
- 图片背景：`decadeLayout.css` 将背景伪元素、`.primary-bg` 和 `.deputy-bg` 单独按 200px 底部对齐并裁去顶部 20px，不对人物层追加背景裁切。
- 开关切换：同步已有播放器（包括阵亡角色）的 `outcropMask`，通过已完成双将左右分区的参数重播独立背景皮肤，避免重复累加位置偏移；关闭后还原正常背景范围。其他样式及预览窗口保留原有行为。

注意：原生简化播放器本身不负责加载 `beijing` 动画；独立背景动画仍由已安装的动皮扩展播放，本处理复用其播放链路。

### 椭圆弧顶的四个参数

十周年 / 一将成名开启动皮露头时，`.dynamic-wrap` 顶部圆角通过四个 CSS 变量控制，人物 canvas 继承该圆角：

```css
--dynamic-top-left-x: 60px;  /* 左上角水平半径 */
--dynamic-top-left-y: 20px;  /* 左上角垂直半径 */
--dynamic-top-right-x: 60px; /* 右上角水平半径 */
--dynamic-top-right-y: 20px; /* 右上角垂直半径 */
```

对应 `border-radius` 使用 `/` 分隔水平和垂直半径，底部两个角保持 8px。背景伪元素单独使用 8px 圆角，背景自身的顶部裁切继续生效。

换肤销毁旧播放器时，外部换肤实现可能删除 `player.dynamic`。新动态 canvas 挂入 `.dynamic-wrap` 时会重新安装播放裁切桥接，确保后续换肤沿用首次播放的背景裁切参数；不会因为曾经安装过就跳过新播放器。
