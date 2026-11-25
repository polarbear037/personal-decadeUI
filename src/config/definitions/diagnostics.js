import { setCardMovementDiagnosticsEnabled } from "../../diagnostics/loader.js";

export const diagnosticConfigs = {
	cardMovementDiagnostics: {
		name: "飞牌动画记录器", init: true,
		intro: "独立记录实体牌、副本、动画起终点及调用来源。关闭立即停止，下次启动不加载记录器；开启按需加载，即时生效。历史记录管理窗口仅在点击时加载。",
		onclick: setCardMovementDiagnosticsEnabled,
	},
	cardMovementDiagnosticsManager: {
		name: "管理飞牌诊断记录", clear: true,
		intro: "保存刚才的异常现场、导出记录、清空数据或关闭并删除。",
		onclick() { return import("../../diagnostics/card-movement-panel.js").then(module => module.showCardMovementDiagnostics()); },
	},
};
