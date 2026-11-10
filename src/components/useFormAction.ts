"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "@/app/actions";

/**
 * Like `useActionState`, but submits via `onSubmit` instead of `<form action>`.
 *
 * React 19 resets every uncontrolled field after a `<form action>` completes — even when the
 * server only returned a validation error — so users would lose what they typed. Dispatching
 * the action ourselves skips that reset. Redirects from the Server Action still work.
 */
export function useFormAction(action: (prev: FormState, fd: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }
  return { state, onSubmit, pending };
}
