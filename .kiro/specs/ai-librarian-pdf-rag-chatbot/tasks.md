# Implementation Plan

- [/] 1. Supabase 認証ゲートウェイを整備する (将来実装予定)
- [/] 1.1 Supabase Auth JWT 検証を FastAPI ミドルに組み込み、JWKS キャッシュ・aud/iss・exp/nbf 検証と 401/429 応答を実装する
  - RS256 キーを JWKS から取得しキャッシュ TTL を設定
  - 認証失敗時のレスポンス差異（未認証/レート超過）を分ける
  - _Requirements: 4.1, 4.3, 4.5_
  - _Note: 実装済みだが意図的に無効化。将来のログイン機能実装時に有効化_
- [/] 1.2 JWT から tenant_id を抽出し`app.tenant_id`を設定、リクエストスコープで伝搬する

  - sub または custom claim `tenant_id`を検証して RLS 用にコンテキスト設定
  - 認証成功時に API/DB/Storage が同一 tenant で動くことを確認する
  - _Requirements: 4.2, 4.3_
  - _Note: tenant_id_context は実装済み。認証有効化時に動作確認_

- [x] 2. アップロード UI とバックエンド取り込みを実装する
- [x] 2.1 Next.js で PDF アップロード UI を作成し、50MB/MIME 検証・進行表示・多言語ラベルを提供する
  - FormData 送信、ローディング/成功/失敗トーストと再試行ボタンを表示
  - ラベル/メッセージを日本語ローカライズ
  - _Requirements: 1.1, 1.4, 1.5, 5.1, 5.2, 5.5_
  - _Implemented: components/upload-form.tsx_
- [x] 2.2 /upload エンドポイントでストレージ保存と状態返却を行う

  - Supabase Storage `tenant-{id}/docs/{docId}`へ保存し、サイズ/MIME 違反は 400 で返却
  - 成功/失敗の状態を UI に返し、非 PDF や保存失敗時の理由を含める
  - _Requirements: 1.1, 1.3, 4.2_
  - _Implemented: api/v1/endpoints/upload.py, services/storage.py_

- [x] 3. 解析・埋め込み・インデックスを実装する
- [x] 3.1 pypdf + RecursiveCharacterTextSplitter でテキスト抽出とチャンク化を行い、失敗を UI へ通知する
  - 複数ページ対応とエラー時の状態`error`更新
  - _Requirements: 1.2, 2.1, 2.3_
  - _Implemented: services/parser.py_
- [x] 3.2 OpenAI 埋め込み生成と pgvector upsert を実装し、冪等・削除対応を確保する
  - UNIQUE(tenant_id, doc_id, chunk_hash)で ON CONFLICT 更新、doc 削除時のベクトル全削除を提供
  - _Requirements: 2.2, 2.4, 2.5, 4.2_
  - _Implemented: services/vector_store.py_
- [/] 3.3 ingest_jobs/documents に処理状態を記録し、エラー/成功を UI に返す

  - 抽出・埋め込み各ステップのステータスとエラー理由を保存
  - _Requirements: 1.3, 2.3_
  - _Note: コード内で参照あり、DB 実装の確認が必要_

- [/] 4. 質問応答フローを実装する
- [x] 4.1 Retriever で top-k 取得し、出典付き回答と空振り時メッセージを返す
  - pgvector 類似検索で chunks+metadata を取得し、該当なしの場合の応答を返却
  - _Requirements: 3.1, 3.3_
  - _Implemented: services/retriever.py_
  - _Warning: 空振り時の明示的メッセージ処理が不完全_
- [/] 4.2 LLM ストリーミング回答を UI へ配信し、typing/streaming 表示と Markdown レンダリングを整備する
  - citations（文書名/ページ）を含めて返却し、UI で react-markdown 表示
  - _Requirements: 3.2, 3.4, 5.1_
  - _Implemented: services/chat.py, components/chat-interface.tsx_
  - _Warning: citations 機能が未実装_
- [x] 4.3 セッション履歴を Supabase Postgres/kv に保存し、ユーザーと関連付けて再利用する

  - sessionId 未指定時の発行、TTL/最大履歴長の適用
  - _Requirements: 3.5, 4.4_
  - _Implemented: services/history.py_

- [/] 5. テナント隔離と RLS/ストレージ境界を設定する
- [/] 5.1 Postgres RLS ポリシーと`SET app.tenant_id`適用を作成し、Storage バケットも tenant 単位に固定する
  - documents/ingest_jobs/vectors/chat_sessions 全テーブルに RLS を適用
  - _Requirements: 4.2, 4.3_
  - _Implemented: tenant_id_context (core/context.py), storage path (services/storage.py)_
  - _Warning: DB/RLS スキーマファイルの確認が必要_
- [x] 5.2 ログ/トレースで API キーや PII をマスクし、HTTPS 強制設定を確認する

  - LLM/Storage/DB 接続ログの秘匿とサーキットブレーカー/タイムアウト設定
  - _Requirements: 4.4, 4.5_
  - _Implemented: core/logger.py (mask_sensitive_data)_

- [x] 6. 可観測性と UX フィードバックを整備する
- [x] 6.1 ingestion_duration/embedding_throughput/chat_latency を計測し、閾値超過でアラートを送出する
  - OTel exporter→Prometheus 互換、阈値設定を Config 化
  - _Requirements: 5.3, 5.4_
  - _Implemented: core/telemetry.py, services/ingestion.py, services/chat.py_
- [x] 6.2 成功・失敗メッセージと再試行 UI、ローカライズ対応を統一する

  - Upload/Chat 双方で 2 秒以内の成功表示とユーザーフレンドリーなエラー表示
  - _Requirements: 5.1, 5.2, 5.5_
  - _Implemented: components/upload-form.tsx, components/chat-interface.tsx, lib/error-messages.ts_

- [/] 7. テスト（E2E 除外）を実施する
- [x] 7.1 ユニットテスト: パーサー、チャンク化、auth ミドル、ベクトル冪等性を検証
  - _Requirements: 1.2, 2.1, 2.4, 4.1_
  - _Implemented: tests/test_ingestion.py, tests/test_auth.py_
  - _Warning: 依存関係エラーで実行不可_
- [x] 7.2 結合テスト: /upload→ 抽出 →index と/chat（LLM モック）でテナント隔離を確認
  - _Requirements: 1.1, 2.2, 3.1, 4.2, 4.3_
  - _Implemented: tests/test_upload.py, tests/test_rag.py_
  - _Warning: 依存関係エラーで実行不可_
- [ ] 7.3 性能テスト: 50MB アップロードと top-k 検索のレイテンシを計測し、アラート閾値を検証
  - _Requirements: 1.1, 2.1, 5.3, 5.4_
  - _Note: tests/performance/ディレクトリ存在、実装未確認_
