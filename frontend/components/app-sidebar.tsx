"use client";

import { FileText, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import { DocumentList } from "@/components/document-list";
import { HistorySidebarContent } from "@/components/history-sidebar-content";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "@/contexts/session-context";

type Tab = "history" | "documents";

export function AppSidebar() {
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const { setSessionId } = useSession();

  const handleNewChat = () => {
    setSessionId(null);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleNewChat}>
              <Plus className="mr-2 h-4 w-4" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "documents"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Documents</span>
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {activeTab === "history" ? <HistorySidebarContent /> : <DocumentList />}
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
