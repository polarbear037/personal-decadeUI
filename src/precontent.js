import { get, lib, game } from "noname";
import { initEruda as initEruda, initNodeFS as initNodeFS } from "./core/debug.js";
import { EXCLUDED_MODES as EXCLUDED_MODES, initDecadeModule as initDecadeModule } from "./core/decadeModule.js";
import { setupLayoutVisualMenu as setupLayoutVisualMenu, setupConnectMode as setupConnectMode } from "./core/connectMode.js";
import { initApp as initApp } from "./core/app.js";
import { applyMoveAnimFix as applyMoveAnimFix } from "./overrides/moveAnimFix.js";
import { initPrecontentUI as initPrecontentUI } from "./ui/progress-bar.js";
import { initCardAlternateNameVisible as initCardAlternateNameVisible } from "./ui/cardAlternateName.js";
async function d() {
	const mode = get.mode();
	EXCLUDED_MODES.includes(mode) || (initEruda(), initNodeFS(), setupLayoutVisualMenu(), (window.decadeModule = await initDecadeModule()), setupConnectMode(), initApp(), lib.config.asset_version || game.saveConfig("asset_version", "无"), applyMoveAnimFix(), initPrecontentUI(), initCardAlternateNameVisible());
}
export { d as precontent };
