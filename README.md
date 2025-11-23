# AI Librarian - PDF RAG Chatbot

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
