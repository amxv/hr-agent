import type { Metadata } from "next";
import { EnrollmentListTable } from "@/components/admin/enrollment-list-table";

export const metadata: Metadata = {
  title: "Benefits Enrollments",
  description: "Manage employee benefits enrollments and dependents",
};

export default function BenefitsEnrollmentsPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-neutral-700 bg-clip-text pt-4 pb-2 font-medium text-4xl text-transparent tracking-tight lg:text-3xl">
            Benefits Enrollments
          </h1>
          <p className="mt-2 text-muted-foreground">
            View and manage employee benefits enrollments and dependents
          </p>
        </div>
        <EnrollmentListTable />
      </div>
    </div>
  );
}
