from typing import TYPE_CHECKING, Any, cast

from app.core.supabase_client import get_supabase_client

if TYPE_CHECKING:
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
