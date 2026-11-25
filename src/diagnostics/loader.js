import { game, lib } from "noname";

const configKey = "extension_十周年UI_cardMovementDiagnostics";
let loading;

export function startCardMovementDiagnostics() {
	if (lib.config[configKey] === false) return Promise.resolve(null);
	loading ||= import("./card-movement.js").catch(error => { loading = null; throw error; });
	return loading.then(module => {
		// 开启后尚在加载时又关闭，不得在异步返回后重新装上记录钩子。
		if (lib.config[configKey] === false) return null;
		const recorder = module.installCardMovementDiagnostics();
		recorder.setEnabled(true, false);
		if (window.decadeUI) window.decadeUI.cardMovementDiagnostics = recorder;
		return recorder;
	}).catch(error => { console.warn("飞牌动画记录器加载失败", error); return null; });
}

export function setCardMovementDiagnosticsEnabled(value) {
	game.saveConfig(configKey, !!value);
	if (!value) {
		window.decadeUI?.cardMovementDiagnostics?.setEnabled(false, false);
		return Promise.resolve(null);
	}
	return startCardMovementDiagnostics();
}
