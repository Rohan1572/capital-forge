import { redirect } from "next/navigation";
import { AccountSettingsPanel } from "@/components/auth/AccountSettingsPanel";
import { getSessionUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AccountSettingsPanel
      user={{
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
