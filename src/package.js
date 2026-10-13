import { lib } from "noname";
import "./features/didYouKnow.js";

const packageAuthor = otherInfo => {
	const packageInfo = {
		character: { character: {}, translate: {} },
		card: { card: {}, translate: {}, list: [] },
		skill: { skill: {}, translate: {} },
		...otherInfo,
	};

	packageInfo.intro =
		'<a href="javascript:void(0)" onclick="navigator.clipboard.writeText(\'https://github.com/diandian157/decadeUI\').then(() => alert(\'已成功复制，粘贴到浏览器打开，部分进不去需要翻墙\')).catch(() => alert(\'复制失败，请手动复制\'))" style="color: #FFFACD;">点击复制仓库地址</a>';

	const welcome = (window.decadeUIWelcome ||= {});
	welcome.mode ||= "local";
	welcome._longPressTimer = null;
	welcome._longPressTriggered = false;
	welcome._lastToggleAt = 0;
	welcome.longPressStart = function () {
		this._longPressTriggered = false;
		clearTimeout(this._longPressTimer);
		this._longPressTimer = setTimeout(() => {
			this._longPressTriggered = true;
			this._lastToggleAt = Date.now();
			this.toggleAuthorAvatar();
		}, 1500);
	};
	welcome.longPressEnd = function () {
		clearTimeout(this._longPressTimer);
	};
	welcome.toggleAuthorAvatar = function () {
		this.mode = this.mode === "diandian" ? "local" : "diandian";
		const avatar = document.querySelector(".author-avatar");
		if (avatar) {
			const imageName = this.mode === "diandian" ? "avatar_diandian.jpg" : "avatar.jpg";
			avatar.src = `${lib.assetURL}extension/十周年UI/image/ui/avatar/${imageName}`;
		}
	};
	welcome.show = () => {
		if (welcome._longPressTriggered || Date.now() - welcome._lastToggleAt < 800) {
			welcome._longPressTriggered = false;
			return;
		}
		const audioName = welcome.mode === "diandian" ? "manbo.mp3" : "Ciallo.mp3";
		new Audio(`extension/十周年UI/audio/${audioName}`).play();
		import("./features/welcomeDialog.js").then(module => module.createWelcomeDialog());
	};

	Object.defineProperty(packageInfo, "author", {
		get() {
			const avatarName = welcome.mode === "diandian" ? "avatar_diandian.jpg" : "avatar.jpg";
			return `<img src="${lib.assetURL}extension/十周年UI/image/ui/avatar/${avatarName}" class="author-avatar" onclick="window.decadeUIWelcome.show()" onmousedown="window.decadeUIWelcome.longPressStart()" onmouseup="window.decadeUIWelcome.longPressEnd()" onmouseleave="window.decadeUIWelcome.longPressEnd()" ontouchstart="window.decadeUIWelcome.longPressStart()" ontouchend="window.decadeUIWelcome.longPressEnd()" ontouchcancel="window.decadeUIWelcome.longPressEnd()" oncontextmenu="return false" style="cursor:pointer;border-radius:50%;width:50px;height:50px;vertical-align:bottom;touch-action:manipulation;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none">小依<br>${window.decadeUIDidYouKnow.getHTML()}`;
		},
	});
	return packageInfo;
};

export { packageAuthor as mainpackage };
