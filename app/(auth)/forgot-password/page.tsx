import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getSessionUser } from "@/lib/session";

export default async function ForgotPasswordPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/account");
  }

  return <ForgotPasswordForm />;
}
