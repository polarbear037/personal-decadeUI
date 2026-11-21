/** 一将成名通用小头像；调用方通过 CSS 设置尺寸和位置。 */
export function createXinshaPlayerAvatar(parent, player) {
	const avatar = (parent?.ownerDocument || document).createElement("span");
	avatar.className = "xinsha-player-avatar";
	Object.assign(avatar.style, { backgroundSize: "210% auto", backgroundPosition: "50% 15%", backgroundRepeat: "no-repeat" });
	const hidden = player?.isUnseen?.(0), slot = hidden ? "deputy" : "primary";
	const name = hidden ? player?.name2 : player?.name1 || player?.name;
	const current = player?.thunderCurrentNormalSkin?.[slot];
	const normal = current?.name === name ? current : player?.thunderNormalSkin?.[slot];
	const source = hidden ? player?.node?.avatar2 : player?.node?.avatar;
	if (hidden && player?.isUnseen?.(1)) avatar.style.backgroundImage = "linear-gradient(#17110d,#30251e)";
	else if (normal?.name === name && (normal.path || normal.classicPath)) avatar.style.backgroundImage = `url(${JSON.stringify(normal.path || normal.classicPath)})`;
	else if (source) avatar.style.backgroundImage = getComputedStyle(source).backgroundImage;
	avatar.setAttribute("aria-hidden", "true");
	parent?.append(avatar);
	return avatar;
}
