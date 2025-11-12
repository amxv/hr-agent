"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Lock,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/react";
import { CaseUpdateForm } from "./case-update-form";

type HRCase = {
  id: string;
  caseId: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  assignedTeam: string;
  status: string;
  submittedBy?: string | null;
  createdAt: Date;
  updatedAt?: Date;
};

type CaseUpdate = {
  id: string;
  updateType: string;
  message: string;
  visibility: string;
  newStatus?: string | null;
  createdAt: Date;
  createdBy?: string;
};

type HRCaseDetailsDialogProps = {
  hrCase: HRCase;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function HRCaseDetailsDialog({
  hrCase,
  open,
  onClose,
  onSuccess,
}: HRCaseDetailsDialogProps) {
  const [timelineFilter, setTimelineFilter] = useState<string>("all");
  const trpc = useTRPC();

  // TODO: Backend caseUpdates router needs to be implemented
  const updatesData = { updates: [] };
  const refetch = () => Promise.resolve();

  // const { data: updatesData, refetch } = useQuery({
  //   ...trpc.admin.hr.caseUpdates.list.queryOptions({
  //     caseId: hrCase.id,
  //   }),
  //   enabled: open,
  // });

  const getUpdateIcon = (updateType: string) => {
    switch (updateType) {
      case "status_change":
        return <CheckCircle2 className="h-4 w-4" />;
      case "hr_response":
        return <MessageSquare className="h-4 w-4" />;
      case "internal_note":
        return <Lock className="h-4 w-4" />;
      case "system":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getUpdateColor = (updateType: string) => {
    switch (updateType) {
      case "status_change":
        return "text-green-600 dark:text-green-400";
      case "hr_response":
        return "text-blue-600 dark:text-blue-400";
      case "internal_note":
        return "text-yellow-600 dark:text-yellow-400";
      case "system":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  };

  const filterUpdates = (updates: CaseUpdate[]) => {
    switch (timelineFilter) {
      case "public":
        return updates.filter((u) => u.visibility === "public");
      case "internal":
        return updates.filter((u) => u.visibility === "internal");
      case "status_changes":
        return updates.filter((u) => u.updateType === "status_change");
      default:
        return updates;
    }
  };

  const filteredUpdates = updatesData?.updates
    ? filterUpdates(updatesData.updates)
    : [];

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Case Details: {hrCase.caseId}</DialogTitle>
          <DialogDescription>
            View complete case history and timeline
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* Case Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Case Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Case ID</p>
                  <p className="font-medium">{hrCase.caseId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="default">{hrCase.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="capitalize">{hrCase.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <Badge
                    variant={
                      hrCase.priority === "urgent"
                        ? "destructive"
                        : hrCase.priority === "high"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {hrCase.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned Team</p>
                  <p className="font-medium">{hrCase.assignedTeam}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {new Date(hrCase.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-muted-foreground">Title</p>
                <p className="font-medium">{hrCase.title}</p>
              </div>
              <div>
                <p className="mb-2 text-muted-foreground">Description</p>
                <p className="text-sm">{hrCase.description}</p>
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Case Timeline</h3>
                <Tabs
                  defaultValue="all"
                  onValueChange={setTimelineFilter}
                  value={timelineFilter}
                >
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="public">
                      <Eye className="mr-1 h-3 w-3" />
                      Public
                    </TabsTrigger>
                    <TabsTrigger value="internal">
                      <EyeOff className="mr-1 h-3 w-3" />
                      Internal
                    </TabsTrigger>
                    <TabsTrigger value="status_changes">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Status
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {filteredUpdates.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    No updates found for this filter
                  </p>
                </div>
              ) : (
                <div className="relative space-y-4 pl-6">
                  {/* Timeline line */}
                  <div className="absolute top-0 bottom-0 left-[11px] w-px bg-border" />

                  {filteredUpdates.map((update, index) => (
                    <div className="relative" key={update.id}>
                      {/* Timeline dot */}
                      <div
                        className={`-left-[23px] absolute top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-background ${getUpdateColor(update.updateType)}`}
                      >
                        {getUpdateIcon(update.updateType)}
                      </div>

                      {/* Update card */}
                      <div className="rounded-lg border bg-card p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                update.updateType === "status_change"
                                  ? "default"
                                  : update.updateType === "internal_note"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {update.updateType.replace("_", " ")}
                            </Badge>
                            {update.visibility === "internal" && (
                              <Badge variant="outline">
                                <Lock className="mr-1 h-3 w-3" />
                                Internal
                              </Badge>
                            )}
                          </div>
                          <div
                            className="text-muted-foreground text-xs"
                            title={new Date(update.createdAt).toLocaleString()}
                          >
                            {getTimeAgo(update.createdAt)}
                          </div>
                        </div>

                        <p className="text-sm">{update.message}</p>

                        {update.newStatus && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-xs">
                              Status changed to:{" "}
                              <Badge variant="outline">
                                {update.newStatus}
                              </Badge>
                            </p>
                          </div>
                        )}

                        {update.createdBy && (
                          <p className="mt-2 text-muted-foreground text-xs">
                            by {update.createdBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Add Update Form */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Add Update</h3>
              <CaseUpdateForm
                caseId={hrCase.id}
                onSuccess={() => {
                  void refetch();
                  onSuccess();
                }}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
