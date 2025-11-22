from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.context import tenant_id_context
from app.services.chat import ChatService

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    query: str


@router.post("/")
async def chat_endpoint(request: ChatRequest):
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant ID missing")

    service = ChatService()

    async def stream_generator():
        async for chunk in service.generate_response(
            tenant_id, request.session_id, request.query
        ):
            yield chunk

    return StreamingResponse(
        stream_generator(), media_type="application/x-ndjson; charset=utf-8"
    )


@router.post("/sessions")
async def create_session():
    # TODO: Implement session creation logic (DB insert)
    # For now, just return a mock session ID
    import uuid

    return {"session_id": str(uuid.uuid4())}
