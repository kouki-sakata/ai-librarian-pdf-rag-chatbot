from typing import TYPE_CHECKING, Any, cast

from app.core.supabase_client import get_supabase_client

if TYPE_CHECKING:
    from postgrest import CountMethod
    from supabase import Client

# Module-level client placeholder to ease patching in tests
supabase: "Client | None" = None


def _get_client() -> "Client":
    global supabase
    if supabase is None:
        supabase = get_supabase_client()
    return supabase


class HistoryService:
    async def create_session(self, tenant_id: str) -> str:
        """
        Creates a new chat session.
        """
        client = _get_client()
        response = client.table("chat_sessions").insert({"tenant_id": tenant_id}).execute()
        data = cast(list[dict[str, Any]], response.data)
        return str(data[0]["id"])

    async def add_message(self, tenant_id: str, session_id: str, role: str, content: str) -> None:
        """
        Adds a message to the session history.
        """
        client = _get_client()
        client.table("chat_messages").insert(
            {
                "tenant_id": tenant_id,
                "session_id": session_id,
                "role": role,
                "content": content,
            }
        ).execute()

    async def get_history(self, tenant_id: str, session_id: str) -> list[dict[str, Any]]:
        """
        Retrieves chat history for a session.
        """
        client = _get_client()
        response = (
            client.table("chat_messages")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return cast(list[dict[str, Any]], response.data)

    async def list_sessions(
        self, tenant_id: str, limit: int = 20, offset: int = 0
    ) -> dict[str, Any]:
        """
        Lists chat sessions for a tenant with pagination.
        Returns sessions with generated titles from first user message.
        """
        client = _get_client()

        # Get sessions for tenant
        response = (
            client.table("chat_sessions")
            .select("*")
            .eq("tenant_id", tenant_id)
            .order("updated_at", desc=True)
            .limit(limit)
            .range(offset, offset + limit - 1)
            .execute()
        )

        sessions = cast(list[dict[str, Any]], response.data)

        # Get total count
        count_response = (
            client.table("chat_sessions")
            .select("id", count=cast("CountMethod", "exact"))
            .eq("tenant_id", tenant_id)
            .execute()
        )
        total = count_response.count or 0

        # Generate titles for each session from first user message
        items = []
        for session in sessions:
            # Fetch first user message
            msg_response = (
                client.table("chat_messages")
                .select("content")
                .eq("tenant_id", tenant_id)
                .eq("session_id", session["id"])
                .eq("role", "user")
                .order("created_at")
                .limit(1)
                .execute()
            )

            messages = cast(list[dict[str, Any]], msg_response.data)
            title = "New Chat"
            if messages and messages[0].get("content"):
                # Truncate to 30 characters including ellipsis
                content = messages[0]["content"]
                if len(content) > 30:
                    title = content[:27] + "..."
                else:
                    title = content

            items.append(
                {
                    "id": session["id"],
                    "title": title,
                    "updated_at": session.get("updated_at"),
                    "created_at": session.get("created_at"),
                }
            )

        return {"items": items, "total": total}

    async def delete_session(self, tenant_id: str, session_id: str) -> None:
        """
        Deletes a chat session and all its messages.
        Raises ValueError if session not found or doesn't belong to tenant.
        """
        client = _get_client()

        # Verify session exists and belongs to tenant
        session_response = (
            client.table("chat_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )

        if not session_response.data:
            raise ValueError("Session not found or access denied")

        # Delete messages first (foreign key constraint)
        client.table("chat_messages").delete().eq("session_id", session_id).eq(
            "tenant_id", tenant_id
        ).execute()

        # Delete session
        client.table("chat_sessions").delete().eq("id", session_id).execute()
