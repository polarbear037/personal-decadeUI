import { ui, lib, game, get, ai, _status } from "noname";
import { initializeDecadeUIEnvironment as initializeDecadeUIEnvironment } from "./environment.js";
import { createDecadeUIDialogModule as createDecadeUIDialogModule } from "./dialog.js";
import { createDecadeUIAnimateModule as createDecadeUIAnimateModule } from "./animate.js";
import { createResizeSensorClass as createResizeSensorClass } from "./resize-sensor.js";
import { createLayoutModule as createLayoutModule } from "./layout.js";
import { createSheetModule as createSheetModule } from "./sheet.js";
import { createDecadeUIGetModule as createDecadeUIGetModule } from "./getters.js";
import { createDecadeUISetModule as createDecadeUISetModule } from "./setters.js";
import { createDecadeUICreateModule as createDecadeUICreateModule } from "./create.js";
import { createStaticsModule as createStaticsModule } from "./statics.js";
import { createHandlerModule as createHandlerModule } from "./handler.js";
import { initHooks as initHooks } from "./hooks.js";
import { initSimplifiedSkillPrompt } from "../ui/simplifiedSkillPrompt.js";
import { xinshaDialogCardAnimations } from "../ui/dialog-card-animations-xinsha.js";
import { captureHandCardPosition } from "../utils/hand-card-position.js";
import { startCardMovementDiagnostics } from "../diagnostics/loader.js";
import { lerp as c, observeSize as u, throttle as y } from "../animation/utils.js";
import { CubicBezierEase as f } from "../animation/easing.js";
import { TimeStep as h } from "../animation/TimeStep.js";
import { APNode as j } from "../animation/APNode.js";
import { AnimationPlayer as g } from "../animation/AnimationPlayer.js";
import { AnimationPlayerPool as k } from "../animation/AnimationPlayerPool.js";
import { DynamicWorkers as $, BUILT_ID as S, DynamicPlayer as v } from "../animation/DynamicPlayer.js";
import { createPlayerElement as createPlayerElement } from "../ui/player-element.js";
import { createCardElement as createCardElement, createCardsWrapper as createCardsWrapper } from "../ui/card-element.js";
import { createCharacterButtonPreset as createCharacterButtonPreset } from "../ui/character-button.js";
import { createPlayerInit as createPlayerInit } from "../ui/player-init.js";
import { definePlayerGroupProperty as definePlayerGroupProperty } from "../ui/player-group.js";
import { createLayoutInit as createLayoutInit } from "../ui/layout-init.js";
import { setBaseUiMethods as P, setBaseUiCreateMethods as x } from "../overrides/ui/base.js";
import { uiUpdatexr as M, uiUpdatejm as U, uiUpdate as B, uiUpdatez as E, uiUpdatem as N, uiUpdatej as T, uiUpdatehl as q, uiUpdatec as Y } from "../overrides/ui/update.js";
import { uiCreateMe as _, uiCreateCharacterDialog as L, uiCreatePause as O, uiCreateArena as Z, uiCreateSpinningIdentityCard as F, uiCreateIdentityCard as J, uiCreateSelectlist as R, uiCreateDialog as H, uiCreateControl as V, uiCreateButton as W, uiCreateRarity as G, uiCreatePrebutton as K } from "../overrides/ui/create.js";
import { uiClickIdentity as Q, uiClickVolumn as X, uiClickIntro as ee, uiClickCard as re } from "../overrides/ui/click.js";
import { uiClear as te } from "../overrides/ui/misc.js";
import { controlUpdateLayout as controlUpdateLayout, controlReplace as controlReplace, controlClose as controlClose, controlOpen as controlOpen, controlAdd as controlAdd } from "../overrides/control.js";
import { applyDialogOverrides as applyDialogOverrides, dialogOpen as dialogOpen } from "../overrides/dialog.js";
import { eventTriggerMessage as eventTriggerMessage, eventAddMessageHook as eventAddMessageHook } from "../overrides/event.js";
import "../config/utils.js";
import { cardMoveDelete as ce, cardMoveTo as ue, cardUpdateTransform as ye, cardInit as fe, cardCopy as he, setBaseCardMethods as je } from "../overrides/card/overrides.js";
import { setBasePlayerMethods as ge } from "../overrides/player/base.js";
import { registerDecadeUIHooks as ke } from "../overrides/player/hooks.js";
import { playerSetModeState as $e, playerUpdate as Se, playerReinit as ve, playerUninit as be, playerSetSeatNum as Ae, playerReinitCharacter as Ce, playerGetState as we, playerSetIdentity as ze, playerAwakenSkill as De } from "../overrides/player/state.js";
import { playerHandleEquipChange as Ie, playerRespondAnimateBefore as Pe, playerUseCardAnimateBefore as xe, playerLose as Me, playerRespond as Ue, playerUseCard as Be } from "../overrides/player/card-route.js";
import { playerMarkSkillCharacter as Ee, playerUpdateMark as Ne, playerMarkCharacter as Te, playerMark as qe, playerUnmarkSkill as Ye, playerMarkSkill as _e } from "../overrides/player/marks.js";
import { player$SetSkillState as Le, playerSetSkillState as Oe, player$SetSkillYinYang as Ze, playerSetSkillYinYang as Fe, playerChangeZhuanhuanji as Je } from "../overrides/player/skill-state.js";
import { playerApplyDynamicSkin as Re, playerStopDynamic as He, playerPlayDynamic as Ve } from "../overrides/player/dynamic-skin.js";
import { playerCompareMultiple as We, playerCompare as Ge, playerDamagepop as Ke, playerDamage as Qe, playerQueueCssAnimation as Xe, playerLine as er, playerSkill as rr, playerDieAfter as tr } from "../overrides/player/animations.js";
import { setBasePlayerDraw as ir, playerDirectgains as ar, playerDirectgain as or, playerPhaseJudge as nr, playerThrowordered2 as mr, playerThrow as lr, playerGain2 as sr, playerGive as dr, playerDraw as pr, playerAddVirtualJudge as cr } from "../overrides/player/card-route.js";
import { playerUpdateShowCards as ur, playerCheckBoundsCache as yr, playerCheckAndAddExperienceSuffix as fr, playerSyncExpand as hr, playerSay as jr } from "../overrides/player/ui.js";
import { applyGameOverrides as applyGameOverrides, gameLogv as gameLogv } from "../overrides/game.js";
import { applyGetOverrides as applyGetOverrides, getObjtype as getObjtype } from "../overrides/get.js";
import { applyLibOverrides as applyLibOverrides } from "../overrides/lib.js";
import { createContentLose as createContentLose, createContentGain as createContentGain, contentJudge as contentJudge, setBaseContentMethods as wr } from "../overrides/content.js";
import { applyMoveAnimFix as applyMoveAnimFix } from "../overrides/moveAnimFix.js";
const Dr = () => ({
	captureHandCardPosition,
	init() {
		return ((this.extensionName = decadeUIName), (this.bodySensor = initializeDecadeUIEnvironment(this)), this.initOverride(), this);
	},
	initOverride() {
		const override = (r, t) => {
				let i = !0;
				for (const a in t) (r[a] ? ((i = override(r[a], t[a])), i && (r[a] = t[a])) : (r[a] = t[a]), (i = !1));
				return i;
			},
			base = {
				ui: { create: { cards: ui.create.cards, button: ui.create.button, arena: ui.create.arena, pause: ui.create.pause, characterDialog: ui.create.characterDialog }, click: { intro: ui.click.intro }, update: ui.update },
				lib: {
					element: {
						card: { $init: lib.element.card.$init, copy: lib.element.card.copy },
						player: {
							addSkill: lib.element.player.addSkill,
							removeSkill: lib.element.player.removeSkill,
							awakenSkill: lib.element.player.awakenSkill,
							getState: lib.element.player.getState,
							setModeState: lib.element.player.setModeState,
							$dieAfter: lib.element.player.$dieAfter,
							$skill: lib.element.player.$skill,
							markSkill: lib.element.player.markSkill,
							unmarkSkill: lib.element.player.unmarkSkill,
							reinitCharacter: lib.element.player.reinitCharacter,
							$init: lib.element.player.$init,
							$uninit: lib.element.player.$uninit,
							$reinit: lib.element.player.$reinit,
							setSeatNum: lib.element.player.setSeatNum,
							$update: lib.element.player.$update,
							useCard: lib.element.player.useCard,
							respond: lib.element.player.respond,
							lose: lib.element.player.lose,
							$draw: lib.element.player.$draw,
							$handleEquipChange: lib.element.player.$handleEquipChange,
							useCardAnimateBefore: lib.element.player.useCardAnimateBefore,
							respondAnimateBefore: lib.element.player.respondAnimateBefore,
							$changeZhuanhuanji: lib.element.player.$changeZhuanhuanji,
							trySkillAnimate: lib.element.player.trySkillAnimate,
						},
						content: { lose: lib.element.content.lose, gain: lib.element.content.gain },
					},
				},
			},
			ride = {
				lib: {
					element: {
						dialog: { open: dialogOpen },
						event: { addMessageHook: eventAddMessageHook, triggerMessage: eventTriggerMessage },
						card: { copy: he, $init: fe, updateTransform: ye, moveTo: ue, moveDelete: ce },
						control: { add: controlAdd, open: controlOpen, close: controlClose, replace: controlReplace, updateLayout: controlUpdateLayout },
						player: { awakenSkill: De, setIdentity: ze, getState: we, markSkill: _e, unmarkSkill: Ye, reinitCharacter: Ce, setSeatNum: Ae, $uninit: be, $reinit: ve, $update: Se, useCard: Be, respond: Ue, lose: Me, useCardAnimateBefore: xe, respondAnimateBefore: Pe, $changeZhuanhuanji: Je, setModeState: $e, $handleEquipChange: Ie, mark: qe, markCharacter: Te, updateMark: Ne, markSkillCharacter: Ee, playDynamic: Ve, stopDynamic: He, _decadeUIApplyDynamicSkin: Re, say: jr, $dieAfter: tr, $skill: rr, $syncExpand: hr, $init: createPlayerInit(base), checkAndAddExperienceSuffix: fr, $addVirtualJudge: cr, line: er, checkBoundsCache: yr, queueCssAnimation: Xe, $draw: pr, $give: dr, $gain2: sr, $damage: Qe, $throw: lr, $throwordered2: mr, $phaseJudge: nr, decadeUI_updateShowCards: ur, setSkillYinYang: Fe, $setSkillYinYang: Ze, setSkillState: Oe, $setSkillState: Le, $damagepop: Ke, $compare: Ge, $compareMultiple: We, directgain: or, directgains: ar },
						content: { gain: createContentGain(base.lib.element.content.gain), judge: contentJudge(), lose: createContentLose(base.lib.element.content.lose) },
					},
				},
				ui: { updatec: Y, updatehl: q, updatej: T, updatem: N, updatez: E, update: B, updatejm: U, updatexr: M, create: { prebutton: K, rarity: G, button: W, control: V, dialog: H, selectlist: R, identityCard: J, spinningIdentityCard: F, arena: Z, pause: O, characterDialog: L, buttonPresets: { character: createCharacterButtonPreset() } }, click: { card: re, intro: ee } },
				game: { logv: gameLogv },
				get: { objtype: getObjtype },
			};
		(je(base.lib.element.card.$init, base.lib.element.card.copy), wr(base.lib.element.content), ge(base.lib.element.player), ir(base.lib.element.player.$draw), P(base.ui), x(base.ui.create), ke());
		const restoreFns = [];
		if ((restoreFns.push(...applyGameOverrides()), restoreFns.push(...applyLibOverrides()), restoreFns.push(...applyDialogOverrides()), restoreFns.push(...applyGetOverrides()), restoreFns.push(...applyMoveAnimFix()), (this._overrideRestoreFns = restoreFns), override(lib, ride.lib), override(ui, ride.ui), override(game, ride.game), override(get, ride.get), Object.assign(decadeUI, { throttle: y, observeSize: u, lerp: c, CubicBezierEase: f, TimeStep: h, APNode: j, AnimationPlayer: g, AnimationPlayerPool: k, DynamicPlayer: v, BUILT_ID: S, DynamicWorkers: $ }), decadeModule.modules)) for (let a = 0; a < decadeModule.modules.length; a++) decadeModule.modules[a](lib, game, ui, get, ai, _status);
		(window.addEventListener("resize", () => {
			(ui.updatexr?.(), decadeUI.layout?.resize());
		}),
			initHooks(),
			this.initUIExtensions(),
			(this.cardMovementDiagnosticsReady = startCardMovementDiagnostics()),
			initSimplifiedSkillPrompt(),
			(this.registerCardSkin = this.statics.registerCardSkin));
	},
	initUIExtensions() {
		((ui.click.identity = Q), (ui.click.volumn = X), (ui.clear = te), (ui.create.me = _), (ui.create.player = createPlayerElement), (ui.create.card = createCardElement), (ui.create.cards = createCardsWrapper(ui.create.cards)), (lib.init.layout = createLayoutInit()), definePlayerGroupProperty());
	},
	dialog: createDecadeUIDialogModule(),
	dialogCardAnimations: xinshaDialogCardAnimations,
	animate: createDecadeUIAnimateModule(),
	ResizeSensor: createResizeSensorClass(),
	sheet: createSheetModule(),
	layout: createLayoutModule(),
	handler: createHandlerModule(),
	zooms: { body: 1, card: 1 },
	create: createDecadeUICreateModule(),
	get: createDecadeUIGetModule(),
	set: createDecadeUISetModule(),
	statics: createStaticsModule(),
	dataset: { animSizeUpdated: !1, bodySizeUpdated: !1, bodySize: { height: 1, width: 1, updated: !1 } },
});
export { Dr as createDecadeUIObject };
