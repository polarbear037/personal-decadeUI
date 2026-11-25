import { game, get, lib, ui, _status } from "noname";
import { refreshEquipLayout } from "../../ui/equip-layout.js";
import { updateOnlineHandCards } from "../../ui/online-hand-cards.js";
import { positionHandDisplays } from "../../ui/hand-displays.js";
let e = null;
function t(str) {
	str = str.replace(/##assetURL##/g, lib.assetURL);
	const tempDiv = document.createElement("div");
	tempDiv.innerHTML = str;
	if ("" === (tempDiv.textContent || tempDiv.innerText || "").trim() && tempDiv.querySelectorAll("img").length > 0) {
		if (!this.$chatImage || !this.$chatImage.parentNode) {
			((this.$chatImage = decadeUI.element.create("chat-image")), (this.$chatImage.style.position = "absolute"), (this.$chatImage.style.pointerEvents = "none"));
			const e = decadeUI.config.newDecadeStyle;
			"off" === e || "on" === e || "othersOff" === e ? ((this.$chatImage.style.left = "50%"), (this.$chatImage.style.top = "50%"), (this.$chatImage.style.transform = "translate(-50%, -50%)"), (this.$chatImage.style.zIndex = "90")) : ((this.$chatImage.style.left = "-40%"), (this.$chatImage.style.top = "-50px"), (this.$chatImage.style.transform = "translateX(-50%)"), (this.$chatImage.style.zIndex = "90"));
		}
		const t = this.$chatImage;
		t.innerHTML = str;
		(t.querySelectorAll("img").forEach(img => {
			img.style.width || img.style.height || ((img.style.width = "100px"), (img.style.height = "auto"), (img.style.maxWidth = "100px"));
		}),
			this != t.parentNode && this.appendChild(t),
			t.classList.remove("removing"),
			(t.style.animation = "fade-in 0.3s"),
			t.timeout && clearTimeout(t.timeout),
			(t.timeout = setTimeout(() => {
				((t.timeout = void 0), t.delete(), (this.$chatImage = void 0));
			}, 2e3)));
	} else {
		this.$chatBubble || (this.$chatBubble = decadeUI.element.create("chat-bubble"));
		const t = this.$chatBubble;
		((t.innerHTML = str),
			this != t.parentNode && this.appendChild(t),
			t.classList.remove("removing"),
			(t.style.animation = "fade-in 0.3s"),
			t.timeout && clearTimeout(t.timeout),
			(t.timeout = setTimeout(() => {
				((t.timeout = void 0), t.delete());
			}, 2e3)));
	}
	const name = get.translation(this.name),
		info = [name ? `${name}[${this.nickname}]` : this.nickname, str];
	(lib.chatHistory.push(info), _status.addChatEntry && (_status.addChatEntry._origin.parentNode ? _status.addChatEntry(info, !1) : (_status.addChatEntry = void 0)), lib.config.background_speak && lib.quickVoice.includes(str) && game.playAudio("voice", "female" === this.sex ? "female" : "male", lib.quickVoice.indexOf(str)));
}
function i(map) {
	map ||= this.expandedSlots || {};
	game.addVideo("$syncExpand", this, get.copy(map));
	game.broadcast(function (player, map) {
		player.expandedSlots = map;
		player.$syncExpand(map);
	}, this, map);
	this[lib.skill.expandedSlots.intro.markcount(null, this) > 0 ? "markSkill" : "unmarkSkill"]("expandedSlots");
	refreshEquipLayout(this);
}
function s(characterName, isDeputy) {
	if (!get.character(characterName)) return;
	const nameNode = this.node?.[isDeputy ? "name2" : "name"],
		avatarNode = this.node?.[isDeputy ? "avatar2" : "avatar"];
	if (!nameNode) return;
	const addSuffix = () => {
			nameNode.textContent.endsWith("•体验") || (nameNode.textContent = `${nameNode.textContent}•体验`);
		},
		bgImage = avatarNode?.style?.backgroundImage;
	if (!bgImage) return void addSuffix();
	const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
	if (!match?.[1]) return void addSuffix();
	const src = match[1],
		testImg = new Image();
	((testImg.onload = () => {
		nameNode.textContent.endsWith("•体验") && (nameNode.textContent = nameNode.textContent.slice(0, -3));
	}),
		(testImg.onerror = addSuffix),
		(testImg.src = src));
}
function n() {
	const player = this;
	if (!player.node.showCards) return;
	if (player == game.me || player.isDead()) {
		updateOnlineHandCards(player, []);
		for (player.node.showCards.hide(); player.node.showCards.hasChildNodes(); ) player.node.showCards.removeChild(player.node.showCards.firstChild);
		return;
	}
	const cards = player.getCards("h", e => get.is.shownCard(e) || (void 0 !== game.me && player.isUnderControl(!0)) || (game.me && game.me.hasSkillTag("viewHandcard", null, player, !0)));
	if (cards.length) positionHandDisplays(player);
	if (updateOnlineHandCards(player, cards)) return;
	if (cards.length) {
		for (player.node.showCards.show(); player.node.showCards.hasChildNodes(); ) player.node.showCards.removeChild(player.node.showCards.firstChild);
		for (let i = 0; i < 5; i++) createElement("div", { class: ["handcard"], innerHTML: i < cards.length ? (lib.translate[cards[i].name] || "").slice(0, 2) : "", parentNode: player.node.showCards });
	} else player.node.showCards.hide();
	function createElement(tag, opts = {}) {
		const i = document.createElement(tag);
		for (const s in opts) {
			if (!Object.hasOwnProperty.call(opts, s)) continue;
			const e = {
				class: e => e.forEach(e => i.classList.add(e)),
				id: e => (i.id = e),
				parentNode: e => e.appendChild(i),
				listen: e => {
					for (const t in e) "function" == typeof e[t] && (i[t] = e[t]);
				},
				style: e => {
					for (const t in e) i.style[t] = e[t];
				},
				children: e => e.forEach(e => i.appendChild(e)),
				insertBefore: e => e[0].insertBefore(i, e[1]),
			};
			"innerHTML" == s || "innerText" == s ? (i[s] = opts[s]) : e[s] && e[s](opts[s]);
		}
		return i;
	}
}
function a() {
	const refer = (e || (e = window.decadeUI), e).boundsCaches.arena;
	refer.check();
	this.cacheReferW = refer.width;
	this.cacheReferH = refer.height;
	this.cachePosition = this.dataset.position;
	// A reused seat can move when the player count/layout changes without changing
	// its position number or the arena size. Refresh all movement callers from DOM.
	this.cacheLeft = this.offsetLeft;
	this.cacheTop = this.offsetTop;
	this.cacheWidth = this.offsetWidth;
	this.cacheHeight = this.offsetHeight;
}
export { s as playerCheckAndAddExperienceSuffix, a as playerCheckBoundsCache, t as playerSay, i as playerSyncExpand, n as playerUpdateShowCards };
