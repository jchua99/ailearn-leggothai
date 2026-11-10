"use client";

import { useActionState } from "react";
import { renameAction } from "@/app/actions";
import { FormMessage, inputClass, primaryButton } from "@/components/ui";

export function RenameForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(renameAction, undefined);
  return (
    <form action={action} className="space-y-3">
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
