# セキュリティベストプラクティス

このドキュメントでは、PSA Network Blog を安全に運用するためのベストプラクティスを説明します。

## 🔐 重要な脆弱性対策

### 1. SQL インジェクション対策

本アプリケーションではプリペアドステートメントを使用して SQL インジェクションを防止しています。

**実装場所**: `src/lib/server/db.ts`

```typescript
// 安全なクエリ実行
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const result = stmt.get(userId); // パラメータは自動的にエスケープされる
```

**注意点**:
- 生の SQL クエリを直接実行しないでください
- ユーザー入力は必ずパラメータ化されたクエリで使用してください

### 2. CSRF (Cross-Site Request Forgery) 対策

SvelteKit の組み込み CSRF 保護を有効にし、信頼できるオリジンを設定しています。

**設定場所**: `svelte.config.js`

```javascript
import { env } from '$env/dynamic/private';

const config = {
    kit: {
        csrf: {
            checkOrigin: true,
            trustedOrigins: [
                'https://blog.psannetwork.net',
                'http://localhost:5174',
                'http://localhost:5892',
                ...(env.TRUSTED_ORIGINS ? env.TRUSTED_ORIGINS.split(',') : [])
            ]
        }
    }
};
```

**環境変数での設定**:
```env
TRUSTED_ORIGINS=https://your-domain.com,https://another-domain.com
```

### 3. ファイルアップロードのセキュリティ

悪意のあるファイルのアップロードを防ぐため、多層防御を実装しています。

**検証フロー**:
1. **MIME タイプチェック**: ファイルの実際の形式を検証
2. **拡張子チェック**: 許可された拡張子のみを許可
3. **マジックバイト検証**: ファイルヘッダーを実際に確認
4. **サイズ制限**: 最大ファイルサイズを超えないか確認

**許可されているファイル形式**:
- 画像: JPG, JPEG, PNG, GIF, WebP, SVG
- ドキュメント: PDF, DOC, DOCX, TXT, MD

**設定場所**: `.env`
```env
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp,svg,pdf,doc,docx,txt,md
MAX_UPLOAD_SIZE=10485760  # 10MB
```

### 4. コンテンツセキュリティポリシー (CSP)

XSS (Cross-Site Scripting) 攻撃を軽減するため、CSP ヘッダーを設定しています。

**設定場所**: `src/hooks.server.ts`

許可されているソース:
- スクリプト: `'self'`, `'unsafe-inline'` (SvelteKit 必要), CDN
- スタイル: `'self'`, `'unsafe-inline'`, Google Fonts
- 画像: `'self'`, データ URI, 外部画像ホスト
- フォント: `'self'`, Google Fonts

## 🔑 認証と認可

### パスワードセキュリティ

- **ハッシュ化**: bcrypt アルゴリズムを使用
- **ソルト**: ランダムソルトを自動生成
- **ラウンド数**: デフォルト 12 回（`.env` で変更可能）

```env
BCRYPT_ROUNDS=12
SESSION_SECRET=change-this-to-a-secure-random-string
```

### セッション管理

- セッション ID は暗号化的に安全な乱数で生成
- セッションデータはサーバー側で管理
- ログアウト時にセッションを無効化

## 🗄️ データベースセキュリティ

### SQLite ローカル保存時

```env
DATABASE_URL=file:./data/blog.db
DATABASE_TYPE=sqlite
```

**推奨事項**:
- データベースファイルへのアクセス権限を制限
- 定期的なバックアップを実施
- 可能的话使用暗号化ファイルシステム

### Turso (LibSQL) 使用時

```env
DATABASE_URL=libsql://your-db-name.turso.io
DATABASE_AUTH_TOKEN=your-auth-token
DATABASE_TYPE=turso
```

**推奨事項**:
- 認証トークンは絶対にバージョン管理に含めない
- トークンは定期的にローテーション
- 最小権限の原則に従う

## 📦 バックアップとリカバリ

### 自動バックアップ設定

```env
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
AUTO_BACKUP_ENABLED=true
```

### バックアップの種類

1. **データベースバックアップ**: SQLite/Turso データのエクスポート
2. **ファイルバックアップ**: アップロードされた画像・ファイル
3. **設定バックアップ**: `.env` とカスタマイズ設定

### 手動バックアップコマンド

```bash
# データベースのエクスポート
sqlite3 data/blog.db ".dump" > backup_$(date +%Y%m%d).sql

# または管理画面からバックアップをダウンロード
```

## 🌐 ネットワークセキュリティ

### 許可ホストの設定

```env
ALLOWED_HOSTS=blogtest.psannetwork.net,blog.psannetwork.net
HOST=localhost
PORT=5174
```

### HTTPS の強制（本番環境）

- 本番環境では必ず HTTPS を使用
- Let's Encrypt などの無料 SSL 証明書を活用
- HSTS ヘッダーの設定を検討

## 🔍 監視とロギング

### 推奨する監視項目

- 不正なログイン試行
- 通常と異なるファイルアップロード
- 大量のリクエスト（DoS 攻撃の可能性）
- データベースエラー

### ログの保存

- サーバーログは最低 30 日間保存
- 機密情報（パスワード、トークン）はログに記録しない
- 定期的にログをレビュー

## 🚨 インシデント対応

### 問題が発生した場合

1. **即時対応**:
   - 影響範囲を特定
   - 必要に応じてサービスを一時停止
   
2. **調査**:
   - ログを確認
   - 脆弱性の原因を特定
   
3. **修正**:
   - セキュリティパッチを適用
   - 設定を見直し
   
4. **再発防止**:
   - 根本原因を解消
   - 監視体制を強化

## 📋 セキュリティチェックリスト

### 導入前に確認

- [ ] `SESSION_SECRET` をランダムな文字列に変更
- [ ] `TRUSTED_ORIGINS` を適切に設定
- [ ] `ALLOWED_HOSTS` を制限
- [ ] データベースのアクセス権限を確認
- [ ] バックアップ設定を確認

### 定期的なメンテナンス

- [ ] 依存パッケージのアップデート
- [ ] セキュリティログのレビュー
- [ ] バックアップのテスト復元
- [ ] 不要なユーザーアカウントの削除
- [ ] 古いセッションデータのクリーンアップ

## 🔗 参考リンク

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SvelteKit Security Guide](https://kit.svelte.dev/docs/security)
- [SQLite Security Best Practices](https://www.sqlite.org/security.html)

---

**注意**: このドキュメントは一般的なガイドラインです。具体的なセキュリティ要件は、あなたの運用環境に合わせて調整してください。
