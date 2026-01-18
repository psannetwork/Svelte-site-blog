# ✨ 機能ガイド

Svelte Site Blog に搭載されている主要な機能の使い方を解説します。

---

## ✍️ リッチエディタ (Editor.js)

投稿や固定ページの作成には、直感的なブロック形式エディタを採用しています。

### Editor Features
- **Rich Text**: Supports Header, List, Quote, Code, Image, Embeds, Table, Checklist, Warning, Delimiter, InlineCode, Underline, and **Link**.
- **Multimedia**: Drag & drop image uploads, embed videos from YouTube/Vimeo/Twitter.
- **Drafting**: Save as draft, preview mode, and publish scheduling options.
- **Distraction Free**: Clean writing interface.

---

## 💬 コメントシステム


*   **スレッド表示**: 誰が誰に返信したかが一目でわかる階層構造。
*   **リプライ通知**: 自分のコメントに返信があった際、管理画面で通知を受け取れます。
*   **匿名コメント**: 設定により、ログイン不要のコメント投稿も許可できます。
*   **Adminバッジ**: 管理者のコメントには特別なバッジが表示され、信頼性を高めます。

---

## 📊 ダッシュボード (Admin)

*   **アクセス統計**: 今日のアクセス数やユニークユーザー数をグラフで確認。
*   **固定ページ管理**: ホームや About ページの内容をエディタで直接編集。
*   **DBステータス**: 現在ローカルDBを使っているか、Tursoを使っているかを一目で確認。
*   **自動バックアップ**: 指定した間隔でデータベースのコピーを自動作成（ローカルDB時のみ）。
