import { lib } from "noname";

const runtimeLoads = new WeakMap();
async function loadCardSpineRuntime(doc) {
	const win = doc.defaultView;
	if (win.AnimationManager) return win.AnimationManager;
	if (!runtimeLoads.has(doc)) runtimeLoads.set(doc, (async () => {
		const root = `${lib.assetURL || ""}extension/皮肤切换/`;
		for (const [file, available] of [
			["spine.js", () => win.spine], ["spine-lib/spine_4_0_64.js", () => win.spine_4],
			["animation.js", () => win.newDuilib], ["settings.js", () => false], ["animations.js", () => win.AnimationManager],
		]) {
			if (available()) continue;
			await new Promise((resolve, reject) => {
				const script = doc.createElement("script");
				script.src = root + file;
				script.onload = resolve;
				script.onerror = () => reject(new Error(`Spine runtime load failed: ${script.src}`));
				doc.head.appendChild(script);
			});
		}
		return win.AnimationManager;
	})().catch(error => { runtimeLoads.delete(doc); throw error; }));
	return runtimeLoads.get(doc);
}

// 高版本骨骼仍走卡牌播放池；复用皮切运行库，不使用全屏 Worker 和坐标跟随。
export function playCardSpineTo(pool, element, animation, position) {
	if (!element?.isConnected) return null;
	element._cardSpineEffect?.cancel();
	const entries = pool.cardSpinePlayers ||= [];
	let entry = entries.find(item => !item.busy);
	if (!entry) {
		if (entries.length >= (pool.capacity || pool.animations?.length || 4)) return null;
		const canvas = element.ownerDocument.createElement("canvas");
		canvas.className = "animation-player card-spine-player";
		canvas.setAttribute("aria-hidden", "true");
		// 保留边缘光效的绘制空间，整个画布随卡牌的 CSS transform/zoom 缩放。
		canvas.style.cssText = "position:absolute;left:-25%;top:-25%;width:150%;height:150%;pointer-events:none;z-index:30;visibility:hidden";
		entry = { canvas, manager: null, busy: false };
		entries.push(entry);
	}
	entry.busy = true;
	const { canvas } = entry, doc = element.ownerDocument, win = doc.defaultView;
	element.appendChild(canvas);
	let loading = true, settled = false, node, timer, resizeObserver, removalObserver;
	let resolveStarted, resolveFinished;
	const started = new Promise(resolve => { resolveStarted = resolve; });
	const finished = new Promise(resolve => { resolveFinished = resolve; });
	const initialWidth = element.clientWidth || 108;
	const sprite = { x: [0, .5], y: [0, .5], ...animation };
	if (position) position = { ...position, parent: undefined, follow: false };
	const scale = animation.scale ?? 1;
	const updateSize = () => {
		const ratio = (element.clientWidth || initialWidth) / initialWidth;
		const currentScale = scale * ratio;
		sprite.scale = currentScale;
		if (node) node.scale = currentScale;
		for (const key of ["x", "y"]) if (Array.isArray(animation[key])) {
			sprite[key] = [animation[key][0] * ratio, animation[key][1]];
			if (node) node[key] = sprite[key];
		}
		for (const renderer of Object.values(entry.manager?.animations || {})) renderer.resized = false;
	};
	function release() {
		entry.manager?.stopSpineAll();
		for (const renderer of Object.values(entry.manager?.animations || {})) {
			if (renderer.requestId != null) win.cancelAnimationFrame(renderer.requestId);
			renderer.requestId = renderer.frameTime = undefined;
			renderer.running = false;
			for (const current of renderer.nodes) {
				current.skeleton.state.clearTracks();
				current.skeleton.completed = true;
				current.skeleton.node = undefined;
			}
			renderer.nodes.length = 0;
		}
		entry.busy = false;
	}
	function finish(success) {
		if (settled) return;
		settled = true;
		clearTimeout(timer);
		resizeObserver?.disconnect();
		removalObserver?.disconnect();
		canvas.style.visibility = "hidden";
		canvas.remove();
		if (element._cardSpineEffect === handle) delete element._cardSpineEffect;
		if (element._ap === entry.manager) delete element._ap;
		resolveStarted(false);
		resolveFinished(success);
		// 加载完成仍会启动播放器；该回调返回后才允许复用此槽位。
		if (!loading) release();
	}
	const handle = { canvas, sprite, started, finished, cancel: () => finish(false) };
	element._cardSpineEffect = handle;
	sprite.oncomplete = () => setTimeout(() => { finish(true); }, 0);
	timer = setTimeout(() => finish(false), 15000);
	if (win.MutationObserver) {
		removalObserver = new win.MutationObserver(() => { if (!element.isConnected) finish(false); });
		removalObserver.observe(doc.documentElement, { childList: true, subtree: true });
	}
	(async () => {
		try {
			const Manager = await loadCardSpineRuntime(doc);
			if (settled || !element.isConnected) { loading = false; finish(false); release(); return; }
			entry.manager ||= new Manager(pool.pathPrefix, canvas, undefined, { offscreen: false });
			element._ap?.stopSpineAll?.();
			element._ap = entry.manager;
			updateSize();
			if (win.ResizeObserver) {
				resizeObserver = new win.ResizeObserver(updateSize);
				resizeObserver.observe(element);
			}
			entry.manager.loadAndPlay(sprite, ready => {
				loading = false;
				if (settled || !element.isConnected || !ready) { finish(false); release(); return; }
				node = ready;
				handle.node = node;
				updateSize();
				resolveStarted(true);
				clearTimeout(timer);
				const duration = node.skeleton?.state?.getCurrent?.(0)?.animation?.duration || 2 / 3;
				timer = setTimeout(() => finish(true), duration * 1000 / (sprite.speed || 1) + 100);
			}, () => { loading = false; finish(false); release(); }, position);
		} catch (error) {
			loading = false;
			finish(false);
			release();
			console.error(error);
		}
	})();
	return handle;
}
