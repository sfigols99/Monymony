"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ExpenseForm,
  type ExpenseOption,
  type ExpensePrefill,
} from "./ExpenseForm";
import { ReceiptScanner } from "./ReceiptScanner";
import { type ParsedReceipt } from "@/lib/ocr";

/**
 * "New expense" panel: a receipt scanner that pre-fills the form, plus the form
 * itself. Scanning is optional — the form works on its own. When a receipt is
 * scanned, the parsed fields seed the form and the expense is tagged
 * `source: "ticket"` with the stored receipt path.
 */
export function NewExpense({
  categories,
  members,
  householdId,
}: {
  categories: ExpenseOption[];
  members: ExpenseOption[];
  householdId: string;
}) {
  const t = useTranslations("expenses");
  const [prefill, setPrefill] = useState<ExpensePrefill | undefined>();
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  // Bumped on each scan so the form remounts and picks up new default values.
  const [formKey, setFormKey] = useState(0);

  function handleParsed(fields: ParsedReceipt, path: string) {
    setPrefill({
      amount: fields.amount,
      expenseDate: fields.date,
      description: fields.merchant,
    });
    setReceiptPath(path);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <ReceiptScanner householdId={householdId} onParsed={handleParsed} />

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        {t("scan.or")}
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <ExpenseForm
        key={formKey}
        categories={categories}
        members={members}
        prefill={prefill}
        receiptPath={receiptPath}
        source={receiptPath ? "ticket" : "form"}
      />
    </div>
  );
}
