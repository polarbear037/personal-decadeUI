import { lib } from "noname";
import { config } from "./src/config/index.js";
import { content } from "./src/content.js";
import { precontent } from "./src/precontent.js";
import { mainpackage } from "./src/package.js";

const type = "extension";

/**
 * 十周年UI扩展入口
 * @returns {Promise<import("noname").ExtensionInfo>} 扩展配置对象
 */
async function extensionEntry() {
	const infoUrl = `${lib.assetURL}extension/十周年UI/info.json`;
	const { name: extensionName, ...otherInfo } = await lib.init.promises.json(infoUrl);

	const extensionPath = `${lib.assetURL}extension/${extensionName}/`;
	Object.assign(window, {
		decadeUIName: extensionName,
		decadeUIPath: extensionPath,
	});

	const packageData = mainpackage(otherInfo);

	return {
		name: extensionName,
		editable: false,
		content,
		precontent,
		config,
		package: packageData,
		mainpackage: packageData,
	};
}

export { type, extensionEntry as default };
