"use client";

import type { OCRProvider, OCRProgress, ParsedReceipt } from "./types";
import { parseReceipt } from "./parse";

/**
 * Browser OCR provider backed by Tesseract.js (WASM, runs in a web worker).
 * The heavy core + language data are fetched from a CDN on first use and
 * cached by the browser, so nothing runs on the server. Spanish is loaded by
 * default (covers accented merchant names; digits are language-agnostic).
 */
export const tesseractProvider: OCRProvider = {
  id: "tesseract",
  async recognize(
    image: Blob | File,
    onProgress?: OCRProgress,
  ): Promise<ParsedReceipt> {
    // Dynamic import keeps the ~heavy worker out of the initial bundle and off
    // the server (this module is client-only).
    const { createWorker } = await import("tesseract.js");

    const worker = await createWorker("spa", undefined, {
      logger: (m: { status: string; progress: number }) => {
        if (onProgress && m.status === "recognizing text") {
          onProgress(m.progress);
        }
      },
    });

    try {
      const { data } = await worker.recognize(image);
      return parseReceipt(data.text ?? "");
    } finally {
      await worker.terminate();
    }
  },
};
