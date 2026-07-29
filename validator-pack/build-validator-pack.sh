#!/bin/bash
set -e

# Build PCS-CTS Validator Pack
# Creates a distributable ZIP file for independent validation

echo "=== Building PCS-CTS Validator Pack ==="
echo ""

# Configuration
CTS_TAG="cts-v0.1.0-evidence"
KERNEL_TAG="kernel-v0.1.0-min"
PACK_VERSION="v0.1.0"
OUTPUT_NAME="pcs-cts-validator-pack-${PACK_VERSION}.zip"

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEMP_DIR=$(mktemp -d)
PACK_DIR="$TEMP_DIR/pcs-cts-validator-pack-${PACK_VERSION}"

echo "Creating temporary directory: $TEMP_DIR"
echo ""

# Create pack directory structure
mkdir -p "$PACK_DIR"

# Clone CTS at tag
echo "Cloning persistra-cts at tag $CTS_TAG..."
git clone --branch "$CTS_TAG" --depth 1 \
    https://github.com/persistra-ai/persistra-cts.git \
    "$PACK_DIR/persistra-cts"

# Clone kernel at tag
echo "Cloning persistra-kernel at tag $KERNEL_TAG..."
git clone --branch "$KERNEL_TAG" --depth 1 \
    https://github.com/persistra-ai/persistra-kernel.git \
    "$PACK_DIR/persistra-kernel"

# Copy run scripts
echo "Copying run scripts..."
cp "$SCRIPT_DIR/run.sh" "$PACK_DIR/"
cp "$SCRIPT_DIR/run.ps1" "$PACK_DIR/"
cp "$SCRIPT_DIR/README.md" "$PACK_DIR/"

# Make run.sh executable
chmod +x "$PACK_DIR/run.sh"

# Remove .git directories to reduce size
echo "Cleaning up .git directories..."
rm -rf "$PACK_DIR/persistra-cts/.git"
rm -rf "$PACK_DIR/persistra-kernel/.git"

# Create ZIP file
echo "Creating ZIP file..."
cd "$TEMP_DIR"
zip -r "$OUTPUT_NAME" "pcs-cts-validator-pack-${PACK_VERSION}" > /dev/null

# Move ZIP to current directory
mv "$OUTPUT_NAME" "$SCRIPT_DIR/"

# Cleanup
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Validator Pack created: $OUTPUT_NAME"
echo ""
echo "File size: $(du -h "$SCRIPT_DIR/$OUTPUT_NAME" | cut -f1)"
echo ""
echo "To test the pack:"
echo "  1. unzip $OUTPUT_NAME"
echo "  2. cd pcs-cts-validator-pack-${PACK_VERSION}"
echo "  3. ./run.sh (or .\\run.ps1 on Windows)"
echo ""
echo "To create a GitHub Release:"
echo "  1. Go to https://github.com/persistra-ai/persistra-cts/releases/new"
echo "  2. Tag: $PACK_VERSION"
echo "  3. Title: PCS-CTS Validator Pack $PACK_VERSION"
echo "  4. Upload: $OUTPUT_NAME"
echo ""
