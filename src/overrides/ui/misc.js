import { game } from "noname";
function e() {
	game.addVideo("uiClear");
	const nodes = document.getElementsByClassName("thrown");
	for (let t = nodes.length - 1; t >= 0; t--) nodes[t].fixed || (nodes[t].classList.contains("card") ? (nodes[t].name && (nodes[t].name.startsWith("shengbei_left_") || nodes[t].name.startsWith("shengbei_right_")) ? nodes[t].delete() : window.decadeUI.layout.clearout(nodes[t])) : nodes[t].delete());
}
export { e as uiClear };
