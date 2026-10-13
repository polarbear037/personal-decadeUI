import { game, ui, lib, get, _status } from "noname";
import { getBaseUiCreateCharacterDialog as getBaseUiCreateCharacterDialog, getBaseUiCreatePause as getBaseUiCreatePause, getBaseUiCreateArena as getBaseUiCreateArena, getBaseUiCreateButton as getBaseUiCreateButton } from "./base.js";
import { uiUpdatez as uiUpdatez } from "./update.js";
function i(item, type, position, noclick) {
	const button = ui.create.div();
	return (
		(button.style.display = "none"),
		(button.link = item),
		(button.activate = function () {
			ui.create.button(item, type, void 0, noclick, button).activate = void 0;
		}),
		_status.prebutton.push(button),
		position && position.appendChild(button),
		button
	);
}
function r(button) {
	if (!lib.config.show_rarity) return;
	const rarity = game.getRarity(button.link),
		intro = button.node.intro;
	(intro.classList.add("showintro"), intro.classList.add("rarity"), intro.innerText && (intro.innerText = ""), (intro.style.backgroundImage = 'url("' + decadeUIPath + "image/ui/rarity/rarity_" + rarity + '.png")'));
}
function c() {
	let controls;
	controls = Array.isArray(arguments[0]) ? arguments[0] : arguments;
	const control = document.createElement("div");
	((control.className = "control"), (control.style.opacity = 1), Object.setPrototypeOf(control, lib.element.Control.prototype));
	for (let n = 0; n < controls.length; n++)
		if ("function" == typeof controls[n]) control.custom = controls[n];
		else {
			if ("nozoom" == controls[n]) continue;
			"stayleft" == controls[n] ? ((control.stayleft = !0), control.classList.add("stayleft")) : control.add(controls[n]);
		}
	return (ui.controls.unshift(control), ui.control.insertBefore(control, _status.createControl || ui.confirm), control.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control2), control);
}
function s(...args) {
	let hidden = !1,
		notouchscroll = !1,
		forcebutton = !1,
		noforcebutton = !1,
		peaceDialog = !1;
	const dialog = decadeUI.element.create("dialog");
	((dialog.supportsPagination = !1), (dialog.paginationMap = /* @__PURE__ */ new Map()), (dialog.paginationMaxCount = /* @__PURE__ */ new Map()), (dialog.contentContainer = decadeUI.element.create("content-container", dialog)), (dialog.content = decadeUI.element.create("content", dialog.contentContainer)), (dialog.buttons = []), Object.setPrototypeOf(dialog, lib.element.Dialog.prototype));
	for (let c = 0; c < args.length; c++) "boolean" == typeof args[c] ? (dialog.static = args[c]) : "hidden" == args[c] ? (hidden = !0) : "notouchscroll" == args[c] ? (notouchscroll = !0) : "forcebutton" == args[c] ? (forcebutton = !0) : "noforcebutton" == args[c] ? (noforcebutton = !0) : "peaceDialog" == args[c] ? (peaceDialog = !0) : dialog.add(args[c]);
	return (hidden || dialog.open(), lib.config.touchscreen || (dialog.contentContainer.onscroll = ui.update), notouchscroll || ((dialog.contentContainer.ontouchstart = ui.click.dialogtouchStart), (dialog.contentContainer.ontouchmove = ui.click.touchScroll), (dialog.contentContainer.style.WebkitOverflowScrolling = "touch"), (dialog.ontouchstart = ui.click.dragtouchdialog)), noforcebutton ? (dialog.noforcebutton = !0) : forcebutton && ((dialog.forcebutton = !0), dialog.classList.add("forcebutton")), peaceDialog && (dialog.peaceDialog = !0), dialog);
}
function d(list, init, position, onchange) {
	const select = document.createElement("select");
	for (let i = 0; i < list.length; i++) {
		const n = document.createElement("option");
		(Array.isArray(list[i]) ? ((n.value = list[i][0]), (n.innerText = list[i][1])) : ((n.value = list[i]), (n.innerText = list[i])), init == n.value && (n.selected = "selected"), select.appendChild(n));
	}
	return (position && position.appendChild(select), onchange && (select.onchange = onchange), select);
}
function l(identity, position, info, noclick) {
	const card = ui.create.card(position, info, noclick);
	(card.removeEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card),
		card.classList.add("button"),
		(card.dataset.identityCard = "true"),
		(card._customintro = function (uiintro) {
			uiintro.add(`${get.translation(identity + 2)}的身份牌`);
		}));
	const fileName = "extension/十周年UI/image/ui/identity-card/mougong_" + identity + ".jpg";
	return (
		new Promise((resolve, reject) => {
			const image = new Image();
			((image.onload = () => resolve()), (image.onerror = reject), (image.src = `${lib.assetURL}${fileName}`));
		})
			.then(() => {
				(card.classList.add("fullimage"), card.setBackgroundImage(fileName), (card.style.backgroundSize = "cover"));
			})
			.catch(() => {
				card.node.background.innerHTML = get.translation(identity)[0];
			}),
		card
	);
}
function u(identity, dialog) {
	const card = ui.create.identityCard(identity),
		buttons = ui.create.div(".buttons", dialog.content);
	setTimeout(() => {
		(buttons.appendChild(card), dialog.open(), ui.create.cardSpinning(card));
	}, 50);
}
function p(item, type, position, noclick, node) {
	const button = getBaseUiCreateButton()?.apply(this, arguments);
	return (position && position.appendChild(button), button);
}
function h() {
	uiUpdatez();
	const result = getBaseUiCreateArena()?.apply(this, arguments);
	return (ui.arena.classList.remove("slim_player"), ui.arena.classList.remove("uslim_player"), ui.arena.classList.remove("mslim_player"), ui.arena.classList.remove("lslim_player"), ui.arena.classList.remove("oldlayout"), ui.arena.classList.remove("mobile"), ui.arena.classList.add("decadeUI"), (ui.control.id = "dui-controls"), lib.config.phonelayout ? ui.arena.setAttribute("data-phonelayout", "on") : ui.arena.setAttribute("data-phonelayout", "off"), decadeUI.config.update(), result);
}
function f() {
	const dialog = getBaseUiCreatePause()?.call(this);
	return ((dialog.style.backgroundColor = "rgba(0, 0, 0, 0.4)"), dialog);
}
function m() {
	const t = getBaseUiCreateCharacterDialog()?.apply(this, arguments),
		n = lib.config.extension_十周年UI_mx_decade_characterDialog || "default";
	if ("default" != n) {
		const e = t.querySelector(".searcher.caption");
		(e && e.parentNode.removeChild(e),
			"extension-OL-system" == n &&
				(function (dialog) {
					const content_container = dialog.childNodes[0],
						content = content_container.childNodes[0],
						switch_con = content.childNodes[0],
						buttons = content.childNodes[1],
						div = ui.create.div("extension-OL-system");
					((div.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 6px; height: 35px; width: 100%; padding: 0 5px; top: -2px; left: 0; font-size: 18px; font-family: xinwei, sans-serif; box-sizing: border-box;"),
						(div.innerHTML = '\n\t\t<label style="font-size:20px;">搜索：</label>\n\t\t<select style="height:26px; min-width:150px; font-size:15px; padding:1px 4px; border:1px solid #aaa; border-radius:4px; outline:none; flex-shrink:0;">\n\t\t\t<option value="name">名称翻译</option>\n\t\t\t<option value="name1">名称ID</option>\n\t\t\t<option value="name2">名称ID(精确匹配)</option>\n\t\t\t<option value="skill">技能翻译</option>\n\t\t\t<option value="skill1">技能ID</option>\n\t\t\t<option value="skill2">技能ID(精确匹配)</option>\n\t\t\t<option value="skill3">技能描述/翻译</option>\n\t\t</select>\n\t\t<input type="text" placeholder="非精确匹配支持正则搜索" style="height:24px; width:175px; font-size:15px; padding:1px 6px; border:1px solid #aaa; border-radius:4px; outline:none; flex-shrink:0; text-align:center;"/>\n\t\t<button style="height:26px; padding:0 10px; font-size:15px; border:1px solid #aaa; border-radius:4px; background:#f5f5f5; cursor:pointer;">搜索</button>\n\t'));
					const input = div.querySelector("input"),
						select = div.querySelector("select"),
						button = div.querySelector("button");
					function doSearch() {
						const value = input.value.trim();
						if (!value) return (game.alert("搜索不能为空"), void input.focus());
						const choice = select.value;
						for (let e = 0; e < buttons.childNodes.length; e++) {
							const o = buttons.childNodes[e];
							o.classList.add("nodisplay");
							const i = o.link;
							y(choice, value, i, get.character(i).skills || []) && o.classList.remove("nodisplay");
						}
						if (dialog.paginationMaxCount.get("character")) {
							const t = dialog.content.querySelector(".buttons"),
								n = dialog.paginationMap.get(t);
							if (n) {
								const t = dialog.buttons.filter(item => !item.classList.contains("nodisplay"));
								((n.state.data = t), n.setTotalPageCount(Math.ceil(t.length / dialog.paginationMaxCount.get("character"))));
							}
						}
					}
					(input.addEventListener("keydown", e => {
						(e.stopPropagation(), ("Enter" !== e.key && 13 !== e.keyCode) || (e.preventDefault(), doSearch()));
					}),
						button.addEventListener("click", e => {
							(e.stopPropagation(), doSearch(), input.focus());
						}),
						input.addEventListener("mousedown", e => {
							e.stopPropagation();
						}),
						switch_con.insertBefore(div, switch_con.firstChild));
				})(t));
	}
	return t;
}
function y(choice, value, name, skills) {
	if (choice.endsWith("2")) return "name2" === choice ? value === name : skills.includes(value);
	let regex;
	try {
		regex = new RegExp(value, "i");
	} catch {
		return (game.alert("正则表达式无效"), !1);
	}
	const test = t => t && regex.test(t);
	return "name1" === choice ? test(name) : "name" === choice ? test(get.translation(name)) || test(get.translation(name + "_ab")) : "skill1" === choice ? skills.some(skill => test(skill)) : "skill" === choice ? skills.some(skill => test(get.translation(skill))) : skills.some(skill => test(get.translation(skill + "_info")));
}
function g(hasme) {
	((ui.arena.dataset.layout = game.layout), (ui.mebg = ui.create.div("#mebg", ui.arena)), (ui.me = ui.create.div(".hand-wrap", ui.arena)), (ui.handcards1Container = window.decadeUI.element.create("hand-cards", ui.me)), (ui.handcards1Container.onmousewheel = window.decadeUI.handler.handMousewheel), (ui.handcards2Container = ui.create.div("#handcards2")), ui.arena.classList.remove("nome"));
	const equipSolts = (ui.equipSolts = window.decadeUI.element.create("equips-wrap"));
	equipSolts.back = window.decadeUI.element.create("equips-back", equipSolts);
	for (let n = 0; n < 5; n++) {
		window.decadeUI.element.create(null, equipSolts.back).dataset.type = n;
	}
	(ui.arena.insertBefore(equipSolts, ui.me),
		lib.config.extension_十周年UI_aloneEquip || (equipSolts.style.display = "none"),
		window.decadeUI.bodySensor.addListener(() => window.decadeUI.layout.resize()),
		window.decadeUI.layout.resize(),
		(ui.handcards1Container.ontouchstart = ui.click.touchStart),
		(ui.handcards2Container.ontouchstart = ui.click.touchStart),
		(ui.handcards1Container.ontouchmove = ui.click.touchScroll),
		(ui.handcards2Container.ontouchmove = ui.click.touchScroll),
		(ui.handcards1Container.style.WebkitOverflowScrolling = "touch"),
		(ui.handcards2Container.style.WebkitOverflowScrolling = "touch"),
		hasme && game.me ? ((ui.handcards1 = game.me.node.handcards1), (ui.handcards2 = game.me.node.handcards2), ui.handcards1Container.appendChild(ui.handcards1), ui.handcards2Container.appendChild(ui.handcards2)) : game.players.length && ((game.me = game.players[0]), (ui.handcards1 = game.me.node.handcards1), (ui.handcards2 = game.me.node.handcards2), ui.handcards1Container.appendChild(ui.handcards1), ui.handcards2Container.appendChild(ui.handcards2)),
		lib.config.extension_十周年UI_aloneEquip && game.me && ((equipSolts.me = game.me), (equipSolts.equips = game.me.node.equips), equipSolts.appendChild(game.me.node.equips)));
}
export { h as uiCreateArena, p as uiCreateButton, m as uiCreateCharacterDialog, c as uiCreateControl, s as uiCreateDialog, l as uiCreateIdentityCard, g as uiCreateMe, f as uiCreatePause, i as uiCreatePrebutton, r as uiCreateRarity, d as uiCreateSelectlist, u as uiCreateSpinningIdentityCard };
