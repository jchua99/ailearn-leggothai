"use client";

import { renameAction } from "@/app/actions";
import { useFormAction } from "@/components/useFormAction";
import { FormMessage, inputClass, primaryButton } from "@/components/ui";

export function RenameForm({ username }: { username: string }) {
  const { state, onSubmit, pending } = useFormAction(renameAction);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input name="username" required minLength={2} maxLength={20} defaultValue={username} aria-label="Your name" className={inputClass} />
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "…" : "Rename"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
