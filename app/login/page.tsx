import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { readAuthUser } from "@/lib/auth-server";
import { signedInPath } from "@/lib/auth-client";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage() {
  const user = await readAuthUser();
  if (user) redirect(signedInPath(user.dashboardEnabled));
  return <LoginScreen />;
}
