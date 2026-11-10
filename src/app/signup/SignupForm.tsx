"use client";

import { signupAction } from "@/app/actions";
import { useFormAction } from "@/components/useFormAction";
import { Field, FormMessage, inputClass, primaryButton } from "@/components/ui";

export function SignupForm() {
  const { state, onSubmit, pending } = useFormAction(signupAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
