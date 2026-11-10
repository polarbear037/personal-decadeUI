import { get, lib } from "noname";

const EQUIP_SWEEP_NAME = "FX_PaiJu_ZhuangBei_saoguang";
const installedApis = new WeakSet();

function fitOnlineArmorEffect(sprite, position) {
	const name = typeof sprite === "string" ? sprite : sprite?.name;
	if (name?.split("/").pop() !== "qimenhujia" || lib.config.extension_十周年UI_newDecadeStyle !== "onlineUI") return null;
	const player = position?.parent;
	if (!player?.classList?.contains("player")) return null;
	let armor = player.querySelector(":scope > .hujia.online-armor");
	const measuring = !armor;
	// 标记补充在 player.update() 之前播放获得特效，首次获得时用相同 CSS 测量落点。
	if (measuring) {
		armor = document.createElement("div");
		armor.className = "hujia online-armor";
		player.appendChild(armor);
	}
	const bounds = armor.getBoundingClientRect();
	if (measuring) armor.remove();
	if (!(bounds.width > 0 && bounds.height > 0)) return null;
	return {
		sprite: { ...(typeof sprite === "string" ? { name: sprite } : sprite) },
		position: {
			...position,
			parent: measuring ? { getBoundingClientRect: () => bounds } : armor,
			// qimenhujia 的稳定帧为32×37，骨骼边界x=-16..16、y=-19..18。
			x: [0, 0.5],
			y: [0, 19 / 37],
			scale: bounds.width / 32,
		},
	};
}

function fitEquipSweep(sprite, position) {
	const name = typeof sprite === "string" ? sprite : sprite?.name;
	if (name?.split("/").pop() !== EQUIP_SWEEP_NAME) return null;
	const equips = position?.parent?.node?.equips;
	if (!equips?.children || !Array.isArray(position.y)) return null;
	const row = Number(position.y[1]);
	// 标记补充原扫光的四个固定行坐标；布局变化后改以对应的实体装备为参照。
	const slot = [0.4, 0.285, 0.17, 0.055].findIndex(y => Math.abs(row - y) < 0.000001) + 1;
	if (!slot) return null;
	const card = Array.from(equips.children).find(card => Number(get.equipNum(card)) === slot && !card.classList.contains("hidden") && !card.classList.contains("emptyequip") && !card.classList.contains("feichu"));
	if (!card) return null;
	const bounds = card.getBoundingClientRect();
	if (!(bounds.width > 0 && bounds.height > 0)) return null;
	const spriteOptions = { ...(typeof sprite === "string" ? { name: sprite } : sprite) };
	const fitted = { sprite: spriteOptions, position: { ...position, parent: card, x: [0, 0.5], y: [0, 0.5] } };
	// 只有并排坐骑需要半栏裁切，完整栏位保留原扫光的外发光。
	if (equips.dataset.equipLayout !== "combined" || (slot !== 3 && slot !== 4)) return fitted;
	if (!document.getElementById("chukuang-canvas")) globalThis.skinSwitch?.chukuangWorkerInit?.();
	const canvas = document.getElementById("chukuang-canvas");
	const canvasBounds = canvas?.getBoundingClientRect() || { left: 0, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };
	if (!(canvasBounds.width > 0 && canvasBounds.height > 0)) return null;
	spriteOptions.clip = {
		x: [0, (bounds.left - canvasBounds.left) / canvasBounds.width],
		y: [0, (canvasBounds.bottom - bounds.bottom) / canvasBounds.height],
		width: [0, bounds.width / canvasBounds.width],
		height: [0, bounds.height / canvasBounds.height],
	};
	return fitted;
}

function installEquipSweepCompatibility() {
	const api = globalThis.skinSwitch?.chukuangWorkerApi;
	if (!api || typeof api.playEffect !== "function" || installedApis.has(api)) return;
	const original = api.playEffect;
	api.playEffect = function (sprite, position, ...args) {
		const fitted = fitOnlineArmorEffect(sprite, position) || fitEquipSweep(sprite, position);
		return original.call(this, fitted?.sprite || sprite, fitted?.position || position, ...args);
	};
	installedApis.add(api);
}

export { installEquipSweepCompatibility };
