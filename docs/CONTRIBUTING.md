# Contributing to RAG_PDF

このプロジェクトに貢献していただきありがとうございます！

## 開発フロー

このプロジェクトは [GitHub Flow](./docs/GITHUB_FLOW.md) を採用しています。
詳細は [GitHub Flow 運用ガイド](./docs/GITHUB_FLOW.md) をご覧ください。

## クイックスタート

1. **リポジトリをフォーク**（外部コントリビューターの場合）

2. **ブランチを作成**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **変更をコミット**

   ```bash
   git commit -m "feat: add new feature"
   ```

4. **プッシュして PR を作成**
   ```bash
   git push origin feature/your-feature-name
   ```

## コーディング規約

### Frontend (TypeScript/React)

- TypeScript strict mode を使用
- コンポーネントは PascalCase、関数は camelCase
- ESLint と Biome でフォーマット
- テストは `__tests__/` ディレクトリに配置

### Backend (Python)

- Python 3.12+ を使用
- 型ヒントを必ず記述
- テストは `tests/` ディレクトリに配置
- Poetry で依存関係を管理

## テスト

変更を加えた際は、必ずテストを追加・更新してください。

```bash
# Frontend
npm run test

# Backend
poetry run pytest
```

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従ってください。

例:

- `feat: add user authentication`
- `fix: resolve upload error`
- `docs: update README`
- `test: add unit tests for chat service`

## Pull Request

PR を作成する際は、以下を確認してください：

- [ ] 全てのテストが通過していること
- [ ] Linter によるチェックが通過していること
- [ ] PR テンプレートに従って説明を記入していること
- [ ] 必要に応じてドキュメントを更新していること

## 質問やサポート

不明点がある場合は、Issue を作成するか、PR でコメントしてください。
