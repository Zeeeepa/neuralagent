#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./generate-icons.sh your-logo.png"
    exit 1
fi

LOGO=$1

echo "Generating icons from $LOGO..."

# Create directories
mkdir -p assets/icons
mkdir -p NeuralAgent.iconset

# Generate individual PNG sizes
echo "Generating PNG sizes..."
sips -z 16 16     "$LOGO" --out assets/icons/icon_16x16.png
sips -z 32 32     "$LOGO" --out assets/icons/icon_32x32.png
sips -z 64 64     "$LOGO" --out assets/icons/icon_64x64.png
sips -z 128 128   "$LOGO" --out assets/icons/icon_128x128.png
sips -z 256 256   "$LOGO" --out assets/icons/icon_256x256.png
sips -z 512 512   "$LOGO" --out assets/icons/icon_512x512.png
sips -z 1024 1024 "$LOGO" --out assets/icons/icon_1024x1024.png

# Generate iconset for macOS
echo "Generating macOS iconset..."
sips -z 16 16     "$LOGO" --out NeuralAgent.iconset/icon_16x16.png
sips -z 32 32     "$LOGO" --out NeuralAgent.iconset/icon_16x16@2x.png
sips -z 32 32     "$LOGO" --out NeuralAgent.iconset/icon_32x32.png
sips -z 64 64     "$LOGO" --out NeuralAgent.iconset/icon_32x32@2x.png
sips -z 128 128   "$LOGO" --out NeuralAgent.iconset/icon_128x128.png
sips -z 256 256   "$LOGO" --out NeuralAgent.iconset/icon_128x128@2x.png
sips -z 256 256   "$LOGO" --out NeuralAgent.iconset/icon_256x256.png
sips -z 512 512   "$LOGO" --out NeuralAgent.iconset/icon_256x256@2x.png
sips -z 512 512   "$LOGO" --out NeuralAgent.iconset/icon_512x512.png
cp "$LOGO"        NeuralAgent.iconset/icon_512x512@2x.png

# Generate .icns
echo "Generating .icns file..."
iconutil -c icns NeuralAgent.iconset -o assets/icon.icns

# Cleanup
rm -rf NeuralAgent.iconset

echo "✅ Icons generated in assets/ directory"
echo "📁 Individual PNGs: assets/icons/"
echo "🍎 macOS icon: assets/icon.icns"
