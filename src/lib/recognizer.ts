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

// MNIST-style preprocessing:
// 1) Find bounding box of ink
// 2) Resize so the longer side fits a 20x20 box
// 3) Place in a 28x28 image with the center of mass at (14, 14)
// Returns a [1, 784] tensor with values in [0, 1] (white digit on black, like MNIST).
export function canvasToTensor(source: HTMLCanvasElement): tf.Tensor2D {
  const w = source.width;
  const h = source.height;
  const ctx = source.getContext("2d", { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, w, h);

  // Build inkness buffer in source resolution: ink = 1, background = 0.
  const ink = new Float32Array(w * h);
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = imageData.data[i + 3] / 255;
      const r = imageData.data[i];
      const v = a * (1 - r / 255);
      ink[y * w + x] = v;
      if (v > 0.15) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    return tf.tidy(() => tf.zeros([1, 784]) as tf.Tensor2D);
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;

  // Step 1: draw the cropped ink onto an offscreen canvas, then scale so the
  // longer side is 20px (matching MNIST normalization).
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
  cctx.drawImage(source, minX, minY, bw, bh, 0, 0, targetW, targetH);

  // Read back the scaled image, invert to MNIST polarity (white on black).
  const scaled = cctx.getImageData(0, 0, targetW, targetH);
  const small = new Float32Array(targetW * targetH);
  for (let i = 0; i < targetW * targetH; i++) {
    const r = scaled.data[i * 4];
    const a = scaled.data[i * 4 + 3] / 255;
    small[i] = a * (1 - r / 255);
  }

  // Step 2: compute center of mass on the scaled glyph.
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

  // Step 3: place into 28x28 so center of mass lands at (14, 14).
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

export async function recognize(
  model: tf.LayersModel,
  canvas: HTMLCanvasElement,
): Promise<{ digit: number; confidence: number } | null> {
  const input = canvasToTensor(canvas);
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
  return { digit: best, confidence: bestVal };
}
