#!/bin/bash

# 色の定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Svelte Site Blog セットアップを開始します...${NC}"

# 1. Node.js のバージョン確認 (推奨 v20以上)
# nodeコマンドが存在するか確認
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js がインストールされていません。${NC}"
    echo "公式サイト (https://nodejs.org/) からインストールしてください。"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${YELLOW}⚠️  Node.js v20以上が推奨されています (現在のバージョン: $(node -v))${NC}"
  echo "続行しますが、エラーが発生する可能性があります。"
  sleep 2
fi

# 2. 依存関係のインストール
echo -e "\n${BLUE}📦 依存関係をインストールしています...${NC}"
if command -v pnpm &> /dev/null; then
    echo "pnpm を検出しました。pnpm install を実行します。"
    pnpm install
else
    echo "npm install を実行します。"
    npm install
fi

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ 依存関係のインストールに失敗しました。${NC}"
    exit 1
fi

# 3. .env ファイルの作成
echo -e "\n${BLUE}⚙️  環境設定 (.env) を確認しています...${NC}"
if [ ! -f .env ]; then
    echo ".env ファイルを作成しています..."
    cat <<EOF > .env
# Database
DB_PATH=blog.db

# Security (Cloudflare Turnstile) - Optional
# TURNSTILE_SITE_KEY=
# TURNSTILE_SECRET_KEY=

# Email (SMTP) - Optional
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=noreply@example.com
EOF
    echo -e "${GREEN}✅ .env ファイルを作成しました。${NC}"
else
    echo "既存の .env ファイルを使用します。"
fi

# 4. データベースとディレクトリの準備
echo -e "\n${BLUE}🗄️  データベースとディレクトリの準備をしています...${NC}"
# バックアップディレクトリなどの作成
mkdir -p backups
mkdir -p static/uploads/avatars
mkdir -p static/uploads/posts

echo -e "${GREEN}✅ 必要なディレクトリを作成しました。${NC}"
echo "データベース (blog.db) は初回起動時に自動作成されます。"

# 5. 完了
echo -e "\n${GREEN}✨ すべての準備が整いました！${NC}"
echo -e "以下のコマンドで開発サーバーを起動してください:\n"
if command -v pnpm &> /dev/null; then
    echo -e "  ${YELLOW}pnpm run dev${NC}\n"
else
    echo -e "  ${YELLOW}npm run dev${NC}\n"
fi
echo "初回起動時に管理者アカウントのセットアップが必要な場合があります。"
echo "コンソールに表示されるURL (通常 http://localhost:5173) にアクセスしてください。"
