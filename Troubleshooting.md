# Troubleshooting

## `better-sqlite3` ネイティブバイナリエラー

開発サーバー起動時に以下のようなエラーが出た場合：

```
Error: Could not locate the bindings file. Tried:
 → .../better_sqlite3.node
```

これは `better-sqlite3` のネイティブバイナリが正しくビルドされていないことが原因です。

### 解決方法

1. 以下のコマンドで依存関係を再インストール：

   ```bash
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

2. `better-sqlite3` を再構築：

   ```bash
   cd node_modules/better-sqlite3
   npm rebuild
   cd ../..
   ```

3. サーバーを再起動：
   ```bash
   pnpm run dev
   ```

### 追加のトラブルシューティング

もし上記で解決しない場合は、Python とビルドツールがインストールされていることを確認してください：

```bash
# Ubuntu/Debianの場合
sudo apt-get update
sudo apt-get install python3 build-essential

# その後、強制的に再インストール
pnpm install --force
```
