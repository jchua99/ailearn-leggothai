"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Itinerary", icon: "🗓️", match: (p: string) => p === "/" || p.startsWith("/itinerary") },
  { href: "/expenses", label: "Expenses", icon: "💸", match: (p: string) => p.startsWith("/expenses") },
  { href: "/balances", label: "Balances", icon: "⚖️", match: (p: string) => p.startsWith("/balances") },
  { href: "/settings", label: "Settings", icon: "⚙️", match: (p: string) => p.startsWith("/settings") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-teal-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className={`text-lg ${active ? "" : "grayscale opacity-70"}`} aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
