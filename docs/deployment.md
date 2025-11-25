# Deployment Guide

このドキュメントは、本番環境へのデプロイに関する詳細な手順とベストプラクティスをまとめたものです。

## 環境変数の概要

### Frontend (Vercel)

| 変数名                          | 必須 | 説明                      | デフォルト値                   |
| ------------------------------- | ---- | ------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`           | ✅   | Backend API の URL        | `http://localhost:8000` (開発) |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅   | Supabase プロジェクト URL | -                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅   | Supabase Anonymous キー   | -                              |

### Backend (Render)

| 変数名                      | 必須 | 説明                           | デフォルト値                |
| --------------------------- | ---- | ------------------------------ | --------------------------- |
| `SUPABASE_URL`              | ✅   | Supabase プロジェクト URL      | -                           |
| `SUPABASE_PROJECT_REF`      | ✅   | Supabase プロジェクト参照 ID   | -                           |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅   | Supabase Service Role キー     | `mock-key` (開発)           |
| `SUPABASE_DB_URL`           | ✅   | Postgres 接続文字列 (pgvector) | -                           |
| `SUPABASE_STORAGE_BUCKET`   | ✅   | Storage バケット名             | `documents`                 |
| `OPENAI_API_KEY`            | ✅   | OpenAI API キー                | `mock-key` (開発)           |
| `OPENAI_MODEL`              | ⚪️  | LLM モデル                     | `gpt-4o-mini`               |
| `OPENAI_EMBEDDING_MODEL`    | ⚪️  | Embedding モデル               | `text-embedding-3-small`    |
| `OPENAI_TEMPERATURE`        | ⚪️  | LLM Temperature                | `0.7`                       |
| `DISABLE_AUTH`              | 🚨   | **本番では必ず `false`**       | `true` (開発)               |
| `FORCE_HTTPS`               | ⚪️  | HTTPS 強制 (プロキシ背後)      | `false`                     |
| `BACKEND_CORS_ORIGINS`      | ⚪️  | CORS 許可オリジン              | `["http://localhost:3000"]` |
| `METRICS_SERVER_ENABLED`    | ⚪️  | Prometheus metrics             | `true`                      |

## Supabase ダッシュボード設定

### 1. Authentication Provider 有効化

#### Email Provider

1. [Supabase Dashboard](https://app.supabase.com) → プロジェクト選択
2. **Authentication** → **Providers** を開く
3. **Email** を見つけて有効化
   - "Confirm email" をオフにすると、メール確認なしでサインアップ可能（開発用）
   - 本番では "Confirm email" を有効にすることを推奨

#### Anonymous Sign-ins

1. 同じ **Providers** ページで下にスクロール
2. **Anonymous Sign-ins** のトグルを有効化
3. これにより、ユーザーは登録なしで「ゲストログイン」が可能になる

### 2. Database 接続文字列の取得

1. **Database** → **Database Settings** を開く
2. **Connection String** セクションで **Session Pooler** を選択（推奨）
   - URI: `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
3. パスワードを入れて完全な接続文字列をコピー
4. `SUPABASE_DB_URL` 環境変数に設定

### 3. Storage バケットの作成

1. **Storage** → **Buckets** を開く
2. `documents` という名前のバケットを作成（まだない場合）
3. **Public bucket** のチェックは外す（プライベートバケット）
4. RLS (Row Level Security) で `tenant_id` ベースのアクセス制御を設定（別途マイグレーション）

### 4. API キーの取得

1. **Settings** → **API** を開く
2. 以下をコピー：
   - **Project URL**: `SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_URL` に使用
   - **Project REF**: URL から抽出（例: `https://xxxxx.supabase.co` の `xxxxx` 部分）
   - **anon public** キー: `NEXT_PUBLIC_SUPABASE_ANON_KEY` に使用
   - **service_role secret** キー: `SUPABASE_SERVICE_ROLE_KEY` に使用（⚠️ 秘密にすること）

## Backend DISABLE_AUTH 設定

### 開発環境 (ローカル)

```bash
# backend/.env
DISABLE_AUTH=true  # 認証をバイパス
```

- ローカル開発時は `true` に設定して、認証なしでテスト可能
- `verify_scenario.py` スクリプトでの動作確認に便利

### 本番環境 (Render)

```bash
# Render Environment Variables
DISABLE_AUTH=false  # 🚨 必ず false に設定
```

- **本番環境では絶対に `false` に設定すること**
- `true` のままだと、誰でも認証なしで API にアクセス可能になり、セキュリティリスクとなる
- Render の Environment Variables で設定後、再デプロイが必要

### 確認方法

1. Backend ログをチェック：
   ```
   INFO: Authentication is DISABLED (DISABLE_AUTH=true)
   WARNING: This is for development only!
   ```
2. 本番環境でこの警告が表示される場合は、即座に `DISABLE_AUTH=false` に変更

## Render デプロイ設定

### Build & Start コマンド

```yaml
# render.yaml (自動デプロイ用)
services:
  - type: web
    name: ai-librarian-backend
    runtime: python
    buildCommand: "cd backend && uv sync"
    startCommand: "cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: DISABLE_AUTH
        value: false # 🚨 本番は必ず false
      - key: FORCE_HTTPS
        value: true # Render は HTTPS プロキシのため
```

### 手動設定 (Render Dashboard)

1. **Root Directory**: `backend`
2. **Build Command**: `uv sync`
3. **Start Command**: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. すべての環境変数を設定（上記の Backend テーブル参照）

## Vercel デプロイ設定

### プロジェクト設定

1. **Framework Preset**: Next.js
2. **Root Directory**: `frontend`
3. **Build Command**: 自動検出 (`npm run build`)
4. **Output Directory**: 自動検出 (`.next`)

### 環境変数

Vercel Dashboard → Settings → Environment Variables で以下を追加：

- `NEXT_PUBLIC_API_URL`: Render の Backend URL (例: `https://ai-librarian-backend.onrender.com`)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

## デプロイ後の確認チェックリスト

- [ ] Vercel の URL にアクセスし、ログインページが表示される
- [ ] Guest Login が動作する
- [ ] Email でのサインアップ・ログインが動作する
- [ ] PDF アップロード機能が動作する
- [ ] チャット機能が動作し、ストリーミング応答が表示される
- [ ] Backend ログで `DISABLE_AUTH=false` が確認できる
- [ ] CORS エラーが発生しない（Render の `BACKEND_CORS_ORIGINS` に Vercel URL を追加）

## トラブルシューティング

### 認証エラー (401 Unauthorized)

- Render で `DISABLE_AUTH=false` が設定されているか確認
- Supabase Anonymous Sign-ins が有効になっているか確認
- Frontend が正しい `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を使用しているか確認

### CORS エラー

- Render の `BACKEND_CORS_ORIGINS` に Vercel の URL を追加
- 例: `["https://ai-librarian.vercel.app"]`

### データベース接続エラー

- `SUPABASE_DB_URL` が正しいか確認（Session Pooler URL を使用）
- Supabase で pgvector 拡張が有効になっているか確認

### タイムアウトエラー

- Chat/Upload API で 30 秒以上かかる場合、タイムアウトが発生
- OpenAI API の応答が遅い場合は、モデルやチャンク設定を見直し
