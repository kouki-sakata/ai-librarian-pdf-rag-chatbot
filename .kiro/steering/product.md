# Product Overview

PDF をナレッジ化し、RAG で出典付き回答を返す AI 司書（チャットボット）。Supabase を軸にアップロード・ベクトル化・認証を一体化し、低い運用コストでテナントごとに安全な検索体験を提供する。

## Core Capabilities

- PDF アップロードからテキスト抽出・埋め込み・インデックス登録までを同期フローで完遂（将来はキューで非同期化を想定）
- ベクトル検索 + LLM による出典付き回答（ドキュメント名とページを返す）
- Supabase Auth + RLS によるテナント分離とアクセスポリシーの一貫適用
- ストリーミング応答とチャット履歴保持による会話体験の継続性
- チャットセッションの作成/一覧/削除を Supabase の `chat_sessions/chat_messages` で管理し、最初のユーザーメッセージからタイトルを自動生成
- 可観測性指標（ingestion/chat latency, embedding throughput）とアラート閾値を前提にした運用（現行実装は OpenTelemetry + Prometheus エクスポーター起動済み）
- Supabase Storage / pgvector 連携は supabase-py + psycopg/pgvector で本番接続（`SUPABASE_DB_URL`, `SUPABASE_STORAGE_BUCKET` 必須）。RLS 付きテーブル（documents/vectors/chat_sessions/chat_messages）に tenant_id を強制し、チャット履歴も Supabase へ保存
- ドキュメントの一覧取得・削除・署名付き URL 発行を `/api/v1/documents` エンドポイント経由で提供し、Storage のオブジェクト削除とベクトルの掃除を一貫処理

## Target Use Cases

- チーム内ナレッジや顧客向け PDF 資料のセルフサーブ検索
- コールセンター/CS 向けの業務マニュアル参照
- 社内規程・契約書など改版頻度が低い文書の根拠提示付き照会

## Value Proposition

- Supabase（Storage/Auth/Postgres+pgvector）への集約でインフラ管理を最小化
- 回答に出典を必ず添えることで正当性と説明責任を担保
- Hexagonal な分離で UI・LLM・ベクトル層を差し替え容易にし、拡張性を確保
- 型安全（TypeScript/Pydantic）と静的解析を前提に品質を維持

updated_at: 2025-11-27
