# Implementation Plan

- [ ] 1. Supabase認証ゲートウェイを整備する
- [ ] 1.1 Supabase Auth JWT検証をFastAPIミドルに組み込み、JWKSキャッシュ・aud/iss・exp/nbf検証と401/429応答を実装する
  - RS256キーをJWKSから取得しキャッシュTTLを設定
  - 認証失敗時のレスポンス差異（未認証/レート超過）を分ける
  - _Requirements: 4.1, 4.3, 4.5_
- [ ] 1.2 JWTからtenant_idを抽出し`app.tenant_id`を設定、リクエストスコープで伝搬する
  - subまたはcustom claim `tenant_id`を検証してRLS用にコンテキスト設定
  - 認証成功時にAPI/DB/Storageが同一tenantで動くことを確認する
  - _Requirements: 4.2, 4.3_

- [ ] 2. アップロードUIとバックエンド取り込みを実装する
- [ ] 2.1 Next.jsでPDFアップロードUIを作成し、50MB/MIME検証・進行表示・多言語ラベルを提供する
  - FormData送信、ローディング/成功/失敗トーストと再試行ボタンを表示
  - ラベル/メッセージを日本語ローカライズ
  - _Requirements: 1.1, 1.4, 1.5, 5.1, 5.2, 5.5_
- [ ] 2.2 /uploadエンドポイントでストレージ保存と状態返却を行う
  - Supabase Storage `tenant-{id}/docs/{docId}`へ保存し、サイズ/MIME違反は400で返却
  - 成功/失敗の状態をUIに返し、非PDFや保存失敗時の理由を含める
  - _Requirements: 1.1, 1.3, 4.2_

- [ ] 3. 解析・埋め込み・インデックスを実装する
- [ ] 3.1 pypdf + RecursiveCharacterTextSplitterでテキスト抽出とチャンク化を行い、失敗をUIへ通知する
  - 複数ページ対応とエラー時の状態`error`更新
  - _Requirements: 1.2, 2.1, 2.3_
- [ ] 3.2 OpenAI埋め込み生成とpgvector upsertを実装し、冪等・削除対応を確保する
  - UNIQUE(tenant_id, doc_id, chunk_hash)でON CONFLICT更新、doc削除時のベクトル全削除を提供
  - _Requirements: 2.2, 2.4, 2.5, 4.2_
- [ ] 3.3 ingest_jobs/documentsに処理状態を記録し、エラー/成功をUIに返す
  - 抽出・埋め込み各ステップのステータスとエラー理由を保存
  - _Requirements: 1.3, 2.3_

- [ ] 4. 質問応答フローを実装する
- [ ] 4.1 Retrieverでtop-k取得し、出典付き回答と空振り時メッセージを返す
  - pgvector類似検索でchunks+metadataを取得し、該当なしの場合の応答を返却
  - _Requirements: 3.1, 3.3_
- [ ] 4.2 LLMストリーミング回答をUIへ配信し、typing/streaming表示とMarkdownレンダリングを整備する
  - citations（文書名/ページ）を含めて返却し、UIでreact-markdown表示
  - _Requirements: 3.2, 3.4, 5.1_
- [ ] 4.3 セッション履歴をSupabase Postgres/kvに保存し、ユーザーと関連付けて再利用する
  - sessionId未指定時の発行、TTL/最大履歴長の適用
  - _Requirements: 3.5, 4.4_

- [ ] 5. テナント隔離とRLS/ストレージ境界を設定する
- [ ] 5.1 Postgres RLSポリシーと`SET app.tenant_id`適用を作成し、Storageバケットもtenant単位に固定する
  - documents/ingest_jobs/vectors/chat_sessions全テーブルにRLSを適用
  - _Requirements: 4.2, 4.3_
- [ ] 5.2 ログ/トレースでAPIキーやPIIをマスクし、HTTPS強制設定を確認する
  - LLM/Storage/DB接続ログの秘匿とサーキットブレーカー/タイムアウト設定
  - _Requirements: 4.4, 4.5_

- [ ] 6. 可観測性とUXフィードバックを整備する
- [ ] 6.1 ingestion_duration/embedding_throughput/chat_latencyを計測し、閾値超過でアラートを送出する
  - OTel exporter→Prometheus互換、阈値設定をConfig化
  - _Requirements: 5.3, 5.4_
- [ ] 6.2 成功・失敗メッセージと再試行UI、ローカライズ対応を統一する
  - Upload/Chat双方で2秒以内の成功表示とユーザーフレンドリーなエラー表示
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 7. テスト（E2E除外）を実施する
- [ ] 7.1 ユニットテスト: パーサー、チャンク化、authミドル、ベクトル冪等性を検証
  - _Requirements: 1.2, 2.1, 2.4, 4.1_
- [ ] 7.2 結合テスト: /upload→抽出→indexと/chat（LLMモック）でテナント隔離を確認
  - _Requirements: 1.1, 2.2, 3.1, 4.2, 4.3_
- [ ] 7.3 性能テスト: 50MBアップロードとtop-k検索のレイテンシを計測し、アラート閾値を検証
  - _Requirements: 1.1, 2.1, 5.3, 5.4_
