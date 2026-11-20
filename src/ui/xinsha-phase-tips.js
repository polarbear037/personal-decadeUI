import { game, lib, ui, _status } from "noname";

// APK 6.4.5 GameSelfSeatUi 0.42 / 0.110；来源与早退限制见 verification/xinsha-phase-source.json。
const phases = {
	hhks: [1, "回合开始"], zbjd: [1, "回合开始"], pdjd: [2, "判定阶段"],
	mpjd: [3, "摸牌阶段"], cpjd: [4, "出牌阶段"], qpjd: [5, "弃牌阶段"],
	jsjd: [6, "回合结束"], hhjs: [6, "回合结束"],
	ddxy: [99, "等待我响应"], dfsk: [100, "对方正在思考"],
};
const tips = new Set();

function removeXinshaPhaseTip(tip) {
	clearTimeout(tip._phaseSwapTimer);
	clearTimeout(tip._phaseExpireTimer);
	tip.firstElementChild?.getAnimations().forEach(animation => animation.cancel());
	if (_status.as_showImage === tip) delete _status.as_showImage;
	tips.delete(tip);
	tip.remove();
}

function clearXinshaPhaseTips() {
	for (const tip of tips) removeXinshaPhaseTip(tip);
}

function showXinshaPhaseTip(phase, time = true) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || !ui.window || !phases[phase]) return false;
	const [frame, label] = phases[phase];
	let tip = _status.as_showImage;
	if (!tips.has(tip)) {
		game.as_removeImage();
		tip = ui.create.div(".decade-xinsha-phase-tip", ui.window);
		tip.setAttribute("role", "status");
		tip.setAttribute("aria-live", "polite");
		ui.create.div(".decade-xinsha-phase-banner", tip);
		tip._decadePhaseTipRemove = () => removeXinshaPhaseTip(tip);
		tips.add(tip);
	}
	_status.as_showImage = tip;
	tip.dataset.phase = phase;
	tip.setAttribute("aria-label", label);
	if (tip.dataset.frame !== String(frame)) {
		tip.dataset.frame = String(frame);
		clearTimeout(tip._phaseSwapTimer);
		const banner = tip.firstElementChild;
		banner.getAnimations().forEach(animation => animation.cancel());
		const unit = parseFloat(getComputedStyle(tip).height) / 35;
		const offset = -20 * unit;
		// 保留源码的两段0.1秒线性动作：左移淡出 → 换图 → 移回淡入。
		banner.animate([{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: `translateX(${offset}px)` }], { duration: 100, fill: "forwards" });
		tip._phaseSwapTimer = setTimeout(() => {
			if (!tips.has(tip) || lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") return removeXinshaPhaseTip(tip);
			banner.getAnimations().forEach(animation => animation.cancel());
			tip.dataset.wide = String(frame >= 99);
			banner.style.backgroundImage = `url("${lib.assetURL}extension/十周年UI/image/ui/phase/xinsha/phase${frame}.png")`;
			banner.animate([{ opacity: 0, transform: `translateX(${offset}px)` }, { opacity: 1, transform: "translateX(0)" }], { duration: 100, fill: "forwards" });
		}, 100);
	}
	if (_status.as_showText) tip.hide();
	clearTimeout(tip._phaseExpireTimer);
	if (typeof time === "number") tip._phaseExpireTimer = setTimeout(() => removeXinshaPhaseTip(tip), Math.max(0, time) * 1000);
	return true;
}

export { showXinshaPhaseTip, clearXinshaPhaseTips };
