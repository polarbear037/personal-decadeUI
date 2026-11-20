import { lib } from "noname";

const pending = new WeakMap();

// 牌面先绘制；读取牌宽、准备骨骼和创建画布在随后任务执行，不阻塞用牌入口。
export function playXinshaCardEffect(card, sprite, position, cap) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") return cap?.playSpineTo?.(card, sprite, position);
	const previous = pending.get(card);
	if (previous) { cancelAnimationFrame(previous.frame); clearTimeout(previous.task); }
	const state = {};
	pending.set(card, state);
	state.frame = requestAnimationFrame(() => {
		state.frame = 0;
		state.task = setTimeout(() => {
			if (pending.get(card) !== state) return;
			pending.delete(card);
			if (!card.isConnected || lib.config.extension_十周年UI_newDecadeStyle !== "othersOff") return;
			cap?.playSpineTo?.(card, sprite, position);
		}, 0);
	});
}
