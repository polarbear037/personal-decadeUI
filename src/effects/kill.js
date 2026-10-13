import { game, ui } from "noname";
import { CONFIG as CONFIG } from "./config.js";
import { isPlayer as isPlayer, getAvatar as getAvatar, create as create, randomPosition as randomPosition } from "./utils.js";
function s(s, r) {
	if (!isPlayer(s) || !isPlayer(r)) throw new Error("source和target必须是有效的玩家对象");
	if (s === r || s.isUnseen() || r.isUnseen()) return;
	const i = getAvatar(s, s.isUnseen(0)),
		c = getAvatar(r, r.isUnseen(0)),
		l = create("effect-window", null, { backgroundColor: "rgba(0,0,0,0.7)", transition: "all 4s", zIndex: 7 }),
		d = create("killer-warpper", l);
	((d.killer = create("killer", d)), (d.killer.style.backgroundImage = i.style.backgroundImage));
	const u = create("victim", l);
	((u.back = create("back", u)), (u.back.part1 = create("part1", u.back)), (u.back.part2 = create("part2", u.back)));
	const f = c.style.backgroundImage;
	((u.back.part1.style.backgroundImage = f), (u.back.part2.style.backgroundImage = f), game.playAudio("../extension", decadeUI.extensionName, "audio/kill_effect_sound.mp3"));
	const p = decadeUI.animation,
		g = p.getSpineBounds("effect_jisha1");
	if (g) {
		const t = (p.canvas.width / g.size.x) * CONFIG.KILL_SCALE,
			n = p.canvas,
			a = n.style.zIndex;
		((n.style.zIndex = 10),
			p.playSpine("effect_jisha1", { scale: t }),
			ui.window.appendChild(l),
			ui.refresh(l),
			setTimeout(() => {
				n.style.zIndex = a;
			}, CONFIG.KILL_CLOSE));
	} else
		!(function (effect, victim) {
			(create("li-big", effect), (victim.rout = create("rout", victim)), (victim.rout2 = create("rout", victim)), (victim.rout.innerHTML = "破敌"), (victim.rout2.innerHTML = "破敌"), victim.rout2.classList.add("shadow"), ui.window.appendChild(effect));
			const height = ui.window.offsetHeight;
			for (let r = 0; r < CONFIG.KILL_LIGHT_COUNT; r++) {
				const { x: e, y: n, scale: r } = randomPosition(height);
				setTimeout(
					() => {
						create("li", effect).style.transform = `translate(${e}, ${n}) scale(${r})`;
					},
					decadeUI.getRandom(50, 300)
				);
			}
		})(l, u);
	(decadeUI.delay(CONFIG.KILL_DELAY), (l.style.backgroundColor = "rgba(0,0,0,0)"), l.close(CONFIG.KILL_CLOSE));
}
export { s as playKillEffect };
