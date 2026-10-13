import { _status, game, lib, get, ui } from "noname";
import { initCanvas as initCanvas, loadImageToCanvas as loadImageToCanvas } from "./utils.js";
const o = {
	xinfu_pingcai: {
		contentx: [
			async (event, trigger, player) => {
				event.pingcai_delayed = !0;
				const name = lib.skill.xinfu_pingcai_backup.takara;
				((event.cardname = name), (event.videoId = lib.status.videoId++), player.isUnderControl() && game.swapPlayerAuto(player));
				const chooseButton = (id, name) => {
					const event = _status.event;
					_status.xinfu_pingcai_finished = !1;
					const dialog = ui.create.dialog("forcebutton", "hidden");
					((dialog.textPrompt = dialog.add('<div class="text center">擦拭掉宝物上的灰尘吧！</div>')),
						dialog.classList.add("fixed", "scroll1", "scroll2", "fullwidth", "fullheight", "noupdate"),
						(dialog.videoId = id),
						(event.switchToAuto = () => {
							((event._result = { bool: _status.xinfu_pingcai_finished }), game.resume(), (_status.imchoosing = !1), (_status.xinfu_pingcai_finished = !0));
						}));
					const canvas = document.createElement("canvas"),
						canvas2 = document.createElement("canvas");
					(dialog.appendChild(canvas2), dialog.appendChild(canvas));
					const ctx = initCanvas(canvas),
						ctx2 = initCanvas(canvas2);
					(loadImageToCanvas(ctx2, canvas2, name), (ctx.fillStyle = "lightgray"), ctx.fillRect(0, 0, canvas.width, canvas.height));
					const r = (e, t) => {
						_status.xinfu_pingcai_finished ||
							(ctx.beginPath(),
							ctx.clearRect(e - 16, t - 16, 32, 32),
							(() => {
								const data = ctx.getImageData(0.1 * canvas.width, 0.1 * canvas.height, 0.8 * canvas.width, 0.8 * canvas.height).data;
								let cleared = 0;
								for (let o = 3; o < data.length; o += 4) 0 === data[o] && cleared++;
								cleared >= canvas.width * canvas.height * 0.6 && !_status.xinfu_pingcai_finished && ((_status.xinfu_pingcai_finished = !0), event.switchToAuto());
							})());
					};
					((canvas.onmousedown = () => {
						canvas.onmousemove = e => r(e.offsetX / game.documentZoom, e.offsetY / game.documentZoom);
					}),
						(canvas.onmouseup = () => (canvas.onmousemove = null)),
						(canvas.ontouchstart = () => {
							canvas.ontouchmove = e => {
								const rect = canvas.getBoundingClientRect(),
									o = ((e.touches[0].clientX / game.documentZoom - rect.left) / rect.width) * canvas.width,
									i = ((e.touches[0].clientY / game.documentZoom - rect.top) / rect.height) * canvas.height;
								r(o, i);
							};
						}),
						(canvas.ontouchend = () => (canvas.ontouchmove = null)),
						dialog.open(),
						game.pause(),
						game.countChoose());
				};
				(game.broadcastAll(
					(player, id, name) => {
						if (player === game.me) return;
						const dialog = ui.create.dialog("forcebutton", "hidden"),
							canSkip = !_status.connectMode;
						let str = `${get.translation(player)}正在擦拭宝物上的灰尘…`;
						(canSkip && (str += "<br>（点击宝物可以跳过等待AI操作）"), (dialog.textPrompt = dialog.add(`<div class="text center">${str}</div>`)), dialog.classList.add("fixed", "scroll1", "scroll2", "fullwidth", "fullheight", "noupdate"), (dialog.videoId = id));
						const canvas2 = document.createElement("canvas");
						((dialog.canvas_viewer = canvas2), dialog.appendChild(canvas2), canvas2.classList.add("grayscale"));
						const ctx2 = initCanvas(canvas2);
						if ((loadImageToCanvas(ctx2, canvas2, name), canSkip)) {
							const e = () => {
								event.pingcai_delayed && (delete event.pingcai_delayed, clearTimeout(event.timeout), (event._result = { bool: !0 }), game.resume(), canvas2.removeEventListener(lib.config.touchscreen ? "touchend" : "click", e));
							};
							canvas2.addEventListener(lib.config.touchscreen ? "touchend" : "click", e);
						}
						dialog.open();
					},
					player,
					event.videoId,
					name
				),
					event.isMine()
						? chooseButton(event.videoId, name)
						: event.isOnline()
							? (event.player.send(chooseButton, event.videoId, name), event.player.wait(), game.pause())
							: (game.pause(),
								game.countChoose(),
								(event.timeout = setTimeout(() => {
									((_status.imchoosing = !1), (event._result = { bool: !0 }), game.resume());
								}, 9e3))));
			},
			async (event, trigger, player) => {
				const result = event._result || event.result || { bool: !1 };
				((event._result = result),
					game.broadcastAll(
						(id, result, player) => {
							_status.xinfu_pingcai_finished = !0;
							const dialog = get.idDialog(id);
							(dialog && ((dialog.textPrompt.innerHTML = `<div class="text center">${get.translation(player)}擦拭宝物${result.bool ? "成功！" : "失败…"}</div>`), result.bool && dialog.canvas_viewer && dialog.canvas_viewer.classList.remove("grayscale")), _status.connectMode || delete event.pingcai_delayed);
						},
						event.videoId,
						result,
						player
					),
					await game.delay(2.5));
			},
			async (event, trigger, player) => {
				(game.broadcastAll("closeDialog", event.videoId), event._result?.bool && (player.logSkill(`pcaudio_${event.cardname}`), event.insert(lib.skill.xinfu_pingcai[event.cardname], { player: player })));
			},
		],
		ai: { order: 7, fireAttack: !0, threaten: 1.7, result: { player: 1 } },
	},
	xz_xunxun: { inherit: "xunxun", filter: (event, player) => game.hasPlayer(current => current.isDamaged()) && !player.hasSkill("xunxun") },
	dddfenye: {
		$compareFenye(players, cards1, targets, cards2) {
			(game.broadcast(
				(players, cards1, targets, cards2) => {
					lib.skill.dddfenye.$compareFenye(players, cards1, targets, cards2);
				},
				players,
				cards1,
				targets,
				cards2
			),
				game.addVideo("compareFenye", [get.targetsInfo(players), get.cardsInfo(cards1), get.targetsInfo(targets), get.cardsInfo(cards2)]));
			for (let n = players.length - 1; n >= 0; n--) players[n].$throwordered2(cards1[n].copy(!1));
			for (let n = targets.length - 1; n >= 0; n--) targets[n].$throwordered2(cards2[n].copy(!1));
		},
	},
	dcqixin: {
		mark: void 0,
		init(player, skill) {
			(_status.gameStarted && !player.storage.dcqixin_hp && (player.storage.dcqixin_hp = [player.maxHp, player.maxHp]),
				player.marks[skill] || player.markSkill(skill),
				game.broadcastAll(
					(player, skill) => {
						lib.skill.dcqixin.$zhuanhuanji(skill, player);
					},
					player,
					skill
				));
		},
		$zhuanhuanji(skill, player) {
			const character = player.storage[skill] ? "caojie" : "liuxie",
				mark = player.marks[skill];
			(mark && (mark.setBackground(character, "character"), (mark._name = character), mark.style.setProperty("background-size", "cover", "important"), mark.text.style.setProperty("font-size", "0px", "important")), player.changeSkin({ characterName: "liuxiecaojie" }, "liuxiecaojie" + (player.storage[skill] ? "_shadow" : "")));
		},
	},
};
export { o as inheritSkill };
