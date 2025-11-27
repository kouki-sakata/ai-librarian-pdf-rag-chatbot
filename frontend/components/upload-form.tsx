"use client";

import {
  AlertCircle,
  CheckCircle,
  File as FileIcon,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { getUploadErrorMessage } from "@/lib/error-messages";
import { createClient } from "@/lib/supabase/client";
import { UploadResponse } from "@/types";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [docId, setDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setDocId(null);
      setProgress(0);
      setError(null);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setDocId(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    }, 120000); // 120 seconds timeout (2 minutes)

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

      // Supabaseセッションからアクセストークンを取得
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("認証が必要です。ログインしてください。");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/upload/`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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
        errorMessage = "アップロードがタイムアウトしました（2分）。もう一度お試しください。";
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
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="pdf">PDFファイル</Label>
            {/* 隠しファイルインプット */}
            <input
              ref={fileInputRef}
              id="pdf"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="sr-only"
            />

            {file ? (
              /* ファイル選択済みの表示 */
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={isUploading}
                  className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                  aria-label="ファイルを削除"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              /* ファイル未選択時のドロップエリア */
              <label
                htmlFor="pdf"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">クリックしてPDFを選択</span>
              </label>
            )}
          </div>

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
