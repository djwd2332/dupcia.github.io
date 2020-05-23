"use strict";
// ---- canvas ----
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
const dpr = window.devicePixelRatio || 1;
canvas.width = canvas.offsetWidth * dpr;
canvas.height = canvas.offsetHeight * dpr;
// ---- source image ----
let img = {
	standardDeviationThreshold: 6,
	minSize: 3,
	img: new Image(),
	data: null,
	w: 0,
	h: 0,
	rx: 0,
	ry: 0,
	deconstruct() {
		this.w = this.img.width;
		this.h = this.img.height;
		const cmap = document.createElement("canvas");
		cmap.width = this.w;
		cmap.height = this.h;
		const ct = cmap.getContext("2d");
		ct.drawImage(this.img, 0, 0);
		this.data = ct.getImageData(0, 0, this.w, this.h).data;
		// ---- calc brillance ----
		for (let i = 0; i < this.w * this.h * 4; i += 4) {
			this.data[i + 3] =
				0.34 * this.data[i] + 0.5 * this.data[i + 1] + 0.16 * this.data[i + 2];
		}
		this.rx = canvas.width / this.w;
		this.ry = canvas.height / this.h;
	},
	load(id) {
		return new Promise((resolve) => {
			this.img.addEventListener("load", (_) => resolve());
			this.img.src = document.getElementById(id).src;
		});
	},
	// ---- create new Rectangle ----
	Rect(sdt, i, x, y, w, h) {
		const x0 = Math.floor(x);
		const y0 = Math.floor(y);
		const w0 = Math.ceil(w);
		const h0 = Math.ceil(h);
		const n = w0 * h0;
		// ---- average colors ----
		let r = 0, g = 0, b = 0, l = 0;
		for (let xi = x0; xi < x0 + w0; xi++) {
			for (let yi = y0; yi < y0 + h0; yi++) {
				const p = (yi * this.w + xi) * 4;
				r += this.data[p + 0];
				g += this.data[p + 1];
				b += this.data[p + 2];
				l += this.data[p + 3];
			}
		}
		r = (r / n) | 0;
		g = (g / n) | 0;
		b = (b / n) | 0;
		l = (l / n) | 0;
		// ---- standard deviation ----
		let sd = 0;
		for (let xi = x0; xi < x0 + w0; xi++) {
			for (let yi = y0; yi < y0 + h0; yi++) {
				const bri = this.data[(yi * this.w + xi) * 4 + 3] - l;
				sd += bri * bri;
			}
		}
		if ((w > this.minSize || h > this.minSize) && Math.sqrt(sd / n) > sdt) {
			// ---- recursive division ----
			this.Rect(sdt, i * 2, x, y, w * 0.5, h * 0.5);
			this.Rect(sdt, i * 2, x + w * 0.5, y, w * 0.5, h * 0.5);
			this.Rect(sdt, i * 2, x, y + h * 0.5, w * 0.5, h * 0.5);
			this.Rect(sdt, i * 2, x + w * 0.5, y + h * 0.5, w * 0.5, h * 0.5);
		} else {
			// ---- draw final rectangle ----
			if (w > 5) {
				// rectangle
				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(x * this.rx, y * this.ry, w * this.rx - 0.5, h * this.ry - 0.5);
				// circle
				ctx.beginPath();
				ctx.fillStyle = `rgb(${(r * 1.1) | 0},${(g * 1.1) | 0},${(b * 1.1) | 0})`;
				ctx.arc((x + w / 2) * this.rx, (y + h / 2) * this.ry, (w / 2.2) * this.rx, 0, 2 * Math.PI);
				ctx.fill();
				// text
				ctx.fillStyle = "#333";
				ctx.fillText(i, x * this.rx + 2, y * this.ry + 10, w);
			} else {
				// rectangle only
				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(x * this.rx, y * this.ry, w * this.rx - 0.5, h * this.ry - 0.5);
			}
		}
	}
};
// ---- promise raf ----
const requestAnimationFrame = () => {
	return new Promise((resolve) => window.requestAnimationFrame(resolve));
};
// ---- animation loop ----
async function run() {
	for (let sdt = 80; sdt >= img.standardDeviationThreshold; sdt--) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// ---- create the first rectangle ----
		img.Rect(sdt, 1, 0, 0, img.w, img.h);
		// ---- wait next frame ----
		await requestAnimationFrame();
	}
};
// ---- load image and run ----
img.load("source").then(() => {
	img.deconstruct();
	run();
});
