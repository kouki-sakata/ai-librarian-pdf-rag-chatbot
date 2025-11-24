# 技術スタック概要

このリポジトリで使用している技術・ツールをカテゴリ別にまとめました。

## バックエンド

- **Python 3.12+** – アプリケーションロジック全体
- **FastAPI** – 高速な非同期 API サーバ
- **Uvicorn** – ASGI サーバ（開発モード `--reload`、本番モード `--host 0.0.0.0`）
- **uv** – 高速な依存管理・パッケージマネージャー
- **OpenAI SDK (AsyncOpenAI)** – LLM（`gpt-4o-mini`）呼び出し
- **pgvector** (PostgreSQL 拡張) – ベクトル検索用インデックス
- **psycopg (async)** – PostgreSQL への非同期クエリ
- **Supabase (PostgreSQL + Auth)** – データベース・認証・ストレージ
- **Pydantic** – データバリデーション・シリアライズ
- **OpenTelemetry** – トレース・メトリクス収集
- **Ruff + mypy** – Lint/型チェック・自動整形
- **Pre‑commit** – フックでコード品質を保証

## フロントエンド

- **Next.js 16** (React 19) – SSR/CSR の Web アプリ
- **TypeScript** (strict) – 型安全なフロントエンド
- **Tailwind CSS** – UI スタイリング（ユーティリティクラス）
- **Biome** – Lint/format (JS/TS)
- **Vitest** – ユニットテストランナー
- **React Testing Library** – コンポーネントテスト
- **OpenAPI TypeScript Generator** (`openapi-typescript`) – API 型定義自動生成
- **Sonner** – トースト通知
- **Lucide‑React** – アイコン
- **Tailwind‑merge / tw‑animate‑css** – クラス結合・アニメーション

## CI / デプロイ

- **GitHub Actions** – CI パイプライン（テスト、リント、型チェック）
- **Docker (optional)** – Supabase ローカル起動・開発環境

## 開発補助

- **Makefile** (`make dev`, `make start`) – サーバ起動・テスト実行のショートカット
- **.env / .env.example** – 環境変数管理（Supabase URL、OpenAI キー、DISABLE_AUTH）
- **AUTHENTICATION.md** – 認証設計・開発時バイパスのドキュメント
- **walkthrough.md** – 変更履歴・検証結果のまとめ

## 主なアーキテクチャパターン

- **RAG（Retrieval‑Augmented Generation）**
  1. PDF → 埋め込み (`text‑embedding‑3‑small`) → `vectors` テーブルに保存
  2. ユーザー質問 → ベクトル検索 (`<=>` 演算子) → 関連チャンク取得
  3. コンテキスト＋質問を LLM に渡し、ストリーミングで回答
  4. メタデータ（source, page, similarity）を NDJSON でフロントへ送信
- **マルチテナント** (`tenant_id` カラムでデータ分離)
- **開発モード認証バイパス** (`DISABLE_AUTH` フラグ)
- **OpenTelemetry** によるリクエストレイテンシ計測
