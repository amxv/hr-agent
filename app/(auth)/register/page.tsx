import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Registration Disabled",
  description: "Self-service registration is disabled.",
};

export default function RegisterPage() {
  // Self-service registration is disabled - redirect to login
  redirect("/login");
}
