"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTRPCClient } from "@/trpc/react";

const caseUpdateSchema = z.object({
  updateType: z.enum(["hr_response", "internal_note", "status_change"]),
  message: z.string().min(1, "Message is required"),
  visibility: z.enum(["public", "internal"]).optional(),
  newStatus: z
    .enum(["open", "in_progress", "pending_info", "resolved", "closed"])
    .optional(),
});

type CaseUpdateFormValues = z.infer<typeof caseUpdateSchema>;

type CaseUpdateFormProps = {
  caseId: string;
  onSuccess: () => void;
};

export function CaseUpdateForm({ caseId, onSuccess }: CaseUpdateFormProps) {
  const trpcClient = useTRPCClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CaseUpdateFormValues>({
    resolver: zodResolver(caseUpdateSchema),
    defaultValues: {
      updateType: "hr_response",
      message: "",
      visibility: "public",
      newStatus: undefined,
    },
  });

  const updateType = form.watch("updateType");

  const onSubmit = async (values: CaseUpdateFormValues) => {
    // Validate that status change has a new status
    if (values.updateType === "status_change" && !values.newStatus) {
      form.setError("newStatus", {
        message: "New status is required for status changes",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Backend caseUpdates router needs to be implemented
      // await trpcClient.admin.hr.caseUpdates.create.mutate({
      //   caseId,
      //   updateType: values.updateType,
      //   message: values.message,
      //   visibility:
      //     values.updateType === "status_change"
      //       ? "internal"
      //       : values.visibility || "public",
      //   newStatus: values.newStatus,
      // });

      toast.success(
        "Case update added successfully! (Note: Backend integration pending)"
      );
      form.reset();
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to add case update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="updateType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Update Type <span className="text-destructive">*</span>
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // Reset dependent fields when type changes
                  if (value === "status_change") {
                    form.setValue("visibility", "internal");
                    form.setValue("newStatus", undefined);
                  } else {
                    form.setValue("visibility", "public");
                    form.setValue("newStatus", undefined);
                  }
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hr_response">HR Response</SelectItem>
                  <SelectItem value="internal_note">Internal Note</SelectItem>
                  <SelectItem value="status_change">Status Change</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Message <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    updateType === "status_change"
                      ? "Explain the reason for the status change"
                      : updateType === "internal_note"
                        ? "Add an internal note (not visible to employee)"
                        : "Add a response or update"
                  }
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {updateType !== "status_change" && (
          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibility</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="public">
                      Public (Visible to employee)
                    </SelectItem>
                    <SelectItem value="internal">Internal (HR only)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {updateType === "status_change" && (
          <FormField
            control={form.control}
            name="newStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  New Status <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending_info">Pending Info</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Adding Update..." : "Add Update"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
