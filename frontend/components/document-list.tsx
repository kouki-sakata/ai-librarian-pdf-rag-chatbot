"use client";

import { File, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Document {
  id: string;
  filename: string;
  file_size: number;
  created_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/documents?sort=created_at&order=desc`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/documents/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== deleteId));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete document", error);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {!loading && documents.length === 0 && (
            <div className="text-sm text-muted-foreground">No documents yet</div>
          )}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <File className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{doc.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteId(doc.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This will also remove all associated
              vector embeddings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
