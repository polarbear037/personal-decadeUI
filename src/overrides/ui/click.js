import { _status, game, lib, get, ui } from "noname";
import { getBaseUiClickIntro as getBaseUiClickIntro } from "./base.js";
import { isHandCardAvailable } from "../../ui/handcard-selection.js";
function switchSelectedHandCard(card) {
	const event = _status.event;
	if (!event.isMine() || !event.filterCard || ui.selected.cards.length !== 1 || get.select(event.selectCard)[1] !== 1 || card.classList.contains("selected") || !event.player.getCards("h").includes(card) || !event.player.getCards(event.position).includes(card)) return false;
	if (!isHandCardAvailable(card, event)) return false;
	// 复用本体清理旧目标、转化牌名及花色点数，再走原来的选中流程。
	game.uncheck("card", "target");
	card.classList.add("selectable");
	return true;
}
function t(e) {
	if ((delete this._waitingfordrag, _status.dragged)) return;
	if (_status.clicked) return;
	if (ui.intro) return;
	if (((_status.clicked = !0), this.parentNode && (this.parentNode.classList.contains("judges") || this.parentNode.classList.contains("dui-marks")))) {
		if (!(e && e instanceof MouseEvent)) {
			const t = this.getBoundingClientRect(),
				i = game.hasExtension && game.hasExtension("皮肤切换") ? game.documentZoom : 1;
			e = { clientX: (t.left + 10) * i, clientY: (t.top + 10) * i };
		}
		return (ui.click.touchpop(), ui.click.intro.call(this, e), void (_status.clicked = !1));
	}
	const t = _status.event.custom;
	if (t.replace.card) t.replace.card(this);
	else if (this.classList.contains("selectable") || switchSelectedHandCard(this)) {
		if (this.classList.contains("selected")) (ui.selected.cards.remove(this), _status.multitarget || _status.event.complexSelect ? (game.uncheck(), game.check()) : (this.classList.remove("selected"), this.updateTransform(), 1 == this.dataset.view && ((this.dataset.view = 0), this._tempName && (this._tempName.delete(), delete this._tempName, (this.dataset.low = 0))), 1 == this.dataset.views && ((this.dataset.views = 0), this._tempSuitNum && (this._tempSuitNum.delete(), delete this._tempSuitNum)), decadeUI && decadeUI.layout && decadeUI.layout.invalidateHand()));
		else {
			(ui.selected.cards.add(this), this.classList.add("selected"), ui._handcardHover === this && (ui._handcardHover = null), this.updateTransform(!0));
			const e = _status.event.skill;
			(get.info(e) &&
				get.info(e).viewAs &&
				!get.info(e).ignoreMod &&
				(function (card, skill) {
					const cardskb = "function" == typeof get.info(skill).viewAs ? get.info(skill).viewAs([card], _status.event.player) : get.info(skill).viewAs,
						rsuit = get.suit(card),
						rnum = get.number(card),
						rname = get.name(card),
						vname = get.name(cardskb),
						rnature = get.nature(card),
						vnature = get.nature(cardskb);
					let vsuit = get.suit(cardskb),
						vnum = get.number(cardskb);
					"none" == vsuit && (vsuit = rsuit);
					vnum || (vnum = rnum);
					if (rname != vname || !get.is.sameNature(rnature, vnature, !0)) {
						(card._tempName && (card._tempName.delete(), delete card._tempName), card._tempName || (card._tempName = ui.create.div(".temp-name", card)));
						let e = "",
							t = get.translation(vname);
						(vnature && ((card._tempName.dataset.nature = vnature), "sha" == vname && (t = get.translation(vnature) + t)), (e += t), (card._tempName.innerHTML = e), (card._tempName.tempname = e), (card.dataset.low = 1), (card.dataset.view = 1));
					}
					(rsuit == vsuit && rnum == vnum) || (card._tempSuitNum && (card._tempSuitNum.delete(), delete card._tempSuitNum), decadeUI.cardTempSuitNum(card, vsuit, vnum), (card.dataset.views = 1));
				})(this, e),
				decadeUI && decadeUI.layout && decadeUI.layout.invalidateHand());
		}
		if (game.chess && get.config("show_range") && !_status.event.skill && this.classList.contains("selected") && _status.event.isMine() && "chooseToUse" == _status.event.name) {
			const player = _status.event.player,
				e = get.info(this).range;
			e && ("number" == typeof e.attack ? player.createRangeShadow(Math.min(8, player.getAttackRange(!0) + e.attack - 1)) : "number" == typeof e.global && player.createRangeShadow(Math.min(8, player.getGlobalFrom() + e.global)));
		}
		if ((t.add.card && t.add.card(), game.check(), lib.config.popequip && "popequip" != arguments[0] && ui.arena && ui.arena.classList.contains("selecting") && this.parentNode.classList.contains("popequip"))) {
			if (this.classList && this.classList.contains("emptyequip")) return;
			const e = this.getBoundingClientRect();
			(ui.click.touchpop(), ui.click.intro.call(this.parentNode, { clientX: e.left + 18, clientY: e.top + 12 }));
		}
	}
}
function i() {
	if (!((this && !this.extraEquip && this.classList && this.classList.contains("emptyequip")) || (this && this.parentNode && this.parentNode.classList && this.parentNode.classList.contains("emptyequip")) || (this && this.dataset && "string" == typeof this.dataset.name && this.dataset.name.startsWith("empty_equip")) || this.classList.contains("infohidden"))) {
		if (!(this.classList.contains("card") && this.parentNode && this.parentNode.classList.contains("equips") && get.is.phoneLayout()) || get.is.mobileMe(this.parentNode.parentNode)) return getBaseUiClickIntro()?.apply(this, arguments);
		n.call(this, arguments[0]);
	}
}
function n(e) {
	if (_status.dragged) return;
	if (((_status.clicked = !0), this.classList.contains("player") && !this.name)) return;
	if (this.parentNode == ui.historybar) {
		if ("22" == ui.historybar.style.zIndex) {
			if (!_status.removePop) return;
			if (0 == _status.removePop(this)) return;
		}
		ui.historybar.style.zIndex = 22;
	}
	const uiintro = get.nodeintro(this, !1, e);
	if (!uiintro) return;
	(uiintro.classList.add("popped"), uiintro.classList.add("static"), ui.window.appendChild(uiintro));
	const layer = ui.create.div(".poplayer", ui.window),
		clicklayer = function (e) {
			if (!_status.touchpopping) return (delete ui.throwEmotion, delete _status.removePop, game.closePoptipDialog(), uiintro.delete(), this.remove(), (ui.historybar.style.zIndex = ""), delete _status.currentlogv, ui.arena.classList.contains("menupaused") || uiintro.noresume || game.resume2(), e && e.stopPropagation && e.stopPropagation(), uiintro._onclose && uiintro._onclose(), !1);
		};
	if ((layer.addEventListener(lib.config.touchscreen ? "touchend" : "click", clicklayer), lib.config.touchscreen || (layer.oncontextmenu = clicklayer), this.parentNode == ui.historybar && lib.config.touchscreen)) {
		e = { clientX: 0, clientY: this.getBoundingClientRect().top + 30 };
	}
	(lib.placePoppedDialog(uiintro, e), this.parentNode == ui.historybar && ("right" == lib.config.show_history ? ((uiintro.style.left = "calc(100% - 10px)"), (uiintro.style.right = "auto")) : ((uiintro.style.right = "calc(100% - 10px)"), (uiintro.style.left = "auto"))));
}
function s(e) {
	if (_status.dragged || !game.getIdentityList || _status.video || this.parentNode.forceShown) return;
	_status.clicked = !0;
	let identityList = game.getIdentityList(this.parentNode);
	if (identityList)
		if ("click" == lib.config.mark_identity_style) {
			let e,
				i = !1;
			const n = this.firstChild.innerText;
			for (const s in identityList) {
				if ((null === e || i) && ((e = s), i)) break;
				n === identityList[s] && (i = !0);
			}
			this.parentNode.setIdentity(e);
		} else ("guozhan" == get.mode() && ((identityList = { wei: "魏", shu: "蜀", wu: "吴", qun: "群", jin: "晋", ye: "野" }), _status.forceKey && (identityList.key = "键")), a.call(this, identityList));
}
function a(identityList) {
	const _dui = window.decadeUI;
	_dui.$identityMarkBox ||
		((_dui.$identityMarkBox = window.decadeUI.element.create("identity-mark-box")),
		(_dui.$identityMarkBox.ondeactive = function () {
			(_dui.$identityMarkBox.remove(), (_status.clicked = !1), ui.arena.classList.contains("menupaused") || game.resume2());
		}));
	let index,
		node = 0;
	const nodes = _dui.$identityMarkBox.childNodes;
	for (const a in identityList)
		((index = nodes[node]),
			index
				? (index.style.display = "")
				: ((index = window.decadeUI.element.create("identity-mark-item", _dui.$identityMarkBox)),
					index.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
						(this.player.setIdentity(this.link), _dui.$identityMarkBox.remove(), (_status.clicked = !1));
					})),
			(index.link = a),
			(index.player = this.parentNode),
			(index.innerText = identityList[a]),
			node++);
	for (; node < nodes.length; ) ((nodes[node].style.display = "none"), node++);
	(game.pause2(),
		setTimeout(
			function (player) {
				(player.appendChild(_dui.$identityMarkBox), _dui.set.activeElement(_dui.$identityMarkBox));
			},
			0,
			this.parentNode
		));
}
function o() {
	const setting = ui.create.dialog("hidden");
	setting.listen(function (e) {
		e.stopPropagation();
	});
	const backVolume = window.decadeUI.component.slider(0, 8, parseInt(lib.config.volumn_background)),
		gameVolume = window.decadeUI.component.slider(0, 8, parseInt(lib.config.volumn_audio));
	return (
		(backVolume.onchange = function () {
			(game.saveConfig("volumn_background", backVolume.value), (ui.backgroundMusic.volume = backVolume.value / 8));
		}),
		(gameVolume.onchange = function () {
			game.saveConfig("volumn_audio", gameVolume.value);
		}),
		setting.add("背景音量"),
		setting.content.appendChild(backVolume),
		setting.add("游戏音量"),
		setting.content.appendChild(gameVolume),
		setting.add(ui.create.div(".placeholder")),
		setting
	);
}
export { t as uiClickCard, s as uiClickIdentity, i as uiClickIntro, o as uiClickVolumn };
