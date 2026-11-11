import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupScreen } from "@/components/auth/signup-screen";
import { readAuthUser } from "@/lib/auth-server";
import { signedInPath } from "@/lib/auth-client";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  const user = await readAuthUser();
  if (user) redirect(signedInPath(user.dashboardEnabled));
  return <SignupScreen />;
}
