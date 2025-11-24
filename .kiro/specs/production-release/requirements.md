# Requirements Document

## Introduction

本機能群は、AI 司書チャットボットをポートフォリオとして公開可能なレベル（Production Readiness）に引き上げることを目的とする。
本番環境（Vercel/Render/Supabase）へのデプロイ、認証基盤（Supabase Auth）の統合、および UX/DX の向上（エラーハンドリング、履歴管理、ドキュメント管理、引用機能）を包括的に実装する。

## Phased Implementation Strategy

機能を 2 つの Phase に分割し、段階的にリリースする：

- **Phase 1 (Must-Have)**: デプロイ、認証、基本的なエラーハンドリング
- **Phase 2 (Should-Have)**: チャット履歴 UI、ドキュメント管理 UI、引用リンク、レスポンシブ対応

## Requirements

---

## Phase 1: Production Deployment & Authentication

### Requirement 1: Deployment & Infrastructure

**Objective:** As a Developer, I want to deploy the application to a production environment, so that it is publicly accessible.

#### Acceptance Criteria

1. The System shall be deployed to Vercel (Frontend) and Render (Backend).
2. The System shall use Supabase Cloud for Database and Storage.
3. The README shall contain the URL of the deployed application at the top of the document.
4. The System shall use environment variables for all sensitive configuration (API keys, DB URLs).
5. The Frontend shall use `NEXT_PUBLIC_API_URL` environment variable for backend API base URL.

### Requirement 2: Authentication & User Management

**Objective:** As a User, I want to securely access the application, so that my data is protected and separated from others.

#### Acceptance Criteria

1. When an unauthenticated user accesses a protected route (e.g., `/`), the System shall redirect the user to the `/login` page.
2. When the user enters valid credentials, the System shall authenticate the user via Supabase Auth.
3. When the user clicks the "Guest Login" button, the System shall authenticate the user as an anonymous user via Supabase Auth.
4. The System shall maintain the user's session using Supabase Auth cookies/tokens.
5. The System shall restrict access to chat history and documents to the authenticated user (RLS).
6. When the user completes authentication via email link, the System shall handle the callback at `/auth/callback`.
7. The Frontend shall retrieve authentication tokens via `supabase.auth.getSession()` instead of localStorage.

### Requirement 3: User Experience & Error Handling

**Objective:** As a User, I want clear feedback and a smooth interface, so that I can use the application without confusion.

#### Acceptance Criteria

1. If an API error occurs (e.g., upload failure, chat error), then the System shall display a Toast notification with a descriptive error message.
2. While an operation is in progress (e.g., uploading, generating response), the System shall display a loading indicator.
3. The System shall be responsive and usable on mobile devices (smartphone/tablet).
4. The System shall prevent infinite loading states by handling timeouts and errors gracefully.
5. When a fetch request exceeds 30 seconds, the System shall abort the request and display a timeout error.

---

## Phase 2: Enhanced UX & Feature Completeness

### Requirement 4: Chat History Management

**Objective:** As a User, I want to view and manage my past conversations, so that I can reference previous information.

#### Acceptance Criteria

1. The System shall display a list of the user's past chat sessions in a sidebar.
2. When the user selects a past session, the System shall load and display the chat history for that session.
3. When the user creates a new chat, the System shall create a new session entry.
4. The System shall store chat messages and sessions in the Supabase database.
5. The System shall display sessions in reverse chronological order (most recent first).
6. When the user clicks the delete button on a session, the System shall remove the session and its messages after confirmation.
7. The System shall display session titles based on the first user message (truncated to 30 characters).
8. When the user clicks "New Chat" button, the System shall create a new session and clear the current conversation.

### Requirement 5: Document Management

**Objective:** As a User, I want to manage the documents I have uploaded, so that I can control the knowledge base used for answers.

#### Acceptance Criteria

1. The System shall display a list of PDF files uploaded by the user.
2. When the user clicks the delete button for a file, the System shall remove the file from Supabase Storage.
3. When the user clicks the delete button for a file, the System shall remove the corresponding vector embeddings from the database.
4. The System shall ensure that users can only view and delete their own documents.
5. The System shall display document information including filename, size, and upload date.
6. When the user clicks the delete button, the System shall show a confirmation modal before deletion.
7. The System shall sort documents by upload date (most recent first) by default.

### Requirement 6: Citation & Reference System

**Objective:** As a User, I want to verify the sources of the answers, so that I can trust the information provided.

#### Acceptance Criteria

1. When the System generates an answer, it shall include citations in the format `[source: filename, page: number]`.
2. When the user clicks a citation link, the System shall open the corresponding PDF file.
3. Where possible, the System shall scroll to or highlight the specific page referenced in the citation.
4. The System shall generate time-limited URLs for accessing PDF files securely.
