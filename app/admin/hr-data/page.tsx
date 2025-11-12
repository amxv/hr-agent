import type { Metadata } from "next";
import { HRDataDashboard } from "@/components/admin/hr-data-dashboard";

export const metadata: Metadata = {
  title: "HR Data Dashboard",
  description:
    "Manage HR data for employees, leave balances, benefits, cases, and availability",
};

export default function HRDataPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-neutral-700 bg-clip-text pt-4 pb-2 font-medium text-4xl text-transparent tracking-tight lg:text-3xl">
            HR Data Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage employee data, leave balances, benefits, HR cases, and team
            availability
          </p>
        </div>
        <HRDataDashboard />
      </div>
    </div>
  );
}
