import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const strip = source => source.replace(/^import[^\n]+\r?\n/gm, "").replace(/^export \{[^}]+\};?\s*$/gm, "");
const scope = vm.createContext({ console });
vm.runInContext(read("src/libs/spine.js"), scope);
vm.runInContext(`${strip(read("src/animation/AnimationPlayer.js"))};globalThis.Player=t`, scope);

// 使用真实 Spine Skeleton 验证默认皮肤、仅命名皮肤和无皮肤三种合法骨骼。
for (const kind of ["default", "named", "empty"]) {
	const spine = scope.spine, data = new spine.SkeletonData();
	data.bones.push(new spine.BoneData(0, "root", null));
	const skin = kind === "empty" ? null : new spine.Skin(kind === "default" ? "default" : "costume");
	if (skin) data.skins.push(skin);
	if (kind === "default") data.defaultSkin = skin;
	data.animations.push(new spine.Animation("idle", [], 1));
	const player = Object.create(scope.Player.prototype);
	player.spine = { assets: { fixture: { skelRawData: { readSkeletonData: () => data } } }, assetManager: { get() {} }, skeletons: [] };
	assert.equal(player.prepSpine("fixture").skin ?? null, skin);
	assert.equal(player.spine.skeletons.length, 1);
}

const urlSource = strip(read("src/core/resourcePaths.js")).replaceAll("import.meta.url", JSON.stringify("http://localhost:8089/extension/十周年UI/src/core/resourcePaths.js"));
const lib = { assetURL: "" }, window = { decadeUIPath: "extension/十周年UI/" };
const urlContext = vm.createContext({ game: {}, lib, window, URL });
vm.runInContext(urlSource, urlContext);
assert.equal(decodeURI(urlContext.getResourceUrl("动态皮肤文件", "背景/beijing.png")), "http://localhost:8089/extension/十周年UI/assets/dynamic/背景/beijing.png");
window.decadeUIPath = "file:///android_asset/extension/十周年UI/";
assert.ok(urlContext.getResourceUrl("动态皮肤文件").startsWith("file:///android_asset/extension/"));
window.decadeUIPath = "https://localhost/game/extension/十周年UI/";
assert.ok(urlContext.getResourceUrl("动态皮肤文件", "背景/beijing.png").startsWith("https://localhost/game/extension/"));

const source = read("src/animation/DynamicPlayer.js"), begin = source.indexOf("\tplay(sprite)"), end = source.indexOf("\tasync _playVersioned(item)", begin);
const play = new Function(`return ({${source.slice(begin, end)}}).play`)();
let format;
const dynamic = { BUILT_ID: 0, offscreen: false, activePlays: new Map(), renderer: { hasSpine: () => false, loadSpine(_name, type) { format = type; } } };
for (const [config, expected] of [[{ json: true }, "json"], [{ skelType: "json" }, "json"], [{}, "skel"]]) {
	play.call(dynamic, { name: "fixture", ...config });
	assert.equal(format, expected);
}

// 加载期间切换/停止皮肤后，旧回调不能重新启动已取消的动皮。
let loaded, played = 0;
dynamic.renderer.loadSpine = (_name, _type, callback) => { loaded = callback; };
dynamic.renderer.playSpine = () => { played++; };
const cancelled = play.call(dynamic, { name: "cancelled" });
dynamic.activePlays.delete(cancelled);
loaded();
assert.equal(played, 0);

// 冷启动和重播入口均须透传资源格式，而非只修最终请求函数。
const apply = read("src/overrides/player/dynamic-skin.js"), init = read("src/ui/player-init.js");
for (const key of ["json", "skelType", "version"]) {
	assert.match(apply, new RegExp(`${key}: skin\\.${key}`));
	assert.match(init, new RegExp(`${key}: d\\.${key}`));
}
console.log("DYNAMIC_RESOURCE_LOADING_OK");
