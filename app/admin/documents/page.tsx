import { DocumentListTable } from "@/components/admin/document-list-table";

export default function AdminDocumentsPage() {
  return (
    <div className="container h-[calc(100vh-5rem)]">
      <div className="flex flex-col gap-8 p-2 md:px-8 md:py-4 h-full">
        <div>
          <h1 className="text-4xl lg:text-3xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-neutral-700 pb-2 pt-4">
            Document Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Upload and manage documents for semantic search in the AI chat
          </p>
        </div>
        <DocumentListTable />
      </div>
    </div>
  );
}
