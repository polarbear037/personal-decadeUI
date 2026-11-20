import { get, lib, ui } from "noname";

const countries = { wei: 1, shu: 2, wu: 3, qun: 4 };

function factionOf(button) {
	const link = button?.link;
	return Array.isArray(link) && typeof link[2] === "string" && link[2].startsWith("group_") ? link[2].slice(6) : null;
}

function applyXinshaFactionDialog(dialog) {
	if (lib.config.extension_十周年UI_newDecadeStyle !== "othersOff" || dialog?.classList.contains("xinsha-faction-dialog")) return dialog;
	const buttons = Array.from(dialog?.buttons || []);
	if (!buttons.length || !buttons.every(factionOf)) return dialog;
	dialog.classList.add("xinsha-faction-dialog");
	dialog.dataset.xinshaCardAnimations = "off";
	for (const caption of dialog.querySelectorAll(".caption")) caption.classList.add("xinsha-faction-native-caption");
	const title = document.createElement("div");
	title.className = "xinsha-faction-title";
	title.textContent = "选择势力";
	dialog.appendChild(title);
	const prompt = document.createElement("div");
	prompt.className = "dialog-ol-footer xinsha-faction-prompt";
	prompt.textContent = "请选择您的势力";
	dialog.appendChild(prompt);
	for (const button of buttons) {
		const group = factionOf(button);
		button.classList.remove("card", "infohidden", "infoflip", "decade-card");
		button.classList.add("xinsha-faction-button");
		for (const child of button.children) child.classList.add("xinsha-faction-native-hidden");
		const name = get.translation(group);
		button.setAttribute("aria-label", name);
		button.setAttribute("role", "button");
		button.tabIndex = 0;
		if (countries[group]) {
			const path = new URL(`${lib.assetURL}extension/十周年UI/image/ui/faction/xinsha/skill_window_select_country_${countries[group]}.png`, document.baseURI).href;
			button.style.setProperty("--xinsha-faction-image", `url("${path}")`);
		} else {
			if (group === "jin") {
				button.classList.add("xinsha-faction-jin");
				const path = new URL(`${lib.assetURL}extension/十周年UI/image/ui/faction/xinsha/select_country_jin_bg.png`, document.baseURI).href;
				button.style.setProperty("--xinsha-faction-image", `url("${path}")`);
			} else button.classList.add("xinsha-faction-custom");
			const label = document.createElement("span");
			label.className = "xinsha-faction-label";
			label.textContent = name;
			button.appendChild(label);
		}
		button.style.removeProperty("background-image");
		button.addEventListener("keydown", event => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			if (!event.repeat) ui.click.button.call(button);
		});
	}
	let observer;
	let frame = 0;
	const set = (key, value) => {
		if (dialog.style.getPropertyValue(key) !== value) dialog.style.setProperty(key, value);
	};
	const layout = () => {
		const arena = ui.arena, viewport = ui.window || arena?.parentElement;
		if (!arena || !viewport) return;
		const box = arena.getBoundingClientRect(), view = viewport.getBoundingClientRect();
		const sx = box.width / arena.offsetWidth, sy = box.height / arena.offsetHeight;
		if (!(sx > 0 && sy > 0)) return;
		const unit = Math.min(view.width / sx / 1334, view.height / sy / 750);
		// 原版内容按750高画幅等比缩放；背景单独延伸到完整游戏窗口。
		const rowWidth = buttons.length * 151 + (buttons.length - 1) * 50;
		set("--xinsha-faction-unit", `${unit}px`);
		set("--xinsha-faction-card-unit", `${Math.min(unit, (view.width / sx - 40 * unit) / rowWidth)}px`);
		set("--xinsha-faction-width", `${view.width / sx}px`);
		set("--xinsha-faction-x", `${(view.left + view.width / 2 - box.left) / sx}px`);
		set("--xinsha-faction-y", `${(view.top + view.height / 2 - box.top) / sy}px`);
	};
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(() => { frame = 0; layout(); });
	};
	const start = () => {
		layout();
		if (observer) return;
		observer = new ResizeObserver(schedule);
		for (const node of new Set([ui.arena, ui.window || ui.arena?.parentElement])) if (node) observer.observe(node);
		window.addEventListener("resize", schedule);
	};
	const stop = () => {
		observer?.disconnect();
		observer = null;
		cancelAnimationFrame(frame);
		frame = 0;
		window.removeEventListener("resize", schedule);
	};
	const open = dialog.open;
	dialog.open = function (...args) {
		layout();
		const result = open.apply(this, args);
		if (this.parentNode === ui.arena) start();
		return result;
	};
	for (const method of ["close", "delete"]) {
		const original = dialog[method];
		if (typeof original === "function") dialog[method] = function (...args) {
			stop();
			return original.apply(this, args);
		};
	}
	if (dialog.parentNode === ui.arena) start();
	return dialog;
}

export { applyXinshaFactionDialog };
