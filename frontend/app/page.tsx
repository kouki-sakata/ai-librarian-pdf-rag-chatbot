import { UploadForm } from "@/components/upload-form"
import { Toaster } from "@/components/ui/sonner"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex lg:flex-col gap-8">
        <h1 className="text-4xl font-bold text-center mb-8">AI Librarian</h1>
        <UploadForm />
      </div>
      <Toaster />
    </main>
  )
}
