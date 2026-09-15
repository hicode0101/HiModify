/**
 * 生成 HiModify 的扩展图标 PNG（16/32/48/128）。
 * 设计：「渐变铅笔」—— 一支 45° 斜向铅笔（笔尖朝左下），
 * 沿笔身做彩虹渐变（绿→橙→红→紫→蓝），透明背景，超采样抗锯齿。
 * 几何与 src/components/PencilLogo.vue 保持一致。
 */
import pngjs from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { PNG } = pngjs;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icon');
mkdirSync(outDir, { recursive: true });

const S = 128; // 设计基准画布
const SS = 6; // 每轴超采样倍数
const C = Math.SQRT1_2;

// 铅笔几何（笔尖位于左下 (20,108)，沿 45° 指向右上）
const TIP = { x: 20, y: 108 };
const HALF_W = 17; // 笔杆半宽
const L_TIP = 26; // 笔尖三角长度
const BODY = [30, 92]; // 笔杆区间（与笔尖之间留 4 分隔缝）
const ER = [96, 108]; // 橡皮区间（与笔杆之间留 4 分隔缝）
const LEN = 125; // 渐变总长（含圆头）

/** 铅笔局部坐标：a = 沿笔轴（从笔尖起），b = 垂直偏移 */
function toLocal(px, py) {
  const dx = px - TIP.x;
  const dy = py - TIP.y;
  return [(dx - dy) * C, (dx + dy) * C];
}

function inPencil(px, py) {
  const [a, b] = toLocal(px, py);
  if (a < 0 || a > LEN) return false;
  if (a <= L_TIP) return Math.abs(b) <= HALF_W * (a / L_TIP); // 笔尖三角形
  if (a >= BODY[0] && a <= BODY[1]) return Math.abs(b) <= HALF_W; // 笔杆
  if (a >= ER[0] && a <= ER[1]) return Math.abs(b) <= HALF_W; // 橡皮直段
  const da = a - ER[1]; // 橡皮圆头（仅向 a 增大方向鼓出）
  return da >= 0 && da * da + b * b <= HALF_W * HALF_W;
}

// 沿笔身彩虹渐变
const STOPS = [
  [0.0, [34, 197, 94]], // #22C55E
  [0.3, [245, 158, 11]], // #F59E0B
  [0.55, [239, 68, 68]], // #EF4444
  [0.78, [168, 85, 247]], // #A855F7
  [1.0, [59, 130, 246]], // #3B82F6
];

function gradColor(a) {
  const t = Math.min(1, Math.max(0, a / LEN));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

function render(size) {
  const png = new PNG({ width: size, height: size });
  const k = size / S;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / k;
          const py = (y + (sy + 0.5) / SS) / k;
          if (!inPencil(px, py)) continue;
          cov++;
          const [a] = toLocal(px, py);
          const [r, g, b] = gradColor(a);
          cr += r;
          cg += g;
          cb += b;
        }
      }
      const idx = (size * y + x) << 2;
      if (cov > 0) {
        png.data[idx] = Math.round(cr / cov);
        png.data[idx + 1] = Math.round(cg / cov);
        png.data[idx + 2] = Math.round(cb / cov);
        png.data[idx + 3] = Math.round((cov / (SS * SS)) * 255);
      } else {
        png.data[idx + 3] = 0;
      }
    }
  }
  return PNG.sync.write(png);
}

for (const s of [16, 32, 48, 128]) {
  writeFileSync(join(outDir, `${s}.png`), render(s));
}
console.log(`icons generated → ${outDir}`);
