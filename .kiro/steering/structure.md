# Project Structure

## Organization Philosophy

Hexagonal + 二層（frontend / backend）。UI は App Router で機能ごとに分離し、バックエンドはポート/アダプターでドメイン（Document, QA）を中心に保持。Supabase を共通インフラとして tenant 境界を強制。

## Directory Patterns

### Frontend (Next.js 15)
**Location**: `/frontend/`  
**Purpose**: アップロード/チャット UI とストリーミング表示。App Router で `app/(upload|chat)/` など機能単位のルートを持ち、UI パーツは `src/components/ui`（デザインシステム）と `src/components/features`（機能固有）に分割。  
**Example**: `frontend/src/app/chat/page.tsx` でサーバーアクションを呼び出し、`src/components/features/chat/ChatPanel.tsx` がストリームを描画。

### Backend (FastAPI + Ports/Adapters)
**Location**: `/backend/`  
**Purpose**: FastAPI のエンドポイント層とドメインサービスを分離。`app/api/routes` は薄いバリデーションと認証、`app/domain` にユースケース、`app/adapters` に実装（vector, storage, auth, llm）。  
**Example**: `app/api/routes/upload.py` → `DocumentIngestionService` (domain) → `PgVectorAdapter` / `SupabaseStorageAdapter`。

### Contracts & Shared Schemas
**Location**: `/frontend/src/lib/api`（型生成クライアント）と `/backend/app/schemas`（Pydantic）。  
**Purpose**: OpenAPI で合意した DTO を単一ソースにし、フロントは生成型か Zod バリデーションで利用。  
**Example**: `app/schemas/chat.py` ↔ `frontend/src/lib/api/types.ts`。

### Infra & Ops
**Location**: `/infra/`  
**Purpose**: `docker-compose.yml` で Supabase/pgvector を dev 起動し、`.env.example` で必須変数を共有。デプロイ設定（Vercel/Render）もここに集約。  
**Example**: `infra/docker-compose.yml` で Postgres+pgvector+Supabase CLI サービスを定義。

## Naming Conventions

- Frontend ファイル: コンポーネントは PascalCase (`ChatPanel.tsx`)、hooks は camelCase (`useUpload.ts`)
- Backend: Python モジュール/ファイルは snake_case、テストは `test_*.py`
- DTO/Schema: Pydantic モデルは PascalCase、型エイリアスは camelCase
- 環境変数: `UPLOADER_MAX_MB`, `OPENAI_MODEL`, `SUPABASE_PROJECT_URL` のように SCREAMING_SNAKE_CASE

## Import Organization

```typescript
// Frontend
import { ChatPanel } from '@/components/features/chat/ChatPanel'  // 絶対パス (@/ は frontend/src)
import { UploadButton } from './UploadButton'                     // 相対は近接ファイルに限定
```

```python
# Backend
from app.api.dependencies import get_current_tenant
from app.domain.document import DocumentIngestionService
from app.adapters.vector.pgvector import PgVectorAdapter
```

**Path Aliases**:
- `@/` → `frontend/src`

## Code Organization Principles

- UI は状態/表示に集中し、認証やドメインロジックはサーバーアクション or API 経由で実行
- ドメインサービスから外部依存（LLM, vector, storage）へはポートインターフェース越しに呼び出す
- すべての DB/Storage/Vector 操作は `tenant_id` を必須にし、RLS とアプリ側バリデーションの二重防御
- 取り込みフローは「保存→抽出→embed→index」を単一トランザクションまたは明示的ジョブステータスで管理し、再処理は idempotent
- Chat 応答は必ず citation を返し、ストリーミング中断時は UI へ明示的にエラーを伝搬

updated_at: 2025-11-21
