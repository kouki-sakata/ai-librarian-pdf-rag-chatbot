from typing import Any, Dict, List

from app.core.config import settings

# We need a supabase client. Since we haven't initialized a global one yet properly,
# we'll assume a simple client wrapper or use the library directly if configured.
# For now, we'll mock/stub it or use a placeholder if not fully integrated.
# But to make the test pass (which mocks 'app.services.history.supabase'), we need to import it.

# In a real app, we'd have a singleton Supabase client.
# Let's define a placeholder for now that the test mocks.
try:
    from supabase import Client, create_client

    supabase: Client = create_client(
        settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
    )
except ImportError:
    supabase = None  # For environments without supabase-py installed or configured


class HistoryService:
    async def create_session(self, tenant_id: str) -> str:
        """
        Creates a new chat session.
        """
        response = (
            supabase.table("chat_sessions").insert({"tenant_id": tenant_id}).execute()
        )
        return response.data[0]["id"]

    async def add_message(
        self, tenant_id: str, session_id: str, role: str, content: str
    ):
        """
        Adds a message to the session history.
        """
        supabase.table("chat_messages").insert(
            {
                "tenant_id": tenant_id,
                "session_id": session_id,
                "role": role,
                "content": content,
            }
        ).execute()

    async def get_history(
        self, tenant_id: str, session_id: str
    ) -> List[Dict[str, Any]]:
        """
        Retrieves chat history for a session.
        """
        response = (
            supabase.table("chat_messages")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return response.data
