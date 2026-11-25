// 与 online-background-animation.js 使用相同的独立画布生命周期。
// 一将现有骨骼为 Spine 3.6，使用已加载的对应运行时，不混用 Online 的 Spine 4。
export async function playXinshaBackground(canvas, path, signal, isCurrent, entry) {
	const spine = window.spine;
	if (!spine?.webgl) throw new Error("Spine 3.6 is unavailable");
	const mobile = window.decadeUI?.isMobile?.();
	const frameInterval = mobile ? 1000 / 24 : 0;
	const context = new spine.webgl.ManagedWebGLRenderingContext(canvas, mobile ? { alpha: true, antialias: false, depth: false } : undefined);
	if (!context.gl) throw new Error("WebGL is unavailable");
	const assets = new spine.webgl.AssetManager(context, path);
	let renderer;
	let frame;
	let clouds;
	let resizeObserver;
	let resume;
	let loading = true;
	let disposed = false;
	let resourcesDisposed = false;
	function releaseResources() {
		if (resourcesDisposed) return;
		resourcesDisposed = true;
		renderer?.dispose();
		assets.dispose();
		context.gl.getExtension("WEBGL_lose_context")?.loseContext();
	}
	function dispose() {
		if (disposed) return;
		disposed = true;
		cancelAnimationFrame(frame);
		resizeObserver?.disconnect();
		document.removeEventListener("visibilitychange", visibilityChanged);
		signal.removeEventListener("abort", dispose);
		clouds?.remove();
		canvas.remove();
		// 加载中的纹理回调仍会写入 manager，等其结束再释放，避免留下 GPU 资源。
		if (!loading) releaseResources();
	}
	function visibilityChanged() {
		// 隐藏页面时不提交背景帧；恢复时由原时间轴继续，避免补跑后台帧。
		if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
		else resume?.();
	}
	signal.addEventListener("abort", dispose, { once: true });
	if (signal.aborted || !isCurrent()) {
		loading = false;
		dispose();
		return;
	}
	try {
		const animations = [...entry.animations];
		if (entry.id === 6) animations.push({ path: "background/scene/SF_animation_paiju_qunxiong1", name: "animation", scale: .835 });
		if (entry.id === 2) animations.push({ path: "background/scene/skeleton", name: "animation", scale: 1, moving: true });
		const load = (method, name) => new Promise((resolve, reject) => {
			assets[method](name, resolve, (file, error) => reject(new Error(error || `Wallpaper load failed: ${file}`)));
		});
		const loaded = await Promise.allSettled(animations.flatMap(animation => [
			load("loadBinary", animation.path + ".skel"),
			load("loadTextureAtlas", animation.path + ".atlas"),
		]));
		loading = false;
		if (disposed || signal.aborted || !isCurrent()) {
			dispose();
			releaseResources();
			return;
		}
		const failure = loaded.find(result => result.status === "rejected");
		if (failure) throw failure.reason;
		const layers = animations.map(animation => {
			const atlas = assets.get(animation.path + ".atlas");
			const data = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(assets.get(animation.path + ".skel"));
			const skeleton = new spine.Skeleton(data);
			// 本项目的 3.6 renderer 扩展了 skeleton.opacity，原生构造器不会初始化它。
			skeleton.opacity = 1;
			if (data.defaultSkin || data.skins?.length) skeleton.setSkin(data.defaultSkin || data.skins[0]);
			skeleton.setToSetupPose();
			const state = new spine.AnimationState(new spine.AnimationStateData(data));
			state.setAnimation(0, animation.name, true);
			return { animation, skeleton, state };
		});
		renderer = new spine.webgl.SceneRenderer(canvas, context, true);
		renderer.camera.position.set(0, 0, 0);
		if (entry.id === 0) {
			clouds = document.createElement("div");
			clouds.className = "yjcm-wallpaper-clouds";
			for (const [name, x, y] of [["zuoyun2",226,45], ["zuoyun1",80,80], ["zuoyun3",136,160], ["youyun3",1308,56], ["youyun1",1425,55], ["youyun2",1450,150]]) {
				const cloud = document.createElement("img");
				cloud.className = "yjcm-wallpaper-cloud";
				cloud.src = path + `zhanchang_${name}.png`;
				cloud.alt = "";
				cloud.style.left = `${x}px`; cloud.style.top = `${y}px`;
				clouds.appendChild(cloud);
			}
			canvas.parentNode.appendChild(clouds);
		}
		const start = performance.now();
		let last = start;
		let nextFrame = start;
		let width = canvas.clientWidth, height = canvas.clientHeight;
		let resized = true;
		// 背景每帧读取尺寸、重写 visibility 会让其他扩展下一次读布局时同步刷新整页。
		resizeObserver = new ResizeObserver(() => {
			width = canvas.clientWidth;
			height = canvas.clientHeight;
			resized = true;
		});
		resizeObserver.observe(canvas);
		resume = () => {
			if (!document.hidden && !disposed && !frame) {
				last = performance.now();
				nextFrame = last;
				frame = requestAnimationFrame(draw);
			}
		};
		document.addEventListener("visibilitychange", visibilityChanged);
		function draw(now) {
			frame = 0;
			if (!isCurrent() || !canvas.isConnected) {
				dispose();
				return;
			}
			if (document.hidden) return;
			if (!resized && now < nextFrame) {
				frame = requestAnimationFrame(draw);
				return;
			}
			// 以真实时间推进骨骼，保留节拍余量，适配 60/90/120Hz 屏幕。
			if (frameInterval) nextFrame = now + frameInterval - Math.max(0, now - nextFrame) % frameInterval;
			const delta = Math.min((now - last) / 1000, .1);
			last = now;
			if (width && height && !context.gl.isContextLost()) {
				const scale = Math.max(width / 1500, height / 750);
				if (resized) {
					// 手机仅缩小透明特效缓冲区，底图和取景仍使用原始 CSS 尺寸。
					const ratio = mobile ? Math.min(1, 1024 / Math.max(width, height)) : 1;
					const bufferWidth = Math.max(1, Math.round(width * ratio));
					const bufferHeight = Math.max(1, Math.round(height * ratio));
					if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
					if (canvas.height !== bufferHeight) canvas.height = bufferHeight;
					context.gl.viewport(0, 0, bufferWidth, bufferHeight);
					clouds?.style.setProperty("--yjcm-scene-scale", scale);
					resized = false;
				}
				context.gl.clearColor(0, 0, 0, 0);
				context.gl.clear(context.gl.COLOR_BUFFER_BIT);
				for (const { animation, skeleton, state } of layers) {
					state.update(delta);
					state.apply(skeleton);
					if (animation.moving) {
						const progress = ((now - start) % 60000) / 60000;
						skeleton.x = 1006 - 1381 * progress;
						skeleton.y = 475 * progress;
					}
					skeleton.updateWorldTransform();
					renderer.camera.setViewport(width / (scale * animation.scale), height / (scale * animation.scale));
					renderer.begin();
					renderer.drawSkeleton(skeleton, false);
					renderer.end();
				}
				if (canvas.dataset.playing !== "true") {
					canvas.style.visibility = "visible";
					canvas.dataset.playing = "true";
				}
			}
			frame = requestAnimationFrame(draw);
		}
		draw(start);
	} catch (error) {
		dispose();
		throw error;
	}
}
