import { lib } from "noname";
function e(path, isAsync = !1) {
	if (document.querySelector(`script[src*="${path}"]`)) return null;
	const version = lib.extensionPack.十周年UI.version,
		script = document.createElement("script");
	return isAsync
		? ((script.async = !0), (script.defer = !0), (script.src = `${path}?v=${version}&t=${Date.now()}`), (script.onload = () => script.remove()), (script.onerror = () => script.remove()), document.head.appendChild(script), script)
		: new Promise((resolve, reject) => {
				((script.src = `${path}?v=${version}&t=${Date.now()}`),
					(script.onload = () => {
						(script.remove(), resolve(script));
					}),
					(script.onerror = () => {
						(script.remove(), reject(new Error(`Failed to load script: ${path}`)));
					}),
					document.head.appendChild(script));
			});
}
function n(path) {
	const basePath = path.split("?")[0];
	if (document.querySelector(`link[href*="${basePath}"]`)) return null;
	const version = lib.extensionPack.十周年UI.version,
		link = document.createElement("link");
	return ((link.rel = "stylesheet"), (link.href = `${path}?v=${version}&t=${Date.now()}`), document.head.appendChild(link), link);
}
export { n as createLinkElement, e as createScriptElement };
