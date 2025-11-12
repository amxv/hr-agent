import type { Metadata } from "next";
import { EmployeeListTable } from "@/components/admin/employee-list-table";

export const metadata: Metadata = {
  title: "Employee Directory",
  description: "Manage employee information and profiles",
};

export default function EmployeeDirectoryPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-neutral-700 bg-clip-text pt-4 pb-2 font-medium text-4xl text-transparent tracking-tight lg:text-3xl">
            Employee Directory
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage employee information, job details, and organizational
            structure
          </p>
        </div>
        <EmployeeListTable />
      </div>
    </div>
  );
}
