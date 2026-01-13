# 📚 Svelte Site Blog ドキュメント

Svelte Site Blog へようこそ。このプロジェクトは、SvelteKit、Lucia Auth、および libSQL (SQLite/Turso) を使用した、高速でモダンなフル機能ブログシステムです。

このドキュメントでは、ローカルでの開発から本番環境へのデプロイ、サイトのカスタマイズ方法まで詳しく解説します。

---

## 🗺️ 目次

1.  **[クイックスタート (ローカル構築)](./Setup-Local.md)**
    *   自分のパソコンでブログを動かすための手順。
2.  **[本番デプロイガイド (Render & Turso)](./Deployment-Render-Turso.md)**
    *   インターネット上に完全無料で公開する方法（推奨）。
3.  **[機能ガイド](./Features-Guide.md)**
    *   Editor.js を使った執筆、コメント管理、多言語対応などの解説。
4.  **[カスタマイズと設定](./Settings-Customization.md)**
    *   デザイン（CSS）、アイコン、セキュリティ（Turnstile）などの詳細設定。

---

## 🛠 テックスタック

*   **Frontend**: SvelteKit (Svelte 5 / Runes)
*   **Styling**: Tailwind CSS v4
*   **Database**: libSQL (Local SQLite or Remote Turso)
*   **Authentication**: Lucia Auth
*   **Editor**: Editor.js (Rich Text Editor)
*   **Deployment**: Docker (Compatible with Render, Railway, Fly.io etc.)
