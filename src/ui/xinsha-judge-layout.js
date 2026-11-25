import { lib, ui } from "noname";

const layouts = new WeakMap();
const properties = ["--xinsha-judge-x", "--xinsha-judge-bottom", "--xinsha-judge-scale-x", "--xinsha-judge-scale-y"];
const geometryTransition = /^(transform|translate|scale|left|right|top|bottom|width|height|zoom)$/;

export function clearXinshaJudgeLayout(player) {
	const state = layouts.get(player);
	if (state) {
		state.resize.disconnect();
		state.mutations.disconnect();
		cancelAnimationFrame(state.frame);
		for (const node of state.nodes) node.removeEventListener("transitionrun", state.onTransition);
		layouts.delete(player);
	}
	const judges = player?.node?.judges;
	if (!judges) return;
	delete judges.dataset.xinshaJudgeLayout;
	for (const property of properties) judges.style.removeProperty(property);
}

// GameSelfSeatUi.layoutYJCM：场景 LEFT_BOTTOM(108,194)，而非本人武将牌上沿。
// 保留原判定节点归属，将场景坐标换入武将的局部坐标，兼容缩放、侧栏及左右手。
export function syncXinshaJudgeLayout(player) {
	const judges = player?.node?.judges;
	if (!judges) return;
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || player.dataset.position !== "0" || !player.isConnected || !judges.children.length) {
		clearXinshaJudgeLayout(player);
		return;
	}
	let state = layouts.get(player);
	if (!state) {
		const schedule = () => {
			if (state.frame) return;
			state.frame = requestAnimationFrame(() => { state.frame = 0; syncXinshaJudgeLayout(player); });
		};
		state = { frame: 0, schedule, nodes: [ui.window, ui.arena, player], resize: new ResizeObserver(schedule), mutations: new MutationObserver(schedule) };
		state.onTransition = event => {
			if (event.target === event.currentTarget && geometryTransition.test(event.propertyName)) schedule();
		};
		for (const node of state.nodes) {
			state.resize.observe(node);
			state.mutations.observe(node, { attributes: true, attributeFilter: ["style", "class", "data-position"] });
			node.addEventListener("transitionrun", state.onTransition);
		}
		state.mutations.observe(judges, { childList: true });
		layouts.set(player, state);
	}
	const view = ui.window.getBoundingClientRect(), seat = player.getBoundingClientRect();
	if (!view.width || !view.height || !seat.width || !seat.height) return;
	const style = getComputedStyle(ui.window);
	const unit = parseFloat(style.getPropertyValue("--yjcm-unit")) || Math.min(ui.window.clientWidth / 1334, ui.window.clientHeight / 750);
	const sceneX = parseFloat(style.getPropertyValue("--yjcm-scene-x")) || 0;
	const sceneY = parseFloat(style.getPropertyValue("--yjcm-scene-y")) || 0;
	const zoomX = view.width / ui.window.clientWidth, zoomY = view.height / ui.window.clientHeight;
	const scaleX = seat.width / player.offsetWidth, scaleY = seat.height / player.offsetHeight;
	const x = (view.left + (sceneX + 108 * unit) * zoomX - seat.left) / scaleX - player.clientLeft;
	const bottom = (seat.bottom - view.bottom + (sceneY + 194 * unit) * zoomY) / scaleY - (player.offsetHeight - player.clientHeight - player.clientTop);
	const values = [`${x}px`, `${bottom}px`, String(unit * zoomX / scaleX), String(unit * zoomY / scaleY)];
	judges.dataset.xinshaJudgeLayout = "true";
	properties.forEach((property, index) => {
		if (judges.style.getPropertyValue(property) !== values[index]) judges.style.setProperty(property, values[index]);
	});
	// 本体角色入场/换位有位置过渡，仅在这段过渡内跟随；静止时不轮询。
	if (state.nodes.some(node => node.getAnimations().some(animation => animation.playState === "running" && geometryTransition.test(animation.transitionProperty)))) state.schedule();
}
