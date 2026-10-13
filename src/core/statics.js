import { lib, game } from "noname";
import { cardSkinPresets as e, registerDynamicSkin as n, getAllCardSkinPresets as i } from "../config/utils.js";
import "../config/definitions/component.js";
((window._decadeUICardSkinQueue = window._decadeUICardSkinQueue || []),
	window.registerDecadeCardSkin ||
		(window.registerDecadeCardSkin = function (options) {
			window._decadeUICardSkinQueue.push(options);
		}));
const a = e =>
		new Promise(n => {
			"function" == typeof game.getFileList
				? game.getFileList(
						e,
						(e, files) => n(files || []),
						() => n([])
					)
				: n([]);
		}),
	t = (files, ext) => files.filter(f => f.toLowerCase().endsWith(ext)).map(f => f.substring(0, f.length - ext.length));
const detectImageFormat = async dir => {
	const files = await a(dir);
	const imageFormats = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"];

	for (const e of files) {
		const n = e.split(".").pop()?.toLowerCase();
		if (n && imageFormats.includes(n)) return n === "jpeg" ? "jpg" : n;
	}

	return "png";
};
function s() {
	const s = { READ_OK: {} },
		o = (e, n, i, a) => {
			const t = (skinKey => (s[skinKey] || (s[skinKey] = {}), s[skinKey]))(e);
			for (const s of i) s && !t[s] && (t[s] = { url: `${n}${s}.${a}`, name: s, loaded: !0 });
			s.READ_OK[e] = !0;
		},
		r = options => {
			const { extensionName: extensionName, skinKey: skinKey = "decade", folder: folder, extension: extension = "png", cardNames: cardNames } = options || {};
			if (!extensionName) return void console.warn("[十周年UI] registerCardSkin: 缺少 extensionName");
			const skinFolder = folder || skinKey,
				baseUrl = `${lib.assetURL}extension/${extensionName}/image/card-skins/${skinFolder}/`;
			if (Array.isArray(cardNames) && cardNames.length > 0) return void o(skinKey, baseUrl, cardNames, extension);
			a(`extension/${extensionName}/image/card-skins/${skinFolder}`).then(files => {
				const names = t(files, `.${extension.toLowerCase()}`);
				o(skinKey, baseUrl, names, extension);
			});
		},
		d = async () => {
			const i = `extension/${decadeUIName}/image/card-skins`,
				a = await ((t = i),
				new Promise(e => {
					"function" == typeof game.getFileList
						? game.getFileList(
								t,
								folders => e(folders || []),
								() => e([])
							)
						: e([]);
				}));
			var t;
			const s = new Set(e.map(e => e.key)),
				o = a
					.filter(folder => !s.has(folder))
					.map(async e => {
						const a = `${i}/${e}`,
							r = `${a}/meta.json`,
							t = await ((s = r),
							new Promise(e => {
								"function" == typeof game.readFileAsText
									? game.readFileAsText(
											s,
											text => {
												try {
													e(JSON.parse(text));
												} catch {
													e(null);
												}
											},
											() => e(null)
										)
									: e(null);
							}));
						var s;
						const o = t?.extension || (await detectImageFormat(a));
						n({ key: e, dir: e, label: t?.label || e, extension: o });
					});
			await Promise.all(o);
		};
	return (
		(async () => {
			await d();
			const e = i().map(async skin => {
				const folder = skin.dir || skin.key,
					dir = `extension/${decadeUIName}/image/card-skins/${folder}`,
					ext = skin.extension ? `.${skin.extension.toLowerCase()}` : ".png",
					baseUrl = `${decadeUIPath}image/card-skins/${folder}/`,
					files = await a(dir),
					names = t(files, ext);
				o(skin.key, baseUrl, names, skin.extension || "png");
			});
			(await Promise.all(e), (window._decadeUICardSkinQueue || []).forEach(options => r(options)), (window._decadeUICardSkinQueue = []), (window.registerDecadeCardSkin = r));
		})(),
		{ cards: s, handTips: [], registerCardSkin: r }
	);
}
export { s as createStaticsModule };
