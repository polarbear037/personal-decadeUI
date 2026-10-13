import "noname";
import { APNode as APNode } from "./APNode.js";
class t {
	constructor(pathPrefix, parentNode, elementId) {
		if (!window.spine) return (console.error("spine 未定义."), (this.spine = { assets: {} }), (this.gl = null), void this.check());
		let canvas;
		"offscreen" === parentNode ? ((canvas = elementId), (this.offscreen = !0)) : ((canvas = document.createElement("canvas")), (canvas.className = "animation-player"), elementId && (canvas.id = elementId), parentNode && parentNode.appendChild(canvas));
		const config = { alpha: !0 };
		let gl = canvas.getContext("webgl2", config);
		(gl ? (gl.isWebgl2 = !0) : (gl = canvas.getContext("webgl", config) || canvas.getContext("experimental-webgl", config)),
			gl ? (this.spine = { shader: spine.webgl.Shader.newTwoColoredTextured(gl), batcher: new spine.webgl.PolygonBatcher(gl), skeletonRenderer: new spine.webgl.SkeletonRenderer(gl), assetManager: new spine.webgl.AssetManager(gl, pathPrefix), assets: {}, skeletons: [] }) : ((this.spine = { assets: {} }), console.error("当前设备不支持 WebGL.")),
			(this.gl = gl),
			(this.canvas = this.$canvas = canvas),
			(this.frameTime = void 0),
			(this.running = !1),
			(this.resized = !1),
			(this.dpr = 1),
			(this.nodes = []),
			(this.BUILT_ID = 0),
			(this._dprAdaptive = !1),
			(this.unpackPremultipliedAlpha = !1),
			Object.defineProperties(this, {
				dprAdaptive: {
					get() {
						return this._dprAdaptive;
					},
					set(e) {
						this._dprAdaptive !== e && ((this._dprAdaptive = e), (this.resized = !1));
					},
				},
				useMipMaps: {
					get() {
						return this.gl?.useMipMaps;
					},
					set(value) {
						this.gl && (this.gl.useMipMaps = value);
					},
				},
			}),
			this.offscreen || ((this.canvas.width = canvas.clientWidth), (this.canvas.height = canvas.clientHeight)),
			this.check());
	}
	check() {
		if (!this.gl) {
			const e = () => {};
			for (const t of Object.keys(this.__proto__)) "function" == typeof this.__proto__[t] && (this.__proto__[t] = e);
			for (const t of Object.keys(this)) "function" == typeof this[t] && "check" !== t && (this[t] = e);
		}
	}
	createTextureRegion(image, name) {
		const page = new spine.TextureAtlasPage();
		((page.name = name), (page.uWrap = page.vWrap = spine.TextureWrap.ClampToEdge), (page.texture = this.spine.assetManager.textureLoader(image)), page.texture.setWraps(page.uWrap, page.vWrap), (page.width = page.texture.getImage().width), (page.height = page.texture.getImage().height));
		const region = new spine.TextureAtlasRegion();
		return ((region.page = page), (region.rotate = !1), (region.width = region.originalWidth = page.width), (region.height = region.originalHeight = page.height), (region.x = region.y = 0), (region.u = region.v = 0), (region.u2 = region.v2 = 1), (region.index = -1), (region.texture = page.texture), (region.renderObject = region), region);
	}
	hasSpine(e) {
		return void 0 !== this.spine.assets[e];
	}
	loadSpine(filename, skelType, onload, onerror) {
		if (!this.spine.assetManager) return void (onerror && onerror());
		const type = (skelType || "skel").toLowerCase(),
			manager = this.spine.assetManager,
			assets = this.spine.assets,
			reader = {
				filename: filename,
				skelType: type,
				loaded: 0,
				errors: 0,
				toLoad: 2,
				onerror: () => {
					(reader.toLoad--, reader.errors++, 0 === reader.toLoad && (console.error(`loadSpine: [${filename}] 加载失败.`), onerror && onerror()));
				},
				onload: () => {
					(reader.toLoad--, reader.loaded++, 0 === reader.toLoad && (reader.errors > 0 ? (console.error(`loadSpine: [${filename}] 加载失败.`), onerror && onerror()) : ((assets[filename] = { name: filename, skelType: type }), onload && onload())));
				},
				ontextLoad: (path, data) => {
					const atlasReader = new spine.TextureAtlasReader(data),
						prefix = this._getPathPrefix(filename);
					let imageName = null;
					for (;;) {
						let e = atlasReader.readLine();
						if (null === e) break;
						((e = e.trim()), 0 === e.length ? (imageName = null) : imageName || ((imageName = e), reader.toLoad++, manager.loadTexture(prefix + imageName, reader.onload, reader.onerror)));
					}
					reader.onload();
				},
			};
		("json" === type ? manager.loadText(filename + ".json", reader.onload, reader.onerror) : manager.loadBinary(filename + ".skel", reader.onload, reader.onerror), manager.loadText(filename + ".atlas", reader.ontextLoad, reader.onerror));
	}
	_getPathPrefix(filename) {
		const t = filename.lastIndexOf("/"),
			i = filename.lastIndexOf("\\");
		return -1 === t && -1 === i ? "" : filename.substring(0, Math.max(t, i) + 1);
	}
	prepSpine(filename, autoLoad) {
		const assets = this.spine.assets;
		if (!assets[filename]) return autoLoad ? (this.loadSpine(filename, "skel", () => this.prepSpine(filename)), "loading") : void console.error(`prepSpine: [${filename}] 骨骼没有加载`);
		const skeletons = this.spine.skeletons;
		for (const l of skeletons) if (l.name === filename && l.completed) return l;
		const asset = assets[filename],
			manager = this.spine.assetManager;
		if (!asset.skelRawData) {
			const t = this._getPathPrefix(filename),
				i = new spine.TextureAtlas(manager.get(filename + ".atlas"), path => manager.get(t + path)),
				s = new spine.AtlasAttachmentLoader(i);
			((asset.skelRawData = "json" === asset.skelType ? new spine.SkeletonJson(s) : new spine.SkeletonBinary(s)), (asset.ready = !0));
		}
		const data = asset.skelRawData.readSkeletonData(manager.get(`${filename}.${asset.skelType}`)),
			skeleton = new spine.Skeleton(data);
		return (
			(skeleton.name = filename),
			(skeleton.completed = !0),
			skeleton.setSkinByName("default"),
			skeleton.setToSetupPose(),
			skeleton.updateWorldTransform(),
			(skeleton.state = new spine.AnimationState(new spine.AnimationStateData(skeleton.data))),
			skeleton.state.addListener({
				complete(track) {
					const node = skeleton.node;
					node ? ((track.loop = node.loop ?? !1), track.loop && node.loopCount > 0 && (node.loopCount--, 0 === node.loopCount && (track.loop = !1)), (skeleton.completed = node.completed = !track.loop), node.complete && node.complete()) : ((skeleton.completed = !track.loop), console.error("skeleton complete: 超出预期的错误"));
				},
			}),
			(skeleton.bounds = { offset: new spine.Vector2(), size: new spine.Vector2() }),
			skeleton.getBounds(skeleton.bounds.offset, skeleton.bounds.size, []),
			(skeleton.defaultAction = data.animations[0].name),
			(skeleton.node = void 0),
			skeletons.push(skeleton),
			skeleton
		);
	}
	playSpine(sprite, position) {
		if (void 0 === sprite) return void console.error("playSpine: parameter undefined");
		if (("string" == typeof sprite && (sprite = { name: sprite }), !this.hasSpine(sprite.name))) return void console.error(`playSpine: [${sprite.name}] 骨骼没有加载`);
		let skeleton;
		if (sprite instanceof APNode && sprite.skeleton.completed) skeleton = sprite.skeleton;
		else {
			if (((skeleton = this.spine.skeletons.find(sk => sk.name === sprite.name && sk.completed)), skeleton || (skeleton = this.prepSpine(sprite.name)), !(sprite instanceof APNode))) {
				const i = sprite;
				(((sprite = new APNode(sprite)).id = i.id ?? this.BUILT_ID++), this.nodes.push(sprite));
			}
			((sprite.skeleton = skeleton), (skeleton.node = sprite));
		}
		((sprite.completed = skeleton.completed = !1), position && Object.assign(sprite, { x: position.x, y: position.y, height: position.height, width: position.width, scale: position.scale, angle: position.angle, referNode: position.parent, referFollow: position.follow }));
		return ((skeleton.state.setAnimation(0, sprite.action || skeleton.defaultAction, sprite.loop).mixDuration = 0), void 0 === this.requestId && ((this.running = !0), this.offscreen || (this.canvas.style.visibility = "visible"), (this.requestId = requestAnimationFrame(this.render.bind(this)))), (sprite.referBounds = void 0), sprite);
	}
	loopSpine(e, t) {
		return ("string" == typeof e ? (e = { name: e, loop: !0 }) : (e.loop = !0), this.playSpine(e, t));
	}
	stopSpine(sprite) {
		const id = sprite.id ?? sprite;
		for (const i of this.nodes) if (i.id === id && !i.completed) return ((i.completed = !0), i.skeleton.state.setEmptyAnimation(0), i.skeleton && ((i.skeleton.completed = !0), (i.skeleton.node = void 0)), i);
		return null;
	}
	stopSpineAll() {
		for (const e of this.nodes) e.completed || ((e.completed = !0), e.skeleton.state.setEmptyAnimation(0), e.skeleton && ((e.skeleton.completed = !0), (e.skeleton.node = void 0)));
	}
	getSpineActions(filename) {
		if (!this.hasSpine(filename)) return void console.error(`getSpineActions: [${filename}] 骨骼没有加载`);
		let skeleton = this.spine.skeletons.find(sk => sk.name === filename);
		return (skeleton || (skeleton = this.prepSpine(filename)), skeleton.data.animations.map(a => ({ name: a.name, duration: a.duration })));
	}
	getSpineBounds(filename) {
		if (!this.hasSpine(filename)) return void console.error(`getSpineBounds: [${filename}] 骨骼没有加载`);
		if (!this.resized) {
			const e = this.dprAdaptive ? Math.max(window.devicePixelRatio * (window.documentZoom || 1), 1) : 1;
			((this.canvas.elementHeight = this.canvas.clientHeight), (this.canvas.elementWidth = this.canvas.clientWidth), (this.canvas.height = this.canvas.elementHeight * e), (this.canvas.width = this.canvas.elementWidth * e));
		}
		let skeleton = this.spine.skeletons.find(sk => sk.name === filename);
		return (skeleton || (skeleton = this.prepSpine(filename)), skeleton.bounds);
	}
	render(timestamp) {
		const canvas = this.canvas,
			offscreen = this.offscreen,
			dpr = this.dprAdaptive ? (offscreen ? this.dpr || 1 : Math.max(window.devicePixelRatio * (window.documentZoom || 1), 1)) : 1,
			delta = timestamp - (this.frameTime ?? timestamp);
		this.frameTime = timestamp;
		let erase = !0;
		(this.resized && 0 !== canvas.width && 0 !== canvas.height) || ((this.resized = !0), offscreen ? (this.width && ((canvas.width = dpr * this.width), (erase = !1)), this.height && ((canvas.height = dpr * this.height), (erase = !1))) : ((canvas.width = dpr * canvas.clientWidth), (canvas.height = dpr * canvas.clientHeight), (erase = !1)));
		const eventArgs = { dpr: dpr, delta: delta, canvas: canvas, frameTime: timestamp };
		for (let h = this.nodes.length - 1; h >= 0; h--) {
			const e = this.nodes[h];
			e.completed ? this.nodes.splice(h, 1) : e.update(eventArgs);
		}
		const gl = this.gl;
		if ((gl.viewport(0, 0, canvas.width, canvas.height), erase && (gl.clearColor(0, 0, 0, 0), gl.clear(gl.COLOR_BUFFER_BIT)), 0 === this.nodes.length)) return ((this.frameTime = this.requestId = void 0), (this.running = !1), void (offscreen || (this.canvas.style.visibility = "hidden")));
		const { shader: shader, batcher: batcher, skeletonRenderer: renderer } = this.spine;
		(gl.enable(gl.SCISSOR_TEST), gl.scissor(0, 0, canvas.width, canvas.height), this.bindShader || ((this.bindShader = shader), shader.bind(), shader.setUniformi(spine.webgl.Shader.SAMPLER, 0)));
		for (const h of this.nodes) {
			h.renderClip && ((gl.clipping = h.renderClip), gl.scissor(gl.clipping.x, gl.clipping.y, gl.clipping.width, gl.clipping.height));
			const e = h.skeleton,
				i = e.state,
				s = h.speed ?? 1;
			((e.flipX = h.flipX), (e.flipY = h.flipY), (e.opacity = h.renderOpacity ?? 1), (i.hideSlots = h.hideSlots), i.update((delta / 1e3) * s), i.apply(e), e.updateWorldTransform(), shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, h.mvp.values), batcher.begin(shader), (renderer.premultipliedAlpha = h.premultipliedAlpha), (renderer.outcropMask = this.outcropMask), (renderer.unpackPremultipliedAlpha = this.unpackPremultipliedAlpha), renderer.outcropMask && ((renderer.outcropX = h.renderX), (renderer.outcropY = h.renderY), (renderer.outcropScale = h.renderScale), (renderer.outcropAngle = h.renderAngle), (renderer.clipSlots = h.clipSlots)), (renderer.hideSlots = h.hideSlots), (renderer.disableMask = h.disableMask), renderer.draw(batcher, e), batcher.end(), gl.clipping && ((gl.clipping = void 0), gl.scissor(0, 0, canvas.width, canvas.height)));
		}
		(gl.disable(gl.SCISSOR_TEST), (this.requestId = requestAnimationFrame(this.render.bind(this))));
	}
}
export { t as AnimationPlayer };
