import { xinshaBackgrounds } from "./xinsha-backgrounds.js";

const assetPath = "extension/十周年UI/ui/assets/lbtn/yijiang/";
const configKey = "extension_十周年UI_yjcmBackground";
const entries = new Map(xinshaBackgrounds.map(entry => [entry.id, entry]));

// GameSelectBgDlg / GameSelectBgItem，使用本体背景更新和配置保存接口。
export function createXinshaBackgroundSelector(lib, game, ui, get, _status) {
	let overlay;
	let animationController;
	const enabled = () => lib.config.extension_十周年UI_newDecadeStyle === "othersOff";
	const settings = () => lib.config[configKey] || {};
	const mode = () => get.mode() || lib.config.mode;
	// 动态开关独立保存，静态背景不应清掉偏好；旧配置未记录开关时默认开启。
	const selected = () => ({
		...(settings().modes?.[mode()] || settings().global || { id: 22 }),
		dynamic: settings().dynamicEnabled !== false,
	});
	const asset = path => lib.assetURL + assetPath + path;
	function element(parent, tag, className, text) {
		const node = document.createElement(tag);
		node.className = className;
		if (tag === "button") node.type = "button";
		if (text) node.textContent = text;
		parent.appendChild(node);
		return node;
	}

	function apply(selection) {
		const entry = entries.get(selection.id);
		if (!enabled() || !entry || !ui.background) return;
		animationController?.abort();
		const dynamic = selection.dynamic && entry.animations.length > 0;
		const temporary = _status.tempBackground;
		_status.tempBackground = `ext:${assetPath.slice("extension/".length)}${dynamic ? entry.dynamicImage : entry.image}`;
		try {
			game.updateBackground();
		} finally {
			if (temporary === undefined) delete _status.tempBackground;
			else _status.tempBackground = temporary;
		}
		const background = ui.background;
		background.dataset.yjcmWallpaper = String(entry.id);
		if (!dynamic) return;
		// 与 Online 一致：独立背景画布、按需加载、AbortController 管理切换与释放。
		const controller = animationController = new AbortController();
		const canvas = element(background, "canvas", "yjcm-wallpaper-animation");
		Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", visibility: "hidden" });
		canvas.setAttribute("aria-hidden", "true");
		controller.signal.addEventListener("abort", () => canvas.remove(), { once: true });
		const isCurrent = () => enabled() && ui.background === background && !controller.signal.aborted;
		import("./xinsha-background-animation.js")
			.then(async ({ playXinshaBackground }) => {
				if (!isCurrent()) return;
				await playXinshaBackground(canvas, asset(""), controller.signal, isCurrent, entry);
			})
			.catch(error => {
				canvas.remove();
				if (!controller.signal.aborted) console.error("[十周年UI] 一将成名动态背景加载失败", error);
			});
	}

	function save(selection, allModes) {
		const current = settings();
		const next = allModes
			? { allModes, dynamicEnabled: selection.dynamic, global: selection, modes: {} }
			: { ...current, allModes, dynamicEnabled: selection.dynamic, modes: { ...current.modes, [mode()]: selection } };
		game.saveConfig(configKey, next);
		return apply(selection);
	}

	function open() {
		if (!enabled() || !ui.window || overlay?.isConnected) return;
		const host = overlay = element(ui.window, "div", "yjcm-wallpaper-overlay");
		const pausedHere = !_status.paused2 && !_status.connectMode;
		if (pausedHere) game.pause2();
		const panel = element(host, "div", "yjcm-wallpaper-panel");
		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-modal", "true");
		panel.setAttribute("aria-label", "更换背景");
		panel.tabIndex = -1;
		element(panel, "div", "yjcm-wallpaper-bg");
		element(panel, "div", "yjcm-wallpaper-title", "更换背景");
		const list = element(panel, "div", "yjcm-wallpaper-list");
		const grid = element(list, "div", "yjcm-wallpaper-grid");
		const footer = element(panel, "label", "yjcm-wallpaper-default");
		const all = element(footer, "input", "yjcm-wallpaper-checkbox");
		all.type = "checkbox";
		all.checked = settings().allModes !== false;
		element(footer, "span", "", "设为默认背景");
		const dynamicLabel = element(panel, "div", "yjcm-wallpaper-dynamic");
		element(dynamicLabel, "span", "", "动态背景");
		const dynamic = element(dynamicLabel, "button", "yjcm-wallpaper-switch");
		dynamic.setAttribute("aria-label", "动态背景");
		dynamic.setAttribute("role", "switch");
		element(dynamic, "span", "yjcm-switch-on", "开");
		element(dynamic, "span", "yjcm-switch-off", "关");
		element(panel, "div", "yjcm-wallpaper-close-tip", "点击任意空白处关闭");
		const resize = new ResizeObserver(() => {
			panel.style.setProperty("--yjcm-panel-scale", Math.min(host.clientWidth / 1500, host.clientHeight / 750));
		});
		resize.observe(host);
		function dismiss() {
			resize.disconnect();
			host.remove();
			overlay = null;
			if (pausedHere) game.resume2();
			ui.yjcmMenuButton?.focus();
		}
		host.onclick = event => {
			event.stopPropagation();
			if (event.target === host || event.target === panel || event.target.classList.contains("yjcm-wallpaper-bg") || event.target.classList.contains("yjcm-wallpaper-close-tip")) dismiss();
		};
		host.onkeydown = event => {
			if (event.key === "Escape") {
				event.stopPropagation();
				dismiss();
			}
		};
		function markSelection() {
			const selection = selected();
			for (const tile of grid.children) tile.setAttribute("aria-pressed", String(Number(tile.dataset.wallpaper) === selection.id));
			const entry = entries.get(selection.id);
			dynamic.disabled = !entry?.animations.length;
			dynamic.setAttribute("aria-checked", String(!!selection.dynamic && !dynamic.disabled));
		}
		for (const entry of xinshaBackgrounds) {
			const tile = element(grid, "button", "yjcm-wallpaper-tile");
			tile.dataset.wallpaper = entry.id;
			const image = element(tile, "img", "yjcm-wallpaper-thumb");
			image.src = asset(entry.thumb);
			image.alt = "";
			image.loading = "lazy";
			element(tile, "span", "yjcm-wallpaper-name", entry.name);
			element(tile, "span", "yjcm-wallpaper-in-use");
			if (entry.animations.length) element(tile, "span", "yjcm-wallpaper-animated");
			tile.onclick = () => {
				void save({ id: entry.id, dynamic: selected().dynamic }, all.checked);
				markSelection();
			};
		}
		all.onchange = () => { void save(selected(), all.checked); };
		dynamic.onclick = () => {
			void save({ ...selected(), dynamic: dynamic.getAttribute("aria-checked") !== "true" }, all.checked);
			markSelection();
		};
		markSelection();
		panel.focus({ preventScroll: true });
	}

	return { open, restore: () => apply(selected()) };
}
