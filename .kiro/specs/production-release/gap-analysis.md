# Gap Analysis: Production Release

## 1. Current State Investigation

### Existing Assets

| Domain             | Component            | Location                                                            | Purpose                                         |
| ------------------ | -------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| **Deployment**     | Render Config        | `render.yaml`                                                       | Backend deployment to Render (Singapore region) |
| **Authentication** | Auth Middleware      | `backend/app/core/middleware.py`                                    | JWT verification with DISABLE_AUTH flag         |
| **Authentication** | Supabase Integration | `backend/app/core/supabase_client.py`                               | Supabase client initialization                  |
| **Error Handling** | Toast Notifications  | `frontend/components/ui/sonner.tsx`                                 | Toast UI component (Sonner)                     |
| **Error Handling** | Error Messages       | `frontend/hooks/use-chat.ts`, `frontend/components/upload-form.tsx` | Toast.error() calls for failures                |
| **Chat**           | Chat Interface       | `frontend/components/chat-interface.tsx`                            | Main chat UI                                    |
| **Chat**           | History Service      | `backend/app/services/history.py`                                   | Backend session/message CRUD                    |
| **Citations**      | Citation Display     | `frontend/components/chat-message.tsx`                              | Citations listed below answers                  |

### Architecture Patterns

- **Frontend**: Next.js 16 App Router, コンポーネントは `frontend/components/`, hooks は `frontend/hooks/`
- **Backend**: FastAPI サービスレイヤ構成、`app/api/v1/endpoints/` にエンドポイント、`app/services/` にビジネスロジック
- **Auth**: JWT ベースの認証、`tenant_id` を contextvars で管理、RLS 前提
- **State**: React hooks (`useState`, `useCallback`) でローカル状態管理
- **Styling**: Tailwind CSS 4 + shadcn/ui

### Integration Surfaces

- **API Client**: `frontend/hooks/use-chat.ts` で `fetch()` を直接使用、ハードコードされた `http://localhost:8000`
- **Auth Token**: localStorage から取得 (`sb-access-token`, `supabase.auth.token`, または `NEXT_PUBLIC_DEV_JWT`)
- **Data Models**: Supabase テーブル (`chat_sessions`, `chat_messages`, `documents`, `vectors`)

## 2. Requirements Feasibility Analysis

### Requirement 1: Deployment & Infrastructure

**Technical Needs**:

- Vercel configuration for frontend (`vercel.json` or project settings)
- Environment variable setup for production (Vercel, Render, Supabase)
- README update with deployed URL

**Gaps**:

- **Missing**: Vercel config file
- **Missing**: Environment variable documentation
- **Constraint**: Backend API URL は現在ハードコードされている (`http://localhost:8000`)

**Complexity**: Simple (環境変数の設定と README の更新)

### Requirement 2: Authentication & User Management

**Technical Needs**:

- Supabase Auth クライアント (`@supabase/supabase-js`, `@supabase/ssr`)
- ログインページ (`/login`)
- ミドルウェア (`middleware.ts`) for route protection
- API callback route (`/auth/callback`)
- useChat フックの token 取得ロジック変更

**Gaps**:

- **Missing**: `@supabase/supabase-js`, `@supabase/ssr` パッケージ
- **Missing**: Supabase クライアント初期化 (サーバーコンポーネント用 / クライアントコンポーネント用)
- **Missing**: `/login` page
- **Missing**: `middleware.ts`
- **Missing**: `/auth/callback` route
- **Existing**: Backend は既に JWT 検証をサポート (middleware.py)
- **Constraint**: DISABLE_AUTH フラグを false に設定する必要がある

**Complexity**: Medium (認証フローの実装、Cookie 管理、リダイレクト処理)

### Requirement 3: User Experience & Error Handling

**Technical Needs**:

- Toast notifications for errors (アップロード失敗、API エラー)
- Loading indicators
- Timeout handling
- Mobile-responsive design

**Gaps**:

- **Existing**: Toast notifications は既に実装済み (Sonner)
- **Existing**: Loading states は部分的に実装済み (`isLoading`, `isInitializingSession`)
- **Missing**: Timeout handling mechanisms
- **Missing**: Mobile responsiveness validation (要テスト)

**Complexity**: Simple to Medium (既存の Toast を活用、タイムアウト処理追加、レスポンシブ CSS 調整)

### Requirement 4: Chat History Management

**Technical Needs**:

