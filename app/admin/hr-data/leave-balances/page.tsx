import type { Metadata } from "next";
import { BlackoutDatesManager } from "@/components/admin/blackout-dates-manager";
import { LeaveBalanceListTable } from "@/components/admin/leave-balance-list-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Leave Balances",
  description: "Manage employee leave balances and blackout dates",
};

export default function LeaveBalancesPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-neutral-700 bg-clip-text pt-4 pb-2 font-medium text-4xl text-transparent tracking-tight lg:text-3xl">
            Leave Balances
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage employee leave balances and department blackout dates
          </p>
        </div>

        <Tabs className="flex-1" defaultValue="balances">
          <TabsList>
            <TabsTrigger value="balances">Leave Balances</TabsTrigger>
            <TabsTrigger value="blackout">Blackout Dates</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-6" value="balances">
            <LeaveBalanceListTable />
          </TabsContent>
          <TabsContent className="mt-6" value="blackout">
            <BlackoutDatesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
