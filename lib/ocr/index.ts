"use client";

import type { OCRProvider } from "./types";
import { tesseractProvider } from "./tesseract";

export type { OCRProvider, ParsedReceipt, OCRProgress } from "./types";

/**
 * Returns the active OCR provider. Today this is always the in-browser
 * Tesseract.js provider (zero cost, works on Vercel's free tier). A future
 * remote provider (LLM vision / self-hosted PaddleOCR behind `/api/ocr`) can be
 * selected here via an env flag without changing any caller.
 */
export function getOCRProvider(): OCRProvider {
  return tesseractProvider;
}
