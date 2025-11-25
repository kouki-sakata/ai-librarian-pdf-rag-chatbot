"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "@/contexts/session-context";

interface Session {
  id: string;
  title: string;
  updated_at: string;
}

export function HistorySidebar() {
  const { sessionId, setSessionId } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSessions = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/chat/sessions?limit=20&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setSessions(data.items || []);
        } else {
          setSessions((prev) => [...prev, ...(data.items || [])]);
        }
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions(0);
  }, [fetchSessions]);

  const handleLoadMore = () => {
    fetchSessions(sessions.length);
  };

  const handleNewChat = () => {
    setSessionId(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/v1/chat/sessions/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== deleteId));
        if (sessionId === deleteId) {
          setSessionId(null);
        }
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete session", error);
    }
  };

  return (
    <>
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
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>History</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      isActive={sessionId === session.id}
                      onClick={() => setSessionId(session.id)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span className="truncate">{session.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(session.id);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {sessions.length < total && (
            <div className="p-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </SidebarContent>
        <SidebarFooter></SidebarFooter>
      </Sidebar>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
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
