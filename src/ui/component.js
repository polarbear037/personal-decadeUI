import { game, lib, _status } from "noname";
function e(min = 0, max = 100, value) {
	const slider = document.createElement("input");
	((slider.className = "slider"), (slider.type = "range"), (slider.min = min), (slider.max = max));
	const updateProgress = () => {
			const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
			slider.style.backgroundSize = `${percent}% 100%`;
		},
		originalValue = Object.getOwnPropertyDescriptor(slider.__proto__, "value");
	return (
		Object.defineProperty(slider, "value", {
			configurable: !0,
			get: () => originalValue.get.call(slider),
			set: val => {
				(originalValue.set.call(slider, val), updateProgress());
			},
		}),
		slider.addEventListener("input", updateProgress),
		(slider.value = value ?? 0.5 * (max - min)),
		slider
	);
}
function n(decadeUI) {
	const { dialog: dialog } = decadeUI,
		box = dialog.create("chat-box folded");
	((box.container = dialog.create("container", box)), (box.operation = dialog.create("operation", box)), (box.content = dialog.create("content", box.container)));
	const operation = box.operation;
	((operation.fold = dialog.create("fold-button", operation, "button")), (operation.input = dialog.create("chat-input", operation, "input")), (operation.sticker = dialog.create("sticker-button", operation, "button")), (operation.send = dialog.create("send-button", operation, "button")), (operation.fold.innerHTML = "…"), (operation.sticker.innerHTML = "表情"), (operation.send.innerHTML = "发送"));
	const input = operation.input;
	((box.addEntry = info => {
		((dialog.create("chat-text", box.content).innerHTML = `<span class="sender">${info[0]}</span>:<span class="text">${info[1]}</span>`), box.overrideEntry?.(info), (box.content.scrollTop = box.content.scrollHeight));
	}),
		(box.addEntry._origin = box));
	return (
		(box.sendInputText = () => {
			const e = input.value;
			if (!e) return;
			const player = game.me ? game.me : game.connectPlayers ? (game.online ? game.connectPlayers.find(e => e.playerid === game.onlineID) || null : game.connectPlayers[0]) : null;
			player && (game.online ? game.send("chat", game.onlineID, e) : lib.element.player.chat.call(player, e), (input.value = ""), (_status.chatValue = ""));
		}),
		operation.fold.addEventListener("click", () => {
			const isFolded = box.classList.toggle("folded");
			operation.fold.innerHTML = isFolded ? "…" : "<<";
		}),
		operation.send.addEventListener("click", () => {
			(box.sendInputText(), input.focus());
		}),
		input.addEventListener("change", () => {
			_status.chatValue = input.value;
		}),
		input.addEventListener("keydown", e => {
			(13 === e.keyCode && box.sendInputText(), e.stopPropagation());
		}),
		box
	);
}
function t(decadeUI) {
	decadeUI.component = { slider: e, chatBox: () => n(decadeUI) };
}
export { n as createChatBox, e as createSlider, t as initComponent };
