"use client";

import { loginAction } from "@/app/actions";
import { useFormAction } from "@/components/useFormAction";
import { Field, FormMessage, inputClass, primaryButton } from "@/components/ui";

export function LoginForm({ users }: { users: { id: number; username: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(loginAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Your name">
        <select name="userId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select your name…
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
