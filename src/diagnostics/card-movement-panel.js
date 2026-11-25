import { cardMovementDiagnostics as recorder, installCardMovementDiagnostics } from "./card-movement.js";

let panel;
export function showCardMovementDiagnostics() {
	const installed = installCardMovementDiagnostics();
	if (window.decadeUI) window.decadeUI.cardMovementDiagnostics = installed;
	if (panel?.isConnected) return;
	if (!document.getElementById("decade-card-diagnostics-style")) {
		const link = document.createElement("link");
		link.id = "decade-card-diagnostics-style"; link.rel = "stylesheet";
		link.href = new URL("./card-movement-panel.css", import.meta.url).href;
		document.head.append(link);
	}
	panel = document.createElement("div"); panel.className = "decade-card-diagnostics";
	const box = document.createElement("section"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
	box.setAttribute("aria-label", "飞牌诊断记录");
	const title = document.createElement("h2"); title.textContent = "飞牌诊断记录";
	const intro = document.createElement("p");
	intro.textContent = "自动记录卡牌移动与动画，副本来源和动画起终点另行限量保留，不受高频采样覆盖。不出现在战报或录像列表；保存现场可锁定当前记录。";
	const status = document.createElement("p"), message = document.createElement("p"), buttons = document.createElement("div");
	message.setAttribute("role", "status"); buttons.className = "decade-card-diagnostics-actions";
	const refresh = () => {
		const state = recorder.status();
		status.textContent = `${state.enabled ? "正在记录" : "已关闭记录"} · 采样 ${state.rows} 条 · 关键轨迹 ${state.keyRows || 0} 条${state.error ? " · " + state.error : ""}`;
		toggle.textContent = state.enabled ? "关闭记录" : "开启记录";
	};
	const action = (key, label, callback) => {
		const button = document.createElement("button"); button.type = "button"; button.dataset.action = key; button.textContent = label;
		button.onclick = async () => {
			button.disabled = true;
			try { await callback(); refresh(); } catch (error) { message.textContent = "操作失败：" + String(error); }
			finally { button.disabled = false; }
		};
		buttons.append(button); return button;
	};
	const toggle = action("toggle", "", () => recorder.setEnabled(!recorder.status().enabled));
	action("incident", "保存异常现场", async () => { await recorder.saveIncident(); message.textContent = "异常现场已单独保存，重启后仍可读取。"; });
	action("export", "导出记录", () => recorder.export());
	action("clear", "清空记录", async () => { await recorder.clear(); message.textContent = "近期记录与已保存现场均已删除。"; });
	action("delete", "关闭并删除", async () => { recorder.setEnabled(false); await recorder.clear(); message.textContent = "已关闭记录，并删除所有诊断数据。"; });
	const close = () => { panel?.remove(); panel = null; };
	action("close", "关闭窗口", close);
	box.append(title, intro, status, buttons, message); panel.append(box);
	panel.addEventListener("click", event => { event.stopPropagation(); if (event.target === panel) close(); });
	panel.addEventListener("keydown", event => { event.stopPropagation(); if (event.key === "Escape") close(); });
	document.body.append(panel); refresh();
	void recorder.ready.then(refresh);
	void recorder.getIncident().then(incident => { if (incident) message.textContent = `已保存异常现场：${new Date(incident.capturedAt).toLocaleString()}`; }).catch(() => {});
	toggle.focus();
}
