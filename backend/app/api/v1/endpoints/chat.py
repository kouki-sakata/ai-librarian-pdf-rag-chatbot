from typing import List, Literal, Optional, Union

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
    doc_id: str
    content: str
    chunk_id: str


class StreamMetadataChunk(BaseModel):
    type: Literal["metadata"] = "metadata"
    citations: Optional[List[StreamCitation]] = None
    empty: Optional[bool] = None


StreamChunk = Union[StreamTokenChunk, StreamMetadataChunk]


@router.post("/", response_model=StreamChunk)
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
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant ID missing")

    history = HistoryService()
    session_id = await history.create_session(tenant_id)
    return {"session_id": session_id}
