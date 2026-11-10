import { game, get, lib, _status } from "noname";
import { wrapAround as wrapAround } from "../utils/safeOverride.js";

const FACTION_PROMPT = "请选择你的势力";
const PREINIT_MARK = "_十周年UI_factionPreinit";
const FACTION_CONTROL_PROMPTS = ["请选择你的势力", "请选择神武将的势力", "请决定神武将的所属势力"];
const FACTION_CONTROL_MARK = Symbol("十周年UI_factionControlChoice");

function isIdentityMode() {
	return typeof get.mode === "function" ? get.mode() === "identity" : lib.config?.mode === "identity";
}

function isFactionSpec(value) {
	if (!Array.isArray(value)) return false;
	const prompt = value[0];
	const payload = value[1];
	if (prompt !== FACTION_PROMPT || !Array.isArray(payload)) return false;
	const entries = Array.isArray(payload[0]) ? payload[0] : payload;
	return entries.length > 0 && entries.every(entry => Array.isArray(entry) && typeof entry[2] === "string" && entry[2].startsWith("group_"));
}

function hasFactionSpec(args) {
	return args.some(arg => isFactionSpec(arg));
}

function getParentEvent(event) {
	if (!event) return null;
	if (typeof event.getParent === "function") {
		try {
			const parent = event.getParent();
			if (parent && parent !== event) return parent;
		} catch (error) {}
	}
	return event.parent && event.parent !== event ? event.parent : null;
}

function findCharacterEvent(event) {
	const seen = new Set();
	for (let current = event; current && !seen.has(current); current = getParentEvent(current)) {
		seen.add(current);
		if (current.name === "chooseCharacter" && current.choosed != null) return current;
	}
	return null;
}

function characterList(value) {
	if (!Array.isArray(value) || !value.length || typeof value[0] !== "string") return null;
	return value.filter(character => typeof character === "string").slice(0, 2);
}

function initWithShenGroup(player, characters, owner) {
	if (player !== game.me || player.name || !characters?.length || typeof player.init !== "function") return false;
	const info = lib.character?.[characters[0]];
	const group = Array.isArray(info) ? info[1] : info?.group;
	if (group !== "shen") return false;
	player.init(characters[0], characters[1]);
	if (!player.name) return false;
	player.group = "shen";
	if (player.node?.name) player.node.name.dataset.nature = get.groupnature("shen");
	player[PREINIT_MARK] = { characters: characters.slice(), owner };
	return true;
}

function preinitOfflineFaction(player) {
	if (!isIdentityMode() || player !== game.me || player.name) return;
	const event = findCharacterEvent(_status.event);
	const characters = characterList(event?.choosed);
	if (characters) initWithShenGroup(player, characters, event);
}

function eventContains(event, target) {
	const seen = new Set();
	for (let current = event; current && !seen.has(current); current = getParentEvent(current)) {
		if (current === target) return true;
		seen.add(current);
	}
	return false;
}

function sameCharacters(mark, player, args) {
	return (
		mark &&
		args.length <= 2 &&
		mark.characters[0] === args[0] &&
		mark.characters[1] === (args[1] ?? undefined) &&
		player.name1 === mark.characters[0] &&
		(player.name2 || undefined) === (mark.characters[1] ?? undefined)
	);
}

function applyFactionCharacterInit() {
	const restoreFns = [];
	const playerElement = lib.element?.player;
	if (!playerElement) return restoreFns;
	if (typeof playerElement.init === "function") {
		restoreFns.push(
			wrapAround(playerElement, "init", function (original, ...args) {
				const mark = this[PREINIT_MARK];
				if (sameCharacters(mark, this, args) && eventContains(_status.event, mark.owner)) {
					delete this[PREINIT_MARK];
					return this;
				}
				if (mark) delete this[PREINIT_MARK];
				return original.apply(this, args);
			})
		);
	}
	if (typeof playerElement.chooseButton === "function") {
		restoreFns.push(
			wrapAround(playerElement, "chooseButton", function (original, ...args) {
				if (hasFactionSpec(args)) preinitOfflineFaction(this);
				return original.apply(this, args);
			})
		);
	}
	return restoreFns;
}

function findFactionControlParent(event) {
	const seen = new Set();
	for (let current = event; current && !seen.has(current); current = getParentEvent(current)) {
		seen.add(current);
		if (["_slyh", "_shengroup_choice", "_doublegroup_choice"].includes(current.skill)
			|| ["_slyh", "_shengroup_choice", "_doublegroup_choice"].includes(current.name)) return current;
	}
	return null;
}

function isFactionControlChoice(event, player) {
	if (lib.config?.extension_十周年UI_newDecadeStyle !== "onlineUI" || !event || !player || typeof event.isMine !== "function") return false;
	if (event.sortcard || event.choiceList || !event.isMine()) return false;
	if (!Array.isArray(event.controls) || !event.controls.length) return false;
	const groups = Array.isArray(lib.group) ? lib.group : [];
	const controls = event.controls;
	if (!controls.some(control => groups.includes(control))) return false;
	if (!controls.every(control => control === "cancel2" || groups.includes(control))) return false;
	const prompt = typeof event.prompt === "string" ? event.prompt : "";
	const explicitPrompt = FACTION_CONTROL_PROMPTS.some(value => prompt.includes(value));
	return explicitPrompt || !!findFactionControlParent(event);
}

function applyFactionControlChoice() {
	const restoreFns = [];
	const processors = lib.element?.content?.chooseControl;
	const original = Array.isArray(processors) ? processors[0] : null;
	if (typeof original !== "function" || original[FACTION_CONTROL_MARK]) return restoreFns;
	const wrapped = async function (event, trigger, player) {
		if (!isFactionControlChoice(event, player) || typeof player.chooseButton !== "function") {
			return original.call(this, event, trigger, player);
		}
		const groups = event.controls.filter(group => group !== "cancel2");
		const hasCancel = event.controls.includes("cancel2");
		const choice = player.chooseButton([FACTION_PROMPT, [groups.map(group => ["", "", `group_${group}`]), "vcard"]], !hasCancel);
		choice?.set?.("direct", true);
		const result = await choice.forResult();
		const link = result?.links?.find?.(item => Array.isArray(item) && typeof item[2] === "string" && item[2].startsWith("group_"));
		const chosenGroup = link ? link[2].slice(6) : null;
		const cancelled = result?.bool === false || !chosenGroup || !groups.includes(chosenGroup);
		const control = cancelled ? (hasCancel ? "cancel2" : groups[0]) : chosenGroup;
		event.result = {
			bool: !cancelled,
			control,
			index: event.controls.indexOf(control),
			// 对外仍是 chooseControl 结果，不泄漏内部势力伪卡按钮。
			links: [],
		};
		event.finish();
	};
	Object.defineProperty(wrapped, FACTION_CONTROL_MARK, { value: original });
	processors[0] = wrapped;
	let restored = false;
	restoreFns.push(() => {
		if (restored) return;
		restored = true;
		if (processors[0] === wrapped) processors[0] = original;
	});
	return restoreFns;
}

export { applyFactionCharacterInit, applyFactionControlChoice, isFactionControlChoice };
