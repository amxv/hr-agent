"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/react";
import { CreateUserDialog } from "./create-user-dialog";
import { UserActions } from "./user-actions";

export function UserListTable() {
  const [searchValue, setSearchValue] = useState("");
  const [refetchKey, setRefetchKey] = useState(0);
  const trpc = useTRPC();

  const listUsersQuery = trpc.admin.listUsers.useQuery as any;
  const { data, isLoading, error } = listUsersQuery({
    searchValue: searchValue || undefined,
    searchField: "email" as const,
    limit: 50,
    offset: 0,
  });

  const invalidate = () => {
    setRefetchKey((prev) => prev + 1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>{data?.total ?? 0} total users</CardDescription>
        </div>
        <CreateUserDialog onSuccess={invalidate}>
          <Button>Add User</Button>
        </CreateUserDialog>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Input
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by email..."
            type="search"
            value={searchValue}
          />
        </div>

        {isLoading && <div>Loading users...</div>}

        {error && <div>Error loading users: {error.message}</div>}

        {data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map(
                (user: {
                  id: string;
                  email: string;
                  name: string;
                  role: "admin" | "user";
                  status: "active" | "inactive";
                  createdAt: Date;
                  banned: boolean;
                  banReason: string | null;
                }) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "active" ? "default" : "destructive"
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <UserActions onSuccess={invalidate} user={user} />
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
