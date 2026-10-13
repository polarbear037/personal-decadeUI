const t = [
	{ ctrl: !0, key: "s", description: "保存页面" },
	{ ctrl: !0, key: "o", description: "打开文件" },
	{ ctrl: !0, key: "p", description: "打印" },
	{ ctrl: !0, shift: !0, key: "s", description: "另存为" },
	{ ctrl: !0, key: "w", description: "关闭标签页" },
	{ ctrl: !0, key: "n", description: "新建窗口" },
	{ ctrl: !0, shift: !0, key: "n", description: "新建隐私窗口" },
	{ ctrl: !0, key: "t", description: "新建标签页" },
	{ ctrl: !0, shift: !0, key: "t", description: "恢复关闭的标签页" },
	{ ctrl: !0, key: "f", description: "查找" },
	{ ctrl: !0, key: "h", description: "历史记录" },
	{ ctrl: !0, key: "j", description: "下载" },
	{ ctrl: !0, key: "d", description: "添加书签" },
	{ ctrl: !0, shift: !0, key: "d", description: "保存所有标签为书签" },
	{ ctrl: !0, key: "u", description: "查看源代码" },
	{ ctrl: !0, shift: !0, key: "Delete", description: "清除浏览数据" },
];
function e(event, shortcut) {
	const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase(),
		ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey,
		shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey,
		altMatch = shortcut.alt ? event.altKey : !event.altKey;
	return keyMatch && ctrlMatch && shiftMatch && altMatch;
}
function i(event) {
	for (const i of t) if (e(event, i)) return void event.preventDefault();
}
function r() {
	"undefined" == typeof window || void 0 === window.document || window.require || window.cordova || window.nw || document.addEventListener("keydown", i, { capture: !0 });
}
export { r as setupDisableBrowserShortcuts };
