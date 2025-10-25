import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <div className="container mx-auto flex h-dvh w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col items-center justify-center sm:w-[420px]">
        <LoginForm className="w-full" />
      </div>
    </div>
  );
}
