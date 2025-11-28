import { AlertCircle, Copy } from "lucide-react";
import { memo, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Message } from "@/types";
import { Button } from "./ui/button";

interface ChatMessageProps {
  role: Message["role"];
  content: string;
  citations?: Message["citations"];
  isEmptyResult?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  citations,
  isEmptyResult,
}: ChatMessageProps) {
  const markdownComponents = useMemo<Components>(
    () => ({
      pre: ({ node, ...props }) => (
        <div className="overflow-auto w-full my-2 bg-black/10 p-2 rounded-lg">
          <pre {...props} />
        </div>
      ),
      code: ({ node, ...props }) => <code className="bg-black/10 rounded-md px-1" {...props} />,
      a: ({ href, children, ...props }) => {
        const safeHref = (() => {
          if (!href) return undefined;
          const normalized = href.trim().toLowerCase();
          if (
            normalized.startsWith("http://") ||
            normalized.startsWith("https://") ||
            normalized.startsWith("/")
          ) {
            return href;
          }
          return undefined;
        })();

        return (
          <a
            href={safeHref}
            rel="noreferrer noopener"
            target="_blank"
            className="text-primary underline underline-offset-2"
            {...props}
          >
            {children}
          </a>
        );
      },
    }),
    []
  );

  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("コピーしました", {
        description: "メッセージをクリップボードにコピーしました",
        duration: 2000,
      });
    } catch (_error) {
      toast.error("コピーに失敗しました", {
        description: "もう一度お試しください",
        duration: 2000,
      });
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover events required for copy button functionality
    <div
      className={cn(
        "flex w-full mb-4 animate-slide-in-bottom",
        role === "user" ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative group max-w-[85%]">
        <div
          className={cn(
            "rounded-xl px-4 py-3",
            role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/80 text-foreground border border-border/50"
          )}
        >
          {role === "assistant" ? (
            <div className="prose dark:prose-invert prose-base max-w-none break-words leading-relaxed">
              {isEmptyResult ? (
                <div className="flex items-start gap-2 text-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">関連する文書が見つかりませんでした</div>
                    <div className="text-muted-foreground text-xs">
                      質問を言い換えるか、別のキーワードでお試しください。
                    </div>
                  </div>
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={markdownComponents}>
                  {content}
                </ReactMarkdown>
              )}
              {citations && citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground space-y-1.5">
                  <div className="font-semibold text-foreground/80">出典</div>
                  <ul className="space-y-1">
                    {citations.map((c, idx) => (
                      <li key={`${c.source}-${idx}`} className="flex items-center gap-1">
                        {c.doc_id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const apiUrl =
                                  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                                const url = `${apiUrl}/api/v1/documents/${
                                  c.doc_id
                                }/url${c.page ? `?page=${c.page}` : ""}`;
                                const response = await fetch(url);
                                if (response.ok) {
                                  const data = await response.json();
                                  window.open(data.url, "_blank");
                                }
                              } catch (error) {
                                console.error("Failed to open document", error);
                              }
                            }}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {c.source}
                            {c.page ? ` p.${c.page}` : ""}
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <title>Open document</title>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </button>
                        ) : (
                          <span>
                            {c.source}
                            {c.page ? ` p.${c.page}` : ""}
                          </span>
                        )}
                        {typeof c.similarity === "number"
                          ? ` (score: ${c.similarity.toFixed(2)})`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</div>
          )}
        </div>
        {/* Copy button with fade-in on hover */}
        {isHovered && role === "assistant" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="absolute -top-2 -right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border shadow-sm"
            aria-label="メッセージをコピー"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
});
