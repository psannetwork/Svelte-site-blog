#!/bin/bash

# スクリプトの場所を基準にカレントディレクトリをプロジェクトルートに合わせる
# (DevMakerディレクトリ内で実行しても、ルートから実行しても動くように調整)
cd "$(dirname "$0")/.." || exit

# 出力ファイル名と一時ディレクトリ
OUTPUT_FILE="package.zip"
DIST_DIR="dist_temp"

# クリーンアップ（古いファイルがあれば削除）
rm -rf "$DIST_DIR" "$OUTPUT_FILE"
mkdir -p "$DIST_DIR"

# 必要なファイルとディレクトリのリスト（ルートディレクトリ基準）
FILES=(
    "src"
    "Docs"
    "static"
    ".dockerignore"
    "Dockerfile"
    "package.json"
    "pnpm-lock.yaml"
    "pnpm-workspace.yaml"
    "svelte.config.js"
    "tsconfig.json"
    "vite.config.ts"
    "eslint.config.js"
    ".prettierrc"
    ".prettierignore"
    ".npmrc"
    "LICENSE"
    "README.md"
    "setup.sh"
)

echo "Copying files from $(pwd)..."

for item in "${FILES[@]}"; do
    if [ -e "$item" ]; then
        # ディレクトリ構造を維持してコピー
        cp -r "$item" "$DIST_DIR/"
        echo "Copied: $item"
    else
        echo "Warning: $item not found, skipping."
    fi
done

# static/uploads ディレクトリの整合性確保
mkdir -p "$DIST_DIR/static/uploads"
rm -rf "$DIST_DIR/static/uploads/"*
touch "$DIST_DIR/static/uploads/.gitkeep"

echo "Creating ZIP file..."

# Pythonを使用してZIPを作成
python3 -c "
import os
import zipfile

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, path)
            ziph.write(file_path, arcname)

with zipfile.ZipFile('$OUTPUT_FILE', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('$DIST_DIR', zipf)
"

# 一時ディレクトリの削除
rm -rf "$DIST_DIR"

echo "------------------------------------------"
echo "Done! $OUTPUT_FILE has been created."
echo "Location: $(pwd)/$OUTPUT_FILE"
echo "------------------------------------------"