import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getSessionUser } from "@/lib/session";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function isSwitchAccount(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.switch;
  const switchValue = Array.isArray(value) ? value[0] : value;
  return switchValue === "1" || switchValue === "true";
}

export default async function RegisterPage({
  searchParams,
}: Readonly<{
  searchParams?: SearchParams;
}>) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  const switchAccount = isSwitchAccount(params);

  if (user && !switchAccount) {
    redirect("/dashboard");
  }

  return <RegisterForm isSwitchAccount={switchAccount} />;
}
