# AI Librarian - PDF RAG Chatbot

🌐 **Live Demo**:
https://github.com/user-attachments/assets/982498c9-b8dc-48d6-ad83-5951c0d69c6e


🌐 **deployURL: https://ai-librarian-pdf-rag-chatbot.vercel.app**


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
- Node.js 20+
- uv (高速 Python パッケージ管理)
- Supabase アカウント（またはローカル Supabase）
- OpenAI API Key

## 🐳 Docker での実行

Docker Compose を使用して、バックエンドとフロントエンドを一括で起動できます。

### 1. 環境変数の設定

```bash
# Backend
cp backend/.env.docker.example backend/.env.docker
# 必要に応じて backend/.env.docker を編集してください

# Frontend
cp frontend/.env.docker.example frontend/.env.docker
# 必要に応じて frontend/.env.docker を編集してください
```

### 2. コンテナのビルドと起動

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
