import { lib, get, game, ui, ai, _status } from "noname";
function initApp() {
	const ensureListenersArray = (obj, key) => {
		obj[key] || (obj[key] = []);
	};
	((window.app = {
		each(obj, fn, node) {
			if (!obj) return node;
			if ("number" == typeof obj.length) for (let i = 0; i < obj.length && !1 !== fn.call(node, obj[i], i); i++);
			else for (const i in obj) if (!1 === fn.call(node, obj[i], i)) break;
			return node;
		},
		isFunction: fn => "function" == typeof fn,
		event: {
			listens: {},
			on(name, listen, remove) {
				return (ensureListenersArray(this.listens, name), this.listens[name].push({ listen: listen, remove: remove }), this);
			},
			off(name, listen) {
				return app.each(
					this.listens[name],
					(item, index) => {
						(listen !== item && listen !== item.listen) || this.listens[name].splice(index, 1);
					},
					this
				);
			},
			emit(name, ...args) {
				return app.each(
					this.listens[name],
					item => {
						(item.listen(...args), item.remove && this.off(name, item));
					},
					this
				);
			},
			once(e, t) {
				return this.on(e, t, !0);
			},
		},
		create: {},
		listens: {},
		plugins: [],
		pluginsMap: {},
		path: { ext: (path, ext) => `${lib.assetURL}extension/${ext || app.name}/${path}` },
		on(event, listen) {
			(ensureListenersArray(this.listens, event), this.listens[event].push(listen));
		},
		once(event, listen) {
			(ensureListenersArray(this.listens, event), this.listens[event].push({ listen: listen, remove: !0 }));
		},
		off(event, listen) {
			const listens = this.listens[event] || [];
			(listen ? listens.filter(item => item === listen || item.listen === listen) : listens.slice()).forEach(item => {
				const idx = listens.indexOf(item);
				idx > -1 && listens.splice(idx, 1);
			});
		},
		emit(event, ...args) {
			(this.listens[event] || []).forEach(item => {
				if ("function" == typeof item) item(...args);
				else if ("function" == typeof item.listen && (item.listen(...args), item.remove)) {
					const e = this.listens[event].indexOf(item);
					e > -1 && this.listens[event].splice(e, 1);
				}
			});
		},
		import(fn) {
			const obj = fn(lib, game, ui, get, ai, _status, app);
			(obj && (obj.name && (this.pluginsMap[obj.name] = obj), !obj.precontent || (obj.filter && !obj.filter()) || obj.precontent()), this.plugins.push(obj));
		},
		importPlugin(data, setText) {
			if (!window.JSZip) return void lib.init.js(`${lib.assetURL}game`, "jszip", () => app.importPlugin(data, setText));
			setText = "function" == typeof setText ? setText : () => {};
			const zip = new JSZip(data),
				dirList = [],
				fileList = [];
			for (const c in zip.files)
				if (/\/$/.test(c)) dirList.push(`extension/${app.name}/${c}`);
				else if (!/^extension\.(js|css)$/.test(c)) {
					const e = c.split("/");
					(e.pop(), fileList.push({ id: c, path: `extension/${app.name}/${e.join("/")}`, name: e[e.length - 1] || c.split("/").pop(), target: zip.files[c] }));
				}
			const total = dirList.length + fileList.length;
			let finish = 0;
			const isNode = lib.node?.fs,
				writeFile = () => {
					const file = fileList.shift();
					if (file) {
						setText(`正在导入(${++finish}/${total})...`);
						const buffer = isNode ? file.target.asNodeBuffer() : file.target.asArrayBuffer();
						game.writeFile(buffer, file.path, file.name, writeFile);
					} else (alert("导入完成"), setText("导入插件"));
				},
				ensureDir = () => {
					dirList.length ? (setText(`正在导入(${++finish}/${total})...`), game.ensureDirectory(dirList.shift(), ensureDir)) : writeFile();
				};
			ensureDir();
		},
		loadPlugins(callback) {
			game.getFileList(`extension/${app.name}`, folders => {
				const total = folders.length;
				let current = 0;
				if (0 === total) return void callback();
				const loaded = () => {
						++current === total && callback();
					},
					readAndEval = (dir, file) => {
						game.readFile(
							`extension/${app.name}/${dir}/${file}`,
							data => {
								const binary = new Uint8Array(data),
									blob = new Blob([binary]),
									reader = new FileReader();
								(reader.readAsText(blob),
									(reader.onload = () => {
										(eval(reader.result), loaded());
									}));
							},
							() => loaded()
						);
					},
					styleFileMap = { on: "main1.js", othersOff: "main3.js" },
					fileName = styleFileMap[lib.config.extension_十周年UI_newDecadeStyle] ?? "main2.js";
				folders.forEach(dir => readAndEval(dir, fileName));
			});
		},
		reWriteFunction(target, name, replace, str) {
			if (name && "object" == typeof name) return app.each(name, (item, index) => app.reWriteFunction(target, index, item[0], item[1]), target);
			if (("string" == typeof replace || replace instanceof RegExp) && ("string" == typeof str || str instanceof RegExp)) eval(`target.${name} = ${target[name].toString().replace(replace, str)}`);
			else {
				const e = target[name];
				target[name] = function (...t) {
					let n = "function" == typeof replace ? replace.apply(this, [t, ...t]) : void 0,
						result = "function" != typeof e || n ? void 0 : e.apply(this, t);
					return ("function" == typeof str && str.apply(this, [result, ...t]), n ?? result);
				};
			}
			return target[name];
		},
		reWriteFunctionX(target, name, replace) {
			if (name && "object" == typeof name) return app.each(name, (item, index) => app.reWriteFunction(target, index, item), target);
			if (!Array.isArray(replace)) return target[name];
			let [item1, item2, item3] = replace;
			if (("append" === item3 ? (item2 = item1 + item2) : "insert" === item3 && (item2 += item1), "string" == typeof item1 && (item1 = new RegExp(item1)), item1 instanceof RegExp && "string" == typeof item2)) eval(`target.${name} = ${target[name].toString().replace(item1, item2)}`);
			else {
				const e = target[name];
				target[name] = function (...args) {
					let result = app.isFunction(item1) ? item1.apply(this, [args, ...args]) : void 0;
					return (app.isFunction(e) && !result && (result = e.apply(this, args)), app.isFunction(item2) && item2.apply(this, [result, ...args]), result);
				};
			}
			return target[name];
		},
		waitAllFunction(fnList, callback) {
			const list = fnList.slice(),
				runNext = () => {
					const item = list.shift();
					"function" == typeof item ? item(runNext) : 0 === list.length ? callback() : runNext();
				};
			runNext();
		},
		element: { runNext: { setTip: tip => console.info(tip) } },
		get: {
			skillInfo(skill, node) {
				const obj = { id: skill },
					info = lib.skill[skill];
				return ((obj.info = info), (obj.name = lib.translate[`${skill}_ab`] || lib.translate[skill]), (obj.nameSimple = lib.translate[`${skill}_ab`] || lib.translate[skill]?.slice(0, 2)), node && ((obj.forbidden = !!node.forbiddenSkills?.[skill]), (obj.disabled = !!node.disabledSkills?.[skill]), (obj.temp = info?.temp || !node.skills?.includes(skill)), (obj.frequent = !(!info?.frequent && !info?.subfrequent)), (obj.clickable = !!(info?.clickable && node.isIn() && node.isUnderControl(!0))), (obj.nobracket = !!info?.nobracket)), (obj.translation = get.skillInfoTranslation(skill, void 0, !1)), (obj.translationSource = lib.translate[`${skill}_info`]), (obj.translationAppend = lib.translate[`${skill}_append`]), (obj.type = info?.enable ? "enable" : "trigger"), obj);
			},
		},
		listen(node, func) {
			const eventType = lib.config.touchscreen ? "touchend" : "click";
			return (node.addEventListener(eventType, func), () => node.removeEventListener(eventType, func));
		},
		mockTouch(node) {
			const eventType = lib.config.touchscreen ? "touchend" : "click";
			return (node.dispatchEvent(new Event(eventType)), node);
		},
		nextTick(func, time) {
			const funcs = Array.isArray(func) ? func.slice() : [func],
				next = () => {
					const item = funcs.shift();
					item &&
						setTimeout(() => {
							(item(), next());
						}, time || 0);
				};
			next();
		},
	}),
		lib.config.dev && (window.app = app));
}
export { initApp };
