# 🔧 トラブルシューティング

困ったときは、まずここを確認してください。

---

## ❓ ログインができない

### 1. 初回セットアップがまだ

初めて起動した際は、まず管理者ユーザーを作る必要があります。画面の指示に従って登録してください。

### 2. ID/パスワードを忘れた

ローカル環境の場合は `blog.db` ファイルを削除して再起動すればリセットされますが、Turso を使っている場合は Turso の管理画面からデータを操作する必要があります。

---

## ❓ 画像が消えてしまった

### 原因: 保存先が「Local」になっている

Render などの無料サーバーは、再起動時にファイルをリセットします。

### 解決策:

1.  ダッシュボードの **[設定]** を開く。
2.  **[Storage Strategy]** を **`SQLite Database`** に変更して保存する。
    これで、画像データがデータベースに保存されるようになり、再起動しても消えなくなります。

---

## ❓ 「JWT error / Base64 error」が出る

### 原因: Turso の認証トークンが正しくない

`TURSO_DB_AUTH_TOKEN` に、誤って URL (libsql://...) を入れてしまっているか、トークンのコピーミスです。

### 解決策:

1.  Turso のダッシュボードで、もう一度 **[Generate Token]** をクリック。
2.  コピーした長い文字列を、Render の環境変数に正しく貼り付けてください。

---

## ❓ サイトの動作が遅い

### 原因: Render の無料プランの特性

しばらくアクセスがないと、サーバーが「スリープ」します。最初のアクセスには 30秒〜1分ほどかかりますが、一度起動すればその後は高速に動きます。
高速化したい場合は、Render の有料プラン（Starter等）へのアップグレードをご検討ください。

### 解決方法

1.  プロジェクトルートにある `vite.config.ts` を開きます。
2.  `allowedHosts` 設定に、エラーメッセージに表示されたドメインを追加します。

```typescript
// vite.config.ts の例
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    // 開発サーバー用
    allowedHosts: ['your-domain.com']
  },
  preview: {
    // pnpm preview 用
    allowedHosts: ['your-domain.com']
  }
});
```

---

## ❓ `Blocked request. This host (...) is not allowed`

### 原因: セキュリティ上の制限

Vite（開発サーバーやプレビューサーバー）が、許可されていないドメインからのアクセスをブロックしています。独自ドメインを割り当てた際や、特定の環境で実行した際に発生します。

### 解決策:

1.  `vite.config.ts` を開きます。
2.  `server.allowedHosts` (開発時) または `preview.allowedHosts` (プレビュー時) に、自分のドメインを追記してください。

```typescript
export default defineConfig({
  // ...
  server: {
    allowedHosts: ['blog.psannetwork.net']
  },
  preview: {
    allowedHosts: ['blog.psannetwork.net']
  }
});
```

※ すべてのホストを許可したい場合は `'all'` を指定することも可能ですが、セキュリティのため特定のドメインのみを指定することを推奨します。

---

## ❓ `Cross-site POST form submissions are forbidden`

### 原因: CSRF保護によるブロック

SvelteKit のセキュリティ機能（CSRF保護）が、リクエストの送信元が正しくない（あるいは不明）と判断して POST 送信をブロックしています。主にリバースプロキシ（Cloudflare等）を通した際に発生します。

### 解決策:

#### 方法1: `ORIGIN` 環境変数を設定する（最推奨）

本番環境（Render.com 等）の環境変数に `ORIGIN` を追加します。これが最も安全で正しい解決策です。

- **Key**: `ORIGIN`
- **Value**: `https://your-domain.com` (自分のサイトのURL)

#### 方法2: `svelte.config.js` でチェックを無効にする

環境変数の設定が難しい場合、コードから直接チェックを無効にできます（※SvelteKit 側で非推奨の警告が出ますが動作します）。

1.  `svelte.config.js` を開きます。
2.  `kit` セクションの中に `csrf: { checkOrigin: false }` を追記します。

```javascript
// svelte.config.js
const config = {
  kit: {
    csrf: {
      checkOrigin: false,
    },
    // ...
  }
};
```

---

## ❓ `better-sqlite3` ネイティブバイナリエラー

開発サーバー起動時に `Error: Could not locate the bindings file` というエラーが出た場合、ネイティブバイナリが正しくビルドされていない可能性があります。

### 解決方法

1. 依存関係を再構築：
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. 手動で再構築を試みる：
   ```bash
   cd node_modules/better-sqlite3
   npm rebuild
   cd ../..
   ```

3. Python とビルドツールがインストールされているか確認（Linuxの場合）：
   ```bash
   sudo apt-get install python3 build-essential
   ```
