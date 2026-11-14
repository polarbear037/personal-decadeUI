import spine from "../../../src/libs/spine-wallpaper.js";

export async function playOnlineBackground(canvas, path, signal, isCurrent, backgroundSlot) {
	const separator = path.lastIndexOf("/") + 1;
	const name = path.slice(separator);
	const context = new spine.ManagedWebGLRenderingContext(canvas);
	if (!context.gl) throw new Error("WebGL is unavailable");

	const assets = new spine.AssetManager(context, path.slice(0, separator));
	let renderer;
	let frame;
	let disposed = false;
	function dispose() {
		if (disposed) return;
		disposed = true;
		cancelAnimationFrame(frame);
		signal.removeEventListener("abort", dispose);
		renderer?.dispose();
		assets.dispose();
		canvas.remove();
		context.gl.getExtension("WEBGL_lose_context")?.loseContext();
	}

	try {
		assets.loadBinary(name + ".skel");
		assets.loadTextureAtlas(name + ".atlas.txt");
		await assets.loadAll();
		if (signal.aborted || !isCurrent()) {
			dispose();
			return;
		}

		const atlas = assets.get(name + ".atlas.txt");
		const data = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(assets.get(name + ".skel"));
		const skeleton = new spine.Skeleton(data);
		const state = new spine.AnimationState(new spine.AnimationStateData(data));
		state.setAnimation(0, data.findAnimation("play")?.name || data.animations[0].name, true);
		state.apply(skeleton);
		skeleton.updateWorldTransform();
		const offset = new spine.Vector2();
		const size = new spine.Vector2();
		if (backgroundSlot) {
			const slot = skeleton.findSlot(backgroundSlot);
			const attachment = slot?.getAttachment();
			if (!(attachment instanceof spine.RegionAttachment || attachment instanceof spine.MeshAttachment)) {
				throw new Error(`Missing wallpaper background attachment: ${backgroundSlot}`);
			}
			// 整副骨骼的包围盒包含画面外的旗帜和光效，取景以底图附件为准。
			const vertices = new Float32Array(attachment.worldVerticesLength || 8);
			if (attachment instanceof spine.RegionAttachment) {
				attachment.computeWorldVertices(slot.bone, vertices, 0, 2);
			} else {
				attachment.computeWorldVertices(slot, 0, vertices.length, vertices, 0, 2);
			}
			let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
			for (let i = 0; i < vertices.length; i += 2) {
				left = Math.min(left, vertices[i]);
				right = Math.max(right, vertices[i]);
				bottom = Math.min(bottom, vertices[i + 1]);
				top = Math.max(top, vertices[i + 1]);
			}
			offset.set(left, bottom);
			size.set(right - left, top - bottom);
		} else {
			skeleton.getBounds(offset, size);
		}
		renderer = new spine.SceneRenderer(canvas, context);
		renderer.camera.position.set(offset.x + size.x / 2, offset.y + size.y / 2, 0);

		let last = performance.now();
		function draw(now) {
			if (!isCurrent() || !canvas.isConnected) {
				dispose();
				return;
			}
			state.update(Math.min((now - last) / 1000, 0.1));
			last = now;
			state.apply(skeleton);
			skeleton.updateWorldTransform();
			const width = canvas.clientWidth;
			const height = canvas.clientHeight;
			if (width && height) {
				const zoom = Math.min(size.x / width, size.y / height);
				renderer.camera.setViewport(width * zoom, height * zoom);
				renderer.resize(spine.ResizeMode.Stretch);
				context.gl.clearColor(0, 0, 0, 0);
				context.gl.clear(context.gl.COLOR_BUFFER_BIT);
				renderer.begin();
				renderer.drawSkeleton(skeleton, atlas.pages[0]?.pma === true);
				renderer.end();
			}
			frame = requestAnimationFrame(draw);
		}
		signal.addEventListener("abort", dispose, { once: true });
		draw(last);
		canvas.dataset.playing = "true";
	} catch (error) {
		dispose();
		throw error;
	}
}
