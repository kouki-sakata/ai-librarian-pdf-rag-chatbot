import { AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Message } from "@/types";

interface ChatMessageProps {
  role: Message["role"];
  content: string;
  citations?: Message["citations"];
  isEmptyResult?: boolean;
}

export function ChatMessage({ role, content, citations, isEmptyResult }: ChatMessageProps) {
  return (
    <div className={cn("flex w-full mb-4", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 text-sm",
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground border border-border"
        )}
      >
        {role === "assistant" ? (
          <div className="prose dark:prose-invert prose-sm max-w-none break-words">
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ node, ...props }) => (
                    <div className="overflow-auto w-full my-2 bg-black/10 p-2 rounded-lg">
                      <pre {...props} />
                    </div>
                  ),
                  code: ({ node, ...props }) => (
                    <code className="bg-black/10 rounded-md px-1" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            )}
            {citations && citations.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground">出典</div>
                <ul className="list-disc list-inside space-y-0.5">
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
          <div className="whitespace-pre-wrap break-words">{content}</div>
        )}
      </div>
    </div>
  );
}