- サイドバー UI コンポーネント
- セッション一覧取得 API endpoint
- セッション切り替えロジック
- セッション表示名 (タイトル生成)

**Gaps**:

- **Missing**: Sidebar UI component
- **Missing**: API endpoint for listing sessions (`GET /api/v1/chat/sessions`)
- **Existing**: Backend `HistoryService` has `create_session`, `add_message`, `get_history`
- **Research Needed**: セッション表示名をどう生成するか (最初のメッセージ? LLM でタイトル生成?)

**Complexity**: Medium (UI 実装、API endpoint 追加、状態管理)

### Requirement 5: Document Management

**Technical Needs**:

- ドキュメント一覧取得 API endpoint
- ドキュメント削除 API endpoint (Storage + DB)
- ドキュメント一覧 UI
- 削除確認ダイアログ

**Gaps**:

- **Missing**: API endpoint for listing documents (`GET /api/v1/documents`)
- **Missing**: API endpoint for deleting documents (`DELETE /api/v1/documents/{id}`)
- **Missing**: Document list UI component
- **Existing**: Backend `StorageService`, `VectorStoreService` で Storage/DB 操作可能

**Complexity**: Medium (API endpoint 追加、UI 実装、削除処理のトランザクション管理)

### Requirement 6: Citation & Reference System

**Technical Needs**:

- Citation links (クリック可能)
- PDF viewer or file download
- Page navigation (可能であれば)

**Gaps**:

- **Missing**: Citation を clickable link にする UI 変更
- **Missing**: PDF ファイルへのアクセス URL (Supabase Storage の signed URL)
- **Research Needed**: ページ指定で PDF を開く方法 (ブラウザネイティブ? PDF.js?)

**Complexity**: Medium (Signed URL 生成、UI イベントハンドリング、PDF viewer integration)

## 3. Implementation Approach Options

### Option A: Extend Existing Components ⭐ (Recommended for most features)

**Which files to extend**:

- `frontend/hooks/use-chat.ts`: Add Supabase Auth token retrieval
- `frontend/components/upload-form.tsx`: Add timeout handling
- `backend/app/api/v1/endpoints/chat.py`: Add session list endpoint
- `backend/app/services/storage.py`: Add document list/delete methods

**Compatibility assessment**:

- Extending existing services respects current architecture
- No breaking changes to existing interfaces

**Trade-offs**:

- ✅ Minimal new files, faster development
- ✅ Leverages existing patterns
- ❌ `use-chat.ts` may become complex (consider splitting later)

### Option B: Create New Components (For Auth, History UI, Document Management UI)

**Rationale for new creation**:

- **Auth**: Distinct responsibility (login page, middleware, Supabase client)
- **History Sidebar**: Distinct UI component with its own state
- **Document Management**: Distinct feature area

**New components**:

- `frontend/lib/supabase/client.ts`, `frontend/lib/supabase/server.ts`: Supabase clients
- `frontend/app/login/page.tsx`: Login page
- `frontend/middleware.ts`: Route protection
- `frontend/app/auth/callback/route.ts`: Auth callback
- `frontend/components/chat-history-sidebar.tsx`: History sidebar
- `frontend/components/document-list.tsx`: Document management UI
- `backend/app/api/v1/endpoints/documents.py`: Document management endpoints

**Integration points**:

- Auth: Middleware checks session, redirects to `/login`
- History: Sidebar integrated into main layout
- Documents: Separate page or sidebar tab

**Trade-offs**:

- ✅ Clean separation of concerns
- ✅ Easier to test in isolation
- ❌ More files to navigate

### Option C: Hybrid Approach ⭐⭐ (Recommended Overall)

**Combination strategy**:

1. **Create new** for Auth infrastructure (login, middleware, Supabase client)
2. **Create new** for History Sidebar and Document Management UI
3. **Extend existing** for error handling improvements, citation clickability
4. **Minimal changes** for deployment configs

**Phased implementation**:

- **Phase 1 (Must-Have)**: Deployment, Auth, Error Handling
- **Phase 2 (Should-Have)**: History UI, Document Management, Citation links

**Trade-offs**:

- ✅ Balanced approach
- ✅ Allows incremental rollout
- ✅ Minimizes risk
- ❌ Requires careful coordination

## 4. Implementation Complexity & Risk

