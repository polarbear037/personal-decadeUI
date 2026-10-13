import "noname";
class t {
	constructor(p1x, p1y, p2x, p2y) {
		((this.cX = 3 * p1x), (this.bX = 3 * (p2x - p1x) - this.cX), (this.aX = 1 - this.cX - this.bX), (this.cY = 3 * p1y), (this.bY = 3 * (p2y - p1y) - this.cY), (this.aY = 1 - this.cY - this.bY));
	}
	getX(t) {
		return t * (this.cX + t * (this.bX + t * this.aX));
	}
	getXDerivative(t) {
		return this.cX + t * (2 * this.bX + 3 * this.aX * t);
	}
	ease(t) {
		let i,
			s = t;
		do {
			((i = s), (s -= (this.getX(s) - t) / this.getXDerivative(s)));
		} while (Math.abs(s - i) > 1e-4);
		return s * (this.cY + s * (this.bY + s * this.aY));
	}
}
let i = null;
function s(fraction) {
	return (i || (i = new t(0.25, 0.1, 0.25, 1)), i.ease(fraction));
}
export { t as CubicBezierEase, s as ease };
