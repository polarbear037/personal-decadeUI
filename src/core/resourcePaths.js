import { game, lib } from "noname";

const defaultResourcePaths = {
	"十周年露头皮肤": "image/character/dcloutou",
	"手杀露头皮肤": "image/character/ssloutou",
	"立绘文件": "image/lihui",
	"动态皮肤文件": "assets/dynamic",
};

let resourcePaths = { ...defaultResourcePaths };
let loadPromise;

function normalizeResourcePath(path, fallback) {
	if (typeof path !== "string" || !path.trim()) return fallback;
	return path.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function getExtensionPath() {
	return window.decadeUIPath || `${lib.assetURL}extension/${getExtensionName()}/`;
}

function getExtensionName() {
	return window.decadeUIName || "十周年UI";
}

function parseConfiguredPaths(text) {
	return JSON.parse(String(text).replace(/^\uFEFF/, "").trim());
}

function readLocalConfig() {
	const path = `extension/${getExtensionName()}/path.json`;
	if (typeof game?.promises?.readFileAsText === "function") {
		return game.promises.readFileAsText(path);
	}
	if (typeof game?.readFileAsText === "function") {
		return new Promise((resolve, reject) => game.readFileAsText(path, resolve, reject));
	}
	return Promise.reject(new Error("game.readFileAsText unavailable"));
}

async function readConfiguredPaths() {
	return parseConfiguredPaths(await readLocalConfig());
}

async function loadResourcePaths() {
	if (!loadPromise) {
		loadPromise = (async () => {
			try {
				const configuredPaths = await readConfiguredPaths();
				for (const key of Object.keys(defaultResourcePaths)) {
					resourcePaths[key] = normalizeResourcePath(configuredPaths[key], defaultResourcePaths[key]);
				}
			} catch (error) {
				console.warn("[十周年UI] path.json 读取失败，使用默认资源目录：", error);
			}
			return { ...resourcePaths };
		})();
	}
	return loadPromise;
}

function getResourcePath(key) {
	return resourcePaths[key] || defaultResourcePaths[key] || "";
}

function getResourceUrl(key, file = "") {
	const directory = getResourcePath(key);
	const suffix = file ? `/${file.replace(/^\/+/, "")}` : "/";
	return `${getExtensionPath()}${directory}${suffix}`;
}

export { getResourcePath, getResourceUrl, loadResourcePaths };
