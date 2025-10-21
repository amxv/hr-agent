"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTRPCClient } from "@/trpc/react";
import { EditUserDialog } from "./edit-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

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

type UserActionsProps = {
  user: AdminUserListItem;
  onSuccess: () => void;
};

export function UserActions({ user, onSuccess }: UserActionsProps) {
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const trpcClient = useTRPCClient();

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await trpcClient.admin.deactivateUser.mutate({ userId: user.id });
      toast.success("User deactivated successfully!");
      onSuccess();
      setDeactivateOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to deactivate user");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await trpcClient.admin.reactivateUser.mutate({ userId: user.id });
      toast.success("User reactivated successfully!");
      onSuccess();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to reactivate user");
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <EditUserDialog onSuccess={onSuccess} user={user}>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </EditUserDialog>

      <ResetPasswordDialog onSuccess={onSuccess} user={user}>
        <Button size="sm" variant="outline">
          Reset Password
        </Button>
      </ResetPasswordDialog>

      {user.status === "active" ? (
        <AlertDialog onOpenChange={setDeactivateOpen} open={deactivateOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              Deactivate
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
              <AlertDialogDescription>
                This user will no longer be able to log in. Their data will be
                retained.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeactivating}
                onClick={handleDeactivate}
              >
                {isDeactivating ? "Deactivating..." : "Deactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          disabled={isReactivating}
          onClick={handleReactivate}
          size="sm"
          variant="default"
        >
          {isReactivating ? "Reactivating..." : "Reactivate"}
        </Button>
      )}
    </div>
  );
}
