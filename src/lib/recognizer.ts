"use client";

import * as tf from "@tensorflow/tfjs";

const MODEL_KEY = "indexeddb://brain-trainer-mnist-v1";

const MNIST_IMAGES_SPRITE_PATH =
  "https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png";
const MNIST_LABELS_PATH =
  "https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8";

const IMAGE_SIZE = 784; // 28 * 28
const NUM_CLASSES = 10;
const NUM_DATASET_ELEMENTS = 65000;
const NUM_TRAIN_ELEMENTS = 55000;

type ProgressCb = (msg: string, pct?: number) => void;

let modelPromise: Promise<tf.LayersModel> | null = null;

async function loadMnistData(progress: ProgressCb) {
  progress("Lade Trainingsdaten…", 0);

  const img = new Image();
  img.crossOrigin = "anonymous";
  const imgPromise = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load MNIST sprite"));
  });
  img.src = MNIST_IMAGES_SPRITE_PATH;
  await imgPromise;

  const datasetBytesBuffer = new ArrayBuffer(
    NUM_DATASET_ELEMENTS * IMAGE_SIZE * 4,
  );
  const chunkSize = 5000;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = chunkSize;
  const cctx = canvas.getContext("2d", { willReadFrequently: true })!;

  for (let i = 0; i < NUM_DATASET_ELEMENTS / chunkSize; i++) {
    const datasetBytesView = new Float32Array(
      datasetBytesBuffer,
      i * IMAGE_SIZE * chunkSize * 4,
      IMAGE_SIZE * chunkSize,
    );
    cctx.drawImage(
      img,
      0,
      i * chunkSize,
      img.width,
      chunkSize,
      0,
      0,
      img.width,
      chunkSize,
    );
    const imageData = cctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let j = 0; j < imageData.data.length / 4; j++) {
      datasetBytesView[j] = imageData.data[j * 4] / 255;
    }
    progress("Lade Trainingsdaten…", 0.2 + (i / 13) * 0.3);
  }
  const datasetImages = new Float32Array(datasetBytesBuffer);

  progress("Lade Labels…", 0.55);
  const labelsResponse = await fetch(MNIST_LABELS_PATH);
  const datasetLabels = new Uint8Array(await labelsResponse.arrayBuffer());

  const trainImages = datasetImages.slice(0, IMAGE_SIZE * NUM_TRAIN_ELEMENTS);
  const trainLabels = datasetLabels.slice(0, NUM_CLASSES * NUM_TRAIN_ELEMENTS);

  return { trainImages, trainLabels };
}

function buildModel(): tf.LayersModel {
  const model = tf.sequential();
  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 1],
      kernelSize: 3,
      filters: 16,
      activation: "relu",
    }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(
    tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: "relu" }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dropout({ rate: 0.25 }));
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dense({ units: 10, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
}

async function trainAndCache(progress: ProgressCb): Promise<tf.LayersModel> {
  const data = await loadMnistData(progress);

  // Use a subset for fast in-browser training.
  const TRAIN_N = 8000;
  const xs = tf.tensor4d(
    data.trainImages.slice(0, TRAIN_N * IMAGE_SIZE),
    [TRAIN_N, 28, 28, 1],
  );
  const ys = tf.tensor2d(
    data.trainLabels.slice(0, TRAIN_N * NUM_CLASSES),
    [TRAIN_N, NUM_CLASSES],
  );

  const model = buildModel();
  const totalEpochs = 4;

  await model.fit(xs, ys, {
    epochs: totalEpochs,
    batchSize: 128,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const pct = 0.6 + ((epoch + 1) / totalEpochs) * 0.4;
        progress(
          `Trainiere… Epoche ${epoch + 1}/${totalEpochs} (acc ${(logs?.acc ?? 0).toFixed(2)})`,
          pct,
        );
      },
    },
  });

  xs.dispose();
  ys.dispose();

  await model.save(MODEL_KEY);
  progress("Bereit!", 1);
  return model;
}

export function loadModel(progress: ProgressCb = () => {}): Promise<tf.LayersModel> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    try {
      progress("Lade Modell…", 0.05);
      const model = await tf.loadLayersModel(MODEL_KEY);
      progress("Bereit!", 1);
      return model;
    } catch {
      return await trainAndCache(progress);
    }
  })();
  return modelPromise;
}

// Convert canvas drawing to a 28x28 grayscale tensor centered like MNIST.
export function canvasToTensor(source: HTMLCanvasElement): tf.Tensor4D {
  return tf.tidy(() => {
    const w = source.width;
    const h = source.height;
    const ctx = source.getContext("2d", { willReadFrequently: true })!;
    const imageData = ctx.getImageData(0, 0, w, h);

    // Build a luminance buffer where ink = high value.
    const buf = new Float32Array(w * h);
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
        buf[y * w + x] = inkness;
        if (inkness > 0.1) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) {
      return tf.zeros([1, 28, 28, 1]) as tf.Tensor4D;
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
    return inverted.expandDims(0) as tf.Tensor4D;
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
