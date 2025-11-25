# AI Librarian - PDF RAG Chatbot

🌐 **Live Demo**: [Coming Soon - Will be deployed on Vercel + Render]

**AI Librarian** は、アップロードされた PDF ドキュメントの内容に基づいて回答する、RAG (Retrieval-Augmented Generation) ベースのチャットボットアプリケーションです。

ユーザーは PDF をアップロードし、その内容について自然言語で質問することができます。AI は文書内の関連箇所を検索し、出典（ページ番号）を明示しながら回答を生成します。

## ✨ 主な機能

- **PDF アップロード & 解析**: PDF ドキュメントをアップロードし、テキストを抽出・ベクトル化して保存します。
- **RAG チャット**: アップロードされたドキュメントの内容に基づき、LLM (OpenAI GPT) が回答を生成します。
- **出典の明示**: 回答の根拠となったドキュメント名とページ番号を提示します。
- **ストリーミング応答**: 回答をリアルタイムでストリーミング表示し、快適なユーザー体験を提供します。
- **マルチテナント対応**: `tenant_id` により、ユーザーごとのデータを分離して管理します。

## 🛠 技術スタック

詳細な技術スタックについては [docs/tech_stack.md](docs/tech_stack.md) を参照してください。

- **Backend**: Python (FastAPI), LangChain, OpenAI API, pgvector
- **Frontend**: TypeScript (Next.js), Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Infrastructure**: Docker (optional)

## 🚀 セットアップガイド

### 前提条件

- Python 3.12+
- Node.js 18+
- Poetry (Python パッケージ管理)
- Supabase アカウント（またはローカル Supabase）
- OpenAI API Key

### 1. リポジトリのクローン

```bash
git clone https://github.com/kouki-sakata/ai-librarian-pdf-rag-chatbot.git
cd ai-librarian-pdf-rag-chatbot
```

### 2. バックエンドのセットアップ

```bash
cd backend

# 依存関係のインストール
poetry install

# 環境変数の設定
cp .env.example .env
# .env を編集して SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY を設定してください
```

### 3. フロントエンドのセットアップ

```bash
cd ../frontend

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して必要な変数を設定してください
```

### 4. データベースのセットアップ (Supabase)

Supabase プロジェクトを作成し、`supabase/migrations` 以下の SQL ファイルを実行してテーブルを作成してください。
また、`pgvector` 拡張機能を有効にする必要があります。

## 🏃‍♂️ 実行方法

### バックエンド

```bash
cd backend
make dev
# サーバーが http://localhost:8000 で起動します
```

### フロントエンド

```bash
cd frontend
npm run dev
# アプリケーションが http://localhost:3000 で起動します
```

## 🌍 本番環境へのデプロイ

### 環境変数の設定

本番環境では、以下の環境変数を設定する必要があります。

#### Frontend (Vercel)

| 変数名                          | 説明                      | 例                              |
| ------------------------------- | ------------------------- | ------------------------------- |
| `NEXT_PUBLIC_API_URL`           | Backend API の URL        | `https://your-app.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase プロジェクト URL | `https://xxxxx.supabase.co`     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon キー        | Supabase Dashboard から取得     |

#### Backend (Render)

| 変数名                      | 説明                             | 例                                                 |
| --------------------------- | -------------------------------- | -------------------------------------------------- |
| `SUPABASE_URL`              | Supabase プロジェクト URL        | `https://xxxxx.supabase.co`                        |
| `SUPABASE_PROJECT_REF`      | Supabase プロジェクト参照        | `xxxxx`                                            |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role キー       | Supabase Dashboard から取得                        |
| `SUPABASE_DB_URL`           | Supabase DB 接続文字列           | Supabase Dashboard → Database → Connection Pooling |
| `SUPABASE_STORAGE_BUCKET`   | Storage バケット名               | `documents`                                        |
| `OPENAI_API_KEY`            | OpenAI API キー                  | `sk-...`                                           |
| `DISABLE_AUTH`              | **必ず `false` に設定**          | `false`                                            |
| `FORCE_HTTPS`               | HTTPS 強制（Render では `true`） | `true`                                             |
| `BACKEND_CORS_ORIGINS`      | CORS 許可オリジン                | `["https://your-app.vercel.app"]`                  |

### デプロイ手順

#### 1. Supabase ダッシュボード設定

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. **Authentication** → **Providers** で以下を有効化：
   - **Email** provider を有効化
   - **Anonymous Sign-ins** を有効化
3. **Database** → 接続文字列をコピー（`SUPABASE_DB_URL` に使用）
4. **Storage** → `documents` バケットを作成（まだの場合）
5. **Settings** → **API** から以下をコピー：
   - Project URL (`SUPABASE_URL`)
   - Project Ref (`SUPABASE_PROJECT_REF`)
   - `anon` `public` キー (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` `secret` キー (`SUPABASE_SERVICE_ROLE_KEY`)

#### 2. Render (Backend) へのデプロイ

1. [Render Dashboard](https://dashboard.render.com/) にアクセス
2. **New** → **Web Service** を選択
3. GitHub リポジトリを接続
4. 以下の設定を入力：
   - **Name**: 任意の名前（例: `ai-librarian-backend`）
   - **Root Directory**: `backend`
   - **Build Command**: `uv sync`
   - **Start Command**: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables** で上記の Backend 環境変数をすべて設定
   - **重要**: `DISABLE_AUTH=false` を設定してください
6. **Create Web Service** をクリック

#### 3. Vercel (Frontend) へのデプロイ

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. **Add New** → **Project** を選択
3. GitHub リポジトリをインポート
4. 以下の設定を入力：
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
5. **Environment Variables** で上記の Frontend 環境変数をすべて設定
6. **Deploy** をクリック

#### 4. デプロイ後の確認

1. Vercel のデプロイ URL にアクセス
2. ログインページが表示されることを確認
3. **Guest Login** または Email でログイン
4. PDF アップロードとチャット機能をテスト

#### トラブルシューティング

- **CORS エラー**: Render の `BACKEND_CORS_ORIGINS` に Vercel の URL を追加
- **認証エラー**: Render で `DISABLE_AUTH=false` が設定されているか確認
- **データベース接続エラー**: `SUPABASE_DB_URL` が正しいか確認（Connection Pooling URL を使用）

## 🏃‍♂️ ローカル開発

### バックエンド

```bash
cd backend
make dev
# サーバーが http://localhost:8000 で起動します
```

### フロントエンド

```bash
cd frontend
npm run dev
# アプリケーションが http://localhost:3000 で起動します
```

## 🔐 認証について

現在、開発環境向けに認証を無効化する機能が実装されています。
詳細は [AUTHENTICATION.md](AUTHENTICATION.md) を参照してください。

## 📂 プロジェクト構成

```
.
├── backend/          # FastAPI バックエンド
│   ├── app/          # アプリケーションコード
│   └── tests/        # テストコード
├── frontend/         # Next.js フロントエンド
├── supabase/         # Supabase 関連ファイル (migrations 等)
├── docs/             # ドキュメント
└── ...
```
