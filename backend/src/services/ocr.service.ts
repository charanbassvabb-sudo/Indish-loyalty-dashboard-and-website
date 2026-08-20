import { createWorker, type Worker } from "tesseract.js";

/**
 * A single reused Tesseract worker rather than spinning one up per request —
 * worker startup takes ~1-2s, which would otherwise add real latency to
 * every screenshot upload. Lazily created on first use, kept alive for the
 * life of the process.
 */
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng");
  }
  return workerPromise;
}

/**
 * Runs OCR on an uploaded screenshot and returns the raw recognized text.
 * This is genuinely just OCR — it has no idea what a "transaction ID" or
 * "amount" is, it just reads pixels into text. Field extraction happens
 * separately in payment-extraction.service.ts, working off this raw text.
 */
export async function extractTextFromImage(imagePath: string): Promise<string> {
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(imagePath);
  return text;
}

/** Call once on server shutdown so the worker's child process exits cleanly. */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
