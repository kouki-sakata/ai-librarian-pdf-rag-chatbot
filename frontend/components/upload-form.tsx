"use client";

import { AlertCircle, CheckCircle, File, Loader2, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { getUploadErrorMessage } from "@/lib/error-messages";
import { UploadResponse } from "@/types";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [docId, setDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setDocId(null);
      setProgress(0);
      setError(null);
    }
  };

  const performUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000); // 30 seconds timeout

    // Declare interval outside try block so it can be cleaned up in finally
    let interval: ReturnType<typeof setInterval> | null = null;

    try {
      // Simulate progress
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            if (interval) clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/upload/`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || getUploadErrorMessage(res);
        throw new Error(errorMessage);
      }

      const data: UploadResponse = await res.json();
      setDocId(data.doc_id);
      setProgress(100);

      toast.success("アップロード完了", {
        description: `${data.filename} の処理が完了しました`,
        duration: 2000,
      });
    } catch (error) {
      let errorMessage: string;

      // Check if it's an AbortError (timeout)
      if (error instanceof DOMException && error.name === "AbortError") {
        errorMessage = "アップロードがタイムアウトしました（30秒）。もう一度お試しください。";
      } else {
        errorMessage = getUploadErrorMessage(error);
      }

      setError(errorMessage);

      toast.error("アップロード失敗", {
        description: errorMessage,
        duration: 3000,
      });
    } finally {
      // Clean up both timers in finally block to ensure cleanup happens always
      clearTimeout(timeoutId);
      if (interval) clearInterval(interval);
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await performUpload();
  };

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    if (file) {
      void performUpload();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>ドキュメントアップロード</CardTitle>
        <CardDescription>
          PDFファイルをアップロードして、AIに質問しましょう (最大 50MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="pdf">PDFファイル</Label>
            <Input
              id="pdf"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              <span className="truncate">{file.name}</span>
              <span className="ml-auto">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-2"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  再試行
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                アップロード中... {progress}%
              </p>
            </div>
          )}

          {docId && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle className="h-4 w-4" />
              <span>アップロード完了 (ID: {docId})</span>
            </div>
          )}

          <Button type="submit" disabled={!file || isUploading} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                アップロード
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
