import { lib, get, _status, game } from "noname";
import { cardEasterEggs as cardEasterEggs } from "./easterEggs/cardEasterEggs.js";
import { deathEasterEggs as deathEasterEggs, damageEasterEggs as damageEasterEggs, phaseStartEasterEggs as phaseStartEasterEggs } from "./easterEggs/eventEggs.js";
import { gameStartDialogues as gameStartDialogues } from "./easterEggs/dialogueEggs.js";
const s = cardEasterEggs,
	o = (player, e) => {
		if ("player" !== get.itemtype(player)) return !1;
		const t = get.nameList(player),
			r = lib.characterReplace?.[e] || [e];
		return (
			!!t.some(e => r.includes(e)) &&
			((player, charName) => {
				if (!player?.isUnseen) return !0;
				const replaceList = lib.characterReplace?.[charName] || [charName];
				return !(!player.name1 || !replaceList.includes(player.name1) || player.isUnseen(0)) || !(!player.name2 || !replaceList.includes(player.name2) || player.isUnseen(1));
			})(player, e)
		);
	},
	i = name => game.players?.find(t => o(t, name)),
	u = file => {
		const audioPath = file.includes("/") ? `audio/${file}` : `audio/caidan/${file}`;
		game.playAudio("..", "extension", "十周年UI", audioPath);
	},
	c = /* @__PURE__ */ new Map(),
	p = (rule, ctx) => {
		if (!rule.sequence?.length) return null;
		const key = rule.sequenceKey?.(ctx) || `${rule.player}-${rule.cards.join(",")}`,
			index = c.get(key) || 0;
		return (c.set(key, index + 1), rule.sequence[index % rule.sequence.length]);
	},
	l = (rules, matcher, getSpeaker) => {
		for (const a of rules) {
			if (!matcher(a)) continue;
			const e = getSpeaker(a);
			if (!e) continue;
			const n = a.sequence ? p(a, {}) : null,
				s = n?.text || a.text;
			return (s && e.say?.(s), (n?.audio || a.audio) && u(n?.audio || a.audio), !0);
		}
		return !1;
	},
	g = /* @__PURE__ */ new Set(),
	y = () => {
		for (const e of gameStartDialogues) {
			if (g.has(e)) continue;
			if (e.players.every(e => i(e))) {
				(g.add(e),
					e.dialogues.forEach(({ player: player, text: text, audio: audio, delay: delay }) => {
						setTimeout(() => {
							const speaker = i(player);
							speaker && (speaker.say?.(text), audio && u(audio));
						}, delay);
					}));
				break;
			}
		}
	},
	f = (rule, ctx) => {
		if (!rule.cards.includes(ctx.cardName)) return !1;
		if (rule.player && !o(ctx.player, rule.player)) return !1;
		if ("" === rule.player && rule.speaker && o(ctx.player, rule.speaker)) return !1;
		if (rule.group && ctx.player?.group !== rule.group) return !1;
		if (rule.needPlayer && !i(rule.needPlayer)) return !1;
		if (rule.targetHas) {
			const r = Array.isArray(rule.targetHas) ? rule.targetHas : [rule.targetHas],
				a = ctx.targets?.some(e => r.some(t => o(e, t)));
			if (!a) return !1;
		}
		if (rule.targetGroup) {
			const r = ctx.targets?.some(t => t.group === rule.targetGroup);
			if (!r) return !1;
		}
		return !(rule.condition && !rule.condition(ctx));
	};
function d() {
	const originalUseCard = lib.element.Player.prototype.useCard;
	lib.element.Player.prototype.useCard = function (...t) {
		const event = originalUseCard.apply(this, t);
		if (!event?.card || !event?.player) return event;
		if (!lib.config.extension_十周年UI_audioEasterEggs) return event;
		const r = ((event, cardName) => ({ card: event.card, player: event.player, targets: event.targets, cardName: cardName, hasName: o, findPlayer: name => i(name) }))(event, get.name(event.card, event.player));
		for (const e of s) {
			if (!f(e, r)) continue;
			const t = e.speaker ? i(e.speaker) : e.target ? r.targets?.find(t => o(t, e.target)) : event.player;
			if (t) {
				const a = p(e, r);
				(t.say?.(a?.text || e.text), (a?.audio || e.audio) && u(a?.audio || e.audio));
				break;
			}
		}
		return event;
	};
	const originalDamage = lib.element.Player.prototype.damage;
	lib.element.Player.prototype.damage = function (...args) {
		const event = originalDamage.apply(this, args);
		return lib.config.extension_十周年UI_audioEasterEggs
			? (event?.then(() => {
					const damaged = event?.player || this;
					damaged &&
						l(
							damageEasterEggs,
							rule => !!(Array.isArray(rule.player) ? rule.player : [rule.player]).some(p => o(damaged, p)) && (!rule.nature || event.nature === rule.nature),
							() => damaged
						);
				}),
				event)
			: event;
	};
	const originalDie = lib.element.Player.prototype.$die;
	lib.element.Player.prototype.$die = function (...args) {
		const result = originalDie.apply(this, args);
		if (!lib.config.extension_十周年UI_audioEasterEggs) return result;
		for (const r of deathEasterEggs) {
			if (!o(this, r.deceased)) continue;
			const e = i(r.speaker);
			if (e) {
				(e.say?.(r.text), r.audio && u(r.audio));
				break;
			}
		}
		return result;
	};
	const originalTrigger = lib.element.GameEvent.prototype.trigger;
	((lib.element.GameEvent.prototype.trigger = function (e) {
		const result = originalTrigger.apply(this, arguments);
		return (
			lib.config.extension_十周年UI_audioEasterEggs &&
				("phaseBeginStart" === e &&
					_status.currentPhase &&
					l(
						phaseStartEasterEggs,
						rule => o(_status.currentPhase, rule.player),
						() => _status.currentPhase
					),
				("chooseToCompareAfter" === e || ("compare" === e && ["chooseToCompare", "chooseToCompareMultiple"].includes(this.name))) &&
					(event => {
						const player = event.player,
							target = event.target || event.targets?.[0];
						if (player && target && event.result1 === event.result2 && (o(player, "zhangfei") || o(target, "zhangfei"))) {
							const t = o(player, "zhangfei") ? player : target;
							(t.say?.("俺也一样！"), u("zhangfei6.mp3"));
						}
					})(this),
				"showCharacterEnd" === e && y()),
			result
		);
	}),
		lib.announce.subscribe("gameStart", () => {
			if (!game.players?.length) return;
			if (!lib.config.extension_十周年UI_audioEasterEggs) return;
			game.players.some(p => p.isUnseen?.()) || y();
		}));
}
export { d as setupAudioHooks };
