import { lib } from "noname";
function e() {
	if (!lib.config[`extension_${decadeUIName}_eruda`]) return;
	const script = document.createElement("script");
	((script.src = `${decadeUIPath}src/libs/eruda.js`), (script.onload = () => eruda.init()), document.body.appendChild(script));
}
function n() {
	window.require && !window.fs && (window.fs = require("fs"));
}
export { e as initEruda, n as initNodeFS };
