# Project Structure

## Organization Philosophy

Hexagonal + 二層（frontend / backend）。UI は App Router で機能ごとに分離し、バックエンドはポート/アダプターでドメイン（Document, QA）を中心に保持。Supabase を共通インフラとして tenant 境界を強制。

## Directory Patterns

### Frontend (Next.js 16)

**Location**: `/frontend/`
**Purpose**: アップロード/チャット UI とストリーミング表示。App Router 直下の `frontend/app/page.tsx` にアップロードフォームとチャット UI を並置し、認証は `frontend/app/login`（メール/パスワード + 匿名ログイン）と `frontend/app/auth/callback`（Supabase OAuth code exchange）で処理。UI パーツは `frontend/components/ui`（shadcn ベースのデザインシステム）と `frontend/components/*.tsx`（機能固有）へ分割。
**Supporting Modules**: 共通ロジックは `frontend/hooks`（`use-chat.ts` がチャットセッション初期化と NDJSON ストリーム処理を担当）、ユーティリティは `frontend/lib`（`supabase/client.ts` と `supabase/server.ts` で Browser/Server クライアントを分離）、状態補助は `frontend/contexts`、型は `frontend/types`（`api.ts` は自動生成）に集約。`__tests__` で Vitest/Testing Library による UI テストを保持。`frontend/app/layout.tsx` で `QueryProvider`（TanStack React Query）と `SessionProvider` を包み、`AppSidebar` がチャット履歴タブ（`HistorySidebarContent`）とドキュメントタブ（`DocumentList`）を切り替える。ドキュメント一覧は React Query でキャッシュし、削除時に invalidate する。
**Path Alias**: `@/*` → `frontend/` ルート配下。

### Backend (FastAPI)

**Location**: `/backend/`
**Purpose**: FastAPI エンドポイントを `app/api/v1/endpoints` に配置し、処理は `app/services` にまとめるシンプルなサービスレイヤ構成。`app/core` に設定・CORS・メトリクスのほか Supabase JWT 検証ミドルウェア（JWKS/RS256 + HS256 fallback）、contextvars、supabase-py クライアント生成を集約（`telemetry.py` が OpenTelemetry + Prometheus exporter を起動）。
**Example**: `app/api/v1/endpoints/upload.py` → `IngestionService` が `StorageService`（supabase-py で Storage バケットへ書き込み）と `VectorStoreService`（psycopg + pgvector、接続ごとに `set_config('app.tenant_id', …)` で RLS を効かせつつ upsert/search）をオーケストレーション。チャットは `ChatService` が AsyncOpenAI から NDJSON ストリームを返し、チャット履歴は `HistoryService` が Supabase テーブル `chat_sessions/chat_messages` で CRUD。`documents.py` がドキュメント一覧/削除/署名付き URL を提供し、Storage オブジェクトと vectors テーブルを一括クリーニング。`parser.py` で PDF 解析、`retriever.py` で検索ロジックを担当。

### Contracts & Shared Schemas

**Location**: `/backend/app/core` で設定・セキュリティ、`/backend/app/services` で I/O 境界を抽象化。フロントは `frontend/types` にチャット/アップロード DTO を定義。`frontend/types/api.ts` は `openapi-typescript` によりバックエンドの OpenAPI スキーマから自動生成される。

### Infra & Ops

**Location**: `supabase/migrations` に DB 変更が保存される。汎用的な `infra/` ディレクトリは現時点で未作成。環境変数は各パッケージの `.env.example` で共有予定。

## Naming Conventions

- Frontend: コンポーネントファイル名は kebab-case (`upload-form.tsx`)、コンポーネント名は PascalCase (`UploadForm`)。hooks は camelCase (`use-chat.ts`)
- Backend: Python モジュール/ファイルは snake*case、テストは `test*\*.py`
- DTO/Schema: Pydantic モデルは PascalCase、型エイリアスは camelCase
- 環境変数: `OPENAI_MODEL`, `SUPABASE_PROJECT_REF` のように SCREAMING_SNAKE_CASE

## Import Organization

```typescript
// Frontend
import { UploadForm } from "@/components/upload-form"; // 絶対パス (@/* は frontend ルート)
import { getUploadErrorMessage } from "@/lib/error-messages";
```

```python
# Backend
from app.api.v1.endpoints import chat, upload
from app.services.vector_store import VectorStoreService
```

## Code Organization Principles

- UI は App Router のページで状態を保持し、API 呼び出し（fetch）と hook 経由でチャット/アップロードを制御
- サービス層は Supabase Storage（bucket namespaced by tenant）・pgvector（HNSW index）・OpenAI へのアクセスを抽象化し、`SUPABASE_DB_URL`/service role key が未設定の場合は明示的に失敗させる
- すべての操作で `tenant_id` / `session_id` を受け取り、テナント境界をアプリ層で明示（RLS 適用は今後の統合）
- 取り込みフローは「保存 → 抽出 →embed→index」を単一サービスで直列実行し、メトリクスで閾値監視
- Chat 応答は NDJSON ストリーミングを前提にし、`use-chat` が token/metadata chunk をパース。エラー時は UI へ明示的にトースト + メッセージを返す
- `HistoryService` でチャットセッションを Supabase テーブルに保存し、最初のユーザーメッセージを 30 文字に切り詰めてタイトル生成。`/api/v1/chat/sessions` で作成/一覧/削除を提供し、Sidebar から選択可能
- `DocumentList` は `/api/v1/documents` を叩いて一覧/削除を行い、削除時は vectors と Storage を同時クリーニングするバックエンドパターンと合致

updated_at: 2025-11-27
