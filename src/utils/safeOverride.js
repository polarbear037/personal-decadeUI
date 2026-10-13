function t(t, n, r) {
	if (!t || "function" != typeof t[n]) return () => {};
	const i = t[n];
	return (
		(t[n] = function (...args) {
			const result = i.apply(this, args);
			try {
				r.call(this, result, ...args);
			} catch (n) {}
			return result;
		}),
		(t[n]._original = i),
		() => {
			t[n] = i;
		}
	);
}
function n(t, n, r) {
	if (!t || "function" != typeof t[n]) return () => {};
	const i = t[n];
	return (
		(t[n] = function (...args) {
			try {
				r.call(this, ...args);
			} catch (n) {}
			return i.apply(this, args);
		}),
		(t[n]._original = i),
		() => {
			t[n] = i;
		}
	);
}
function r(t, n, r) {
	if (!t || "function" != typeof t[n]) return () => {};
	const i = t[n];
	return (
		(t[n] = function (...args) {
			try {
				return r.call(this, i, ...args);
			} catch (n) {
				return i.apply(this, args);
			}
		}),
		(t[n]._original = i),
		() => {
			t[n] = i;
		}
	);
}
export { t as wrapAfter, r as wrapAround, n as wrapBefore };
