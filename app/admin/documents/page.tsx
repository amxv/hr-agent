import { DocumentListTable } from "@/components/admin/document-list-table";

export default function AdminDocumentsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl">Document Management</h1>
        <p className="mt-2 text-muted-foreground">
          Upload and manage documents for semantic search in the AI chat
        </p>
      </div>
      <DocumentListTable />
    </div>
  );
}
