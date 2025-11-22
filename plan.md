# テスト実行と残タスク計画（実装済み後）

## 今回追加された実装に対する検証手順
- 前提: `.env` を `backend/.env.example` に従って作成し、少なくとも以下を設定
  - `SUPABASE_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_STORAGE_BUCKET`
  - 開発用 JWT を発行できない場合は `NEXT_PUBLIC_DEV_JWT` をフロント用に設定
- 依存インストール
  - backend: `cd backend && poetry install`
  - frontend: `cd frontend && npm install`
- DB/ストレージ準備
  - Supabase/Postgres に `vectors` テーブル（tenant_id, doc_id, chunk_id PK; metadata jsonb; embedding vector）を用意し、pgvector 拡張を有効化
  - Storage バケット `documents` を作成し、`{tenant_id}/docs/*` へのRLS/ポリシーをテナント縛りで設定
- サーバ起動（ローカル）
  - backend: `poetry run uvicorn app.main:app --reload --port 8000`
  - frontend: `npm run dev --prefix frontend`
- 自動テスト
  - backend: `cd backend && poetry run pytest`
  - frontend: `cd frontend && npm run test -- --runInBand`
  - 型チェック: `npm run typecheck --prefix frontend`
- 簡易シナリオ確認
  1) フロントからPDFアップロード → 成功レスポンスに `doc_id` が返ること
  2) 同セッションで質問 → ストリーミングで本文と `type: "metadata"` 行が到達し、UI に出典リストが表示されること

## 次のアクション（未完了のもの）
1. Supabase RLS/HTTPS
   - `FORCE_HTTPS=true` を本番相当で有効化し、リバースプロキシ経由で `x-forwarded-proto` が渡ることを確認
   - RLS ポリシーを Supabase 側で適用（vectors・chat_messages・chat_sessions・storage パス）
2. パフォーマンステスト
   - 50MB PDF 取り込みの中央値/95p を計測（要件 5.3/5.4）。`locust` または `pytest-benchmark` でシナリオ化
3. OpenAPI ベースの型生成（任意だが推奨）
   - `/api/v1/openapi.json` から `openapi-typescript` 等でフロント用クライアントを生成し、fetch 実装を置換
4. CI 統合
   - 上記テストと typecheck を CI に追加し、Supabase 接続が不要な箇所はモック化して落ちないようにする

## 留意
- テストは pgvector / Supabase 実リソースが前提。ネットワーク不可環境では `VectorStoreService` と `StorageService` をモックしてユニットレベルのみ通す。
