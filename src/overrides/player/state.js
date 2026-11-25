import { get, game, lib, ui, _status } from "noname";
import { getBasePlayerMethods as getBasePlayerMethods } from "./base.js";
import { clearOnlineJudgeLayout } from "../../ui/online-judge-layout.js";
import { clearXinshaJudgeLayout } from "../../ui/xinsha-judge-layout.js";
import { closeOnlineHandCards } from "../../ui/online-hand-cards.js";
function e(skill) {
	const result = getBasePlayerMethods().awakenSkill.apply(this, arguments);
	if ((ui.updateSkillControl?.(this), get.info(skill)?.dutySkill)) {
		const that = this;
		game.expandSkills([skill]).forEach(subSkill => {
			that.setSkillState(subSkill, "shixiao");
		});
	}
	const parentSkill = _status.event.getParent()?.skill;
	return (parentSkill?.endsWith("_fail") && parentSkill.slice(0, -5) === skill && this.setSkillState(skill, "fail"), result);
}
function i(identity) {
	return ((identity = identity || this.identity), (this.node.identity.dataset.color = identity), "guozhan" === get.mode() ? ("ye" === identity && get.is.jun(this) && (this.identity = identity = lib.character[this.name1][1]), (this.group = identity), (this.node.identity.firstChild.innerHTML = get.translation(identity)), this) : (get.is.jun(this) ? (this.node.identity.firstChild.innerHTML = "君") : (this.node.identity.firstChild.innerHTML = get.translation(identity)), this));
}
function n() {
	const state = getBasePlayerMethods().getState.apply(this, arguments);
	return ((state.seat = this.seat), state);
}
function s(info) {
	info?.seat && this.node.seat && (this.node.seat.innerHTML = get.cnNumber(info.seat, !0));
	return getBasePlayerMethods().setModeState.apply(this, arguments);
}
function a() {
	(getBasePlayerMethods().setSeatNum.apply(this, arguments),
		(this.seat = this.getSeatNum()),
		game.broadcastAll(player => {
			const seat = player.getSeatNum?.() ?? player.seat;
			player.node.seat && (player.node.seat.innerHTML = get.cnNumber(seat, !0));
		}, this));
}
function o() {
	closeOnlineHandCards(this);
	(window.decadeModule?.prefixMark && window.decadeModule.prefixMark.clearPrefixMarks(this), this.stopDynamic(), (this.doubleAvatar = !1), delete this.node.campWrap.dataset.camp);
	const campName = this.node.campWrap.node.campName;
	for (; campName.firstChild; ) campName.removeChild(campName.lastChild);
	campName.style.removeProperty("background-image");
	const hujiat = this.querySelector(":scope > .hujia") || this.node.hpWrap.querySelector(".hujia");
	(hujiat && hujiat.remove(), this.node.showCards?.hide());
	getBasePlayerMethods().$uninit.apply(this, arguments);
	this.classList.add("decade-uninitialized");
	clearOnlineJudgeLayout(this);
	clearXinshaJudgeLayout(this);
	return this;
}
function r(from, to, maxHp, online) {
	getBasePlayerMethods().$reinit.apply(this, arguments);
	const character1 = this.name1 || this.name;
	return (window.decadeModule?.prefixMark && (window.decadeModule.prefixMark.clearPrefixMarks(this), character1 && window.decadeModule.prefixMark.showPrefixMark(character1, this), this.doubleAvatar && this.name2 && window.decadeModule.prefixMark.showPrefixMark(this.name2, this)), this.node.name && character1 && (this.node.name.innerHTML = get.slimNameHorizontal?.(character1) || get.slimName(character1)), this.doubleAvatar && this.node.name2 && this.name2 && (this.node.name2.innerHTML = get.slimNameHorizontal?.(this.name2) || get.slimName(this.name2)), this);
}
async function d(from, to, log) {
	this.stopDynamic();
	const result = getBasePlayerMethods().reinitCharacter.apply(this, arguments);
	return (await Promise.resolve(result), this._decadeUIApplyDynamicSkin(), result);
}
function h() {
	return (
		getBasePlayerMethods().$update.apply(this, arguments),
		(function (player) {
			let hujiat = player.querySelector(":scope > .hujia") || player.node.hpWrap.querySelector(".hujia");
			if (!(player.hujia > 0)) { hujiat?.remove(); return; }
			const online = lib.config.extension_十周年UI_newDecadeStyle === "onlineUI";
			const value = player.hujia === Infinity ? "∞" : String(player.hujia);
			if (!hujiat) hujiat = ui.create.div(".hujia");
			hujiat.classList.toggle("online-armor", online);
			(online ? player : player.node.hpWrap).appendChild(hujiat);
			if (online) {
				// 原cns：独立于血条，数字(0,8)/32×20，初次24px，护甲变动后26px。
				if (hujiat.dataset.value !== undefined && hujiat.dataset.value !== value) hujiat.dataset.updated = "true";
				let number = hujiat.querySelector(".online-armor-value");
				if (!number) { hujiat.textContent = ""; number = ui.create.div(".online-armor-value", hujiat); }
				number.textContent = value;
				hujiat.dataset.value = value;
				hujiat.setAttribute("aria-label", `护甲：${value}`);
			} else {
				hujiat.textContent = value;
				delete hujiat.dataset.value; delete hujiat.dataset.updated;
				hujiat.removeAttribute("aria-label");
			}
		})(this),
		(function (player) {
			const hidden = player.classList.contains("unseen_show") || player.classList.contains("unseen2_show"),
				hp = player.hp,
				hpMax = hidden ? 1 : player.maxHp,
				hpNode = player.node.hp,
				useTextStyle = hpMax > 5 || (lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI" && player.hujia && hpMax > 3);
			if (!player.storage.nohp && useTextStyle) {
				const t = isNaN(hp) ? "×" : hp === 1 / 0 ? "∞" : hp,
					s = isNaN(hpMax) ? "×" : hpMax === 1 / 0 ? "∞" : hpMax;
				((hpNode.innerHTML = `${t}<br>/<br>${s}<div></div>`), 0 === hp && hpNode.lastChild.classList.add("lost"), hpNode.classList.add("textstyle"));
			}
			player.dataset.maxHp = useTextStyle ? 4 : hpMax;
		})(this),
		(function (player) {
			const count = player.countCards("h");
			if (player === game.me) {
				const e = lib.config.extension_十周年UI_newDecadeStyle,
					i = ["onlineUI", "babysha", "codename"].includes(e);
				player.node.count.innerHTML = i ? `${count}/${player.getHandcardLimit()}` : count;
			} else count >= 10 && (player.node.count.innerHTML = count);
		})(this),
		this.decadeUI_updateShowCards(),
		this
	);
}
export { e as playerAwakenSkill, n as playerGetState, r as playerReinit, d as playerReinitCharacter, i as playerSetIdentity, s as playerSetModeState, a as playerSetSeatNum, o as playerUninit, h as playerUpdate };
