# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: ai-librarian-pdf-rag-chatbot
- **Discovery Scope**: New Feature
- **Key Findings**:
  - Next.js 15が2025年10月にリリースされ、App Routerとサーバーアクションが安定化しているためSSR/ストリーミングUIに採用可能。
  - LangChain 1.0（2025-10）とLlamaIndex 0.12系でRAGパイプラインのエコシステムが安定化。FastAPI 0.115系と互換性が確認できる。
  - フロントは学習コストを抑えるTailwind + shadcn/ui + react-markdown構成、LLMはgpt-4o-mini／text-embedding-3-smallをデフォルト利用し低コスト・多言語を両立。

## Research Log

### 技術スタック最新版の確認
- **Context**: フロント・バック・LLMライブラリの現行安定版を把握し互換性を確保する必要がある。
- **Sources Consulted**: Next.js 15リリースノート、LangChain 1.0.0リリースブログ、FastAPI 0.115.10リリース情報。
- **Findings**:
  - Next.js 15 (2025-10) は React 19 RCを前提とし、Server Actionsが安定。Node 18+ 推奨。
  - LangChain 1.0 (2025-10-22) はLCEL正式化、OpenAI他主要モデルクライアントのBreakingなし。
  - FastAPI 0.115.10 (2025-10) は Pydantic v2 ベース。ASGIサーバーは Uvicorn 0.30+ 推奨。
- **Implications**: フロントは Next.js 15 / React 19 に合わせ、バックエンドは Pydantic v2 型定義でAPI契約を明記。LangChain/LlamaIndexバージョン固定で互換性を確保。

### ベクトルストア選定と移行性
- **Context**: 初期は単一ノードで十分だが、将来のスケールを考慮し移行コストを抑えたい。
- **Sources Consulted**: Chroma 1.3.3ドキュメント、pgvector運用事例（社内知見）。
- **Findings**:
  - Chromaはセットアップ容易、ローカル永続化に対応し、LangChain/LlamaIndex双方で一級サポート。
  - pgvectorはPostgreSQL拡張としてスケールとバックアップ運用が容易。
- **Implications**: 抽象化層（VectorStore Port）を用意し、Chromaをデフォルト実装、pgvectorアダプタを後置きできる設計にする。

### 埋め込みモデル・トークナイザ
- **Context**: 日本語PDFを扱うため多言語対応かつ低コストの埋め込みが必要。
- **Sources Consulted**: OpenAI text-embedding-3-small APIドキュメント (2024) と社内運用実績。
- **Findings**:
  - text-embedding-3-smallは多言語対応・低コスト。最大入力8k tokensで十分。
  - ローカル代替として bge-m3 を後備案に検討。
- **Implications**: APIキー管理とモデル選択を設定化し、将来ローカルモデルに差し替えやすいポートを設計。

### UIスタックとレンダリング
- **Context**: 学習コストと実装速度を重視したUI技術選定。
- **Sources Consulted**: shadcn/ui公式ドキュメント、Tailwind CSSガイド、react-markdown使用例。
- **Findings**:
  - Tailwind + shadcn/ui でフォーム・チャットUIを高速構築でき、Lucideアイコンがデフォルト利用可。
  - react-markdownでLLM回答を安全にMarkdownレンダリング可能（コードブロック含む）。
- **Implications**: UIはこれらを前提にコンポーネント設計し、ストリーミング回答を逐次レンダリングする。

### アーキテクチャパターン評価
- **Context**: RAGワークロードに適した境界設計を選定。
- **Alternatives**: Layered, Hexagonal, Event-driven。
- **Findings**: HexagonalがAPI/UIとRAGコア（Retrieval+Generation）をポート/アダプタで分離し、ベクトルストア差し替えやモデル切替を容易にする。
- **Implications**: コアドメインを「Document管理」「Retrieval/QA」に分け、周辺をアダプタ化する。

### リスクと対策
- PDFパース精度: 画像ベースPDFは抽出失敗リスク → OCRパイプラインを後続拡張とし、現在はテキストPDFを前提にバリデーション。
- コスト/レイテンシ: 外部LLM依存 → キャッシュとトークン上限制御、ベクトルTop-k/Max tokensを設定値で調整。
- マルチテナント隔離: 単一DB/ベクトルストアでのテナント分離 → tenant_idパーティション、ストレージキー命名規約で隔離。

## Architecture Pattern Evaluation
| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Hexagonal | ポート/アダプタでUI・外部／内部サービスを分離 | ベクトルストア・LLM切替が容易。テスト性高 | アダプタ数が増える | 採用
| Layered | 典型3層 (UI/Service/Repo) | シンプル | インフラ依存がService層に漏れやすい | 不採用
| Event-driven | 非同期イベント中心 | スケール・緩結合 | 初期実装が過剰 | 将来通知/監査に限定

## Design Decisions
### Decision: ベクトルストア抽象化
- **Context**: 初期Chroma、将来pgvectorへ移行可能にしたい。
- **Alternatives Considered**: Chroma直結 / pgvector直結 / Port-Adapter抽象。
- **Selected Approach**: Port `VectorIndexPort` を定義し、ChromaAdapterを実装。pgvectorAdapterは拡張スロットとして後置き。
- **Rationale**: フレームワーク依存を隔離し、テナント分離と削除APIを統一。
- **Trade-offs**: 抽象化コスト増。
- **Follow-up**: 削除・再インデックスAPIの整合性テストを追加。

### Decision: チャットサービスのセッション管理
- **Context**: フォローアップ質問で履歴を使う要件。
- **Alternatives**: フロントのみ保持 / バックエンドセッションストア / トークン化した履歴圧縮。
- **Selected Approach**: バックエンド（Redis互換セッションストアを想定）に会話ID単位で履歴を保存し、LLM呼び出し前にコンテキスト圧縮。
- **Rationale**: マルチデバイスとスケールに備える。
- **Trade-offs**: セッションストア運用コスト。
- **Follow-up**: 圧縮アルゴリズム（summary chain）の実装タイミングを設計時に決定。

## Risks & Mitigations
- PDFバイナリサイズ肥大で遅延 → 最大50MB制限と非同期処理、キュー投入検討。
- LLM/API障害 → リトライとフォールバックモデル設定、タイムアウト明確化。
- テナント越境アクセス → すべてのデータキーにtenant_id prefix、認可ミドルで検証。

## References
- Next.js 15 Release (2025-10)
- LangChain 1.0.0 Release (2025-10)
- FastAPI 0.115.10 changelog
- Chroma 1.3.3 docs
