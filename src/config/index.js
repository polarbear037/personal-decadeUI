import { appearanceConfigs as appearanceConfigs } from "./definitions/appearance.js";
import { cardConfigs as cardConfigs } from "./definitions/card.js";
import { componentConfigs as componentConfigs } from "./definitions/component.js";
import { miscConfigs as miscConfigs } from "./definitions/misc.js";
import { cardSkinMeta as cardSkinMeta, cardSkinPresets as cardSkinPresets, getAllCardSkinPresets as getAllCardSkinPresets, registerDynamicSkin as registerDynamicSkin } from "./utils.js";
const p = { ...appearanceConfigs, ...cardConfigs, ...componentConfigs, ...miscConfigs };
export { appearanceConfigs as appearanceConfigs, cardConfigs as cardConfigs, cardSkinMeta as cardSkinMeta, cardSkinPresets as cardSkinPresets, componentConfigs as componentConfigs, p as config, getAllCardSkinPresets as getAllCardSkinPresets, miscConfigs as miscConfigs, registerDynamicSkin as registerDynamicSkin };
