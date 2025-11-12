import type { Metadata } from "next";
import { AbsenceListTable } from "@/components/admin/absence-list-table";
import { LeaveRequestListTable } from "@/components/admin/leave-request-list-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Team Availability",
  description: "Manage team absences and leave requests",
};

export default function TeamAvailabilityPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-neutral-700 bg-clip-text pt-4 pb-2 font-medium text-4xl text-transparent tracking-tight lg:text-3xl">
            Team Availability
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage approved absences and pending leave requests
          </p>
        </div>

        <Tabs className="flex-1" defaultValue="absences">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="absences">Approved Absences</TabsTrigger>
            <TabsTrigger value="requests">Pending Requests</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6" value="absences">
            <AbsenceListTable />
          </TabsContent>

          <TabsContent className="mt-6" value="requests">
            <LeaveRequestListTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
