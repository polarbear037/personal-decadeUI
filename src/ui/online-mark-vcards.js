import { get } from "noname";

const banners = new Set([
	"binglinchengxia", "chenghuodajie", "dongzhuxianji", "du", "fudichouxin", "guaguliaodu",
	"guohe", "huogong", "jiedao", "jiu", "juedou", "kaihua", "nanman", "putiantongqing",
	"qizhengxiangsheng", "ruixue", "sha", "shan", "shuiyanqijunx", "shunshou", "tao", "taoyuan",
	"tiaojiyanmei", "tiesuo", "tongzhougongji", "toulianghuanzhu", "tuixinzhifu", "wanjian",
	"wugu", "wugunapai", "wuxie", "wuzhong", "wy_meirenji", "wy_xiaolicangdao", "xuni", "yiyi",
	"yuanjiao", "zhibi", "zhuan",
]);
const shaNatures = new Set(["fire", "thunder", "ice", "kami", "stab"]);
const filenames = { huogong: "HuoGong", dongzhuxianji: "DongZhuXianJi" };

export function applyOnlineLucunCards(dialog, buttons) {
	dialog.classList.add("online-lucun-card-dialog");
	const title = dialog.content.querySelector(":scope > .caption");
	if (title) title.textContent = get.translation("olsblucun");
	for (const button of buttons) {
		const card = button.link;
		const name = Array.isArray(card) ? card[2] : card?.name;
		const nature = Array.isArray(card) ? card[3] : card?.nature;
		if (!name) continue;
		button.classList.add("online-mark-vcard");
		const label = document.createElement("span");
		label.className = "online-mark-vcard-label";
		label.textContent = (nature ? get.translation(nature) : "") + get.translation(name);
		button.append(label);
		if (!banners.has(name)) continue;
		const file = name === "sha" && shaNatures.has(nature) ? `sha_${nature}` : filenames[name] ?? name;
		const image = document.createElement("img");
		image.className = "online-mark-vcard-image";
		image.alt = "";
		image.addEventListener("error", () => image.remove(), { once: true });
		image.src = new URL(`../../image/vcard/${file}.png`, import.meta.url).href;
		button.append(image);
	}
}
