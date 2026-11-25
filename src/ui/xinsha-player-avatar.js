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
	else if (normal && normal.name === name && (normal.path || normal.classicPath)) avatar.style.backgroundImage = `url(${JSON.stringify(normal.path || normal.classicPath)})`;
	else if (source) avatar.style.backgroundImage = getComputedStyle(source).backgroundImage;
	avatar.setAttribute("aria-hidden", "true");
	parent?.append(avatar);
	return avatar;
}

/** 专属卡牌与牌局记录共用头像、座位标签和点击入口，几何由各自窗口决定。 */
export function createXinshaPlayerTab(parent, { player, seat, label, title, selected, className, onClick }) {
	const button = parent.ownerDocument.createElement("button");
	button.type = "button";
	button.className = `xinsha-player-tab ${className || ""}`;
	button.setAttribute("aria-pressed", String(!!selected));
	button.title = title || label || "全部";
	if (player) createXinshaPlayerAvatar(button, player);
	const text = parent.ownerDocument.createElement("span");
	text.textContent = label ?? ("一二三四五六七八九十"[seat - 1] || String(seat));
	button.appendChild(text);
	button.addEventListener("click", onClick);
	parent.appendChild(button);
	return button;
}
