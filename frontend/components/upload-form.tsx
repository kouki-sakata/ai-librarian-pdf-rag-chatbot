"use client"

import { useState } from "react"
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [docId, setDocId] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== "application/pdf") {
        toast.error("PDFファイルのみアップロード可能です")
        return
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("ファイルサイズは50MB以下にしてください")
        return
      }
      setFile(selectedFile)
      setDocId(null)
      setProgress(0)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(10) // Start progress

    const formData = new FormData()
    formData.append("file", file)

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // TODO: Replace with actual API call
      // const response = await fetch("/api/v1/upload", {
      //   method: "POST",
      //   body: formData,
      //   headers: {
      //     "Authorization": `Bearer ${token}` // Need auth token
      //   }
      // })
      
      // Mocking API call for UI dev
      await new Promise(resolve => setTimeout(resolve, 2000))
      clearInterval(interval)
      setProgress(100)
      
      setDocId("mock-doc-id")
      toast.success("アップロードが完了しました")
      
    } catch (error) {
      toast.error("アップロードに失敗しました")
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>ドキュメントアップロード</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="pdf-upload">PDFファイル</Label>
          <Input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} disabled={uploading} />
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <File className="h-4 w-4" />
            <span className="truncate">{file.name}</span>
            <span className="ml-auto">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-center text-muted-foreground">アップロード中... {progress}%</p>
          </div>
        )}

        {docId && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="h-4 w-4" />
            <span>アップロード完了 (ID: {docId})</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              アップロード中
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              アップロード
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
