import { ChatInterface } from "@/components/chat-interface";
import { Toaster } from "@/components/ui/sonner";
import { UploadForm } from "@/components/upload-form";

export default function Home() {
  return (
    <main data-testid="main-shell" className="min-h-[calc(100vh-4rem)] bg-background">
      <div
        data-testid="content-grid"
        className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px,1fr] lg:px-8"
      >
        <div className="flex flex-col gap-4">
          <UploadForm />
        </div>
        <ChatInterface />
      </div>
      <Toaster />
    </main>
  );
}
