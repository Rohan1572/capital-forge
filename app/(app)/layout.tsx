import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getSessionUser();

  return <AppShell user={user}>{children}</AppShell>;
}
