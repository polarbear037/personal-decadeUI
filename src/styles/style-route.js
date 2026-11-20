import { STYLE_TO_SKIN, DEFAULT_SKIN } from "../../ui/constants.js";

// 没有独立样式文件的风格使用同名默认 CSS。
const STYLE_FILES = {
	online: new Set(["animation", "card", "component", "decadeLayout", "dialog", "effect", "equip", "layout", "meihua"]),
	xinsha: new Set(["animation", "card", "component", "decadeLayout", "dialog", "effect", "equip", "layout", "meihua"]),
};

function getStyleFile(name, style) {
	const skin = STYLE_TO_SKIN[style] || DEFAULT_SKIN;
	return `${name}${STYLE_FILES[skin]?.has(name) ? `-${skin}` : ""}.css`;
}

export { getStyleFile };
