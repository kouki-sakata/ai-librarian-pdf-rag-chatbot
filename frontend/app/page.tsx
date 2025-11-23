import { ChatInterface } from "@/components/chat-interface";
import { Toaster } from "@/components/ui/sonner";
import { UploadForm } from "@/components/upload-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-start justify-between font-mono text-sm lg:flex gap-8">
        <div className="w-full lg:w-1/3">
          <UploadForm />
        </div>
        <div className="w-full lg:w-2/3 mt-8 lg:mt-0">
          <ChatInterface />
        </div>
      </div>
      <Toaster />
    </main>
  );
}
