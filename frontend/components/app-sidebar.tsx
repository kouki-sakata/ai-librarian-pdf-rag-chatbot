"use client";

import type { User } from "@supabase/supabase-js";
import { FileText, Info, LogOut, MessageSquare, Plus, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DocumentList } from "@/components/document-list";
import { HistorySidebarContent } from "@/components/history-sidebar-content";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/contexts/session-context";
import { createClient } from "@/lib/supabase/client";

type Tab = "history" | "documents";

export function AppSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { setSessionId } = useSession();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleNewChat = () => {
    setSessionId(null);
  };

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error("ログアウトに失敗しました", { description: error.message });
        return;
      }

      setSessionId(null);
      toast.success("ログアウトしました");
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="space-y-4 pt-4">
        {/* App Title with Info */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-lg font-bold text-foreground">AI Librarian</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="システム情報"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="right">
              <p className="font-semibold mb-1">📚 AI Librarian</p>
              <p className="text-xs mb-2">
                PDFドキュメントをアップロードして、AIに質問できるRAGチャットボットです。
              </p>
              <p className="text-xs text-muted-foreground">
                RAG（Retrieval-Augmented
                Generation）技術により、アップロードされた文書の内容に基づいて正確な回答を生成します。
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleNewChat}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground justify-center py-6 shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus className="mr-2 h-5 w-5" />
              <span className="font-semibold text-base">New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Tabs - Segmented Control Style */}
        <div className="grid grid-cols-2 p-1 bg-muted/50 rounded-lg border">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === "documents"
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Documents</span>
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {activeTab === "history" ? <HistorySidebarContent /> : <DocumentList />}
      </SidebarContent>

      <SidebarFooter className="border-t p-3 bg-muted/10">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2 text-sm text-foreground/80 rounded-md bg-background border shadow-sm overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium text-xs text-muted-foreground">
                Logged in as
              </span>
              <span className="truncate font-medium" title={user.email}>
                {user.email}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          disabled={isSigningOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isSigningOut ? "ログアウト中..." : "ログアウト"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
