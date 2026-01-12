# ビルドステージ
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ 
WORKDIR /app

# pnpmの有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依存関係ファイルのコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係のインストール (package.jsonの設定によりbetter-sqlite3等のビルドが許可される)
RUN pnpm install --frozen-lockfile

# ソースコードのコピー
COPY . .

# アプリケーションのビルド
RUN pnpm run build

# 実行ステージ
FROM node:20-slim AS runner
WORKDIR /app

# 実行環境に必要なライブラリ（ネイティブモジュールの再ビルド用）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# pnpmの有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

# 必要なファイルのコピー
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# 本番依存関係のみインストール
# side-effects-cacheを無効化して確実にその場でコンパイルを実行
RUN pnpm config set side-effects-cache false && \
    pnpm install --prod --frozen-lockfile

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
