"use client";

import { FileText } from "lucide-react";
import { memo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CitationPreviewProps {
  source: string;
  page?: number;
  similarity?: number;
  snippet?: string;
}

export const CitationPreview = memo(function CitationPreview({
  source,
  page,
  similarity,
  snippet,
}: CitationPreviewProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-primary hover:underline transition-colors"
        >
          <FileText className="h-3 w-3" />
          <span>
            {source}
            {page ? ` p.${page}` : ""}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 animate-fade-in" side="top" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-foreground">{source}</h4>
            {similarity !== undefined && (
              <span className="text-xs text-muted-foreground">
                関連度: {Math.round(similarity * 100)}%
              </span>
            )}
          </div>
          {page && <p className="text-xs text-muted-foreground">ページ: {page}</p>}
          {snippet && (
            <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border/50">
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">{snippet}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">クリックして文書を開く</p>
        </div>
      </PopoverContent>
    </Popover>
  );
});
