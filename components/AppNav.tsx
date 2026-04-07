"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/simulate", label: "Simulate" },
  { href: "/strategies", label: "Strategies" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/account", label: "Account" },
];

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/strategies" && pathname.startsWith("/strategy")) return true;
  return pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
              active
                ? "border-amber-400/60 bg-amber-400/10 text-amber-100"
                : "border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
