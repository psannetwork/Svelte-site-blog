#!/bin/bash

# 出力ファイル名
OUTPUT_FILE="package.zip"
DIST_DIR="dist_temp"

# クリーンアップ
rm -rf "$DIST_DIR" "$OUTPUT_FILE"
mkdir -p "$DIST_DIR"

# 必要なファイルとディレクトリのリスト
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

echo "Copying files..."

for item in "${FILES[@]}"; do
    if [ -e "../$item" ]; then
        cp -r "../$item" "$DIST_DIR/"
    else
        echo "Warning: $item not found, skipping."
    fi
done

# 不要なファイルの削除（static/uploadsの中身など）
rm -rf "$DIST_DIR/static/uploads/"*
touch "$DIST_DIR/static/uploads/.gitkeep"

echo "Creating ZIP file..."

# Pythonを使用してZIPを作成（zipコマンドがない場合のため）
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

# クリーンアップ
rm -rf "$DIST_DIR"

echo "Done! $OUTPUT_FILE has been created in DevMaker directory."
