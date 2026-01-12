# ビルドステージ
FROM node:20-alpine AS builder
WORKDIR /app

# pnpmの有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依存関係ファイルのコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係のインストール
RUN pnpm install --frozen-lockfile

# ソースコードのコピー
COPY . .

# アプリケーションのビルド
RUN pnpm run build

# 実行ステージ
FROM node:20-alpine AS runner
WORKDIR /app

# pnpmの有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# 必要なファイルのコピー
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# 本番依存関係のみインストール
RUN pnpm install --prod --frozen-lockfile

# 環境変数の設定
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/blog.db

# データベースディレクトリの作成
RUN mkdir -p /app/data

# ポートの公開
EXPOSE 3000

# 起動コマンド
CMD ["node", "build"]
