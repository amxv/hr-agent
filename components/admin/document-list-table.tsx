"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { useTRPC, useTRPCClient } from "@/trpc/react";
import { DocumentActions } from "./document-actions";
import { DocumentStatusBadge } from "./document-status-badge";
import { UploadDocumentDialog } from "./upload-document-dialog";

export function DocumentListTable() {
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    ...trpc.admin.documents.list.queryOptions({
      searchTerm: searchValue || undefined,
      limit: 50,
      offset: 0,
    }),
  });

  const invalidate = async () => {
    // Invalidate all document queries (list and tags) to ensure UI updates
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[];
        // tRPC query keys are arrays like: [["admin", "documents", "list"], {...}]
        if (Array.isArray(queryKey) && queryKey.length > 0) {
          const path = queryKey[0] as string[];
          return (
            Array.isArray(path) &&
            path[0] === "admin" &&
            path[1] === "documents"
          );
        }
        return false;
      },
    });
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await trpcClient.admin.documents.refreshStatus.mutate();
      toast.success("Status refreshed");
      invalidate();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to refresh status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Documents</CardTitle>
          <CardDescription>{data?.total ?? 0} total documents</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={isRefreshing}
            onClick={handleRefreshStatus}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh Status
          </Button>
          <UploadDocumentDialog onSuccess={invalidate}>
            <Button>Upload Document</Button>
          </UploadDocumentDialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Input
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by filename..."
            type="search"
            value={searchValue}
          />
        </div>

        {isLoading && <div>Loading documents...</div>}

        {error && <div>Error loading documents: {error.message}</div>}

        {data && data.documents.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No documents found. Upload your first document to get started.
          </div>
        )}

        {data && data.documents.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.filename}</TableCell>
                  <TableCell>
                    <DocumentStatusBadge
                      errorMessage={doc.errorMessage}
                      status={doc.status}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags && doc.tags.length > 0 ? (
                        doc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No tags
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                  <TableCell>
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DocumentActions
                      document={doc}
                      onDelete={invalidate}
                      onTagsUpdate={invalidate}
                      onUpdate={invalidate}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
