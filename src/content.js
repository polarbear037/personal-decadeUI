import { lib, _status, ai, get, ui, game } from "noname";
import { loadResourcePaths } from "./core/resourcePaths.js";
import { bootstrapExtension as bootstrapExtension } from "./core/bootstrap.js";
import { createDecadeUIObject as createDecadeUIObject } from "./core/decadeUI.js";
import { enhanceDecadeUIRuntime as enhanceDecadeUIRuntime, registerDecadeUIUtilityModule as registerDecadeUIUtilityModule } from "./core/utility.js";
import { setupGameAnimation as setupGameAnimation } from "./animation/gameIntegration.js";
import { setupEffects as setupEffects } from "./effects/index.js";
import { setupAutoSelect as setupAutoSelect } from "./features/autoSelect.js";
import { setupCardDragSort as setupCardDragSort } from "./features/cardDragSort.js";
import { setupEquipHand as setupEquipHand } from "./features/equipHand.js";
import { setupLuckyCard as setupLuckyCard } from "./features/luckyCard.js";
import { setupExtensionToggle as setupExtensionToggle } from "./features/extensionToggle.js";
import { setupStyleHotkeys as setupStyleHotkeys } from "./features/styleHotkeys.js";
import { setupDisableBrowserShortcuts as setupDisableBrowserShortcuts } from "./features/disableBrowserShortcuts.js";
import { setupWelcomeDialog as setupWelcomeDialog } from "./features/welcomeDialog.js";
import { setupConfigWindow as setupConfigWindow } from "./features/configWindow.js";
import { setupSkillDieAudio as g } from "./audio/skillDieAudio.js";
import { setupAudioHooks as j } from "./audio/audioHooks.js";
import { setupEnhancedAudio as y } from "./audio/enhancedAudio.js";
import { setupDynamicSkin as setupDynamicSkin } from "./skins/dynamicSkin.js";
import { registerLegacyModules as registerLegacyModules } from "./ui/progress-bar.js";
import { initCardPrompt as initCardPrompt } from "./ui/cardPrompt.js";
import { initComponent as initComponent } from "./ui/component.js";
import { setupCharacterBackground as setupCharacterBackground } from "./ui/characterBackground.js";
import { setupCardStyles as setupCardStyles, updateCardStyles as updateCardStyles } from "./ui/cardStyles.js";
import { setupCharacterNamePrefix as setupCharacterNamePrefix } from "./ui/characterNamePrefix.js";
import { setupSkillDisplay as setupSkillDisplay } from "./ui/skillDisplay.js";
import { setupOutcropAvatar as setupOutcropAvatar } from "./ui/outcropAvatar.js";
import { initSkills as initSkills } from "./skills/index.js";
import { createLbtnPlugin as createLbtnPlugin } from "../ui/lbtn/plugin.js";
import { createSkillPlugin as createSkillPlugin } from "../ui/skill/plugin.js";
import { createCharacterPlugin as createCharacterPlugin } from "../ui/character/plugin.js";
import { loadPlayerCardOverrides as loadPlayerCardOverrides } from "./overrides/player/card-route.js";
const N = (decadeUI, config) => (
	registerDecadeUIUtilityModule(decadeUI),
	(decadeUI.config = config),
	(decadeUI.config.campIdentityImageMode ??= !0),
	(decadeUI.config.update = () => {
		const menu = lib.extensionMenu[`extension_${decadeUIName}`];
		for (const e in menu) menu[e]?.update && menu[e].update();
	}),
	decadeUI.init(),
	setupGameAnimation(lib, game, ui, get, ai, _status),
	setupEffects(),
	initComponent(decadeUI),
	initSkills(),
	initCardPrompt({ game: game, ui: ui }),
	setupAutoSelect(),
	setupCardDragSort(),
	setupEquipHand(),
	setupLuckyCard(),
	setupExtensionToggle(),
	setupStyleHotkeys(),
	setupDisableBrowserShortcuts(),
	setupConfigWindow(),
	y(),
	setupCharacterBackground(),
	setupCardStyles(),
	(decadeUI.updateCardStyles = updateCardStyles),
	setupCharacterNamePrefix(),
	setupSkillDisplay(),
	setupOutcropAvatar(),
	g(),
	j(),
	setupDynamicSkin(),
	setupWelcomeDialog(lib.extensionPack.十周年UI),
	console.timeEnd(decadeUIName),
	decadeUI
);
async function $(i) {
	if (!bootstrapExtension()) return;
	await loadPlayerCardOverrides(lib.config.extension_十周年UI_newDecadeStyle ?? i?.newDecadeStyle ?? "on");
	const resourcePaths = await loadResourcePaths();
	const t = createDecadeUIObject();
	((window.decadeUI = t),
		(t.resourcePaths = resourcePaths),
		(t.config = { ...i, dynamicSkin: lib.config.extension_十周年UI_dynamicSkin ?? !1, newDecadeStyle: lib.config.extension_十周年UI_newDecadeStyle ?? "on", dynamicSkinOutcrop: lib.config.extension_十周年UI_dynamicSkinOutcrop ?? !1, rightLayout: "on" === lib.config.extension_十周年UI_rightLayout }),
		enhanceDecadeUIRuntime(t),
		N(t, t.config),
		registerLegacyModules(t.config),
		await (async function () {
			if (["chess", "tafang", "hs_hearthstone"].includes(get.mode())) return;
			const plugins = [
				{ name: "lbtn", creator: createLbtnPlugin },
				{ name: "skill", creator: createSkillPlugin },
				{ name: "character", creator: createCharacterPlugin, enabled: () => !1 !== lib.config.extension_十周年UI_characterPlugin },
			];
			for (const { name: r, creator: i, enabled: t } of plugins)
				if (!t || t())
					try {
						const o = await i(lib, game, ui, get, ai, _status, window.app);
						o && (o.name && (window.app.pluginsMap[o.name] = o), !o.precontent || (o.filter && !o.filter()) || o.precontent(), window.app.plugins.push(o));
					} catch (e) {
						console.error(`[十周年UI] ${r}模块加载失败:`, e);
					}
				else console.log(`[十周年UI] ${r}模块已被配置关闭`);
		})());
}
export { $ as content, N as finalizeDecadeUICore };
