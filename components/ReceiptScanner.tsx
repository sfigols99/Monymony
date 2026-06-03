"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getOCRProvider, type ParsedReceipt } from "@/lib/ocr";

type Phase = "idle" | "uploading" | "reading" | "done" | "error";

/**
 * Lets the user photograph / upload a receipt. The image is uploaded to the
 * private `receipts` bucket and OCR'd in the browser (Tesseract.js); the parsed
 * fields and the stored object path are handed back so the expense form can be
 * pre-filled. All processing is client-side — nothing hits the server.
 */
export function ReceiptScanner({
  householdId,
  onParsed,
}: {
  householdId: string;
  onParsed: (fields: ParsedReceipt, receiptPath: string) => void;
}) {
  const t = useTranslations("expenses.scan");
  const te = useTranslations("errors");
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErrorKey(null);

    // 1) Upload the original image to Storage under {household_id}/{uuid}.
    setPhase("uploading");
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${householdId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, file, { contentType: file.type || "image/jpeg" });
    if (uploadError) {
      setPhase("error");
      setErrorKey("uploadFailed");
      return;
    }

    // 2) OCR in the browser and parse the receipt fields.
    setPhase("reading");
    setProgress(0);
    try {
      const fields = await getOCRProvider().recognize(file, (p) =>
        setProgress(Math.round(p * 100)),
      );
      setPhase("done");
      onParsed(fields, path);
    } catch {
      setPhase("error");
      setErrorKey("ocrFailed");
    }
  }

  const busy = phase === "uploading" || phase === "reading";

  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
      <p className="mb-3 text-sm text-neutral-500">{t("hint")}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        <span className="material-symbols-rounded text-[20px]">photo_camera</span>
        {phase === "done" ? t("retake") : t("choose")}
      </button>

      {phase === "uploading" && (
        <p className="mt-2 text-xs text-neutral-400">{t("uploading")}</p>
      )}
      {phase === "reading" && (
        <p className="mt-2 text-xs text-neutral-400">
          {t("reading", { percent: progress })}
        </p>
      )}
      {phase === "done" && (
        <p className="mt-2 text-xs text-emerald-600">{t("detected")}</p>
      )}
      {phase === "error" && errorKey && (
        <p className="mt-2 text-xs text-red-600">{te(errorKey)}</p>
      )}
    </div>
  );
}
