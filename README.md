# ✨ Svelte Site Blog

誰でも、簡単に、プロ級のブログを。
SvelteKit を活用した、モダンで高速な完全無料ブログシステムです。

---

## 📖 ユーザーガイド

プロジェクトのセットアップ、運用、デプロイ方法については、以下の総合ドキュメントをご覧ください。

### **[📚 総合ドキュメント (日本語)](./Docs/README.md)**

1.  **[はじめる準備 (ローカル構築)](./Docs/Setup-Local.md)**
2.  **[完全無料で本番公開 (Render × Turso)](./Docs/Deployment-Render.md)**
3.  **[執筆・管理マニュアル](./Docs/User-Manual.md)**
4.  **[トラブルシューティング](./Docs/Troubleshooting.md)**

---

## 🚀 クイックスタート (開発者向け)

```bash
# 依存関係のインストール
pnpm install

# セットアップと開発サーバー起動
bash setup.sh
pnpm run dev

# ポートを指定して起動
pnpm run dev -- --port 8080

# ビルドとプレビュー
pnpm run build
pnpm run preview -- --port 8080
```

---

## 📝 コミット規約

コミットメッセージは以下の形式で統一してください：
`[Emoji] [Prefix]: [Summary]`

例: `✨ feat: サムネイル機能の追加`

| Prefix | 内容 | Prefix | 内容 |
| :--- | :--- | :--- | :--- |
| `feat` ✨ | 新機能 | `fix` 🐛 | 修正 |
| `ui` 💄 | デザイン | `docs` 📝 | ドキュメント |
| `refactor` ♻️ | リファクタ | `chore` 🔧 | 設定・雑務 |