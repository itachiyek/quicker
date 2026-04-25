"use client";

import * as tf from "@tensorflow/tfjs";

const BUNDLED_MODEL_URL = "/mnist-model/model.json";
const CACHE_KEY = "indexeddb://brain-trainer-mnist-v3";

type ProgressCb = (msg: string, pct?: number) => void;

let modelPromise: Promise<tf.LayersModel> | null = null;

export function loadModel(progress: ProgressCb = () => {}): Promise<tf.LayersModel> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    try {
      progress("Loading model…", 0.1);
      const cached = await tf.loadLayersModel(CACHE_KEY);
      progress("Ready", 1);
      return cached;
    } catch {
      // not cached yet
    }
    progress("Loading model…", 0.3);
    const model = await tf.loadLayersModel(BUNDLED_MODEL_URL);
    progress("Caching…", 0.85);
    try {
      await model.save(CACHE_KEY);
    } catch {
      // non-fatal
    }
    progress("Ready", 1);
    return model;
  })();
  return modelPromise;
}

type Region = { startX: number; endX: number; minY: number; maxY: number };

// Find horizontally-separated ink regions in the canvas. Each region is one
// candidate digit. Adjacent strokes within ~12% of canvas height are merged
// to avoid splitting glyphs like 4 or 5 with disconnected strokes.
function findDigitRegions(canvas: HTMLCanvasElement): Region[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;

  // Per-column ink count (pixels above ink threshold) + per-pixel ink lookup.
  const colInk = new Uint16Array(w);
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3] / 255;
      const r = data[i];
      const v = a * (1 - r / 255);
      if (v > 0.1) {
        ink[y * w + x] = 1;
        colInk[x]++;
      }
    }
  }

  // A column counts as "inked" if it has at least 1 ink pixel — generous,
  // because stroke edges are anti-aliased thin.
  const colThreshold = 1;
  // A blank run this long is treated as a separator between digits.
  // ~6% of canvas height tracks natural inter-digit spacing for normal
  // handwriting without splitting connected glyphs.
  const minGap = Math.max(6, Math.floor(h * 0.06));

  const rawRegions: Region[] = [];
  let inRegion = false;
  let start = 0;
  let blankRun = 0;
  for (let x = 0; x < w; x++) {
    if (colInk[x] >= colThreshold) {
      if (!inRegion) {
        start = x;
        inRegion = true;
      }
      blankRun = 0;
    } else if (inRegion) {
      blankRun++;
      if (blankRun >= minGap) {
        rawRegions.push({
          startX: start,
          endX: x - blankRun,
          minY: 0,
          maxY: h - 1,
        });
        inRegion = false;
      }
    }
  }
  if (inRegion) {
    rawRegions.push({ startX: start, endX: w - 1, minY: 0, maxY: h - 1 });
  }

  // Merge adjacent regions whose gap is smaller than ~25% of either
  // region's width. This protects digits with locally-disconnected strokes
  // (rare, but possible) while still leaving real two-digit gaps unmerged.
  const regions: Region[] = [];
  for (const r of rawRegions) {
    if (regions.length === 0) {
      regions.push(r);
      continue;
    }
    const last = regions[regions.length - 1];
    const gap = r.startX - last.endX;
    const lastW = last.endX - last.startX + 1;
    const curW = r.endX - r.startX + 1;
    if (gap < Math.min(lastW, curW) * 0.25) {
      last.endX = r.endX;
    } else {
      regions.push(r);
    }
  }

  // Tighten vertical bounds per region.
  for (const r of regions) {
    let minY = h,
      maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = r.startX; x <= r.endX; x++) {
        if (ink[y * w + x]) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          break;
        }
      }
    }
    if (maxY >= 0) {
      r.minY = minY;
      r.maxY = maxY;
    }
  }

  // Drop tiny specks (noise) — anything that's smaller than ~5% of canvas
  // height in BOTH dimensions is probably a stray pixel.
  return regions.filter(
    (r) =>
      r.endX - r.startX >= h * 0.05 || r.maxY - r.minY >= h * 0.05,
  );
}

// Build a [1, 784] tensor for one digit region using MNIST-style preprocessing
// (longer side fits 20px box, center-of-mass at 14,14, white-on-black).
function regionToTensor(
  source: HTMLCanvasElement,
  region: Region,
): tf.Tensor2D {
  const bw = region.endX - region.startX + 1;
  const bh = region.maxY - region.minY + 1;
  const longSide = Math.max(bw, bh);
  const scale = 20 / longSide;
  const targetW = Math.max(1, Math.round(bw * scale));
  const targetH = Math.max(1, Math.round(bh * scale));

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = targetW;
  cropCanvas.height = targetH;
  const cctx = cropCanvas.getContext("2d")!;
  cctx.imageSmoothingEnabled = true;
  cctx.imageSmoothingQuality = "high";
  cctx.fillStyle = "white";
  cctx.fillRect(0, 0, targetW, targetH);
  cctx.drawImage(
    source,
    region.startX,
    region.minY,
    bw,
    bh,
    0,
    0,
    targetW,
    targetH,
  );

  const scaled = cctx.getImageData(0, 0, targetW, targetH);
  const small = new Float32Array(targetW * targetH);
  for (let i = 0; i < targetW * targetH; i++) {
    const r = scaled.data[i * 4];
    const a = scaled.data[i * 4 + 3] / 255;
    small[i] = a * (1 - r / 255);
  }

  let mass = 0,
    cx = 0,
    cy = 0;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const v = small[y * targetW + x];
      if (v > 0) {
        mass += v;
        cx += x * v;
        cy += y * v;
      }
    }
  }
  cx = mass > 0 ? cx / mass : targetW / 2;
  cy = mass > 0 ? cy / mass : targetH / 2;

  const out = new Float32Array(28 * 28);
  const offX = Math.round(14 - cx);
  const offY = Math.round(14 - cy);
  for (let y = 0; y < targetH; y++) {
    const dy = y + offY;
    if (dy < 0 || dy >= 28) continue;
    for (let x = 0; x < targetW; x++) {
      const dx = x + offX;
      if (dx < 0 || dx >= 28) continue;
      out[dy * 28 + dx] = small[y * targetW + x];
    }
  }

  return tf.tidy(() => tf.tensor2d(out, [1, 784]));
}

// Recognize all digits drawn on the canvas, left-to-right.
// Returns an empty array if the canvas has no ink.
export async function recognizeAll(
  model: tf.LayersModel,
  canvas: HTMLCanvasElement,
): Promise<{ digits: number[]; confidences: number[] } | null> {
  const regions = findDigitRegions(canvas);
  if (regions.length === 0) return null;

  // Cap to at most 3 regions; we only ever need 2 for our equations.
  const limited = regions.slice(0, 3);

  const digits: number[] = [];
  const confidences: number[] = [];
  for (const r of limited) {
    const input = regionToTensor(canvas, r);
    const out = model.predict(input) as tf.Tensor;
    const data = await out.data();
    input.dispose();
    out.dispose();
    let best = -1;
    let bestVal = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > bestVal) {
        bestVal = data[i];
        best = i;
      }
    }
    if (best < 0) return null;
    digits.push(best);
    confidences.push(bestVal);
  }
  return { digits, confidences };
}
