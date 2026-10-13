import { get, lib } from "noname";
const t = ["新杀", "手杀", "OL", "TW"],
	n = name => {
		const prefix = t.find(t => name.startsWith(t));
		return prefix ? name.slice(prefix.length) : name;
	};
function e() {
	get.slimNameHorizontal = function (str) {
		const slimName = lib.translate[`${str}_ab`] || lib.translate[str];
		if (!slimName) return "";
		const prefixKey = `${str}_prefix`;
		if (!lib.translate[prefixKey]) return n(slimName);
		const prefixList = lib.translate[prefixKey].split("|").filter(p => !t.includes(p)),
			setPrefix = [];
		let processedName = slimName;
		for (const n of prefixList) {
			const e = t.find(hp => processedName.startsWith(hp + n));
			if (e) (setPrefix.push(n), (processedName = processedName.slice(e.length + n.length)));
			else {
				if (!processedName.startsWith(n)) break;
				(setPrefix.push(n), (processedName = processedName.slice(n.length)));
			}
		}
		if (setPrefix.length) {
			return `${setPrefix.map(t => get.prefixSpan(t, str)).join("")}<span>${n(processedName)}</span>`;
		}
		return n(processedName);
	};
	const originalPrefixSpan = get.prefixSpan;
	get.prefixSpan = function (prefix, name) {
		return t.includes(prefix) ? "" : originalPrefixSpan.call(this, prefix, name);
	};
}
export { e as setupCharacterNamePrefix };
