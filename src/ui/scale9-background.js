// 半透明九宫格先合成为一张图，再交给浏览器整体缩放，避免切片边缘分别采样产生接缝。
const images = new Map();
const renders = new WeakMap();

function loadImage(url) {
	if (!images.has(url)) images.set(url, new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => { images.delete(url); reject(new Error(`Scale9 image load failed: ${url}`)); };
		image.src = url;
	}));
	return images.get(url);
}

export function setScale9Background(element, url, insets) {
	const width = element.offsetWidth, height = element.offsetHeight;
	if (!width || !height) return Promise.resolve();
	const rect = Element.prototype.getBoundingClientRect.call(element);
	const ratio = (rect.width / width || 1) * (window.devicePixelRatio || 1);
	const pixelWidth = Math.max(1, Math.round(width * ratio)), pixelHeight = Math.max(1, Math.round(height * ratio));
	const key = `${url}:${insets}:${width}:${height}:${pixelWidth}:${pixelHeight}`;
	if (renders.get(element)?.key === key) return renders.get(element).ready;
	const state = { key };
	renders.set(element, state);
	state.ready = loadImage(url).then(image => {
		if (renders.get(element) !== state || !element.isConnected) return;
		const [top, right, bottom, left] = insets;
		const canvas = document.createElement("canvas");
		canvas.width = pixelWidth; canvas.height = pixelHeight;
		const context = canvas.getContext("2d");
		const sourceX = [0, left, image.width - right, image.width];
		const sourceY = [0, top, image.height - bottom, image.height];
		const scaleX = Math.min(1, width / (left + right));
		const scaleY = Math.min(1, height / (top + bottom));
		const destX = [0, Math.round(left * scaleX * pixelWidth / width), pixelWidth - Math.round(right * scaleX * pixelWidth / width), pixelWidth];
		const destY = [0, Math.round(top * scaleY * pixelHeight / height), pixelHeight - Math.round(bottom * scaleY * pixelHeight / height), pixelHeight];
		for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
			context.drawImage(image, sourceX[x], sourceY[y], sourceX[x + 1] - sourceX[x], sourceY[y + 1] - sourceY[y], destX[x], destY[y], destX[x + 1] - destX[x], destY[y + 1] - destY[y]);
		}
		element.style.setProperty("--scale9-background", `url("${canvas.toDataURL()}")`);
		canvas.width = canvas.height = 0;
	});
	return state.ready;
}

export function clearScale9Background(element) {
	if (!element) return;
	renders.delete(element);
	element.style.removeProperty("--scale9-background");
}
