# Requirements Document

## Introduction
本プロジェクトは、PDFを登録したナレッジベースに対して自然言語で質問できるAI司書（RAGチャットボット）を提供する。ユーザーはPDFをアップロードし、資料内容に基づく回答を得ることを主目的とする。

## Requirements

### Requirement 1: 文書アップロードと取り込み
**Objective:** As a knowledge owner, I want to upload PDF documents so that they become searchable as chat knowledge.

#### Acceptance Criteria
1. When a user uploads a PDF (max 50MB) via UI, the Document Ingestion Service shall persist the file and return success or failure.
2. When ingestion completes successfully, the Document Ingestion Service shall extract all text (including multi-page) from the PDF.
3. If PDF parsing fails, then the Document Ingestion Service shall notify the user with an error reason.
4. While ingestion is in progress, the UI shall display a visible progress or loading state.
5. The Document Ingestion Service shall reject files that are not PDF and shall inform the user.

### Requirement 2: ベクトル化とインデックス管理
**Objective:** As a platform operator, I want uploaded documents vectorized and indexed so that RAG retrieval is fast and accurate.

#### Acceptance Criteria
1. When text extraction succeeds, the Vector Index Service shall segment content into retrievable chunks and create embeddings.
2. When embeddings are created, the Vector Index Service shall store vectors with document/page references for later retrieval.
3. If index storage fails, then the Vector Index Service shall mark the document state as error and expose that state to the UI.
4. While a document is indexed, the Vector Index Service shall maintain idempotency so that reprocessing the same file does not duplicate vectors.
5. The Vector Index Service shall support full removal of a document’s vectors when the document is deleted.

### Requirement 3: 質問応答（RAG チャット）
**Objective:** As an end user, I want to ask questions about uploaded PDFs so that I receive answers grounded in the document content.

#### Acceptance Criteria
1. When a user sends a question, the Chat Service shall retrieve top-k relevant chunks from the vector store and include their sources in the response context.
2. When the response is generated, the Chat Service shall return both the answer and the citations (document name and page) to the UI.
3. If retrieval returns no relevant chunks, then the Chat Service shall respond that no supporting document content was found.
4. While the Chat Service generates a response, the UI shall show a typing/streaming indicator.
5. The Chat Service shall preserve chat history per session so that follow-up questions use prior context.

### Requirement 4: アクセス制御とデータ保護
**Objective:** As a tenant admin, I want secure access so that documents and chats are isolated and protected.

#### Acceptance Criteria
1. When a user is not authenticated, the Application Gateway shall block access to upload and chat endpoints.
2. When a user belongs to a tenant, the Document Ingestion Service shall store documents with tenant scoping so that other tenants cannot access them.
3. If a user tries to access a document outside their tenant, then the Application Gateway shall return an authorization error.
4. While chat history is stored, the Chat Service shall retain only tenant-scoped data and redact sensitive tokens (API keys, secrets) from logs.
5. The Application Gateway shall enforce HTTPS for all client interactions.

### Requirement 5: ユーザー体験と可観測性
**Objective:** As a product owner, I want clear UI states and metrics so that issues are discoverable and user experience is consistent.

#### Acceptance Criteria
1. When an upload or chat action succeeds, the UI shall display a confirmation message within 2 seconds.
2. When an error occurs (upload, parsing, indexing, chat), the UI shall present a user-friendly message and a retry option.
3. While system components operate, the Observability Service shall emit metrics for ingestion latency, embedding throughput, and chat latency.
4. If latency exceeds a configurable threshold, then the Observability Service shall raise an alert event.
5. The UI shall support basic localization for Japanese text labels used in upload and chat flows.
