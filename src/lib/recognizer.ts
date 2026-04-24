"use client";

import * as tf from "@tensorflow/tfjs";

const BUNDLED_MODEL_URL = "/mnist-model/model.json";
const CACHE_KEY = "indexeddb://brain-trainer-mnist-v2";

type ProgressCb = (msg: string, pct?: number) => void;

let modelPromise: Promise<tf.LayersModel> | null = null;

export function loadModel(progress: ProgressCb = () => {}): Promise<tf.LayersModel> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    // 1) Try the IndexedDB cache (instant on repeat visits).
    try {
      progress("Lade Modell…", 0.1);
      const cached = await tf.loadLayersModel(CACHE_KEY);
      progress("Bereit!", 1);
      return cached;
    } catch {
      // not cached yet
    }

    // 2) Load the bundled model shipped with the app.
    progress("Lade Modell…", 0.3);
    const model = await tf.loadLayersModel(BUNDLED_MODEL_URL);
    progress("Cache wird angelegt…", 0.85);
    try {
      await model.save(CACHE_KEY);
    } catch {
      // non-fatal: model still works without cache
    }
    progress("Bereit!", 1);
    return model;
  })();
  return modelPromise;
}

// Convert canvas drawing to a [1, 784] grayscale tensor centered like MNIST.
export function canvasToTensor(source: HTMLCanvasElement): tf.Tensor2D {
  return tf.tidy(() => {
    const w = source.width;
    const h = source.height;
    const ctx = source.getContext("2d", { willReadFrequently: true })!;
    const imageData = ctx.getImageData(0, 0, w, h);

    let minX = w,
      minY = h,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = imageData.data[i + 3] / 255;
        const r = imageData.data[i];
        const inkness = a * (1 - r / 255);
        if (inkness > 0.1) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) {
      return tf.zeros([1, 784]) as tf.Tensor2D;
    }

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const side = Math.max(bw, bh);
    const padded = Math.ceil(side * 1.4);
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = padded;
    cropCanvas.height = padded;
    const cctx = cropCanvas.getContext("2d")!;
    cctx.fillStyle = "white";
    cctx.fillRect(0, 0, padded, padded);
    cctx.drawImage(
      source,
      minX,
      minY,
      bw,
      bh,
      (padded - bw) / 2,
      (padded - bh) / 2,
      bw,
      bh,
    );

    // Resize and invert (MNIST: white digit on black).
    const t = tf.browser.fromPixels(cropCanvas, 1).toFloat();
    const resized = tf.image.resizeBilinear(t as tf.Tensor3D, [28, 28]);
    const inverted = tf.scalar(1).sub(resized.div(255));
    return inverted.reshape([1, 784]) as tf.Tensor2D;
  });
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
