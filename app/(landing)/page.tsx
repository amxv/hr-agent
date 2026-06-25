import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "HR Agent — AI-Powered HR Assistant for Enterprise Teams",
  description:
    "HR Agent gives employees instant answers about leave balances, benefits, and HR cases through natural conversation — with enterprise RBAC, audit trails, and SLA tracking.",
};

export default function LandingPageRoute() {
  return <LandingPage />;
}
