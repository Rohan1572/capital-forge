import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getSessionUser } from "@/lib/session";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function readToken(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.token;
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{
  searchParams?: SearchParams;
}>) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();

  if (user) {
    redirect("/account");
  }

  const token = readToken(params);
  if (!token) {
    redirect("/forgot-password");
  }

  return <ResetPasswordForm token={token} />;
}
