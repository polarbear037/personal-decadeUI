import { ui } from "noname";

// 各风格只提供间距和外观，手牌区统一朝向游戏窗口内侧。
export function positionHandDisplays(player) {
	const panel = player.node?.showCards;
	if (!panel) return;
	const bounds = player.getBoundingClientRect();
	// 两者使用相同的坐标系，兼容 documentZoom 及皮肤切换的 DOMRect 包装。
	const host = (ui.window || document.documentElement).getBoundingClientRect();
	const onRight = bounds.left + bounds.width / 2 >= host.left + host.width / 2;
	const offset = "calc(100% + var(--handdisplays-gap, 20px))";
	panel.style.left = onRight ? "auto" : offset;
	panel.style.right = onRight ? offset : "auto";
}
