# Technology Stack

## Architecture

Hexagonal 構成。Next.js 15 (React 19) フロントと FastAPI バックエンドをポート/アダプターで接続し、ドメインコア（Document, QA）を Supabase の認証・ストレージ・pgvector に集約する。

## Core Technologies

- **Language**: TypeScript (frontend), Python 3.11+ (backend)
- **Framework**: Next.js 15 / React 19（App Router, Server Actions）, FastAPI 0.115
- **Runtime**: Node.js 20+（Vercel 想定）、Uvicorn（gunicorn worker 経由も可）

## Key Libraries

- UI: Tailwind CSS + shadcn/ui、react-markdown（回答表示）
- API/Domain: FastAPI, Pydantic v2, LangChain 1.0（Retriever/Chat chain）
- Data/Vector: Supabase Postgres + pgvector、Supabase Storage、Supabase Auth JWT
- AI: OpenAI SDK（gpt-4o-mini、text-embedding-3-small をデフォルト）
- Parsing/Chunking: pypdf + RecursiveCharacterTextSplitter
- Tooling: dotenv で設定注入、CORS middleware

## Development Standards

### Type Safety
- TypeScript は strict モード、`any`/`unknown` 禁止
- Pydantic v2 モデルで入出力をスキーマ化、mypy で補完

### Code Quality
- フロントエンド: Biome で lint/format
- バックエンド: Ruff（lint）＋ optional black/ruff format、一貫した import 並び

### Testing
- Backend: pytest で API/ドメイン、LLM/pgvector はモック or testcontainer を使用
- Frontend: Vitest + Testing Library、ストリーミング表示とエラー UI をカバー
- 契約: OpenAPI スキーマを基準にリクエスト/レスポンスを型生成し差分検知

## Development Environment

### Required Tools
- Node.js 20+, npm または pnpm
- Python 3.11+, uv/venv
- Docker Compose（Supabase, pgvector を dev で起動）
- Supabase CLI（ローカル RLS/ストレージ確認に使用）

### Common Commands
```bash
# Frontend dev: npm run dev --prefix frontend
# Backend dev: uvicorn app.main:app --reload
# Frontend test: npm test --prefix frontend
# Backend test: pytest
# Lint: npm run lint --prefix frontend && ruff check backend
```

## Key Technical Decisions

- Supabase に認証・ストレージ・Postgres/pgvector を集約し、RLS で `tenant_id` を強制
- 取り込みは同期フロー（保存→抽出→埋め込み→インデックス）；再処理は置換・トランザクションで原子化
- Chat API は常に出典付きストリーミング返却を前提（LLM エラー時も明示）
- OpenAI モデルは設定切替可能にし、温度/トップ k/コンテキスト長を設定ファイル化
- Observability: ingestion/chat latency と embedding throughput のメトリクスを収集し、閾値越えでアラート

updated_at: 2025-11-21
