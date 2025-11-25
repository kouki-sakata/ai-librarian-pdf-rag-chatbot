# Deployment Checklist

本番デプロイ時に抜け漏れを防ぐためのチェックリスト。Render（バックエンド）と Vercel（フロントエンド）での最小手順をまとめる。

## 0. 事前準備（共通）
- [ ] Supabase プロジェクトを作成し、`documents` バケットを作成
- [ ] `supabase/migrations` を適用（pgvector 拡張・RLS ポリシー・インデックス）
- [ ] OpenAI API Key を取得
- [ ] 必須環境変数を .env/.env.local に記入してローカルで `npm run build --prefix frontend` と `cd backend && uv run uvicorn app.main:app --reload` が通ることを確認
- [ ] Docker で動かす場合は `backend/.env.docker` と `frontend/.env.docker` を `.example` からコピーして値を埋める

## Render（Backend）
- [ ] Render Web Service を新規作成し、Root Directory を `backend` に設定
- [ ] Build Command: `pip install uv && uv sync`
- [ ] Start Command: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] 環境変数を登録
  - `ENVIRONMENT=production`
  - `SUPABASE_URL`
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_DB_URL`（Connection Pooling URL を推奨）
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET=documents`
  - `OPENAI_API_KEY`
  - `DISABLE_AUTH=false`
  - `FORCE_HTTPS=true`
  - `BACKEND_CORS_ORIGINS`（Vercel フロントの URL を含める）
- [ ] Health Check Path を `/api/v1/health/` に設定
- [ ] デプロイ後、`https://<render-url>/api/v1/health/` が 200 になることを確認

## Vercel（Frontend）
- [ ] 新規プロジェクトで Root Directory を `frontend` に設定（Framework Preset: Next.js）
- [ ] Build / Install はデフォルトで OK（Node 20）
- [ ] 環境変数を登録
  - `NEXT_PUBLIC_API_URL`（Render のバックエンド URL）
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] デプロイ後、`/login` でメール/匿名ログインが動作することを確認
- [ ] トップページで PDF アップロード→チャットが成功し、出典付き応答が返ることを確認

## 運用チェック
- [ ] OpenTelemetry/Prometheus exporter が不要な環境では `METRICS_SERVER_ENABLED` を無効化（必要なら Render に env 追加）
- [ ] Supabase の RLS ログ/エラーを監視し、`app.tenant_id` が設定されていることを確認

updated_at: 2025-11-25
