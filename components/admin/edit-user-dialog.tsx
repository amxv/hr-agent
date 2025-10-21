"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTRPCClient } from "@/trpc/react";

const editUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

type AdminUserListItem = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  status: "active" | "inactive";
  createdAt: Date;
  banned: boolean;
  banReason: string | null;
};

type EditUserDialogProps = {
  user: AdminUserListItem;
  children: React.ReactNode;
  onSuccess: () => void;
};

export function EditUserDialog({
  user,
  children,
  onSuccess,
}: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const trpcClient = useTRPCClient();

  const form = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: user.email,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: z.infer<typeof editUserSchema>) => {
    setIsSubmitting(true);
    try {
      await trpcClient.admin.updateUser.mutate({
        userId: user.id,
        email: values.email,
      });
      toast.success("User updated successfully!");
      onSuccess();
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes("email")) {
        form.setError("email", { message: "Email already exists" });
      } else {
        toast.error(err.message || "Failed to update user");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update email address for {user.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
