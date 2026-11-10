import { lib, get } from "noname";

const CHIXUEREN = "chixueren";
let hooksRegistered = false;

function normalizeChixuerenPromptCard(card) {
	if (typeof card === "string") return { name: card };
	if (Array.isArray(card)) return { name: card[2] || CHIXUEREN };
	if (card && typeof card === "object" && !card.name) return Object.assign({ name: CHIXUEREN }, card);
	return card;
}

function ensureChixuerenCardDefinition() {
	const info = lib.card?.[CHIXUEREN];
	if (!info) return null;
	info.fullskin = true;
	if (!info.image) info.image = "ext:十周年UI/image/card-skins/online/chixueren.jpg";
	if (typeof info.cardPrompt === "function" && !info.cardPrompt._decadeUIChixuerenSafe) {
		const original = info.cardPrompt;
		const wrapped = function (card, player) {
			const result = original.call(this, normalizeChixuerenPromptCard(card), player);
			return result == null ? "" : String(result);
		};
		wrapped._decadeUIChixuerenSafe = true;
		info.cardPrompt = wrapped;
	}
	if (!hooksRegistered && lib.hooks) {
		const refresh = function (skill, player) {
			const target = player?.node ? player : skill?.node ? skill : null;
			target?.node?.equips?.querySelectorAll?.('.card[data-card-name="chixueren"]')?.forEach(card => card.dispatchEvent(new Event("decadeUIChixuerenRefresh")));
		};
		refresh._decadeUIChixuerenRefresh = true;
		for (const name of ["addSkillCheck", "removeSkillCheck", "checkUpdate"]) {
			const list = lib.hooks[name] || (lib.hooks[name] = []);
			list.some(fn => fn._decadeUIChixuerenRefresh) || list.push(refresh);
		}
		hooksRegistered = true;
	}
	return info;
}

function getChixuerenSkinFilename(card, player) {
	if (!card || (card.name || card[2]) !== CHIXUEREN) return null;
	if (typeof get.position === "function" && get.position(card) !== "e") return CHIXUEREN;
	const owner = player || card.owner || (typeof get.owner === "function" ? get.owner(card) : null);
	const range = owner && typeof lib.card?.[CHIXUEREN]?.distance?.attackRange === "function" ? lib.card[CHIXUEREN].distance.attackRange(card, owner) : 0;
	return range > 0 ? "chixueren2" : CHIXUEREN;
}

export { ensureChixuerenCardDefinition, getChixuerenSkinFilename };
