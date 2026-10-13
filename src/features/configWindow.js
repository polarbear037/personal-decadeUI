import { showDecadeConfigWindow as showDecadeConfigWindow, hideDecadeConfigWindow as hideDecadeConfigWindow } from "../config/config-window.js";
function n() {
	(window.decadeUI && ((window.decadeUI.showConfigWindow = showDecadeConfigWindow), (window.decadeUI.hideConfigWindow = hideDecadeConfigWindow)),
		document.addEventListener("keydown", d => {
			d.ctrlKey && d.shiftKey && "C" === d.key && (d.preventDefault(), showDecadeConfigWindow());
		}));
}
export { n as setupConfigWindow };
