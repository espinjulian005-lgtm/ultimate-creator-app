#!/usr/bin/env bash
# Ultimate Creator App — installation script (macOS / Linux)
set -e

echo
echo "=================================================="
echo " Ultimate Creator App - Installation"
echo "=================================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERREUR : Node.js n'est pas installé. https://nodejs.org/"
  exit 1
fi
echo "[1/4] Node.js : $(node --version)"

echo "[2/4] npm install..."
npm install

mkdir -p bin

OS="$(uname -s)"
echo "[3/4] yt-dlp..."
if [ ! -f bin/yt-dlp ]; then
  if [ "$OS" = "Darwin" ]; then
    curl -L -o bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos
  else
    curl -L -o bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
  fi
  chmod +x bin/yt-dlp
fi

echo "[4/4] ffmpeg..."
if ! command -v ffmpeg >/dev/null 2>&1 && [ ! -f bin/ffmpeg ]; then
  if [ "$OS" = "Darwin" ]; then
    if command -v brew >/dev/null 2>&1; then
      brew install ffmpeg
      ln -sf "$(which ffmpeg)" bin/ffmpeg
    else
      echo "Installe Homebrew (https://brew.sh) puis relance, ou installe ffmpeg manuellement."
    fi
  else
    if command -v apt >/dev/null 2>&1; then
      sudo apt update && sudo apt install -y ffmpeg
      ln -sf "$(which ffmpeg)" bin/ffmpeg
    else
      echo "Installe ffmpeg via ton gestionnaire de paquets."
    fi
  fi
fi

echo
echo "=================================================="
echo " Installation terminée !"
echo "=================================================="
echo " Lancer l'app : npm start"
echo " Créer un installateur : npm run package"
echo
