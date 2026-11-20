import { lib, game } from "noname";

const optimizePromptKey = "extension_十周年UI_optimizePrompt";

function normalizePromptStyle(value) {
	if (value === true) return "online";
	return value === "online" || value === "xinsha" ? value : "off";
}

function getOptimizedPromptStyle() {
	return normalizePromptStyle(lib.config[optimizePromptKey]);
}

function migrateOptimizedPromptConfig() {
	const value = lib.config[optimizePromptKey];
	if (typeof value === "boolean") game.saveConfig(optimizePromptKey, normalizePromptStyle(value));
}

export { optimizePromptKey, normalizePromptStyle, getOptimizedPromptStyle, migrateOptimizedPromptConfig };