| Requirement         | Effort           | Risk       | Justification                                                    |
| ------------------- | ---------------- | ---------- | ---------------------------------------------------------------- |
| Deployment          | **S** (1-2 days) | **Low**    | Vercel は設定ファイル不要、env 変数のみ。Render config は既存    |
| Auth                | **M** (4-5 days) | **Medium** | Cookie 管理と SSR 対応が必要。Supabase Auth は well-documented   |
| Error Handling      | **S** (1 day)    | **Low**    | Toast は既存、タイムアウト追加のみ                               |
| Chat History        | **M** (3-4 days) | **Medium** | UI + API endpoint + state 管理。複雑なロジックはなし             |
| Document Management | **M** (3-4 days) | **Medium** | トランザクション管理 (Storage + DB) に注意が必要                 |
| Citation Links      | **S** (2-3 days) | **Medium** | Signed URL 生成は簡単。PDF viewer integration は Research Needed |

**Overall Effort**: **M-L** (2-3 weeks for all features)
**Overall Risk**: **Medium** (Auth と Citation に未知の部分があるが、ドキュメントが豊富)

## 5. Requirements-to-Asset Mapping

| Requirement             | Existing Assets                    | Gap                                 | Recommendation                                         |
| ----------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| **Deployment**          | render.yaml                        | Vercel config, env docs, README URL | Create vercel.json (optional), update README           |
| **Auth**                | middleware.py (backend)            | Frontend auth (全体)                | Create new: Supabase client, login page, middleware.ts |
| **Error Handling**      | Sonner, toast.error()              | Timeout handling                    | Extend existing hooks with timeout logic               |
| **Chat History**        | HistoryService (backend)           | UI sidebar, API endpoint            | Create new: sidebar component, GET /sessions endpoint  |
| **Document Management** | StorageService, VectorStoreService | UI, API endpoints                   | Create new: document list component, CRUD endpoints    |
| **Citation Links**      | Citation display                   | Clickable links, PDF access         | Extend chat-message.tsx, add signed URL API            |

## 6. Recommendations for Design Phase

### Preferred Approach

**Hybrid approach (Option C)** で段階的に実装:

1. **Phase 1 (Must-Have)**:

   - Deployment: Vercel 設定 + README 更新
   - Auth: Supabase Auth 統合 (login, middleware, client)
   - Error Handling: タイムアウト処理追加

2. **Phase 2 (Should-Have)**:
   - Chat History: Sidebar UI + セッション一覧 API
   - Document Management: 一覧 + 削除 UI/API
   - Citation Links: クリック可能な引用

### Key Design Decisions

1. **Auth Flow**:

   - Email/Password + Guest Login (anonymous sign-in)
   - Cookie ベース (Next.js middleware で SSR 対応)
   - RLS を有効化 (tenant_id で分離)

2. **API Base URL**:

   - 環境変数で管理 (`NEXT_PUBLIC_API_URL`)
   - Vercel 環境変数で production URL を設定

3. **Chat History**:

   - セッション表示名: 最初のユーザーメッセージの先頭 30 文字 (シンプル)
   - サイドバー: Collapsible (shadcn/ui Sidebar component)

4. **Document Management**:

   - 削除時: Storage file + DB records (documents, vectors) を両方削除
   - トランザクション: try-catch で DB rollback

5. **Citation Links**:
   - Signed URL (Supabase Storage): 1 時間有効
   - PDF viewer: ブラウザネイティブ (`window.open()` with `#page=N`)

### Research Items for Design Phase

1. **Citation Page Navigation**:

   - ブラウザネイティブの `#page=N` フラグメントが Supabase Storage 経由でも動作するか確認
   - 動作しない場合、PDF.js などの viewer library を検討

2. **Session Title Generation**:

   - LLM でタイトル生成する場合のコスト/レイテンシ影響を評価
   - シンプルな文字列切り取りで十分か検証

3. **Mobile Responsiveness**:
   - 現在の UI がモバイルで正常に動作するかテスト
   - Sidebar の表示/非表示ロジック (ハンバーガーメニュー?)

## 7. Summary

本プロジェクトは、既に基盤となる認証基盤(backend)、エラー通知(frontend)、履歴管理(backend)を持っている。主なギャップは **Frontend の Auth 統合**、**UI コンポーネント(History, Documents)**、**デプロイ設定** である。

Hybrid approach で段階的に実装することで、リスクを最小化しつつ、ポートフォリオとして求められる機能を確実に追加できる。

**Next Step**: `/kiro-spec-design production-release` で技術設計を作成し、実装タスクに落とし込む。
