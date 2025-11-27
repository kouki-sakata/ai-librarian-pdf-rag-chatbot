# Technology Stack

## Architecture

Hexagonal 構成。Next.js 16 (React 19, App Router) フロントと FastAPI バックエンドをポート/アダプターで接続し、ドメインコア（Document, QA）を Supabase の認証・ストレージ・pgvector に集約する。

## Core Technologies

- **Language**: TypeScript (frontend), Python 3.12+ (backend)
- **Framework**: Next.js 16 / React 19（App Router）, FastAPI 0.121
- **Runtime**: Node.js 20+（Vercel 想定）、Uvicorn（gunicorn worker 経由も可）

## Key Libraries

- UI: Tailwind CSS 4 + shadcn/ui、react-markdown（回答表示）、@supabase/ssr（Server-side Auth）
- State/Data: TanStack React Query 5 を `QueryProvider` で包み、ドキュメント一覧のキャッシュと削除後の `invalidateQueries(["documents"])` を統一
- API/Domain: FastAPI, Pydantic v2。チャット生成は LangChain のチェーンは使わず、AsyncOpenAI で直接ストリーミング応答を構築（LangChain は embeddings/text splitter のみ）。
- Data/Vector: Supabase Postgres + pgvector、Supabase Storage、Supabase Auth JWT（supabase-py で Storage/DB を実接続、psycopg+pgvector で HNSW index を使用しつつ `set_config('app.tenant_id', …)` で RLS を効かせる。`SUPABASE_DB_URL` と bucket/role key が前提）
- AI: OpenAI SDK（gpt-4o-mini、text-embedding-3-small をデフォルト）
- Parsing/Chunking: pypdf + RecursiveCharacterTextSplitter
- Tooling: dotenv で設定注入、CORS middleware、openapi-typescript（型生成）

## Development Standards

### Type Safety

- TypeScript は strict モード、`any`/`unknown` 禁止
- Pydantic v2 モデルで入出力をスキーマ化、mypy で補完

### Code Quality

- フロントエンド: Biome で lint/format, Knip で未使用コード検出
- バックエンド: Ruff（lint）＋ optional black/ruff format、一貫した import 並び

### Auth & Tenant Context

- FastAPI middleware (`core/middleware.py`) で Supabase JWT を検証（RS256/JWKS + HS256 fallback）。`tenant_id` を contextvars にセットし、RLS 付き DB 操作は `app.tenant_id` を DB session に設定して評価させる
- `tenant_id` カスタムクレームが無い場合は `sub` をフォールバックとして採用し、匿名ユーザーでもテナント境界を維持
- API ハンドラ/サービスは context から tenant_id を取得し、Supabase Storage/DB でも同じ tenant 境界を強制
- HTTPS 強制は `FORCE_HTTPS` に連動し、レスポンスヘッダ (`Strict-Transport-Security`, `X-Frame-Options` 等) をミドルウェアで付与

### Testing

- Backend: pytest で API/ドメイン、LLM/pgvector はモック or testcontainer を使用。Locust で負荷テスト。
- Frontend: Vitest 4 + Testing Library、ストリーミング表示とエラー UI をカバー
- 契約: OpenAPI スキーマから `openapi-typescript` で型生成し、フロントエンドの型安全性を担保

## Development Environment

### Required Tools

- Node.js 20+, npm または pnpm
- Python 3.12+, **uv** (高速パッケージマネージャー、venv/pip の代替)
- Docker Compose（Supabase, pgvector を dev で起動）
- Supabase CLI（ローカル RLS/ストレージ確認に使用）

### Package Management

- **Backend**: `uv` で依存管理・仮想環境・実行を統合。`pyproject.toml` で定義、`uv run` でコマンド実行
- **Frontend**: `npm` で依存管理、`package.json` の `scripts` で開発フロー定義

### Common Commands

```bash
# Frontend dev: npm run dev --prefix frontend
# Backend dev: cd backend && make dev (or: uv run uvicorn app.main:app --reload)

# Code Quality Check (unified workflow)
# Backend (from backend/):
#   make check      - Run lint-fix → format → typecheck → test in sequence
#   make lint       - Run ruff linter
#   make lint-fix   - Run ruff linter with auto-fix
#   make format     - Run ruff formatter
#   make typecheck  - Run mypy type checker
#   make test       - Run pytest
# Frontend (from frontend/):
#   npm run check   - Run lint:fix → format → typecheck → test in sequence

# Coverage
#   Backend: uv run pytest --cov=app --cov-report=term-missing
#   Frontend: npm run test -- --coverage
```

### Pre-commit Hooks

`.pre-commit-config.yaml` で lint/format/typecheck を自動実行。バックエンドは `uv run` 経由で ruff + mypy、フロントエンドは npm scripts 経由で biome + tsc を呼び出し。

## Key Technical Decisions

- Supabase に認証・ストレージ・Postgres/pgvector を集約し、RLS で `tenant_id` を強制
- 取り込みは同期フロー（保存 → 抽出 → 埋め込み → インデックス）；再処理は置換・トランザクションで原子化
- Chat API は常に出典付きストリーミング返却を前提（LLM エラー時も明示）
- OpenAI モデルは設定切替可能にし、温度/トップ k/コンテキスト長を設定ファイル化
- Observability: ingestion/chat latency と embedding throughput のメトリクスを収集し、閾値越えでアラート
- OpenTelemetry + Prometheus exporter は `METRICS_SERVER_ENABLED=true` のときのみ 9464 ポートで公開（デフォルト有効だが CI では無効化を推奨）
- Chat API は AsyncOpenAI のストリームを NDJSON (`token` 連打 → 最終 `metadata`) で返却し、チャット履歴は Supabase テーブルへ記録
- Document API (`/api/v1/documents`) で一覧・削除・署名付き URL 発行を提供。削除時は vectors テーブルと Storage オブジェクトを先に掃除して整合性を担保
- VectorStoreService は `AsyncConnectionPool` + `set_config('app.tenant_id', …)` で接続ごとに RLS を適用し、`async_lru` で embedding を1時間キャッシュ
- 環境変数は `effective_supabase_*` プロパティで環境別に強制し、開発/本番キーの取り違えを防ぐ

updated_at: 2025-11-27
