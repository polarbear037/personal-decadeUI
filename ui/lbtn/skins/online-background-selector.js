import { onlineBackgrounds } from "./online-backgrounds.js";

const assetPath = "extension/十周年UI/ui/assets/lbtn/OL_line/background/";
const configKey = "extension_十周年UI_onlineBackground";
const tabs = [
	["theme", "主题背景"],
	["skin", "静态皮肤"],
	["live", "动态皮肤"],
];
const entries = onlineBackgrounds.map(([category, id, name, thumb, image, animation, backgroundSlot]) => ({
	category, key: `${category}:${id}:${thumb}`, name, thumb, image, animation, backgroundSlot,
}));
const entriesByKey = new Map(entries.map(entry => [entry.key, entry]));

function append(parent, tag, className, text) {
	const node = document.createElement(tag);
	node.className = className;
	if (tag === "button") node.type = "button";
	if (text) node.textContent = text;
	parent.appendChild(node);
	return node;
}

export function createOnlineBackgroundSelector(lib, game, ui, get, _status) {
	let overlay;
	let animationController;
	const enabled = () => lib.config.extension_十周年UI_newDecadeStyle === "onlineUI";
	const settings = () => lib.config[configKey] || {};
	const mode = () => get.mode() || lib.config.mode;
	const selectedKey = () => settings().modes?.[mode()] || settings().global;

	function apply(entry) {
		if (!enabled() || !entry || !ui.background || ui.background.dataset.onlineWallpaper === entry.key) return;
		animationController?.abort();
		const temporary = _status.tempBackground;
		if (entry.image) _status.tempBackground = `ext:${assetPath.slice("extension/".length)}${entry.image}`;
		try {
			game.updateBackground();
		} finally {
			if (temporary === undefined) delete _status.tempBackground;
			else _status.tempBackground = temporary;
		}
		const background = ui.background;
		background.dataset.onlineWallpaper = entry.key;
		if (!entry.animation) return;

		const controller = animationController = new AbortController();
		const canvas = append(background, "canvas", "online-wallpaper-animation");
		Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
		canvas.setAttribute("aria-hidden", "true");
		controller.signal.addEventListener("abort", () => canvas.remove(), { once: true });
		const isCurrent = () => enabled() && ui.background === background && !controller.signal.aborted;
		import("./online-background-animation.js")
			.then(async ({ playOnlineBackground }) => {
				if (!isCurrent()) return;
				await playOnlineBackground(canvas, lib.assetURL + assetPath + entry.animation, controller.signal, isCurrent, entry.backgroundSlot);
				if (entry.backgroundSlot && isCurrent() && canvas.dataset.playing === "true") {
					background.style.backgroundImage = "none";
					if (lib.config.image_background_blur) {
						Object.assign(background.style, { filter: "", webkitFilter: "", transform: "" });
					}
				}
			})
			.catch(error => {
				canvas.remove();
				if (!controller.signal.aborted) {
					delete background.dataset.onlineWallpaper;
					console.error("[十周年UI] 动态背景加载失败", error);
				}
			});
	}

	function select(entry, allModes) {
		const current = settings();
		const selection = allModes
			? { allModes, global: entry.key, modes: {} }
			: { ...current, allModes, modes: { ...current.modes, [mode()]: entry.key } };
		game.saveConfig(configKey, selection);
		apply(entry);
	}

	function open() {
		if (!enabled() || !ui.window || overlay?.isConnected) return;
		const host = append(ui.window, "div", "online-wallpaper-overlay");
		overlay = host;
		const pausedHere = !_status.paused2 && !_status.connectMode;
		if (pausedHere) game.pause2();

		const panel = append(host, "div", "online-wallpaper-panel");
		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-modal", "true");
		panel.setAttribute("aria-label", "切换背景");
		const title = append(panel, "div", "online-wallpaper-title");
		title.setAttribute("aria-hidden", "true");
		const close = append(panel, "button", "online-wallpaper-close");
		close.setAttribute("aria-label", "关闭背景选择");
		const navigation = append(panel, "div", "online-wallpaper-tabs");
		const list = append(panel, "div", "online-wallpaper-list");
		const grid = append(list, "div", "online-wallpaper-grid");
		const arrow = append(panel, "button", "online-wallpaper-arrow");
		arrow.setAttribute("aria-label", "向下浏览");
		const footer = append(panel, "label", "online-wallpaper-all");
		const checkbox = append(footer, "input", "online-wallpaper-checkbox");
		checkbox.type = "checkbox";
		checkbox.checked = settings().allModes !== false;
		append(footer, "span", "", "应用到所有模式");

		const resize = new ResizeObserver(() => {
			const scale = Math.min(host.clientWidth / 1450, host.clientHeight / 750);
			panel.style.setProperty("--wallpaper-scale", scale);
		});
		resize.observe(host);

		function dismiss() {
			resize.disconnect();
			host.remove();
			overlay = null;
			if (pausedHere) game.resume2();
			ui.caidanbutton?.focus();
		}
		close.onclick = dismiss;
		host.onclick = event => {
			event.stopPropagation();
			if (event.target === host) dismiss();
		};
		host.onkeydown = event => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			dismiss();
		};

		const updateArrow = () => {
			arrow.hidden = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
		};
		list.addEventListener("scroll", updateArrow, { passive: true });
		arrow.onclick = () => list.scrollBy({ top: 233, behavior: "smooth" });
		checkbox.onchange = () => game.saveConfig(configKey, { ...settings(), allModes: checkbox.checked });

		let activeTab = "theme";
		const tabButtons = new Map(tabs.map(([key, label]) => {
			const button = append(navigation, "button", "online-wallpaper-tab", label);
			button.onclick = () => {
				activeTab = key;
				render();
			};
			return [key, button];
		}));

		function markSelection() {
			const key = selectedKey();
			for (const tile of grid.children) tile.setAttribute("aria-pressed", String(tile.dataset.wallpaper === key));
		}

		function render() {
			for (const [key, button] of tabButtons) button.setAttribute("aria-pressed", String(key === activeTab));
			grid.replaceChildren();
			const visible = entries.filter(entry => entry.category === activeTab);
			const selected = entriesByKey.get(selectedKey());
			if (activeTab === "theme" && selected?.category === activeTab) {
				visible.splice(visible.indexOf(selected), 1);
				visible.unshift(selected);
			}
			for (const entry of visible) {
				const tile = append(grid, "button", "online-wallpaper-tile");
				tile.dataset.wallpaper = entry.key;
				const thumb = append(tile, "img", "online-wallpaper-thumb");
				thumb.alt = "";
				thumb.loading = "lazy";
				thumb.src = lib.assetURL + assetPath + entry.thumb;
				append(tile, "span", "online-wallpaper-name", entry.name);
				tile.onclick = () => {
					select(entry, checkbox.checked);
					markSelection();
				};
			}
			markSelection();
			const selectedTile = grid.querySelector('[aria-pressed="true"]');
			list.scrollTop = selectedTile ? Math.max(0, selectedTile.offsetTop - 143) : 0;
			updateArrow();
		}

		render();
		close.focus({ preventScroll: true });
	}

	return { open, restore: () => apply(entriesByKey.get(selectedKey())) };
}
