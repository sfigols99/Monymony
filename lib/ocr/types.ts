/**
 * Pluggable OCR layer. The default provider runs Tesseract.js in the browser
 * (zero server cost, works on Vercel's free tier). The interface is kept
 * provider-agnostic so a future remote provider (LLM vision / PaddleOCR via a
 * self-hosted service) can be swapped in without touching the UI — see
 * `lib/ocr/index.ts`.
 */

/** Fields we try to pull out of a receipt to pre-fill the expense form. */
export type ParsedReceipt = {
  /** Total amount in euros, if detected. */
  amount: number | null;
  /** Expense date as ISO `YYYY-MM-DD`, if detected. */
  date: string | null;
  /** Best-guess merchant / description (top line of the receipt). */
  merchant: string | null;
  /** Full recognized text, kept for debugging / manual reference. */
  rawText: string;
};

/** Progress callback while recognizing (0..1). */
export type OCRProgress = (progress: number) => void;

export type OCRProvider = {
  /** Provider id, useful for diagnostics / future selection. */
  readonly id: string;
  /** Recognize text in an image and parse it into receipt fields. */
  recognize(image: Blob | File, onProgress?: OCRProgress): Promise<ParsedReceipt>;
};
