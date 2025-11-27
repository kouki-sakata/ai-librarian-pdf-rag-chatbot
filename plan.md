# Google/OAuth ログイン・ログアウト実装 Plan

## スコープ
- Supabase Auth を用いた Google OAuth ログイン導線の追加
- 既存メール/匿名ログインとの共存
- ログアウト導線および未認証リダイレクトの強制

## ゴール
- ユーザーが Google でログインできる
- ログアウト後はセッションが破棄され `/login` に戻る
- 認証なしに保護ページへアクセスした場合は `/login` へリダイレクト

## 実装タスク
1. フロントエンド
   - `app/login` に Google ログインボタンを追加し、`signInWithOAuth` で `/auth/callback` へリダイレクト。
   - サイドバーにログアウトボタンを追加し、`signOut` → セッション破棄 → `/login` へ遷移。
   - `middleware.ts` を追加して全ページでセッション更新＋未認証時リダイレクトを有効化。
2. 設定
   - Supabase ダッシュボードで Google プロバイダを有効化し、リダイレクト URL を `http://localhost:3000/auth/callback` と本番ドメインで登録。
   - `.env` に `NEXT_PUBLIC_SUPABASE_*`（本番/開発両方）を設定。
3. 動作確認
   - ローカルで Google ログイン → `/` へ遷移することを確認。
   - サイドバーのログアウトで `/login` へ戻りセッションが消えることを確認。
   - 未認証で `/` へアクセス時に `/login` へリダイレクトされることを確認。
4. 品質チェック
   - `npm run lint --prefix frontend` を実行し、型・lint エラーが無いことを確認。

## リスク/留意点
- Supabase の redirect URL 未設定で 400 になる可能性。事前にダッシュボードで登録する。
- CSP の `connect-src` に Supabase ドメインが入っていない場合、OAuth 後のセッション取得が失敗する可能性がある。

## 完了条件
- 上記動作確認が手元で通り、lint が成功すること。
