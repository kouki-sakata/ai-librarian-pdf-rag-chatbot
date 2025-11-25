# Implementation Plan

## Phase 1: Production Deployment & Authentication

- [x] 1. Supabase Auth クライアント統合
- [x] 1.1 (P) ブラウザクライアント作成

  - `lib/supabase/client.ts` で `createBrowserClient()` を実装
  - 環境変数 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` を使用
  - _Requirements: 2.1, 2.7_

- [x] 1.2 (P) サーバークライアント作成

  - `lib/supabase/server.ts` で `createServerClient()` を実装
  - `@supabase/ssr` で Cookie 管理を統合
  - _Requirements: 2.1, 2.7_

- [x] 2. ログイン機能実装
- [x] 2.1 ミドルウェアでルート保護

  - `middleware.ts` で未認証ユーザーを `/login` にリダイレクト
  - 公開ルート（`/login`, `/auth/callback`）を除外
  - _Requirements: 2.1_

- [x] 2.2 ログインページ作成

  - `/app/login/page.tsx` で Email/Password フォーム実装
  - 「ゲストログイン」ボタン（`signInAnonymously()`）を追加
  - エラー時に Toast 表示
  - _Requirements: 2.2, 2.3_

- [x] 2.3 認証コールバック処理

  - `/app/auth/callback/route.ts` でメール認証リンクのコールバック実装
  - コード交換後に `/` へリダイレクト
  - _Requirements: 2.6_

- [x] 3. チャットフックの認証対応
- [x] 3.1 (P) Token 取得ロジック変更

  - `hooks/use-chat.ts` で `supabase.auth.getSession()` から token 取得
  - localStorage ロジックを削除
  - _Requirements: 2.7_

- [x] 3.2 (P) タイムアウト処理追加

  - `AbortController` で 30 秒タイムアウトを実装
  - タイムアウト時に Toast エラー表示
  - `NEXT_PUBLIC_API_URL` 環境変数を使用
  - _Requirements: 3.5_

- [x] 4. Upload フォームのタイムアウト対応
- [x] 4.1 (P) Upload API へのタイムアウト追加

  - `components/upload-form.tsx` で `AbortController` を追加
  - 30 秒超過時にエラー Toast 表示
  - _Requirements: 3.5_

- [x] 5. デプロイ設定
- [x] 5.1 (P) 環境変数ドキュメント作成

  - `.env.example` を Frontend/Backend に作成
  - Vercel/Render で必要な環境変数をリスト化
  - _Requirements: 1.4, 1.5_

- [x] 5.2 README 更新

  - デプロイ URL をトップに追加（`🌐 **Live Demo**: [URL]`）
  - 環境変数設定手順を記載
  - _Requirements: 1.3_

- [x] 5.3 Backend DISABLE_AUTH 無効化

  - Render 環境変数で `DISABLE_AUTH=false` を設定
  - Production デプロイ後に動作確認
  - _Requirements: 2.1_

- [x] 6. Supabase ダッシュボード設定
- [x] 6.1 (P) Auth プロバイダー有効化

  - Supabase ダッシュボードで Email provider を有効化
  - Anonymous Sign-ins を有効化
  - _Requirements: 2.3_

- [x] 7. Phase 1 統合テスト
- [x] 7.1\* タイムアウト処理テスト
  - Chat API 呼び出しで 30 秒超過を模擬
  - Upload API 呼び出しで 30 秒超過を模擬
  - Toast エラー表示を確認
  - _Requirements: 3.5_

---

## Phase 2: Enhanced UX & Feature Completeness

- [x] 8. セッション状態管理
- [x] 8.1 (P) SessionContext 作成

  - `contexts/session-context.tsx` で `sessionId` と `setSessionId` を管理
  - `SessionProvider` で app layout をラップ
  - _Requirements: 4.2_

- [x] 9. Chat History サイドバー UI
- [x] 9.1 shadcn/ui Sidebar コンポーネント追加

  - `npx shadcn add sidebar` でインストール
  - App layout に Sidebar を統合（左側配置）
  - _Requirements: 4.1_

- [x] 9.2 HistorySidebar コンポーネント実装

  - セッション一覧を取得（`GET /api/v1/chat/sessions?limit=20`）
  - セッション選択時に `SessionContext` を更新
  - セッションタイトル（最初のメッセージ 30 文字）を表示
  - 「New Chat」ボタンを追加
  - _Requirements: 4.1, 4.2, 4.7, 4.8_

- [x] 9.3 セッション削除機能

  - 削除ボタンクリック時に確認モーダル表示
  - `DELETE /api/v1/chat/sessions/{id}` を呼び出し
  - 削除後にリストを更新
  - _Requirements: 4.6_

- [x] 9.4 無限スクロール実装

  - 初期 20 件取得後、スクロール時に追加取得（offset 管理）
  - _Requirements: 4.5_

- [x] 10. Chat History Backend API
- [x] 10.1 (P) GET /sessions エンドポイント追加

  - `backend/app/api/v1/endpoints/chat.py` に `list_sessions` を追加
  - `HistoryService.list_sessions()` を呼び出し
  - `limit`, `offset` パラメータでページネーション実装
  - セッション title を最初のユーザーメッセージから生成
  - _Requirements: 4.1, 4.5_

- [x] 10.2 (P) DELETE /sessions/{id} エンドポイント追加

  - `chat.py` に `delete_session` を追加
  - `HistoryService.delete_session()` で cascade 削除
  - tenant_id 確認後に削除
  - _Requirements: 4.6_

- [x] 10.3 (P) HistoryService メソッド拡張

  - `backend/app/services/history.py` に `list_sessions()` を追加
  - `delete_session()` を追加（chat_messages cascade）
  - _Requirements: 4.1, 4.6_

- [x] 11. Document Management UI
- [x] 11.1 DocumentList コンポーネント実装

  - サイドバー内にタブ追加（Chat History と並列）
  - `GET /api/v1/documents?sort=created_at&order=desc` でドキュメント一覧取得
  - Filename, Size, Upload date を表示
  - _Requirements: 5.1, 5.5, 5.7_

- [x] 11.2 ドキュメント削除機能

  - 削除ボタンクリック時に確認モーダル表示
  - `DELETE /api/v1/documents/{id}` を呼び出し
  - 削除後にリストを更新
  - _Requirements: 5.2, 5.3, 5.6_

- [x] 12. Document Management Backend API
- [x] 12.1 (P) documents.py エンドポイントファイル作成

  - `backend/app/api/v1/endpoints/documents.py` を新規作成
  - Router を main app に登録
  - _Requirements: 5.1, 5.2_

- [x] 12.2 (P) GET /documents エンドポイント実装

  - `list_documents` で documents テーブルから取得
  - `sort`, `order` パラメータでソート対応
  - tenant_id フィルタ適用
  - _Requirements: 5.1, 5.7_

- [x] 12.3 (P) DELETE /documents/{id} エンドポイント実装

  - Supabase Storage からファイル削除
  - documents テーブルから削除
  - vectors テーブルから関連ベクトル削除（cascade または明示的）
  - トランザクション失敗時にロールバック
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 13. Citation クリック可能リンク実装
- [x] 13.1 (P) chat-message.tsx 拡張

  - Citation テキストを clickable link に変換（アイコン付き）
  - クリック時に `GET /api/v1/documents/{id}/url?page={N}` を呼び出し
  - Signed URL を新しいタブで開く（`window.open()`）
  - _Requirements: 6.2, 6.3_

- [x] 13.2 (P) GET /documents/{id}/url エンドポイント実装

  - `documents.py` に `get_document_url` を追加
  - Supabase Storage で Signed URL 生成（1 時間有効）
  - `page` パラメータがある場合 `#page=N` フラグメントを追加
  - _Requirements: 6.4_

- [ ] 14. レスポンシブデザイン対応
- [ ] 14.1 (P) モバイルレイアウト調整

  - Tailwind breakpoints（`sm`, `md`, `lg`）で Sidebar を調整
  - デスクトップ（`lg:`）で常時表示、モバイルでハンバーガーメニュー
  - Chat Interface のモバイル最適化（縦スクロール）
  - _Requirements: 3.3_

- [ ] 15. Phase 2 統合テスト
- [ ] 15.1\* モバイルテスト
  - Chrome (Android) でログイン → チャット → History → Documents
  - _Requirements: 3.3_
