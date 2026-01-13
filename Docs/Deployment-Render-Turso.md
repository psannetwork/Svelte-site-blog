# ☁️ 本番デプロイガイド (Render.com × Turso)

Render.com の無料枠と Turso を組み合わせることで、**完全無料（クレジットカード登録不要な範囲）**でブログを公開する方法を解説します。

---

## 💾 ステップ1: Turso でデータベースを準備する

Render の無料プランではファイル保存（Disk）が有料なため、データベースは外部の **Turso** を使用します。

1.  [Turso公式サイト](https://turso.tech/)でアカウントを作成。
2.  **[Create Database]** をクリックし、DBを作成。
3.  **URL** (`libsql://...`) と **Auth Token** をメモしてください。

---

## 🚀 ステップ2: Render.com で公開する

### 1. コードの準備
最新のコードを GitHub リポジトリに `push` しておきます。

### 2. Web Service の作成
1.  [Render](https://render.com/) にログインし、**[New +]** -> **[Web Service]** を選択。
2.  対象の GitHub リポジトリを連携します。

### 3. 基本設定
*   **Runtime**: `Docker` (自動選択されるはずです)
*   **Region**: `Singapore` を推奨。

### 4. 環境変数の設定 (重要)
**[Advanced]** -> **[Add Environment Variable]** で以下を必ず追加してください。

| キー | 値 | 説明 |
| :--- | :--- | :--- |
| `TURSO_DB_URL` | `libsql://...` | Turso でメモした URL |
| `TURSO_DB_AUTH_TOKEN` | `eyJhbGci...` | Turso でメモした Token |
| `NODE_ENV` | `production` | 本番モード |

### 5. デプロイ
**[Create Web Service]** をクリック。5〜10分ほどで公開が完了し、URLが発行されます。

---

## ⚠️ デプロイ後の重要設定

公開されたサイトの管理画面にログインし、**[設定 (Settings)]** -> **[Storage Strategy]** を開き、**`SQLite Database`** に変更してください。

*   **Local Filesystem**: コンテナ再起動時に画像が消えます。
*   **SQLite Database**: 画像がデータベース（Turso）内に保存され、永続化されます。

---

## 🔄 更新（アップデート）の手順

自分のPCでコードを修正した後、GitHub に `push` するだけで、Render が自動的に検知して再ビルド・再デプロイを行います。
