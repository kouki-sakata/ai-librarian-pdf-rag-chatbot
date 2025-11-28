import { memo } from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export const TypingIndicator = memo(function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex w-full mb-4 justify-start", className)}>
      <div className="max-w-[85%] rounded-xl px-4 py-3 bg-muted/80 text-foreground border border-border/50">
        <div className="flex items-center gap-1">
          <div className="typing-dot size-2 rounded-full bg-current" />
          <div className="typing-dot size-2 rounded-full bg-current" />
          <div className="typing-dot size-2 rounded-full bg-current" />
        </div>
      </div>
    </div>
  );
});
