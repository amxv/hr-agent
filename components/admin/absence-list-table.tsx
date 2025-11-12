"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/react";
import { AbsenceActions } from "./absence-actions";
import { CreateAbsenceDialog } from "./create-absence-dialog";

const absenceTypeColors = {
  vacation: "default" as const,
  sick: "destructive" as const,
  personal: "secondary" as const,
  other: "outline" as const,
};

export function AbsenceListTable() {
  const trpc = useTRPC();

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.admin.hr.absences.list.queryOptions({}),
  });

  const invalidate = () => {
    void refetch();
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Approved Absences</CardTitle>
          <CardDescription>{data?.total ?? 0} total absences</CardDescription>
        </div>
        <CreateAbsenceDialog onSuccess={invalidate}>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            Add Absence
          </Button>
        </CreateAbsenceDialog>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {error && <div>Error loading absences: {error.message}</div>}

        {data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.absences.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={6}>
                    No absences found
                  </TableCell>
                </TableRow>
              ) : (
                data.absences.map((absence) => (
                  <TableRow key={absence.absence.id}>
                    <TableCell className="font-medium">
                      {absence.employee.fullName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          absenceTypeColors[
                            absence.absence
                              .absenceType as keyof typeof absenceTypeColors
                          ] || "outline"
                        }
                      >
                        {absence.absence.absenceType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(absence.absence.startDate)}
                    </TableCell>
                    <TableCell>{formatDate(absence.absence.endDate)}</TableCell>
                    <TableCell>{absence.absence.totalDays} days</TableCell>
                    <TableCell>
                      <AbsenceActions
                        absence={absence}
                        onSuccess={invalidate}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
