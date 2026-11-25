// 只释放传入播放器自身的资源；多版本动皮共用画布，但不与其他角色共用这些实例。
export function disposeAnimationRenderer(renderer) {
	if (!renderer) return;
	cancelAnimationFrame(renderer.requestId);
	renderer.requestId = renderer.frameTime = undefined;
	renderer.running = false;
	if (renderer.gl?.renderAni === renderer) renderer.gl.renderAni = null;
	const spine = renderer.spine;
	if (spine) {
		// 关窗时尚未完成的图片请求不能重新分配 GPU 纹理。
		if (spine.assetManager) {
			spine.assetManager.textureLoader = () => ({ dispose() {} });
			spine.assetManager.dispose();
		}
		if (!renderer._dynamicResourcesDisposed) {
			spine.batcher?.dispose();
			spine.shader?.dispose();
		}
		spine.skeletons = [];
		spine.assets = {};
	}
	renderer.nodes = [];
	renderer._dynamicResourcesDisposed = true;
}
