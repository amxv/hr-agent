import type { Metadata } from "next";
import { BenefitsPlanListTable } from "@/components/admin/benefits-plan-list-table";

export const metadata: Metadata = {
  title: "Benefits Plans",
  description: "Manage benefits plans and coverage options",
};

export default function BenefitsPlansPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-neutral-700 bg-clip-text pt-4 pb-2 font-medium text-4xl text-transparent tracking-tight lg:text-3xl">
            Benefits Plans
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage benefits plan options including medical, dental, vision,
            retirement, and HSA/FSA plans
          </p>
        </div>
        <BenefitsPlanListTable />
      </div>
    </div>
  );
}
