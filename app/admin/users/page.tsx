import { UserListTable } from "@/components/admin/user-list-table";

export default function AdminUsersPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex flex-col gap-8 p-2 md:px-8 md:py-4 h-full">
        <div>
          <h1 className="text-4xl lg:text-3xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-neutral-700 pb-2 pt-4">
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
