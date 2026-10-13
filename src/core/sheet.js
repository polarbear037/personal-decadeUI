import "noname";
function e() {
	return {
		init() {
			if (!this.sheetList) {
				this.sheetList = [];
				for (let e = 0; e < document.styleSheets.length; e++) -1 !== document.styleSheets[e].href?.indexOf("extension/" + encodeURI(decadeUIName)) && this.sheetList.push(document.styleSheets[e]);
			}
			this.sheetList && delete this.init;
		},
		getStyle(selector, cssName) {
			if ((this.sheetList || this.init(), !this.sheetList)) throw "sheet not loaded";
			if ("string" != typeof selector || !selector) throw 'parameter "selector" error';
			if ((this.cachedSheet || (this.cachedSheet = {}), this.cachedSheet[selector])) return this.cachedSheet[selector];
			const sheetList = this.sheetList;
			let sheet,
				shouldBreak = !1;
			for (let n = sheetList.length - 1; n >= 0; n--) {
				if ("string" == typeof cssName) {
					cssName = cssName.replace(/.css/, "") + ".css";
					for (let e = n; e >= 0; e--) -1 !== sheetList[e].href.indexOf(cssName) && (sheet = sheetList[e]);
					if (((shouldBreak = !0), !sheet)) throw "cssName not found";
				} else sheet = sheetList[n];
				try {
					for (let t = 0; t < sheet.cssRules.length; t++)
						if (sheet.cssRules[t] instanceof CSSMediaRule) {
							const s = sheet.cssRules[t].cssRules;
							for (let t = 0; t < s.length; t++) if (s[t].selectorText === selector) return s[t].style;
						} else if (sheet.cssRules[t].selectorText === selector) return ((this.cachedSheet[selector] = sheet.cssRules[t].style), sheet.cssRules[t].style);
				} catch (r) {
					console.error(r, "error-sheet", sheet);
				}
				if (shouldBreak) break;
			}
			return null;
		},
		insertRule(rule, index, cssName) {
			if ((this.sheetList || this.init(), !this.sheetList)) throw "sheet not loaded";
			if ("string" != typeof rule || !rule) throw 'parameter "rule" error';
			let sheet;
			if ("string" == typeof cssName) {
				cssName = cssName.replace(/.css/, "") + ".css";
				for (let e = this.sheetList.length - 1; e >= 0; e--) -1 !== this.sheetList[e].href.indexOf(cssName) && (sheet = this.sheetList[e]);
				if (!sheet) throw "cssName not found";
			}
			sheet || (sheet = this.sheetList[this.sheetList.length - 1]);
			const inserted = "number" == typeof index ? sheet.insertRule(rule, index) : sheet.insertRule(rule, sheet.cssRules.length);
			return sheet.cssRules[inserted].style;
		},
	};
}
export { e as createSheetModule };
