"use client";

import { useFormStatus } from "react-dom";

/** Disabled while saving so a double tap can't record the same repayment twice. */
export function SettleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-lg border border-teal-600 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Mark settled"}
    </button>
  );
}
