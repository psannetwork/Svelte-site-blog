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

## ❓ ログインボタンを押すと 403 (Forbidden) エラーになる

### 原因1: CSRF保護（クロスサイト攻撃対策）によるブロック

SvelteKit のセキュリティ機能が、現在のドメインを「信頼されていない送信元」と判断してリクエストを遮断しています。Cloudflare やリバースプロキシ（Nginx 等）を使用している場合に発生しやすい問題です。

### 解決策:

1.  `svelte.config.js` を開き、`kit.csrf.trustedOrigins` に自分のドメインを追加します。
2.  **重要:** 必ず `https://` または `http://` から始まるフルURLで指定してください。

```javascript
// svelte.config.js の例
const config = {
	kit: {
		csrf: {
			trustedOrigins: [
				'https://blog.psannetwork.net',
				'https://blogtest.psannetwork.net'
			]
		}
	}
};
```

---

## ❓ ログイン時に「認証に失敗しました」と出る / `ERR_BLOCKED_BY_CLIENT`

### 原因: Cloudflare Turnstile（画像認証）がブロックされている

ブラウザの広告ブロック拡張機能（uBlock Origin, AdBlock 等）が、セキュリティ用の認証スクリプトを「広告」と誤認して読み込みをブロックしています。

### 解決策:

1.  ブラウザの広告ブロックをオフにするか、サイトをホワイトリストに追加してください。
2.  別のブラウザ（シークレットモード等）で試してください。
3.  管理者としてログインできる場合は、ダッシュボードの **[設定]** から **[Enable Cloudflare Turnstile]** を `OFF` にすることで、画像認証を無効化できます。

---

## ❓ `Cross-site POST form submissions are forbidden`


### 原因: CSRF保護によるブロック

SvelteKit のセキュリティ機能（CSRF保護）が、リクエストの送信元が正しくない（あるいは不明）と判断して POST 送信をブロックしています。主に Cloudflare Tunnel などのリバースプロキシを通した際や、プレビューモード実行時に発生します。

### 解決策:

#### 方法1: `ORIGIN` 環境変数を設定する（最推奨）

実行環境（Render.com やサーバーの環境変数）に `ORIGIN` を追加します。これが最も安全で正しい解決策です。

- **Key**: `ORIGIN`
- **Value**: `https://your-domain.com` (自分のサイトのURL)

#### 方法2: `svelte.config.js` で特定のオリジンを許可する（推奨）

特定のドメインからのアクセスを許可します。`checkOrigin: false` よりも安全で、非推奨の警告も出ません。

1.  `svelte.config.js` を開きます。
2.  `kit` セクションに `csrf.trustedOrigins` を追加します。

```javascript
// svelte.config.js
import { env } from '$env/dynamic/private';

const config = {
	kit: {
		csrf: {
			checkOrigin: true, // オリジンチェックを有効にする（デフォルト）
			trustedOrigins: [
				'https://blog.psannetwork.net',
				'http://localhost:5174', // 開発サーバーのデフォルトポート
				'http://localhost:5892', // プレビューサーバーのデフォルトポート
				...(env.TRUSTED_ORIGINS ? env.TRUSTED_ORIGINS.split(',') : [])
			]
		}
	}
};
```

#### 方法3: `svelte.config.js` でチェックを完全に無効にする

Cloudflare Tunnel などでオリジンが動的に変わる場合や、手っ取り早く解決したい場合に有効です。

1.  `svelte.config.js` を開きます。
2.  `kit` セクションの中に以下を追記します。

```javascript
// svelte.config.js
const config = {
	kit: {
		csrf: {
			checkOrigin: false
		}
	}
};
```

※ SvelteKit のバージョンによっては非推奨の警告が出ますが、動作に支障はありません。

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
