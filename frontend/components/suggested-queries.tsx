"use client";

import { Sparkles } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";

interface SuggestedQueriesProps {
  queries?: string[];
  onSelect: (query: string) => void;
  className?: string;
}

const defaultQueries = [
  "このドキュメントの要約を教えてください",
  "重要なポイントを3つ挙げてください",
  "具体的な手順を教えてください",
];

export const SuggestedQueries = memo(function SuggestedQueries({
  queries = defaultQueries,
  onSelect,
  className,
}: SuggestedQueriesProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-8 animate-fade-in", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className="size-5" />
        <span className="text-sm font-medium">サンプル質問</span>
      </div>
      <div className="grid grid-cols-1 gap-3 w-full max-w-2xl px-4">
        {queries.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onSelect(query)}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 text-left text-sm transition-all hover:border-primary/50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative text-card-foreground">{query}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
