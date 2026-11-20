// 使用真实 CSS、@import 和加载入口，检查六种风格及未知/缺省配置。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require(path.join(require("node:os").homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
const root = path.resolve(__dirname, "../../..");
const base = "/extension/十周年UI/";
const names = ["animation", "card", "component", "decadeLayout", "dialog", "effect", "equip", "layout", "meihua"];
const equipSource = fs.readFileSync(path.join(__dirname, "../src/features/equipHand.js"), "utf8")
	.replace(/^import .*;\r?\n/gm, "").replace(/^export .*;\r?\n/gm, "");
const server = http.createServer((req, res) => {
	const url = new URL(req.url, "http://local");
	if (url.pathname === "/__style-route__") {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.end('<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"noname":"/noname-stub.js"}}</script><body></body>');
		return;
	}
	if (url.pathname === "/noname-stub.js") {
		res.setHeader("Content-Type", "text/javascript");
		res.end("export const {lib,ui,get,game,ai,_status}=window;");
		return;
	}
	const filename = path.resolve(root, "." + decodeURIComponent(url.pathname));
	if (!filename.startsWith(root + path.sep)) return res.writeHead(403).end();
	fs.readFile(filename, (error, data) => {
		if (error) return res.writeHead(404).end();
		res.setHeader("Content-Type", { ".js": "text/javascript", ".css": "text/css" }[path.extname(filename)] || "application/octet-stream");
		res.end(data);
	});
});

(async () => {
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	try {
		for (const style of ["on", "off", "othersOff", "onlineUI", "babysha", "codename", "unknown", null]) {
			const page = await browser.newPage();
			const errors = [];
			page.on("pageerror", error => errors.push(error.message));
			page.on("response", response => {
				if (response.status() >= 400 && new URL(response.url()).pathname.endsWith(".css")) errors.push(response.url());
			});
			await page.route("**/src/utils/version.js", route => route.fulfill({ contentType: "text/javascript", body: "export function checkVersionCompatibility(){}" }));
			await page.route("**/src/ui/prefixMark.js", route => route.fulfill({ contentType: "text/javascript", body: "export const prefixMarkModule={setupShowCharacterHook(){}};" }));
			await page.route("**/src/libs/spine.js?*", route => route.fulfill({ contentType: "text/javascript", body: "/* 样式路由验证不启动 Spine */" }));
			await page.goto(origin + "/__style-route__");
			await page.evaluate(({ style, base, origin }) => {
				window.lib = { assetURL: origin + "/", config: {}, extensionPack: { 十周年UI: { version: "route-check" } } };
				if (style !== null) lib.config.extension_十周年UI_newDecadeStyle = style;
				window.ui = { css: { layout: { href: "layout/long2/layout.css" } } };
				window.get = { mode: () => "identity" };
				window.game = {};
				window.ai = {};
				window._status = {};
				window.decadeUIPath = base;
			}, { style, base, origin });
			await page.evaluate(async base => {
				window.getStyleFile = (await import(base + "src/styles/style-route.js")).getStyleFile;
				await (await import(base + "src/core/decadeModule.js")).initDecadeModule();
			}, base);
			await page.addScriptTag({ content: `(function(){${equipSource}\nwindow.loadLateEquipStyle=loadLateEquipStyle;})();` });
			await page.evaluate(() => loadLateEquipStyle());
			await page.waitForLoadState("networkidle");
			const result = await page.evaluate(() => {
				const files = new Set();
				function visit(sheet) {
					if (sheet.href) files.add(decodeURIComponent(new URL(sheet.href).pathname).split("/").pop());
					for (const rule of sheet.cssRules) if (rule.styleSheet) visit(rule.styleSheet);
				}
				for (const sheet of document.styleSheets) visit(sheet);
				return { files: [...files], late: new URL(document.getElementById("decade-equip-style-override").href).pathname.split("/").pop(), style: document.body.dataset.style };
			});
			const suffix = style === "onlineUI" ? "-online" : style === "othersOff" ? "-xinsha" : "";
			for (const name of names) {
				assert.ok(result.files.includes(`${name}${suffix}.css`), `${style}: missing ${name}`);
				for (const otherSuffix of ["", "-online", "-xinsha"].filter(value => value !== suffix)) {
					assert.ok(!result.files.includes(`${name}${otherSuffix}.css`), `${style}: mixed ${name}${otherSuffix}`);
				}
			}
			assert.equal(result.late, `equip${suffix}.css`);
			assert.equal(result.style, style ?? "on");
			if (style === "othersOff") {
				const jsRoute = await page.evaluate(async base => {
					const route = await import(base + "src/overrides/player/card-route.js");
					const selected = await route.loadPlayerCardOverrides("othersOff");
					const actions = await import(base + "src/overrides/player/card-actions-xinsha.js");
					const movement = await import(base + "src/overrides/player/card-movement-xinsha.js");
					const fallbackActions = await import(base + "src/overrides/player/card-actions.js");
					const fallbackMovement = await import(base + "src/overrides/player/card-movement.js");
					return {
						skin: selected.skin,
						actions: selected.actions === actions && actions.playerUseCard !== fallbackActions.playerUseCard,
						movement: selected.movement === movement && movement.playerDraw !== fallbackMovement.playerDraw,
						exports: Object.values(actions).every(value => typeof value === "function") && Object.values(movement).every(value => typeof value === "function"),
					};
				}, base);
				assert.deepEqual(jsRoute, { skin: "xinsha", actions: true, movement: true, exports: true });
			}
			assert.deepEqual(errors, []);
			console.log(`${style ?? "default"}: PASS (nine styles, nested imports, late equipment, no CSS load/page errors)`);
			await page.close();
		}
	} finally {
		await browser.close();
		server.close();
	}
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
