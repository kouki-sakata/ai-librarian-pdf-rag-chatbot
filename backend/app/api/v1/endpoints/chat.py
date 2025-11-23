from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.context import tenant_id_context
from app.services.chat import ChatService
from app.services.history import HistoryService

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    query: str


class StreamTokenChunk(BaseModel):
    type: Literal["token"] = "token"
    content: str


class StreamCitation(BaseModel):
    source: str
    doc_id: str | None = None
    page: int | None = None
    similarity: float | None = None
    content: str | None = None
    chunk_id: str | None = None


class StreamMetadataChunk(BaseModel):
    type: Literal["metadata"] = "metadata"
    citations: list[StreamCitation] | None = None
    results: int | None = None
    empty: bool | None = None


StreamChunk = StreamTokenChunk | StreamMetadataChunk


@router.post("/", response_model=StreamChunk)
async def chat_endpoint(request: ChatRequest) -> StreamingResponse:
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant ID missing")

    service = ChatService()

    async def stream_generator() -> AsyncGenerator[str, None]:
        async for chunk in service.generate_response(tenant_id, request.session_id, request.query):
            yield chunk

    return StreamingResponse(stream_generator(), media_type="application/x-ndjson; charset=utf-8")


@router.post("/sessions")
async def create_session() -> dict[str, str]:
    # TODO: Implement session creation logic (DB insert)
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant ID missing")

    history = HistoryService()
    session_id = await history.create_session(tenant_id)
    return {"session_id": session_id}
