import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@/db/schema";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

export const primaryButton =
  "inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60";

export const secondaryButton =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";

export const dangerButton =
  "inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function FormMessage({ state }: { state: { error?: string; success?: string } | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  if (state?.success)
    return <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">{state.success}</p>;
  return null;
}

export function UserChip({ user, you }: { user: Pick<User, "username" | "color">; you?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: user.color }} aria-hidden />
      {user.username}
      {you && <span className="text-slate-400">(you)</span>}
    </span>
  );
}

export function Avatar({ user, size = 32 }: { user: Pick<User, "username" | "color">; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ backgroundColor: user.color, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {user.username.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

/** Highlight for a visually-hidden radio/checkbox's label when it has keyboard focus. */
export const optionFocusRing = "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600/40";

/** Pill-style All / Mine switch driven by links (so it works with the URL and back button). */
export function SegmentedTabs<V extends string>({
  value,
  tabs,
}: {
  value: V;
  tabs: { value: V; label: string; href: string }[];
}) {
  return (
    <div className="flex rounded-lg bg-slate-200/70 p-1">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={value === t.value ? "page" : undefined}
          className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium ${
            value === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
