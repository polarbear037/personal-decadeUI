import { game, ui, _status } from "noname";

// APK bvi：roundTexture 132×28，roundTxt 26px；实际布局由 online-phase-tips.css 控制。
const phaseText = {
	hhks: "回合开始", zbjd: "准备阶段", pdjd: "判定阶段", mpjd: "摸牌阶段",
	cpjd: "出牌阶段", qpjd: "弃牌阶段", jsjd: "回合结束", hhjs: "回合结束",
	ddxy: "等待响应", dfsk: "对方思考",
};
const phaseTips = new Set();
const EXIT_DURATION = 180;

function removeOnlinePhaseTip(tip, immediate = false) {
	clearTimeout(tip._phaseExpireTimer);
	clearTimeout(tip._phaseRemoveTimer);
	if (_status.as_showImage === tip) delete _status.as_showImage;
	const remove = () => {
		tip.remove();
		phaseTips.delete(tip);
	};
	if (immediate) remove();
	else {
		tip.classList.add("is-leaving");
		tip._phaseRemoveTimer = setTimeout(remove, EXIT_DURATION);
	}
}

function clearOnlinePhaseTips() {
	for (const tip of phaseTips) removeOnlinePhaseTip(tip, true);
}

function showOnlinePhaseTip(phase, time = true) {
	const text = phaseText[phase];
	if (!text || !ui.window) return false;
	let tip = _status.as_showImage;
	if (!tip?.classList.contains("decade-online-phase-tip") || tip.dataset.phase !== phase) {
		game.as_removeImage();
		tip = ui.create.div(".decade-online-phase-tip", ui.window);
		tip.dataset.phase = phase;
		tip.setAttribute("role", "status");
		tip.setAttribute("aria-live", "polite");
		const banner = document.createElement("div");
		banner.className = "decade-online-phase-banner";
		banner.textContent = text;
		tip.appendChild(banner);
		phaseTips.add(tip);
		tip._decadePhaseTipRemove = () => removeOnlinePhaseTip(tip);
	}
	_status.as_showImage = tip;
	if (_status.as_showText) tip.hide();
	clearTimeout(tip._phaseExpireTimer);
	if (typeof time === "number") tip._phaseExpireTimer = setTimeout(() => removeOnlinePhaseTip(tip), Math.max(0, time) * 1000);
	return true;
}

export { showOnlinePhaseTip, clearOnlinePhaseTips };
