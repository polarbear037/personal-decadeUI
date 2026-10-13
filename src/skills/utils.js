import { lib } from "noname";
const t = () => ({ position: "absolute", width: "249px", height: "249px", borderRadius: "6px", left: "calc(50% - 125px)", top: "calc(50% - 125px)", border: "3px solid" }),
	e = (t, e = 249) => ((t.width = e), (t.height = e), Object.assign(t.style, { position: "absolute", width: "249px", height: "249px", borderRadius: "6px", left: "calc(50% - 125px)", top: "calc(50% - 125px)", border: "3px solid" }), t.getContext("2d")),
	o = (ctx, canvas, name) => {
		const img = new Image();
		((img.src = `${lib.assetURL}image/card/${name}.png`), (img.onload = () => ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)));
	};
export { t as createCanvasStyle, e as initCanvas, o as loadImageToCanvas };
