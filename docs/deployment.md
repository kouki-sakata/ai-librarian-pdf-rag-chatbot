# Deployment Checklist

本番デプロイ時に抜け漏れを防ぐためのチェックリスト。Render（バックエンド）と Vercel（フロントエンド）での最小手順をまとめる。

## 0. 事前準備（共通）

- [☓] Supabase プロジェクトを作成し、`documents` バケットを作成
- [☓] `supabase/migrations` を適用（pgvector 拡張・RLS ポリシー・インデックス）
- [☓] OpenAI API Key を取得
- [☓] 必須環境変数を .env/.env.local に記入してローカルで `npm run build --prefix frontend` と `cd backend && uv run uvicorn app.main:app --reload` が通ることを確認
- [☓] Docker で動かす場合は `backend/.env.docker` と `frontend/.env.docker` を `.example` からコピーして値を埋める

## Render（Backend）

- [☓] Render Dashboard → **Blueprints** で `render.yaml` をインポート（branch: `main`、plan: `free`、autoDeploy: false）
- [☓] Build Command（自動設定）: `pip install uv && uv sync --frozen`
- [☓] Start Command（自動設定）: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [☓] 必須シークレットを入力
  - `SUPABASE_URL`
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_DB_URL`（Connection Pooling URL 推奨）
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`
  - `OPENAI_API_KEY`
- [☓] デフォルト値（Blueprint 内蔵）を必要に応じて上書き
  - `ENVIRONMENT=development` → 本番は `production`
  - `DISABLE_AUTH=true` → 本番は **必ず** `false`
  - `FORCE_HTTPS=false` → Render 本番は `true`
  - `BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]` → Vercel URL を追加
  - `METRICS_SERVER_ENABLED=false` → 本番で有効化する場合は `true`
  - `SUPABASE_STORAGE_BUCKET=documents`（そのまま使用）
- [☓] Health Check Path `/api/v1/health/` を確認
- [☓] デプロイ後、`https://<render-url>/api/v1/health/` が 200 になることを確認

## Vercel（Frontend）

- [☓] Vercel Dashboard → **Add Project** で `vercel.yaml` を Blueprint インポート（Root Directory は `frontend` を使用）
- [☓] インポート時に `installCommand`, `buildCommand`, `devCommand` は Blueprint のまま利用（Node 20 デフォルトで可）
- [☓] 環境変数を上書き
  - `NEXT_PUBLIC_API_URL`（Render バックエンドの URL に置換）
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [☓] デプロイ後、`/login` でメール/匿名ログインが動作することを確認
- [☓] トップページで PDF アップロード → チャットが成功し、出典付き応答が返ることを確認

## 運用チェック

- [☓] OpenTelemetry/Prometheus exporter が不要な環境では `METRICS_SERVER_ENABLED` を無効化（必要なら Render に env 追加）
- [ ] Supabase の RLS ログ/エラーを監視し、`app.tenant_id` が設定されていることを確認

updated_at: 2025-11-25
