import { UserListTable } from "@/components/admin/user-list-table";

export default function AdminUsersPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl">User Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>
      <UserListTable />
    </div>
  );
}
