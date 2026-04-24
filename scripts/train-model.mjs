// Train a tiny MNIST CNN with pure @tensorflow/tfjs (no native deps)
// and save it to public/mnist-model/ as a TFJS LayersModel.
import { createRequire } from "module";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const tf = require("@tensorflow/tfjs");
const mnist = require("mnist");

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "mnist-model");

// Use most of the available samples (mnist npm has ~1000 per class).
const TRAIN_PER_CLASS = 800;
const TEST_PER_CLASS = 100;
const TRAIN_TOTAL = TRAIN_PER_CLASS * 10;
const TEST_TOTAL = TEST_PER_CLASS * 10;

console.log(
  `Building dataset (${TRAIN_TOTAL} train / ${TEST_TOTAL} test)...`,
);
const set = mnist.set(TRAIN_TOTAL, TEST_TOTAL);

function toTensors(samples) {
  const xs = new Float32Array(samples.length * 784);
  const ys = new Float32Array(samples.length * 10);
  for (let i = 0; i < samples.length; i++) {
    xs.set(samples[i].input, i * 784);
    ys.set(samples[i].output, i * 10);
  }
  return {
    x: tf.tensor2d(xs, [samples.length, 784]),
    y: tf.tensor2d(ys, [samples.length, 10]),
  };
}

const { x: trainX, y: trainY } = toTensors(set.training);
const { x: testX, y: testY } = toTensors(set.test);

// Small MLP — trains fast even in pure JS, ~95-97% acc on MNIST is enough.
const model = tf.sequential();
model.add(
  tf.layers.dense({ inputShape: [784], units: 128, activation: "relu" }),
);
model.add(tf.layers.dropout({ rate: 0.2 }));
model.add(tf.layers.dense({ units: 64, activation: "relu" }));
model.add(tf.layers.dense({ units: 10, activation: "softmax" }));

model.compile({
  optimizer: tf.train.adam(),
  loss: "categoricalCrossentropy",
  metrics: ["accuracy"],
});

console.log("Training...");
const EPOCHS = 12;
await model.fit(trainX, trainY, {
  epochs: EPOCHS,
  batchSize: 64,
  validationData: [testX, testY],
  callbacks: {
    onEpochBegin: (epoch) => {
      process.stdout.write(`epoch ${epoch + 1}/${EPOCHS} `);
    },
    onBatchEnd: (batch) => {
      if (batch % 10 === 0) process.stdout.write(".");
    },
    onEpochEnd: (epoch, logs) => {
      process.stdout.write(
        ` loss=${logs.loss.toFixed(4)} acc=${logs.acc.toFixed(4)} valAcc=${logs.val_acc?.toFixed(4) ?? "-"}\n`,
      );
    },
  },
});

const evalRes = model.evaluate(testX, testY);
const testLoss = (await evalRes[0].data())[0];
const testAcc = (await evalRes[1].data())[0];
console.log(`Final test acc: ${testAcc.toFixed(4)} (loss ${testLoss.toFixed(4)})`);

// Save by intercepting the IO handler -- write JSON + binary weights to disk.
mkdirSync(OUT_DIR, { recursive: true });

const saveResult = await model.save(
  tf.io.withSaveHandler(async (artifacts) => {
    // artifacts.modelTopology, .weightSpecs, .weightData (ArrayBuffer)
    const weightsManifest = [
      {
        paths: ["weights.bin"],
        weights: artifacts.weightSpecs,
      },
    ];
    const modelJSON = {
      modelTopology: artifacts.modelTopology,
      format: artifacts.format,
      generatedBy: artifacts.generatedBy,
      convertedBy: artifacts.convertedBy,
      weightsManifest,
    };
    writeFileSync(join(OUT_DIR, "model.json"), JSON.stringify(modelJSON));
    writeFileSync(join(OUT_DIR, "weights.bin"), Buffer.from(artifacts.weightData));
    return {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: "JSON",
      },
    };
  }),
);

console.log("Saved model to", OUT_DIR);
console.log(saveResult.modelArtifactsInfo);

trainX.dispose();
trainY.dispose();
testX.dispose();
testY.dispose();
