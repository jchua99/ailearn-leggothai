"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/actions";
import { Field, FormMessage, inputClass, primaryButton } from "@/components/ui";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Username" hint="2–20 characters. This is how others will see you.">
        <input
          name="username"
          required
          minLength={2}
          maxLength={20}
          autoComplete="nickname"
          autoFocus
          className={inputClass}
          placeholder="e.g. Jason"
        />
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Signing up…" : "Sign up"}
      </button>
    </form>
  );
}
