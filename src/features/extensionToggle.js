import { ui, game, lib, _status } from "noname";
const n = "extension_十周年UI_closedExtensions",
	e = () => {
		const n = window.decadeUIName || "十周年UI",
			e = _status.PROTECTED_EXTENSIONS ?? [];
		return (lib.config.extensions || []).filter(ext => ext !== n && !e.includes(ext));
	},
	o = () => {
		const saved = lib.config[n];
		return Array.isArray(saved) ? saved : [];
	},
	t = () => o().length > 0,
	s = () => (t() ? "恢复其他扩展" : "关闭其他扩展"),
	i = () => {
		const hasClosed = t(),
			list = hasClosed ? o() : e().filter(ext => lib.config[`extension_${ext}_enable`]);
		if (0 === list.length) return void alert(hasClosed ? "没有需要恢复的扩展" : "没有其他已启用的扩展");
		const action = hasClosed ? "恢复其他" : "关闭其他",
			extList = list.map(ext => `· ${ext}`).join("\n");
		confirm(`确定${action}以下 ${list.length} 个扩展？\n\n${extList}\n\n将自动重启游戏。`) &&
			(hasClosed
				? (list.forEach(ext => {
						lib.config.extensions?.includes(ext) && game.saveConfig(`extension_${ext}_enable`, !0);
					}),
					game.saveConfig(n, []))
				: (game.saveConfig(n, list), list.forEach(n => game.saveConfig(`extension_${n}_enable`, !1))),
			setTimeout(() => game.reload(), 100));
	};
function r() {
	window.decadeUI && (window.decadeUI.toggleExtensions = i);
	const timer = setInterval(() => {
		if (!ui.system1 && !ui.system2) return;
		clearInterval(timer);
		const btn = ui.create.system(s(), i, !0),
			_saveConfig = game.saveConfig;
		game.saveConfig = function (key) {
			const result = _saveConfig.apply(this, arguments);
			return (key === n && (btn.innerHTML = s()), result);
		};
	}, 500);
}
export { r as setupExtensionToggle };
