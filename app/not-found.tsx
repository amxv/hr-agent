import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="font-semibold text-4xl text-foreground">404</h1>
            <h2 className="text-muted-foreground text-xl">Page Not Found</h2>
            <p className="max-w-md text-muted-foreground">
              The page you are looking for does not exist or has been moved.
            </p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
