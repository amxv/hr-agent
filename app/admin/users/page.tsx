import { UserListTable } from "@/components/admin/user-list-table";

export default function AdminUsersPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex h-full flex-col gap-8 p-2 md:px-8 md:py-4">
        <div>
          <h1 className="bg-gradient-to-r from-foreground to-neutral-700 bg-clip-text pt-4 pb-2 font-medium text-4xl text-transparent tracking-tight lg:text-3xl">
            User Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <UserListTable />
      </div>
    </div>
  );
}
