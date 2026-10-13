import "noname";
function e(func, timeout, context) {
	let args, timer, previous;
	return (...innerArgs) => {
		(timer && clearTimeout(timer), null === previous && (previous = performance.now()), (args = innerArgs));
		const timestamp = performance.now() - previous;
		timestamp >= timeout
			? ((timer = previous = null), func.apply(context, args))
			: (timer = setTimeout(() => {
					((timer = previous = null), func.apply(context, args));
				}, timeout - timestamp));
	};
}
const r = (() => {
	if (!self.ResizeObserver) return null;
	const observer = new ResizeObserver(entries => {
		for (const entry of entries) {
			const callback = observer.callbacks[entry.target.observeId];
			if (callback) {
				const rect = entry.contentRect;
				callback({ width: rect.width, height: rect.height });
			}
		}
	});
	return (
		(observer.observeId = 0),
		(observer.callbacks = {}),
		(target, callback) => {
			((target.observeId = observer.observeId++), observer.observe(target), (observer.callbacks[target.observeId] = callback));
		}
	);
})();
function t(min, max, fraction) {
	return (max - min) * fraction + min;
}
function n() {
	if ("object" == typeof window?.process?.versions && window.process.versions.chrome) {
		return [
			"chrome",
			...window.process.versions.chrome
				.split(".")
				.slice(0, 3)
				.map(e => parseInt(e, 10)),
		];
	}
	if (navigator.userAgentData?.brands?.length) {
		const e = navigator.userAgentData.brands.find(({ brand: brand }) => {
			const lower = brand.toLowerCase();
			return lower.includes("chrome") || lower.includes("chromium");
		});
		return e ? ["chrome", parseInt(e.version, 10), 0, 0] : ["other", NaN, NaN, NaN];
	}
	const matched = navigator.userAgent.toLowerCase().match(/(firefox|chrome|safari)\/(\d+(?:\.\d+)+)/);
	if (!matched) return ["other", NaN, NaN, NaN];
	if ("safari" !== matched[1]) {
		const [major, minor, patch] = matched[2].split(".");
		return [matched[1], parseInt(major, 10), parseInt(minor, 10), parseInt(patch, 10)];
	}
	const ua = navigator.userAgent.toLowerCase(),
		result = /macintosh/.test(ua) ? ua.match(/version\/(\d+(?:\.\d+)+).*safari/) : ua.match(/(?:iphone|ipad); cpu (?:iphone )?os (\d+(?:_\d+)+)/);
	if (!result) return ["other", NaN, NaN, NaN];
	const [major, minor, patch] = result[1].split(/[._]/);
	return ["safari", parseInt(major, 10), parseInt(minor, 10), parseInt(patch, 10)];
}
const o = n(),
	s = ("chrome" === o[0] && o[1] >= 128) || ("firefox" === o[0] && o[1] >= 126);
export { n as getBrowserInfo, t as lerp, r as observeSize, e as throttle, s as useNewDpr };
