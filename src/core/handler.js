import { ui } from "noname";
function r() {
	return {
		handMousewheel(r) {
			const hand = ui.handcards1Container;
			if (!hand) return console.error("ui.handcards1Container");
			((hand.scrollNum ??= 0), (hand.lastFrameTime ??= performance.now()));
			const handScroll = () => {
				const now = performance.now(),
					delta = now - hand.lastFrameTime;
				let num = Math.round(delta);
				((hand.lastFrameTime = now), hand.scrollNum > 0 ? ((num = Math.min(hand.scrollNum, num)), (hand.scrollNum -= num)) : ((num = Math.min(-hand.scrollNum, num)), (hand.scrollNum += num), (num = -num)), 0 === hand.scrollNum ? (hand.frameId = hand.lastFrameTime = void 0) : ((hand.frameId = requestAnimationFrame(handScroll)), (hand.scrollLeft += num)));
			};
			((hand.scrollNum += r.wheelDelta > 0 ? -84 : 84), (hand.frameId ??= requestAnimationFrame(handScroll)));
		},
	};
}
export { r as createHandlerModule };
