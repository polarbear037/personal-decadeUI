import "noname";
function e() {
	return {
		activeElement(element) {
			const deactive = decadeUI.$activeElement;
			deactive !== element && ((decadeUI.$activeElement = element), deactive?.ondeactive?.(), element?.onactive?.());
		},
	};
}
export { e as createDecadeUISetModule };
